/**
 * Provedor real de interpretacao: Claude via API da Anthropic. [ADR-003]
 *
 * Papel na arquitetura (RN-29): o modelo recebe texto livre e devolve um objeto
 * estruturado validado por JSON Schema. Ele nao escolhe prestador, nao calcula
 * preco e nao muda estado de agendamento - a decisao e sempre do sistema.
 *
 * O SDK oficial e uma dependencia OPCIONAL: o projeto roda inteiro com o
 * provedor simulado (ADR-001, zero dependencias). Quem quiser usar o provedor
 * real instala com `npm install @anthropic-ai/sdk` e define ANTHROPIC_API_KEY.
 */

import { esquemaDeSaida, instrucaoDeSistema, validarSaida, STATUS } from './contrato.js';

export const MODELO_PADRAO = 'claude-opus-5';

let Anthropic = null;

async function carregarSdk() {
  if (Anthropic) return Anthropic;
  try {
    ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
  } catch {
    throw new Error(
      'O provedor "anthropic" exige o SDK oficial. Rode `npm install @anthropic-ai/sdk` '
      + 'ou volte para LLM_PROVIDER=simulado.',
    );
  }
  return Anthropic;
}

export function criar({
  modelo = process.env.LLM_MODELO ?? MODELO_PADRAO,
  timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 15000),
  apiKey = process.env.ANTHROPIC_API_KEY,
} = {}) {
  let cliente = null;

  return {
    nome: `anthropic/${modelo}`,

    async interpretar({ texto, categorias, regioes, agoraIso }) {
      try {
        if (!cliente) {
          const Sdk = await carregarSdk();
          cliente = apiKey ? new Sdk({ apiKey }) : new Sdk();
        }

        const resposta = await cliente.messages.create(
          {
            model: modelo,
            max_tokens: 8000,
            system: instrucaoDeSistema(categorias, agoraIso),
            // effort baixo: extracao curta e objetiva, sem raciocinio longo.
            output_config: {
              effort: 'low',
              format: { type: 'json_schema', schema: esquemaDeSaida(categorias) },
            },
            messages: [{
              role: 'user',
              content: montarPedido(texto, regioes),
            }],
          },
          { timeout: timeoutMs },
        );

        // RN-31: uma recusa do modelo nao pode derrubar a busca.
        if (resposta.stop_reason === 'refusal') {
          return {
            status: STATUS.FALHA,
            modelo: `anthropic/${modelo}`,
            motivo: `recusa do modelo (${resposta.stop_details?.category ?? 'sem categoria'})`,
          };
        }

        const bloco = resposta.content.find((b) => b.type === 'text');
        if (!bloco) {
          return { status: STATUS.FALHA, modelo: `anthropic/${modelo}`, motivo: 'resposta sem bloco de texto' };
        }

        const validado = validarSaida(JSON.parse(bloco.text), categorias);
        if (!validado.ok) {
          return { status: STATUS.FALHA, modelo: `anthropic/${modelo}`, motivo: validado.motivo };
        }

        return { status: STATUS.SUCESSO, modelo: `anthropic/${modelo}`, ...validado.dados };
      } catch (erro) {
        // Timeout, rede, chave invalida, JSON quebrado: tudo cai aqui e vira
        // degradacao segura para o formulario de filtros (RN-31, RF-037).
        return {
          status: STATUS.FALHA,
          modelo: `anthropic/${modelo}`,
          motivo: erro?.message ?? String(erro),
        };
      }
    },
  };
}

function montarPedido(texto, regioes) {
  const listaRegioes = (regioes ?? []).map((r) => `${r.bairro} (${r.cidade})`).join('; ');
  return [
    'Pedido do cliente:',
    `"""${texto}"""`,
    '',
    listaRegioes ? `Regioes atendidas pela plataforma: ${listaRegioes}.` : '',
    'Extraia os campos estruturados. Se algo nao estiver no texto, devolva string vazia e baixe a confianca.',
  ].filter(Boolean).join('\n');
}
