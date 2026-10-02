/**
 * Repositorio de horarios vagos.
 *
 * Nenhuma consulta aqui calcula preco: o preco vigente e sempre derivado no
 * dominio (RN-01), a partir da regua e da antecedencia. O banco guarda a
 * oferta; quem precifica e a regra.
 */

import { um, varios, inserir, executar } from '../db/conexao.js';
import { HORARIO_OCUPA_AGENDA } from '../../dominio/estados.js';

const CAMPOS_JOIN = `
  h.*,
  s.nome AS servico_nome, s.categoria_id, s.duracao_min AS servico_duracao,
  c.nome AS categoria_nome, c.percentual_comissao,
  u.nome AS prestador_nome, u.reputacao AS prestador_reputacao, u.estado_conta AS prestador_estado,
  p.nome_exibicao, p.janela_confirmacao_min, p.politica_expiracao, p.regiao_id,
  r.cidade, r.bairro
`;

const JOINS = `
  FROM horario_vago h
  JOIN servico s ON s.id = h.servico_id
  JOIN categoria_servico c ON c.id = s.categoria_id
  JOIN usuario u ON u.id = h.prestador_id
  JOIN perfil_prestador p ON p.usuario_id = h.prestador_id
  LEFT JOIN regiao r ON r.id = p.regiao_id
`;

export function criar({ prestador_id, servico_id, regua_id, inicio, duracao_min, preco_base_snapshot, preco_minimo_snapshot, estado, criado_em }) {
  return inserir(
    `INSERT INTO horario_vago
       (prestador_id, servico_id, regua_id, inicio, duracao_min,
        preco_base_snapshot, preco_minimo_snapshot, estado, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    prestador_id, servico_id, regua_id, inicio, duracao_min,
    preco_base_snapshot, preco_minimo_snapshot, estado, criado_em,
  );
}

export function porId(id) {
  return um(`SELECT ${CAMPOS_JOIN} ${JOINS} WHERE h.id = ?`, id);
}

export function atualizarEstado(id, estado) {
  executar('UPDATE horario_vago SET estado = ? WHERE id = ?', estado, id);
}

/** Agenda do prestador (para a tela "meus horarios"). */
export function doPrestador(prestadorId, { estados = null, desde = null } = {}) {
  const filtros = ['h.prestador_id = ?'];
  const params = [prestadorId];

  if (estados?.length) {
    filtros.push(`h.estado IN (${estados.map(() => '?').join(',')})`);
    params.push(...estados);
  }
  if (desde) {
    filtros.push('h.inicio >= ?');
    params.push(desde);
  }

  return varios(
    `SELECT ${CAMPOS_JOIN} ${JOINS} WHERE ${filtros.join(' AND ')} ORDER BY h.inicio`,
    ...params,
  );
}

/** RN-06 - horarios que ocupam a agenda e podem conflitar com um novo. */
export function ativosDoPrestador(prestadorId) {
  const marcadores = HORARIO_OCUPA_AGENDA.map(() => '?').join(',');
  return varios(
    `SELECT id, inicio, duracao_min, estado
       FROM horario_vago
      WHERE prestador_id = ? AND estado IN (${marcadores})`,
    prestadorId, ...HORARIO_OCUPA_AGENDA,
  );
}

/**
 * RF-028 a RF-030 - busca publica.
 * Devolve apenas horarios PUBLICADO, com inicio no futuro e de prestador ATIVO.
 * O corte por antecedencia minima (P-04) e feito no servico de aplicacao,
 * junto com o calculo de preco.
 */
export function buscar({ categoriaId = null, regiaoId = null, de = null, ate = null } = {}) {
  const filtros = ["h.estado = 'PUBLICADO'", "u.estado_conta = 'ATIVO'"];
  const params = [];

  if (categoriaId) { filtros.push('s.categoria_id = ?'); params.push(categoriaId); }
  if (regiaoId) { filtros.push('p.regiao_id = ?'); params.push(regiaoId); }
  if (de) { filtros.push('h.inicio >= ?'); params.push(de); }
  if (ate) { filtros.push('h.inicio <= ?'); params.push(ate); }

  return varios(
    `SELECT ${CAMPOS_JOIN} ${JOINS} WHERE ${filtros.join(' AND ')} ORDER BY h.inicio LIMIT 200`,
    ...params,
  );
}

/** Horarios publicados cujo inicio ja passou - viram EXPIRADO na rotina temporal. */
export function publicadosVencidos(agoraIso) {
  return varios(
    "SELECT id, estado FROM horario_vago WHERE estado = 'PUBLICADO' AND inicio <= ?",
    agoraIso,
  );
}

/** Horarios ocupados cujo agendamento ja chegou a estado terminal - viram ENCERRADO. */
export function ocupadosEncerraveis() {
  return varios(
    `SELECT h.id
       FROM horario_vago h
      WHERE h.estado = 'OCUPADO'
        AND NOT EXISTS (
          SELECT 1 FROM agendamento a
           WHERE a.horario_id = h.id
             AND a.estado IN ('PENDENTE_CONFIRMACAO','CONFIRMADO','EM_DISPUTA')
        )`,
  );
}

/** Faixas da regua vinculada ao horario (usadas para precificar). */
export function faixasDoHorario(horarioId) {
  return varios(
    `SELECT f.antecedencia_min, f.percentual_desconto
       FROM faixa_desconto f
       JOIN horario_vago h ON h.regua_id = f.regua_id
      WHERE h.id = ?
      ORDER BY f.antecedencia_min`,
    horarioId,
  );
}

/** Faixas de varios horarios de uma vez (evita N+1 na busca). */
export function faixasPorRegua(reguaIds) {
  if (!reguaIds.length) return new Map();
  const marcadores = reguaIds.map(() => '?').join(',');
  const linhas = varios(
    `SELECT regua_id, antecedencia_min, percentual_desconto
       FROM faixa_desconto
      WHERE regua_id IN (${marcadores})
      ORDER BY antecedencia_min`,
    ...reguaIds,
  );

  const mapa = new Map();
  for (const linha of linhas) {
    if (!mapa.has(linha.regua_id)) mapa.set(linha.regua_id, []);
    mapa.get(linha.regua_id).push(linha);
  }
  return mapa;
}
