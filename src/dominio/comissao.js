/**
 * Comissao da plataforma - RN-14, RN-15, RN-16.
 *
 * Base de calculo: o valor FINAL travado na reserva (RN-04), nunca o preco-base.
 * E o ponto onde o modelo de negocio se materializa, entao vale a insistencia:
 * `valor_comissao + valor_liquido === valor_bruto`, sempre (INV-06) - inclusive
 * garantido por CHECK no banco.
 */

import { ErroDeRegra } from './erros.js';
import { percentualDe } from './dinheiro.js';

export const COMISSAO_MIN_PCT = 8;
export const COMISSAO_MAX_PCT = 15;

export function assegurarPercentualValido(percentual) {
  const pct = Number(percentual);
  if (!Number.isInteger(pct) || pct < COMISSAO_MIN_PCT || pct > COMISSAO_MAX_PCT) {
    throw new ErroDeRegra(
      'RN-15',
      `A comissão precisa ficar entre ${COMISSAO_MIN_PCT}% e ${COMISSAO_MAX_PCT}%.`,
      { percentual },
    );
  }
  return pct;
}

/**
 * @param {number} valorBruto  valor final travado, em centavos
 * @param {number} percentual  percentual vigente da categoria (RN-15)
 */
export function calcularComissao(valorBruto, percentual) {
  const pct = assegurarPercentualValido(percentual);
  if (!Number.isInteger(valorBruto) || valorBruto <= 0) {
    throw new ErroDeRegra('RN-14', 'Valor bruto inválido para apuração de comissão.', { valorBruto });
  }

  const valorComissao = percentualDe(valorBruto, pct);   // arredondamento meio para cima
  const valorLiquido = valorBruto - valorComissao;        // INV-06 por construcao

  return { valorBruto, percentualAplicado: pct, valorComissao, valorLiquido };
}

/** Competencia contabil do lancamento: 'AAAA-MM' na data da conclusao. */
export function competenciaDe(instanteIso) {
  return String(instanteIso).slice(0, 7);
}

/** RN-16 - o unico estado de agendamento que gera comissao. */
export function geraComissao(estadoAgendamento) {
  return estadoAgendamento === 'CONCLUIDO';
}
