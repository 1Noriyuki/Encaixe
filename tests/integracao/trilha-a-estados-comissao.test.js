/** Trilha A — SPEC-001 §9.7.1: máquina e auditoria da comissão. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';
import { assegurarTransicao, ESTADOS_COMISSAO } from '../../src/dominio/estados.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as financeiro from '../../src/infra/repositorios/financeiro.js';
import * as auditoria from '../../src/infra/auditoria.js';
import { executar } from '../../src/infra/db/conexao.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

function atendimentoConcluido() {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return ag.id;
}

test('T-COMISSAO-ESTADO-01 | INV-13: declaracao da maquina financeira', () => {
  assert.deepEqual(ESTADOS_COMISSAO, {
    EFETIVADO: ['RETIDO'],
    RETIDO: ['EFETIVADO', 'ESTORNADO'],
    ESTORNADO: [],
  });
  assert.equal(assegurarTransicao('comissao', 'EFETIVADO', 'RETIDO'), 'RETIDO');
  assert.throws(
    () => assegurarTransicao('comissao', 'EFETIVADO', 'ESTORNADO'),
    e => e.regra === 'INV-13',
  );
});

test('T-COMISSAO-ESTADO-02 | RF-084: reter e liberar grava exatamente uma transicao de cada', () => {
  const id = atendimentoConcluido();
  const original = financeiro.porAgendamento(id);
  assert.equal(original.estado, 'EFETIVADO');
  financeiro.atualizarEstado(id, 'RETIDO');
  financeiro.atualizarEstado(id, 'EFETIVADO');
  assert.equal(financeiro.porAgendamento(id).estado, 'EFETIVADO');
  const transicoes = auditoria.historicoDe('comissao', original.id)
    .filter(e => e.acao === 'COMISSAO_ESTADO_ALTERADO');
  assert.deepEqual(transicoes.map(e => [e.estado_anterior, e.estado_novo]), [
    ['EFETIVADO', 'RETIDO'], ['RETIDO', 'EFETIVADO'],
  ]);
  for (const evento of transicoes) {
    assert.equal(evento.ator_id, null);
    assert.ok(evento.criado_em.endsWith('Z'));
    assert.equal(evento.detalhe.agendamentoId, id);
  }
});

test('T-COMISSAO-ESTADO-03 | INV-13: estorno final e transicoes proibidas', () => {
  const id = atendimentoConcluido();
  financeiro.atualizarEstado(id, 'RETIDO');
  financeiro.atualizarEstado(id, 'ESTORNADO');
  assert.throws(() => financeiro.atualizarEstado(id, 'EFETIVADO'), e => e.regra === 'INV-13');
  assert.equal(financeiro.porAgendamento(id).estado, 'ESTORNADO');
});

test('T-COMISSAO-ESTADO-04 | RF-084: operacao idempotente nao gera auditoria extra', () => {
  const id = atendimentoConcluido();
  const lancamento = financeiro.porAgendamento(id);
  financeiro.atualizarEstado(id, 'EFETIVADO');
  const transicoes = auditoria.historicoDe('comissao', lancamento.id)
    .filter(e => e.acao === 'COMISSAO_ESTADO_ALTERADO');
  assert.equal(transicoes.length, 0);
});

test('T-COMISSAO-ESTADO-05 | INV-13: falha de auditoria reverte mudanca financeira', () => {
  const id = atendimentoConcluido();
  executar(`CREATE TRIGGER recusar_auditoria_comissao
    BEFORE INSERT ON log_auditoria WHEN NEW.acao = 'COMISSAO_ESTADO_ALTERADO'
    BEGIN SELECT RAISE(ABORT, 'falha de auditoria'); END`);
  assert.throws(() => financeiro.atualizarEstado(id, 'RETIDO'), /falha de auditoria/);
  assert.equal(financeiro.porAgendamento(id).estado, 'EFETIVADO');
});

test('T-COMISSAO-ESTADO-06 | RF-084: o lançamento nasce EFETIVADO e auditado', () => {
  const id = atendimentoConcluido();
  const lancamento = financeiro.porAgendamento(id);
  const criacoes = auditoria.historicoDe('comissao', lancamento.id)
    .filter(e => e.acao === 'COMISSAO_CRIADA');
  assert.equal(criacoes.length, 1);
  assert.equal(criacoes[0].estado_anterior, null);
  assert.equal(criacoes[0].estado_novo, 'EFETIVADO');
  assert.equal(criacoes[0].detalhe.agendamentoId, id);
});
