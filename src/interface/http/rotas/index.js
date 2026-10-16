/** Registro de todas as rotas da aplicacao. */

import * as publicas from './publicas.js';
import * as agendamentos from './agendamentos.js';
import * as prestador from './prestador.js';
import * as admin from './admin.js';

export function registrarRotas(roteador) {
  publicas.registrar(roteador);
  agendamentos.registrar(roteador);
  prestador.registrar(roteador);
  admin.registrar(roteador);
  return roteador;
}
