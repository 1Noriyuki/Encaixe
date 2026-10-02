/**
 * Trilha de auditoria - RF-084, RF-085, INV-13, RNF-07.
 *
 * Toda transicao de estado passa por aqui. E o que permite reconstruir, depois,
 * por que um agendamento terminou como terminou - inclusive na hora de julgar
 * uma disputa.
 */

import { registrarAuditoria, auditoriaDaEntidade, auditoriaRecente } from './repositorios/moderacao.js';
import { agoraIso } from '../dominio/tempo.js';

/** Identificador de correlacao da requisicao em curso (preenchido pela camada HTTP). */
let correlacaoAtual = null;

export function definirCorrelacao(id) {
  correlacaoAtual = id;
}

export function limparCorrelacao() {
  correlacaoAtual = null;
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
    correlacao_id: correlacaoAtual,
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
