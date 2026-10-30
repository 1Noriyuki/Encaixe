# SPEC-025 — Revisão administrativa e suspensão de contas

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 seguem registradas para decisão posterior |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 25 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 · ADR-004 |

## 1. Identificação

- **ID:** SPEC-025
- **Nome:** Revisão administrativa e suspensão de contas
- **Objetivo:** o admin vê a fila de contas em revisão ou suspensas, com motivo, reputação e histórico, e decide reativar ou suspender com justificativa. A suspensão encerra o acesso e retira da busca os horários publicados, preservando os confirmados.
- **Valor entregue:** contas problemáticas aparecem sozinhas e têm desfecho registrado.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-078, RF-079 | spec §7.8 |
| RN | RN-21, RN-22 (gatilhos), RN-28 (suspensão) | spec §6 |
| RNF | RNF-03, RNF-07 | spec §8 |
| Caso de uso | UC-13 | spec §10.14 |
| Entidades | `Usuario`, `EventoReputacao`, `HorarioVago` | spec §9.2 |
| ADRs | ADR-004 (suspensão encerra as sessões) | `docs/adr/` |
| Dependências | SPEC-006, SPEC-018, SPEC-019 | mapa §2 |

## 3. Escopo

### Incluído

1. Fila de contas `EM_REVISAO` e `SUSPENSO` com motivo do sinalizador (da trilha de auditoria), reputação e ocorrências.
2. Dossiê com reputação, concluídos, ausências e taxa de no-show, cancelamentos, recusas e expirações (prestador), disputas, eventos de reputação e histórico da conta.
3. Decisão `ATIVO` ou `SUSPENSO`, com justificativa (10+ caracteres), auditada com o admin, avisada ao titular com o texto.
4. Suspensão: encerra as sessões, tira da busca os horários publicados, impede novas reservas desses horários e preserva os confirmados; a reativação os devolve.

### Fora do escopo

Aprovação de cadastro (SPEC-005); disparo automático da revisão (SPEC-006, SPEC-018); limiar de baixa responsividade (OPEN-19).

## 4. Dependências

SPEC-006, SPEC-018, SPEC-019, SPEC-002 (autenticação de conta suspensa), SPEC-003.

## 5. Comportamento esperado

UC-13: (1) a conta entra na fila com o motivo; (2) o admin abre o dossiê; (3) decide reativar ou suspender; (4) o sistema aplica a decisão, registra justificativa e auditoria e avisa o titular. Decisão que não é transição válida (por exemplo `ATIVO → ATIVO`) é recusada sem efeito.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Sair de `EM_REVISAO` ou `SUSPENSO` só por decisão do admin com justificativa | reputação que melhora não reativa; decisão sem texto | RF-079, RN-22 |
| INV-002 | Conta suspensa não tem sessão ativa nem horário na busca | sessão e busca após suspender | RN-28 |
| INV-003 | Agendamento confirmado sobrevive à suspensão | estado após suspender | RN-28 |
| INV-004 | Toda decisão fica na trilha com o admin e a justificativa | auditoria | RNF-07 |
| INV-005 | O motivo exibido na fila é o da última transição para o estado atual | RN-21, RN-22 e suspensão | RF-078 |

## 7. Modelo de domínio envolvido

`Usuario.estado_conta` (`EM_REVISAO | ATIVO | RESTRITO → SUSPENSO`, `EM_REVISAO | SUSPENSO → ATIVO`), sessões, `HorarioVago` (fora da busca por RF-030).

## 8. Impacto arquitetural

`aplicacao/contas.js` (`decidirSobreConta`), `aplicacao/admin.js` (`filaDeRevisao`, `dossieDaConta`), `infra/repositorios/agendamentos.js` (`respostasDoPrestador`), `interface/http/rotas/admin.js` (`/admin/contas`, dossiê, decisão).

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Fila de revisão | admin | contas com motivo, reputação, ocorrências | autorização |
| Dossiê | admin; conta | números, disputas, eventos, histórico | não encontrado |
| Decidir | admin; conta; `ATIVO` ou `SUSPENSO`; justificativa | conta no estado novo | validação, transição inválida |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-03 | só admin vê a fila e decide | `T-AUTORIZ-02` |
| RNF-07 | decisão auditada | `T-CONTA-REVISAO-02`, `T-AUDIT-07` |

## 11. Critérios de aceitação

**CA-01** · A fila mostra motivo, reputação e ocorrências de cada conta sinalizada.

**CA-02** · O dossiê mostra disputas e as taxas de no-show, recusa e expiração.

**CA-03** · Decidir exige justificativa e transição válida; aplica, audita e avisa o titular com o texto.

**CA-04** · Suspender encerra as sessões, tira da busca os horários publicados e preserva o confirmado; reativar devolve os horários à busca.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-CONTA-REVISAO-01 / 01b \| RF-078` (T-55) | CA-01, INV-005 |
| `T-CONTA-REVISAO-02 \| RF-079: decisao pela tela exige justificativa, aplica e notifica o titular` | CA-03, INV-004 |
| `T-SESSAO-03 / 03b \| RN-28` (SPEC-002) | CA-04, INV-002 |
| `T-SPEC006-CA08 \| RN-22: melhoria da pontuacao nao reativa conta em revisao` | INV-001 |
| `T-SUSPENSAO-01 \| RN-28: suspender tira da busca o publicado e preserva o confirmado; reativar devolve` | CA-04, INV-002, INV-003 |
| `T-SUSPENSAO-02 \| RF-079: decisao repetida ou sem justificativa e recusada sem efeito` | CA-03, INV-001 |
| `T-SUSPENSAO-03 \| UC-13 passo 2: o dossie mostra disputas e as taxas de no-show, recusa e expiracao` | CA-02 |

**Evidência (registro etapa 57, 2026-10-30).** Todos passam. **Divergência corrigida (UC-13 passo 2):** o dossiê carregava
as disputas da conta sem exibi-las e não tinha taxa de expiração; agora mostra a seção "Disputas" e a métrica "Sem
resposta" do prestador. A taxa é informação, sem limiar: o sinal de baixa responsividade continua na OPEN-19.

## 13. Questões em aberto

- **OPEN-19:** limiar de expirações para sinalizar baixa responsividade.
- **Suspensão de admin:** a RN-28 diz "qualquer conta"; o código permite suspender outra conta de admin, e nada impede o admin de suspender a si mesmo.
- **Pendentes de prestador suspenso:** a RN-28 preserva os confirmados e não diz o que acontece com reservas ainda pendentes; hoje elas expiram pela política P-02.

## 14. Definition of Done

1. a equipe aprovar este rascunho e decidir as três questões;
2. CA-01 a CA-04 e INV-001 a INV-005 com evidência automatizada (feito, §12).
