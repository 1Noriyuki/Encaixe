/**
 * T-NOSHOW-01, T-AVAL-02, T-DISPUTA-02 e maquinas de estado.
 * Cobre RN-16, RN-20, RN-24, RN-26 e INV-13.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  janelaNoShow, dentroDaJanelaNoShow, assegurarJanelaNoShow,
  prazoAvaliacao, dentroDaJanelaAvaliacao, assegurarJanelaAvaliacao,
  prazoDisputa, assegurarPrazoDisputa, assegurarAtendimentoTerminou,
  prazoAutoConclusao, fimDoHorario,
} from '../../src/dominio/prazos.js';
import {
  assegurarTransicao, podeTransicionar, ehTerminal,
  ESTADOS_AGENDAMENTO, AGENDAMENTO_ATIVO,
} from '../../src/dominio/estados.js';
import { PADROES } from '../../src/dominio/parametros.js';

const P = PADROES;
const INICIO = '2026-08-21T17:00:00.000Z';
const DURACAO = 60; // termina 18:00Z

test('fim do horario = inicio + duracao', () => {
  assert.equal(fimDoHorario(INICIO, DURACAO), '2026-08-21T18:00:00.000Z');
});

test('T-NOSHOW-01 | RN-20: a janela de no-show abre 15 min apos o inicio', () => {
  const { abreEm, fechaEm } = janelaNoShow(INICIO, DURACAO, P);
  assert.equal(abreEm, '2026-08-21T17:15:00.000Z');
  assert.equal(fechaEm, '2026-08-22T18:00:00.000Z', '24h apos o fim');

  assert.equal(dentroDaJanelaNoShow(INICIO, DURACAO, '2026-08-21T17:10:00.000Z', P), false);
  assert.equal(dentroDaJanelaNoShow(INICIO, DURACAO, '2026-08-21T17:15:00.000Z', P), true);
  assert.equal(dentroDaJanelaNoShow(INICIO, DURACAO, '2026-08-22T17:59:00.000Z', P), true);
  assert.equal(dentroDaJanelaNoShow(INICIO, DURACAO, '2026-08-22T18:01:00.000Z', P), false);
});

test('T-NOSHOW-01b | RN-20: reporte cedo demais e reporte tarde demais explicam o prazo', () => {
  assert.throws(
    () => assegurarJanelaNoShow(INICIO, DURACAO, '2026-08-21T17:05:00.000Z', P),
    (e) => e.regra === 'RN-20' && /cedo/i.test(e.message),
  );
  assert.throws(
    () => assegurarJanelaNoShow(INICIO, DURACAO, '2026-08-23T00:00:00.000Z', P),
    (e) => e.regra === 'RN-20' && /prazo/i.test(e.message),
  );
});

test('T-AVAL-02 | RN-24: a avaliacao fica aberta por 7 dias apos a conclusao', () => {
  const concluido = '2026-08-21T18:05:00.000Z';
  assert.equal(prazoAvaliacao(concluido, P), '2026-08-28T18:05:00.000Z');
  assert.equal(dentroDaJanelaAvaliacao(concluido, '2026-08-27T00:00:00.000Z', P), true);
  assert.equal(dentroDaJanelaAvaliacao(concluido, '2026-08-29T00:00:00.000Z', P), false);
  assert.throws(
    () => assegurarJanelaAvaliacao(concluido, '2026-08-29T00:00:00.000Z', P),
    (e) => e.regra === 'RN-24',
  );
});

test('T-DISPUTA-02 | RN-26: disputa pode ser aberta ate 48h apos o fim do atendimento', () => {
  assert.equal(prazoDisputa(INICIO, DURACAO, P), '2026-08-23T18:00:00.000Z');
  assert.doesNotThrow(() => assegurarPrazoDisputa(INICIO, DURACAO, '2026-08-23T17:00:00.000Z', P));
  assert.throws(
    () => assegurarPrazoDisputa(INICIO, DURACAO, '2026-08-23T18:30:00.000Z', P),
    (e) => e.regra === 'RN-26',
  );
});

test('RF-058 | RN-16: nao se conclui um atendimento que ainda nao terminou', () => {
  assert.throws(
    () => assegurarAtendimentoTerminou(INICIO, DURACAO, '2026-08-21T17:59:00.000Z'),
    (e) => e.regra === 'RN-16',
  );
  assert.doesNotThrow(() => assegurarAtendimentoTerminou(INICIO, DURACAO, '2026-08-21T18:00:00.000Z'));
});

test('RF-060: a conclusao automatica vale 24h apos o fim', () => {
  assert.equal(prazoAutoConclusao(INICIO, DURACAO, P), '2026-08-22T18:00:00.000Z');
});

// ---------------------------------------------------------- maquinas de estado

test('INV-13 | transicoes fora da maquina de estados sao recusadas', () => {
  assert.doesNotThrow(() => assegurarTransicao('agendamento', 'PENDENTE_CONFIRMACAO', 'CONFIRMADO'));
  assert.throws(
    () => assegurarTransicao('agendamento', 'CANCELADO_CLIENTE', 'CONCLUIDO'),
    (e) => e.regra === 'INV-13',
  );
  assert.throws(
    () => assegurarTransicao('agendamento', 'CONCLUIDO', 'CANCELADO_CLIENTE'),
    (e) => e.regra === 'INV-13',
  );
});

test('todo estado terminal de agendamento realmente nao tem saida', () => {
  for (const estado of ['RECUSADO', 'EXPIRADO', 'CANCELADO_CLIENTE', 'CANCELADO_PRESTADOR', 'ARQUIVADO']) {
    assert.equal(ehTerminal('agendamento', estado), true, `${estado} deveria ser terminal`);
  }
  assert.equal(ehTerminal('agendamento', 'CONCLUIDO'), false, 'concluido ainda aceita disputa');
});

test('a disputa e o unico caminho de volta a partir de um no-show', () => {
  assert.deepEqual(ESTADOS_AGENDAMENTO.NO_SHOW_CLIENTE, ['EM_DISPUTA']);
  assert.deepEqual(ESTADOS_AGENDAMENTO.NO_SHOW_PRESTADOR, ['EM_DISPUTA']);
});

test('INV-01: os estados que ocupam o horario sao exatamente os nao terminais ativos', () => {
  assert.deepEqual(AGENDAMENTO_ATIVO, ['PENDENTE_CONFIRMACAO', 'CONFIRMADO', 'EM_DISPUTA']);
  for (const estado of AGENDAMENTO_ATIVO) {
    assert.equal(ehTerminal('agendamento', estado), false);
  }
});

test('a conta suspensa so volta por decisao do admin', () => {
  assert.equal(podeTransicionar('conta', 'SUSPENSO', 'ATIVO'), true);
  assert.equal(podeTransicionar('conta', 'SUSPENSO', 'RESTRITO'), false);
  assert.equal(ehTerminal('conta', 'REPROVADO'), true);
});
