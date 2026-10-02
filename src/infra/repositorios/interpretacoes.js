/**
 * Repositorio de interpretacoes de busca (saida estruturada do LLM).
 * RN-32 - toda interpretacao fica rastreavel: texto, saida, confianca, modelo e desfecho.
 */

import { um, varios, inserir, executar, contar } from '../db/conexao.js';

export function criar({
  cliente_id, texto_original, categoria_id, categoria_sugerida, duracao_estimada_min,
  urgencia, janela_inicio, janela_fim, regiao_id, confianca, modelo, status, desfecho, criada_em,
}) {
  return inserir(
    `INSERT INTO interpretacao_busca
       (cliente_id, texto_original, categoria_id, categoria_sugerida, duracao_estimada_min,
        urgencia, janela_inicio, janela_fim, regiao_id, confianca, modelo, status, desfecho, criada_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    cliente_id ?? null, texto_original, categoria_id ?? null, categoria_sugerida ?? null,
    duracao_estimada_min ?? null, urgencia ?? null, janela_inicio ?? null, janela_fim ?? null,
    regiao_id ?? null, confianca ?? null, modelo, status, desfecho, criada_em,
  );
}

export function porId(id) {
  return um('SELECT * FROM interpretacao_busca WHERE id = ?', id);
}

export function atualizarDesfecho(id, desfecho) {
  executar('UPDATE interpretacao_busca SET desfecho = ? WHERE id = ?', desfecho, id);
}

/** RNF-13 - trava de custo: quantas interpretacoes o usuario ja pediu no periodo. */
export function contarDesde(clienteId, desdeIso) {
  return contar(
    'SELECT COUNT(*) AS total FROM interpretacao_busca WHERE cliente_id = ? AND criada_em >= ?',
    clienteId, desdeIso,
  );
}

/** Painel do admin: qualidade da extracao ao longo do tempo. */
export function estatisticas() {
  return um(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'SUCESSO' THEN 1 ELSE 0 END) AS sucesso,
            SUM(CASE WHEN status = 'BAIXA_CONFIANCA' THEN 1 ELSE 0 END) AS baixa_confianca,
            SUM(CASE WHEN status = 'FALHA' THEN 1 ELSE 0 END) AS falha,
            SUM(CASE WHEN desfecho = 'CORRIGIDA' THEN 1 ELSE 0 END) AS corrigidas,
            AVG(confianca) AS confianca_media
       FROM interpretacao_busca`,
  );
}

export function recentes(limite = 30) {
  return varios(
    `SELECT i.*, u.nome AS cliente_nome, c.nome AS categoria_nome
       FROM interpretacao_busca i
       LEFT JOIN usuario u ON u.id = i.cliente_id
       LEFT JOIN categoria_servico c ON c.id = i.categoria_id
      ORDER BY i.id DESC
      LIMIT ?`,
    limite,
  );
}
