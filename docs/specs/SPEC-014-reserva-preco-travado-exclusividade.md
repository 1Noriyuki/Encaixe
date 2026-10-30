# SPEC-014 — Reserva com preço travado e exclusividade

| Campo | Valor |
|---|---|
| Versão | 0.1.0 |
| Data | 2026-10-30 |
| Status | **Rascunho, não aprovado.** Escrito pelo 2dart5 depois do código (OPEN-01), já com a conferência e a evidência da §12. Aguarda revisão e aprovação da equipe |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 14 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 · ADR-002 |

## 1. Identificação

- **ID:** SPEC-014
- **Nome:** Reserva com preço travado e exclusividade
- **Objetivo:** o cliente elegível reserva um horário; o preço vigente fica travado e o horário, bloqueado, numa operação atômica, respeitando o limite de reservas simultâneas por reputação. Horário reservado não tem duração, preço ou régua alterados.
- **Valor entregue:** o núcleo transacional do marketplace: o número que o cliente viu é o que vale, e ninguém mais pega aquele horário.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-017, RF-039, RF-040, RF-041, RF-047 | spec §7.3, §7.5 |
| RN | RN-04, RN-05, RN-07 (P-04), RN-09, RN-12, RN-13; RN-28 (prestador não ativo) | spec §6 |
| RNF | RNF-09, RNF-11 | spec §8 |
| Histórias | US-21, US-22, US-25 | spec §5.2 |
| Caso de uso | UC-05 | spec §10.6 |
| Entidades | `Agendamento`, `HorarioVago`, `Usuario` | spec §9.2 |
| Invariantes globais | INV-01, INV-03, INV-04, INV-13 | spec §9.8 |
| ADRs | ADR-002 (índice único parcial, valores em centavos) | `docs/adr/` |
| Dependências | SPEC-004, SPEC-006, SPEC-011, SPEC-013 | mapa §2 |

## 3. Escopo

### Incluído

1. Reservar horário `PUBLICADO`, de prestador `ATIVO`, com antecedência ≥ P-04.
2. Recusar cliente `SUSPENSO` ou `EM_REVISAO` (RN-13) e cliente no limite de reservas em aberto (RN-12), informando o limite vigente.
3. Criar o agendamento em `PENDENTE_CONFIRMACAO` com valor e percentual travados e prazo de confirmação; bloquear o horário; avisar o prestador; auditar.
4. Garantir, no domínio e no banco, um único agendamento ativo por horário, valor travado imutável e nunca abaixo do piso.
5. Fazer tudo numa transação: falha no meio não deixa rastro parcial.

### Fora do escopo

| Comportamento | Onde fica |
|---|---|
| Cálculo do preço vigente | SPEC-011 |
| Prazo de confirmação e expiração | SPEC-015, SPEC-016 |
| Edição de horário vago em geral | OPEN-09 (não existe caminho de edição) |

## 4. Dependências

SPEC-006 (reputação e estado da conta), SPEC-011 (preço), SPEC-013 (descoberta), SPEC-004 (aviso).

## 5. Comportamento esperado

- **Pré-condições:** cliente autenticado; horário existente.
- **Fluxo principal:** (1) o sistema confere prestador `ATIVO` (RN-28), horário `PUBLICADO` (RN-09), antecedência (RN-07) e elegibilidade do cliente (RN-12, RN-13); (2) calcula o preço vigente e o prazo de confirmação; (3) numa transação, cria o agendamento com o valor travado, bloqueia o horário, audita as duas transições e avisa o prestador.
- **Exceções:** cada pré-condição falha com a regra e o motivo; a reserva concorrente perde com RN-09 ("acabou de ser reservado por outra pessoa", HTTP 409).

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Um horário nunca tem dois agendamentos não terminais, no domínio e no índice `ux_agendamento_ativo` | segunda reserva pela rota e inserção direta | RN-09, INV-01 |
| INV-002 | `valor_travado` nunca muda após a criação, no domínio e no gatilho `agendamento_valor_travado_imutavel` | atualização direta | RN-04, INV-03 |
| INV-003 | `valor_travado` ≥ `preco_minimo_snapshot` do horário, no domínio e no gatilho `agendamento_respeita_piso` | inserção abaixo do piso | RN-03, INV-04 |
| INV-004 | Reserva recusada não grava agendamento nem muda o horário | contar após cada recusa | RF-039 |
| INV-005 | Falha em qualquer passo desfaz a reserva inteira | gatilho que derruba a auditoria | RNF-09 |
| INV-006 | Editar serviço ou régua depois não muda o horário reservado nem o valor | edição após confirmar | RF-017, RN-05 |

## 7. Modelo de domínio envolvido

| Entidade | Atributos relevantes | Restrições |
|---|---|---|
| `Agendamento` | `estado`, `valor_travado`, `percentual_desconto_aplicado`, `prazo_confirmacao_em` | índice único parcial; gatilhos de imutabilidade e piso |
| `HorarioVago` | `estado` (`PUBLICADO → BLOQUEADO`), snapshots | snapshots não seguem o serviço |
| `Usuario` | `estado_conta`, `reputacao` | define elegibilidade e limite |

## 8. Impacto arquitetural

| Item | Impacto |
|---|---|
| Módulos | `aplicacao/agendamentos.js` (`reservar`), `dominio/reserva.js` (elegibilidade, limite, antecedência), `infra/db/schema.sql` (índice e gatilhos) |
| Frontend | botão de reserva no detalhe do horário; recusa com a regra |

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Reservar | cliente; horário; observação | agendamento `PENDENTE_CONFIRMACAO` | RN-28, RN-09 (indisponível ou concorrência, 409), RN-07, RN-13, RN-12 (com o limite) |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-09 | atomicidade e exclusividade sob concorrência | índice único, transação e falha simulada |
| RNF-11 | reserva por formulário, recusa com a regra | teste HTTP |

## 11. Critérios de aceitação

**CA-01** · **Dado** cliente elegível e horário reservável, **quando** reserva, **então** nasce `PENDENTE_CONFIRMACAO` com o preço vigente travado, o horário fica `BLOQUEADO`, o prestador é avisado e há registro.

**CA-02** · **Dado** cliente suspenso, em revisão, no limite, horário perto demais ou prestador inativo, **quando** reserva, **então** a recusa cita a regra e o motivo, inclusive o limite vigente, e nada é gravado.

**CA-03** · **Dado** duas reservas do mesmo horário, **então** só a primeira vale; a segunda vê RN-09, e o banco recusa mesmo se o domínio for contornado.

**CA-04** · **Dado** falha em qualquer passo, **então** não sobra agendamento, bloqueio nem aviso.

**CA-05** · **Dado** valor travado, **então** ele não muda depois nem fica abaixo do piso, nem por gravação direta.

**CA-06** · **Dado** horário reservado, **quando** o prestador edita o serviço ou a régua, **então** o horário e o valor não mudam.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-RESERVA-03 \| RN-04: o preco travado NAO muda quando o desconto aumenta depois` | CA-05 |
| `T-RESERVA-04 \| INV-01: duas reservas concorrentes no mesmo horario, so uma vence` | CA-03 |
| `T-RESERVA-05/05b/05c \| RN-12` e `T-RESERVA-06 \| RN-13` (unidade) | CA-02 |
| `T-HORARIO-04 \| RN-05: servico alterado nao modifica snapshots de horario reservado` | CA-06 |
| `T-RESERVA-07 \| RF-039/RF-040: reserva cria PENDENTE com preco vigente travado, bloqueia e avisa` | CA-01 |
| `T-RESERVA-08 \| RF-039/RF-047: cada recusa informa o motivo e nao grava nada` | CA-02, INV-004 |
| `T-RESERVA-09 \| RF-041/INV-01: a segunda reserva do mesmo horario e recusada, pela rota e pelo banco` | CA-03, INV-001 |
| `T-RESERVA-10 \| RNF-09: reserva e atomica; falha no meio nao deixa agendamento nem horario bloqueado` | CA-04, INV-005 |
| `T-RESERVA-11 \| INV-03/INV-04: o banco recusa mudar o valor travado e travar abaixo do piso` | CA-05, INV-002, INV-003 |
| `T-RESERVA-12 \| RF-017/RN-04: editar servico ou regua depois da reserva nao muda o horario nem o valor` | CA-06, INV-006 |

**Evidência (registro etapa 49, 2026-10-30).** `T-RESERVA-07` a `12` em `spec-014-reserva.test.js`; os demais em
`fluxo-principal`, `unidade/reserva` e `trilha-a-cobertura-rnf06`; todos passam. **Divergência corrigida:** INV-03 e INV-04
só existiam no domínio; os gatilhos `agendamento_valor_travado_imutavel` e `agendamento_respeita_piso` passam a
recusá-las também no banco. Seed refeito do zero para provar.

## 13. Questões em aberto

- **RF-017 sem caminho de edição:** não há edição de horário (OPEN-09), então o RF-017 é atendido por ausência; editar a régua usada por um horário reservado muda a projeção mostrada, mas não o valor travado. Confirmar se isso basta.
- **Concorrência real:** o Node executa a reserva de forma síncrona sobre um SQLite único, então duas requisições não se intercalam dentro de `reservar()`; o índice único é a garantia se isso mudar (por exemplo, com mais de um processo).

## 14. Definition of Done

1. a equipe aprovar este rascunho;
2. CA-01 a CA-06 e INV-001 a INV-006 com evidência automatizada (feito, §12);
3. INV-01, INV-03 e INV-04 no domínio e no banco (feito).
