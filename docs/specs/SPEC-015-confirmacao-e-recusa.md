# SPEC-015 — Confirmação e recusa da reserva

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 seguem registradas para decisão posterior |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 15 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 · ADR-004 |

## 1. Identificação

- **ID:** SPEC-015
- **Nome:** Confirmação e recusa da reserva
- **Objetivo:** dentro do prazo, o prestador confirma (agendamento `CONFIRMADO`, horário `OCUPADO`, contatos liberados entre as partes) ou recusa com motivo (horário devolvido conforme P-04, sem penalidade para ninguém).
- **Valor entregue:** o prestador mantém controle sobre quem atende, e o cliente sabe o desfecho na hora.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-042, RF-043, RF-044 | spec §7.5 |
| RN | RN-10 (prazo), RN-11 | spec §6 |
| RNF | RNF-04 | spec §8 |
| Caso de uso | UC-06 (fluxo principal, 3a, 1a) | spec §10.7 |
| Entidades | `Agendamento`, `HorarioVago` | spec §9.2 |
| ADRs | ADR-004 (titularidade e visibilidade de contato) | `docs/adr/` |
| Dependências | SPEC-014 | mapa §2 |

## 3. Escopo

### Incluído

1. Confirmar agendamento `PENDENTE_CONFIRMACAO` dentro do prazo: `CONFIRMADO`, horário `OCUPADO`, aviso ao cliente.
2. Recusar com motivo (mínimo de 5 caracteres) dentro do prazo: `RECUSADO`, horário `PUBLICADO` se resta P-04, senão `EXPIRADO`; aviso ao cliente com o motivo.
3. Liberar contato entre as partes só quando `CONFIRMADO`; nunca no perfil público.
4. Recusar qualquer decisão depois do prazo (o desfecho é da SPEC-016) ou sobre agendamento que já não está pendente.
5. Mostrar ao admin a taxa de recusa do prestador; a recusa não é cancelamento nem ocorrência.

### Fora do escopo

Expiração e autoconfirmação (SPEC-016); cancelamento depois de confirmado (SPEC-017).

## 4. Dependências

SPEC-014; SPEC-004 (avisos); SPEC-003 (titularidade).

## 5. Comportamento esperado

- **Confirmar:** pré-condição `PENDENTE_CONFIRMACAO` e agora < prazo; o sistema grava `CONFIRMADO` e o prazo de conclusão automática (P-17), ocupa o horário, audita as duas transições e avisa o cliente.
- **Recusar (3a):** mesmo pré-requisito, mais motivo; o sistema grava `RECUSADO` com o motivo, libera ou expira o horário (RF-044), audita e avisa o cliente.
- **Exceção 1a:** prazo esgotado: recusa com RN-10, sem mudar estado.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Só agendamento pendente e dentro do prazo recebe confirmação ou recusa | decidir depois do prazo e decidir de novo | RN-10, UC-06 1a |
| INV-002 | Recusa sem motivo não muda nada | motivo curto | RF-043 |
| INV-003 | Recusa nunca gera evento de reputação nem ocorrência da RN-21 | contar eventos | RN-11 |
| INV-004 | Contato só aparece entre as partes de agendamento `CONFIRMADO` | telas antes e depois, de terceiro e pública | RNF-04 |
| INV-005 | Horário recusado volta à busca só se resta P-04 | recusar perto do início | RF-044 |

## 7. Modelo de domínio envolvido

`Agendamento` (`PENDENTE_CONFIRMACAO → CONFIRMADO | RECUSADO`, `motivo_encerramento`, `prazo_confirmacao_em`), `HorarioVago` (`BLOQUEADO → OCUPADO | PUBLICADO | EXPIRADO`).

## 8. Impacto arquitetural

| Item | Impacto |
|---|---|
| Módulos | `aplicacao/agendamentos.js` (`confirmar`, `recusar`, `liberarHorario`), `aplicacao/admin.js` (`dossieDaConta`: taxa de recusa), `infra/repositorios/agendamentos.js` (`respostasDoPrestador`) |
| Frontend | detalhe do agendamento mostra o contato só se `CONFIRMADO`; dossiê do admin mostra "Recusas" |

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Confirmar | prestador; agendamento | `CONFIRMADO` | RN-10 (prazo ou estado), titularidade |
| Recusar | prestador; agendamento; motivo | `RECUSADO` | validação do motivo, RN-11 (estado), RN-10 (prazo), titularidade |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-04 | contato só entre as partes, depois de confirmado | telas do cliente, do prestador, de terceiro e pública |

## 11. Critérios de aceitação

**CA-01** · Confirmar pendente no prazo: `CONFIRMADO`, horário `OCUPADO`, cliente avisado.

**CA-02** · Recusar exige motivo; com motivo: `RECUSADO`, cliente avisado com o motivo.

**CA-03** · Horário recusado volta a `PUBLICADO` se resta P-04; senão `EXPIRADO`.

**CA-04** · Depois do prazo, confirmar ou recusar é recusado com RN-10; decidir de novo é recusado.

**CA-05** · Contatos só aparecem entre as partes depois da confirmação.

**CA-06** · A recusa não penaliza nem conta como cancelamento, e entra na taxa de recusa que o admin vê.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-AGENDAMENTO-06 \| RF-042: prestador confirma reserva pendente e ocupa o horario` | CA-01 |
| `T-AGENDAMENTO-07 \| RF-043/RF-044: recusa exige motivo e libera o horario` | CA-02, CA-03, INV-002 |
| `T-AGENDAMENTO-07b \| RF-042/RF-043: confirmacao e recusa notificam o cliente, a recusa com o motivo` | CA-01, CA-02 |
| `T-AGENDAMENTO-07c \| RF-044: recusa sem antecedencia P-04 restante expira o horario` | CA-03, INV-005 |
| `T-CONFIRMA-01 \| RNF-04: contatos so aparecem entre as partes depois da confirmacao` | CA-05, INV-004 |
| `T-CONFIRMA-02 \| RN-10: confirmar ou recusar depois do prazo e recusado e o desfecho fica com a rotina` | CA-04, INV-001 |
| `T-CONFIRMA-03 \| RN-11: recusa nao penaliza ninguem nem conta como cancelamento` | CA-06, INV-003 |
| `T-CONFIRMA-04 \| RN-11: a taxa de recusa do prestador aparece para o admin` | CA-06 |

**Evidência (registro etapa 50, 2026-10-30).** `T-AGENDAMENTO-*` em `trilha-b.test.js` (T-33), `T-CONFIRMA-*` em
`spec-015-confirmacao.test.js`; todos passam. **Divergências corrigidas:** (1) **RN-11:** a "taxa de recusa exibida ao
admin" não existia; o dossiê do prestador mostra agora recusas e a taxa sobre as reservas recebidas. (2) **UC-06 1a:**
`recusar()` não conferia o prazo; pela rota a rotina expirava a reserva antes, mas chamada direta aceitava recusa tardia.

## 13. Questões em aberto

- **Período da taxa de recusa:** a RN-11 não define janela; hoje é sobre todo o histórico do prestador.
- **Motivo mínimo:** 5 caracteres é validação do código, não da baseline.

## 14. Definition of Done

1. a equipe aprovar este rascunho;
2. CA-01 a CA-06 e INV-001 a INV-005 com evidência automatizada (feito, §12).
