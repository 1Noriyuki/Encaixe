/**
 * T-COMISSAO-01..05
 * Cobre RN-14 (base de calculo), RN-15 (faixa) e INV-06 (bruto = comissao + liquido).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calcularComissao, assegurarPercentualValido, competenciaDe, geraComissao,
} from '../../src/dominio/comissao.js';
import { calcularPreco } from '../../src/dominio/precificacao.js';
import { ErroDeRegra } from '../../src/dominio/erros.js';

test('T-COMISSAO-01 | RN-14: comissao sai do valor final, nunca do preco-base', () => {
  const precoBase = 10000;
  const { precoVigente } = calcularPreco({
    precoBase,
    faixas: [{ antecedencia_min: 60, percentual_desconto: 30 }],
    antecedenciaMin: 30,
    tetoPct: 60,
  });
  assert.equal(precoVigente, 7000);

  const c = calcularComissao(precoVigente, 12);
  assert.equal(c.valorComissao, 840, '12% de 70,00 e 8,40 - nao 12,00 sobre o preco cheio');
  assert.notEqual(c.valorComissao, Math.round(precoBase * 0.12));
});

test('T-COMISSAO-02 | INV-06: bruto sempre fecha com comissao + liquido', () => {
  for (const bruto of [1, 99, 100, 3333, 7000, 12345, 999999]) {
    for (const pct of [8, 10, 12, 15]) {
      const c = calcularComissao(bruto, pct);
      assert.equal(
        c.valorComissao + c.valorLiquido, bruto,
        `falhou em bruto=${bruto} pct=${pct}`,
      );
      assert.ok(c.valorComissao >= 0 && c.valorLiquido >= 0);
    }
  }
});

test('T-COMISSAO-03 | RN-14: arredondamento meio para cima', () => {
  // 8,33 * 12% = 0,9996 -> 1,00
  assert.equal(calcularComissao(833, 12).valorComissao, 100);
  // 0,50 * 15% = 0,075 -> 0,08
  assert.equal(calcularComissao(50, 15).valorComissao, 8);
});

test('T-COMISSAO-04 | RN-15: percentual fora da faixa 8-15% e recusado', () => {
  assert.equal(assegurarPercentualValido(8), 8);
  assert.equal(assegurarPercentualValido(15), 15);

  for (const invalido of [7, 16, 0, -3, 12.5]) {
    assert.throws(
      () => assegurarPercentualValido(invalido),
      (e) => e instanceof ErroDeRegra && e.regra === 'RN-15',
      `deveria recusar ${invalido}`,
    );
  }
});

test('T-COMISSAO-05 | RN-16: so agendamento concluido gera comissao', () => {
  assert.equal(geraComissao('CONCLUIDO'), true);
  for (const estado of [
    'CONFIRMADO', 'CANCELADO_CLIENTE', 'CANCELADO_PRESTADOR',
    'NO_SHOW_CLIENTE', 'NO_SHOW_PRESTADOR', 'RECUSADO', 'EXPIRADO', 'ARQUIVADO',
  ]) {
    assert.equal(geraComissao(estado), false, `${estado} nao pode gerar comissao`);
  }
});

test('T-COMISSAO-06 | competencia contabil vem da data da conclusao', () => {
  assert.equal(competenciaDe('2026-08-21T17:30:00.000Z'), '2026-08');
});

test('valor bruto invalido e recusado antes de virar lancamento', () => {
  assert.throws(() => calcularComissao(0, 12), (e) => e.regra === 'RN-14');
  assert.throws(() => calcularComissao(-100, 12), (e) => e.regra === 'RN-14');
});
