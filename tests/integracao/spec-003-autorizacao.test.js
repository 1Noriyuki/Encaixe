/**
 * SPEC-003 - autorizacao por perfil e titularidade (RF-006, RF-007, RNF-03).
 * Os IDs seguem a §12 da Spec; a tabela de evidencia fica na §12 dela.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as auditoria from '../../src/infra/auditoria.js';
import { params } from '../../src/aplicacao/parametros.js';
import { um, varios } from '../../src/infra/db/conexao.js';

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
  const cookie = (r.headers.getSetCookie?.() ?? [])[0]?.split(';')[0] ?? null;
  assert.ok(cookie, `login de ${email}`);
  return cookie;
}

/** O token CSRF e por sessao e mora no servidor; o teste le de la. */
function csrfDa(cookie) {
  const id = decodeURIComponent(cookie.split('=')[1]);
  return um('SELECT csrf FROM sessao WHERE id = ?', id)?.csrf;
}

function pedir(metodo, caminho, cookie = null, campos = null) {
  return fetch(`${base}${caminho}`, {
    method: metodo,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(campos ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: campos ? new URLSearchParams(campos) : undefined,
    redirect: 'manual',
  });
}

function negadosPorPerfil() {
  return auditoria.recentes(500).filter((l) => l.acao === 'ACESSO_NEGADO');
}

// Toda rota do sistema e o perfil que a §4.5 da spec admite para ela.
// `partes` = qualquer perfil autenticado passa na rota; a titularidade e conferida no caso de uso.
const C = 'CLIENTE';
const P = 'PRESTADOR';
const A = 'ADMIN';
const ROTAS = [
  // [metodo, caminho, perfis admitidos, acao da §4.5]
  ['GET', '/admin', [A], 'Ver métricas consolidadas'],
  ['GET', '/admin/disputas', [A], 'Resolver disputa'],
  ['GET', '/admin/disputas/1', [A], 'Resolver disputa'],
  ['POST', '/admin/disputas/1/resolver', [A], 'Resolver disputa'],
  ['GET', '/admin/contas', [A], 'Aprovar / suspender conta'],
  ['GET', '/admin/contas/1', [A], 'Aprovar / suspender conta'],
  ['POST', '/admin/contas/1/aprovar', [A], 'Aprovar / suspender conta'],
  ['POST', '/admin/contas/1/reprovar', [A], 'Aprovar / suspender conta'],
  ['POST', '/admin/contas/1/decidir', [A], 'Aprovar / suspender conta'],
  ['GET', '/admin/parametros', [A], 'Configurar percentual de comissão'],
  ['POST', '/admin/parametros', [A], 'Configurar percentual de comissão'],
  ['POST', '/admin/comissao', [A], 'Configurar percentual de comissão'],
  ['GET', '/admin/auditoria', [A], 'Ver métricas consolidadas'],
  ['POST', '/reservar', [C], 'Reservar horário'],
  ['GET', '/meus-agendamentos', [C], 'Reservar horário'],
  ['POST', '/agendamentos/1/confirmar', [P], 'Confirmar / recusar reserva'],
  ['POST', '/agendamentos/1/recusar', [P], 'Confirmar / recusar reserva'],
  ['POST', '/agendamentos/1/concluir', [P], 'Confirmar / recusar reserva'],
  ['GET', '/agendamentos/1', [C, P, A], 'partes'],
  ['GET', '/agendamentos/1/cancelar', [C, P, A], 'Cancelar agendamento'],
  ['POST', '/agendamentos/1/cancelar', [C, P, A], 'Cancelar agendamento'],
  ['POST', '/agendamentos/1/no-show', [C, P, A], 'Reportar no-show'],
  ['POST', '/agendamentos/1/avaliar', [C, P, A], 'Avaliar contraparte'],
  ['POST', '/agendamentos/1/disputar', [C, P, A], 'Abrir disputa'],
  ['POST', '/agendamentos/1/evidencia', [C, P, A], 'Abrir disputa'],
  ['GET', '/notificacoes', [C, P, A], 'partes'],
  ['POST', '/notificacoes/lidas', [C, P, A], 'partes'],
  ['GET', '/prestador', [P], 'Publicar / editar horário vago'],
  ['GET', '/prestador/horarios', [P], 'Publicar / editar horário vago'],
  ['POST', '/prestador/horarios', [P], 'Publicar / editar horário vago'],
  ['POST', '/prestador/horarios/1/cancelar', [P], 'Publicar / editar horário vago'],
  ['GET', '/prestador/catalogo', [P], 'Definir régua de desconto'],
  ['POST', '/prestador/servicos', [P], 'Publicar / editar horário vago'],
  ['POST', '/prestador/regua', [P], 'Definir régua de desconto'],
  ['GET', '/prestador/agendamentos', [P], 'Confirmar / recusar reserva'],
  ['GET', '/prestador/extrato', [P], 'Ver extrato próprio de comissão'],
  ['GET', '/prestador/perfil', [P], 'Publicar / editar horário vago'],
  ['POST', '/prestador/perfil', [P], 'Publicar / editar horário vago'],
];
const PUBLICAS = ['/', '/entrar', '/cadastrar', '/buscar', '/horarios/1', '/prestadores/1'];

// --------------------------------------------------------------- testes

test('T-AUTORIZ-01 | RF-006: visitante sem sessao nao executa rota protegida', async () => {
  const c = cenarioBasico({ horasAteHorario: 4 });

  for (const [metodo, caminho] of ROTAS) {
    const r = await pedir(metodo, caminho, null, metodo === 'POST' ? { x: '1' } : null);
    assert.equal(r.status, 302, `${metodo} ${caminho}`);
    assert.match(r.headers.get('location'), /^\/entrar\?destino=/, `${metodo} ${caminho}`);
  }
  await pedir('POST', '/reservar', null, { horarioId: String(c.horario.id) });
  assert.equal(um('SELECT COUNT(*) AS n FROM agendamento').n, 0, 'INV-006: nada foi reservado');
  for (const caminho of PUBLICAS) {
    assert.notEqual((await pedir('GET', caminho)).status, 302, `${caminho} e publica`);
  }
});

test('T-AUTORIZ-02 | RF-006: cada rota admite exatamente os perfis da matriz §4.5', async () => {
  cenarioBasico();
  const cookies = {
    [C]: await entrar('cliente@teste.dev'),
    [P]: await entrar('prestador@teste.dev'),
    [A]: await entrar('admin@teste.dev'),
  };

  for (const [metodo, caminho, admitidos, acao] of ROTAS) {
    for (const perfil of [C, P, A]) {
      const antes = negadosPorPerfil().length;
      // POST vai sem CSRF de proposito: quem passa na rota para no CSRF, e nada executa.
      const r = await pedir(metodo, caminho, cookies[perfil], metodo === 'POST' ? { x: '1' } : null);
      const negado = negadosPorPerfil().length > antes;
      const rotulo = `${perfil} em ${metodo} ${caminho} (${acao})`;
      if (admitidos.includes(perfil)) {
        assert.equal(negado, false, `${rotulo} deveria passar pela rota`);
      } else {
        assert.equal(r.status, 403, rotulo);
        assert.equal(negado, true, `${rotulo}: a recusa precisa ir para a auditoria`);
      }
    }
  }
});

test('T-AUTORIZ-03 | RF-007: perfil incompativel recebe 403 e a tentativa e auditada com ator e contexto', async () => {
  const c = cenarioBasico();
  const cookie = await entrar('cliente@teste.dev');

  const r = await pedir('GET', '/admin/parametros', cookie);
  assert.equal(r.status, 403);
  assert.match(await r.text(), /RF-007/);

  const [registro] = negadosPorPerfil();
  assert.equal(registro.ator_id, c.cliente.id);
  assert.equal(registro.entidade_tipo, 'rota');
  const detalhe = JSON.parse(registro.detalhe);
  assert.deepEqual(detalhe, { caminho: '/admin/parametros', perfil: 'CLIENTE', exigido: ['ADMIN'] });
  assert.ok(registro.correlacao_id, 'RNF-07: a recusa carrega a correlacao da requisicao');
  assert.match(registro.criado_em, /Z$/);
});

test('T-AUTORIZ-04 | RNF-03: perfil enviado pelo navegador nao altera a autorizacao', async () => {
  cenarioBasico();
  const cookie = await entrar('cliente@teste.dev');

  const porFormulario = await pedir('POST', '/admin/parametros?perfil=ADMIN', cookie, {
    _csrf: csrfDa(cookie), perfil: 'ADMIN', chave: 'antecedencia_min_reserva_min', valor: '90',
  });
  assert.equal(porFormulario.status, 403);
  assert.equal(params().antecedencia_min_reserva_min, 30, 'INV-001: o parametro nao mudou');
  assert.equal(JSON.parse(negadosPorPerfil()[0].detalhe).perfil, 'CLIENTE');
});

test('T-AUTORIZ-05 | RF-007: recusa por perfil nao executa o handler nem altera estado', async () => {
  const c = cenarioBasico({ horasAteHorario: 4 });
  const prestador = await entrar('prestador@teste.dev');

  // CSRF valido: a unica barreira e o perfil.
  const r = await pedir('POST', '/reservar', prestador, { _csrf: csrfDa(prestador), horarioId: String(c.horario.id) });
  assert.equal(r.status, 403);
  assert.equal(um('SELECT COUNT(*) AS n FROM agendamento').n, 0);
  assert.equal(um('SELECT estado FROM horario_vago WHERE id = ?', c.horario.id).estado, 'PUBLICADO');
});

test('T-TITULAR-01 | RF-006: usuario nao le agendamento de outra parte nem ve os dados dela', async () => {
  const c = cenarioBasico({ horasAteHorario: 4 });
  const ag = agendamentos.reservar({
    clienteId: c.cliente.id, horarioId: c.horario.id, observacao: 'Observacao privada do cliente',
  });
  const r = await pedir('GET', `/agendamentos/${ag.id}`, await entrar('cliente2@teste.dev'));
  assert.equal(r.status, 403);
  const corpo = await r.text();
  for (const privado of ['Observacao privada do cliente', '11 90000-0000', 'Cliente Teste']) {
    assert.ok(!corpo.includes(privado), `INV-005: a recusa nao mostra "${privado}"`);
  }
  assert.equal((await pedir('GET', '/agendamentos/999999', await entrar('cliente@teste.dev'))).status, 404,
    'recurso inexistente responde 404, sem virar autorizacao');
});

test('T-TITULAR-02 | RF-006: usuario nao altera recurso de outro titular', async () => {
  const c = cenarioBasico({ horasAteHorario: 4 });
  const pendente = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  // Outro cliente tenta cancelar; o mesmo cliente nao pode confirmar o que e do prestador.
  const intruso = await entrar('cliente2@teste.dev');
  const r1 = await pedir('POST', `/agendamentos/${pendente.id}/cancelar`, intruso, { _csrf: csrfDa(intruso) });
  assert.notEqual(r1.status, 200);

  const alheio = contas.cadastrar({
    nome: 'Outro Prestador', email: 'outro-prestador@teste.dev', senha: 'senha1234',
    perfil: 'PRESTADOR', nomeExibicao: 'Outro Espaco', regiaoId: c.regiao.id,
  });
  contas.aprovarPrestador({ adminId: c.adminId, prestadorId: alheio.id });
  const prestadorAlheio = await entrar('outro-prestador@teste.dev');
  await pedir('POST', `/agendamentos/${pendente.id}/confirmar`, prestadorAlheio, { _csrf: csrfDa(prestadorAlheio) });
  await pedir('POST', `/prestador/horarios/${c.horario.id}/cancelar`, prestadorAlheio, { _csrf: csrfDa(prestadorAlheio) });

  assert.equal(um('SELECT estado FROM agendamento WHERE id = ?', pendente.id).estado, 'PENDENTE_CONFIRMACAO');
  assert.equal(um('SELECT estado FROM horario_vago WHERE id = ?', c.horario.id).estado, 'BLOQUEADO');
  const acoes = varios('SELECT acao FROM log_auditoria WHERE entidade_tipo = ? AND entidade_id = ?', 'agendamento', pendente.id)
    .map(({ acao }) => acao);
  assert.deepEqual(acoes, ['RESERVA_CRIADA'], 'so a criacao: nenhuma transicao pelas maos de terceiros');
});

test('T-TITULAR-03 | RF-006: titular autorizado consulta e altera o proprio recurso', async () => {
  const c = cenarioBasico({ horasAteHorario: 4 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  const cliente = await entrar('cliente@teste.dev');
  assert.equal((await pedir('GET', `/agendamentos/${ag.id}`, cliente)).status, 200);

  const prestador = await entrar('prestador@teste.dev');
  assert.equal((await pedir('GET', `/agendamentos/${ag.id}`, prestador)).status, 200);
  const r = await pedir('POST', `/agendamentos/${ag.id}/confirmar`, prestador, { _csrf: csrfDa(prestador) });
  assert.equal(r.status, 302);
  assert.equal(um('SELECT estado FROM agendamento WHERE id = ?', ag.id).estado, 'CONFIRMADO');
});
