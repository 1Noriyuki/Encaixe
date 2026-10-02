/**
 * T-REPUT-01..06
 * Cobre RN-22, RN-23, INV-07 e INV-08.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calcularReputacao, classificarPorReputacao, deltaPorAvaliacao, limitar,
  DELTA_NO_SHOW, DELTA_CONCLUSAO, TIPO_EVENTO, TIPOS_OCORRENCIA_NEGATIVA,
} from '../../src/dominio/reputacao.js';
import { PADROES } from '../../src/dominio/parametros.js';

const AGORA = '2026-08-21T15:00:00.000Z';
const P = PADROES; // reputacao_inicial 70, janela 90 dias, limiares 40 e 50

function evento(delta, diasAtras = 0, revertido = null) {
  const criado = new Date(new Date(AGORA).getTime() - diasAtras * 86400000).toISOString();
  return { delta, criado_em: criado, revertido_em: revertido };
}

test('T-REPUT-01 | RN-23: sem eventos, a reputacao e a inicial', () => {
  const r = calcularReputacao([], { inicial: P.reputacao_inicial, janelaDias: P.janela_reputacao_dias, agora: AGORA });
  assert.equal(r, 70);
});

test('T-REPUT-02 | RN-23: deltas por nota seguem a tabela da spec', () => {
  assert.equal(deltaPorAvaliacao(5), 3);
  assert.equal(deltaPorAvaliacao(4), 1);
  assert.equal(deltaPorAvaliacao(3), 0);
  assert.equal(deltaPorAvaliacao(2), -2);
  assert.equal(deltaPorAvaliacao(1), -4);
  assert.throws(() => deltaPorAvaliacao(6), RangeError);
});

test('T-REPUT-03 | INV-08: a reputacao e a soma dos eventos da janela', () => {
  const eventos = [evento(DELTA_CONCLUSAO, 1), evento(3, 2), evento(-2, 3)];
  const r = calcularReputacao(eventos, {
    inicial: 70, janelaDias: P.janela_reputacao_dias, agora: AGORA,
  });
  assert.equal(r, 70 + 1 + 3 - 2);
});

test('T-REPUT-04 | RN-23: eventos fora da janela movel deixam de contar', () => {
  const antigo = evento(-20, 120); // 120 dias atras, janela e de 90
  const recente = evento(-5, 10);
  const r = calcularReputacao([antigo, recente], {
    inicial: 70, janelaDias: 90, agora: AGORA,
  });
  assert.equal(r, 65, 'so o evento recente conta');
});

test('T-REPUT-05 | RN-27: evento revertido por disputa deixa de contar', () => {
  const revertido = evento(DELTA_NO_SHOW, 1, '2026-08-21T10:00:00.000Z');
  const r = calcularReputacao([revertido], {
    inicial: 70, janelaDias: 90, agora: AGORA,
  });
  assert.equal(r, 70, 'a penalidade revertida some do calculo');
});

test('T-REPUT-06 | INV-07: a reputacao fica presa no intervalo [0, 100]', () => {
  const piso = calcularReputacao([evento(-500, 1)], { inicial: 70, janelaDias: 90, agora: AGORA });
  assert.equal(piso, 0);

  const teto = calcularReputacao([evento(500, 1)], { inicial: 70, janelaDias: 90, agora: AGORA });
  assert.equal(teto, 100);

  assert.equal(limitar(-3), 0);
  assert.equal(limitar(140), 100);
});

test('T-REVISAO-02 | RN-22: classificacao por reputacao respeita os dois limiares', () => {
  assert.equal(classificarPorReputacao(80, P), 'ATIVO');
  assert.equal(classificarPorReputacao(50, P), 'ATIVO', 'no limiar de restricao ainda e ativo');
  assert.equal(classificarPorReputacao(49, P), 'RESTRITO');
  assert.equal(classificarPorReputacao(40, P), 'RESTRITO', 'no limiar de revisao ainda e restrito');
  assert.equal(classificarPorReputacao(39, P), 'EM_REVISAO');
  assert.equal(classificarPorReputacao(0, P), 'EM_REVISAO');
});

test('T-REVISAO-03 | RN-22: RESTRITO e estado de cliente, nao de prestador', () => {
  // O prestador entre os dois limiares segue ATIVO: o freio dele e RN-21.
  assert.equal(classificarPorReputacao(45, P, 'PRESTADOR'), 'ATIVO');
  assert.equal(classificarPorReputacao(45, P, 'CLIENTE'), 'RESTRITO');

  // Abaixo do limiar de revisao, qualquer perfil cai em revisao.
  assert.equal(classificarPorReputacao(30, P, 'PRESTADOR'), 'EM_REVISAO');
  assert.equal(classificarPorReputacao(30, P, 'CLIENTE'), 'EM_REVISAO');
});

test('RN-21: apenas cancelamentos com penalidade e no-show contam como ocorrencia', () => {
  assert.deepEqual(TIPOS_OCORRENCIA_NEGATIVA, [
    TIPO_EVENTO.CANCELAMENTO_PARCIAL,
    TIPO_EVENTO.CANCELAMENTO_TOTAL,
    TIPO_EVENTO.NO_SHOW,
  ]);
  assert.ok(!TIPOS_OCORRENCIA_NEGATIVA.includes(TIPO_EVENTO.AVALIACAO));
});
