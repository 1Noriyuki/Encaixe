/**
 * Dinheiro em centavos (inteiro). [ADR-002]
 *
 * Ponto flutuante nao representa 0,1 exatamente; como a comissao (RN-14) e a
 * invariante INV-06 (`bruto = comissao + liquido`) precisam fechar centavo a
 * centavo, todo valor monetario do sistema e um inteiro de centavos.
 */

import { ErroDeValidacao } from './erros.js';

/** Converte '80', '80,50', 'R$ 80,50', 80.5 em centavos. */
export function paraCentavos(entrada) {
  if (typeof entrada === 'number') {
    if (!Number.isFinite(entrada)) throw new ErroDeValidacao('Valor monetário inválido.');
    return Math.round(entrada * 100);
  }
  const texto = String(entrada ?? '').trim().replace(/^R\$\s*/i, '');
  if (texto === '') throw new ErroDeValidacao('Informe um valor.');

  // Aceita '1.234,56' (pt-BR) e '1234.56' (en-US).
  let normalizado = texto;
  if (texto.includes(',')) {
    normalizado = texto.replace(/\./g, '').replace(',', '.');
  }
  const numero = Number(normalizado);
  if (!Number.isFinite(numero) || numero < 0) {
    throw new ErroDeValidacao(`Valor monetário inválido: "${entrada}"`);
  }
  return Math.round(numero * 100);
}

/** 8050 -> 'R$ 80,50' */
export function formatarBRL(centavos) {
  const valor = Number(centavos ?? 0) / 100;
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** 8050 -> '80,50' (para preencher inputs) */
export function centavosParaCampo(centavos) {
  return (Number(centavos ?? 0) / 100).toFixed(2).replace('.', ',');
}

/**
 * Aplica um percentual inteiro sobre um valor em centavos,
 * arredondando "meio para cima" (RN-14).
 */
export function percentualDe(centavos, percentual) {
  return Math.round((centavos * percentual) / 100);
}
