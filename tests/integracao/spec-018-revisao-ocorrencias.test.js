/**
 * SPEC-018 - revisao automatica por ocorrencias do prestador (RF-056, RN-21).
 * Os IDs seguem a §12 da Spec; T-REVISAO-01 ja existia.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara, publicarDaquiA, agoraDoTeste } from '../apoio/cenario.js';
import * as adminApp from '../../src/aplicacao/admin.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as busca from '../../src/aplicacao/busca.js';
import * as reputacao from '../../src/aplicacao/reputacao.js';
import * as parametrosRepo from '../../src/infra/repositorios/parametros.js';
import * as social from '../../src/infra/repositorios/social.js';
import { um } from '../../src/infra/db/conexao.js';
import { TIPO_EVENTO } from '../../src/dominio/reputacao.js';
import { adicionarDias, adicionarHoras } from '../../src/dominio/tempo.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

const estadoConta = (id) => um('SELECT estado_conta FROM usuario WHERE id = ?', id).estado_conta;

/** Ocorrencia negativa direto no livro-razao, como a gravariam cancelamento ou no-show. */
function ocorrencia(usuarioId, origemId, tipo = TIPO_EVENTO.CANCELAMENTO_PARCIAL) {
  reputacao.aplicarEvento({ usuarioId, tipo, delta: -1, origemTipo: 'agendamento', origemId });
  return reputacao.verificarOcorrenciasDoPrestador(usuarioId);
}

test('T-REVISAO-03 | RF-056: em revisao, o prestador sai da busca e da publicacao, e o confirmado continua valendo', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const livre = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 6);
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  ocorrencia(c.prestador.id, 101);
  ocorrencia(c.prestador.id, 102);
  assert.equal(estadoConta(c.prestador.id), 'ATIVO', 'duas ainda nao bastam (P-12a = 3)');
  assert.equal(ocorrencia(c.prestador.id, 103, TIPO_EVENTO.NO_SHOW).emRevisao, true);

  assert.equal(estadoConta(c.prestador.id), 'EM_REVISAO');
  assert.ok(!busca.buscarPorFiltros().some(({ id }) => id === livre.id), 'horario publicado sai da busca');
  assert.throws(() => publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 10), (e) => e.regra === 'RN-21');
  assert.equal(adminApp.filaDeRevisao().find(({ id }) => id === c.prestador.id).motivo.regra, 'RN-21');

  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  assert.equal(agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id }).estado, 'CONCLUIDO',
    'o atendimento ja confirmado segue ate o fim');
});

test('T-REVISAO-04 | RN-21: so conta ocorrencia dentro de P-12b e nao revertida; P-12a vem do parametro', () => {
  const c = cenarioBasico();
  ocorrencia(c.prestador.id, 201);
  viajarPara(adicionarDias(agoraDoTeste(), 31));
  ocorrencia(c.prestador.id, 202);
  assert.equal(ocorrencia(c.prestador.id, 203).total, 2, 'a de 31 dias atras saiu da janela de 30');

  social.reverterEventosDaOrigem('agendamento', 203, agoraDoTeste());
  assert.equal(reputacao.verificarOcorrenciasDoPrestador(c.prestador.id).total, 1, 'revertida por disputa nao conta');

  parametrosRepo.salvarGlobal('ocorrencias_consecutivas_max', 2, c.adminId);
  assert.equal(ocorrencia(c.prestador.id, 204).emRevisao, true, 'com P-12a = 2, a segunda ja leva a revisao');
});

test('T-REVISAO-05 | RN-21: cliente nunca entra em revisao por esta regra', () => {
  const c = cenarioBasico();
  for (const origem of [301, 302, 303, 304]) ocorrencia(c.cliente.id, origem, TIPO_EVENTO.NO_SHOW);

  assert.notEqual(estadoConta(c.cliente.id), 'EM_REVISAO');
  assert.equal(um("SELECT COUNT(*) AS n FROM log_auditoria WHERE acao = 'PRESTADOR_EM_REVISAO_POR_OCORRENCIAS'").n, 0);
});
