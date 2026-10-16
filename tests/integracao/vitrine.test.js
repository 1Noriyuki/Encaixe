/**
 * A vitrine que o cliente ve antes de decidir: a pagina de um horario.
 * Cobre RF-024 a RF-026 (preco vigente, base, percentual e proximo degrau),
 * RF-027 (projecao da regua) e RN-07 (horario que saiu da janela de reserva).
 *
 * A projecao exibida vem da aplicacao, nao da interface: e o que garante que
 * a tela e o motor de preco nunca contem historias diferentes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  prepararBanco, encerrar, cenarioBasico, avancarHoras,
} from '../apoio/cenario.js';
import * as horariosApp from '../../src/aplicacao/horarios.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';

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

function pegar(caminho) {
  return fetch(`${base}${caminho}`, { redirect: 'manual' });
}

// ------------------------------------------------------------- aplicacao

test('T-PRECO-06 | RF-027: o detalhe do horario traz a regua projetada, do preco cheio ao menor', () => {
  // Regua padrao do cenario: 240 min -> 20%, 60 min -> 35%, sobre R$ 100,00.
  const c = cenarioBasico({ horasAteHorario: 10 });
  const detalhe = horariosApp.detalhe(c.horario.id);

  assert.equal(detalhe.regua.length, 3, 'preco cheio + duas faixas');
  assert.deepEqual(
    detalhe.regua.map((l) => l.precoVigente),
    [10000, 8000, 6500],
    'a projecao desce do preco cheio ate a faixa mais proxima do horario',
  );

  const descontos = detalhe.regua.map((l) => l.percentualEfetivo);
  assert.deepEqual(descontos, [0, 20, 35]);
});

test('T-PRECO-07 | RN-04: a projecao usa os snapshots do horario, nao o servico editado depois', async () => {
  const c = cenarioBasico({ horasAteHorario: 10, precoBase: '100,00' });
  const catalogo = await import('../../src/aplicacao/catalogo.js');

  catalogo.salvarServico({
    prestadorId: c.prestador.id,
    servicoId: c.servico.id,
    nome: 'Corte',
    categoriaId: c.categoria.id,
    duracaoMin: 60,
    precoBase: '300,00',
    precoMinimo: '40,00',
  });

  const detalhe = horariosApp.detalhe(c.horario.id);
  assert.equal(detalhe.regua[0].precoVigente, 10000,
    'o horario ja publicado continua valendo o preco-base do momento da publicacao');
});

test('RF-026: a antecedencia atual e o proximo degrau acompanham o detalhe', () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  const detalhe = horariosApp.detalhe(c.horario.id);

  assert.equal(detalhe.preco.percentualEfetivo, 0, 'a 5 h do horario nenhuma faixa cobre ainda');
  assert.equal(detalhe.preco.proximoDegrau.percentual, 20);
  assert.equal(detalhe.preco.proximoDegrau.emMinutos, 60, 'de 300 min para a faixa de 240 min');
});

// ------------------------------------------------------------------ HTTP

test('RF-026: a pagina do horario mostra preco vigente, base riscado e o proximo degrau', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const resposta = await pegar(`/horarios/${c.horario.id}`);
  assert.equal(resposta.status, 200);

  const corpo = await resposta.text();
  assert.match(corpo, /R\$&nbsp;80,00|R\$\s80,00/, 'o preco vigente com 20% de desconto');
  assert.match(corpo, /preco-base/, 'o preco cheio aparece riscado');
  assert.match(corpo, /Cai para −35%/, 'o proximo degrau e anunciado');
  assert.match(corpo, /A régua deste horário/, 'a projecao completa acompanha a pagina');
});

test('RN-10: a pagina do horario explica a politica de confirmacao que vai valer', async () => {
  const liberar = cenarioBasico({ horasAteHorario: 3, politicaExpiracao: 'LIBERAR' });
  const corpoLiberar = await (await pegar(`/horarios/${liberar.horario.id}`)).text();
  assert.match(corpoLiberar, /Liberação do horário/);
  assert.match(corpoLiberar, /a reserva expira/);

  prepararBanco();
  const auto = cenarioBasico({ horasAteHorario: 3, politicaExpiracao: 'AUTOCONFIRMAR' });
  const corpoAuto = await (await pegar(`/horarios/${auto.horario.id}`)).text();
  assert.match(corpoAuto, /Confirmação automática/);
});

test('RN-07: horario sem antecedencia minima nao oferece reserva na propria pagina', async () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  avancarHoras(4.9); // restam ~6 min, abaixo dos 30 min de P-04.

  const corpo = await (await pegar(`/horarios/${c.horario.id}`)).text();
  assert.match(corpo, /não está mais disponível para reserva/);
  assert.doesNotMatch(corpo, /Reservar por/, 'nao pode sobrar botao de reserva');
});

test('RN-29: a busca por texto livre nao decide nada - os filtros ficam visiveis e editaveis', async () => {
  cenarioBasico({ horasAteHorario: 3 });
  const corpo = await (await pegar('/buscar?descricao=cortar+o+cabelo+hoje')).text();

  assert.match(corpo, /O que o sistema entendeu/);
  assert.match(corpo, /Buscar sem a interpretação/, 'da para descartar a interpretacao');
  assert.match(corpo, /INV-14/, 'a fronteira entre modelo e sistema aparece na tela');
});

test('RF-029: busca sem resultado oferece saida, em vez de encerrar a jornada', async () => {
  cenarioBasico({ horasAteHorario: 3 });
  const corpo = await (await pegar('/buscar?categoriaId=999')).text();

  assert.match(corpo, /Nenhum encaixe por enquanto/);
  assert.match(corpo, /Ver todos os horários abertos/, 'o estado vazio precisa de proximo passo');
});
