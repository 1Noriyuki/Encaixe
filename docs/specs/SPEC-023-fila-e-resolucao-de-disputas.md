# SPEC-023 — Fila e resolução de disputas

| Campo | Valor |
|---|---|
| Versão | 0.1.0 |
| Data | 2026-10-30 |
| Status | **Rascunho, não aprovado.** Escrito pelo 2dart5 depois do código (OPEN-01), já com a conferência e a evidência da §12. Aguarda revisão e aprovação da equipe |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 23 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 · ADR-002, ADR-005 |

## 1. Identificação

- **ID:** SPEC-023
- **Nome:** Fila e resolução de disputas
- **Objetivo:** o admin vê a fila ordenada por SLA e valor, com as disputas fora do SLA destacadas, e resolve com `MANTIDO`, `REVERTIDO`, `PARCIAL` ou `ARQUIVADO` mais justificativa. O desfecho ajusta estado, reputação e comissão.
- **Valor entregue:** o critério de decisão fica consistente e as consequências fecham.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-074, RF-075, RF-076, RF-077 | spec §7.8 |
| RN | RN-17, RN-23 (disputa contra e reversão), RN-27 | spec §6 |
| RNF | RNF-07 | spec §8 |
| Caso de uso | UC-12 (passos 4–8, alternativos 6a e 6b, exceção 5a) | spec §10.13 |
| Entidades | `Disputa`, `Agendamento`, `EventoReputacao`, `LancamentoComissao` | spec §9.2 |
| Decisões | OPEN-06 (resolvida na spec v0.1.7: efeito de cada desfecho, inclusive na acusação mútua) | mapa §3 |
| Dependências | SPEC-022 | mapa §2 |

## 3. Escopo

### Incluído

1. Fila por `prazo_sla_em` crescente e, no empate, `valor_travado` decrescente; disputa vencida destacada na fila e contada no painel.
2. Contraparte anexa evidências até a resolução; admin assume (`EM_ANALISE`) e resolve.
3. Resolução com desfecho da lista e justificativa (15+ caracteres), definitiva.
4. Efeitos da RN-27 em estado, reputação e comissão, inclusive na acusação mútua.
5. Aviso às duas partes com desfecho e justificativa.

### Fora do escopo

Abertura (SPEC-022); extrato com `RETIDO` e `ESTORNADO` (SPEC-024); recurso da decisão (fora do MVP).

## 4. Dependências

SPEC-022, SPEC-006 (livro-razão), SPEC-020 (comissão), SPEC-018 (no-show do prestador revertido conta como ocorrência).

## 5. Comportamento esperado

UC-12 5–8: o admin abre a fila, assume a disputa, lê relatos e evidências e registra desfecho e justificativa; numa transação, o sistema aplica o desfecho (RN-27), audita a disputa, o agendamento e a comissão, e avisa as duas partes. 5a: disputa vencida é destacada, sem resolução automática.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Fila por SLA e, no empate, por valor | duas disputas no mesmo instante | RF-074 |
| INV-002 | Nenhuma resolução sem desfecho da lista e justificativa | desfecho inválido e texto curto | RF-076 |
| INV-003 | Uma disputa resolvida não muda mais | segunda resolução e nova evidência | RN-27 |
| INV-004 | A comissão volta a `EFETIVADO` só se o estado final for `CONCLUIDO` | cada desfecho | RN-27, RN-17 |
| INV-005 | Na acusação mútua, o desfecho original é a primeira acusação | MANTIDO após acusação mútua | RN-27 |

## 7. Modelo de domínio envolvido

`Disputa` (`ABERTA → EM_ANALISE → RESOLVIDA`, `desfecho`, `justificativa_admin`), `Agendamento` (`EM_DISPUTA → estado final`), `EventoReputacao` (`DISPUTA_CONTRA`, reaplicação), `LancamentoComissao` (`RETIDO → EFETIVADO | ESTORNADO`).

## 8. Impacto arquitetural

`aplicacao/disputas.js` (`fila`, `assumir`, `resolver`, `aplicarDesfecho`, `adicionarEvidencia`), `interface/http/rotas/admin.js` (fila, detalhe, formulário de resolução).

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Fila | apenas abertas? | disputas ordenadas, com `foraDoSla` | autorização (SPEC-003) |
| Anexar evidência | parte; disputa; texto | evidências | titularidade, RN-27 (resolvida), validação |
| Resolver | admin; disputa; desfecho; justificativa | disputa `RESOLVIDA` | validação do desfecho e da justificativa, RN-27 (já resolvida) |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-07 | resolução auditada na disputa e no agendamento, com o admin como ator | `T-AUDIT-05` |

## 11. Critérios de aceitação

**CA-01** · A fila ordena por SLA e valor e destaca as vencidas.

**CA-02** · Sem desfecho válido ou sem justificativa, nada muda; resolvida, a disputa não aceita nova resolução nem evidência.

**CA-03** · Cada desfecho aplica a RN-27: MANTIDO, REVERTIDO, PARCIAL e ARQUIVADO, com reputação e comissão correspondentes.

**CA-04** · Na acusação mútua, MANTIDO reaplica a primeira acusação e pune quem abriu.

**CA-05** · A contraparte anexa evidências até a resolução; terceiros não.

**CA-06** · Pela tela, o admin resolve, e as duas partes recebem o desfecho e a justificativa.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-DISPUTA-03..06 \| RN-27 MANTIDO, REVERTIDO, PARCIAL, ARQUIVADO` | CA-03, INV-004 |
| `T-DISPUTA-07 / 07b / 07c \| RF-074/RF-075` (T-53) | CA-01, INV-001 |
| `RF-074 \| a fila do admin ordena por SLA` | CA-01 |
| `T-DISPUTA-12 \| RF-076: resolver exige desfecho valido e justificativa, e a decisao e definitiva` | CA-02, INV-002, INV-003 |
| `T-DISPUTA-13 \| RN-27: na acusacao mutua, MANTIDO reaplica a primeira acusacao e pune quem abriu` | CA-04, INV-005 |
| `T-DISPUTA-14 \| UC-12 passo 4: a contraparte anexa evidencia; terceiro e disputa resolvida nao` | CA-05, INV-003 |
| `T-DISPUTA-15 \| RF-077: o admin resolve pela tela e as duas partes recebem desfecho e justificativa` | CA-06, CA-03 |

**Evidência (registro etapa 56, 2026-10-30).** `T-DISPUTA-03` a `06` em `disputas.test.js`, `07`/`07b` em `trilha-b`,
`07c` em `telas-admin`, `12` a `15` em `spec-023-resolucao-disputa.test.js`; todos passam. Conferência sem divergência
de código nesta Spec; a auditoria do agendamento na resolução foi corrigida na etapa 42 (T-67).

## 13. Questões em aberto

- **Assumir é opcional:** o código resolve disputa `ABERTA` sem passar por `EM_ANALISE`. A UC-12 descreve o passo, mas não o exige; confirmar.
- **Justificativa mínima:** 15 caracteres é validação do código, não da baseline.

## 14. Definition of Done

1. a equipe aprovar este rascunho;
2. CA-01 a CA-06 e INV-001 a INV-005 com evidência automatizada (feito, §12).
