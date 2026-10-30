/**
 * SPEC-013 - busca de horarios por filtros (RF-028 a RF-031, UC-03, RNF-05).
 * Os IDs seguem a §12 da Spec; os testes de filtro e ordenacao ja existentes
 * (T-BUSCA-02 a 04b) estao listados la.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, agoraDoTeste, publicarDaquiA } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as busca from '../../src/aplicacao/busca.js';
import * as horariosRepo from '../../src/infra/repositorios/horarios.js';
import { adicionarHoras, adicionarMinutos } from '../../src/dominio/tempo.js';

let servidor;
let base;

test.before(async () => {
  prepararBanco();
  servidor = criarAplicacao();
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

test.beforeEach(prepararBanco);

test.after(() => {
  servidor?.close();
  encerrar();
});

const ids = (lista) => lista.map(({ id }) => id);

test('T-BUSCA-05 | UC-03 1a: sem janela informada, a busca olha as proximas 24 h', () => {
  const c = cenarioBasico({ horasAteHorario: 23 });
  const depois = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 25);

  assert.equal(busca.JANELA_PADRAO_H, 24);
  assert.deepEqual(ids(busca.buscarPorFiltros()), [c.horario.id]);
  assert.deepEqual(ids(busca.buscarPorFiltros({ janelaHoras: 48 })), [c.horario.id, depois.id]);
  assert.deepEqual(ids(busca.buscarPorFiltros({ janelaHoras: 7 })), [c.horario.id], 'janela fora da lista vale o padrao');
  assert.deepEqual(ids(busca.buscarPorFiltros({ janelaHoras: 6 })), [], 'em 6 h o horario de daqui a 23 h nao aparece');
});

test('T-BUSCA-06 | RF-028: o formulario oferece a janela e a busca respeita a escolhida', async () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  const longe = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 30);

  const padrao = await (await fetch(`${base}/buscar`)).text();
  assert.match(padrao, /<select id="janela" name="janela">/);
  assert.match(padrao, /<option value="">Próximas 24 h<\/option>/);
  assert.ok(padrao.includes(`/horarios/${c.horario.id}`) && !padrao.includes(`/horarios/${longe.id}"`));

  const dois = await (await fetch(`${base}/buscar?janela=48`)).text();
  assert.match(dois, /<option value="48" selected>Próximas 48 h<\/option>/);
  assert.ok(dois.includes(`/horarios/${longe.id}`));
  assert.match(dois, /próximas 48 h/, 'a janela escolhida aparece entre os filtros ativos');

  const curta = await (await fetch(`${base}/buscar?janela=6&categoriaId=${c.categoria.id}`)).text();
  assert.ok(curta.includes(`/horarios/${c.horario.id}`));

  const invalida = await (await fetch(`${base}/buscar?janela=9999`)).text();
  assert.ok(invalida.includes(`/horarios/${c.horario.id}`) && !invalida.includes(`/horarios/${longe.id}"`),
    'janela fora da lista vale o padrao');
});

test('T-BUSCA-07 | UC-03 2a: sem resultado, a tela diz a janela consultada e oferece saida', async () => {
  cenarioBasico({ horasAteHorario: 30 });
  const vazia = await (await fetch(`${base}/buscar`)).text();
  assert.match(vazia, /nas próximas 24 horas/);
  const seis = await (await fetch(`${base}/buscar?janela=6`)).text();
  assert.match(seis, /nas próximas 6 horas/);
  assert.match(seis, /Ver todos os horários abertos/);
});

test('T-BUSCA-08 | RNF-05: a busca responde em ate 2 s com volume acima do esperado no MVP', async () => {
  const c = cenarioBasico({ horasAteHorario: 2, duracaoMin: 30 });
  // 130 horarios de 30 min ao longo de 68 h, gravados direto para o teste nao medir a publicacao.
  const inicio = adicionarHoras(agoraDoTeste(), 3);
  for (let i = 0; i < 130; i += 1) {
    horariosRepo.criar({
      prestador_id: c.prestador.id, servico_id: c.servico.id, regua_id: c.regua.id,
      inicio: adicionarMinutos(inicio, i * 30), duracao_min: 30,
      preco_base_snapshot: 10000, preco_minimo_snapshot: 4000, estado: 'PUBLICADO', criado_em: agoraDoTeste(),
    });
  }

  for (const ordenar of Object.keys(busca.ORDENACOES)) {
    const antes = performance.now();
    const r = await fetch(`${base}/buscar?janela=72&ordenar=${ordenar}`);
    await r.text();
    const ms = performance.now() - antes;
    assert.equal(r.status, 200);
    assert.ok(ms < 2000, `${ordenar}: ${Math.round(ms)} ms`);
  }
  assert.equal(busca.buscarPorFiltros({ janelaHoras: 72 }).length, 131);
});
