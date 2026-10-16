/**
 * T-PRECO-01..05, T-REGUA-01..03
 * Cobre RN-01 (faixa aplicavel), RN-02 (regua valida) e RN-03 (piso).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calcularPreco, faixaAplicavel, validarRegua, pisoDePreco, proximoDegrau, projetarRegua,
} from '../../src/dominio/precificacao.js';
import { ErroDeRegra } from '../../src/dominio/erros.js';

// Regua do exemplo da spec: 4h antes = 20% off, 1h antes = 35% off.
const REGUA = [
  { antecedencia_min: 240, percentual_desconto: 20 },
  { antecedencia_min: 60, percentual_desconto: 35 },
];
const TETO = 60;

test('T-PRECO-01 | RN-01: fora de qualquer faixa o desconto e zero', () => {
  const r = calcularPreco({ precoBase: 8000, faixas: REGUA, antecedenciaMin: 300, tetoPct: TETO });
  assert.equal(r.percentualTabela, 0);
  assert.equal(r.precoVigente, 8000);
  assert.equal(r.economia, 0);
});

test('T-PRECO-02 | RN-01: dentro da primeira faixa aplica o desconto dela', () => {
  const r = calcularPreco({ precoBase: 8000, faixas: REGUA, antecedenciaMin: 180, tetoPct: TETO });
  assert.equal(r.percentualTabela, 20);
  assert.equal(r.precoVigente, 6400);
  assert.equal(r.economia, 1600);
});

test('T-PRECO-03 | RN-01: na borda exata da faixa, a faixa ja vale', () => {
  const r = calcularPreco({ precoBase: 8000, faixas: REGUA, antecedenciaMin: 240, tetoPct: TETO });
  assert.equal(r.percentualTabela, 20);
});

test('T-PRECO-04 | RN-01: mais perto do horario vence a faixa de menor antecedencia', () => {
  const r40 = calcularPreco({ precoBase: 8000, faixas: REGUA, antecedenciaMin: 40, tetoPct: TETO });
  assert.equal(r40.percentualTabela, 35, 'a 40 min do horario vale a faixa de 60 min');
  assert.equal(r40.precoVigente, 5200);

  const r60 = calcularPreco({ precoBase: 8000, faixas: REGUA, antecedenciaMin: 60, tetoPct: TETO });
  assert.equal(r60.percentualTabela, 35);
});

test('T-PRECO-04b | RN-01: o desconto nunca diminui conforme o horario se aproxima', () => {
  const antecedencias = [600, 300, 240, 120, 60, 30, 5];
  let anterior = -1;
  for (const ant of antecedencias) {
    const { percentualEfetivo } = calcularPreco({
      precoBase: 8000, faixas: REGUA, antecedenciaMin: ant, tetoPct: TETO,
    });
    assert.ok(
      percentualEfetivo >= anterior,
      `a ${ant} min o desconto (${percentualEfetivo}%) caiu em relacao ao anterior (${anterior}%)`,
    );
    anterior = percentualEfetivo;
  }
});

test('T-PRECO-05 | RN-03: o preco vigente nunca fura o piso do prestador', () => {
  const r = calcularPreco({
    precoBase: 8000, precoMinimo: 6000, faixas: REGUA, antecedenciaMin: 30, tetoPct: TETO,
  });
  assert.equal(r.precoVigente, 6000, 'a tabela pediria 5200, o piso segura em 6000');
  assert.equal(r.pisoAtingido, true);
  assert.equal(r.percentualTabela, 35);
  assert.equal(r.percentualEfetivo, 25, 'o desconto efetivo e menor que o de tabela');
});

test('T-PRECO-06 | RN-03: o teto global da plataforma tambem forma piso', () => {
  const regua = [{ antecedencia_min: 60, percentual_desconto: 60 }];
  const piso = pisoDePreco(10000, 0, 40);
  assert.equal(piso, 6000);

  const r = calcularPreco({
    precoBase: 10000, precoMinimo: 0, faixas: regua, antecedenciaMin: 10, tetoPct: 40,
  });
  assert.equal(r.precoVigente, 6000, 'teto de 40% limita o desconto de 60% da regua');
});

test('T-PRECO-07 | arredondamento meio para cima em centavos', () => {
  // 3333 centavos com 15% => 499,95 centavos => 500 de desconto => 2833
  const r = calcularPreco({
    precoBase: 3333, faixas: [{ antecedencia_min: 60, percentual_desconto: 15 }],
    antecedenciaMin: 10, tetoPct: TETO,
  });
  assert.equal(r.precoVigente, 2833);
  assert.equal(r.economia, 500);
});

test('T-REGUA-01 | RN-02: regua vazia e recusada', () => {
  assert.throws(() => validarRegua([], TETO), (e) => e instanceof ErroDeRegra && e.regra === 'RN-02');
});

test('T-REGUA-02 | RN-02: antecedencias repetidas sao recusadas', () => {
  const faixas = [
    { antecedencia_min: 60, percentual_desconto: 30 },
    { antecedencia_min: 60, percentual_desconto: 20 },
  ];
  assert.throws(() => validarRegua(faixas, TETO), /mais de uma faixa/i);
});

test('T-REGUA-03 | RN-02: regua nao monotonica e recusada', () => {
  // Esperar mais sairia mais barato: 4h antes daria 35%, 1h antes daria 20%.
  const faixas = [
    { antecedencia_min: 240, percentual_desconto: 35 },
    { antecedencia_min: 60, percentual_desconto: 20 },
  ];
  assert.throws(
    () => validarRegua(faixas, TETO),
    (e) => e instanceof ErroDeRegra && /não pode sair mais barato/i.test(e.message),
  );
});

test('T-REGUA-04 | RN-02: faixa acima do teto da plataforma e recusada', () => {
  const faixas = [{ antecedencia_min: 60, percentual_desconto: 70 }];
  assert.throws(() => validarRegua(faixas, 60), /teto da plataforma/i);
});

test('T-REGUA-05 | RN-02: regua valida volta ordenada por antecedencia', () => {
  const ordenada = validarRegua(REGUA, TETO);
  assert.deepEqual(ordenada.map((f) => f.antecedencia_min), [60, 240]);
});

test('faixaAplicavel devolve null quando nenhuma faixa cobre a antecedencia', () => {
  assert.equal(faixaAplicavel(REGUA, 1000), null);
});

test('RF-026: proximo degrau aponta a faixa que ainda vai entrar em vigor', () => {
  const d = proximoDegrau(REGUA, 180);
  assert.equal(d.percentual, 35);
  assert.equal(d.emMinutos, 120, 'de 180 min para 60 min faltam 120 min');

  assert.equal(proximoDegrau(REGUA, 30), null, 'na ultima faixa nao ha proximo degrau');
});

test('RF-027: simulacao da regua mostra o preco em cada faixa sem persistir', () => {
  const linhas = projetarRegua({ precoBase: 8000, precoMinimo: 0, faixas: REGUA, tetoPct: TETO });
  assert.equal(linhas.length, 3, 'preco cheio + duas faixas');
  assert.equal(linhas[0].precoVigente, 8000);
  assert.equal(linhas[1].precoVigente, 6400);
  assert.equal(linhas[2].precoVigente, 5200);
});
