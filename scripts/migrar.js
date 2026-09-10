#!/usr/bin/env node
/**
 * Cria o esquema do banco. Idempotente: pode rodar quantas vezes quiser.
 *   npm run db:migrar
 */

import { abrir, migrar, fechar, CAMINHO_PADRAO } from '../src/infra/db/conexao.js';

abrir();
migrar();

const tabelas = (await import('../src/infra/db/conexao.js'))
  .varios("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");

console.log(`Banco: ${CAMINHO_PADRAO}`);
console.log(`Tabelas (${tabelas.length}): ${tabelas.map((t) => t.name).join(', ')}`);

fechar();
