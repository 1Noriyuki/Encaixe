/**
 * UC-13 (filas de moderacao) e UC-14 (metricas e comissao).
 * Cobre RF-063, RF-064, RF-078, RF-080, RF-081, RF-085.
 */

import * as usuariosRepo from '../infra/repositorios/usuarios.js';
import * as financeiroRepo from '../infra/repositorios/financeiro.js';
import * as catalogoRepo from '../infra/repositorios/catalogo.js';
import * as interpretacoesRepo from '../infra/repositorios/interpretacoes.js';
import * as social from '../infra/repositorios/social.js';
import * as auditoria from '../infra/auditoria.js';
import { assegurarPercentualValido } from '../dominio/comissao.js';
import { agoraIso, adicionarDias } from '../dominio/tempo.js';
import { params, salvarGlobal, listarGlobais } from './parametros.js';
import * as disputas from './disputas.js';

/** Visao geral da plataforma para o painel inicial do admin. */
export function painel({ dias = 30 } = {}) {
  const agora = agoraIso();
  const de = adicionarDias(agora, -dias);

  return {
    periodo: { de, ate: agora, dias },
    metricas: financeiroRepo.metricasPlataforma({ de, ate: agora }),
    porCategoria: financeiroRepo.comissaoPorCategoria({ de, ate: agora }),
    prestadoresPendentes: usuariosRepo.prestadoresPendentes(),
    contasEmRevisao: usuariosRepo.contasEmRevisao(),
    disputas: disputas.fila({ apenasAbertas: true }),
    interpretacoes: interpretacoesRepo.estatisticas(),
  };
}

/** RF-063 / RF-064 - metricas com recorte por categoria ou prestador. */
export function metricas({ dias = 30, categoriaId = null, prestadorId = null } = {}) {
  const agora = agoraIso();
  const de = adicionarDias(agora, -dias);

  return {
    periodo: { de, ate: agora, dias },
    total: financeiroRepo.metricasPlataforma({
      de, ate: agora,
      categoriaId: categoriaId ? Number(categoriaId) : null,
      prestadorId: prestadorId ? Number(prestadorId) : null,
    }),
    porCategoria: financeiroRepo.comissaoPorCategoria({ de, ate: agora }),
    categorias: catalogoRepo.listarCategorias(),
    prestadores: usuariosRepo.listarPorPerfil('PRESTADOR'),
  };
}

/** RF-080 / RF-081 - percentual de comissao por categoria, com vigencia futura. */
export function ajustarComissao({ adminId, categoriaId, percentual }) {
  const categoria = catalogoRepo.categoriaPorId(Number(categoriaId));
  if (!categoria) throw new Error('Categoria não encontrada.');

  const novo = assegurarPercentualValido(Number(percentual));
  catalogoRepo.atualizarComissaoCategoria(categoria.id, novo);

  auditoria.registrar({
    atorId: adminId,
    acao: 'COMISSAO_CATEGORIA_ALTERADA',
    entidade: 'categoria',
    entidadeId: categoria.id,
    de: String(categoria.percentual_comissao),
    para: String(novo),
    detalhe: { regra: 'RN-15', vigencia: 'agendamentos concluídos a partir de agora' },
  });

  return catalogoRepo.categoriaPorId(categoria.id);
}

/** RN-00 - alteracao de parametro global. */
export function ajustarParametro({ adminId, chave, valor }) {
  const anterior = params()[chave];
  const novo = salvarGlobal(chave, valor, adminId);

  auditoria.registrar({
    atorId: adminId,
    acao: 'PARAMETRO_ALTERADO',
    entidade: 'parametro',
    entidadeId: null,
    de: String(anterior),
    para: String(novo),
    detalhe: { chave, regra: 'RN-00' },
  });

  return novo;
}

export function parametrosAtuais() {
  return { valores: params(), historico: listarGlobais() };
}

/** RF-085 - rastreabilidade: auditoria recente e qualidade da extracao por LLM. */
export function rastreabilidade({ limite = 100 } = {}) {
  return {
    auditoria: auditoria.recentes(limite),
    interpretacoes: interpretacoesRepo.recentes(30),
    estatisticasLlm: interpretacoesRepo.estatisticas(),
  };
}

/** UC-13 - dossie da conta que o admin precisa para decidir. */
export function dossieDaConta(usuarioId) {
  const resumo = usuariosRepo.resumoPublico(usuarioId);
  if (!resumo) return null;

  return {
    ...resumo,
    eventos: social.eventosDoUsuario(usuarioId, { limite: 30 }),
    historico: auditoria.historicoDe('conta', usuarioId),
    disputas: disputas.doUsuario(usuarioId),
  };
}
