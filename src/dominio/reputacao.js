/**
 * Reputacao - RN-22, RN-23.
 *
 * A reputacao NAO e um campo que se edita: e a soma dos eventos nao revertidos
 * dentro da janela movel (P-20), truncada em [0, 100] (INV-07, INV-08).
 * O campo `usuario.reputacao` e apenas um cache do calculo, recomputado a cada
 * evento - e reconstituivel a qualquer momento a partir do livro-razao.
 */

import { minutosEntre } from './tempo.js';

export const TIPO_EVENTO = {
  CONCLUSAO: 'CONCLUSAO_SEM_INCIDENTE',
  AVALIACAO: 'AVALIACAO_RECEBIDA',
  CANCELAMENTO_LIVRE: 'CANCELAMENTO_LIVRE',
  CANCELAMENTO_PARCIAL: 'CANCELAMENTO_PARCIAL',
  CANCELAMENTO_TOTAL: 'CANCELAMENTO_TOTAL',
  NO_SHOW: 'NO_SHOW',
  DISPUTA_CONTRA: 'DISPUTA_CONTRA',
  AJUSTE_ADMIN: 'AJUSTE_ADMIN',
};

export const DELTA_CONCLUSAO = 1;
export const DELTA_NO_SHOW = -12;
export const DELTA_DISPUTA_CONTRA = -8;

/** RN-23 - tabela de deltas por nota recebida. */
const DELTA_POR_NOTA = { 5: 3, 4: 1, 3: 0, 2: -2, 1: -4 };

export function deltaPorAvaliacao(nota) {
  const n = Number(nota);
  if (!(n in DELTA_POR_NOTA)) {
    throw new RangeError(`Nota fora da escala 1-5: ${nota}`);
  }
  return DELTA_POR_NOTA[n];
}

/** Tipos de evento que contam como ocorrencia negativa do prestador (RN-21). */
export const TIPOS_OCORRENCIA_NEGATIVA = [
  TIPO_EVENTO.CANCELAMENTO_PARCIAL,
  TIPO_EVENTO.CANCELAMENTO_TOTAL,
  TIPO_EVENTO.NO_SHOW,
];

/**
 * Soma os eventos validos e devolve a reputacao resultante.
 *
 * @param {Array<{delta:number, criado_em:string, revertido_em:?string}>} eventos
 * @param {object} opcoes
 * @param {number} opcoes.inicial     reputacao inicial da conta (P-08)
 * @param {number} opcoes.janelaDias  janela movel (P-20)
 * @param {Date|string} opcoes.agora  instante de referencia
 */
export function calcularReputacao(eventos, { inicial, janelaDias, agora }) {
  const limiteMin = janelaDias * 24 * 60;
  const soma = (eventos ?? [])
    .filter((e) => !e.revertido_em)
    .filter((e) => minutosEntre(e.criado_em, agora) <= limiteMin)
    .reduce((acc, e) => acc + Number(e.delta), 0);

  return limitar(inicial + soma);
}

/** INV-07 - reputacao vive em [0, 100]. */
export function limitar(valor) {
  return Math.max(0, Math.min(100, Math.round(valor)));
}

/**
 * RN-22 - classificacao da conta a partir da reputacao.
 * Retorna o estado que a conta *deveria* ter por efeito de reputacao;
 * quem aplica a transicao e o servico de aplicacao (respeitando a maquina de estados).
 *
 * `RESTRITO` so faz sentido para CLIENTE: o estado existe para limitar reservas
 * simultaneas (RN-12). Prestador com reputacao entre os dois limiares segue
 * ATIVO - o freio dele e RN-21 (ocorrencias negativas), nao este.
 */
export function classificarPorReputacao(reputacao, params, perfil = 'CLIENTE') {
  if (reputacao < params.limiar_revisao) return 'EM_REVISAO';
  if (perfil === 'CLIENTE' && reputacao < params.limiar_restricao_cliente) return 'RESTRITO';
  return 'ATIVO';
}

/** Texto curto para explicar a reputacao ao usuario. */
export function descreverReputacao(reputacao, params) {
  if (reputacao < params.limiar_revisao) return 'Em revisão: conta bloqueada até decisão do admin.';
  if (reputacao < params.limiar_restricao_cliente) return 'Restrita: apenas uma reserva em aberto por vez.';
  if (reputacao >= 85) return 'Excelente histórico.';
  return 'Boa reputação.';
}
