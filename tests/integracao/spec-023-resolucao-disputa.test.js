/**
 * SPEC-023 - fila e resolucao de disputas (RF-074 a RF-077, RN-17, RN-27).
 * Os IDs seguem a §12 da Spec; T-DISPUTA-03 a 07c ja existiam.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import * as notificacoes from '../../src/infra/notificacoes.js';
import { um } from '../../src/infra/db/conexao.js';
import { adicionarHoras, adicionarMinutos } from '../../src/dominio/tempo.js';

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

const estado = (tabela, id) => um(`SELECT estado FROM ${tabela} WHERE id = ?`, id).estado;
const reputacaoDe = (id) => um('SELECT reputacao FROM usuario WHERE id = ?', id).reputacao;
const JUSTIFICATIVA = 'Evidencias insuficientes para reverter o desfecho.';

/** Atendimento concluido e contestado pelo cliente. */
function contestado(c) {
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  const disputa = disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'SERVICO_DIFERENTE',
    evidencia: 'O corte foi outro que o anunciado no perfil.',
  });
  return { ag, disputa };
}

test('T-DISPUTA-12 | RF-076: resolver exige desfecho valido e justificativa, e a decisao e definitiva', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const { ag, disputa } = contestado(c);
  const resolver = (desfecho, justificativa) => () => disputas.resolver({ adminId: c.adminId, disputaId: disputa.id, desfecho, justificativa });

  assert.throws(resolver('INVENTADO', JUSTIFICATIVA), (e) => e.campo === 'desfecho');
  assert.throws(resolver('MANTIDO', 'curta demais'), (e) => e.campo === 'justificativa');
  assert.equal(estado('disputa', disputa.id), 'ABERTA');
  assert.equal(estado('agendamento', ag.id), 'EM_DISPUTA');

  resolver('MANTIDO', JUSTIFICATIVA)();
  assert.equal(estado('disputa', disputa.id), 'RESOLVIDA');
  assert.throws(resolver('REVERTIDO', JUSTIFICATIVA), (e) => e.regra === 'RN-27', 'sem instancia de recurso no MVP');
  assert.equal(estado('agendamento', ag.id), 'CONCLUIDO');
});

test('T-DISPUTA-13 | RN-27: na acusacao mutua, MANTIDO reaplica a primeira acusacao e pune quem abriu', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  const [repCliente, repPrestador] = [reputacaoDe(c.cliente.id), reputacaoDe(c.prestador.id)];

  viajarPara(adicionarMinutos(c.horario.inicio, 30));
  agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: ag.id });   // primeira acusacao
  const { disputaId } = agendamentos.registrarNoShow({ usuarioId: c.cliente.id, agendamentoId: ag.id }); // de volta
  assert.equal(reputacaoDe(c.cliente.id), repCliente, 'durante a disputa ninguem esta penalizado');

  disputas.resolver({ adminId: c.adminId, disputaId, desfecho: 'MANTIDO', justificativa: JUSTIFICATIVA });

  assert.equal(estado('agendamento', ag.id), 'NO_SHOW_CLIENTE', 'o desfecho original e a primeira acusacao');
  assert.equal(reputacaoDe(c.cliente.id), repCliente - 12 - 8, 'no-show reaplicado mais a disputa contra');
  assert.equal(reputacaoDe(c.prestador.id), repPrestador);
  assert.equal(um('SELECT COUNT(*) AS n FROM lancamento_comissao').n, 0, 'no-show nao tem comissao');
});

test('T-DISPUTA-14 | UC-12 passo 4: a contraparte anexa evidencia; terceiro e disputa resolvida nao', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const { disputa } = contestado(c);
  const anexar = (usuarioId) => () => disputas.adicionarEvidencia({
    usuarioId, disputaId: disputa.id, evidencia: 'Foto do corte combinado, enviada por mensagem.',
  });

  assert.equal(anexar(c.prestador.id)().length, 2);
  assert.throws(anexar(c.cliente2.id), (e) => e.name === 'ErroDeAutorizacao');
  disputas.resolver({ adminId: c.adminId, disputaId: disputa.id, desfecho: 'PARCIAL', justificativa: JUSTIFICATIVA });
  assert.throws(anexar(c.cliente.id), (e) => e.regra === 'RN-27');
  assert.equal(um('SELECT COUNT(*) AS n FROM evidencia WHERE disputa_id = ?', disputa.id).n, 2);
});

test('T-DISPUTA-15 | RF-077: o admin resolve pela tela e as duas partes recebem desfecho e justificativa', async () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const { ag, disputa } = contestado(c);
  const login = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'admin@teste.dev', senha: 'senha1234' }),
    redirect: 'manual',
  });
  const cookie = login.headers.getSetCookie()[0].split(';')[0];
  const csrf = um('SELECT csrf FROM sessao WHERE id = ?', decodeURIComponent(cookie.split('=')[1])).csrf;

  const r = await fetch(`${base}/admin/disputas/${disputa.id}/resolver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams({ _csrf: csrf, desfecho: 'REVERTIDO', justificativa: 'O prestador nao comprovou o servico anunciado.' }),
    redirect: 'manual',
  });
  assert.equal(r.status, 302);
  assert.equal(estado('agendamento', ag.id), 'NO_SHOW_PRESTADOR', 'CONCLUIDO contestado e revertido');
  assert.equal(um('SELECT estado FROM lancamento_comissao WHERE agendamento_id = ?', ag.id).estado, 'ESTORNADO');
  for (const id of [c.cliente.id, c.prestador.id]) {
    const [aviso] = notificacoes.listar(id).filter((n) => n.tipo === 'DISPUTA_RESOLVIDA');
    assert.match(aviso.mensagem, /O prestador nao comprovou o servico anunciado./);
  }
});
