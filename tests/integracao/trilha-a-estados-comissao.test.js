/** Trilha A — SPEC-001 §9.7.1: máquina e auditoria da comissão. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';
import { assegurarTransicao, ESTADOS_COMISSAO } from '../../src/dominio/estados.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as comissao from '../../src/aplicacao/comissao.js';
import * as disputas from '../../src/aplicacao/disputas.js';
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
  return { c, id: ag.id };
}

function transicoesDe(lancamentoId) {
  return auditoria.historicoDe('comissao', lancamentoId)
    .filter(e => e.acao === 'COMISSAO_ESTADO_ALTERADO');
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
  const { id } = atendimentoConcluido();
  const original = financeiro.porAgendamento(id);
  assert.equal(original.estado, 'EFETIVADO');
  comissao.transicionar({ agendamentoId: id, para: 'RETIDO', atorId: null });
  comissao.transicionar({ agendamentoId: id, para: 'EFETIVADO', atorId: null });
  assert.equal(financeiro.porAgendamento(id).estado, 'EFETIVADO');
  const transicoes = transicoesDe(original.id);
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
  const { id } = atendimentoConcluido();
  comissao.transicionar({ agendamentoId: id, para: 'RETIDO', atorId: null });
  comissao.transicionar({ agendamentoId: id, para: 'ESTORNADO', atorId: null });
  assert.throws(
    () => comissao.transicionar({ agendamentoId: id, para: 'EFETIVADO', atorId: null }),
    e => e.regra === 'INV-13',
  );
  assert.equal(financeiro.porAgendamento(id).estado, 'ESTORNADO');
});

test('T-COMISSAO-ESTADO-04 | RF-084: operacao idempotente nao gera auditoria extra', () => {
  const { id } = atendimentoConcluido();
  const lancamento = financeiro.porAgendamento(id);
  comissao.transicionar({ agendamentoId: id, para: 'EFETIVADO', atorId: null });
  assert.equal(transicoesDe(lancamento.id).length, 0);
});

test('T-COMISSAO-ESTADO-05 | INV-13: falha de auditoria reverte mudanca financeira', () => {
  const { id } = atendimentoConcluido();
  executar(`CREATE TRIGGER recusar_auditoria_comissao
    BEFORE INSERT ON log_auditoria WHEN NEW.acao = 'COMISSAO_ESTADO_ALTERADO'
    BEGIN SELECT RAISE(ABORT, 'falha de auditoria'); END`);
  assert.throws(
    () => comissao.transicionar({ agendamentoId: id, para: 'RETIDO', atorId: null }),
    /falha de auditoria/,
  );
  assert.equal(financeiro.porAgendamento(id).estado, 'EFETIVADO');
});

test('T-COMISSAO-ESTADO-06 | RF-084: o lançamento nasce EFETIVADO, auditado uma vez, com quem concluiu', () => {
  const { c, id } = atendimentoConcluido();
  const lancamento = financeiro.porAgendamento(id);
  const criacoes = auditoria.historicoDe('comissao', lancamento.id)
    .filter(e => e.acao === 'COMISSAO_APURADA');
  assert.equal(criacoes.length, 1);
  assert.equal(criacoes[0].estado_anterior, null);
  assert.equal(criacoes[0].estado_novo, 'EFETIVADO');
  assert.equal(criacoes[0].ator_id, c.prestador.id);
  assert.equal(criacoes[0].detalhe.agendamentoId, id);
});

test('T-COMISSAO-ESTADO-07 | RF-084 / §9.2: a disputa audita a comissao com o ator de cada passo', () => {
  const { c, id } = atendimentoConcluido();
  const lancamento = financeiro.porAgendamento(id);
  const d = disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: id, motivo: 'SERVICO_NAO_REALIZADO',
    evidencia: 'Print da conversa em que o prestador avisa que nao ia comparecer.',
  });
  disputas.resolver({
    adminId: c.adminId, disputaId: d.id, desfecho: 'REVERTIDO',
    justificativa: 'A evidencia do cliente e conclusiva: o atendimento nao ocorreu.',
  });

  // ator nulo e o sistema (OPEN-104): quem reteve foi o cliente, quem estornou foi o admin.
  assert.deepEqual(
    transicoesDe(lancamento.id).map(e => [e.estado_novo, e.ator_id]),
    [['RETIDO', c.cliente.id], ['ESTORNADO', c.adminId]],
  );
});

test('T-COMISSAO-ESTADO-08 | §9.2: transicionar sem ator explicito e recusado', () => {
  const { id } = atendimentoConcluido();
  assert.throws(() => comissao.transicionar({ agendamentoId: id, para: 'RETIDO' }), /atorId/);
  assert.equal(financeiro.porAgendamento(id).estado, 'EFETIVADO');
});
