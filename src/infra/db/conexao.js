/**
 * Conexao com o banco (node:sqlite, embutido no Node 24). [ADR-001]
 *
 * Uma unica conexao por processo. O SQLite serializa as escritas, o que
 * resolve INV-01/RNF-09 sem esforco extra: duas reservas simultaneas do mesmo
 * horario nao conseguem passar juntas pelo indice unico parcial.
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../..');

export const CAMINHO_PADRAO = process.env.DB_PATH ?? resolve(RAIZ, 'dados/encaixe.db');

let db = null;
let profundidadeTransacao = 0;

export function abrir(caminho = CAMINHO_PADRAO) {
  if (db) return db;

  if (caminho !== ':memory:') {
    mkdirSync(dirname(caminho), { recursive: true });
  }

  db = new DatabaseSync(caminho);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  if (caminho !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL');
  }
  return db;
}

export function bd() {
  if (!db) abrir();
  return db;
}

export function fechar() {
  if (db) {
    db.close();
    db = null;
    profundidadeTransacao = 0;
  }
}

/** Cria o esquema (idempotente - todo DDL usa IF NOT EXISTS). */
export function migrar() {
  const sql = readFileSync(resolve(AQUI, 'schema.sql'), 'utf8');
  bd().exec(sql);
  return bd();
}

/**
 * Executa `fn` dentro de uma transacao. Suporta aninhamento via SAVEPOINT,
 * porque servicos de aplicacao se chamam entre si (concluir -> apurar comissao).
 */
export function transacao(fn) {
  const banco = bd();
  const aninhada = profundidadeTransacao > 0;
  const ponto = `sp_${profundidadeTransacao}`;

  banco.exec(aninhada ? `SAVEPOINT ${ponto}` : 'BEGIN');
  profundidadeTransacao += 1;

  try {
    const resultado = fn();
    profundidadeTransacao -= 1;
    banco.exec(aninhada ? `RELEASE ${ponto}` : 'COMMIT');
    return resultado;
  } catch (erro) {
    profundidadeTransacao -= 1;
    try {
      banco.exec(aninhada ? `ROLLBACK TO ${ponto}` : 'ROLLBACK');
    } catch { /* transacao ja desfeita */ }
    throw erro;
  }
}

// ------------------------------------------------------------------ helpers

export function um(sql, ...params) {
  return bd().prepare(sql).get(...params) ?? null;
}

export function varios(sql, ...params) {
  return bd().prepare(sql).all(...params);
}

export function executar(sql, ...params) {
  return bd().prepare(sql).run(...params);
}

export function inserir(sql, ...params) {
  const r = bd().prepare(sql).run(...params);
  return Number(r.lastInsertRowid);
}

/** Conta linhas de uma consulta que devolve `COUNT(*) AS total`. */
export function contar(sql, ...params) {
  return Number(um(sql, ...params)?.total ?? 0);
}
