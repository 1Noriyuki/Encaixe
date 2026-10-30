/** SPEC-001 RN-00 / SPEC-020: prazo P-17 congelado na confirmação. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as agRepo from '../../src/infra/repositorios/agendamentos.js';
import * as rotinas from '../../src/aplicacao/rotinas.js';
import { salvarGlobal } from '../../src/aplicacao/parametros.js';
import { bd, migrar } from '../../src/infra/db/conexao.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

function confirmarComPrazo(prazoHoras) {
  salvarGlobal('autoconclusao_h', prazoHoras, null);
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return { c, agId: ag.id };
}

test('T-P17-01 | RN-00: prazo de conclusão nasce com P-17 da confirmação', () => {
  const { c, agId } = confirmarComPrazo(24);
  const confirmado = agRepo.porId(agId);
  assert.equal(confirmado.autoconclusao_prazo_em, adicionarHoras(c.horario.inicio, 25));
  salvarGlobal('autoconclusao_h', 72, null);
  assert.equal(agRepo.porId(agId).autoconclusao_prazo_em, confirmado.autoconclusao_prazo_em);
  viajarPara(adicionarHoras(c.horario.inicio, 25));
  rotinas.executar();
  assert.equal(agRepo.porId(agId).estado, 'CONCLUIDO');
});

test('T-P17-02 | RN-00: reduzir P-17 não acelera conclusão anterior', () => {
  const { c, agId } = confirmarComPrazo(72);
  salvarGlobal('autoconclusao_h', 12, null);
  viajarPara(adicionarHoras(c.horario.inicio, 25));
  rotinas.executar();
  assert.equal(agRepo.porId(agId).estado, 'CONFIRMADO');
  viajarPara(adicionarHoras(c.horario.inicio, 73));
  rotinas.executar();
  assert.equal(agRepo.porId(agId).estado, 'CONCLUIDO');
});

test('T-P17-03 | RNF-01: migração idempotente preserva prazo travado', () => {
  const { c, agId } = confirmarComPrazo(24);
  const prazo = agRepo.porId(agId).autoconclusao_prazo_em;
  migrar();
  migrar();
  assert.equal(agRepo.porId(agId).autoconclusao_prazo_em, prazo);
  const campos = bd().prepare('PRAGMA table_info(agendamento)').all().map(c => c.name);
  assert.equal(campos.filter(c => c === 'autoconclusao_prazo_em').length, 1);
});

test('T-P17-04 | RN-00/SPEC-020: migração trava a P-17 vigente nos confirmados legados', () => {
  const { c, agId } = confirmarComPrazo(24);
  bd().prepare('UPDATE agendamento SET autoconclusao_prazo_em = NULL WHERE id = ?').run(agId);
  salvarGlobal('autoconclusao_h', 48, null);
  migrar();
  assert.equal(agRepo.porId(agId).autoconclusao_prazo_em, adicionarHoras(c.horario.inicio, 49));
  salvarGlobal('autoconclusao_h', 12, null);
  migrar();
  assert.equal(agRepo.porId(agId).autoconclusao_prazo_em, adicionarHoras(c.horario.inicio, 49));
});
