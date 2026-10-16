/**
 * Catalogo do prestador: servicos e reguas de desconto.
 * Cobre RF-012, RF-013, RF-018 a RF-021, RF-027. Regras: RN-02, RN-03.
 */

import * as catalogoRepo from '../infra/repositorios/catalogo.js';
import * as auditoria from '../infra/auditoria.js';
import { transacao } from '../infra/db/conexao.js';
import { ErroDeValidacao, NaoEncontrado, ErroDeAutorizacao } from '../dominio/erros.js';
import { validarRegua, projetarRegua } from '../dominio/precificacao.js';
import { paraCentavos } from '../dominio/dinheiro.js';
import { params } from './parametros.js';

export const listarCategorias = catalogoRepo.listarCategorias;
export const listarRegioes = catalogoRepo.listarRegioes;
export const servicosDoPrestador = catalogoRepo.servicosDoPrestador;
export const reguasDoPrestador = catalogoRepo.reguasDoPrestador;
export const reguaPorId = catalogoRepo.reguaPorId;
export const servicoPorId = catalogoRepo.servicoPorId;

// ---------------------------------------------------------------- servicos

/** RF-012 / RF-013 */
export function salvarServico({ prestadorId, servicoId = null, nome, categoriaId, duracaoMin, precoBase, precoMinimo }) {
  const titulo = String(nome ?? '').trim();
  if (!titulo) throw new ErroDeValidacao('Informe o nome do serviço.', 'nome');

  const categoria = catalogoRepo.categoriaPorId(Number(categoriaId));
  if (!categoria) throw new ErroDeValidacao('Escolha uma categoria válida.', 'categoriaId');

  const duracao = Number(duracaoMin);
  if (!Number.isInteger(duracao) || duracao <= 0 || duracao % 5 !== 0) {
    throw new ErroDeValidacao('A duração deve ser um múltiplo de 5 minutos maior que zero.', 'duracaoMin');
  }

  const base = paraCentavos(precoBase);
  if (base <= 0) throw new ErroDeValidacao('O preço-base precisa ser maior que zero.', 'precoBase');

  const minimo = precoMinimo === '' || precoMinimo == null ? 0 : paraCentavos(precoMinimo);
  if (minimo > base) {
    throw new ErroDeValidacao('O preço mínimo não pode ser maior que o preço-base.', 'precoMinimo');
  }

  return transacao(() => {
    if (servicoId) {
      const existente = catalogoRepo.servicoPorId(servicoId);
      if (!existente) throw new NaoEncontrado('Serviço não encontrado.');
      if (existente.prestador_id !== prestadorId) throw new ErroDeAutorizacao();

      catalogoRepo.atualizarServico(servicoId, {
        nome: titulo, duracao_min: duracao, preco_base: base,
        preco_minimo: minimo, categoria_id: categoria.id, ativo: 1,
      });
      auditoria.registrar({
        atorId: prestadorId, acao: 'SERVICO_ATUALIZADO', entidade: 'servico', entidadeId: servicoId,
      });
      return catalogoRepo.servicoPorId(servicoId);
    }

    const id = catalogoRepo.criarServico({
      prestador_id: prestadorId,
      categoria_id: categoria.id,
      nome: titulo,
      duracao_min: duracao,
      preco_base: base,
      preco_minimo: minimo,
    });
    auditoria.registrar({
      atorId: prestadorId, acao: 'SERVICO_CRIADO', entidade: 'servico', entidadeId: id,
      detalhe: { categoria: categoria.nome, precoBase: base },
    });
    return catalogoRepo.servicoPorId(id);
  });
}

export function desativarServico({ prestadorId, servicoId }) {
  const servico = catalogoRepo.servicoPorId(servicoId);
  if (!servico) throw new NaoEncontrado('Serviço não encontrado.');
  if (servico.prestador_id !== prestadorId) throw new ErroDeAutorizacao();

  catalogoRepo.atualizarServico(servicoId, { ...servico, ativo: 0 });
  auditoria.registrar({
    atorId: prestadorId, acao: 'SERVICO_DESATIVADO', entidade: 'servico', entidadeId: servicoId,
  });
}

// ------------------------------------------------------------------ reguas

/**
 * RF-018 a RF-020 - salvar regua. A validacao de RN-02 acontece no dominio,
 * antes de qualquer escrita: regua invalida nao chega ao banco.
 */
export function salvarRegua({ prestadorId, reguaId = null, nome, faixas }) {
  const p = params();
  const titulo = String(nome ?? '').trim() || 'Minha régua';

  const normalizadas = normalizarFaixas(faixas);
  const validadas = validarRegua(normalizadas, p.desconto_maximo_pct);

  return transacao(() => {
    if (reguaId) {
      const existente = catalogoRepo.reguaPorId(reguaId);
      if (!existente) throw new NaoEncontrado('Régua não encontrada.');
      if (existente.prestador_id !== prestadorId) throw new ErroDeAutorizacao();

      catalogoRepo.renomearRegua(reguaId, titulo);
      catalogoRepo.substituirFaixas(reguaId, validadas);
      auditoria.registrar({
        atorId: prestadorId, acao: 'REGUA_ATUALIZADA', entidade: 'regua', entidadeId: reguaId,
        detalhe: { faixas: validadas },
      });
      return catalogoRepo.reguaPorId(reguaId);
    }

    const id = catalogoRepo.criarRegua(prestadorId, titulo, validadas);
    auditoria.registrar({
      atorId: prestadorId, acao: 'REGUA_CRIADA', entidade: 'regua', entidadeId: id,
      detalhe: { faixas: validadas },
    });
    return catalogoRepo.reguaPorId(id);
  });
}

/**
 * Aceita faixas vindas do formulario: pares (antecedencia, percentual),
 * com linhas em branco ignoradas.
 */
function normalizarFaixas(faixas) {
  const lista = Array.isArray(faixas) ? faixas : [];
  const limpas = lista
    .map((f) => ({
      antecedencia_min: Number.parseInt(f.antecedencia_min ?? f.antecedencia, 10),
      percentual_desconto: Number.parseInt(f.percentual_desconto ?? f.percentual, 10),
    }))
    .filter((f) => Number.isFinite(f.antecedencia_min) || Number.isFinite(f.percentual_desconto));

  for (const faixa of limpas) {
    if (!Number.isFinite(faixa.antecedencia_min) || !Number.isFinite(faixa.percentual_desconto)) {
      throw new ErroDeValidacao('Preencha antecedência e desconto em todas as faixas.', 'faixas');
    }
  }
  return limpas;
}

/** RF-027 - simulacao sem persistir. */
export function simularRegua({ precoBase, precoMinimo, faixas }) {
  const p = params();
  const base = paraCentavos(precoBase);
  const minimo = precoMinimo === '' || precoMinimo == null ? 0 : paraCentavos(precoMinimo);
  const validadas = validarRegua(normalizarFaixas(faixas), p.desconto_maximo_pct);

  return projetarRegua({
    precoBase: base,
    precoMinimo: minimo,
    faixas: validadas,
    tetoPct: p.desconto_maximo_pct,
  });
}
