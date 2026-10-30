/** SPEC-008/RN-02: números da régua não podem ser truncados nem ignorados. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import { ErroDeValidacao, ErroDeRegra } from '../../src/dominio/erros.js';
import { contar } from '../../src/infra/db/conexao.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-SPEC008-01 | RF-018: somente linhas totalmente em branco sao ignoradas', () => {
  const c = cenarioBasico();
  const regua = catalogo.salvarRegua({
    prestadorId: c.prestador.id, nome: 'Regra',
    faixas: [{ antecedencia: '240', percentual: '20' }, { antecedencia: '  ', percentual: '' }],
  });
  assert.equal(regua.faixas.length, 1);
  assert.equal(regua.faixas[0].antecedencia_min, 240);
  assert.equal(regua.faixas[0].percentual_desconto, 20);
});

test('T-SPEC008-02 | RN-02: entradas com sufixos nao viram numeros validos', () => {
  const c = cenarioBasico();
  for (const faixa of [
    { antecedencia: '240abc', percentual: '20' },
    { antecedencia: 'abc', percentual: 'def' },
    { antecedencia: '240', percentual: '20,5' },
  ]) {
    assert.throws(() => catalogo.salvarRegua({
      prestadorId: c.prestador.id, nome: 'Invalida', faixas: [faixa],
    }), e => e instanceof ErroDeValidacao && e.campo === 'faixas');
  }
});

test('T-SPEC008-03 | RN-02: antecedencia ou percentual decimal nao sao truncados', () => {
  const c = cenarioBasico();
  for (const faixa of [
    { antecedencia: '240.5', percentual: '20' },
    { antecedencia: '240', percentual: '20.5' },
  ]) {
    assert.throws(() => catalogo.salvarRegua({
      prestadorId: c.prestador.id, nome: 'Decimal', faixas: [faixa],
    }), e => e instanceof ErroDeRegra && e.regra === 'RN-02');
  }
});

test('T-SPEC008-04 | RNF-01: regua invalida nao cria faixas nem modifica banco', () => {
  const c = cenarioBasico();
  const antes = contar('SELECT COUNT(*) AS total FROM regua_desconto');
  assert.throws(() => catalogo.salvarRegua({
    prestadorId: c.prestador.id, nome: 'Invalida',
    faixas: [
      { antecedencia: '240', percentual: '20' },
      { antecedencia: 'erro', percentual: 'erro' },
    ],
  }), e => e instanceof ErroDeValidacao);
  assert.equal(contar('SELECT COUNT(*) AS total FROM regua_desconto'), antes);
});

test('T-SPEC008-05 | RF-027: simulador rejeita texto truncavel', () => {
  assert.throws(() => catalogo.simularRegua({
    precoBase: '100,00', precoMinimo: '40,00',
    faixas: [{ antecedencia: '240abc', percentual: '20' }],
  }), e => e instanceof ErroDeValidacao && e.campo === 'faixas');
});
