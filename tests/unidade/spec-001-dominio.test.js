/**
 * SPEC-001 INV-006 / plan §2: o dominio nao conhece banco, rede nem relogio real.
 * E isso que deixa as regras temporais testaveis com relogio controlado; um
 * import de infra ou um `new Date()` numa regra quebraria a garantia em silencio.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOMINIO = join(dirname(fileURLToPath(import.meta.url)), '../../src/dominio');

// tempo.js e o relogio injetavel (definirRelogio): unica fonte de "agora", e
// por ele que os testes controlam o tempo. Nenhuma regra pode consulta-lo.
const RELOGIO = 'tempo.js';

const arquivos = readdirSync(DOMINIO).filter((nome) => nome.endsWith('.js'));

function semComentarios(codigo) {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function importsDe(codigo) {
  const estaticos = [...codigo.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const laterais = [...codigo.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  const dinamicos = [...codigo.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  return [...estaticos, ...laterais, ...dinamicos];
}

test('T-DOMINIO-01 | plan §2: modulos de dominio nao importam I/O nem relogio real', () => {
  assert.ok(arquivos.length > 0, 'src/dominio deve ter modulos');

  for (const nome of arquivos) {
    const codigo = semComentarios(readFileSync(join(DOMINIO, nome), 'utf8'));

    // So o proprio dominio: nada de infra, aplicacao, interface nem node:*.
    for (const alvo of importsDe(codigo)) {
      assert.match(alvo, /^\.\/[\w-]+\.js$/, `${nome} importa '${alvo}', fora do dominio`);
    }
    assert.doesNotMatch(codigo, /\brequire\s*\(/, `${nome} usa require`);
    assert.doesNotMatch(codigo, /\bprocess\./, `${nome} le process`);

    if (nome === RELOGIO) continue;

    // Converter um instante recebido (new Date(x)) e permitido; ler o agora, nao.
    assert.doesNotMatch(codigo, /new\s+Date\s*\(\s*\)/, `${nome} le o relogio com new Date()`);
    assert.doesNotMatch(codigo, /\bDate\.now\s*\(/, `${nome} le o relogio com Date.now()`);
    assert.doesNotMatch(codigo, /\bperformance\.now\s*\(/, `${nome} le o relogio com performance.now()`);
    for (const alvo of [...codigo.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]\.\/tempo\.js['"]/g)]) {
      const nomes = alvo[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]);
      for (const proibido of ['agora', 'agoraIso']) {
        assert.ok(!nomes.includes(proibido), `${nome} importa ${proibido}: o instante deve chegar como parametro`);
      }
    }
  }
});
