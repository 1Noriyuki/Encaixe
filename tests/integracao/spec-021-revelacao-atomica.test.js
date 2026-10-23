/** SPEC-021: revelação cega não admite gravação parcial nem avisos duplicados. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';
import { executar } from '../../src/infra/db/conexao.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as avaliacoes from '../../src/aplicacao/avaliacoes.js';
import * as social from '../../src/infra/repositorios/social.js';
import * as auditoria from '../../src/infra/auditoria.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

function atendimento() {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return { c, ag };
}

test('T-SPEC021-01 | RN-25: revelar duas vezes não duplica avisos ou auditoria', () => {
  const { c, ag } = atendimento();
  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 5 });
  avaliacoes.avaliar({ usuarioId: c.prestador.id, agendamentoId: ag.id, nota: 4 });

  const antesTitular = social.notificacoesDoUsuario(c.cliente.id)
    .filter(a => a.tipo === 'AVALIACAO_REVELADA').length;
  const antesPrestador = social.notificacoesDoUsuario(c.prestador.id)
    .filter(a => a.tipo === 'AVALIACAO_REVELADA').length;
  const antesAudit = auditoria.historicoDe('agendamento', ag.id)
    .filter(e => e.acao === 'AVALIACOES_REVELADAS').length;
  assert.equal(antesTitular, 1);
  assert.equal(antesPrestador, 1);
  assert.equal(antesAudit, 1);
  assert.equal(avaliacoes.revelar(ag.id), false);
  assert.equal(social.notificacoesDoUsuario(c.cliente.id)
    .filter(a => a.tipo === 'AVALIACAO_REVELADA').length, antesTitular);
  assert.equal(social.notificacoesDoUsuario(c.prestador.id)
    .filter(a => a.tipo === 'AVALIACAO_REVELADA').length, antesPrestador);
  assert.equal(auditoria.historicoDe('agendamento', ag.id)
    .filter(e => e.acao === 'AVALIACOES_REVELADAS').length, antesAudit);
});

test('T-SPEC021-02 | RNF-01/RN-25: erro de auditoria mantém avaliação oculta', () => {
  const { c, ag } = atendimento();
  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 5 });
  assert.equal(social.avaliacoesDoAgendamento(ag.id)[0].visivel, 0);
  const antes = social.notificacoesDoUsuario(c.cliente.id).length;
  executar(`CREATE TRIGGER impedir_auditoria_avaliacao
    BEFORE INSERT ON log_auditoria WHEN NEW.acao = 'AVALIACOES_REVELADAS'
    BEGIN SELECT RAISE(ABORT, 'auditoria indisponivel'); END`);
  assert.throws(() => avaliacoes.revelar(ag.id), /auditoria indisponivel/);
  assert.equal(social.avaliacoesDoAgendamento(ag.id)[0].visivel, 0);
  assert.equal(social.notificacoesDoUsuario(c.cliente.id).length, antes);
  assert.equal(auditoria.historicoDe('agendamento', ag.id)
    .filter(e => e.acao === 'AVALIACOES_REVELADAS').length, 0);
});
