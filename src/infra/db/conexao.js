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
import { PADROES } from '../../dominio/parametros.js';
import { adicionarDias } from '../../dominio/tempo.js';
import { prazoAutoConclusao } from '../../dominio/prazos.js';

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
  acrescentarReputacaoInicial();
  acrescentarPrazoAutoconclusao();
  acrescentarPrazoAvaliacao();
  return bd();
}

/**
 * Bancos criados antes da spec v0.1.8 nao tem `usuario.reputacao_inicial`, e o
 * SQLite nao tem ADD COLUMN IF NOT EXISTS. As contas antigas recebem a P-08 em
 * vigor agora, que era o valor que o recalculo ja usava para elas.
 */
function acrescentarReputacaoInicial() {
  const banco = bd();
  const colunas = banco.prepare('PRAGMA table_info(usuario)').all().map((c) => c.name);
  if (colunas.includes('reputacao_inicial')) return;

  banco.exec('ALTER TABLE usuario ADD COLUMN reputacao_inicial INTEGER CHECK (reputacao_inicial BETWEEN 0 AND 100)');
  banco.prepare(
    `UPDATE usuario SET reputacao_inicial = CASE perfil WHEN 'ADMIN' THEN reputacao ELSE COALESCE(
       (SELECT CAST(valor AS INTEGER) FROM parametro WHERE chave = 'reputacao_inicial' AND escopo = 'GLOBAL'), ?)
     END`,
  ).run(PADROES.reputacao_inicial);
}

/**
 * Os bancos antigos não possuíam o prazo de autoconclusão travado.
 * O histórico não permite reconstruir qual P-17 estava vigente na confirmação:
 * os confirmados legados recebem a P-17 em vigor na migração e dali em diante
 * ficam travados (SPEC-020, decisão de 2026-10-29). Toda confirmação nova já
 * grava o prazo, então só registros legados chegam aqui sem ele.
 */
function acrescentarPrazoAutoconclusao() {
  const banco = bd();
  const colunas = banco.prepare('PRAGMA table_info(agendamento)').all().map(c => c.name);
  if (!colunas.includes('autoconclusao_prazo_em')) {
    banco.exec('ALTER TABLE agendamento ADD COLUMN autoconclusao_prazo_em TEXT');
  }

  const legados = banco.prepare(
    `SELECT a.id, h.inicio, h.duracao_min FROM agendamento a JOIN horario_vago h ON h.id = a.horario_id
      WHERE a.estado = 'CONFIRMADO' AND a.autoconclusao_prazo_em IS NULL`,
  ).all();
  if (legados.length === 0) return;
  const vigente = (chave) => banco.prepare(
    "SELECT CAST(valor AS INTEGER) AS horas FROM parametro WHERE chave = ? AND escopo = 'GLOBAL'",
  ).get(chave)?.horas ?? PADROES[chave];
  const prazo = (ag) => prazoAutoConclusao(ag.inicio, ag.duracao_min, {
    autoconclusao_h: vigente('autoconclusao_h'),
    noshow_prazo_pos_fim_h: vigente('noshow_prazo_pos_fim_h'),
  });
  const gravar = banco.prepare('UPDATE agendamento SET autoconclusao_prazo_em = ? WHERE id = ?');
  for (const ag of legados) gravar.run(prazo(ag), ag.id);
}

/**
 * Bancos anteriores a spec v0.1.10 calculavam o prazo de avaliacao com a P-14 do
 * momento da leitura. Os concluidos antigos recebem a P-14 em vigor agora, que e
 * o prazo que ja valia para eles, e dali em diante ficam travados (RN-00).
 */
function acrescentarPrazoAvaliacao() {
  const banco = bd();
  const colunas = banco.prepare('PRAGMA table_info(agendamento)').all().map((c) => c.name);
  if (colunas.includes('avaliacao_prazo_em')) return;

  banco.exec('ALTER TABLE agendamento ADD COLUMN avaliacao_prazo_em TEXT');
  const vigente = banco.prepare(
    "SELECT CAST(valor AS INTEGER) AS dias FROM parametro WHERE chave = 'janela_avaliacao_dias' AND escopo = 'GLOBAL'",
  ).get()?.dias ?? PADROES.janela_avaliacao_dias;
  const gravar = banco.prepare('UPDATE agendamento SET avaliacao_prazo_em = ? WHERE id = ?');
  const concluidos = banco.prepare(
    "SELECT id, encerrado_em FROM agendamento WHERE estado = 'CONCLUIDO' AND encerrado_em IS NOT NULL",
  ).all();
  for (const ag of concluidos) gravar.run(adicionarDias(ag.encerrado_em, vigente), ag.id);
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
