/**
 * T-LLM-01..06
 * Cobre RN-29 (o modelo interpreta, o sistema decide), RN-30 (confianca),
 * RN-31 (degradacao segura), RN-32 (rastreabilidade) e INV-14.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, publicarDaquiA, agoraDoTeste } from '../apoio/cenario.js';
import * as busca from '../../src/aplicacao/busca.js';
import { definirProvedor, restaurarProvedor } from '../../src/infra/llm/index.js';
import { STATUS } from '../../src/infra/llm/contrato.js';
import * as interpretacoesRepo from '../../src/infra/repositorios/interpretacoes.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';
import * as parametrosRepo from '../../src/infra/repositorios/parametros.js';

test.beforeEach(prepararBanco);
test.afterEach(restaurarProvedor);
test.after(encerrar);

/** Dublê que devolve exatamente o que o teste mandar. */
function provedorFixo(saida) {
  return { nome: 'dublê/teste', async interpretar() { return saida; } };
}

test('T-LLM-01 | RN-29: a saida do modelo vira filtros e o sistema executa a busca', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });

  definirProvedor(provedorFixo({
    status: STATUS.SUCESSO,
    modelo: 'dublê/teste',
    categoria_servico: c.categoria.nome,
    categoria_sugerida: c.categoria.nome,
    duracao_estimada_min: 30,
    urgencia: 'ALTA',
    janela_inicio: agoraDoTeste(),
    janela_fim: adicionarHoras(agoraDoTeste(), 8),
    regiao: 'Pinheiros',
    confianca: 0.9,
  }));

  const leitura = await busca.interpretar({ clienteId: c.cliente.id, texto: 'corte hoje a tarde' });

  assert.equal(leitura.status, 'SUCESSO');
  assert.equal(leitura.precisaConfirmar, false);
  assert.equal(leitura.filtros.categoriaId, c.categoria.id);
  assert.equal(leitura.filtros.ordenar, 'proximidade', 'urgencia ALTA ordena por proximidade');

  const resultados = busca.buscarPorFiltros(leitura.filtros);
  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].id, c.horario.id);
});

test('T-LLM-05 | INV-14: a busca com os filtros do modelo e identica a busca manual', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 6);

  definirProvedor(provedorFixo({
    status: STATUS.SUCESSO, modelo: 'dublê/teste',
    categoria_servico: c.categoria.nome, categoria_sugerida: c.categoria.nome,
    duracao_estimada_min: 60, urgencia: 'BAIXA',
    janela_inicio: '', janela_fim: '', regiao: '', confianca: 0.95,
  }));

  const leitura = await busca.interpretar({ clienteId: c.cliente.id, texto: 'qualquer corte' });
  const viaIa = busca.buscarPorFiltros(leitura.filtros);
  const manual = busca.buscarPorFiltros({ categoriaId: c.categoria.id, ordenar: 'preco' });

  assert.deepEqual(viaIa.map((h) => h.id), manual.map((h) => h.id),
    'o modelo nao muda quais horarios aparecem, apenas preenche os filtros');
});

test('T-LLM-02 | RN-30: confianca abaixo do limiar exige confirmacao antes de buscar', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });

  definirProvedor(provedorFixo({
    status: STATUS.SUCESSO, modelo: 'dublê/teste',
    categoria_servico: c.categoria.nome, categoria_sugerida: c.categoria.nome,
    duracao_estimada_min: 30, urgencia: 'MEDIA',
    janela_inicio: '', janela_fim: '', regiao: '', confianca: 0.35,
  }));

  const leitura = await busca.interpretar({ clienteId: c.cliente.id, texto: 'sei la, alguma coisa' });

  assert.equal(leitura.status, 'BAIXA_CONFIANCA');
  assert.equal(leitura.precisaConfirmar, true);
  assert.match(leitura.motivo, /confian/i);
});

test('T-LLM-03 | RN-30: categoria fora do catalogo exige escolha do cliente', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });

  definirProvedor(provedorFixo({
    status: STATUS.SUCESSO, modelo: 'dublê/teste',
    categoria_servico: null, categoria_sugerida: 'Adestramento de dragoes',
    duracao_estimada_min: 60, urgencia: 'BAIXA',
    janela_inicio: '', janela_fim: '', regiao: '', confianca: 0.98,
  }));

  const leitura = await busca.interpretar({ clienteId: c.cliente.id, texto: 'preciso adestrar meu dragao' });

  assert.equal(leitura.precisaConfirmar, true);
  assert.equal(leitura.filtros.categoriaId, null);
  assert.match(leitura.motivo, /cat[áa]logo/i);
});

test('T-LLM-04 | RN-31: falha do provedor nao derruba a busca', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });

  definirProvedor({
    nome: 'dublê/quebrado',
    async interpretar() {
      return { status: STATUS.FALHA, modelo: 'dublê/quebrado', motivo: 'timeout de 15000ms' };
    },
  });

  const leitura = await busca.interpretar({ clienteId: c.cliente.id, texto: 'corte hoje' });

  assert.equal(leitura.status, 'FALHA');
  assert.equal(leitura.precisaFormulario, true);
  assert.equal(leitura.filtros, null);

  // O caminho deterministico continua intacto.
  const resultados = busca.buscarPorFiltros({ categoriaId: c.categoria.id });
  assert.equal(resultados.length, 1);
});

test('T-LLM-04b | RN-31: provedor que estoura excecao tambem nao derruba a busca', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });

  definirProvedor({
    nome: 'dublê/explosivo',
    async interpretar() { throw new Error('conexao recusada'); },
  });

  await assert.rejects(
    () => busca.interpretar({ clienteId: c.cliente.id, texto: 'corte hoje' }),
    /conexao recusada/,
    'a excecao sobe para a camada HTTP, que ja trata como aviso e mostra o formulario',
  );

  assert.equal(busca.buscarPorFiltros({ categoriaId: c.categoria.id }).length, 1);
});

test('T-LLM-06 | RN-32: toda interpretacao fica registrada com modelo, confianca e desfecho', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });

  definirProvedor(provedorFixo({
    status: STATUS.SUCESSO, modelo: 'dublê/teste',
    categoria_servico: c.categoria.nome, categoria_sugerida: c.categoria.nome,
    duracao_estimada_min: 30, urgencia: 'ALTA',
    janela_inicio: '', janela_fim: '', regiao: '', confianca: 0.88,
  }));

  const leitura = await busca.interpretar({ clienteId: c.cliente.id, texto: 'corte masculino hoje' });
  const registro = interpretacoesRepo.porId(leitura.id);

  assert.equal(registro.texto_original, 'corte masculino hoje');
  assert.equal(registro.modelo, 'dublê/teste');
  assert.equal(registro.confianca, 0.88);
  assert.equal(registro.status, 'SUCESSO');
  assert.equal(registro.desfecho, 'ACEITA');

  const stats = interpretacoesRepo.estatisticas();
  assert.equal(stats.total, 1);
  assert.equal(stats.sucesso, 1);
});

test('RNF-13 | o limite diario de interpretacoes protege o custo', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  parametrosRepo.salvarGlobal('limite_interpretacoes_dia', 2, c.adminId);

  definirProvedor(provedorFixo({
    status: STATUS.SUCESSO, modelo: 'dublê/teste',
    categoria_servico: c.categoria.nome, categoria_sugerida: c.categoria.nome,
    duracao_estimada_min: 30, urgencia: 'ALTA',
    janela_inicio: '', janela_fim: '', regiao: '', confianca: 0.9,
  }));

  await busca.interpretar({ clienteId: c.cliente.id, texto: 'um' });
  await busca.interpretar({ clienteId: c.cliente.id, texto: 'dois' });

  await assert.rejects(
    () => busca.interpretar({ clienteId: c.cliente.id, texto: 'tres' }),
    (e) => e.regra === 'RNF-13',
  );

  // A busca por filtros continua livre.
  assert.equal(busca.buscarPorFiltros({ categoriaId: c.categoria.id }).length, 1);
});

test('o provedor simulado padrao entende um pedido tipico em portugues', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  restaurarProvedor();

  const leitura = await busca.interpretar({
    clienteId: c.cliente.id,
    texto: 'preciso cortar cabelo hoje a tarde, corte masculino simples',
  });

  assert.equal(leitura.status, 'SUCESSO', 'sem chave de API, o provedor simulado assume');
  assert.equal(leitura.filtros.categoriaId, c.categoria.id, 'reconheceu "cabelo" na categoria');
  assert.equal(leitura.interpretacao.urgencia, 'ALTA', '"hoje a tarde" e urgencia alta');
});
