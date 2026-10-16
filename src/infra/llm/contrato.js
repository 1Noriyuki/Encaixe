/**
 * Contrato do provedor de interpretacao - RNF-12, RN-29.
 *
 * O sistema nunca fala com um provedor concreto: fala com esta interface.
 * Trocar de modelo, ou usar o provedor simulado nos testes, nao toca nenhuma
 * regra de negocio.
 *
 * A saida e SEMPRE validada aqui. Nada do que o modelo devolve entra no
 * sistema sem passar por esta porta - se vier fora do formato, vira FALHA e a
 * busca cai no formulario (RN-31).
 */

export const URGENCIAS = ['ALTA', 'MEDIA', 'BAIXA'];

export const STATUS = {
  SUCESSO: 'SUCESSO',
  BAIXA_CONFIANCA: 'BAIXA_CONFIANCA',
  FALHA: 'FALHA',
};

/**
 * JSON Schema da saida estruturada exigida do modelo.
 * `categorias` restringe a saida ao catalogo real do sistema.
 */
export function esquemaDeSaida(categorias) {
  return {
    type: 'object',
    properties: {
      categoria_servico: {
        type: 'string',
        description: 'Categoria de serviço do catálogo que melhor atende o pedido.',
        enum: categorias.map((c) => c.nome),
      },
      duracao_estimada_min: {
        type: 'integer',
        description: 'Duração estimada do atendimento em minutos (múltiplo de 5, entre 15 e 240).',
      },
      urgencia: {
        type: 'string',
        enum: URGENCIAS,
        description: 'ALTA quando o pedido é para hoje ou agora, BAIXA quando não há pressa.',
      },
      janela_inicio: {
        type: 'string',
        description: 'Início da janela desejada em ISO-8601 UTC. String vazia se o texto não indicar.',
      },
      janela_fim: {
        type: 'string',
        description: 'Fim da janela desejada em ISO-8601 UTC. String vazia se o texto não indicar.',
      },
      regiao: {
        type: 'string',
        description: 'Bairro ou cidade citada no texto. String vazia se não houver.',
      },
      confianca: {
        type: 'number',
        description: 'Confiança de 0 a 1 na interpretação como um todo.',
      },
    },
    required: [
      'categoria_servico', 'duracao_estimada_min', 'urgencia',
      'janela_inicio', 'janela_fim', 'regiao', 'confianca',
    ],
    additionalProperties: false,
  };
}

/** Instrucao de sistema comum a qualquer provedor. */
export function instrucaoDeSistema(categorias, agoraIso) {
  return [
    'Você extrai dados estruturados de pedidos de agendamento de serviços locais, em português do Brasil.',
    'Você NÃO escolhe prestador, NÃO calcula preço e NÃO decide quais horários exibir: quem decide é o sistema.',
    'Sua única tarefa é transformar o texto do cliente em campos estruturados.',
    `Instante atual (UTC): ${agoraIso}. O fuso do usuário é America/Sao_Paulo (UTC-3).`,
    `Categorias válidas: ${categorias.map((c) => c.nome).join(', ')}.`,
    'Se o texto não permitir determinar um campo, devolva string vazia e reduza a confiança.',
    'Nunca invente uma categoria fora da lista.',
  ].join('\n');
}

/**
 * Valida e normaliza a saida bruta de um provedor.
 * @returns {{ok: true, dados: object} | {ok: false, motivo: string}}
 */
export function validarSaida(bruto, categorias) {
  if (!bruto || typeof bruto !== 'object') {
    return { ok: false, motivo: 'resposta não é um objeto' };
  }

  const nomes = new Set(categorias.map((c) => c.nome));
  const categoria = String(bruto.categoria_servico ?? '').trim();
  const urgencia = String(bruto.urgencia ?? '').toUpperCase();
  const confianca = Number(bruto.confianca);
  const duracao = Number(bruto.duracao_estimada_min);

  if (!URGENCIAS.includes(urgencia)) {
    return { ok: false, motivo: `urgência inválida: "${bruto.urgencia}"` };
  }
  if (!Number.isFinite(confianca) || confianca < 0 || confianca > 1) {
    return { ok: false, motivo: `confiança inválida: "${bruto.confianca}"` };
  }

  return {
    ok: true,
    dados: {
      // Categoria fora do catalogo NAO e erro de formato: e o caso RN-30,
      // que pede confirmacao ao cliente. Guardamos o texto sugerido.
      categoria_servico: nomes.has(categoria) ? categoria : null,
      categoria_sugerida: categoria || null,
      duracao_estimada_min: Number.isFinite(duracao) && duracao > 0 ? Math.round(duracao) : null,
      urgencia,
      janela_inicio: normalizarInstante(bruto.janela_inicio),
      janela_fim: normalizarInstante(bruto.janela_fim),
      regiao: String(bruto.regiao ?? '').trim() || null,
      confianca,
    },
  };
}

function normalizarInstante(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return null;
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}
