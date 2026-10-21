# Trilha A — Evidências de alinhamento da SPEC-001 v1.1.0 (2026-10-21)

> **Status:** alterações propostas em PR; não concluído, sem merge ou fechamento de issues. `npm test` depende do CI no Node 24 após abertura do PR.
> Responsável: gostislavs. Escopo: SPEC-001 #80 e T-07 #9.

## Base de decisão

Enzo aprovou, em 2026-10-20, as decisões A–E documentadas em [propostas-decisoes-trilha-a.md](propostas-decisoes-trilha-a.md), registro SDD etapa 22. Não são decisões novas desta entrega.

## Alterações implementadas nesta branch

| Ajuste aprovado | Arquivos | Evidência |
|---|---|---|
| P-07 com mínimo de 0,5 hora, decimal validado | `src/dominio/parametros.js` | `T-PARAM-07` |
| Máquina de horário sem `RASCUNHO`, sem `BLOQUEADO → CANCELADO`; máquina de conta sem `EM_REVISAO → RESTRITO` | `src/dominio/estados.js` | `T-ESTADO-01` e `T-ESTADO-02` |
| Novo prestador herda os P-01/P-02 globais vigentes **no instante do cadastro**; histórico dos perfis existentes preservado | `src/aplicacao/contas.js`, `src/infra/repositorios/usuarios.js` | `T-PARAM-05` |
| `RASCUNHO` eliminado do CHECK em bancos novos; gatilhos impedem inserir/atualizar para `RASCUNHO` nos bancos legados | `src/infra/db/schema.sql` | `T-ESTADO-03` |

Os testes estão em `tests/integracao/trilha-a-spec001-alinhamento.test.js`.

**Observação sobre bancos legados:** os gatilhos bloqueiam novas gravações de `RASCUNHO`. Caso um banco já contenha esse estado histórico, ele não é convertido silenciosamente. Exige uma migração explícita, com auditoria e política de conversão aprovada antes de rodar em produção.

## Pendências registradas, não antecipadas

1. **P-22 (deltas de reputação):** contrato de parametrização e armazenamento por evento sob revisão da SPEC-006 (#85). Não alterar constantes/regras antes de sua aprovação.
2. **Máquina de `LancamentoComissao`:** SPEC-001 §9.7.1 já define o grafo, mas aplicação e auditoria de transições precisam alinhar com SPEC-020/022/023 antes de modificar os fluxos financeiros.
3. **P-17:** prazo de conclusão automática atualmente é consultado em cada execução de `src/aplicacao/rotinas.js`; a decisão de congelar o parâmetro no nascimento da obrigação exige mudança de persistência e testes em SPEC-020.
4. **Cobertura integral:** CA-01–CA-11 e INV-001–INV-007 precisam de auditoria e execução de testes no Node 24; as evidências anteriores de PR #110 seguem válidas, mas não substituem a conferência final do conjunto.

## Critério para fechar issues

Não fechar #9 ou #80 sem testes verdes, revisão humana, reconciliação com todos os CA/INV e registro no SDD. Não alterar outras trilhas.
