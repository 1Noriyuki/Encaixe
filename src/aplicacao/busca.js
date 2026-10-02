/**
 * UC-03 (busca por filtros) e UC-04 (busca por linguagem natural).
 * Cobre RF-028 a RF-038. Regras: RN-29 a RN-32.
 *
 * A fronteira que este arquivo protege: o LLM produz FILTROS; a selecao,
 * o filtro e a ordenacao dos horarios sao feitos por codigo deterministico
 * daqui para baixo (INV-14). Se o provedor sumir, `buscarPorFiltros` continua
 * funcionando igual.
 */

import * as horariosRepo from '../infra/repositorios/horarios.js';
import * as catalogoRepo from '../infra/repositorios/catalogo.js';
import * as interpretacoesRepo from '../infra/repositorios/interpretacoes.js';
import * as auditoria from '../infra/auditoria.js';
import { provedor, STATUS } from '../infra/llm/index.js';
import { ErroDeRegra } from '../dominio/erros.js';
import { agoraIso, adicionarHoras, adicionarDias } from '../dominio/tempo.js';
import { params } from './parametros.js';
import { precificarLista } from './precos.js';

export const ORDENACOES = {
  proximidade: 'Mais próximos do horário',
  preco: 'Menor preço',
  desconto: 'Maior desconto',
  reputacao: 'Melhor reputação',
};

/**
 * RF-028 a RF-031 - busca deterministica.
 * Nenhuma linha aqui depende de IA.
 */
export function buscarPorFiltros({ categoriaId = null, regiaoId = null, de = null, ate = null, ordenar = 'proximidade' } = {}) {
  const p = params();
  const agora = agoraIso();

  // RF-029 - horario so aparece se ainda houver antecedencia minima para reservar.
  const inicioJanela = de ?? agora;
  const fimJanela = ate ?? adicionarHoras(agora, 72);

  const brutos = horariosRepo.buscar({
    categoriaId: categoriaId ? Number(categoriaId) : null,
    regiaoId: regiaoId ? Number(regiaoId) : null,
    de: inicioJanela,
    ate: fimJanela,
  });

  const precificados = precificarLista(brutos, p, agora)
    .filter((h) => h.preco.reservavel);

  return ordenar_(precificados, ordenar);
}

function ordenar_(lista, criterio) {
  const comparadores = {
    proximidade: (a, b) => a.inicio.localeCompare(b.inicio),
    preco: (a, b) => a.preco.precoVigente - b.preco.precoVigente,
    desconto: (a, b) => b.preco.percentualEfetivo - a.preco.percentualEfetivo,
    reputacao: (a, b) => b.prestador_reputacao - a.prestador_reputacao,
  };
  const cmp = comparadores[criterio] ?? comparadores.proximidade;

  // RF-031 - desempate deterministico pelo id, para a ordem nunca "tremer".
  return [...lista].sort((a, b) => cmp(a, b) || a.id - b.id);
}

// -------------------------------------------------------- busca com LLM

/**
 * RF-032 a RF-038 - interpreta o texto livre e devolve os FILTROS propostos.
 * Nao executa a busca: quem decide se busca direto ou pede confirmacao ao
 * cliente e o chamador, conforme RN-30.
 */
export async function interpretar({ clienteId = null, texto }) {
  const p = params();
  const agora = agoraIso();

  // RNF-13 - trava de custo por usuario/dia.
  if (clienteId) {
    const usadas = interpretacoesRepo.contarDesde(clienteId, adicionarDias(agora, -1));
    if (usadas >= p.limite_interpretacoes_dia) {
      throw new ErroDeRegra(
        'RNF-13',
        `Você já usou as ${p.limite_interpretacoes_dia} buscas por descrição de hoje. `
        + 'Use os filtros abaixo para continuar buscando.',
        { limite: p.limite_interpretacoes_dia },
      );
    }
  }

  const categorias = catalogoRepo.listarCategorias();
  const regioes = catalogoRepo.listarRegioes();

  const saida = await provedor().interpretar({ texto, categorias, regioes, agoraIso: agora });

  // RN-31 - degradacao segura: falha nao derruba a busca.
  if (saida.status === STATUS.FALHA) {
    const id = interpretacoesRepo.criar({
      cliente_id: clienteId,
      texto_original: texto,
      modelo: saida.modelo,
      status: 'FALHA',
      desfecho: 'DESCARTADA',
      criada_em: agora,
    });
    auditoria.registrar({
      atorId: clienteId,
      acao: 'INTERPRETACAO_FALHOU',
      entidade: 'interpretacao',
      entidadeId: id,
      detalhe: { motivo: saida.motivo, modelo: saida.modelo },
    });

    return {
      id,
      status: 'FALHA',
      motivo: saida.motivo,
      precisaFormulario: true,
      filtros: null,
    };
  }

  const categoria = saida.categoria_servico
    ? catalogoRepo.categoriaPorNome(saida.categoria_servico)
    : null;
  const regiao = saida.regiao
    ? regioes.find((r) => igual(r.bairro, saida.regiao) || igual(r.cidade, saida.regiao))
    : null;

  // RN-30 - confianca baixa ou categoria fora do catalogo exigem confirmacao.
  const confiancaBaixa = saida.confianca < p.confianca_minima_llm;
  const precisaConfirmar = confiancaBaixa || !categoria;

  const status = precisaConfirmar ? 'BAIXA_CONFIANCA' : 'SUCESSO';

  const id = interpretacoesRepo.criar({
    cliente_id: clienteId,
    texto_original: texto,
    categoria_id: categoria?.id ?? null,
    categoria_sugerida: saida.categoria_sugerida,
    duracao_estimada_min: saida.duracao_estimada_min,
    urgencia: saida.urgencia,
    janela_inicio: saida.janela_inicio,
    janela_fim: saida.janela_fim,
    regiao_id: regiao?.id ?? null,
    confianca: saida.confianca,
    modelo: saida.modelo,
    status,
    desfecho: precisaConfirmar ? 'CORRIGIDA' : 'ACEITA',
    criada_em: agora,
  });

  auditoria.registrar({
    atorId: clienteId,
    acao: 'INTERPRETACAO_REGISTRADA',
    entidade: 'interpretacao',
    entidadeId: id,
    detalhe: {
      modelo: saida.modelo,
      confianca: saida.confianca,
      categoria: saida.categoria_sugerida,
      status,
    },
  });

  return {
    id,
    status,
    precisaConfirmar,
    precisaFormulario: false,
    motivo: !categoria
      ? `Não reconheci "${saida.categoria_sugerida ?? 'o servico'}" no catálogo. Escolha a categoria.`
      : (confiancaBaixa ? 'A interpretação ficou pouco confiante. Confira os filtros antes de buscar.' : null),
    interpretacao: {
      urgencia: saida.urgencia,
      duracaoEstimadaMin: saida.duracao_estimada_min,
      confianca: saida.confianca,
      modelo: saida.modelo,
      categoriaSugerida: saida.categoria_sugerida,
    },
    filtros: {
      categoriaId: categoria?.id ?? null,
      regiaoId: regiao?.id ?? null,
      de: saida.janela_inicio,
      ate: saida.janela_fim,
      ordenar: saida.urgencia === 'ALTA' ? 'proximidade' : 'preco',
    },
  };
}

/** RF-035/RF-036 - o cliente confirmou ou corrigiu os filtros interpretados. */
export function registrarConfirmacao(interpretacaoId, corrigida) {
  if (!interpretacaoId) return;
  interpretacoesRepo.atualizarDesfecho(interpretacaoId, corrigida ? 'CORRIGIDA' : 'ACEITA');
}

function igual(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR', { sensitivity: 'base' }) === 0;
}
