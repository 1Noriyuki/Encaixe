/**
 * SPEC-028 - busca por linguagem natural, o que a tela faz com a interpretacao
 * (RF-035 a RF-037, RN-30 a RN-32). Os testes de aplicacao T-LLM-01 a 06 ja existiam.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import { definirProvedor, restaurarProvedor } from '../../src/infra/llm/index.js';
import { STATUS } from '../../src/infra/llm/contrato.js';
import { um } from '../../src/infra/db/conexao.js';

let servidor;
let base;

test.before(async () => {
  prepararBanco();
  servidor = criarAplicacao();
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

test.beforeEach(prepararBanco);
test.afterEach(restaurarProvedor);

test.after(() => {
  servidor?.close();
  encerrar();
});

function provedorFixo(saida) {
  return { nome: 'dublê/teste', async interpretar() { return { status: STATUS.SUCESSO, modelo: 'dublê/teste', ...saida }; } };
}

const LEITURA = {
  duracao_estimada_min: 30, urgencia: 'MEDIA', janela_inicio: '', janela_fim: '', regiao: '',
};

async function entrarCliente() {
  const r = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'cliente@teste.dev', senha: 'senha1234' }),
    redirect: 'manual',
  });
  return r.headers.getSetCookie()[0].split(';')[0];
}

const pagina = async (caminho, cookie) => (await fetch(`${base}${caminho}`, { headers: { Cookie: cookie } })).text();
const desfecho = () => um('SELECT desfecho FROM interpretacao_busca ORDER BY id DESC LIMIT 1').desfecho;

test('T-LLM-07 | RN-30/RF-035: confianca baixa mostra os filtros e nao executa a busca antes da confirmacao', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  definirProvedor(provedorFixo({ ...LEITURA, categoria_servico: c.categoria.nome, categoria_sugerida: c.categoria.nome, confianca: 0.35 }));
  const cookie = await entrarCliente();

  const tela = await pagina(`/buscar?descricao=${encodeURIComponent('sei la, alguma coisa')}`, cookie);
  assert.match(tela, /Confira os filtros antes de buscar/);
  assert.ok(!tela.includes(`/horarios/${c.horario.id}`), 'nenhum horario e listado antes da confirmacao');
  assert.match(tela, /name="interpretacao" value="\d+"/);
  assert.match(tela, /<input id="descricao" name="descricao" value=""/, 'o formulario nao reinterpreta o texto');

  const confirmar = tela.match(/href="(\/buscar\?[^"]*interpretacao=\d+[^"]*)"/)[1].replaceAll('&amp;', '&');
  const depois = await pagina(confirmar, cookie);
  assert.ok(depois.includes(`/horarios/${c.horario.id}`), 'confirmado, a busca roda com os filtros propostos');
  assert.equal(desfecho(), 'ACEITA');
});

test('T-LLM-08 | RN-30/RF-036: categoria fora do catalogo pede a escolha, sem buscar, e a escolha vira CORRIGIDA', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  definirProvedor(provedorFixo({ ...LEITURA, categoria_servico: null, categoria_sugerida: 'Adestramento de dragoes', confianca: 0.98 }));
  const cookie = await entrarCliente();

  const tela = await pagina(`/buscar?descricao=${encodeURIComponent('preciso adestrar meu dragao')}`, cookie);
  assert.match(tela, /não existe no catálogo/);
  assert.match(tela, /href="#categoriaId"/);
  assert.ok(!tela.includes('Buscar com estes filtros'));
  assert.ok(!tela.includes(`/horarios/${c.horario.id}`));

  const id = tela.match(/name="interpretacao" value="(\d+)"/)[1];
  const corrigida = await pagina(`/buscar?categoriaId=${c.categoria.id}&interpretacao=${id}`, cookie);
  assert.ok(corrigida.includes(`/horarios/${c.horario.id}`));
  assert.equal(desfecho(), 'CORRIGIDA');
});

test('T-LLM-09 | RN-32: so o dono registra o desfecho da propria interpretacao', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  definirProvedor(provedorFixo({ ...LEITURA, categoria_servico: c.categoria.nome, categoria_sugerida: c.categoria.nome, confianca: 0.35 }));
  const cookie = await entrarCliente();
  const tela = await pagina(`/buscar?descricao=${encodeURIComponent('qualquer coisa')}`, cookie);
  const id = tela.match(/name="interpretacao" value="(\d+)"/)[1];
  const antes = desfecho();

  await fetch(`${base}/buscar?categoriaId=${c.categoria.id}&interpretacao=${id}`); // anonimo
  assert.equal(desfecho(), antes, 'outra pessoa nao altera o desfecho');
});

test('T-LLM-10 | RN-31/RF-037: com o provedor fora do ar a tela avisa, oferece o formulario e a busca por filtros roda', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  definirProvedor({ nome: 'dublê/fora', async interpretar() { return { status: STATUS.FALHA, modelo: 'dublê/fora', motivo: 'timeout' }; } });

  const tela = await pagina(`/buscar?descricao=${encodeURIComponent('corte hoje')}&categoriaId=${c.categoria.id}`, '');
  assert.match(tela, /A interpretação automática não está disponível/);
  assert.match(tela, /RN-31/);
  assert.ok(tela.includes(`/horarios/${c.horario.id}`), 'a busca por filtros segue funcionando');
  assert.equal(um("SELECT COUNT(*) AS n FROM interpretacao_busca WHERE status = 'FALHA'").n, 1, 'a falha fica registrada');
});
