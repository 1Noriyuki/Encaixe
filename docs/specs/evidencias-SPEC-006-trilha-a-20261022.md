# SPEC-006 — Matriz de evidências e divergências verificadas

**Data:** 2026-10-22 · **Trilha:** A / gostislavs · **Status:** conferência técnica do código sobre o rascunho v0.1.0, **sem aprovação formal da Spec**.
**Base:** `docs/spec.md` v0.1.9, `SPEC-006-reputacao-livro-razao-classificacao-conta.md`, PRs #125 e #129 já incorporados. Complemento técnico no PR #136.

## Matriz CA → código → evidência

| CA | Critério | Local do código | Evidência em `tests/` | Resultado |
|---|---|---|---|---|
| CA-01 | Evento com titular, origem, delta e UTC | `aplicacao/reputacao.js::aplicarEvento`, `repositorios/social.js::registrarEvento` | `T-SPEC006-CA01` | Testado |
| CA-02 | Reputação limitada a 0–100 | `dominio/reputacao.js::limitar` | `T-REPUT-06` | Testado |
| CA-03 | Janela P-20, reversão e exclusão de eventos futuros | `dominio/reputacao.js::calcularReputacao` | `T-REPUT-04`, `T-REPUT-05`, `T-REPUT-11`, `T-SPEC006-CA03` | Testado; corrigida fronteira em segundos |
| CA-04 | P-08 do cadastro não retroage | `repositorios/usuarios.js::criar`, `aplicacao/reputacao.js::recalcular` | `T-CONTA-01l` | Testado |
| CA-05 | P-22 posterior não altera delta gravado | `dominio/parametros.js`, `repositorios/parametros.js`, `repositorios/social.js` | `T-P22-01`, `T-P22-02`, `T-P22-04` | Testado |
| CA-06 | RESTRITO exclusivo de cliente entre limiares | `dominio/reputacao.js::classificarPorReputacao` | `T-REVISAO-03`, `T-SPEC006-CA06` | Testado |
| CA-07 | EM_REVISAO com auditoria, aviso ao titular/admin | `aplicacao/reputacao.js::reclassificarConta` | `T-REPUT-07` e testes de auditoria da transição | Testado; alerta já implementado no #129 |
| CA-08 | Revisão e suspensão não reativam automaticamente | `aplicacao/reputacao.js::reclassificarConta` | `T-SPEC006-CA08`, testes da máquina de contas | Testado para EM_REVISAO; SUSPENSO coberto pela barreira de código |
| CA-09 | Reversão e recálculo sem efeitos parciais | `aplicacao/reputacao.js::aplicarEvento/recalcular/reverterEventosDoAgendamento` | `T-REPUT-09`, `T-SPEC006-CA09a`, `T-SPEC006-CA09b` | Testado; transações diretas acrescentadas |
| CA-10 | Alterar P-20 muda projeção, não ledger | `repositorios/parametros.js`, `aplicacao/reputacao.js::recalcular` | `T-SPEC006-CA10` | Testado |

**Escopo das evidências:** os nomes na terceira coluna são implementação existente; a quarta contém os testes reais. Um teste verde não substitui aprovação do texto ou resolução das questões de mérito da §13. O teste de SUSPENSO automático continua candidato à cobertura explícita adicional.

## Divergências encontradas e correções

1. **INV-08/RNF-01 — transação incompleta:** `aplicarEvento` já fazia transação (#129), mas `recalcular` e `reverterEventosDoAgendamento`, chamados diretamente, podiam deixar evento revertido sem nova projeção, ou cache recalculado sem transição/auditoria. **Correção do PR #136:** transações aninháveis e testes que injetam falhas de gravação.
2. **P-20 — limite de janela impreciso:** `minutosEntre` arredondava idade do evento para baixo e podia admitir um evento 1–59 segundos fora da janela; a filtragem em milissegundos agora inclui exatamente a fronteira e exclui instantes anteriores ou futuros. **Teste:** `T-SPEC006-CA03`.
3. **Documentação desatualizada pelo merge:** o rascunho SPEC-006 descreve a P-22 como fixa, e a notificação ao admin como não implementada. **Estado atual do código:** os PRs #125/#129 implementaram ambas. Atualizar a descrição factual quando a equipe promover a versão aprovada, sem apagar as questões abertas.

## Questões de mérito preservadas (§13 da SPEC-006)

- **P-22:** implementação atual usa 14 chaves no registro global de parâmetros com `id: 'P-22'`; a decisão de adotá-las como contrato definitivo ainda está pendente.
- **Admin RF-057:** a aplicação já escreve notificações na central de todos os admins. A decisão entre central, fila adicional ou ambos não foi formalizada.
- **Transação:** código passa a proteger aplicação do evento, recálculo e reversão; contrato de responsabilidade entre chamadores ainda pode ser explicitado.
- **P-20:** fronteira exata e bloqueio de eventos futuros têm testes; confirmar redação normativa ao aprovar.
- **Reincidência após reativação:** não criar bloqueio novo sem regra aprovada.
- **OPEN-03:** não inventar catálogo formal de drivers.

## Próximos critérios para encerrar #85

1. Aprovar a SPEC-006 e registrar decisões de mérito da §13.
2. Atualizar texto/contratos conforme essas decisões.
3. Conferir evidência de SUSPENSO e quaisquer outras lacunas dos RNF e INV locais.
4. Registrar resultado final do CI do PR #136 e a versão final da Spec no SDD.
5. Encerrar #85 apenas quando a Definition of Done estiver integralmente atendida.

**Resultado dos testes:** conferir GitHub Actions do PR #136. Este arquivo não declara merge nem conclusão de issue.
