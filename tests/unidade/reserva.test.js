/**
 * T-RESERVA-05/06, T-HORARIO-01/02
 * Cobre RN-06, RN-07, RN-09, RN-10, RN-12 e RN-13.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  limiteDeReservas, assegurarClientePodeReservar, assegurarAntecedenciaPublicacao,
  assegurarAntecedenciaReserva, assegurarHorarioReservavel, assegurarSemSobreposicao,
  haSobreposicao, prazoDeConfirmacao, podeVoltarParaBusca,
} from '../../src/dominio/reserva.js';
import { PADROES } from '../../src/dominio/parametros.js';
import { ErroDeRegra } from '../../src/dominio/erros.js';

const P = PADROES;

test('T-RESERVA-05 | RN-12: o limite de reservas depende da reputacao', () => {
  assert.equal(limiteDeReservas(70, P), 3);
  assert.equal(limiteDeReservas(50, P), 3, 'no limiar ainda e normal');
  assert.equal(limiteDeReservas(49, P), 1);
});

test('T-RESERVA-05b | RN-12: cliente restrito e barrado na segunda reserva', () => {
  const cliente = { estado_conta: 'RESTRITO', reputacao: 45 };
  assert.doesNotThrow(() => assegurarClientePodeReservar(cliente, 0, P));
  assert.throws(
    () => assegurarClientePodeReservar(cliente, 1, P),
    (e) => e instanceof ErroDeRegra && e.regra === 'RN-12' && e.detalhes.limite === 1,
  );
});

test('T-RESERVA-05c | RN-12: cliente normal so e barrado ao atingir o limite', () => {
  const cliente = { estado_conta: 'ATIVO', reputacao: 80 };
  assert.doesNotThrow(() => assegurarClientePodeReservar(cliente, 2, P));
  assert.throws(() => assegurarClientePodeReservar(cliente, 3, P), (e) => e.regra === 'RN-12');
});

test('T-RESERVA-06 | RN-13: conta suspensa ou em revisao nao reserva', () => {
  assert.throws(
    () => assegurarClientePodeReservar({ estado_conta: 'SUSPENSO', reputacao: 90 }, 0, P),
    (e) => e.regra === 'RN-13',
  );
  assert.throws(
    () => assegurarClientePodeReservar({ estado_conta: 'EM_REVISAO', reputacao: 30 }, 0, P),
    (e) => e.regra === 'RN-13',
  );
});

test('T-HORARIO-01 | RN-07: publicar exige 60 min de antecedencia; reservar exige 30', () => {
  assert.throws(() => assegurarAntecedenciaPublicacao(59, P), (e) => e.regra === 'RN-07');
  assert.doesNotThrow(() => assegurarAntecedenciaPublicacao(60, P));

  assert.throws(() => assegurarAntecedenciaReserva(29, P), (e) => e.regra === 'RN-07');
  assert.doesNotThrow(() => assegurarAntecedenciaReserva(30, P));
});

test('T-HORARIO-01b | RN-07: a antecedencia de reserva e menor que a de publicacao', () => {
  assert.ok(
    P.antecedencia_min_reserva_min < P.antecedencia_min_publicacao_min,
    'senao o encaixe de ultima hora seria impossivel',
  );
});

test('T-HORARIO-02 | RN-06: intervalos que se tocam nas bordas nao se sobrepoem', () => {
  const existentes = [{ inicio: '2026-08-21T14:00:00.000Z', duracao_min: 60 }];

  // Comeca exatamente quando o outro termina: permitido.
  assert.equal(haSobreposicao(existentes, { inicio: '2026-08-21T15:00:00.000Z', duracao_min: 30 }), false);
  // Termina exatamente quando o outro comeca: permitido.
  assert.equal(haSobreposicao(existentes, { inicio: '2026-08-21T13:30:00.000Z', duracao_min: 30 }), false);
  // Invade um minuto: barrado.
  assert.equal(haSobreposicao(existentes, { inicio: '2026-08-21T14:59:00.000Z', duracao_min: 30 }), true);
  // Contido dentro do outro: barrado.
  assert.equal(haSobreposicao(existentes, { inicio: '2026-08-21T14:15:00.000Z', duracao_min: 15 }), true);
  // Engloba o outro: barrado.
  assert.equal(haSobreposicao(existentes, { inicio: '2026-08-21T13:00:00.000Z', duracao_min: 180 }), true);
});

test('T-HORARIO-02b | RN-06: a excecao identifica o horario conflitante', () => {
  const existentes = [{ id: 7, inicio: '2026-08-21T14:00:00.000Z', duracao_min: 60 }];
  assert.throws(
    () => assegurarSemSobreposicao(existentes, { inicio: '2026-08-21T14:30:00.000Z', duracao_min: 30 }),
    (e) => e.regra === 'RN-06' && e.detalhes.conflito.id === 7,
  );
});

test('RN-09: horario que nao esta publicado nao aceita reserva', () => {
  for (const estado of ['BLOQUEADO', 'OCUPADO', 'CANCELADO', 'EXPIRADO', 'RASCUNHO']) {
    assert.throws(() => assegurarHorarioReservavel({ estado }), (e) => e.regra === 'RN-09');
  }
  assert.doesNotThrow(() => assegurarHorarioReservavel({ estado: 'PUBLICADO' }));
});

test('T-EXPIRA-01 | RN-10: o prazo de confirmacao nunca ultrapassa o inicio do horario', () => {
  // Janela de 15 min, mas o horario comeca em 5 min.
  const prazo = prazoDeConfirmacao('2026-08-21T14:00:00.000Z', '2026-08-21T14:05:00.000Z', 15);
  assert.equal(prazo, '2026-08-21T14:05:00.000Z');

  // Horario distante: vale a janela cheia.
  const prazo2 = prazoDeConfirmacao('2026-08-21T14:00:00.000Z', '2026-08-21T18:00:00.000Z', 15);
  assert.equal(prazo2, '2026-08-21T14:15:00.000Z');
});

test('RF-044: o horario so volta para a busca se ainda houver antecedencia minima', () => {
  assert.equal(podeVoltarParaBusca('2026-08-21T15:00:00.000Z', '2026-08-21T14:00:00.000Z', P), true);
  assert.equal(podeVoltarParaBusca('2026-08-21T14:20:00.000Z', '2026-08-21T14:00:00.000Z', P), false);
});
