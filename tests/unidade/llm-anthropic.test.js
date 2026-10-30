/**
 * T-61 - provedor Anthropic (ADR-003). O SDK e trocado por um duble: o teste
 * confere o pedido que sairia para a API e a degradacao segura (RN-31), sem
 * rede e sem o pacote instalado (ADR-001).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { criar, MODELO_PADRAO } from '../../src/infra/llm/anthropic.js';
import { esquemaDeSaida, STATUS } from '../../src/infra/llm/contrato.js';

const CATEGORIAS = [{ id: 1, nome: 'Cabelo e Barba' }, { id: 2, nome: 'Unhas' }];
const PEDIDO = {
  texto: 'corte de cabelo hoje a tarde em Pinheiros',
  categorias: CATEGORIAS,
  regioes: [{ bairro: 'Pinheiros', cidade: 'Sao Paulo' }],
  agoraIso: '2026-09-10T13:00:00.000Z',
};

const SAIDA_VALIDA = {
  categoria_servico: 'Cabelo e Barba',
  duracao_estimada_min: 45,
  urgencia: 'ALTA',
  janela_inicio: '2026-09-10T15:00:00.000Z',
  janela_fim: '2026-09-10T21:00:00.000Z',
  regiao: 'Pinheiros',
  confianca: 0.9,
};

/** Classe no formato do SDK que grava cada chamada e devolve `resposta`. */
function dubleDoSdk(resposta) {
  const chamadas = [];
  class Sdk {
    constructor(opcoes) { chamadas.push({ construtor: opcoes }); }

    messages = {
      create: async (corpo, opcoesDoPedido) => {
        chamadas.push({ corpo, opcoesDoPedido });
        if (resposta instanceof Error) throw resposta;
        return resposta;
      },
    };
  }
  return { Sdk, chamadas };
}

function respostaDeTexto(objeto) {
  return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(objeto) }] };
}

test('T-LLM-ANTHROPIC-01 | ADR-003: pedido usa claude-opus-5 e output_config.format com o JSON Schema', async () => {
  const { Sdk, chamadas } = dubleDoSdk(respostaDeTexto(SAIDA_VALIDA));
  const provedor = criar({ sdk: Sdk, apiKey: 'chave-de-teste', modelo: MODELO_PADRAO });

  const saida = await provedor.interpretar(PEDIDO);

  assert.equal(MODELO_PADRAO, 'claude-opus-5');
  const { corpo } = chamadas.find((c) => c.corpo);
  assert.equal(corpo.model, 'claude-opus-5');
  assert.deepEqual(corpo.output_config.format, { type: 'json_schema', schema: esquemaDeSaida(CATEGORIAS) });
  assert.equal(corpo.output_config.effort, 'low');
  // Sem prefill e sem parametro de amostragem, que a API atual recusa.
  assert.equal(corpo.messages.at(-1).role, 'user');
  for (const proibido of ['temperature', 'top_p', 'top_k', 'output_format']) {
    assert.equal(proibido in corpo, false, proibido);
  }
  assert.equal(saida.status, STATUS.SUCESSO);
  assert.equal(saida.categoria_servico, 'Cabelo e Barba');
  assert.equal(saida.modelo, 'anthropic/claude-opus-5');
});

test('T-LLM-ANTHROPIC-02 | RF-038/RNF-05: timeout configuravel e sem repeticao que multiplique a espera', async () => {
  const { Sdk, chamadas } = dubleDoSdk(respostaDeTexto(SAIDA_VALIDA));
  await criar({ sdk: Sdk, apiKey: 'x', timeoutMs: 4321 }).interpretar(PEDIDO);
  assert.deepEqual(chamadas.find((c) => c.corpo).opcoesDoPedido, { timeout: 4321, maxRetries: 0 });

  const anterior = { timeout: process.env.LLM_TIMEOUT_MS, modelo: process.env.LLM_MODELO };
  process.env.LLM_TIMEOUT_MS = '9000';
  process.env.LLM_MODELO = 'claude-modelo-configurado';
  try {
    const segundo = dubleDoSdk(respostaDeTexto(SAIDA_VALIDA));
    await criar({ sdk: segundo.Sdk, apiKey: 'x' }).interpretar(PEDIDO);
    const { corpo, opcoesDoPedido } = segundo.chamadas.find((c) => c.corpo);
    assert.equal(opcoesDoPedido.timeout, 9000);
    assert.equal(corpo.model, 'claude-modelo-configurado');

    // Variavel definida vazia vale como ausente.
    process.env.LLM_TIMEOUT_MS = '';
    process.env.LLM_MODELO = '';
    const terceiro = dubleDoSdk(respostaDeTexto(SAIDA_VALIDA));
    await criar({ sdk: terceiro.Sdk, apiKey: 'x' }).interpretar(PEDIDO);
    const vazio = terceiro.chamadas.find((c) => c.corpo);
    assert.equal(vazio.opcoesDoPedido.timeout, 15000);
    assert.equal(vazio.corpo.model, 'claude-opus-5');
  } finally {
    for (const [chave, valor] of [['LLM_TIMEOUT_MS', anterior.timeout], ['LLM_MODELO', anterior.modelo]]) {
      if (valor === undefined) delete process.env[chave]; else process.env[chave] = valor;
    }
  }
});

test('T-LLM-ANTHROPIC-03 | RN-31: timeout, recusa e saida fora do esquema viram FALHA, nunca excecao', async () => {
  const casos = [
    [new Error('Request timed out.'), /timed out/],
    [{ stop_reason: 'refusal', stop_details: { category: 'cyber' }, content: [] }, /recusa do modelo \(cyber\)/],
    [{ stop_reason: 'end_turn', content: [] }, /sem bloco de texto/],
    [{ stop_reason: 'end_turn', content: [{ type: 'text', text: '{quebrado' }] }, /JSON/],
    // Categoria fora do catalogo nao entra aqui: e o caso RN-30, que pede confirmacao.
    [respostaDeTexto({ ...SAIDA_VALIDA, confianca: 1.7 }), /confiança inválida/],
  ];

  for (const [resposta, motivo] of casos) {
    const { Sdk } = dubleDoSdk(resposta);
    const saida = await criar({ sdk: Sdk, apiKey: 'x', modelo: MODELO_PADRAO }).interpretar(PEDIDO);
    assert.equal(saida.status, STATUS.FALHA);
    assert.match(saida.motivo, motivo);
    assert.equal(saida.modelo, 'anthropic/claude-opus-5');
  }
});
