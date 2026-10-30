/** SPEC-021 Q3 / RN-00: prazo de avaliação (P-14) travado na conclusão. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import { adicionarHoras, adicionarDias } from '../../src/dominio/tempo.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as avaliacoes from '../../src/aplicacao/avaliacoes.js';
import * as agRepo from '../../src/infra/repositorios/agendamentos.js';
import * as social from '../../src/infra/repositorios/social.js';
import * as rotinas from '../../src/aplicacao/rotinas.js';
import { salvarGlobal } from '../../src/aplicacao/parametros.js';
import { bd, executar, migrar } from '../../src/infra/db/conexao.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

function concluirComJanela(dias) {
  salvarGlobal('janela_avaliacao_dias', dias, null);
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return { c, ag: agRepo.porId(ag.id) };
}

test('T-P14-01 | RN-00/RN-24: a conclusão grava o prazo com a P-14 vigente', () => {
  const { ag } = concluirComJanela(7);
  assert.equal(ag.avaliacao_prazo_em, adicionarDias(ag.encerrado_em, 7));
});

test('T-P14-02 | RN-00: aumentar a P-14 depois não reabre a avaliação', () => {
  const { c, ag } = concluirComJanela(3);
  salvarGlobal('janela_avaliacao_dias', 15, null);
  viajarPara(adicionarDias(ag.encerrado_em, 4));
  assert.throws(
    () => avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 5 }),
    (e) => e.regra === 'RN-24',
  );
});

test('T-P14-03 | RN-00/RN-25: reduzir a P-14 depois não antecipa a revelação', () => {
  const { c, ag } = concluirComJanela(15);
  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 5 });
  salvarGlobal('janela_avaliacao_dias', 3, null);
  viajarPara(adicionarDias(ag.encerrado_em, 4));
  rotinas.executar();
  assert.equal(social.avaliacoesDoAgendamento(ag.id)[0].visivel, 0);
  // Ainda dentro dos 15 dias travados, a outra parte avalia normalmente.
  avaliacoes.avaliar({ usuarioId: c.prestador.id, agendamentoId: ag.id, nota: 4 });
  assert.ok(social.avaliacoesDoAgendamento(ag.id).every((a) => a.visivel === 1));
});

test('T-P14-04 | RNF-01: migração preenche concluídos antigos e é idempotente', () => {
  const { ag } = concluirComJanela(7);
  executar('UPDATE agendamento SET avaliacao_prazo_em = NULL WHERE id = ?', ag.id);
  bd().exec('ALTER TABLE agendamento DROP COLUMN avaliacao_prazo_em');
  salvarGlobal('janela_avaliacao_dias', 10, null);
  migrar();
  migrar();
  assert.equal(agRepo.porId(ag.id).avaliacao_prazo_em, adicionarDias(ag.encerrado_em, 10));
  const campos = bd().prepare('PRAGMA table_info(agendamento)').all().map((c) => c.name);
  assert.equal(campos.filter((c) => c === 'avaliacao_prazo_em').length, 1);
});
