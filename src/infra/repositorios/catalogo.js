/**
 * Repositorio de catalogo: regioes, categorias, servicos e reguas de desconto.
 */

import { um, varios, inserir, executar } from '../db/conexao.js';
import { agoraIso } from '../../dominio/tempo.js';

// ------------------------------------------------------------------ regioes

export function listarRegioes() {
  return varios('SELECT * FROM regiao ORDER BY cidade, bairro');
}

export function regiaoPorId(id) {
  return um('SELECT * FROM regiao WHERE id = ?', id);
}

export function criarRegiao(cidade, bairro) {
  return inserir('INSERT OR IGNORE INTO regiao (cidade, bairro) VALUES (?, ?)', cidade, bairro);
}

// --------------------------------------------------------------- categorias

export function listarCategorias() {
  return varios('SELECT * FROM categoria_servico ORDER BY nome');
}

export function categoriaPorId(id) {
  return um('SELECT * FROM categoria_servico WHERE id = ?', id);
}

export function categoriaPorNome(nome) {
  return um('SELECT * FROM categoria_servico WHERE nome = ?', nome);
}

export function criarCategoria(nome, percentualComissao) {
  return inserir(
    'INSERT INTO categoria_servico (nome, percentual_comissao, vigente_desde) VALUES (?, ?, ?)',
    nome, percentualComissao, agoraIso(),
  );
}

/** RF-080 - alteracao de percentual vale a partir de agora (RN-15, RF-081). */
export function atualizarComissaoCategoria(id, percentual) {
  executar(
    'UPDATE categoria_servico SET percentual_comissao = ?, vigente_desde = ? WHERE id = ?',
    percentual, agoraIso(), id,
  );
}

// ----------------------------------------------------------------- servicos

export function criarServico({ prestador_id, categoria_id, nome, duracao_min, preco_base, preco_minimo }) {
  return inserir(
    `INSERT INTO servico (prestador_id, categoria_id, nome, duracao_min, preco_base, preco_minimo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    prestador_id, categoria_id, nome, duracao_min, preco_base, preco_minimo,
  );
}

export function servicoPorId(id) {
  return um(
    `SELECT s.*, c.nome AS categoria_nome, c.percentual_comissao
       FROM servico s
       JOIN categoria_servico c ON c.id = s.categoria_id
      WHERE s.id = ?`,
    id,
  );
}

export function servicosDoPrestador(prestadorId, apenasAtivos = false) {
  return varios(
    `SELECT s.*, c.nome AS categoria_nome
       FROM servico s
       JOIN categoria_servico c ON c.id = s.categoria_id
      WHERE s.prestador_id = ? ${apenasAtivos ? 'AND s.ativo = 1' : ''}
      ORDER BY s.nome`,
    prestadorId,
  );
}

export function atualizarServico(id, { nome, duracao_min, preco_base, preco_minimo, categoria_id, ativo }) {
  executar(
    `UPDATE servico
        SET nome = ?, duracao_min = ?, preco_base = ?, preco_minimo = ?, categoria_id = ?, ativo = ?
      WHERE id = ?`,
    nome, duracao_min, preco_base, preco_minimo, categoria_id, ativo ? 1 : 0, id,
  );
}

// ------------------------------------------------------------------- reguas

export function criarRegua(prestadorId, nome, faixas) {
  const reguaId = inserir(
    'INSERT INTO regua_desconto (prestador_id, nome, ativa) VALUES (?, ?, 1)',
    prestadorId, nome,
  );
  for (const faixa of faixas) {
    executar(
      'INSERT INTO faixa_desconto (regua_id, antecedencia_min, percentual_desconto) VALUES (?, ?, ?)',
      reguaId, Number(faixa.antecedencia_min), Number(faixa.percentual_desconto),
    );
  }
  return reguaId;
}

export function substituirFaixas(reguaId, faixas) {
  executar('DELETE FROM faixa_desconto WHERE regua_id = ?', reguaId);
  for (const faixa of faixas) {
    executar(
      'INSERT INTO faixa_desconto (regua_id, antecedencia_min, percentual_desconto) VALUES (?, ?, ?)',
      reguaId, Number(faixa.antecedencia_min), Number(faixa.percentual_desconto),
    );
  }
}

export function renomearRegua(reguaId, nome) {
  executar('UPDATE regua_desconto SET nome = ? WHERE id = ?', nome, reguaId);
}

export function faixasDaRegua(reguaId) {
  return varios(
    'SELECT * FROM faixa_desconto WHERE regua_id = ? ORDER BY antecedencia_min',
    reguaId,
  );
}

export function reguaPorId(id) {
  const regua = um('SELECT * FROM regua_desconto WHERE id = ?', id);
  if (!regua) return null;
  return { ...regua, faixas: faixasDaRegua(id) };
}

export function reguasDoPrestador(prestadorId) {
  return varios(
    'SELECT * FROM regua_desconto WHERE prestador_id = ? AND ativa = 1 ORDER BY id',
    prestadorId,
  ).map((r) => ({ ...r, faixas: faixasDaRegua(r.id) }));
}

export function desativarRegua(id) {
  executar('UPDATE regua_desconto SET ativa = 0 WHERE id = ?', id);
}

/** RN-08 - o prestador so publica se tiver perfil, servico e regua valida. */
export function prestadorEstaCompleto(prestadorId) {
  const servicos = varios('SELECT id FROM servico WHERE prestador_id = ? AND ativo = 1', prestadorId);
  const reguas = reguasDoPrestador(prestadorId);
  const perfil = um('SELECT regiao_id, nome_exibicao FROM perfil_prestador WHERE usuario_id = ?', prestadorId);

  const faltando = [];
  if (!perfil?.nome_exibicao) faltando.push('nome de exibicao');
  if (!perfil?.regiao_id) faltando.push('regiao de atendimento');
  if (servicos.length === 0) faltando.push('ao menos um servico');
  if (reguas.length === 0 || reguas.every((r) => r.faixas.length === 0)) faltando.push('uma regua de desconto com faixas');

  return { completo: faltando.length === 0, faltando };
}
