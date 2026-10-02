/**
 * T-DISPUTA-01..05
 * Cobre RN-17 (comissao retida), RN-26 (abertura) e RN-27 (os quatro desfechos).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import * as financeiroRepo from '../../src/infra/repositorios/financeiro.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

/** Leva um agendamento ate CONCLUIDO, com comissao apurada. */
function concluido(c) {
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return ag;
}

test('T-DISPUTA-01 | RN-26: abrir disputa congela o agendamento e retem a comissao', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = concluido(c);
  assert.equal(financeiroRepo.porAgendamento(ag.id).estado, 'EFETIVADO');

  const d = disputas.abrir({
    usuarioId: c.cliente.id,
    agendamentoId: ag.id,
    motivo: 'SERVICO_NAO_REALIZADO',
    relato: 'cheguei e estava fechado',
    evidencia: 'Foto da porta fechada no horario marcado, com hora na tela.',
  });

  assert.equal(d.estado, 'ABERTA');
  const depois = agendamentos.detalhe({ agendamentoId: ag.id, usuarioId: c.cliente.id });
  assert.equal(depois.estado, 'EM_DISPUTA');
  assert.equal(depois.estado_antes_disputa, 'CONCLUIDO');
  // INV-12
  assert.equal(financeiroRepo.porAgendamento(ag.id).estado, 'RETIDO');
});

test('T-DISPUTA-02i | RN-26: sem evidencia a abertura e recusada', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = concluido(c);

  assert.throws(
    () => disputas.abrir({
      usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'OUTRO', evidencia: 'nao',
    }),
    (e) => e.regra === 'RN-26',
  );
});

test('T-DISPUTA-02b | RN-26: fora do prazo de 48h a abertura e recusada', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = concluido(c);

  viajarPara(adicionarHoras(c.horario.inicio, 1 + 50));
  assert.throws(
    () => disputas.abrir({
      usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'OUTRO',
      evidencia: 'Uma evidencia suficientemente longa para passar na validacao.',
    }),
    (e) => e.regra === 'RN-26',
  );
});

test('T-DISPUTA-03 | RN-27 MANTIDO: confirma o desfecho e penaliza quem abriu sem razao', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = concluido(c);
  const repClienteAntes = usuariosRepo.porId(c.cliente.id).reputacao;

  const d = disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'SERVICO_NAO_REALIZADO',
    evidencia: 'Alego que o servico nao foi prestado conforme combinado.',
  });

  disputas.resolver({
    adminId: c.adminId, disputaId: d.id, desfecho: 'MANTIDO',
    justificativa: 'Evidencias do prestador mostram o atendimento realizado.',
  });

  const depois = agendamentos.detalhe({ agendamentoId: ag.id, usuarioId: c.cliente.id, ehAdmin: true });
  assert.equal(depois.estado, 'CONCLUIDO');
  assert.equal(financeiroRepo.porAgendamento(ag.id).estado, 'EFETIVADO', 'comissao volta a valer');
  // -8 de disputa perdida; o +1 da conclusao foi revertido e reaplicado.
  assert.equal(usuariosRepo.porId(c.cliente.id).reputacao, repClienteAntes - 8);
});

test('T-DISPUTA-04 | RN-27 REVERTIDO: inverte o desfecho e estorna a comissao', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = concluido(c);
  const repPrestadorAntes = usuariosRepo.porId(c.prestador.id).reputacao;

  const d = disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'SERVICO_NAO_REALIZADO',
    evidencia: 'Print da conversa em que o prestador avisa que nao ia comparecer.',
  });

  disputas.resolver({
    adminId: c.adminId, disputaId: d.id, desfecho: 'REVERTIDO',
    justificativa: 'A evidencia do cliente e conclusiva: o atendimento nao ocorreu.',
  });

  const depois = agendamentos.detalhe({ agendamentoId: ag.id, usuarioId: c.cliente.id, ehAdmin: true });
  assert.equal(depois.estado, 'NO_SHOW_PRESTADOR');
  assert.equal(financeiroRepo.porAgendamento(ag.id).estado, 'ESTORNADO', 'RN-16: sem atendimento, sem comissao');

  // Prestador: perdeu o +1 da conclusao (revertido), levou -12 de no-show e -8 da disputa.
  assert.equal(usuariosRepo.porId(c.prestador.id).reputacao, repPrestadorAntes - 1 - 12 - 8);
});

test('T-DISPUTA-05 | RN-27 PARCIAL: mantem o desfecho e remove a penalidade', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  viajarPara(adicionarHoras(c.horario.inicio, 0.5));
  agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: ag.id });
  const repAposNoShow = usuariosRepo.porId(c.cliente.id).reputacao;

  const d = disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'AUSENCIA_CONTESTADA',
    evidencia: 'Eu estava no local, mas o atendimento nao comecou por atraso do prestador.',
  });

  disputas.resolver({
    adminId: c.adminId, disputaId: d.id, desfecho: 'PARCIAL',
    justificativa: 'Houve falha de comunicacao dos dois lados; mantenho o registro sem punir.',
  });

  const depois = agendamentos.detalhe({ agendamentoId: ag.id, usuarioId: c.cliente.id, ehAdmin: true });
  assert.equal(depois.estado, 'NO_SHOW_CLIENTE', 'o desfecho original permanece');
  assert.equal(
    usuariosRepo.porId(c.cliente.id).reputacao, repAposNoShow + 12,
    'a penalidade de reputacao foi revertida',
  );
});

test('T-DISPUTA-06 | RN-27 ARQUIVADO: sem elementos, ninguem e penalizado e a comissao e estornada', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = concluido(c);
  const repCliente = usuariosRepo.porId(c.cliente.id).reputacao;
  const repPrestador = usuariosRepo.porId(c.prestador.id).reputacao;

  const d = disputas.abrir({
    usuarioId: c.prestador.id, agendamentoId: ag.id, motivo: 'COBRANCA_DIVERGENTE',
    evidencia: 'O cliente afirma ter pago valor diferente do registrado no sistema.',
  });

  disputas.resolver({
    adminId: c.adminId, disputaId: d.id, desfecho: 'ARQUIVADO',
    justificativa: 'Nenhuma das partes trouxe evidencia suficiente para decidir o caso.',
  });

  const depois = agendamentos.detalhe({ agendamentoId: ag.id, usuarioId: c.cliente.id, ehAdmin: true });
  assert.equal(depois.estado, 'ARQUIVADO');
  assert.equal(financeiroRepo.porAgendamento(ag.id).estado, 'ESTORNADO');
  // As reputacoes voltam ao patamar anterior a conclusao (o +1 fica revertido).
  assert.equal(usuariosRepo.porId(c.cliente.id).reputacao, repCliente - 1);
  assert.equal(usuariosRepo.porId(c.prestador.id).reputacao, repPrestador - 1);
});

test('RN-26 | nao se abre duas disputas sobre o mesmo agendamento', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = concluido(c);

  disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'OUTRO',
    evidencia: 'Primeira evidencia, com tamanho suficiente.',
  });

  assert.throws(
    () => disputas.abrir({
      usuarioId: c.prestador.id, agendamentoId: ag.id, motivo: 'OUTRO',
      evidencia: 'Segunda tentativa de abertura, tambem longa o bastante.',
    }),
    (e) => e.regra === 'RN-26',
  );
});

test('RF-074 | a fila do admin ordena por SLA', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = concluido(c);

  disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'OUTRO',
    evidencia: 'Evidencia com tamanho suficiente para a validacao.',
  });

  const fila = disputas.fila();
  assert.equal(fila.length, 1);
  assert.equal(fila[0].foraDoSla, false);

  // 4 dias depois, o SLA de 72h esta estourado.
  viajarPara(adicionarHoras(c.horario.inicio, 24 * 4));
  assert.equal(disputas.fila()[0].foraDoSla, true);
});
