/** SPEC-001 P-22: configuração de deltas e histórico imutável. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import { PARAMETROS, normalizarParametro } from '../../src/dominio/parametros.js';
import { salvarGlobal, params } from '../../src/aplicacao/parametros.js';
import { previaDeCancelamento } from '../../src/dominio/cancelamento.js';
import { deltaPorAvaliacao } from '../../src/dominio/reputacao.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as social from '../../src/infra/repositorios/social.js';
import * as usuarios from '../../src/infra/repositorios/usuarios.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-P22-01 | RN-00: tabela P-22 configurável e faixas com mesmo sinal', () => {
  const keys = Object.keys(PARAMETROS).filter(k => k.startsWith('delta_reputacao_'));
  assert.equal(keys.length, 14);
  assert.equal(normalizarParametro('delta_reputacao_noshow', -24), -24);
  assert.equal(normalizarParametro('delta_reputacao_noshow', -6), -6);
  for (const valor of [-25, -5, 0, 1, -7.5]) {
    assert.throws(() => normalizarParametro('delta_reputacao_noshow', valor), e => e.regra === 'RN-00');
  }
  assert.equal(normalizarParametro('delta_reputacao_avaliacao_3', 0), 0);
  assert.throws(() => normalizarParametro('delta_reputacao_avaliacao_3', 1), e => e.regra === 'RN-00');
});

test('T-P22-02 | RN-19: prestador mantém penalidade igual ou maior que cliente', () => {
  salvarGlobal('delta_reputacao_cancelamento_cliente_parcial', -4, null);
  assert.throws(
    () => salvarGlobal('delta_reputacao_cancelamento_prestador_parcial', -3, null),
    e => e.regra === 'RN-19',
  );
  assert.equal(params().delta_reputacao_cancelamento_prestador_parcial, -5);
  salvarGlobal('delta_reputacao_cancelamento_prestador_parcial', -4, null);
  assert.equal(params().delta_reputacao_cancelamento_prestador_parcial, -4);
});

test('T-P22-03 | RN-23: nova prévia usa P-22 vigente por faixa', () => {
  salvarGlobal('delta_reputacao_cancelamento_cliente_parcial', -4, null);
  const previa = previaDeCancelamento(5 * 60, 'CLIENTE', params());
  assert.equal(previa.faixa, 'PARCIAL');
  assert.equal(previa.delta, -4);
  assert.ok(previa.descricao.includes('-4 pontos'));
});

test('T-P22-04 | INV-08/RN-00: penalidade persistida não muda após reconfiguração', () => {
  salvarGlobal('delta_reputacao_cancelamento_cliente_parcial', -4, null);
  const c = cenarioBasico({ horasAteHorario: 5 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  const resultado = agendamentos.cancelar({ usuarioId: c.cliente.id, agendamentoId: ag.id });
  assert.equal(resultado.penalidade.delta, -4);
  const eventos = social.eventosDoUsuario(c.cliente.id);
  const penalidade = eventos.find(e => e.origem_id === ag.id && e.tipo === 'CANCELAMENTO_PARCIAL');
  assert.equal(penalidade.delta, -4);
  assert.equal(usuarios.porId(c.cliente.id).reputacao, 66);
  salvarGlobal('delta_reputacao_cancelamento_cliente_parcial', -3, null);
  assert.equal(social.eventosDoUsuario(c.cliente.id).find(e => e.id === penalidade.id).delta, -4);
  assert.equal(usuarios.porId(c.cliente.id).reputacao, 66);
});

test('T-P22-05 | RN-23: avaliação lê P-22 vigente e mantém fallback padrão', () => {
  assert.equal(deltaPorAvaliacao(5), 3);
  salvarGlobal('delta_reputacao_avaliacao_5', 4, null);
  assert.equal(deltaPorAvaliacao(5, params()), 4);
  assert.equal(deltaPorAvaliacao(5), 3);
});
