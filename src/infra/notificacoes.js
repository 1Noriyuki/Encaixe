/**
 * Notificacoes - RF-082, RF-083.
 *
 * O MVP nao envia e-mail nem push: a notificacao e persistida e aparece na
 * central do usuario. Foi decisao consciente (spec 2.2) para nao depender de
 * servico externo.
 */

import { criarNotificacao, notificacoesDoUsuario, contarNaoLidas, marcarTodasLidas } from './repositorios/social.js';
import { agoraIso } from '../dominio/tempo.js';

export function notificar(usuarioId, { tipo, titulo, mensagem, agendamentoId = null }) {
  if (!usuarioId) return null;
  return criarNotificacao({
    usuario_id: usuarioId,
    tipo,
    agendamento_id: agendamentoId,
    titulo,
    mensagem,
    criada_em: agoraIso(),
  });
}

/** Notifica cliente e prestador com a mesma mensagem-base. */
export function notificarAmbos({ clienteId, prestadorId }, dados) {
  notificar(clienteId, dados);
  notificar(prestadorId, dados);
}

export function listar(usuarioId, limite = 50) {
  return notificacoesDoUsuario(usuarioId, limite);
}

export function naoLidas(usuarioId) {
  return contarNaoLidas(usuarioId);
}

export function marcarLidas(usuarioId) {
  marcarTodasLidas(usuarioId, agoraIso());
}
