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

/**
 * @param {object}   [opcoes]
 * @param {Function} [opcoes.sdk] classe do cliente; os testes injetam um duble
 *   para conferir o pedido sem rede e sem o pacote instalado.
 */
export function criar({
  // `||`, nao `??`: variavel definida vazia vale como ausente, e nao como
  // modelo '' ou timeout de 0 ms.
  modelo = process.env.LLM_MODELO || MODELO_PADRAO,
  timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 15000),
  apiKey = process.env.ANTHROPIC_API_KEY,
  sdk = null,
} = {}) {
  let cliente = null;

  return {
    nome: `anthropic/${modelo}`,

    async interpretar({ texto, categorias, regioes, agoraIso }) {
      try {
        if (!cliente) {
          const Sdk = sdk ?? await carregarSdk();
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
          // RF-038: o SDK repete 2 vezes por padrao, e timeout conta como
          // repetivel - a espera chegaria a 3x LLM_TIMEOUT_MS. Sem repeticao,
          // o teto configurado e o teto real; a falha cai na RN-31.
          { timeout: timeoutMs, maxRetries: 0 },
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
