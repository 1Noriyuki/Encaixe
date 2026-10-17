# Propostas de decisão — SPEC-001 e dependências da Trilha A

> **Status: RECOMENDAÇÕES, NÃO APROVAÇÕES.**  
> Responsável pela preparação: gostislavs (Trilha A), 2026-10-16.  
> Referências: `docs/specs/SPEC-001-fundacao.md` §13; `docs/specs/mapa-de-specs.md` §3; `docs/spec.md`, `docs/plan.md` e ADR-002.
> **Regra de governança:** somente a equipe pode aprovar alteração de baseline; `docs/spec.md` muda antes do código.

## Propostas prioritárias para desbloquear #80 (SPEC-001)

| Questão | Divergência e risco | Recomendação técnica à equipe | Antes de implementar |
|---|---|---|---|
| OPEN-103 — P-01/P-02 por prestador | Atualmente `perfil_prestador` contém os campos operacionais; `ParametroSistema` também anuncia escopo PRESTADOR. A SPEC-001 CA-05 exige fallback global, mas a API existente só consulta globais. | **Decidir uma única fonte.** Menor migração: manter o perfil como fonte operacional e formalizar sua precedência; parâmetros globais ficam como padrão, sem duas fontes concorrentes. Alternativa: centralizar na tabela de parâmetros versionada e migrar chamadas/perfis. | Aprovar modelo, ajustar SPEC-001 CA-05/OPEN-103 e `docs/spec.md`, escrever T-PARAM-05, só então mudar consultas. |
| OPEN-20 — faixas de parâmetros | P-07 na SPEC-001 tem limite 0,5–6 h, enquanto o catálogo usa 1–6 h; outras faixas citadas no documento também divergem. | Comparar item por item com a baseline; **preferir a baseline aprovada** quando não existir justificativa operacional documentada. Não alterar limites em lote. | Aprovação dos valores e testes de borda por parâmetro. |
| OPEN-06/08/15 — máquinas de estados | O domínio atual aceita algumas transições que a §7.2 não transcreve. Apagá-las diretamente pode interromper casos de uso. | Para cada transição extra, mapear caso de uso, precondição e auditoria; propor atualização explícita da baseline quando o fluxo for necessário e seguro. | Aprovação do grafo definitivo, depois T-ESTADO-01/02 contra a matriz aprovada. |
| OPEN-104 — ator sistema | A auditoria admite `ator_id = NULL` nas rotinas; em paralelo, a SPEC-001 exige ator identificável e correlação. | Formalizar `ator_id = NULL` como **ator de sistema**, com origem da rotina em `acao`/`detalhe`; gerar correlação própria por execução. Evita usuário artificial e FK inválida. | Registrar decisão em SPEC-001/ADR-002; testar logs de rotinas e correlação. |

## Propostas que podem influenciar Specs posteriores

| Questão | Recomendação | Área atingida |
|---|---|---|
| OPEN-05 — deltas de reputação | Tornar deltas/janelas parâmetros com versões quando forem configuráveis; preservar em cada evento o delta efetivamente aplicado. | SPEC-006, T-68 |
| OPEN-101 — definição de “fato ocorrido” | Fixar o parâmetro no momento do evento que cria a obrigação (reserva, conclusão, avaliação), e tratar exceções de consultas derivadas explicitamente. O valor travado da reserva já segue esse princípio. | SPEC-001, SPEC-020 |
| OPEN-102 — janela móvel P-20 | Diferenciar **imutabilidade de eventos passados** de **recalcular pontuação atual** a partir da janela vigente. A mudança pode alterar pontuações atuais sem reescrever eventos; aprovar essa exceção à leitura literal da RN-00. | SPEC-006 |
| OPEN-105 — estados da comissão | Se `RETIDO`/`ESTORNADO` forem transições de negócio, propor máquina explícita e auditoria antes da implementação, preservando a identidade contábil INV-06. | SPEC-020/022/023/024/026 |

## O que já pode ser implementado sem essas decisões

1. Histórico global por vigência e validação estrita RN-00 (PR #110), preservando dados de bancos existentes.
2. Correlação de auditoria separada por requisição, sem modificar o formato da auditoria nem as regras de estados.
3. Testes de rollback estado+auditoria, de correlação de uma reserva e de requisições intercaladas.
4. Testes de comportamento **já previsto na baseline** nas T-15/16/17, sem marcar Specs posteriores como aprovadas.

## Pedidos de aprovação para Enzo/equipe

- **A.** Fonte/precedência de P-01/P-02 (OPEN-103).
- **B.** Faixas corretas da baseline e exceções (OPEN-20).
- **C.** Relação definitiva de transições válidas (OPEN-06/08/15).
- **D.** Representação de rotinas na auditoria (OPEN-104).
- **E.** Semântica da temporalidade/reputação/comissão (OPEN-05, 101, 102, 105), antes das Specs afetadas.

**Nenhuma resposta foi inferida a partir de silêncio.** O PR continua em rascunho; revisão, CI verde e aprovação humana são passos distintos.
