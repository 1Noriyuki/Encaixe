/**
 * Repositorio de agendamentos - a entidade transacional central (spec 9.1).
 */

import { um, varios, inserir, executar, contar } from '../db/conexao.js';
import { AGENDAMENTO_EM_ABERTO } from '../../dominio/estados.js';

const CAMPOS = `
  a.*,
  h.inicio, h.duracao_min, h.preco_base_snapshot, h.estado AS horario_estado, h.servico_id,
  s.nome AS servico_nome, s.categoria_id,
  c.nome AS categoria_nome, c.percentual_comissao,
  cli.nome AS cliente_nome, cli.reputacao AS cliente_reputacao, cli.email AS cliente_email,
  pre.nome AS prestador_nome, pre.reputacao AS prestador_reputacao, pre.email AS prestador_email,
  pp.nome_exibicao, pp.politica_expiracao, pp.janela_confirmacao_min,
  r.cidade, r.bairro,
  pc.telefone AS cliente_telefone
`;

const JOINS = `
  FROM agendamento a
  JOIN horario_vago h ON h.id = a.horario_id
  JOIN servico s ON s.id = h.servico_id
  JOIN categoria_servico c ON c.id = s.categoria_id
  JOIN usuario cli ON cli.id = a.cliente_id
  JOIN usuario pre ON pre.id = a.prestador_id
  JOIN perfil_prestador pp ON pp.usuario_id = a.prestador_id
  LEFT JOIN perfil_cliente pc ON pc.usuario_id = a.cliente_id
  LEFT JOIN regiao r ON r.id = pp.regiao_id
`;

export function criar({
  horario_id, cliente_id, prestador_id, estado, valor_travado,
  percentual_desconto_aplicado, prazo_confirmacao_em, criado_em, observacao = '',
}) {
  return inserir(
    `INSERT INTO agendamento
       (horario_id, cliente_id, prestador_id, estado, valor_travado,
        percentual_desconto_aplicado, prazo_confirmacao_em, criado_em, observacao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    horario_id, cliente_id, prestador_id, estado, valor_travado,
    percentual_desconto_aplicado, prazo_confirmacao_em, criado_em, observacao,
  );
}

export function porId(id) {
  return um(`SELECT ${CAMPOS} ${JOINS} WHERE a.id = ?`, id);
}

export function porHorario(horarioId) {
  return um(
    `SELECT ${CAMPOS} ${JOINS}
      WHERE a.horario_id = ?
        AND a.estado IN ('PENDENTE_CONFIRMACAO','CONFIRMADO','EM_DISPUTA')`,
    horarioId,
  );
}

/** Atualizacao parcial: so mexe nos campos informados. */
export function atualizar(id, campos) {
  const permitidos = [
    'estado', 'confirmado_em', 'encerrado_em', 'estado_cobranca',
    'motivo_encerramento', 'observacao', 'prazo_confirmacao_em', 'estado_antes_disputa',
  ];
  const entradas = Object.entries(campos).filter(([k]) => permitidos.includes(k));
  if (entradas.length === 0) return;

  const set = entradas.map(([k]) => `${k} = ?`).join(', ');
  executar(`UPDATE agendamento SET ${set} WHERE id = ?`, ...entradas.map(([, v]) => v), id);
}

// ------------------------------------------------------------------- listas

export function doCliente(clienteId, { estados = null } = {}) {
  const filtros = ['a.cliente_id = ?'];
  const params = [clienteId];
  if (estados?.length) {
    filtros.push(`a.estado IN (${estados.map(() => '?').join(',')})`);
    params.push(...estados);
  }
  return varios(
    `SELECT ${CAMPOS} ${JOINS} WHERE ${filtros.join(' AND ')} ORDER BY h.inicio DESC`,
    ...params,
  );
}

export function doPrestador(prestadorId, { estados = null } = {}) {
  const filtros = ['a.prestador_id = ?'];
  const params = [prestadorId];
  if (estados?.length) {
    filtros.push(`a.estado IN (${estados.map(() => '?').join(',')})`);
    params.push(...estados);
  }
  return varios(
    `SELECT ${CAMPOS} ${JOINS} WHERE ${filtros.join(' AND ')} ORDER BY h.inicio DESC`,
    ...params,
  );
}

/** RN-12 - quantas reservas o cliente mantem em aberto agora. */
export function contarEmAberto(clienteId) {
  const marcadores = AGENDAMENTO_EM_ABERTO.map(() => '?').join(',');
  return contar(
    `SELECT COUNT(*) AS total FROM agendamento
      WHERE cliente_id = ? AND estado IN (${marcadores})`,
    clienteId, ...AGENDAMENTO_EM_ABERTO,
  );
}

// --------------------------------------------------------- rotinas temporais

/** RF-045/RF-046 - reservas cuja janela de confirmacao ja venceu. */
export function pendentesVencidas(agoraIso) {
  return varios(
    `SELECT ${CAMPOS} ${JOINS}
      WHERE a.estado = 'PENDENTE_CONFIRMACAO' AND a.prazo_confirmacao_em <= ?`,
    agoraIso,
  );
}

/** RF-060 - confirmados cujo atendimento ja terminou, candidatos a conclusao automatica. */
export function confirmadosComAtendimentoEncerrado(agoraIso) {
  return varios(
    `SELECT ${CAMPOS} ${JOINS}
      WHERE a.estado = 'CONFIRMADO'
        AND datetime(h.inicio) <= datetime(?)`,
    agoraIso,
  );
}

/** RN-25 - agendamentos cuja janela de avaliacao encerrou e ainda tem nota oculta. */
export function comAvaliacaoOculta() {
  return varios(
    `SELECT a.id, a.encerrado_em, h.inicio, h.duracao_min
       FROM agendamento a
       JOIN horario_vago h ON h.id = a.horario_id
      WHERE a.estado = 'CONCLUIDO'
        AND EXISTS (SELECT 1 FROM avaliacao v WHERE v.agendamento_id = a.id AND v.visivel = 0)`,
  );
}

/** RN-21 - ocorrencias negativas de um prestador dentro da janela de apuracao. */
export function contarOcorrenciasNegativas(usuarioId, desdeIso, tipos) {
  const marcadores = tipos.map(() => '?').join(',');
  return contar(
    `SELECT COUNT(*) AS total FROM evento_reputacao
      WHERE usuario_id = ? AND criado_em >= ? AND tipo IN (${marcadores}) AND revertido_em IS NULL`,
    usuarioId, desdeIso, ...tipos,
  );
}
