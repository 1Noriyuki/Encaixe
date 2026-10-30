/**
 * SPEC-022 - abertura de disputa (RF-055, RF-071 a RF-073, RN-17, RN-26, INV-11, INV-12).
 * Os IDs seguem a §12 da Spec; T-DISPUTA-01 a 02b e T-NOSHOW-04 ja existiam.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara, publicarDaquiA } from '../apoio/cenario.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import { executar, um } from '../../src/infra/db/conexao.js';
import { adicionarHoras, adicionarMinutos } from '../../src/dominio/tempo.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

const estado = (tabela, id) => um(`SELECT estado FROM ${tabela} WHERE id = ?`, id).estado;
const EVIDENCIA = 'Descricao do que aconteceu no atendimento.';

function confirmada(c, horario = c.horario, cliente = c.cliente) {
  const ag = agendamentos.reservar({ clienteId: cliente.id, horarioId: horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return ag;
}

test('T-DISPUTA-08 | RF-071: abre disputa sobre CONCLUIDO e NO_SHOW_*, e so sobre eles', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const [h2, h3, h4] = [3.5, 5, 6.5].map((h) => publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, h));
  const concluido = confirmada(c);
  const ausenteCliente = confirmada(c, h2, c.cliente2);
  const ausentePrestador = confirmada(c, h3);
  const aindaConfirmado = confirmada(c, h4, c.cliente2);

  viajarPara(adicionarHoras(h3.inicio, 0.5));
  agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: ausenteCliente.id });
  agendamentos.registrarNoShow({ usuarioId: c.cliente.id, agendamentoId: ausentePrestador.id });
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: concluido.id });

  for (const [ag, quem, antes] of [
    [concluido, c.cliente, 'CONCLUIDO'],
    [ausenteCliente, c.cliente2, 'NO_SHOW_CLIENTE'],
    [ausentePrestador, c.prestador, 'NO_SHOW_PRESTADOR'],
  ]) {
    const d = disputas.abrir({ usuarioId: quem.id, agendamentoId: ag.id, motivo: 'OUTRO', evidencia: EVIDENCIA });
    assert.equal(d.estado, 'ABERTA', antes);
    assert.equal(estado('agendamento', ag.id), 'EM_DISPUTA', antes);
    assert.equal(um('SELECT estado_antes_disputa AS e FROM agendamento WHERE id = ?', ag.id).e, antes);
  }

  assert.throws(
    () => disputas.abrir({ usuarioId: c.cliente2.id, agendamentoId: aindaConfirmado.id, motivo: 'OUTRO', evidencia: EVIDENCIA }),
    (e) => e.regra === 'RN-26',
  );
  assert.equal(estado('agendamento', aindaConfirmado.id), 'CONFIRMADO');
});

test('T-DISPUTA-09 | RF-072: sem motivo da lista ou sem evidencia, a recusa diz o que falta e nada e gravado', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = confirmada(c);
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  const abrir = (motivo, evidencia) => () => disputas.abrir({ usuarioId: c.cliente.id, agendamentoId: ag.id, motivo, evidencia });

  assert.throws(abrir('INVENTADO', EVIDENCIA), (e) => e.campo === 'motivo');
  assert.throws(abrir('OUTRO', 'curta'), (e) => e.regra === 'RN-26' && /evidência/.test(e.message));
  assert.throws(abrir('INVENTADO', ''), (e) => e.regra === 'RN-26' && /motivo/.test(e.message) && /evidência/.test(e.message));

  assert.equal(um('SELECT COUNT(*) AS n FROM disputa').n, 0);
  assert.equal(estado('agendamento', ag.id), 'CONCLUIDO');
});

test('T-DISPUTA-10 | RF-073/INV-12: a comissao fica RETIDA e o banco nao a efetiva durante a disputa', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = confirmada(c);
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  assert.equal(um('SELECT COUNT(*) AS n FROM evento_reputacao WHERE origem_id = ? AND revertido_em IS NULL', ag.id).n, 2);

  disputas.abrir({ usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'SERVICO_DIFERENTE', evidencia: EVIDENCIA });

  assert.equal(um('SELECT estado FROM lancamento_comissao WHERE agendamento_id = ?', ag.id).estado, 'RETIDO');
  assert.equal(um('SELECT COUNT(*) AS n FROM evento_reputacao WHERE origem_id = ? AND revertido_em IS NULL', ag.id).n, 0,
    'os efeitos de reputacao do agendamento ficam suspensos');
  assert.throws(
    () => executar("UPDATE lancamento_comissao SET estado = 'EFETIVADO' WHERE agendamento_id = ?", ag.id),
    /INV-12/,
  );
});

test('T-DISPUTA-11 | RF-055/INV-11: na acusacao mutua a disputa nasce com evidencia e ninguem e penalizado', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = confirmada(c);
  const antes = [c.cliente.id, c.prestador.id].map((id) => um('SELECT reputacao FROM usuario WHERE id = ?', id).reputacao);

  viajarPara(adicionarMinutos(c.horario.inicio, 30));
  agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: ag.id });
  const r = agendamentos.registrarNoShow({ usuarioId: c.cliente.id, agendamentoId: ag.id, relato: 'Eu estava la e ele nao.' });

  assert.equal(r.mutua, true);
  assert.equal(estado('agendamento', ag.id), 'EM_DISPUTA');
  assert.deepEqual([c.cliente.id, c.prestador.id].map((id) => um('SELECT reputacao FROM usuario WHERE id = ?', id).reputacao), antes);
  const disputa = um('SELECT * FROM disputa WHERE agendamento_id = ?', ag.id);
  assert.equal(disputa.aberta_por_id, c.cliente.id, 'OPEN-07 na pratica: abre quem acusa por ultimo');
  assert.equal(disputa.motivo, 'AUSENCIA_CONTESTADA');
  assert.equal(um('SELECT COUNT(*) AS n FROM evidencia WHERE disputa_id = ?', disputa.id).n, 1, 'INV-11');
});
