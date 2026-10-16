/**
 * Repositorio de parametros - RN-00 ("parametros sao dados, nao codigo").
 */

import { varios, executar } from '../db/conexao.js';
import { PARAMETROS, normalizarParametro, comPadroes } from '../../dominio/parametros.js';
import { agoraIso } from '../../dominio/tempo.js';

/** Todos os parametros globais, com os padroes preenchendo o que nunca foi alterado. */
export function carregarGlobais() {
  const linhas = varios("SELECT chave, valor FROM parametro WHERE escopo = 'GLOBAL'");
  const parciais = {};

  for (const linha of linhas) {
    const meta = PARAMETROS[linha.chave];
    if (!meta) continue; // parametro removido do dominio: ignora em vez de quebrar
    parciais[linha.chave] = meta.opcoes ? linha.valor : Number(linha.valor);
  }

  return comPadroes(parciais);
}

/** Grava um parametro global. Vigencia sempre a partir de agora (RN-00: nunca retroage). */
export function salvarGlobal(chave, valorBruto, atorId) {
  const valor = normalizarParametro(chave, valorBruto);
  executar(
    `INSERT INTO parametro (chave, escopo, alvo_id, valor, vigente_desde, atualizado_por)
     VALUES (?, 'GLOBAL', 0, ?, ?, ?)
     ON CONFLICT(chave, escopo, alvo_id) DO UPDATE SET
       valor = excluded.valor,
       vigente_desde = excluded.vigente_desde,
       atualizado_por = excluded.atualizado_por`,
    chave, String(valor), agoraIso(), atorId ?? null,
  );
  return valor;
}

/** Historico de quem mexeu em que (alimenta a tela de parametros do admin). */
export function listarGlobais() {
  return varios(
    `SELECT p.chave, p.valor, p.vigente_desde, u.nome AS atualizado_por_nome
       FROM parametro p
       LEFT JOIN usuario u ON u.id = p.atualizado_por
      WHERE p.escopo = 'GLOBAL'`,
  );
}
