/**
 * Apresentacao de tempo - RNF-08.
 *
 * O rotulo de dia da agenda recebe a referencia como parametro, em vez de
 * olhar o relogio: e o que permite testar "hoje" e "amanha" sem depender de
 * quando a suite roda.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatarDiaLongo, formatarHora, humanizarMinutos, adicionarDias, adicionarHoras,
} from '../../src/dominio/tempo.js';

// Quinta-feira, 10h em Sao Paulo (o mesmo T0 dos testes de integracao).
const T0 = '2026-09-10T13:00:00.000Z';

test('RNF-08: o dia de hoje aparece como "hoje", nao como data', () => {
  assert.equal(formatarDiaLongo(T0, T0), 'hoje');
  assert.equal(formatarDiaLongo(adicionarHoras(T0, 6), T0), 'hoje',
    'ainda e o mesmo dia em Sao Paulo');
});

test('RNF-08: o dia seguinte aparece como "amanha"', () => {
  assert.equal(formatarDiaLongo(adicionarDias(T0, 1), T0), 'amanhã');
});

test('RNF-08: do terceiro dia em diante o rotulo traz o dia por extenso', () => {
  const rotulo = formatarDiaLongo(adicionarDias(T0, 3), T0);
  assert.match(rotulo, /domingo/, '10/09/2026 e quinta; tres dias depois cai no domingo');
  assert.match(rotulo, /13 de setembro/);
});

test('RNF-08: a virada do dia segue o fuso de Sao Paulo, nao o UTC', () => {
  // 02:30Z de 11/09 ainda e 23:30 do dia 10 em Sao Paulo (UTC-3).
  assert.equal(formatarDiaLongo('2026-09-11T02:30:00.000Z', T0), 'hoje');
  assert.equal(formatarHora('2026-09-11T02:30:00.000Z'), '23:30');
});

test('a antecedencia e escrita para gente ler, nao em minutos crus', () => {
  assert.equal(humanizarMinutos(0), 'agora');
  assert.equal(humanizarMinutos(45), '45 min');
  assert.equal(humanizarMinutos(60), '1 h');
  assert.equal(humanizarMinutos(200), '3 h 20 min');
  assert.equal(humanizarMinutos(60 * 26), '1 d 2 h');
});
