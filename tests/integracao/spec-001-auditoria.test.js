/**
 * SPEC-001: registro atômico de transições e correlação por operação.
 * CA-08, CA-09, CA-10; INV-003 e INV-005; RNF-07/RNF-08.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, T0 } from '../apoio/cenario.js';
import { executar } from '../../src/infra/db/conexao.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as horarios from '../../src/aplicacao/horarios.js';
import * as horariosRepo from '../../src/infra/repositorios/horarios.js';
import * as auditoria from '../../src/infra/auditoria.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-AUDIT-01 | RF-084: transicao persistida gera exatamente um registro com todos os campos', () => {
  const c = cenarioBasico();
  const agendamento = auditoria.comCorrelacao('OPERACAO-1', () => agendamentos.reservar({
    clienteId: c.cliente.id, horarioId: c.horario.id,
  }));

  const registros = auditoria.historicoDe('horario', c.horario.id)
    .filter((linha) => linha.acao === 'HORARIO_BLOQUEADO');
  assert.equal(registros.length, 1);
  assert.equal(registros[0].estado_anterior, 'PUBLICADO');
  assert.equal(registros[0].estado_novo, 'BLOQUEADO');
  assert.equal(registros[0].ator_id, c.cliente.id);
  assert.equal(registros[0].correlacao_id, 'OPERACAO-1');
  assert.equal(registros[0].criado_em, T0);
  assert.equal(horariosRepo.porId(c.horario.id).estado, 'BLOQUEADO');
  assert.equal(agendamento.estado, 'PENDENTE_CONFIRMACAO');
});

test('T-AUDIT-02 | RF-084: falha da auditoria desfaz mudanca de estado', () => {
  const c = cenarioBasico();
  executar(
    `CREATE TEMP TRIGGER falha_auditoria BEFORE INSERT ON log_auditoria
      BEGIN SELECT RAISE(ABORT, 'falha forçada da auditoria'); END`,
  );

  assert.throws(
    () => horarios.cancelarHorarioLivre({ prestadorId: c.prestador.id, horarioId: c.horario.id }),
    /falha forçada da auditoria/,
  );
  assert.equal(horariosRepo.porId(c.horario.id).estado, 'PUBLICADO');
  assert.equal(
    auditoria.historicoDe('horario', c.horario.id).filter((l) => l.acao === 'HORARIO_CANCELADO').length,
    0,
  );
});

test('T-AUDIT-03 | RNF-07: uma reserva compartilha correlacao entre duas entidades', () => {
  const c = cenarioBasico();
  const agendamento = auditoria.comCorrelacao('RESERVA-123', () => agendamentos.reservar({
    clienteId: c.cliente.id, horarioId: c.horario.id,
  }));
  const um = auditoria.historicoDe('agendamento', agendamento.id)
    .find((l) => l.acao === 'RESERVA_CRIADA');
  const dois = auditoria.historicoDe('horario', c.horario.id)
    .find((l) => l.acao === 'HORARIO_BLOQUEADO');

  assert.ok(um && dois);
  assert.equal(um.correlacao_id, 'RESERVA-123');
  assert.equal(dois.correlacao_id, um.correlacao_id);
});

test('T-AUDIT-03b | RNF-07: requisicoes intercaladas nao misturam correlacoes', async () => {
  // Duas operações concorrentes passam por await em ordem intercalada.
  // O antigo estado global por módulo misturava os identificadores.
  const primeira = auditoria.comCorrelacao('REQ-A', async () => {
    await Promise.resolve();
    await Promise.resolve();
    auditoria.registrar({ acao: 'OPERACAO_A', entidade: 'teste' });
  });
  const segunda = auditoria.comCorrelacao('REQ-B', async () => {
    await Promise.resolve();
    auditoria.registrar({ acao: 'OPERACAO_B', entidade: 'teste' });
  });
  await Promise.all([primeira, segunda]);

  const linhas = auditoria.recentes(10);
  assert.equal(linhas.find((l) => l.acao === 'OPERACAO_A').correlacao_id, 'REQ-A');
  assert.equal(linhas.find((l) => l.acao === 'OPERACAO_B').correlacao_id, 'REQ-B');
  auditoria.comCorrelacao('REQ-C', () => auditoria.registrar({ acao: 'OPERACAO_C', entidade: 'teste' }));
  assert.equal(auditoria.recentes(1)[0].correlacao_id, 'REQ-C');
});

test('T-AUDIT-04 | RNF-08: a auditoria grava instantes UTC injetados', () => {
  const c = cenarioBasico();
  const agendamento = auditoria.comCorrelacao('UTC-1', () => agendamentos.reservar({
    clienteId: c.cliente.id, horarioId: c.horario.id,
  }));
  const registro = auditoria.historicoDe('agendamento', agendamento.id)
    .find((l) => l.acao === 'RESERVA_CRIADA');

  assert.equal(registro.criado_em, T0);
  assert.match(registro.criado_em, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(registro.correlacao_id, 'UTC-1');
});
