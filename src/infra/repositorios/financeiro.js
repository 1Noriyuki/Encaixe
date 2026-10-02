/**
 * Repositorio financeiro: lancamentos de comissao, extrato e metricas.
 */

import { um, varios, inserir, executar } from '../db/conexao.js';

export function criarLancamento({
  agendamento_id, valor_bruto, percentual_aplicado, valor_comissao,
  valor_liquido, estado, competencia, criado_em,
}) {
  return inserir(
    `INSERT INTO lancamento_comissao
       (agendamento_id, valor_bruto, percentual_aplicado, valor_comissao,
        valor_liquido, estado, competencia, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    agendamento_id, valor_bruto, percentual_aplicado, valor_comissao,
    valor_liquido, estado, competencia, criado_em,
  );
}

export function porAgendamento(agendamentoId) {
  return um('SELECT * FROM lancamento_comissao WHERE agendamento_id = ?', agendamentoId);
}

export function atualizarEstado(agendamentoId, estado) {
  executar('UPDATE lancamento_comissao SET estado = ? WHERE agendamento_id = ?', estado, agendamentoId);
}

/** RF-061/RF-062 - extrato do prestador; itens RETIDO aparecem separados. */
export function extratoPrestador(prestadorId, { de = null, ate = null } = {}) {
  const filtros = ['a.prestador_id = ?'];
  const params = [prestadorId];
  if (de) { filtros.push('l.criado_em >= ?'); params.push(de); }
  if (ate) { filtros.push('l.criado_em <= ?'); params.push(ate); }

  return varios(
    `SELECT l.*, a.id AS agendamento_id, a.estado AS agendamento_estado, a.estado_cobranca,
            h.inicio, s.nome AS servico_nome, c.nome AS categoria_nome,
            u.nome AS cliente_nome
       FROM lancamento_comissao l
       JOIN agendamento a ON a.id = l.agendamento_id
       JOIN horario_vago h ON h.id = a.horario_id
       JOIN servico s ON s.id = h.servico_id
       JOIN categoria_servico c ON c.id = s.categoria_id
       JOIN usuario u ON u.id = a.cliente_id
      WHERE ${filtros.join(' AND ')}
      ORDER BY l.criado_em DESC`,
    ...params,
  );
}

export function totaisPrestador(prestadorId, { de = null, ate = null } = {}) {
  const filtros = ['a.prestador_id = ?', "l.estado = 'EFETIVADO'"];
  const params = [prestadorId];
  if (de) { filtros.push('l.criado_em >= ?'); params.push(de); }
  if (ate) { filtros.push('l.criado_em <= ?'); params.push(ate); }

  const efetivado = um(
    `SELECT COUNT(*) AS qtd,
            COALESCE(SUM(l.valor_bruto), 0) AS bruto,
            COALESCE(SUM(l.valor_comissao), 0) AS comissao,
            COALESCE(SUM(l.valor_liquido), 0) AS liquido
       FROM lancamento_comissao l
       JOIN agendamento a ON a.id = l.agendamento_id
      WHERE ${filtros.join(' AND ')}`,
    ...params,
  );

  const retido = um(
    `SELECT COUNT(*) AS qtd, COALESCE(SUM(l.valor_liquido), 0) AS liquido
       FROM lancamento_comissao l
       JOIN agendamento a ON a.id = l.agendamento_id
      WHERE a.prestador_id = ? AND l.estado = 'RETIDO'`,
    prestadorId,
  );

  return { ...efetivado, retido_qtd: retido.qtd, retido_liquido: retido.liquido };
}

/** RF-063/RF-064 - painel do admin. */
export function metricasPlataforma({ de = null, ate = null, categoriaId = null, prestadorId = null } = {}) {
  const filtrosLanc = ["l.estado = 'EFETIVADO'"];
  const paramsLanc = [];
  if (de) { filtrosLanc.push('l.criado_em >= ?'); paramsLanc.push(de); }
  if (ate) { filtrosLanc.push('l.criado_em <= ?'); paramsLanc.push(ate); }
  if (categoriaId) { filtrosLanc.push('s.categoria_id = ?'); paramsLanc.push(categoriaId); }
  if (prestadorId) { filtrosLanc.push('a.prestador_id = ?'); paramsLanc.push(prestadorId); }

  const financeiro = um(
    `SELECT COUNT(*) AS concluidos,
            COALESCE(SUM(l.valor_bruto), 0) AS bruto,
            COALESCE(SUM(l.valor_comissao), 0) AS comissao
       FROM lancamento_comissao l
       JOIN agendamento a ON a.id = l.agendamento_id
       JOIN horario_vago h ON h.id = a.horario_id
       JOIN servico s ON s.id = h.servico_id
      WHERE ${filtrosLanc.join(' AND ')}`,
    ...paramsLanc,
  );

  const filtrosAg = ['1 = 1'];
  const paramsAg = [];
  if (de) { filtrosAg.push('a.criado_em >= ?'); paramsAg.push(de); }
  if (ate) { filtrosAg.push('a.criado_em <= ?'); paramsAg.push(ate); }
  if (categoriaId) { filtrosAg.push('s.categoria_id = ?'); paramsAg.push(categoriaId); }
  if (prestadorId) { filtrosAg.push('a.prestador_id = ?'); paramsAg.push(prestadorId); }

  const desfechos = um(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN a.estado IN ('CANCELADO_CLIENTE','CANCELADO_PRESTADOR') THEN 1 ELSE 0 END) AS cancelados,
       SUM(CASE WHEN a.estado IN ('NO_SHOW_CLIENTE','NO_SHOW_PRESTADOR') THEN 1 ELSE 0 END) AS noshows,
       SUM(CASE WHEN a.estado = 'EXPIRADO' THEN 1 ELSE 0 END) AS expirados,
       SUM(CASE WHEN a.estado = 'EM_DISPUTA' THEN 1 ELSE 0 END) AS em_disputa
       FROM agendamento a
       JOIN horario_vago h ON h.id = a.horario_id
       JOIN servico s ON s.id = h.servico_id
      WHERE ${filtrosAg.join(' AND ')}`,
    ...paramsAg,
  );

  const total = Number(desfechos.total) || 0;
  const concluidos = Number(financeiro.concluidos) || 0;

  return {
    concluidos,
    bruto: Number(financeiro.bruto) || 0,
    comissao: Number(financeiro.comissao) || 0,
    ticket_medio: concluidos ? Math.round(Number(financeiro.bruto) / concluidos) : 0,
    total_agendamentos: total,
    cancelados: Number(desfechos.cancelados) || 0,
    noshows: Number(desfechos.noshows) || 0,
    expirados: Number(desfechos.expirados) || 0,
    em_disputa: Number(desfechos.em_disputa) || 0,
    taxa_cancelamento: total ? Math.round((Number(desfechos.cancelados) / total) * 100) : 0,
    taxa_noshow: total ? Math.round((Number(desfechos.noshows) / total) * 100) : 0,
  };
}

/** Comissao por categoria, para a quebra do painel. */
export function comissaoPorCategoria({ de = null, ate = null } = {}) {
  const filtros = ["l.estado = 'EFETIVADO'"];
  const params = [];
  if (de) { filtros.push('l.criado_em >= ?'); params.push(de); }
  if (ate) { filtros.push('l.criado_em <= ?'); params.push(ate); }

  return varios(
    `SELECT c.id, c.nome, c.percentual_comissao,
            COUNT(*) AS qtd,
            COALESCE(SUM(l.valor_bruto), 0) AS bruto,
            COALESCE(SUM(l.valor_comissao), 0) AS comissao
       FROM lancamento_comissao l
       JOIN agendamento a ON a.id = l.agendamento_id
       JOIN horario_vago h ON h.id = a.horario_id
       JOIN servico s ON s.id = h.servico_id
       JOIN categoria_servico c ON c.id = s.categoria_id
      WHERE ${filtros.join(' AND ')}
      GROUP BY c.id
      ORDER BY comissao DESC`,
    ...params,
  );
}
