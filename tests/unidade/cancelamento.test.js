/**
 * T-CANCEL-01..05
 * Cobre RN-18 (cancelamento do cliente) e RN-19 (cancelamento do prestador).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FAIXA, faixaDeCancelamento, penalidadeDeCancelamento, previaDeCancelamento,
} from '../../src/dominio/cancelamento.js';
import { PADROES } from '../../src/dominio/parametros.js';
import { ErroDeRegra } from '../../src/dominio/erros.js';

const P = PADROES; // cancelamento_livre_h = 6, cancelamento_total_h = 2

test('T-CANCEL-01 | RN-18: acima de 6h de antecedencia o cancelamento e livre', () => {
  assert.equal(faixaDeCancelamento(7 * 60, P), FAIXA.LIVRE);
  assert.equal(faixaDeCancelamento(6 * 60, P), FAIXA.LIVRE, 'a borda de 6h ainda e livre');
  assert.equal(penalidadeDeCancelamento(FAIXA.LIVRE, 'CLIENTE').delta, 0);
});

test('T-CANCEL-02 | RN-18: entre 2h e 6h a penalidade e parcial', () => {
  assert.equal(faixaDeCancelamento(5 * 60, P), FAIXA.PARCIAL);
  assert.equal(faixaDeCancelamento(2 * 60, P), FAIXA.PARCIAL, 'a borda de 2h ainda e parcial');

  const p = penalidadeDeCancelamento(FAIXA.PARCIAL, 'CLIENTE');
  assert.equal(p.delta, -3);
  assert.equal(p.ocorrenciaNegativa, true);
});

test('T-CANCEL-03 | RN-18: abaixo de 2h a penalidade e total', () => {
  assert.equal(faixaDeCancelamento(90, P), FAIXA.TOTAL);
  assert.equal(penalidadeDeCancelamento(FAIXA.TOTAL, 'CLIENTE').delta, -6);
});

test('T-CANCEL-04 | RN-19: o prestador paga mais caro em todas as faixas', () => {
  for (const faixa of [FAIXA.LIVRE, FAIXA.PARCIAL, FAIXA.TOTAL]) {
    const cliente = penalidadeDeCancelamento(faixa, 'CLIENTE').delta;
    const prestador = penalidadeDeCancelamento(faixa, 'PRESTADOR').delta;
    assert.ok(
      prestador <= cliente,
      `na faixa ${faixa} o prestador (${prestador}) deveria doer ao menos tanto quanto o cliente (${cliente})`,
    );
  }
  assert.equal(penalidadeDeCancelamento(FAIXA.LIVRE, 'PRESTADOR').delta, -1);
  assert.equal(penalidadeDeCancelamento(FAIXA.TOTAL, 'PRESTADOR').delta, -10);
});

test('T-CANCEL-05 | RN-18: depois do inicio nao existe cancelamento, existe no-show', () => {
  assert.equal(faixaDeCancelamento(0, P), FAIXA.APOS_INICIO);
  assert.equal(faixaDeCancelamento(-30, P), FAIXA.APOS_INICIO);

  assert.throws(
    () => penalidadeDeCancelamento(FAIXA.APOS_INICIO, 'CLIENTE'),
    (e) => e instanceof ErroDeRegra && /no-show/i.test(e.message),
  );
});

test('T-CANCEL-06 | RF-048: a previa explica em vez de estourar quando o horario ja comecou', () => {
  const previa = previaDeCancelamento(-10, 'CLIENTE', P);
  assert.equal(previa.permitido, false);
  assert.match(previa.motivo, /no-show/i);
});

test('T-CANCEL-07 | RF-048: a previa entrega exatamente o delta que sera aplicado', () => {
  const previa = previaDeCancelamento(3 * 60, 'CLIENTE', P);
  const aplicado = penalidadeDeCancelamento(FAIXA.PARCIAL, 'CLIENTE');
  assert.equal(previa.permitido, true);
  assert.equal(previa.delta, aplicado.delta);
  assert.equal(previa.faixa, aplicado.faixa);
});

test('RN-21: cancelamento livre nao conta como ocorrencia negativa', () => {
  assert.equal(penalidadeDeCancelamento(FAIXA.LIVRE, 'PRESTADOR').ocorrenciaNegativa, false);
  assert.equal(penalidadeDeCancelamento(FAIXA.PARCIAL, 'PRESTADOR').ocorrenciaNegativa, true);
  assert.equal(penalidadeDeCancelamento(FAIXA.TOTAL, 'PRESTADOR').ocorrenciaNegativa, true);
});
