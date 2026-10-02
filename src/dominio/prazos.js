/**
 * Janelas de tempo do ciclo pos-atendimento - RN-20, RN-24, RN-26, RN-16/RF-060.
 *
 * Todas as regras aqui respondem a mesma pergunta: "esta acao ainda esta no
 * prazo?". Ficam juntas porque erram juntas - um engano de fuso ou de sinal
 * quebraria todas de uma vez, e os testes cobrem o conjunto.
 */

import { ErroDeRegra } from './erros.js';
import {
  adicionarHoras, adicionarDias, adicionarMinutos, antesDe, formatarDataHora,
} from './tempo.js';

/** Fim do atendimento = inicio + duracao. */
export function fimDoHorario(inicioIso, duracaoMin) {
  return adicionarMinutos(inicioIso, duracaoMin);
}

// ------------------------------------------------------------------ no-show

/**
 * RN-20 - janela para reportar ausencia:
 * de (inicio + carencia) ate (fim + prazo pos-fim).
 */
export function janelaNoShow(inicioIso, duracaoMin, params) {
  return {
    abreEm: adicionarMinutos(inicioIso, params.noshow_carencia_min),
    fechaEm: adicionarHoras(fimDoHorario(inicioIso, duracaoMin), params.noshow_prazo_pos_fim_h),
  };
}

export function dentroDaJanelaNoShow(inicioIso, duracaoMin, agoraIso, params) {
  const { abreEm, fechaEm } = janelaNoShow(inicioIso, duracaoMin, params);
  return !antesDe(agoraIso, abreEm) && antesDe(agoraIso, fechaEm);
}

export function assegurarJanelaNoShow(inicioIso, duracaoMin, agoraIso, params) {
  const { abreEm, fechaEm } = janelaNoShow(inicioIso, duracaoMin, params);

  if (antesDe(agoraIso, abreEm)) {
    throw new ErroDeRegra(
      'RN-20',
      `Ainda é cedo para registrar ausência. O registro abre em ${formatarDataHora(abreEm)} `
      + `(${params.noshow_carencia_min} min após o início).`,
      { abreEm, fechaEm },
    );
  }
  if (!antesDe(agoraIso, fechaEm)) {
    throw new ErroDeRegra(
      'RN-20',
      `O prazo para registrar ausência deste atendimento terminou em ${formatarDataHora(fechaEm)}.`,
      { abreEm, fechaEm },
    );
  }
}

// ---------------------------------------------------------------- avaliacao

/** RN-24 - a avaliacao fica aberta por P-14 dias a partir da conclusao. */
export function prazoAvaliacao(concluidoEmIso, params) {
  return adicionarDias(concluidoEmIso, params.janela_avaliacao_dias);
}

export function dentroDaJanelaAvaliacao(concluidoEmIso, agoraIso, params) {
  return antesDe(agoraIso, prazoAvaliacao(concluidoEmIso, params));
}

export function assegurarJanelaAvaliacao(concluidoEmIso, agoraIso, params) {
  if (!dentroDaJanelaAvaliacao(concluidoEmIso, agoraIso, params)) {
    throw new ErroDeRegra(
      'RN-24',
      `A janela de avaliação deste atendimento encerrou em `
      + `${formatarDataHora(prazoAvaliacao(concluidoEmIso, params))}.`,
      { prazo: prazoAvaliacao(concluidoEmIso, params) },
    );
  }
}

// ------------------------------------------------------------------ disputa

/** RN-26 - disputa pode ser aberta ate P-15 apos o fim do horario. */
export function prazoDisputa(inicioIso, duracaoMin, params) {
  return adicionarHoras(fimDoHorario(inicioIso, duracaoMin), params.prazo_disputa_h);
}

export function assegurarPrazoDisputa(inicioIso, duracaoMin, agoraIso, params) {
  const prazo = prazoDisputa(inicioIso, duracaoMin, params);
  if (!antesDe(agoraIso, prazo)) {
    throw new ErroDeRegra(
      'RN-26',
      `O prazo para abrir disputa sobre este atendimento terminou em ${formatarDataHora(prazo)}.`,
      { prazo },
    );
  }
}

/** RN-27 / RF-075 - prazo de SLA da fila do admin (P-18). */
export function prazoSlaDisputa(abertaEmIso, params) {
  return adicionarHoras(abertaEmIso, params.sla_disputa_h);
}

// -------------------------------------------------------------- conclusao

/** RF-058 - so da para concluir depois que o atendimento terminou. */
export function assegurarAtendimentoTerminou(inicioIso, duracaoMin, agoraIso) {
  const fim = fimDoHorario(inicioIso, duracaoMin);
  if (antesDe(agoraIso, fim)) {
    throw new ErroDeRegra(
      'RN-16',
      `O atendimento só pode ser concluído depois de ${formatarDataHora(fim)}.`,
      { fim },
    );
  }
}

/** RF-060 - instante em que a conclusao automatica passa a valer (P-17). */
export function prazoAutoConclusao(inicioIso, duracaoMin, params) {
  return adicionarHoras(fimDoHorario(inicioIso, duracaoMin), params.autoconclusao_h);
}
