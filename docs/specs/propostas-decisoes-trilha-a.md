# Propostas de decisão — SPEC-001 e dependências da Trilha A

> **Status: DECIDIDO em 2026-10-20 por Enzo** (registro, etapa 22). As recomendações abaixo foram aceitas e
> já estão na spec v0.1.7 e na SPEC-001 v1.1.0. A seção "Decisões" no fim deste arquivo tem as respostas.  
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

## Decisões (Enzo, 2026-10-20)

| Pedido | Decisão | Onde ficou |
|---|---|---|
| **A.** OPEN-103 | O perfil do prestador é a única fonte de P-01 e P-02; o catálogo global guarda o padrão e a faixa. P-13 passa a ser por categoria | spec §6.1 e §9.2; SPEC-001 §5.1, §7.1 e CA-05 |
| **B.** OPEN-20 | P-07 segue a spec (0,5 a 6 h). A spec adota a divisão do código em P-12a/P-12b e P-16a/P-16b. O limite do RNF-13 vira P-21 e fecha a QA-10 | spec §6.1, RN-20, RN-21, RF-052, RF-056 |
| **C.** OPEN-06/08/15 | Conta: suspensão a partir de `PENDENTE_APROVACAO`, `ATIVO` e `RESTRITO` (RN-28); `ATIVO → RESTRITO` só para cliente. Horário: `RASCUNHO` sai. Disputa: a RN-27 descreve o efeito de cada desfecho como o código já faz; na acusação mútua, o desfecho original é a primeira acusação | spec RN-27, §9.4, §9.5 e §9.6 |
| **D.** OPEN-104 | `ator_id` nulo identifica o sistema; a rotina é nomeada em `acao` e cada execução tem sua correlação | spec §9.2; SPEC-001 §5.4 e §7.3 |
| **E.** OPEN-05/101/102/105 | Deltas de reputação viram P-22 (cada evento já grava o delta). "Fato ocorrido" é o evento que cria a obrigação, e o valor vigente fica gravado. A P-20 é exceção declarada à RN-00. `LancamentoComissao` ganha máquina e auditoria | spec RN-00, RN-23, RN-17, §9.7.1 e RF-084 |

Uma diferença em relação à proposta original da C: `EM_REVISAO → RESTRITO` **não** entra na spec. O código
declara essa transição, mas nenhum caso de uso a dispara (a decisão do admin só leva a `ATIVO` ou
`SUSPENSO`), então ela sai do código.

## O que muda no código (Trilha A, gostislavs)

A spec v0.1.7 mudou primeiro, como manda o processo. Estas são as correções que o código precisa para
voltar a bater com ela. Cada uma ganha teste com o identificador da regra.

| # | Correção | Onde | Decisão |
|---|---|---|---|
| 1 | P-07 aceita 0,5 h (hoje o mínimo é 1 h e o valor é inteiro) | `dominio/parametros.js` | B |
| 2 | Remover `RASCUNHO` da máquina do horário e do `CHECK` de `horario_vago.estado` | `dominio/estados.js`, `schema.sql` | C |
| 3 | Remover `BLOQUEADO → CANCELADO` (horário) e `EM_REVISAO → RESTRITO` (conta): nenhum caso de uso as usa | `dominio/estados.js` | C |
| 4 | Perfil novo nasce com o padrão global de P-01 e P-02, não com o `DEFAULT` fixo do esquema | `aplicacao/contas.js`, `schema.sql` | A |
| 5 | Os deltas de reputação viram o parâmetro P-22, com a faixa da spec §6.1 | `dominio/reputacao.js`, `dominio/parametros.js` | E (OPEN-05) |
| 6 | Máquina do `LancamentoComissao` (spec §9.7.1) com `assegurarTransicao` e auditoria em toda transição | `dominio/estados.js`, `aplicacao/disputas.js`, `aplicacao/agendamentos.js` | E (OPEN-105) |
| 7 | Conferir se a conclusão automática grava o prazo de P-17 ou relê o valor atual a cada rotina | `aplicacao/rotinas.js` (SPEC-020) | E (OPEN-101) |
| 8 | T-PARAM-05 com o novo CA-05 da SPEC-001 v1.1.0 | `tests/` | A |

P-12a/b, P-16a/b e P-21 **não** mudam: a spec passou a descrever o que o código já faz. A rotina com
`ator_id` nulo (D) e a semântica dos desfechos de disputa (C, OPEN-06) também já estão corretas no código.
