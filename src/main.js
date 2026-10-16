#!/usr/bin/env node
/**
 * Ponto de entrada do Encaixe.
 *   npm start
 */

import { abrir, migrar, fechar, CAMINHO_PADRAO } from './infra/db/conexao.js';
import { criarAplicacao } from './interface/http/servidor.js';
import { iniciarAgendador } from './aplicacao/rotinas.js';
import { provedor } from './infra/llm/index.js';

const PORTA = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

abrir();
migrar();

const servidor = criarAplicacao();

const pararAgendador = iniciarAgendador({
  intervaloMs: Number(process.env.ROTINAS_INTERVALO_MS ?? 60_000),
  aoExecutar: (resumo) => {
    const total = Object.values(resumo).reduce((a, b) => a + b, 0);
    if (total > 0) console.log('[rotinas]', resumo);
  },
});

servidor.listen(PORTA, HOST, () => {
  console.log(`
  Encaixe rodando em http://${HOST}:${PORTA}

  banco            ${CAMINHO_PADRAO}
  provedor de LLM  ${provedor().nome}
  rotinas          a cada ${Number(process.env.ROTINAS_INTERVALO_MS ?? 60_000) / 1000}s

  Sem dados? Rode: npm run db:seed
`);
});

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    console.log('\nEncerrando...');
    pararAgendador();
    servidor.close(() => {
      fechar();
      process.exit(0);
    });
  });
}
