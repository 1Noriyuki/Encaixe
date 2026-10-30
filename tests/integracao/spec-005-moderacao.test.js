/**
 * SPEC-005 - aprovacao e reprovacao de prestador (RF-003, RF-008, RF-009).
 * Os IDs seguem a §12 da Spec; a tabela de evidencia fica na §12 dela.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, agoraDoTeste } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as horarios from '../../src/aplicacao/horarios.js';
import * as reputacao from '../../src/aplicacao/reputacao.js';
import * as auditoria from '../../src/infra/auditoria.js';
import * as notificacoes from '../../src/infra/notificacoes.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import { um } from '../../src/infra/db/conexao.js';
import { TIPO_EVENTO } from '../../src/dominio/reputacao.js';
import { adicionarHoras, partesLocais } from '../../src/dominio/tempo.js';

let servidor;
let base;

test.before(async () => {
  prepararBanco();
  servidor = criarAplicacao();
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

test.beforeEach(prepararBanco);

test.after(() => {
  servidor?.close();
  encerrar();
});

// --------------------------------------------------------------- apoio

async function entrar(email) {
  const r = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, senha: 'senha1234' }),
    redirect: 'manual',
  });
  return (r.headers.getSetCookie?.() ?? [])[0]?.split(';')[0] ?? null;
}

function csrfDa(cookie) {
  return um('SELECT csrf FROM sessao WHERE id = ?', decodeURIComponent(cookie.split('=')[1]))?.csrf;
}

function pedir(metodo, caminho, cookie, campos = null) {
  return fetch(`${base}${caminho}`, {
    method: metodo,
    headers: {
      Cookie: cookie,
      ...(campos ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: campos ? new URLSearchParams(campos) : undefined,
    redirect: 'manual',
  });
}

/** Seção da tela de contas entre o titulo "Aguardando aprovação" e o proximo h2. */
function secaoPendentes(tela) {
  const inicio = tela.indexOf('Aguardando aprovação');
  assert.ok(inicio > 0, 'a secao de pendentes sempre aparece');
  return tela.slice(inicio, tela.indexOf('<h2', inicio + 1));
}

function novoPrestador(c, sufixo) {
  return contas.cadastrar({
    nome: `Prestador ${sufixo}`, email: `${sufixo}@teste.dev`, senha: 'senha1234',
    perfil: 'PRESTADOR', nomeExibicao: `Espaco ${sufixo}`, regiaoId: c.regiao.id,
  });
}

const JUSTIFICATIVA = 'Documentacao incompleta no cadastro.';

// --------------------------------------------------------------- testes

test('T-MODERACAO-01 | RF-003: fila lista apenas prestadores pendentes', async () => {
  const c = cenarioBasico();
  const pendente = novoPrestador(c, 'pendente-um');
  const outroPendente = novoPrestador(c, 'pendente-dois');
  const reprovado = novoPrestador(c, 'ja-reprovado');
  contas.reprovarPrestador({ adminId: c.adminId, prestadorId: reprovado.id, justificativa: JUSTIFICATIVA });

  const fila = secaoPendentes(await (await pedir('GET', '/admin/contas', await entrar('admin@teste.dev'))).text());
  assert.match(fila, /Aguardando aprovação \(2\)/);
  for (const p of [pendente, outroPendente]) assert.ok(fila.includes(`/admin/contas/${p.id}`), p.email);
  for (const fora of [reprovado, c.prestador]) assert.ok(!fila.includes(`/admin/contas/${fora.id}"`), fora.email);
});

test('T-MODERACAO-02 | RF-003: fila sem pendencias apresenta estado vazio', async () => {
  cenarioBasico();
  const fila = secaoPendentes(await (await pedir('GET', '/admin/contas', await entrar('admin@teste.dev'))).text());
  assert.match(fila, /Aguardando aprovação \(0\)/);
  assert.match(fila, /Fila de aprovação vazia/);
});

test('T-MODERACAO-03 | RF-007: perfil nao admin nao acessa fila nem decide', async () => {
  const c = cenarioBasico();
  const pendente = novoPrestador(c, 'pendente-tres');

  for (const email of ['cliente@teste.dev', 'prestador@teste.dev']) {
    const cookie = await entrar(email);
    const fila = await pedir('GET', '/admin/contas', cookie);
    assert.equal(fila.status, 403, email);
    assert.ok(!(await fila.text()).includes(pendente.email), `${email}: a recusa nao revela a fila`);
    for (const acao of ['aprovar', 'reprovar']) {
      const r = await pedir('POST', `/admin/contas/${pendente.id}/${acao}`, cookie, {
        _csrf: csrfDa(cookie), justificativa: JUSTIFICATIVA,
      });
      assert.equal(r.status, 403, `${email} ${acao}`);
    }
  }
  assert.equal(usuariosRepo.porId(pendente.id).estado_conta, 'PENDENTE_APROVACAO');
  assert.equal(notificacoes.listar(pendente.id).length, 0);
});

test('T-CONTA-02a | RF-008: admin aprova prestador pendente e notifica titular', async () => {
  const c = cenarioBasico();
  const pendente = novoPrestador(c, 'a-aprovar');
  const admin = await entrar('admin@teste.dev');

  const r = await pedir('POST', `/admin/contas/${pendente.id}/aprovar`, admin, { _csrf: csrfDa(admin) });
  assert.equal(r.status, 302);
  assert.equal(usuariosRepo.porId(pendente.id).estado_conta, 'ATIVO');
  const [aviso] = notificacoes.listar(pendente.id).filter((n) => n.tipo === 'CADASTRO_APROVADO');
  assert.ok(aviso);
  assert.equal(aviso.agendamento_id, null);
});

test('T-CONTA-02b | RF-009: reprovar exige justificativa textual, audita e avisa com o motivo', () => {
  const c = cenarioBasico();
  const pendente = novoPrestador(c, 'a-reprovar');

  for (const justificativa of ['', '   ', 'curta']) {
    assert.throws(
      () => contas.reprovarPrestador({ adminId: c.adminId, prestadorId: pendente.id, justificativa }),
      (e) => e.campo === 'justificativa',
    );
  }
  assert.equal(usuariosRepo.porId(pendente.id).estado_conta, 'PENDENTE_APROVACAO', 'CA-06: nada mudou');
  assert.equal(notificacoes.listar(pendente.id).length, 0, 'CA-06: nenhum aviso de reprovacao');

  contas.reprovarPrestador({ adminId: c.adminId, prestadorId: pendente.id, justificativa: `  ${JUSTIFICATIVA}  ` });
  assert.equal(usuariosRepo.porId(pendente.id).estado_conta, 'REPROVADO');
  const registro = auditoria.historicoDe('conta', pendente.id).find((l) => l.acao === 'PRESTADOR_REPROVADO');
  assert.equal(registro.detalhe.justificativa, JUSTIFICATIVA);
  const [aviso] = notificacoes.listar(pendente.id).filter((n) => n.tipo === 'CADASTRO_REPROVADO');
  assert.equal(aviso.mensagem, JUSTIFICATIVA);
});

test('T-CONTA-02c | RF-008/RF-009: estado nao pendente nao aceita decisao inicial', async () => {
  const c = cenarioBasico();
  // Conta suspensa pelo RF-079 e conta em revisao por reputacao (RN-22).
  contas.decidirSobreConta({
    adminId: c.adminId, usuarioId: c.prestador.id, decisao: 'SUSPENSO', justificativa: 'Fraude confirmada em disputa.',
  });
  reputacao.aplicarEvento({
    usuarioId: c.cliente.id, tipo: TIPO_EVENTO.AJUSTE_ADMIN, delta: -35, origemTipo: 'ajuste_admin', origemId: c.adminId,
  });
  const reprovado = novoPrestador(c, 'reprovado-antes');
  contas.reprovarPrestador({ adminId: c.adminId, prestadorId: reprovado.id, justificativa: JUSTIFICATIVA });

  const casos = [
    [c.prestador.id, 'SUSPENSO'],
    [c.cliente.id, 'EM_REVISAO'],
    [c.cliente2.id, 'ATIVO'],
    [reprovado.id, 'REPROVADO'],
  ];
  const admin = await entrar('admin@teste.dev');
  for (const [id, estado] of casos) {
    assert.equal(usuariosRepo.porId(id).estado_conta, estado);
    const avisosAntes = notificacoes.listar(id).length;
    const registrosAntes = auditoria.historicoDe('conta', id).length;

    assert.throws(() => contas.aprovarPrestador({ adminId: c.adminId, prestadorId: id }), (e) => e.regra === 'RF-008', estado);
    assert.throws(
      () => contas.reprovarPrestador({ adminId: c.adminId, prestadorId: id, justificativa: JUSTIFICATIVA }),
      (e) => e.regra === 'RF-009', estado,
    );
    // A rota aceita POST para qualquer id: a barreira tem de estar no caso de uso.
    await pedir('POST', `/admin/contas/${id}/aprovar`, admin, { _csrf: csrfDa(admin) });

    assert.equal(usuariosRepo.porId(id).estado_conta, estado, `INV-005: ${estado} nao muda`);
    assert.equal(notificacoes.listar(id).length, avisosAntes, `INV-005: ${estado} sem aviso`);
    assert.equal(auditoria.historicoDe('conta', id).length, registrosAntes, `${estado}: nenhuma transicao nova`);
  }
});

test('T-CONTA-02d | RN-08: prestador nao aprovado nao publica', () => {
  const c = cenarioBasico();
  const pendente = novoPrestador(c, 'quer-publicar');
  // OPEN-210: o pendente pode preparar servico e regua antes da aprovacao.
  const servico = catalogo.salvarServico({
    prestadorId: pendente.id, nome: 'Corte', categoriaId: c.categoria.id,
    duracaoMin: 60, precoBase: '100,00', precoMinimo: '40,00',
  });
  const regua = catalogo.salvarRegua({
    prestadorId: pendente.id, nome: 'Regua', faixas: [{ antecedencia_min: 240, percentual_desconto: 20 }],
  });
  const { data, hora } = partesLocais(adicionarHoras(agoraDoTeste(), 6));
  const publicar = () => horarios.publicar({ prestadorId: pendente.id, servicoId: servico.id, reguaId: regua.id, data, hora });

  // O pendente leva a regra mais especifica (RN-28: nasce pendente e nao publica); o reprovado, a RN-08.
  assert.throws(publicar, (e) => e.regra === 'RN-28', 'pendente');
  contas.reprovarPrestador({ adminId: c.adminId, prestadorId: pendente.id, justificativa: JUSTIFICATIVA });
  assert.throws(publicar, (e) => e.regra === 'RN-08', 'reprovado');
  assert.equal(um('SELECT COUNT(*) AS n FROM horario_vago WHERE prestador_id = ?', pendente.id).n, 0);
});

test('T-MODERACAO-04 | RF-084: decisao registra ator, transicao e instante UTC da conta', () => {
  const c = cenarioBasico();
  const aprovado = novoPrestador(c, 'auditado-aprovado');
  const reprovado = novoPrestador(c, 'auditado-reprovado');
  contas.aprovarPrestador({ adminId: c.adminId, prestadorId: aprovado.id });
  contas.reprovarPrestador({ adminId: c.adminId, prestadorId: reprovado.id, justificativa: JUSTIFICATIVA });

  for (const [id, acao, para] of [[aprovado.id, 'PRESTADOR_APROVADO', 'ATIVO'], [reprovado.id, 'PRESTADOR_REPROVADO', 'REPROVADO']]) {
    const [registro] = auditoria.historicoDe('conta', id).filter((l) => l.acao === acao);
    assert.equal(registro.ator_id, c.adminId);
    assert.equal(registro.estado_anterior, 'PENDENTE_APROVACAO');
    assert.equal(registro.estado_novo, para);
    assert.match(registro.criado_em, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  }
});
