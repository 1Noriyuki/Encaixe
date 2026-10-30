/**
 * SPEC-010 - publicacao de horario vago (RF-014 a RF-016, RN-06 a RN-08, RN-21, INV-02).
 * Os IDs seguem a §12 da Spec.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, agoraDoTeste, publicarDaquiA } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as horarios from '../../src/aplicacao/horarios.js';
import * as auditoria from '../../src/infra/auditoria.js';
import * as horariosRepo from '../../src/infra/repositorios/horarios.js';
import * as parametrosRepo from '../../src/infra/repositorios/parametros.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import { um } from '../../src/infra/db/conexao.js';
import { adicionarHoras, adicionarMinutos, partesLocais } from '../../src/dominio/tempo.js';

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

function publicarEm(c, instante, servicoId = c.servico.id) {
  const { data, hora } = partesLocais(instante);
  return horarios.publicar({ prestadorId: c.prestador.id, servicoId, reguaId: c.regua.id, data, hora });
}

test('T-PUBLICACAO-01 | RF-014: horario nasce PUBLICADO herdando duracao e preco do servico', () => {
  const c = cenarioBasico({ duracaoMin: 45, precoBase: '80,00', precoMinimo: '30,00' });
  const h = c.horario;

  assert.equal(h.estado, 'PUBLICADO');
  assert.equal(h.duracao_min, 45);
  assert.equal(h.preco_base_snapshot, 8000);
  assert.equal(h.preco_minimo_snapshot, 3000);
  const [registro] = auditoria.historicoDe('horario', h.id);
  assert.equal(registro.acao, 'HORARIO_PUBLICADO');
  assert.equal(registro.ator_id, c.prestador.id);
  assert.equal(registro.estado_novo, 'PUBLICADO');
});

test('T-PUBLICACAO-02 | RF-014: editar o servico depois nao muda o horario ja publicado', () => {
  const c = cenarioBasico({ duracaoMin: 45, precoBase: '80,00' });
  catalogo.salvarServico({
    prestadorId: c.prestador.id, servicoId: c.servico.id, nome: 'Corte novo', categoriaId: c.categoria.id,
    duracaoMin: 90, precoBase: '150,00', precoMinimo: '60,00',
  });

  const depois = horariosRepo.porId(c.horario.id);
  assert.equal(depois.duracao_min, 45);
  assert.equal(depois.preco_base_snapshot, 8000);
  const novo = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 10);
  assert.equal(novo.preco_base_snapshot, 15000, 'o horario seguinte herda o servico atualizado');
});

test('T-PUBLICACAO-03 | RF-015/RN-07: antecedencia abaixo de P-03 e recusada informando o minimo', () => {
  const c = cenarioBasico();
  const agora = agoraDoTeste();

  assert.throws(
    () => publicarEm(c, adicionarMinutos(agora, 59)),
    (e) => e.regra === 'RN-07' && /pelo menos 1 h/.test(e.message) && e.detalhes.minimo === 60,
  );
  assert.equal(publicarEm(c, adicionarMinutos(agora, 60)).estado, 'PUBLICADO', 'exatamente P-03 e aceito');

  parametrosRepo.salvarGlobal('antecedencia_min_publicacao_min', 120, c.adminId);
  assert.throws(() => publicarEm(c, adicionarMinutos(agora, 119)), (e) => e.detalhes.minimo === 120,
    'P-03 alterado vale para a publicacao seguinte');
});

test('T-PUBLICACAO-04 | RF-016/RN-06: sobreposicao e recusada identificando o conflito', () => {
  const c = cenarioBasico({ horasAteHorario: 5, duracaoMin: 60 });

  assert.throws(
    () => publicarEm(c, adicionarMinutos(c.horario.inicio, 30)),
    (e) => e.regra === 'RN-06' && e.detalhes.conflito.id === c.horario.id,
  );
  assert.throws(() => publicarEm(c, adicionarMinutos(c.horario.inicio, -30)), (e) => e.regra === 'RN-06');
  assert.equal(publicarEm(c, adicionarMinutos(c.horario.inicio, 60)).estado, 'PUBLICADO', 'encostar na borda pode');

  // Horario cancelado nao ocupa mais a agenda.
  horarios.cancelarHorarioLivre({ prestadorId: c.prestador.id, horarioId: c.horario.id });
  assert.equal(publicarEm(c, c.horario.inicio).estado, 'PUBLICADO');
});

test('T-PUBLICACAO-05 | INV-02: o banco recusa horario sobreposto gravado por fora do dominio', () => {
  const c = cenarioBasico({ horasAteHorario: 5, duracaoMin: 60 });
  const linha = {
    prestador_id: c.prestador.id, servico_id: c.servico.id, regua_id: c.regua.id,
    duracao_min: 60, preco_base_snapshot: 10000, preco_minimo_snapshot: 4000, criado_em: agoraDoTeste(),
  };

  assert.throws(
    () => horariosRepo.criar({ ...linha, inicio: adicionarMinutos(c.horario.inicio, 59), estado: 'PUBLICADO' }),
    /INV-02/,
  );
  // Borda, horario inativo e outro prestador nao conflitam.
  horariosRepo.criar({ ...linha, inicio: adicionarMinutos(c.horario.inicio, 60), estado: 'PUBLICADO' });
  horariosRepo.criar({ ...linha, inicio: c.horario.inicio, estado: 'CANCELADO' });
  horariosRepo.criar({ ...linha, prestador_id: c.adminId, inicio: c.horario.inicio, estado: 'PUBLICADO' });
  assert.equal(um('SELECT COUNT(*) AS n FROM horario_vago').n, 4);
});

test('T-PUBLICACAO-06 | RN-08/RN-21: conta fora de ATIVO nao publica, com a regra que barrou', () => {
  const c = cenarioBasico();
  const tentar = () => publicarEm(c, adicionarHoras(agoraDoTeste(), 20));

  usuariosRepo.atualizarEstadoConta(c.prestador.id, 'EM_REVISAO');
  assert.throws(tentar, (e) => e.regra === 'RN-21');

  usuariosRepo.atualizarEstadoConta(c.prestador.id, 'SUSPENSO');
  assert.throws(tentar, (e) => e.regra === 'RN-08');

  contas.decidirSobreConta({
    adminId: c.adminId, usuarioId: c.prestador.id, decisao: 'ATIVO', justificativa: 'Reativacao apos analise.',
  });
  assert.equal(tentar().estado, 'PUBLICADO');
});

test('T-PUBLICACAO-07 | RNF-11: publicar pelo formulario funciona sem JavaScript e mostra a regra na recusa', async () => {
  const c = cenarioBasico();
  const login = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'prestador@teste.dev', senha: 'senha1234' }),
    redirect: 'manual',
  });
  const cookie = login.headers.getSetCookie()[0].split(';')[0];
  const csrf = um('SELECT csrf FROM sessao WHERE id = ?', decodeURIComponent(cookie.split('=')[1])).csrf;
  const enviar = (instante) => {
    const { data, hora } = partesLocais(instante);
    return fetch(`${base}/prestador/horarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
      body: new URLSearchParams({
        _csrf: csrf, servicoId: String(c.servico.id), reguaId: String(c.regua.id), data, horas: hora,
      }),
      redirect: 'manual',
    });
  };

  assert.equal((await enviar(adicionarHoras(agoraDoTeste(), 30))).status, 302);
  assert.equal(um("SELECT COUNT(*) AS n FROM horario_vago WHERE estado = 'PUBLICADO'").n, 2);

  await enviar(adicionarMinutos(c.horario.inicio, 15));
  const tela = await (await fetch(`${base}/prestador/horarios`, { headers: { Cookie: cookie } })).text();
  assert.match(tela, /RN-06/);
  assert.equal(um("SELECT COUNT(*) AS n FROM horario_vago WHERE estado = 'PUBLICADO'").n, 2);
});
