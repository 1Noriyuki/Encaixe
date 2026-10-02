/**
 * Politica de cancelamento - RN-18 (cliente) e RN-19 (prestador).
 *
 * A assimetria e proposital: cancelar como prestador dói mais, porque quem
 * publicou o horario assumiu o compromisso e destruiu mais valor da plataforma.
 */

import { ErroDeRegra } from './erros.js';
import { TIPO_EVENTO } from './reputacao.js';

export const FAIXA = {
  LIVRE: 'LIVRE',
  PARCIAL: 'PARCIAL',
  TOTAL: 'TOTAL',
  APOS_INICIO: 'APOS_INICIO',
};

export const ROTULO_FAIXA = {
  LIVRE: 'Sem penalidade',
  PARCIAL: 'Penalidade parcial',
  TOTAL: 'Penalidade total',
  APOS_INICIO: 'Horário já começou',
};

/** RN-18 - em qual faixa cai um cancelamento feito com esta antecedencia. */
export function faixaDeCancelamento(antecedenciaMin, params) {
  if (antecedenciaMin <= 0) return FAIXA.APOS_INICIO;
  if (antecedenciaMin >= params.cancelamento_livre_h * 60) return FAIXA.LIVRE;
  if (antecedenciaMin >= params.cancelamento_total_h * 60) return FAIXA.PARCIAL;
  return FAIXA.TOTAL;
}

/** Deltas de reputacao por faixa e papel (RN-18, RN-19, RN-23). */
const PENALIDADES = {
  CLIENTE: { LIVRE: 0, PARCIAL: -3, TOTAL: -6 },
  PRESTADOR: { LIVRE: -1, PARCIAL: -5, TOTAL: -10 },
};

/**
 * Consequencia exata de um cancelamento - o mesmo objeto alimenta a tela de
 * confirmacao (RF-048) e a gravacao do evento (RF-049/RF-050). E deliberado:
 * o que o usuario le antes de confirmar e literalmente o que sera aplicado.
 */
export function penalidadeDeCancelamento(faixa, papel) {
  if (faixa === FAIXA.APOS_INICIO) {
    throw new ErroDeRegra(
      'RN-18',
      'O horário já começou. Depois do início não existe cancelamento: o caminho é registrar no-show.',
      { faixa },
    );
  }

  const tabela = PENALIDADES[papel];
  if (!tabela) throw new Error(`Papel inválido: ${papel}`);

  const delta = tabela[faixa];
  const ocorrenciaNegativa = faixa !== FAIXA.LIVRE;

  return {
    faixa,
    papel,
    delta,
    ocorrenciaNegativa,
    // O tipo do evento e o que faz a ocorrencia contar (ou nao) para RN-21:
    // cancelamento na faixa livre tem tipo proprio e fica fora da contagem.
    tipoEvento: faixa === FAIXA.LIVRE
      ? TIPO_EVENTO.CANCELAMENTO_LIVRE
      : (faixa === FAIXA.TOTAL ? TIPO_EVENTO.CANCELAMENTO_TOTAL : TIPO_EVENTO.CANCELAMENTO_PARCIAL),
    rotulo: ROTULO_FAIXA[faixa],
    descricao: descreverPenalidade(faixa, papel, delta),
  };
}

function descreverPenalidade(faixa, papel, delta) {
  if (delta === 0) {
    return 'Você está dentro da janela livre: nenhuma penalidade será aplicada.';
  }
  const quem = papel === 'PRESTADOR' ? 'prestador' : 'cliente';
  const extra = faixa === FAIXA.LIVRE
    ? ''
    : ' Esta ocorrência também entra na contagem que pode levar sua conta a revisão.';
  return `Cancelamento na faixa "${ROTULO_FAIXA[faixa]}" para ${quem}: ${delta} pontos de reputação.${extra}`;
}

/**
 * Previa completa mostrada antes da confirmacao (RF-048).
 * Nao lanca quando o horario ja comecou - devolve o motivo do bloqueio,
 * porque a tela precisa explicar em vez de estourar.
 */
export function previaDeCancelamento(antecedenciaMin, papel, params) {
  const faixa = faixaDeCancelamento(antecedenciaMin, params);
  if (faixa === FAIXA.APOS_INICIO) {
    return {
      faixa,
      permitido: false,
      motivo: 'O horário já começou. Use o registro de no-show.',
      delta: 0,
      rotulo: ROTULO_FAIXA[faixa],
    };
  }
  return { permitido: true, ...penalidadeDeCancelamento(faixa, papel) };
}
