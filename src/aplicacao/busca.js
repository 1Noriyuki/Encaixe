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
import {
  agoraIso, adicionarMinutos, adicionarHoras, adicionarDias, antesDe,
} from '../dominio/tempo.js';
import { params } from './parametros.js';
import { precificarLista } from './precos.js';

/**
 * UC-03 1a - sem janela informada, a busca olha as proximas 24 h. Nao e
 * parametro da §6.1: e o recorte padrao do caso de uso.
 */
export const JANELA_PADRAO_H = 24;

/** RF-028 / UC-03 passo 1 - janelas que o formulario oferece, em horas a partir de agora. */
export const JANELAS_H = [6, 12, 24, 48, 72];

/** Quantos horarios a tela lista de uma vez: recorte de exibicao, nao regra da §6.1. */
export const LIMITE_EXIBIDOS = 200;

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
export function buscarPorFiltros({
  categoriaId = null, regiaoId = null, de = null, ate = null, janelaHoras = null, ordenar = 'proximidade',
} = {}) {
  const p = params();
  const agora = agoraIso();

  // RF-029 - horario so aparece se ainda houver antecedencia minima para reservar.
  const inicioReservavel = adicionarMinutos(agora, p.antecedencia_min_reserva_min);
  const inicioJanela = de && antesDe(de, inicioReservavel)
    ? inicioReservavel
    : (de ?? inicioReservavel);
  const horas = JANELAS_H.includes(Number(janelaHoras)) ? Number(janelaHoras) : JANELA_PADRAO_H;
  const fimJanela = ate ?? adicionarHoras(agora, horas);

  const brutos = horariosRepo.buscar({
    categoriaId: categoriaId ? Number(categoriaId) : null,
    regiaoId: regiaoId ? Number(regiaoId) : null,
    de: inicioJanela,
    ate: fimJanela,
  });

  const precificados = precificarLista(brutos, p, agora)
    .filter((h) => h.preco.reservavel);

  // SPEC-013 §13: ordena a janela inteira e so depois corta o que a tela exibe.
  return ordenar_(precificados, ordenar).slice(0, LIMITE_EXIBIDOS);
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
export async function interpretar({ clienteId = null, texto, reaproveitarId = null }) {
  const p = params();
  const agora = agoraIso();

  // SPEC-028 §13: refinar os filtros de uma busca ja interpretada reenviava o
  // mesmo texto ao provedor e gastava a P-21. Mesmo dono e mesmo texto: reusa.
  const anterior = reaproveitarId ? interpretacoesRepo.porId(Number(reaproveitarId)) : null;
  if (anterior && anterior.status !== 'FALHA' && anterior.cliente_id === clienteId
    && anterior.texto_original === texto) {
    return { ...respostaDe(anterior, p), reaproveitada: true };
  }

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
    // RN-32 / SPEC-028 §13: quem precisa conferir e nao volta descartou a leitura;
    // ao buscar, registrarConfirmacao troca para ACEITA ou CORRIGIDA.
    desfecho: precisaConfirmar ? 'DESCARTADA' : 'ACEITA',
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

  return respostaDe(interpretacoesRepo.porId(id), p);
}

/** O que a tela recebe de uma interpretacao, a partir do registro gravado (RN-30). */
function respostaDe(registro, p) {
  const confiancaBaixa = registro.confianca < p.confianca_minima_llm;
  const temCategoria = registro.categoria_id != null;
  return {
    id: registro.id,
    status: registro.status,
    precisaConfirmar: registro.status === 'BAIXA_CONFIANCA',
    precisaFormulario: false,
    motivo: !temCategoria
      ? `Não reconheci "${registro.categoria_sugerida ?? 'o servico'}" no catálogo. Escolha a categoria.`
      : (confiancaBaixa ? 'A interpretação ficou pouco confiante. Confira os filtros antes de buscar.' : null),
    interpretacao: {
      urgencia: registro.urgencia,
      duracaoEstimadaMin: registro.duracao_estimada_min,
      confianca: registro.confianca,
      modelo: registro.modelo,
      categoriaSugerida: registro.categoria_sugerida,
    },
    filtros: {
      categoriaId: registro.categoria_id,
      regiaoId: registro.regiao_id,
      de: registro.janela_inicio,
      ate: registro.janela_fim,
      ordenar: registro.urgencia === 'ALTA' ? 'proximidade' : 'preco',
    },
  };
}

/**
 * RF-035/RF-036, RN-32 - o cliente buscou depois de conferir a interpretacao.
 * O desfecho sai da comparacao entre o que o modelo propos e o que o cliente
 * de fato usou, nao de um botao: mudou categoria ou regiao, corrigiu.
 * So o dono da interpretacao registra o desfecho dela.
 */
export function registrarConfirmacao({ interpretacaoId, clienteId = null, filtros }) {
  const leitura = interpretacoesRepo.porId(Number(interpretacaoId));
  if (!leitura || leitura.status === 'FALHA' || leitura.cliente_id !== clienteId) return null;

  const igualAoProposto = (proposto, usado) => (proposto ?? null) === (usado ? Number(usado) : null);
  const corrigida = !igualAoProposto(leitura.categoria_id, filtros.categoriaId)
    || !igualAoProposto(leitura.regiao_id, filtros.regiaoId);
  const desfecho = corrigida ? 'CORRIGIDA' : 'ACEITA';
  interpretacoesRepo.atualizarDesfecho(leitura.id, desfecho);
  return desfecho;
}

function igual(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR', { sensitivity: 'base' }) === 0;
}
