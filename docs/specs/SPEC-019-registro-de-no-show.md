# SPEC-019 — Registro de no-show

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 seguem registradas para decisão posterior |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 19 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 |

## 1. Identificação

- **ID:** SPEC-019
- **Nome:** Registro de no-show
- **Objetivo:** dentro da janela P-16a–P-16b, uma parte reporta a ausência da outra em agendamento `CONFIRMADO`. A parte ausente é penalizada, não há comissão e a contestação fica aberta até P-15.
- **Valor entregue:** dá consequência à ausência, a maior quebra de confiança do marketplace.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-052, RF-053, RF-054 | spec §7.6 |
| RN | RN-16 (sem comissão), RN-20, RN-21 (ocorrência do prestador), RN-23 (P-22) | spec §6 |
| RNF | RNF-08 | spec §8 |
| Caso de uso | UC-11 (sem o alternativo 1a, que fica na SPEC-022, OPEN-07) | spec §10.12 |
| Entidades | `Agendamento`, `EventoReputacao` | spec §9.2 |
| Parâmetros | P-15, P-16a, P-16b, P-22 (delta de no-show) | spec §6.1 |
| Dependências | SPEC-015, SPEC-018 | mapa §2 |

## 3. Escopo

### Incluído

1. Validar estado (`CONFIRMADO`) e janela (de início + P-16a até fim + P-16b); toda recusa informa a janela.
2. Prestador reporta: `NO_SHOW_CLIENTE`. Cliente reporta: `NO_SHOW_PRESTADOR`, mais ocorrência da RN-21.
3. Aplicar o delta de no-show da P-22 à parte ausente; encerrar o horário; não criar lançamento de comissão.
4. Avisar o acusado com o prazo P-15 para contestar.

### Fora do escopo

Acusação mútua (RF-055) e abertura da disputa (SPEC-022); conclusão automática (SPEC-020).

## 4. Dependências

SPEC-015 (confirmado), SPEC-018 (ocorrências), SPEC-006 (livro-razão), SPEC-004 (avisos).

## 5. Comportamento esperado

UC-11: (1) reporte; (2) validação de janela e estado; (3) estado de no-show; (4) penalidade do ausente; (5) nenhuma comissão; (6) aviso ao acusado com o prazo P-15; (7) ocorrência se o ausente for o prestador. Exceção: fora da janela ou fora de `CONFIRMADO`, recusa com RN-20 e a janela válida.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Só há no-show de agendamento `CONFIRMADO`, dentro da janela, com as bordas exatas | antes, no limite, depois | RF-052 |
| INV-002 | No-show nunca gera lançamento de comissão | contar lançamentos | RN-16 |
| INV-003 | O delta aplicado é o P-22 vigente | alterar P-22 | RN-23, RN-00 |
| INV-004 | Ausência do prestador conta na RN-21; a do cliente não | contagem de ocorrências | RF-054, RN-21 |
| INV-005 | O acusado pode contestar até P-15 e não depois | abrir disputa nos dois lados do prazo | RF-053 |

## 7. Modelo de domínio envolvido

`Agendamento` (`CONFIRMADO → NO_SHOW_CLIENTE | NO_SHOW_PRESTADOR`), `HorarioVago` (`OCUPADO → ENCERRADO`), `EventoReputacao` (`NO_SHOW`).

## 8. Impacto arquitetural

`dominio/prazos.js` (`janelaNoShow`, `assegurarJanelaNoShow`, `prazoDisputa`), `aplicacao/agendamentos.js` (`registrarNoShow`).

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Registrar no-show | parte; agendamento; relato? | estado de no-show, ausente e prazo | RN-20 (estado ou janela, sempre com a janela), titularidade |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-08 | janela e prazos em UTC com relógio injetável | bordas com relógio controlado |

## 11. Critérios de aceitação

**CA-01** · Reporte antes de P-16a, depois de P-16b ou sobre agendamento não confirmado é recusado informando a janela; exatamente em P-16a é aceito.

**CA-02** · Prestador reporta: `NO_SHOW_CLIENTE`, delta P-22 ao cliente, sem comissão, cliente avisado com o prazo de contestação.

**CA-03** · Cliente reporta: `NO_SHOW_PRESTADOR`, delta ao prestador e ocorrência da RN-21.

**CA-04** · A contestação é aceita até P-15 e recusada depois.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-NOSHOW-01i \| RN-20: fora da janela o reporte e recusado` | CA-01 |
| `T-NOSHOW-02 \| RN-20: prestador registra ausencia do cliente e ele perde 12 pontos` | CA-02 |
| `T-NOSHOW-03 \| RN-20: cliente registra ausencia do prestador` | CA-03 |
| `T-NOSHOW-05 \| RF-052: fora da janela ou fora de CONFIRMADO, a recusa informa a janela valida` | CA-01, INV-001 |
| `T-NOSHOW-06 \| RF-053/RN-16: ausencia do cliente penaliza pela P-22, sem comissao, e abre a contestacao ate P-15` | CA-02, CA-04, INV-002, INV-003, INV-005 |
| `T-NOSHOW-07 \| RF-054: ausencia do prestador penaliza e vira ocorrencia da RN-21` | CA-03, INV-004 |

**Evidência (registro etapa 54, 2026-10-30).** `T-NOSHOW-01i` a `03` em `penalidades.test.js`, `05` a `07` em
`spec-019-no-show.test.js`; todos passam. **Divergência corrigida:** a recusa por estado não informava a janela válida,
como o RF-052 exige nos três casos.

## 13. Questões em aberto

- **Conclusão automática × janela de no-show:** com os padrões, P-17 e P-16b coincidem (24 h após o fim). Mas as faixas permitem P-17 = 12 h com P-16b = 72 h: a rotina conclui o agendamento com a janela de no-show ainda aberta, e quem faltou deixa de poder ser reportado. É regra da SPEC-020 (Trilha A); proposta: a conclusão automática esperar o maior dos dois prazos.
- **OPEN-07:** quem abre a disputa da acusação mútua (SPEC-022).

## 14. Definition of Done

1. a equipe aprovar este rascunho e decidir a questão P-17 × P-16b com a Trilha A;
2. CA-01 a CA-04 e INV-001 a INV-005 com evidência automatizada (feito, §12).
