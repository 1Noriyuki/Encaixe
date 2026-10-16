/**
 * Elegibilidade de publicacao e de reserva - RN-06, RN-07, RN-09, RN-12, RN-13.
 */

import { ErroDeRegra } from './erros.js';
import { adicionarMinutos, antesDe, minutosEntre, humanizarMinutos } from './tempo.js';

/** RN-12 - quantas reservas em aberto este cliente pode manter. */
export function limiteDeReservas(reputacao, params) {
  return reputacao < params.limiar_restricao_cliente
    ? params.limite_reservas_restrito
    : params.limite_reservas_normal;
}

/**
 * RN-13 + RN-12 - o cliente esta apto a reservar?
 * @param {object} cliente { estado_conta, reputacao }
 * @param {number} reservasAbertas agendamentos em PENDENTE_CONFIRMACAO ou CONFIRMADO
 */
export function assegurarClientePodeReservar(cliente, reservasAbertas, params) {
  if (cliente.estado_conta === 'SUSPENSO') {
    throw new ErroDeRegra('RN-13', 'Sua conta está suspensa e não pode fazer reservas.');
  }
  if (cliente.estado_conta === 'EM_REVISAO') {
    throw new ErroDeRegra(
      'RN-13',
      'Sua conta está em revisão pelo administrador e não pode fazer novas reservas até a decisão.',
    );
  }

  const limite = limiteDeReservas(cliente.reputacao, params);
  if (reservasAbertas >= limite) {
    throw new ErroDeRegra(
      'RN-12',
      `Você já tem ${reservasAbertas} ${reservasAbertas === 1 ? 'reserva' : 'reservas'} em aberto `
      + `e seu limite atual é ${limite}. O limite depende da sua reputação `
      + `(${cliente.reputacao} pontos). Conclua ou cancele uma reserva antes de abrir outra.`,
      { limite, reservasAbertas, reputacao: cliente.reputacao },
    );
  }

  return limite;
}

/** RN-07 - antecedencia minima para publicar um horario. */
export function assegurarAntecedenciaPublicacao(antecedenciaMin, params) {
  const minimo = params.antecedencia_min_publicacao_min;
  if (antecedenciaMin < minimo) {
    throw new ErroDeRegra(
      'RN-07',
      `Horários precisam ser publicados com pelo menos ${humanizarMinutos(minimo)} de antecedência. `
      + `Este está a ${antecedenciaMin <= 0 ? 'menos de nada (ja passou)' : humanizarMinutos(antecedenciaMin)}.`,
      { minimo, antecedenciaMin },
    );
  }
}

/** RN-07 - antecedencia minima para reservar. */
export function assegurarAntecedenciaReserva(antecedenciaMin, params) {
  const minimo = params.antecedencia_min_reserva_min;
  if (antecedenciaMin < minimo) {
    throw new ErroDeRegra(
      'RN-07',
      `Este horário não aceita mais reservas: faltam menos de ${humanizarMinutos(minimo)} para o início.`,
      { minimo, antecedenciaMin },
    );
  }
}

/** RN-09 - o horario precisa estar publicado para ser reservado. */
export function assegurarHorarioReservavel(horario) {
  if (horario.estado !== 'PUBLICADO') {
    throw new ErroDeRegra(
      'RN-09',
      'Este horário não está mais disponível.',
      { estado: horario.estado },
    );
  }
}

/**
 * RN-06 - nao sobreposicao na agenda do prestador.
 * Intervalos sao semiabertos: [inicio, inicio + duracao).
 */
export function haSobreposicao(existentes, novo) {
  const inicioNovo = new Date(novo.inicio).getTime();
  const fimNovo = inicioNovo + novo.duracao_min * 60000;

  return (existentes ?? []).some((h) => {
    const ini = new Date(h.inicio).getTime();
    const fim = ini + h.duracao_min * 60000;
    return inicioNovo < fim && ini < fimNovo;
  });
}

export function assegurarSemSobreposicao(existentes, novo) {
  const conflito = (existentes ?? []).find((h) => {
    const ini = new Date(h.inicio).getTime();
    const fim = ini + h.duracao_min * 60000;
    const inicioNovo = new Date(novo.inicio).getTime();
    const fimNovo = inicioNovo + novo.duracao_min * 60000;
    return inicioNovo < fim && ini < fimNovo;
  });

  if (conflito) {
    throw new ErroDeRegra(
      'RN-06',
      'Você já tem um horário ativo que se sobrepõe a este intervalo.',
      { conflito },
    );
  }
}

/**
 * RN-10 - prazo de confirmacao: agora + janela do prestador, mas nunca
 * ultrapassando o inicio do proprio horario.
 */
export function prazoDeConfirmacao(agoraIso, inicioIso, janelaMin) {
  const porJanela = adicionarMinutos(agoraIso, janelaMin);
  return antesDe(porJanela, inicioIso) ? porJanela : inicioIso;
}

/** RF-044 - da para devolver o horario para a busca depois de recusa/expiracao? */
export function podeVoltarParaBusca(inicioIso, agoraIso, params) {
  return minutosEntre(agoraIso, inicioIso) >= params.antecedencia_min_reserva_min;
}
