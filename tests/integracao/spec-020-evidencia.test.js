/**
 * SPEC-020: evidência dos critérios de aceitação da conclusão e da apuração (CA-01 a CA-09).
 *
 * Cenário padrão: base R$ 100, régua (240 min, 20%) e (60 min, 35%), comissão 12%,
 * atendimento de 60 min. Reserva a 3 h do horário → R$ 80, comissão R$ 9,60.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import { adicionarHoras, adicionarMinutos } from '../../src/dominio/tempo.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as rotinas from '../../src/aplicacao/rotinas.js';
import * as agRepo from '../../src/infra/repositorios/agendamentos.js';
import * as financeiro from '../../src/infra/repositorios/financeiro.js';
import { salvarGlobal } from '../../src/aplicacao/parametros.js';
import { contar, varios } from '../../src/infra/db/conexao.js';
import { ErroDeRegra, ErroDeValidacao } from '../../src/dominio/erros.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

const totalLancamentos = () => contar('SELECT COUNT(*) AS total FROM lancamento_comissao');

function confirmado(opcoes = {}) {
  const c = cenarioBasico({ horasAteHorario: 3, ...opcoes });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return { c, ag };
}

const concluir = (c, ag, extra = {}) => agendamentos.concluir({
  prestadorId: c.prestador.id, agendamentoId: ag.id, ...extra,
});

test('T-SPEC020-01 | RN-16: prestador não conclui antes do fim do serviço', () => {
  const { c, ag } = confirmado();
  viajarPara(adicionarMinutos(c.horario.inicio, 59));
  assert.throws(() => concluir(c, ag), (e) => e instanceof ErroDeRegra && e.regra === 'RN-16');
  assert.equal(agRepo.porId(ag.id).estado, 'CONFIRMADO');
  assert.equal(totalLancamentos(), 0);
  viajarPara(adicionarMinutos(c.horario.inicio, 60));
  assert.equal(concluir(c, ag).estado, 'CONCLUIDO');
});

test('T-SPEC020-02 | RN-16: agendamento não confirmado não conclui', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  assert.throws(() => concluir(c, ag), (e) => e instanceof ErroDeRegra && e.regra === 'RN-16');
  assert.equal(totalLancamentos(), 0);
});

test('T-SPEC020-03 | RN-33: estado de cobrança inválido é recusado', () => {
  const { c, ag } = confirmado();
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  for (const estadoCobranca of ['PENDENTE', 'PAGO', '', null]) {
    assert.throws(() => concluir(c, ag, { estadoCobranca }),
      (e) => e instanceof ErroDeValidacao && e.campo === 'estadoCobranca');
  }
  assert.equal(agRepo.porId(ag.id).estado, 'CONFIRMADO');
  assert.equal(totalLancamentos(), 0);
});

test('T-SPEC020-04 | RN-14: conclusão manual cria um único lançamento com identidade financeira e percentual correto', () => {
  const { c, ag } = confirmado();
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  concluir(c, ag);
  const l = financeiro.porAgendamento(ag.id);
  assert.equal(totalLancamentos(), 1);
  assert.equal(l.valor_bruto, agRepo.porId(ag.id).valor_travado);
  assert.equal(l.valor_bruto, 8000);
  assert.equal(l.percentual_aplicado, 12);
  assert.equal(l.valor_comissao, 960);
  assert.equal(l.valor_liquido, 7040);
  assert.equal(l.valor_bruto, l.valor_comissao + l.valor_liquido);
  assert.equal(l.estado, 'EFETIVADO');
});

test('T-SPEC020-05 | INV-05: duas tentativas de conclusão não duplicam lançamento', () => {
  const { c, ag } = confirmado();
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  concluir(c, ag);
  assert.throws(() => concluir(c, ag), (e) => e.regra === 'RN-16');
  assert.equal(agendamentos.concluirAutomaticamente(agRepo.porId(ag.id)), null);
  viajarPara(adicionarHoras(c.horario.inicio, 72));
  rotinas.executar();
  assert.equal(totalLancamentos(), 1);
});

test('T-SPEC020-06 | RF-060: conclusão automática respeita prazo p-17 congelado', () => {
  const { c, ag } = confirmado();
  const prazo = agRepo.porId(ag.id).autoconclusao_prazo_em;
  viajarPara(adicionarMinutos(prazo, -1));
  rotinas.executar();
  assert.equal(agRepo.porId(ag.id).estado, 'CONFIRMADO');
  viajarPara(prazo);
  rotinas.executar();
  const final = agRepo.porId(ag.id);
  assert.equal(final.estado, 'CONCLUIDO');
  assert.equal(final.estado_cobranca, 'PENDENTE');
  assert.equal(financeiro.porAgendamento(ag.id).estado, 'EFETIVADO');
});

test('T-SPEC020-07 | RN-00: alterar p-17 depois da confirmação não altera prazo já existente', () => {
  const { ag } = confirmado();
  const prazo = agRepo.porId(ag.id).autoconclusao_prazo_em;
  salvarGlobal('autoconclusao_h', 72, null);
  assert.equal(agRepo.porId(ag.id).autoconclusao_prazo_em, prazo);
  viajarPara(prazo);
  rotinas.executar();
  assert.equal(agRepo.porId(ag.id).estado, 'CONCLUIDO');
});

test('T-SPEC020-08 | RN-00/P-22: eventos de reputação preservam deltas do momento da conclusão', () => {
  const { c, ag } = confirmado();
  salvarGlobal('delta_reputacao_conclusao', 2, null);
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  concluir(c, ag);
  const deltas = () => varios(
    "SELECT usuario_id, delta FROM evento_reputacao WHERE tipo = 'CONCLUSAO_SEM_INCIDENTE' AND origem_id = ? ORDER BY usuario_id",
    ag.id,
  ).map((e) => [e.usuario_id, e.delta]);
  const esperado = [[c.prestador.id, 2], [c.cliente.id, 2]].sort((a, b) => a[0] - b[0]);
  assert.deepEqual(deltas(), esperado);
  salvarGlobal('delta_reputacao_conclusao', 1, null);
  assert.deepEqual(deltas(), esperado);
});

test('T-SPEC020-09 | RN-33: nao_pago registra cobrança pendente sem alegar pagamento', () => {
  const { c, ag } = confirmado();
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  concluir(c, ag, { estadoCobranca: 'NAO_PAGO' });
  const final = agRepo.porId(ag.id);
  assert.equal(final.estado, 'CONCLUIDO');
  assert.equal(final.estado_cobranca, 'NAO_PAGO');
  // A comissão é apurada mesmo assim; a cobrança é um estado à parte (SPEC-020 §13).
  assert.equal(financeiro.porAgendamento(ag.id).estado, 'EFETIVADO');
});

test('T-SPEC020-10 | RNF-03: outro prestador não conclui agendamento alheio', () => {
  const { c, ag } = confirmado();
  const outro = contas.cadastrar({
    nome: 'Outro Prestador', email: 'outro@prestador.dev', senha: 'senha1234', perfil: 'PRESTADOR',
  });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  assert.throws(() => agendamentos.concluir({ prestadorId: outro.id, agendamentoId: ag.id }));
  assert.throws(() => agendamentos.concluir({ prestadorId: c.cliente.id, agendamentoId: ag.id }));
  assert.equal(agRepo.porId(ag.id).estado, 'CONFIRMADO');
  assert.equal(totalLancamentos(), 0);
});
