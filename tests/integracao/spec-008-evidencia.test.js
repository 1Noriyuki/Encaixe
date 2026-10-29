/**
 * SPEC-008: evidência dos critérios de aceitação da régua e do simulador (CA-01 a CA-09).
 * Os IDs T-SPEC008-01 a 05 já identificam testes de leitura de números
 * (spec-008-validacao-regua.test.js); por isso os critérios usam T-SPEC008-CAnn.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as auditoria from '../../src/infra/auditoria.js';
import { contar } from '../../src/infra/db/conexao.js';
import { ErroDeAutorizacao, ErroDeRegra } from '../../src/dominio/erros.js';
import { PADROES } from '../../src/dominio/parametros.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

const TETO = PADROES.desconto_maximo_pct;
const faixa = (antecedencia_min, percentual_desconto) => ({ antecedencia_min, percentual_desconto });
const totalFaixas = () => contar('SELECT COUNT(*) AS total FROM faixa_desconto');
const totalReguas = () => contar('SELECT COUNT(*) AS total FROM regua_desconto');
const faixasDe = (reguaId) => catalogo.reguaPorId(reguaId).faixas
  .map((f) => [f.antecedencia_min, f.percentual_desconto]);

function recusada(c, faixas, regra = 'RN-02') {
  const antes = [totalReguas(), totalFaixas()];
  assert.throws(() => catalogo.salvarRegua({ prestadorId: c.prestador.id, nome: 'X', faixas }),
    (e) => e instanceof ErroDeRegra && e.regra === regra);
  assert.deepEqual([totalReguas(), totalFaixas()], antes);
}

test('T-SPEC008-CA01 | RF-018: criar régua com faixas válidas e titularidade do prestador', () => {
  const c = cenarioBasico();
  const r = catalogo.salvarRegua({
    prestadorId: c.prestador.id, nome: 'Fim de tarde', faixas: [faixa(60, 30), faixa(240, 10)],
  });
  assert.equal(r.prestador_id, c.prestador.id);
  assert.equal(r.nome, 'Fim de tarde');
  assert.deepEqual(faixasDe(r.id), [[60, 30], [240, 10]]);
  assert.ok(catalogo.reguasDoPrestador(c.prestador.id).some((x) => x.id === r.id));
});

test('T-SPEC008-CA02 | RF-018: não admitir ausência de faixas, antecedência zero, percentual negativo nem acima do teto', () => {
  const c = cenarioBasico();
  recusada(c, []);
  recusada(c, [faixa(0, 10)]);
  recusada(c, [faixa(60, -5)]);
  recusada(c, [faixa(60, TETO + 1)]);
  // O próprio teto é aceito: a fronteira é inclusiva.
  assert.ok(catalogo.salvarRegua({ prestadorId: c.prestador.id, nome: 'Teto', faixas: [faixa(60, TETO)] }).id);
});

test('T-SPEC008-CA03 | RF-018: não admitir antecedências duplicadas', () => {
  const c = cenarioBasico();
  recusada(c, [faixa(120, 20), faixa(120, 20)]);
  recusada(c, [faixa(120, 20), faixa(120, 10)]);
});

test('T-SPEC008-CA04 | RF-018: impedir desconto menor conforme o horário se aproxima', () => {
  const c = cenarioBasico();
  // A 60 min do horário o desconto (10%) seria menor que a 240 min (30%).
  recusada(c, [faixa(60, 10), faixa(240, 30)]);
  // Desconto igual nas duas faixas é permitido ("maior ou igual").
  assert.ok(catalogo.salvarRegua({
    prestadorId: c.prestador.id, nome: 'Plana', faixas: [faixa(60, 20), faixa(240, 20)],
  }).id);
});

test('T-SPEC008-CA05 | RF-018: atualização válida substitui faixas sem duplicidade e é auditada', () => {
  const c = cenarioBasico();
  const antes = totalFaixas();
  catalogo.salvarRegua({
    prestadorId: c.prestador.id, reguaId: c.regua.id, nome: 'Nova', faixas: [faixa(30, 40), faixa(90, 25), faixa(300, 5)],
  });
  assert.deepEqual(faixasDe(c.regua.id), [[30, 40], [90, 25], [300, 5]]);
  assert.equal(totalFaixas(), antes - 2 + 3);
  assert.equal(totalReguas(), 1);
  const log = auditoria.historicoDe('regua', c.regua.id).filter((l) => l.acao === 'REGUA_ATUALIZADA');
  assert.equal(log.length, 1);
  assert.equal(log[0].ator_id, c.prestador.id);
  assert.equal(log[0].detalhe.faixas.length, 3);
});

test('T-SPEC008-CA06 | RF-018: atualização inválida preserva todas as faixas anteriores', () => {
  const c = cenarioBasico();
  const antes = faixasDe(c.regua.id);
  const nome = catalogo.reguaPorId(c.regua.id).nome;
  for (const faixas of [[], [faixa(60, 10), faixa(240, 30)], [faixa(60, TETO + 5)], [{ antecedencia: '60', percentual: '' }]]) {
    assert.throws(() => catalogo.salvarRegua({ prestadorId: c.prestador.id, reguaId: c.regua.id, nome: 'Trocada', faixas }));
    assert.deepEqual(faixasDe(c.regua.id), antes);
    assert.equal(catalogo.reguaPorId(c.regua.id).nome, nome);
  }
  assert.equal(auditoria.historicoDe('regua', c.regua.id).filter((l) => l.acao === 'REGUA_ATUALIZADA').length, 0);
});

test('T-SPEC008-CA07 | RF-018: simulador retorna preço sem ultrapassar o desconto teto ou o piso do prestador', () => {
  cenarioBasico();
  // Base R$ 100, piso R$ 70: a faixa de 45% bate no piso; a de 10% fica acima dele.
  const linhas = catalogo.simularRegua({
    precoBase: '100,00', precoMinimo: '70,00', faixas: [faixa(30, 45), faixa(240, 10)],
  });
  const porAntecedencia = Object.fromEntries(linhas.map((l) => [l.antecedenciaMin, l]));
  assert.equal(porAntecedencia[241].precoVigente, 10000);
  assert.equal(porAntecedencia[240].precoVigente, 9000);
  assert.equal(porAntecedencia[30].precoVigente, 7000);
  assert.equal(porAntecedencia[30].pisoAtingido, true);
  for (const l of linhas) {
    assert.ok(l.precoVigente >= 7000, 'nunca abaixo do piso do prestador');
    assert.ok(l.precoVigente >= 10000 - (10000 * TETO) / 100, 'nunca além do teto da plataforma');
  }
  // Sem piso próprio, o teto é quem limita (RN-03).
  const semPiso = catalogo.simularRegua({ precoBase: '100,00', precoMinimo: '', faixas: [faixa(30, TETO)] });
  assert.equal(semPiso.at(-1).precoVigente, 10000 - TETO * 100);
});

test('T-SPEC008-CA08 | RF-018: simulação não altera contadores do banco', () => {
  cenarioBasico();
  const tabelas = ['regua_desconto', 'faixa_desconto', 'servico', 'horario_vago', 'log_auditoria'];
  const contagem = () => tabelas.map((t) => contar(`SELECT COUNT(*) AS total FROM ${t}`));
  const antes = contagem();
  catalogo.simularRegua({ precoBase: '100,00', precoMinimo: '50,00', faixas: [faixa(60, 30)] });
  assert.throws(() => catalogo.simularRegua({ precoBase: '100,00', precoMinimo: '', faixas: [] }));
  assert.deepEqual(contagem(), antes);
});

test('T-SPEC008-CA09 | RF-018: prestador a não altera régua de b', () => {
  const c = cenarioBasico();
  const outro = contas.cadastrar({
    nome: 'Outro Prestador', email: 'outro@prestador.dev', senha: 'senha1234', perfil: 'PRESTADOR',
  });
  const antes = faixasDe(c.regua.id);
  assert.throws(() => catalogo.salvarRegua({
    prestadorId: outro.id, reguaId: c.regua.id, nome: 'Invasão', faixas: [faixa(60, 50)],
  }), (e) => e instanceof ErroDeAutorizacao);
  assert.deepEqual(faixasDe(c.regua.id), antes);
  assert.equal(auditoria.historicoDe('regua', c.regua.id).filter((l) => l.ator_id === outro.id).length, 0);
});
