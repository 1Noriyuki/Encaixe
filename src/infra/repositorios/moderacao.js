/**
 * Repositorio de disputas, evidencias e trilha de auditoria.
 */

import { um, varios, inserir, executar } from '../db/conexao.js';

// ------------------------------------------------------------------ disputas

const CAMPOS_DISPUTA = `
  d.*,
  a.estado AS agendamento_estado, a.valor_travado, a.cliente_id, a.prestador_id,
  a.estado_antes_disputa,
  h.inicio, h.duracao_min,
  s.nome AS servico_nome,
  cli.nome AS cliente_nome, pre.nome AS prestador_nome,
  autor.nome AS aberta_por_nome
`;

const JOINS_DISPUTA = `
  FROM disputa d
  JOIN agendamento a ON a.id = d.agendamento_id
  JOIN horario_vago h ON h.id = a.horario_id
  JOIN servico s ON s.id = h.servico_id
  JOIN usuario cli ON cli.id = a.cliente_id
  JOIN usuario pre ON pre.id = a.prestador_id
  JOIN usuario autor ON autor.id = d.aberta_por_id
`;

export function criarDisputa({ agendamento_id, aberta_por_id, motivo, relato, estado, aberta_em, prazo_sla_em }) {
  return inserir(
    `INSERT INTO disputa
       (agendamento_id, aberta_por_id, motivo, relato, estado, aberta_em, prazo_sla_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    agendamento_id, aberta_por_id, motivo, relato, estado, aberta_em, prazo_sla_em,
  );
}

export function disputaPorId(id) {
  return um(`SELECT ${CAMPOS_DISPUTA} ${JOINS_DISPUTA} WHERE d.id = ?`, id);
}

export function disputaPorAgendamento(agendamentoId) {
  return um(`SELECT ${CAMPOS_DISPUTA} ${JOINS_DISPUTA} WHERE d.agendamento_id = ?`, agendamentoId);
}

/** RF-074 - fila ordenada por SLA e, no empate, por valor do agendamento. */
export function filaDeDisputas({ apenasAbertas = true } = {}) {
  const filtro = apenasAbertas ? "WHERE d.estado IN ('ABERTA','EM_ANALISE')" : '';
  return varios(
    `SELECT ${CAMPOS_DISPUTA} ${JOINS_DISPUTA} ${filtro}
      ORDER BY d.prazo_sla_em ASC, a.valor_travado DESC`,
  );
}

export function disputasDoUsuario(usuarioId) {
  return varios(
    `SELECT ${CAMPOS_DISPUTA} ${JOINS_DISPUTA}
      WHERE a.cliente_id = ? OR a.prestador_id = ?
      ORDER BY d.aberta_em DESC`,
    usuarioId, usuarioId,
  );
}

export function atualizarDisputa(id, campos) {
  const permitidos = ['estado', 'desfecho', 'justificativa_admin', 'admin_id', 'resolvida_em'];
  const entradas = Object.entries(campos).filter(([k]) => permitidos.includes(k));
  if (entradas.length === 0) return;
  const set = entradas.map(([k]) => `${k} = ?`).join(', ');
  executar(`UPDATE disputa SET ${set} WHERE id = ?`, ...entradas.map(([, v]) => v), id);
}

// ---------------------------------------------------------------- evidencias

export function criarEvidencia({ disputa_id, autor_id, tipo, descricao, arquivo_ref, criada_em }) {
  return inserir(
    `INSERT INTO evidencia (disputa_id, autor_id, tipo, descricao, arquivo_ref, criada_em)
     VALUES (?, ?, ?, ?, ?, ?)`,
    disputa_id, autor_id, tipo, descricao, arquivo_ref ?? null, criada_em,
  );
}

export function evidenciasDaDisputa(disputaId) {
  return varios(
    `SELECT e.*, u.nome AS autor_nome
       FROM evidencia e JOIN usuario u ON u.id = e.autor_id
      WHERE e.disputa_id = ?
      ORDER BY e.criada_em`,
    disputaId,
  );
}

// ---------------------------------------------------------------- auditoria

export function registrarAuditoria({
  ator_id, acao, entidade_tipo, entidade_id,
  estado_anterior = null, estado_novo = null, detalhe = null, correlacao_id = null, criado_em,
}) {
  return inserir(
    `INSERT INTO log_auditoria
       (ator_id, acao, entidade_tipo, entidade_id, estado_anterior, estado_novo, detalhe, correlacao_id, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ator_id ?? null, acao, entidade_tipo, entidade_id ?? null,
    estado_anterior, estado_novo, detalhe, correlacao_id, criado_em,
  );
}

export function auditoriaDaEntidade(tipo, id) {
  return varios(
    `SELECT l.*, u.nome AS ator_nome
       FROM log_auditoria l
       LEFT JOIN usuario u ON u.id = l.ator_id
      WHERE l.entidade_tipo = ? AND l.entidade_id = ?
      ORDER BY l.criado_em`,
    tipo, id,
  );
}

export function auditoriaRecente(limite = 100) {
  return varios(
    `SELECT l.*, u.nome AS ator_nome
       FROM log_auditoria l
       LEFT JOIN usuario u ON u.id = l.ator_id
      ORDER BY l.id DESC
      LIMIT ?`,
    limite,
  );
}
