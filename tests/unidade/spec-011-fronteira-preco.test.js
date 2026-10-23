/** SPEC-011 / RN-01: degrau de preço muda no instante exato, não um minuto antes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { precificar } from '../../src/aplicacao/precos.js';

const horario = {
  inicio: '2026-09-10T17:00:00.000Z',
  preco_base_snapshot: 10_000, preco_minimo_snapshot: 4_000,
  estado: 'PUBLICADO',
};
const faixas = [
  { antecedencia_min: 240, percentual_desconto: 20 },
  { antecedencia_min: 60, percentual_desconto: 35 },
];
const p = { desconto_maximo_pct: 60, antecedencia_min_reserva_min: 30 };

test('T-SPEC011-01 | RN-01: desconto de 4h nao antecipa mesmo por um segundo', () => {
  const antes = precificar(horario, faixas, p, '2026-09-10T12:59:59.000Z');
  assert.equal(antes.precoVigente, 10_000);
  assert.equal(antes.percentualTabela, 0);
  assert.equal(antes.proximoDegrau.em, '2026-09-10T13:00:00.000Z');
  const exato = precificar(horario, faixas, p, '2026-09-10T13:00:00.000Z');
  assert.equal(exato.precoVigente, 8_000);
  assert.equal(exato.percentualTabela, 20);
  const depois = precificar(horario, faixas, p, '2026-09-10T13:00:01.000Z');
  assert.equal(depois.precoVigente, 8_000);
});

test('T-SPEC011-02 | RF-026: proximo degrau tem instante exato e preço correto', () => {
  const antes = precificar(horario, faixas, p, '2026-09-10T15:59:59.000Z');
  assert.equal(antes.precoVigente, 8_000);
  assert.equal(antes.proximoDegrau.em, '2026-09-10T16:00:00.000Z');
  const exato = precificar(horario, faixas, p, '2026-09-10T16:00:00.000Z');
  assert.equal(exato.precoVigente, 6_500);
  assert.equal(exato.proximoDegrau, null);
});

test('T-SPEC011-03 | RN-01: antecedência mínima impede reserva antecipada por arredondamento', () => {
  assert.equal(precificar(horario, faixas, p, '2026-09-10T16:29:59.000Z').reservavel, true);
  assert.equal(precificar(horario, faixas, p, '2026-09-10T16:30:00.000Z').reservavel, true);
  assert.equal(precificar(horario, faixas, p, '2026-09-10T16:30:01.000Z').reservavel, false);
  assert.equal(precificar({ ...horario, estado: 'BLOQUEADO' }, faixas, p,
    '2026-09-10T16:30:00.000Z').reservavel, false);
});
