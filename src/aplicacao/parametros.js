/**
 * Acesso aos parametros do dominio pela camada de aplicacao (RN-00).
 * Um unico ponto de leitura, para que nenhum servico invente valor proprio.
 */

import { carregarGlobais, salvarGlobal, listarGlobais } from '../infra/repositorios/parametros.js';

export function params() {
  return carregarGlobais();
}

export { salvarGlobal, listarGlobais };
