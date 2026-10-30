# SPEC-016 — Expiração automática da reserva

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 seguem registradas para decisão posterior |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 16 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 · plan §5.2 |

## 1. Identificação

- **ID:** SPEC-016
- **Nome:** Expiração automática da reserva
- **Objetivo:** esgotado o prazo de confirmação sem resposta, aplicar a política P-02 do prestador (`LIBERAR` ou `AUTOCONFIRMAR`) sem penalizar o cliente. As rotinas temporais rodam em intervalo no processo e também antes das leituras sensíveis a tempo.
- **Valor entregue:** o horário não fica preso por um prestador que não responde, e o cliente sabe o que aconteceu.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-044, RF-045, RF-046 | spec §7.5 |
| RN | RN-10 | spec §6 |
| RNF | RNF-08 | spec §8 |
| Caso de uso | UC-07 | spec §10.8 |
| Entidades | `Agendamento`, `HorarioVago`, `PerfilPrestador` (P-01, P-02) | spec §9.2 |
| Decisões | OPEN-104 (ator `null` = sistema) | mapa §3 |
| Dependências | SPEC-015 | mapa §2 |

## 3. Escopo

### Incluído

1. Detectar reservas `PENDENTE_CONFIRMACAO` com o prazo vencido (o prazo já nasce limitado ao início do horário, RN-10).
2. `LIBERAR`: agendamento `EXPIRADO`, horário `PUBLICADO` se resta P-04 ou `EXPIRADO`, aviso às duas partes, sem evento de reputação.
3. `AUTOCONFIRMAR`: agendamento `CONFIRMADO`, horário `OCUPADO`, aviso às duas partes de que a confirmação foi automática.
4. Registrar a transição com o sistema como ator.
5. Rodar as rotinas em intervalo (`ROTINAS_INTERVALO_MS`) e antes das leituras pela rota, de forma idempotente.

### Fora do escopo

| Comportamento | Onde fica |
|---|---|
| Expirações repetidas como sinal de baixa responsividade (UC-07, regra associada) | OPEN-19, SPEC-025 |
| Conclusão automática e revelação de avaliações, que usam as mesmas rotinas | SPEC-020, SPEC-021 |

## 4. Dependências

SPEC-015 (confirmação e `liberarHorario`), SPEC-001 (P-01, P-02, P-04 e máquinas), SPEC-004 (avisos).

## 5. Comportamento esperado

- **Gatilho:** `prazo_confirmacao_em` atingido sem resposta, percebido pela rotina do intervalo ou pela primeira leitura da rota depois dele.
- **LIBERAR (padrão):** (1) agendamento `EXPIRADO`, com motivo; (2) horário `PUBLICADO` ou `EXPIRADO` conforme P-04; (3) avisos: ao cliente, dizendo se o horário voltou para a busca; ao prestador, que perdeu a reserva.
- **AUTOCONFIRMAR:** o mesmo caminho da confirmação manual, com ator `null`, e aviso também ao prestador.
- **Idempotência:** rodar de novo não repete efeito nem aviso; reserva ainda no prazo não é tocada.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Expiração nunca penaliza o cliente | eventos de reputação | RN-10 |
| INV-002 | O horário só volta à busca se resta P-04 | expirar longe e perto do início | RF-044 |
| INV-003 | Cada reserva vencida é resolvida uma única vez | duas passadas da rotina | RN-10 |
| INV-004 | O ator da transição automática é o sistema (`null`) | auditoria | OPEN-104 |
| INV-005 | Leitura pela rota já enxerga o estado expirado | busca logo depois do prazo | plan §5.2 |

## 7. Modelo de domínio envolvido

`Agendamento` (`PENDENTE_CONFIRMACAO → EXPIRADO | CONFIRMADO`), `HorarioVago` (`BLOQUEADO → PUBLICADO | EXPIRADO | OCUPADO`), `PerfilPrestador.politica_expiracao`.

## 8. Impacto arquitetural

| Item | Impacto |
|---|---|
| Módulos | `aplicacao/rotinas.js` (`executar`, `iniciarAgendador`), `aplicacao/agendamentos.js` (`resolverExpiracao`), `interface/http/servidor.js` (`executarRotinasSeNecessario`, no máximo a cada 15 s de relógio real) |

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Executar rotinas | instante atual | resumo com contagem por efeito | falha de um item é registrada e não interrompe os demais |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-08 | prazos comparados em UTC, com relógio injetável | relógio controlado nos testes |

## 11. Critérios de aceitação

**CA-01** · **Dado** reserva vencida e política `LIBERAR`, **então** `EXPIRADO`, horário conforme P-04, avisos às duas partes, sem penalidade.

**CA-02** · **Dado** reserva vencida e política `AUTOCONFIRMAR`, **então** `CONFIRMADO`, horário `OCUPADO`, avisos às duas partes, ator sistema.

**CA-03** · **Dado** expiração sem antecedência restante, **então** o horário vai a `EXPIRADO` e o aviso ao cliente não promete a volta à busca.

**CA-04** · **Dado** reserva ainda no prazo, ou já resolvida, **então** a rotina não a toca.

**CA-05** · **Dado** prazo vencido, **quando** alguém lê pela rota, **então** já vê o desfecho.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-EXPIRA-01 \| RN-10: o prazo de confirmacao nunca ultrapassa o inicio do horario` | RN-10 |
| `T-EXPIRA-02 \| RF-045: sem resposta e politica LIBERAR, o horario volta para a busca` | CA-01 |
| `T-EXPIRA-03 \| RF-046: com politica AUTOCONFIRMAR, a reserva vira confirmada sozinha` | CA-02 |
| `T-EXPIRA-04 \| RF-044: expirando perto demais do horario, ele nao volta para a busca` | CA-03, INV-002 |
| `T-EXPIRA-05 \| UC-07: a leitura pela rota dispara a expiracao sem esperar o intervalo` | CA-05, INV-005 |
| `T-EXPIRA-06 \| RF-045/RN-10: expirar avisa as duas partes, sem penalidade, e o aviso diz o destino do horario` | CA-01, CA-03, INV-001 |
| `T-EXPIRA-07 \| RF-046: AUTOCONFIRMAR confirma pelo sistema e avisa as duas partes` | CA-02, INV-004 |
| `T-EXPIRA-08 \| RN-10: a rotina e idempotente e nao toca reserva ainda no prazo` | CA-04, INV-003 |

**Evidência (registro etapa 51, 2026-10-30).** `T-EXPIRA-01` em `unidade/reserva.test.js`, `02` a `04` em
`fluxo-principal.test.js`, `05` a `08` em `spec-016-expiracao.test.js`; todos passam. **Divergência corrigida:** o aviso
ao cliente dizia sempre "o horário voltou para a busca", também quando o horário expirava por falta de P-04.

## 13. Questões em aberto

- **OPEN-19:** expirações repetidas como sinal de baixa responsividade, sem métrica nem limiar.
- **Intervalo da leitura:** a rota dispara as rotinas no máximo a cada 15 s de relógio real; a constante não é parâmetro da §6.1, porque é proteção de desempenho, não regra.

## 14. Definition of Done

1. a equipe aprovar este rascunho;
2. CA-01 a CA-05 e INV-001 a INV-005 com evidência automatizada (feito, §12).
