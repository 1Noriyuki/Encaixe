#!/usr/bin/env node
/**
 * Apaga o banco e recria do zero, com dados de demonstracao.
 *   npm run db:reset
 */

import { rmSync, existsSync } from 'node:fs';
import { CAMINHO_PADRAO } from '../src/infra/db/conexao.js';

for (const sufixo of ['', '-wal', '-shm', '-journal']) {
  const arquivo = `${CAMINHO_PADRAO}${sufixo}`;
  if (existsSync(arquivo)) {
    rmSync(arquivo);
    console.log(`removido: ${arquivo}`);
  }
}

await import('./seed.js');
