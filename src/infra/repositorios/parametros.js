/**
 * Repositorio de parametros - RN-00 ("parametros sao dados, nao codigo").
 * O snapshot `parametro` atende as leituras atuais; `parametro_historico`
 * preserva cada versao para consultas por instante (SPEC-001 CA-04).
 */

import { varios, um, executar, transacao } from '../db/conexao.js';
import { PARAMETROS, normalizarParametro, comPadroes } from '../../dominio/parametros.js';
import { agoraIso } from '../../dominio/tempo.js';

/** Todos os parametros globais atuais, com os padroes do catalogo. */
export function carregarGlobais() {
  const linhas = varios("SELECT chave, valor FROM parametro WHERE escopo = 'GLOBAL'");
  const parciais = {};

  for (const linha of linhas) {
    const meta = PARAMETROS[linha.chave];
    if (!meta) continue;
    parciais[linha.chave] = meta.opcoes ? linha.valor : Number(linha.valor);
  }

  return comPadroes(parciais);
}

/**
 * RN-00 / CA-01 / CA-04: lê o valor global vigente no instante informado.
 * Antes da primeira alteração, prevalece o valor padrão da baseline.
 * Empate no milissegundo é resolvido pela última inserção no histórico.
 */
export function lerGlobalEm(chave, instante = agoraIso()) {
  const meta = PARAMETROS[chave];
  if (!meta) throw new Error(`Parâmetro desconhecido: ${chave}`);
  if (!Number.isFinite(Date.parse(instante))) {
    throw new Error('Instante de referência inválido.');
  }

  const linha = um(
    `SELECT valor FROM parametro_historico
      WHERE chave = ? AND escopo = 'GLOBAL' AND alvo_id = 0
        AND vigente_desde <= ?
      ORDER BY vigente_desde DESC, id DESC LIMIT 1`,
    chave, instante,
  );
  if (!linha) return meta.padrao;
  return meta.opcoes ? linha.valor : Number(linha.valor);
}

/**
 * RN-00 / CA-02 / CA-04: atualiza snapshot e insere versão histórica
 * na mesma transação. O argumento de tempo é interno, para testes de relógio
 * controlado; requisições HTTP não o fornecem.
 */
export function salvarGlobal(chave, valorBruto, atorId, instante = agoraIso()) {
  const valor = normalizarParametro(chave, valorBruto);
  if (!Number.isFinite(Date.parse(instante))) {
    throw new Error('Instante de vigência inválido.');
  }

  return transacao(() => {
    executar(
      `INSERT INTO parametro (chave, escopo, alvo_id, valor, vigente_desde, atualizado_por)
       VALUES (?, 'GLOBAL', 0, ?, ?, ?)
       ON CONFLICT(chave, escopo, alvo_id) DO UPDATE SET
         valor = excluded.valor,
         vigente_desde = excluded.vigente_desde,
         atualizado_por = excluded.atualizado_por`,
      chave, String(valor), instante, atorId ?? null,
    );
    executar(
      `INSERT INTO parametro_historico
         (chave, escopo, alvo_id, valor, vigente_desde, atualizado_por)
       VALUES (?, 'GLOBAL', 0, ?, ?, ?)`,
      chave, String(valor), instante, atorId ?? null,
    );
    return valor;
  });
}

/** Histórico real das versões, ordenado pelas alterações mais recentes. */
export function listarGlobais() {
  return varios(
    `SELECT p.chave, p.valor, p.vigente_desde, u.nome AS atualizado_por_nome
       FROM parametro_historico p
       LEFT JOIN usuario u ON u.id = p.atualizado_por
      WHERE p.escopo = 'GLOBAL'
      ORDER BY p.vigente_desde DESC, p.id DESC`,
  );
}
