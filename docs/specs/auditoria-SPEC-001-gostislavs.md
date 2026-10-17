# Auditoria da SPEC-001 — gostislavs, Trilha A

**Data:** 2026-10-16  
**Issues:** #80 (SPEC-001), #9 (T-07), #70 (T-68)  
**Base:** `main`; alterações propostas apenas na branch `audit/gostislavs-spec-001-20261016`.

## Conferência e ações

| ID | Critérios da SPEC-001 | Evidência | Decisão / estado |
|---|---|---|---|
| D-001 | CA-02, CA-04, INV-002; RN-00 | `parametro` tinha PK sem vigência; `salvarGlobal` sobrescrevia valor anterior | **Corrigir código (proposto neste PR):** histórico `parametro_historico` append-only, leitura `lerGlobalEm`, snapshot atual compatível. |
| D-002 | CA-05 | `carregarGlobais` lê apenas `GLOBAL`, enquanto P-01/P-02 também existem em `perfil_prestador` | **Bloqueada — OPEN-103:** definir fonte e precedência por equipe antes de implementar escopo PRESTADOR. |
| D-003 | CA-03, INV-001; RN-00 | `parseInt('90abc')` aceitava entrada truncada; erro era `Error` sem regra | **Corrigir código (proposto neste PR):** tipo/intervalo estritos e `ErroDeRegra('RN-00')` com ID do parâmetro. |
| D-004 | CA-07, INV-004 | `estados.js` aceita transições extras comparado a §7.2 da SPEC-001 | **Bloqueada — OPEN-06/08/15:** decidir se corrige código ou altera baseline; não mudar máquina silenciosamente. |
| D-005 | CA-10, RNF-07 | `infra/auditoria.js` guarda correlação em variável global durante `await atender(...)` | **Pendente:** testar concorrência e corrigir com contexto por requisição; convenção do ator sistema em OPEN-104. |
| D-006 | §13, OPEN-20 | Catálogo existente diverge das faixas P-07, P-12, P-16 e RNF-13 | **Bloqueada — OPEN-20:** manter os números atuais até decisão humana. |

## Implementação proposta

- A tabela de snapshot `parametro` é preservada, evitando quebrar leituras atuais; uma nova tabela `parametro_historico` guarda versões.
- `salvarGlobal` atualiza o snapshot e grava a versão em **uma transação**; `lerGlobalEm` consulta a última versão vigente antes do instante informado, com fallback ao padrão.
- `migrar()` importa idempotentemente o último estado conhecido de bancos antigos. **Histórico anterior já sobrescrito não é recuperável.**
- `listarGlobais` passa a exibir alterações anteriores, não só o snapshot atual.
- `normalizarParametro` recusa entradas parciais, valores sem o tipo correto e faixas inválidas com identificação RN-00.
- Novos testes: `tests/integracao/spec-001-parametros.test.js` (T-PARAM-01/02/03/03b/04/06/07/08). Os demais testes da SPEC-001 ainda não foram implementados e não são declarados concluídos.

## Verificação e aprovação

- **Consulta estática** do repositório e das issues: realizada.
- **Smoke test isolado** com Node 22 + SQLite: criação de tabela, migração idempotente e leitura por vigência passaram. Isso **não é** execução da suíte do Encaixe.
- **`npm test` no Node 24:** **não executado** neste ambiente; obrigatório antes de tirar o PR do estado draft e antes do merge.
- **Revisão de outro integrante:** pendente.
- **Issues #9/#80/#70:** continuam abertas; nenhuma decisão OPEN foi aprovada implicitamente.

## Próxima ordem na Trilha A

1. Revisar os testes e executar `npm test` em Node 24; corrigir eventuais regressões.
2. Decidir OPEN-103/OPEN-20/OPEN-06/08/15/104 com a equipe; completar a SPEC-001.
3. Revisar SPEC-006 (reputação) e, depois, SPEC-007/008/009 pela ordem aprovada do mapa.
