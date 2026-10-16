/**
 * T-CANCEL, T-NOSHOW, T-REVISAO, T-RESERVA-05
 * Cobre RN-12, RN-18, RN-19, RN-20, RN-21, RN-22 no fluxo real.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  prepararBanco, encerrar, cenarioBasico, viajarPara, publicarDaquiA, agoraDoTeste,
} from '../apoio/cenario.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import * as horariosApp from '../../src/aplicacao/horarios.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

/** Reserva e confirma, devolvendo o agendamento. */
function reservarEConfirmar(c, horarioId = c.horario.id, clienteId = c.cliente.id) {
  const ag = agendamentos.reservar({ clienteId, horarioId });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return ag;
}

test('T-CANCEL-01i | RN-18: cliente cancelando com mais de 6h nao perde reputacao', () => {
  const c = cenarioBasico({ horasAteHorario: 10 });
  const ag = reservarEConfirmar(c);
  const antes = usuariosRepo.porId(c.cliente.id).reputacao;

  const { penalidade } = agendamentos.cancelar({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'mudou o plano',
  });

  assert.equal(penalidade.faixa, 'LIVRE');
  assert.equal(penalidade.delta, 0);
  assert.equal(usuariosRepo.porId(c.cliente.id).reputacao, antes);
  // O prestador segue disponivel: o horario volta a ser vendavel.
  assert.equal(horariosApp.detalhe(c.horario.id).estado, 'PUBLICADO');
});

test('T-CANCEL-02i | RN-18: cliente cancelando entre 2h e 6h perde 3 pontos', () => {
  const c = cenarioBasico({ horasAteHorario: 10 });
  const ag = reservarEConfirmar(c);
  const antes = usuariosRepo.porId(c.cliente.id).reputacao;

  viajarPara(adicionarHoras(c.horario.inicio, -4));
  const { penalidade } = agendamentos.cancelar({ usuarioId: c.cliente.id, agendamentoId: ag.id });

  assert.equal(penalidade.faixa, 'PARCIAL');
  assert.equal(usuariosRepo.porId(c.cliente.id).reputacao, antes - 3);
});

test('T-CANCEL-03i | RN-18: cliente cancelando a menos de 2h perde 6 pontos', () => {
  const c = cenarioBasico({ horasAteHorario: 10 });
  const ag = reservarEConfirmar(c);
  const antes = usuariosRepo.porId(c.cliente.id).reputacao;

  viajarPara(adicionarHoras(c.horario.inicio, -1));
  const { penalidade } = agendamentos.cancelar({ usuarioId: c.cliente.id, agendamentoId: ag.id });

  assert.equal(penalidade.faixa, 'TOTAL');
  assert.equal(usuariosRepo.porId(c.cliente.id).reputacao, antes - 6);
});

test('T-CANCEL-04i | RN-19: o prestador cancelando na mesma faixa perde mais', () => {
  const c = cenarioBasico({ horasAteHorario: 10 });
  const ag = reservarEConfirmar(c);
  const antes = usuariosRepo.porId(c.prestador.id).reputacao;

  viajarPara(adicionarHoras(c.horario.inicio, -1));
  const { penalidade } = agendamentos.cancelar({ usuarioId: c.prestador.id, agendamentoId: ag.id });

  assert.equal(penalidade.delta, -10, 'cliente perderia 6 na mesma faixa');
  assert.equal(usuariosRepo.porId(c.prestador.id).reputacao, antes - 10);
  // Quem nao vai atender e o prestador: o horario morre junto.
  assert.equal(horariosApp.detalhe(c.horario.id).estado, 'CANCELADO');
});

test('T-CANCEL-05i | RN-18: depois do inicio nao existe cancelamento', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = reservarEConfirmar(c);

  viajarPara(adicionarHoras(c.horario.inicio, 0.5));
  assert.throws(
    () => agendamentos.cancelar({ usuarioId: c.cliente.id, agendamentoId: ag.id }),
    (e) => e.regra === 'RN-18' && /no-show/i.test(e.message),
  );
});

test('T-NOSHOW-02 | RN-20: prestador registra ausencia do cliente e ele perde 12 pontos', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = reservarEConfirmar(c);
  const antes = usuariosRepo.porId(c.cliente.id).reputacao;

  viajarPara(adicionarHoras(c.horario.inicio, 0.5));
  const r = agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: ag.id });

  assert.equal(r.agendamento.estado, 'NO_SHOW_CLIENTE');
  assert.equal(usuariosRepo.porId(c.cliente.id).reputacao, antes - 12);
});

test('T-NOSHOW-03 | RN-20: cliente registra ausencia do prestador', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = reservarEConfirmar(c);
  const antes = usuariosRepo.porId(c.prestador.id).reputacao;

  viajarPara(adicionarHoras(c.horario.inicio, 0.5));
  const r = agendamentos.registrarNoShow({ usuarioId: c.cliente.id, agendamentoId: ag.id });

  assert.equal(r.agendamento.estado, 'NO_SHOW_PRESTADOR');
  assert.equal(usuariosRepo.porId(c.prestador.id).reputacao, antes - 12);
});

test('T-NOSHOW-04 | RF-055: acusacao mutua nao penaliza ninguem e vai para disputa', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = reservarEConfirmar(c);
  const repCliente = usuariosRepo.porId(c.cliente.id).reputacao;
  const repPrestador = usuariosRepo.porId(c.prestador.id).reputacao;

  viajarPara(adicionarHoras(c.horario.inicio, 0.5));
  agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: ag.id });
  const r = agendamentos.registrarNoShow({
    usuarioId: c.cliente.id, agendamentoId: ag.id, relato: 'ele que nao apareceu',
  });

  assert.equal(r.mutua, true);
  assert.equal(r.agendamento.estado, 'EM_DISPUTA');
  assert.ok(r.disputaId, 'a acusacao mutua cria a disputa para o admin');
  assert.equal(usuariosRepo.porId(c.cliente.id).reputacao, repCliente, 'penalidade suspensa');
  assert.equal(usuariosRepo.porId(c.prestador.id).reputacao, repPrestador);
});

test('T-NOSHOW-01i | RN-20: fora da janela o reporte e recusado', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = reservarEConfirmar(c);

  // Cedo demais: apenas 5 min apos o inicio (carencia e de 15).
  viajarPara(adicionarHoras(c.horario.inicio, 5 / 60));
  assert.throws(
    () => agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: ag.id }),
    (e) => e.regra === 'RN-20',
  );
});

test('T-REVISAO-01 | RN-21: tres cancelamentos com penalidade levam o prestador a revisao', () => {
  const c = cenarioBasico({ horasAteHorario: 10 });

  // Tres horarios distintos, cada um cancelado pelo prestador na faixa total.
  const horarios = [c.horario, ...[12, 14, 16].slice(0, 2).map((h) => publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, h))];

  for (const horario of horarios) {
    const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: horario.id });
    agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
    viajarPara(adicionarHoras(horario.inicio, -1)); // faixa TOTAL
    agendamentos.cancelar({ usuarioId: c.prestador.id, agendamentoId: ag.id });
    viajarPara(agoraDoTeste());
  }

  const prestador = usuariosRepo.porId(c.prestador.id);
  assert.equal(prestador.estado_conta, 'EM_REVISAO');

  // RN-21 - em revisao, nao publica mais.
  assert.throws(
    () => publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 30),
    (e) => e.regra === 'RN-21',
  );
});

test('T-REVISAO-02i | RN-22: reputacao abaixo do limiar de restricao limita as reservas', () => {
  const c = cenarioBasico({ horasAteHorario: 20 });

  // Derruba a reputacao do cliente de 70 para 46 com quatro cancelamentos totais.
  for (const horas of [10, 12, 14, 16]) {
    const horario = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, horas);
    const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: horario.id });
    agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
    viajarPara(adicionarHoras(horario.inicio, -1));
    agendamentos.cancelar({ usuarioId: c.cliente.id, agendamentoId: ag.id });
    viajarPara(agoraDoTeste());
  }

  const cliente = usuariosRepo.porId(c.cliente.id);
  assert.equal(cliente.reputacao, 70 - 24);
  assert.equal(cliente.estado_conta, 'RESTRITO');

  // RN-12 - restrito mantem apenas uma reserva em aberto.
  const h1 = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 40);
  const h2 = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 42);
  agendamentos.reservar({ clienteId: c.cliente.id, horarioId: h1.id });

  assert.throws(
    () => agendamentos.reservar({ clienteId: c.cliente.id, horarioId: h2.id }),
    (e) => e.regra === 'RN-12' && e.detalhes.limite === 1,
  );
});
