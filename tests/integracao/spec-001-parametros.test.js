/**
 * SPEC-001 / T-07: regressao RN-00 e historico dos parametros globais.
 * CA-05 (escopo PRESTADOR) depende da decisao OPEN-103 e nao e marcado como pronto.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { prepararBanco, encerrar, viajarPara, T0 } from '../apoio/cenario.js';
import { abrir, fechar, migrar, um, varios, executar } from '../../src/infra/db/conexao.js';
import { PARAMETROS, normalizarParametro } from '../../src/dominio/parametros.js';
import { ErroDeRegra } from '../../src/dominio/erros.js';
import { carregarGlobais, lerGlobalEm, salvarGlobal, listarGlobais } from '../../src/infra/repositorios/parametros.js';

const CHAVE = 'antecedencia_min_publicacao_min'; // P-03
const T1 = '2026-09-10T14:00:00.000Z';
const T2 = '2026-09-10T15:00:00.000Z';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-PARAM-01 | RN-00: parametro sem registro devolve o padrao da spec', () => {
  assert.equal(lerGlobalEm(CHAVE, T0), 60);
  assert.equal(carregarGlobais()[CHAVE], 60);
  assert.equal(um('SELECT COUNT(*) AS total FROM parametro_historico').total, 0);
});

test('T-PARAM-02 | RN-00: alteracao dentro da faixa vale a partir de vigente_desde', () => {
  viajarPara(T1);
  assert.equal(salvarGlobal(CHAVE, 90, 22), 90);
  assert.equal(carregarGlobais()[CHAVE], 90);

  const atual = um('SELECT * FROM parametro WHERE chave = ?', CHAVE);
  const historico = um('SELECT * FROM parametro_historico WHERE chave = ?', CHAVE);
  assert.equal(atual.vigente_desde, T1);
  assert.equal(historico.vigente_desde, T1);
  assert.equal(historico.atualizado_por, 22);
  assert.equal(lerGlobalEm(CHAVE, T2), 90);
});

test('T-PARAM-03 | RN-00: valor fora da faixa e recusado com RN-00 e o ID do parametro', () => {
  for (const valor of [29, 241, '90abc', '90.5', '', null, Number.NaN, true]) {
    assert.throws(
      () => salvarGlobal(CHAVE, valor, null),
      (erro) => erro instanceof ErroDeRegra && erro.regra === 'RN-00'
        && erro.message.includes('P-03') && erro.message.includes('30 a 240'),
      String(valor),
    );
  }
  assert.equal(um('SELECT COUNT(*) AS total FROM parametro').total, 0);
  assert.equal(um('SELECT COUNT(*) AS total FROM parametro_historico').total, 0);
  assert.throws(
    () => normalizarParametro('politica_expiracao', 'DESCONHECIDA'),
    (erro) => erro.regra === 'RN-00' && erro.message.includes('P-02'),
  );
});

test('T-PARAM-03b | RN-00: limites dos parametros sao estritos', () => {
  for (const [chave, meta] of Object.entries(PARAMETROS)) {
    if (meta.opcoes) {
      for (const opcao of meta.opcoes) assert.equal(normalizarParametro(chave, opcao), opcao);
      continue;
    }
    assert.equal(normalizarParametro(chave, meta.min), meta.min, chave);
    assert.equal(normalizarParametro(chave, meta.max), meta.max, chave);
    const passo = meta.decimal ? 0.01 : 1;
    for (const valor of [meta.min - passo, meta.max + passo]) {
      assert.throws(
        () => normalizarParametro(chave, valor),
        (erro) => erro.regra === 'RN-00' && erro.message.includes(meta.id),
        `${meta.id}: ${valor}`,
      );
    }
  }
});

test('T-PARAM-04 | RN-00: alteracao nao retroage a leitura anterior', () => {
  viajarPara(T1);
  salvarGlobal(CHAVE, 90, null);
  viajarPara(T2);
  salvarGlobal(CHAVE, 120, null);

  assert.equal(lerGlobalEm(CHAVE, T0), 60);
  assert.equal(lerGlobalEm(CHAVE, T1), 90);
  assert.equal(lerGlobalEm(CHAVE, '2026-09-10T14:30:00.000Z'), 90);
  assert.equal(lerGlobalEm(CHAVE, T2), 120);
  assert.equal(carregarGlobais()[CHAVE], 120);

  const linhas = varios('SELECT valor FROM parametro_historico WHERE chave = ? ORDER BY id', CHAVE);
  assert.deepEqual(linhas.map((l) => l.valor), ['90', '120']);
  assert.equal(listarGlobais().filter((l) => l.chave === CHAVE).length, 2);
});

test('T-PARAM-06 | RNF-01: alteracao sobrevive a reabertura da base', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'encaixe-spec001-'));
  const caminho = join(pasta, 'teste.db');
  try {
    fechar();
    abrir(caminho);
    migrar();
    viajarPara(T1);
    salvarGlobal(CHAVE, 90, null);
    viajarPara(T2);
    salvarGlobal(CHAVE, 120, null);
    fechar();
    abrir(caminho);
    migrar();
    migrar(); // idempotencia: nenhum registro duplicado
    assert.equal(lerGlobalEm(CHAVE, T1), 90);
    assert.equal(lerGlobalEm(CHAVE, T2), 120);
    assert.equal(um('SELECT COUNT(*) AS total FROM parametro_historico WHERE chave = ?', CHAVE).total, 2);
  } finally {
    fechar();
    rmSync(pasta, { recursive: true, force: true });
  }
});

test('T-PARAM-07 | RN-00: migracao de snapshot legado preserva o ultimo valor conhecido', () => {
  viajarPara(T1);
  executar(
    `INSERT INTO parametro (chave, escopo, alvo_id, valor, vigente_desde)
      VALUES (?, 'GLOBAL', 0, '85', ?)`,
    CHAVE, T1,
  );
  migrar(); // backfill posterior, sem sobrescrever o legado
  assert.equal(lerGlobalEm(CHAVE, T1), 85);
  migrar();
  assert.equal(um('SELECT COUNT(*) AS total FROM parametro_historico WHERE chave = ?', CHAVE).total, 1);
});

test('T-PARAM-08 | RN-00: falha na gravacao do historico desfaz o snapshot', () => {
  executar(
    `CREATE TRIGGER falha_historico BEFORE INSERT ON parametro_historico
      BEGIN SELECT RAISE(FAIL, 'falha simulada no historico'); END`,
  );
  assert.throws(() => salvarGlobal(CHAVE, 90, null), /falha simulada/);
  assert.equal(carregarGlobais()[CHAVE], 60);
  assert.equal(um('SELECT COUNT(*) AS total FROM parametro').total, 0);
  assert.equal(um('SELECT COUNT(*) AS total FROM parametro_historico').total, 0);
});
