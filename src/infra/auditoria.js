/**
 * Trilha de auditoria - RF-084, RF-085, INV-13, RNF-07.
 *
 * Toda transicao de estado passa por aqui. E o que permite reconstruir, depois,
 * por que um agendamento terminou como terminou - inclusive na hora de julgar
 * uma disputa.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import {
  registrarAuditoria, auditoriaDaEntidade, auditoriaRecente, auditoriaDaCorrelacao,
} from './repositorios/moderacao.js';
import { agoraIso } from '../dominio/tempo.js';

/**
 * RNF-07 / SPEC-001 CA-10: contexto separado por fluxo assíncrono.
 * O estado anterior, em variável global, podia ser sobrescrito por outra
 * requisição durante um await.
 */
const correlacoes = new AsyncLocalStorage();

/** Executa um fluxo preservando o identificador em todos os seus awaits. */
export function comCorrelacao(id, acao) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('Correlação inválida.');
  if (typeof acao !== 'function') throw new TypeError('Ação de correlação inválida.');
  return correlacoes.run(id, acao);
}

/**
 * @param {object} evento
 * @param {?number} evento.atorId      quem executou (null = sistema/rotina temporal)
 * @param {string}  evento.acao        verbo do dominio, ex.: 'AGENDAMENTO_CONFIRMADO'
 * @param {string}  evento.entidade    'agendamento' | 'horario' | 'conta' | 'disputa' | ...
 * @param {?number} evento.entidadeId
 * @param {?string} evento.de          estado anterior
 * @param {?string} evento.para        estado novo
 * @param {*}       [evento.detalhe]   qualquer contexto extra (serializado como JSON)
 */
export function registrar({ atorId = null, acao, entidade, entidadeId = null, de = null, para = null, detalhe = null }) {
  return registrarAuditoria({
    ator_id: atorId,
    acao,
    entidade_tipo: entidade,
    entidade_id: entidadeId,
    estado_anterior: de,
    estado_novo: para,
    detalhe: detalhe == null ? null : JSON.stringify(detalhe),
    correlacao_id: correlacoes.getStore() ?? null,
    criado_em: agoraIso(),
  });
}

export function historicoDe(entidade, id) {
  return auditoriaDaEntidade(entidade, id).map((linha) => ({
    ...linha,
    detalhe: linha.detalhe ? JSON.parse(linha.detalhe) : null,
  }));
}

export function recentes(limite = 100) {
  return auditoriaRecente(limite);
}

export function daCorrelacao(correlacaoId) {
  return auditoriaDaCorrelacao(correlacaoId);
}
