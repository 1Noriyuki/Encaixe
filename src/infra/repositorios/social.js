/**
 * Repositorio de avaliacoes, eventos de reputacao e notificacoes.
 */

import { um, varios, inserir, executar, contar } from '../db/conexao.js';

// --------------------------------------------------------------- avaliacoes

export function criarAvaliacao({ agendamento_id, autor_id, alvo_id, nota, comentario, criada_em }) {
  return inserir(
    `INSERT INTO avaliacao (agendamento_id, autor_id, alvo_id, nota, comentario, criada_em, visivel)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    agendamento_id, autor_id, alvo_id, nota, comentario, criada_em,
  );
}

export function avaliacaoDoAutor(agendamentoId, autorId) {
  return um(
    'SELECT * FROM avaliacao WHERE agendamento_id = ? AND autor_id = ?',
    agendamentoId, autorId,
  );
}

export function avaliacoesDoAgendamento(agendamentoId) {
  return varios(
    `SELECT a.*, u.nome AS autor_nome
       FROM avaliacao a JOIN usuario u ON u.id = a.autor_id
      WHERE a.agendamento_id = ?`,
    agendamentoId,
  );
}

/** RN-25 - revelacao cega: so ficam visiveis quando ambos avaliaram ou a janela fechou. */
export function revelarAvaliacoes(agendamentoId) {
  executar('UPDATE avaliacao SET visivel = 1 WHERE agendamento_id = ?', agendamentoId);
}

export function contarAvaliacoes(agendamentoId) {
  return contar('SELECT COUNT(*) AS total FROM avaliacao WHERE agendamento_id = ?', agendamentoId);
}

// ------------------------------------------------------ eventos de reputacao

export function registrarEvento({ usuario_id, tipo, delta, origem_tipo, origem_id, criado_em }) {
  return inserir(
    `INSERT INTO evento_reputacao (usuario_id, tipo, delta, origem_tipo, origem_id, criado_em)
     VALUES (?, ?, ?, ?, ?, ?)`,
    usuario_id, tipo, delta, origem_tipo, origem_id ?? null, criado_em,
  );
}

export function eventosDoUsuario(usuarioId, { limite = null } = {}) {
  return varios(
    `SELECT * FROM evento_reputacao
      WHERE usuario_id = ?
      ORDER BY criado_em DESC ${limite ? 'LIMIT ' + Number(limite) : ''}`,
    usuarioId,
  );
}

/** RN-27 - a resolucao de disputa reverte os eventos gerados por aquele agendamento. */
export function reverterEventosDaOrigem(origemTipo, origemId, quando, usuarioId = null) {
  const filtroUsuario = usuarioId ? 'AND usuario_id = ?' : '';
  const params = [quando, origemTipo, origemId];
  if (usuarioId) params.push(usuarioId);

  executar(
    `UPDATE evento_reputacao
        SET revertido_em = ?
      WHERE origem_tipo = ? AND origem_id = ? AND revertido_em IS NULL ${filtroUsuario}`,
    ...params,
  );
}

export function eventosDaOrigem(origemTipo, origemId) {
  return varios(
    'SELECT * FROM evento_reputacao WHERE origem_tipo = ? AND origem_id = ?',
    origemTipo, origemId,
  );
}

// -------------------------------------------------------------- notificacoes

export function criarNotificacao({ usuario_id, tipo, agendamento_id = null, titulo, mensagem, criada_em }) {
  return inserir(
    `INSERT INTO notificacao (usuario_id, tipo, agendamento_id, titulo, mensagem, criada_em)
     VALUES (?, ?, ?, ?, ?, ?)`,
    usuario_id, tipo, agendamento_id, titulo, mensagem, criada_em,
  );
}

export function notificacoesDoUsuario(usuarioId, limite = 50) {
  return varios(
    'SELECT * FROM notificacao WHERE usuario_id = ? ORDER BY criada_em DESC LIMIT ?',
    usuarioId, limite,
  );
}

export function contarNaoLidas(usuarioId) {
  return contar(
    'SELECT COUNT(*) AS total FROM notificacao WHERE usuario_id = ? AND lida_em IS NULL',
    usuarioId,
  );
}

export function marcarTodasLidas(usuarioId, quando) {
  executar(
    'UPDATE notificacao SET lida_em = ? WHERE usuario_id = ? AND lida_em IS NULL',
    quando, usuarioId,
  );
}
