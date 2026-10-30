# SPEC-022 — Abertura de disputa

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 seguem registradas para decisão posterior |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 22 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 · ADR-005 |

## 1. Identificação

- **ID:** SPEC-022
- **Nome:** Abertura de disputa
- **Objetivo:** uma parte abre disputa com motivo de lista fechada e ao menos uma evidência, dentro de P-15. A comissão fica `RETIDO` e os efeitos reversíveis de reputação ficam suspensos. A acusação mútua de no-show também leva a `EM_DISPUTA`.
- **Valor entregue:** canal formal de contestação, com efeito financeiro real.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-055, RF-071, RF-072, RF-073 | spec §7.6, §7.8 |
| RN | RN-17, RN-20 (acusação mútua), RN-26 | spec §6 |
| RNF | RNF-07 | spec §8 |
| Caso de uso | UC-11 (alternativo 1a), UC-12 (passos 1–4) | spec §10 |
| Entidades | `Disputa`, `Evidencia`, `Agendamento`, `LancamentoComissao` | spec §9.2 |
| Invariantes globais | INV-11, INV-12, INV-13 | spec §9.8 |
| ADRs | ADR-005 | `docs/adr/` |
| Dependências | SPEC-019, SPEC-020 | mapa §2 |

## 3. Escopo

### Incluído

1. Abrir disputa sobre agendamento `CONCLUIDO`, `NO_SHOW_CLIENTE` ou `NO_SHOW_PRESTADOR`, dentro de P-15 após o fim.
2. Exigir motivo da lista fechada e evidência (texto de 10+ caracteres ou link); a recusa diz tudo o que falta.
3. Uma disputa por agendamento; `estado_antes_disputa` guardado para a resolução.
4. Reter a comissão (`RETIDO`) e reverter os eventos de reputação do agendamento.
5. Acusação mútua: `EM_DISPUTA` sem penalidade, com a disputa aberta por quem acusou por último e o relato dele como evidência.
6. Avisar a outra parte.

### Fora do escopo

Fila, SLA e resolução (SPEC-023); anexar mais evidências depois (`adicionarEvidencia`, também SPEC-023).

## 4. Dependências

SPEC-019 (no-show), SPEC-020 (comissão), SPEC-006 (reversão no livro-razão), SPEC-004 (avisos).

## 5. Comportamento esperado

UC-12 passos 1–4: (1) a parte escolhe motivo e descreve a evidência; (2) o sistema valida motivo, evidência, estado, prazo e unicidade; (3) numa transação: cria a disputa `ABERTA` e a evidência, move o agendamento para `EM_DISPUTA`, retém a comissão, reverte a reputação, audita; (4) avisa a outra parte. UC-11 1a: o segundo reporte de no-show segue o mesmo caminho, sem penalidade automática.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Disputa sempre nasce com evidência, na mesma transação | contar evidências | INV-11 |
| INV-002 | Comissão de agendamento em disputa nunca está `EFETIVADO`, no domínio e no banco | efetivar por gravação direta | INV-12, RN-17 |
| INV-003 | Só estados contestáveis, dentro de P-15, uma vez | demais estados, prazo, segunda disputa | RN-26 |
| INV-004 | Recusa de abertura não grava nada | contar disputas | RF-072 |
| INV-005 | Abrir suspende os efeitos de reputação do agendamento | eventos não revertidos | RF-073 |

## 7. Modelo de domínio envolvido

`Disputa` (`ABERTA`, `motivo`, `aberta_por_id`, `prazo_sla_em`), `Evidencia` (`TEXTO` ou `URL`), `Agendamento` (`→ EM_DISPUTA`, `estado_antes_disputa`), `LancamentoComissao` (`EFETIVADO → RETIDO`).

## 8. Impacto arquitetural

`aplicacao/disputas.js` (`abrir`), `aplicacao/agendamentos.js` (`acusacaoMutua`), `aplicacao/comissao.js` (`transicionar`), `infra/db/schema.sql` (gatilhos `comissao_sem_efetivar_em_disputa_*`).

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Abrir disputa | parte; agendamento; motivo; relato?; evidência | disputa `ABERTA` | RN-26 (estado, prazo, duplicada, evidência ou motivo e evidência), validação do motivo, titularidade |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-07 | abertura e transição do agendamento auditadas | `T-AUDIT-05` (etapa 42) |

## 11. Critérios de aceitação

**CA-01** · Disputa sobre `CONCLUIDO`, `NO_SHOW_CLIENTE` ou `NO_SHOW_PRESTADOR` nasce `ABERTA` e leva o agendamento a `EM_DISPUTA`; outros estados são recusados.

**CA-02** · Sem motivo da lista ou sem evidência, a recusa diz o que falta, e nada é gravado.

**CA-03** · Fora de P-15, ou com disputa já existente, a abertura é recusada.

**CA-04** · A comissão fica `RETIDO`, os efeitos de reputação ficam suspensos e o banco recusa efetivá-la durante a disputa.

**CA-05** · Na acusação mútua, ninguém é penalizado e a disputa nasce com evidência.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-DISPUTA-01 \| RN-26: abrir disputa congela o agendamento e retem a comissao` | CA-01, CA-04 |
| `T-DISPUTA-02i \| RN-26: sem evidencia a abertura e recusada` | CA-02 |
| `T-DISPUTA-02b \| RN-26: fora do prazo de 48h a abertura e recusada` | CA-03 |
| `RN-26 \| nao se abre duas disputas sobre o mesmo agendamento` | CA-03 |
| `T-NOSHOW-04 \| RF-055: acusacao mutua nao penaliza ninguem e vai para disputa` | CA-05 |
| `T-DISPUTA-08 \| RF-071: abre disputa sobre CONCLUIDO e NO_SHOW_*, e so sobre eles` | CA-01, INV-003 |
| `T-DISPUTA-09 \| RF-072: sem motivo da lista ou sem evidencia, a recusa diz o que falta e nada e gravado` | CA-02, INV-004 |
| `T-DISPUTA-10 \| RF-073/INV-12: a comissao fica RETIDA e o banco nao a efetiva durante a disputa` | CA-04, INV-002, INV-005 |
| `T-DISPUTA-11 \| RF-055/INV-11: na acusacao mutua a disputa nasce com evidencia e ninguem e penalizado` | CA-05, INV-001 |

**Evidência (registro etapa 55, 2026-10-30).** Anteriores em `disputas.test.js` e `penalidades.test.js`; `08` a `11` em
`spec-022-abertura-disputa.test.js`; todos passam. **Divergências corrigidas:** (1) INV-12 só existia no domínio; os
gatilhos `comissao_sem_efetivar_em_disputa_insert/update` recusam efetivar comissão de agendamento em disputa;
(2) sem motivo e sem evidência, a recusa citava só o motivo; o RF-072 pede "o que falta".

## 13. Questões em aberto

- **OPEN-07:** quem abre a disputa da acusação mútua, com qual motivo e evidência. O código pratica: quem acusa por último, motivo `AUSENCIA_CONTESTADA`, relato dele como evidência. Proposta: ratificar isso.
- **OPEN-17:** quais efeitos de reputação são "reversíveis". O código reverte todos os eventos com origem no agendamento.
- **Evidência em arquivo:** a RN-26 admite arquivo; o MVP aceita texto ou link (não há upload, ADR-001).

## 14. Definition of Done

1. a equipe aprovar este rascunho e decidir OPEN-07 e OPEN-17;
2. CA-01 a CA-05 e INV-001 a INV-005 com evidência automatizada (feito, §12).
