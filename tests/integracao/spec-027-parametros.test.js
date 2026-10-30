/**
 * SPEC-027 - administracao dos parametros do dominio (RN-00, RNF-10).
 * Os IDs seguem a §12 da Spec; T-PARAM-01 a 09 e T-PARAM-TELA-01/02 ja existiam.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as adminApp from '../../src/aplicacao/admin.js';
import { PARAMETROS } from '../../src/dominio/parametros.js';

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

/** Linhas da tabela §6.1 da spec: [id, escopo]. */
function parametrosDaSpec() {
  const spec = readFileSync(new URL('../../docs/spec.md', import.meta.url), 'utf8');
  return [...spec.matchAll(/^\| (P-\d+[ab]?) \|[^|]*\| ([^|]+?) \|/gm)].map(([, id, escopo]) => [id, escopo.trim()]);
}

async function telaComoAdmin() {
  const login = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'admin@teste.dev', senha: 'senha1234' }),
    redirect: 'manual',
  });
  const cookie = login.headers.getSetCookie()[0].split(';')[0];
  return (await fetch(`${base}/admin/parametros`, { headers: { Cookie: cookie } })).text();
}

test('T-PARAM-10 | RN-00: todo parametro global da §6.1 tem formulario na tela do admin', async () => {
  cenarioBasico();
  const tela = await telaComoAdmin();
  const daSpec = parametrosDaSpec();
  assert.ok(daSpec.length >= 22, `a tabela da §6.1 foi lida (${daSpec.length} linhas)`);

  for (const [id, escopo] of daSpec) {
    // P-11 tem dois valores na spec (normal / restrito), que o codigo chama de P-11a e P-11b.
    const ids = id === 'P-11' ? ['P-11a', 'P-11b'] : [id];
    for (const umId of ids) {
      const chaves = Object.entries(PARAMETROS).filter(([, meta]) => meta.id === umId).map(([chave]) => chave);
      assert.ok(chaves.length > 0, `${umId} existe no catalogo`);
      if (escopo === 'P') continue; // do perfil do prestador: aparece na tela como informacao, sem formulario
      // P-13 por categoria e editado no bloco de comissao; o valor padrao global tem formulario proprio.
      for (const chave of chaves) {
        assert.ok(tela.includes(`name="chave" value="${chave}"`), `${umId} (${chave}) tem formulario`);
      }
    }
  }
});

test('T-PARAM-11 | RN-00: o limite de interpretacoes e identificado como P-21, como na spec', async () => {
  const c = cenarioBasico();
  assert.equal(PARAMETROS.limite_interpretacoes_dia.id, 'P-21');
  assert.match(await telaComoAdmin(), /selo-regra">P-21</);
  assert.throws(
    () => adminApp.ajustarParametro({ adminId: c.adminId, chave: 'limite_interpretacoes_dia', valor: 201 }),
    (e) => e.regra === 'RN-00' && e.message.includes('P-21'),
  );
});
