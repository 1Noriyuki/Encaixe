/**
 * Fabrica do provedor de interpretacao (RNF-12).
 *
 * LLM_PROVIDER=simulado (padrao) | anthropic
 *
 * A camada de aplicacao nunca importa um provedor concreto - importa daqui.
 * Trocar de provedor e variavel de ambiente, nao alteracao de codigo.
 */

import * as simulado from './simulado.js';
import * as anthropic from './anthropic.js';

let instancia = null;

export function provedor() {
  if (!instancia) instancia = criarPeloAmbiente();
  return instancia;
}

/** Usado pelos testes para injetar um dublê especifico (ex.: sempre falha). */
export function definirProvedor(novo) {
  instancia = novo;
}

export function restaurarProvedor() {
  instancia = null;
}

function criarPeloAmbiente() {
  const escolhido = (process.env.LLM_PROVIDER ?? 'simulado').toLowerCase();

  switch (escolhido) {
    case 'anthropic':
      return anthropic.criar();
    case 'simulado':
      return simulado.criar();
    default:
      console.warn(`[llm] provedor desconhecido "${escolhido}", usando simulado.`);
      return simulado.criar();
  }
}

export { STATUS } from './contrato.js';
