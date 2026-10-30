/**
 * RNF-06: o ID no nome do teste é o que liga a §12 de cada Spec ao teste que a prova.
 * Um ID repetido faz a evidência apontar para dois testes de assuntos diferentes, e
 * o `grep` acha o errado sem avisar. Aconteceu cinco vezes antes desta checagem
 * (registro, etapa 62).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const TESTES = join(dirname(fileURLToPath(import.meta.url)), '..');

function arquivosDeTeste(pasta) {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) return arquivosDeTeste(caminho);
    return item.name.endsWith('.test.js') ? [caminho] : [];
  });
}

test('T-CONVENCAO-01 | RNF-06: cada ID de teste nomeia um único teste', () => {
  const ondeAparece = new Map();
  for (const arquivo of arquivosDeTeste(TESTES)) {
    const codigo = readFileSync(arquivo, 'utf8');
    for (const m of codigo.matchAll(/\btest\(\s*['"`](T-[A-Za-z0-9-]+) \|/g)) {
      const lugares = ondeAparece.get(m[1]) ?? [];
      lugares.push(relative(TESTES, arquivo).replace(/\\/g, '/'));
      ondeAparece.set(m[1], lugares);
    }
  }

  const repetidos = [...ondeAparece].filter(([, lugares]) => lugares.length > 1)
    .map(([id, lugares]) => `${id}: ${lugares.join(', ')}`);
  assert.deepEqual(repetidos, []);
  assert.ok(ondeAparece.size > 300, 'a varredura precisa enxergar a suíte inteira');
});
