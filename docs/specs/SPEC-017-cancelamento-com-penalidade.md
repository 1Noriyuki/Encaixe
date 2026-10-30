# SPEC-017 — Cancelamento de agendamento com penalidade progressiva

| Campo | Valor |
|---|---|
| Versão | 0.1.0 |
| Data | 2026-10-30 |
| Status | **Rascunho, não aprovado.** Escrito pelo 2dart5 depois do código (OPEN-01), já com a conferência e a evidência da §12. Aguarda revisão e aprovação da equipe |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 17 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 · ADR-005 |

## 1. Identificação

- **ID:** SPEC-017
- **Nome:** Cancelamento de agendamento com penalidade progressiva
- **Objetivo:** cliente ou prestador cancela antes do início, vê a consequência exata antes de confirmar e recebe o delta da faixa. O horário tem tratamento assimétrico: volta à busca se o cliente cancelou, morre se o prestador cancelou.
- **Valor entregue:** contém o comportamento oportunista (persona 4.3) sem surpresa para ninguém.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-048, RF-049, RF-050, RF-051 | spec §7.6 |
| RN | RN-18, RN-19, RN-21 (ocorrência), RN-23 (deltas) | spec §6 |
| RNF | RNF-11 (consequência antes da ação) | spec §8 |
| Caso de uso | UC-08 | spec §10.9 |
| Entidades | `Agendamento`, `HorarioVago`, `EventoReputacao` | spec §9.2 |
| ADRs | ADR-005 (penalidade só de reputação) | `docs/adr/` |
| Parâmetros | P-06 (janela livre), P-07 (penalidade total), deltas da RN-23 | spec §6.1 |
| Dependências | SPEC-006, SPEC-015 | mapa §2 |

## 3. Escopo

### Incluído

1. Prévia do cancelamento com a faixa (livre, parcial, total) e o delta exato, sem efeito.
2. Cancelamento pelo cliente: `CANCELADO_CLIENTE`, delta da RN-18, horário conforme RF-044, aviso ao prestador.
3. Cancelamento pelo prestador: `CANCELADO_PRESTADOR`, delta da RN-19, horário `CANCELADO`, ocorrência negativa (faixa parcial ou total) e verificação da RN-21.
4. Aviso à outra parte com motivo, faixa e efeito na reputação.
5. Recusa de cancelamento depois do início (o caminho é o no-show) ou de agendamento terminal.

### Fora do escopo

| Comportamento | Onde fica |
|---|---|
| Revisão automática por ocorrências | SPEC-018 |
| Converter cancelamento em no-show (RN-18, faixa total) | OPEN-18 |
| Cancelamento pelo admin (matriz §4.5) | OPEN-09, §13 |

## 4. Dependências

SPEC-006 (livro-razão), SPEC-015 (agendamento confirmado), SPEC-004 (avisos).

## 5. Comportamento esperado

Segue UC-08: (2) faixa pela antecedência atual; (3) prévia; (4) confirmação; (5) estado de cancelamento e motivo; (6) evento de reputação; (7) ocorrência se prestador; (8) horário tratado; (9) aviso. Alternativo 4a: desistir na prévia não muda nada. Exceções 1a (já começou) e 1b (terminal): recusa com a regra.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | O delta aplicado é exatamente o da prévia | prévia × evento gravado | RF-048 |
| INV-002 | Na mesma faixa, o prestador perde ao menos o que o cliente perderia | tabela das três faixas | RN-19 |
| INV-003 | Não há cancelamento depois do início nem de agendamento terminal | cancelar depois do início e duas vezes | RN-18, UC-08 1a/1b |
| INV-004 | Abrir a prévia não altera estado nem reputação | GET da tela | UC-08 4a |
| INV-005 | Só o cancelamento do prestador fora da faixa livre vira ocorrência | contagem da RN-21 | RN-19, RN-21 |

## 7. Modelo de domínio envolvido

`Agendamento` (`→ CANCELADO_CLIENTE | CANCELADO_PRESTADOR`), `HorarioVago` (`→ PUBLICADO | EXPIRADO | CANCELADO`), `EventoReputacao` (`CANCELAMENTO_LIVRE | _PARCIAL | _TOTAL`).

## 8. Impacto arquitetural

| Item | Impacto |
|---|---|
| Módulos | `dominio/cancelamento.js` (faixa e penalidade), `aplicacao/agendamentos.js` (`previaDeCancelamento`, `cancelar`), `aplicacao/reputacao.js` |
| Frontend | `/agendamentos/:id/cancelar` mostra a consequência e pede confirmação |

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Prévia | usuário; agendamento | faixa, rótulo, delta | titularidade; já começou (explicado, sem exceção) |
| Cancelar | usuário; agendamento; motivo? | agendamento cancelado e penalidade | RN-18 (terminal ou já começou), titularidade |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-11 | consequência exata antes da confirmação | teste HTTP da tela |

## 11. Critérios de aceitação

**CA-01** · Faixas da RN-18 para o cliente: livre (> P-06) 0, parcial −3, total (< P-07) −6.

**CA-02** · RN-19: o prestador perde mais em cada faixa, e a parcial ou total vira ocorrência.

**CA-03** · A tela mostra faixa e delta antes de confirmar; abri-la não muda nada; o delta aplicado é o mostrado.

**CA-04** · Cliente cancela: horário volta à busca se resta P-04; prestador cancela: horário `CANCELADO`.

**CA-05** · A outra parte recebe o motivo, a faixa e o efeito na reputação de quem cancelou.

**CA-06** · Depois do início, ou em agendamento terminal, o cancelamento é recusado.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-CANCEL-01..03 \| RN-18` (unidade) e `T-CANCEL-01i..03i \| RN-18` (integração) | CA-01 |
| `T-CANCEL-04 \| RN-19: o prestador paga mais caro em todas as faixas` e `T-CANCEL-04i` | CA-02, INV-002 |
| `T-CANCEL-05 \| RN-18` e `T-CANCEL-05i \| RN-18: depois do inicio nao existe cancelamento` | CA-06, INV-003 |
| `T-CANCEL-06/07 \| RF-048: a previa ...` | CA-03, INV-001 |
| `RN-21: cancelamento livre nao conta como ocorrencia negativa` | INV-005 |
| `T-CANCEL-08 \| RF-048/RNF-11: a tela mostra faixa e efeito antes de confirmar, e so olhar nao muda nada` | CA-03, INV-004 |
| `T-CANCEL-09 \| RF-049/RF-050: cliente libera o horario; prestador o cancela e gera ocorrencia` | CA-04, CA-02, INV-005 |
| `T-CANCEL-10 \| RF-051: a outra parte e avisada com motivo, faixa e efeito na reputacao` | CA-05 |
| `T-CANCEL-11 \| UC-08 1b: agendamento terminal nao e cancelado e nada muda` | CA-06, INV-003 |

**Evidência (registro etapa 52, 2026-10-30).** Unidade em `cancelamento.test.js`; `T-CANCEL-01i` a `05i` em
`penalidades.test.js`; `08` a `11` em `spec-017-cancelamento.test.js`; todos passam. **Divergência corrigida:** o aviso à
outra parte trazia faixa e motivo, mas não o efeito na reputação que o RF-051 exige.

## 13. Questões em aberto

- **Cancelamento pelo admin:** a matriz §4.5 permite ao admin cancelar qualquer agendamento com justificativa, sem RF, UC nem penalidade definida (OPEN-09; divergência registrada na SPEC-003). Não há esse caminho no código.
- **OPEN-18:** converter cancelamento em no-show na faixa total.
- **RN-19 × RN-21:** a RN-19 diz que "a ocorrência entra na contagem de P-12a" sem ressalva de faixa, e a RN-21 lista só as faixas parcial e total. O código segue a RN-21 (cancelamento livre não é ocorrência); confirmar.

## 14. Definition of Done

1. a equipe aprovar este rascunho e decidir a questão RN-19 × RN-21;
2. CA-01 a CA-06 e INV-001 a INV-005 com evidência automatizada (feito, §12).
