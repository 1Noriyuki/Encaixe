/**
 * SPEC-019 - registro de no-show (RF-052 a RF-054, RN-16, RN-20).
 * Os IDs seguem a §12 da Spec; T-NOSHOW-01i a 04 ja existiam.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import * as reputacao from '../../src/aplicacao/reputacao.js';
import * as notificacoes from '../../src/infra/notificacoes.js';
import * as parametrosRepo from '../../src/infra/repositorios/parametros.js';
import { um } from '../../src/infra/db/conexao.js';
import { adicionarHoras, adicionarMinutos } from '../../src/dominio/tempo.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

const estado = (tabela, id) => um(`SELECT estado FROM ${tabela} WHERE id = ?`, id).estado;
const reputacaoDe = (id) => um('SELECT reputacao FROM usuario WHERE id = ?', id).reputacao;

function confirmada(c) {
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return ag;
}

test('T-NOSHOW-05 | RF-052: fora da janela ou fora de CONFIRMADO, a recusa informa a janela valida', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const pendente = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  const reportar = (agendamentoId) => () => agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId });
  const informaJanela = (e) => e.regra === 'RN-20' && e.detalhes?.abreEm && e.detalhes?.fechaEm;

  assert.throws(reportar(pendente.id), (e) => informaJanela(e) && /confirmado, de .* a /.test(e.message));
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: pendente.id });

  viajarPara(adicionarMinutos(c.horario.inicio, 14));
  assert.throws(reportar(pendente.id), (e) => informaJanela(e) && /cedo/.test(e.message));

  // P-16b: 24 h apos o FIM (inicio + 60 min).
  viajarPara(adicionarHoras(c.horario.inicio, 25));
  assert.throws(reportar(pendente.id), (e) => informaJanela(e) && /terminou/.test(e.message));

  viajarPara(adicionarMinutos(c.horario.inicio, 15));
  assert.equal(agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: pendente.id }).agendamento.estado,
    'NO_SHOW_CLIENTE', 'exatamente em P-16a a janela abre');
});

test('T-NOSHOW-06 | RF-053/RN-16: ausencia do cliente penaliza pela P-22, sem comissao, e abre a contestacao ate P-15', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  parametrosRepo.salvarGlobal('delta_reputacao_noshow', -10, c.adminId);
  const ag = confirmada(c);
  const antes = reputacaoDe(c.cliente.id);

  viajarPara(adicionarMinutos(c.horario.inicio, 30));
  agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: ag.id });

  assert.equal(estado('agendamento', ag.id), 'NO_SHOW_CLIENTE');
  assert.equal(estado('horario_vago', c.horario.id), 'ENCERRADO');
  assert.equal(reputacaoDe(c.cliente.id), antes - 10, 'P-22 vigente, nao o -12 fixo');
  assert.equal(um('SELECT COUNT(*) AS n FROM lancamento_comissao').n, 0, 'RN-16: no-show nao gera comissao');
  const [aviso] = notificacoes.listar(c.cliente.id).filter((n) => n.tipo === 'NO_SHOW_REGISTRADO');
  assert.match(aviso.mensagem, /abra uma disputa até/);

  // P-15: 48 h apos o fim.
  viajarPara(adicionarHoras(c.horario.inicio, 50));
  assert.throws(() => disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'AUSENCIA_CONTESTADA',
    evidencia: 'Eu estava no local no horario combinado.',
  }));
  viajarPara(adicionarHoras(c.horario.inicio, 48));
  assert.ok(disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'AUSENCIA_CONTESTADA',
    evidencia: 'Eu estava no local no horario combinado.',
  }).id, 'dentro de P-15 a contestacao e aceita');
});

test('T-NOSHOW-07 | RF-054: ausencia do prestador penaliza e vira ocorrencia da RN-21', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = confirmada(c);
  const antes = reputacaoDe(c.prestador.id);

  viajarPara(adicionarMinutos(c.horario.inicio, 20));
  agendamentos.registrarNoShow({ usuarioId: c.cliente.id, agendamentoId: ag.id });

  assert.equal(estado('agendamento', ag.id), 'NO_SHOW_PRESTADOR');
  assert.equal(reputacaoDe(c.prestador.id), antes - 12);
  assert.equal(reputacao.verificarOcorrenciasDoPrestador(c.prestador.id).total, 1);
  assert.equal(notificacoes.listar(c.prestador.id).filter((n) => n.tipo === 'NO_SHOW_REGISTRADO').length, 1);
});
