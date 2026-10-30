# SPEC-012 — Manutenção da agenda: cancelar horário livre e publicar em lote

| Campo | Valor |
|---|---|
| Versão | 0.1.0 |
| Data | 2026-10-30 |
| Status | **Rascunho, não aprovado.** Escrito pelo 2dart5 depois do código (OPEN-01), já com a conferência e a evidência da §12. Aguarda revisão e aprovação da equipe |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 12 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 |

## 1. Identificação

- **ID:** SPEC-012
- **Nome:** Manutenção da agenda: cancelar horário livre e publicar em lote
- **Objetivo:** o prestador retira um horário `PUBLICADO` sem penalidade e publica vários horários de uma vez, com cada recusa reportada individualmente.
- **Valor entregue:** agilidade para o prestador (persona: publicar em menos de um minuto) sem abrir brecha nas regras da publicação.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-022, RF-023 | spec §7.3 |
| RN | RN-05 (horário reservado não muda por esta via), RN-06 e RN-07 reaplicadas a cada item | spec §6 |
| RNF | RNF-11 | spec §8 |
| Histórias | US-11, US-12 | spec §5.2 |
| Caso de uso | UC-02 (alternativo 2a) | spec §10.3 |
| Entidades | `HorarioVago` | spec §9.2 |
| Dependências | SPEC-010 | mapa §2 |

## 3. Escopo

### Incluído

1. Cancelar horário `PUBLICADO` do próprio prestador, levando-o a `CANCELADO`, sem efeito de reputação, com auditoria.
2. Recusar o cancelamento por esta via quando há reserva ativa (`PENDENTE_CONFIRMACAO`, `CONFIRMADO`, `EM_DISPUTA`) ou o horário está em estado terminal.
3. Publicar em lote: uma data e várias horas; cada hora passa por todas as validações da SPEC-010.
4. Reportar cada entrada recusada com a hora, o motivo e a regra, sem abortar as aceitas.
5. Recusar hora ou data inexistente no calendário, em vez de transbordar para outro dia.

### Fora do escopo

| Comportamento | Onde fica |
|---|---|
| Cancelar agendamento (com penalidade) | SPEC-017 |
| Editar horário vago (matriz §4.5) | OPEN-09 |

## 4. Dependências

SPEC-010 (publicação unitária e suas regras), SPEC-003 (titularidade).

## 5. Comportamento esperado

### 5.1 Cancelar horário livre (RF-022)

- **Pré-condições:** prestador titular; horário `PUBLICADO`, sem reserva ativa.
- **Fluxo principal:** o sistema move o horário para `CANCELADO`, registra `HORARIO_CANCELADO` e o horário sai da busca.
- **Exceções:** 1a. reserva ativa: recusa RN-05 apontando o agendamento e orientando a cancelar o agendamento (SPEC-017); 1b. estado terminal: transição recusada; 1c. horário alheio: SPEC-003.

### 5.2 Publicar em lote (RF-023)

- **Fluxo principal:** para cada hora informada, o sistema executa a publicação da SPEC-010; acumula, por hora, sucesso ou recusa com motivo e regra.
- **Alternativos:** horas repetidas no mesmo lote: a segunda é recusada por RN-06; hora ou data fora do calendário: recusa de validação, sem publicar.
- **Resultado na tela:** quantos foram publicados e, para cada recusa, `hora (REGRA: motivo)`.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Cancelar horário livre nunca gera evento de reputação | contar eventos antes e depois | RF-022 |
| INV-002 | Horário com reserva ativa não é cancelado por esta via | tentar com reserva pendente | RN-05 |
| INV-003 | O lote nunca publica entrada que a publicação unitária recusaria | lote com sobreposição, repetição e hora inválida | RF-023, RN-06, RN-07 |
| INV-004 | Uma entrada recusada não impede as demais | contar horários criados | RF-023 |
| INV-005 | Hora e data são interpretadas exatamente como digitadas: valor fora do calendário é recusado | `25:00`, `10:75`, `31/02` | RNF-08 |

## 7. Modelo de domínio envolvido

`HorarioVago` (`estado`: `PUBLICADO → CANCELADO`), `Agendamento` (consulta de reserva ativa).

## 8. Impacto arquitetural

| Item | Impacto |
|---|---|
| Módulos | `aplicacao/horarios.js` (`cancelarHorarioLivre`, `publicarLote`), `dominio/tempo.js` (`deLocalParaUtc`), `interface/http/rotas/prestador.js` (relato do lote) |
| Frontend | campo de horas separadas por vírgula; aviso pós-redirect com o relato item a item |

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Cancelar horário livre | prestador; horário | horário `CANCELADO` | RN-05; transição inválida; titularidade |
| Publicar em lote | prestador; serviço; régua; data; horas | lista `{hora, ok, horario \| erro, regra}` | nenhum erro global: cada falha vai no item |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-11 | lote e relato funcionam por formulário, sem JavaScript | teste HTTP |

## 11. Critérios de aceitação

**CA-01** · **Dado** horário `PUBLICADO` sem reserva, **quando** o prestador o cancela, **então** ele vai a `CANCELADO`, sai da busca, sem penalidade e com registro.

**CA-02** · **Dado** horário com reserva ativa ou em estado terminal, **quando** o prestador tenta cancelá-lo por esta via, **então** a operação é recusada e o estado não muda; recusada a reserva, o cancelamento passa a valer.

**CA-03** · **Dado** um lote com entradas válidas e inválidas, **quando** o prestador o envia, **então** as válidas são publicadas e cada inválida é reportada com motivo e regra.

**CA-04** · **Dado** hora ou data fora do calendário, **quando** enviada, **então** é recusada como erro de validação, sem publicar em outro dia.

**CA-05** · **Dado** um lote pela tela, **então** o aviso mostra quantos foram publicados e cada recusa com a regra.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-AGENDA-01 \| RF-022: cancelar horario PUBLICADO o retira da busca, sem penalidade, com registro` | CA-01, INV-001 |
| `T-AGENDA-02 \| RF-022: horario que nao esta PUBLICADO nao e cancelado por essa via` | CA-02, INV-002 |
| `T-AGENDA-03 \| RF-023: o lote cria cada entrada valida e reporta cada recusa com a sua regra` | CA-03, INV-003, INV-004 |
| `T-AGENDA-04 \| RF-023: hora ou data fora do calendario e recusada, nunca transborda para outro dia` | CA-04, INV-005 |
| `T-AGENDA-05 \| RF-023: a tela do lote mostra cada recusa com a regra` | CA-05, RNF-11 |

**Evidência (registro etapa 47, 2026-10-30).** Todos em `tests/integracao/spec-012-agenda.test.js`, passando; complementam
`T-HORARIO-LOTE-01` e `T-HORARIO-CANCEL-01/02` (T-22, T-23). **Divergências corrigidas:** (1) `deLocalParaUtc` aceitava
`25:00` e `31/02`, que `Date.UTC` transborda para o dia seguinte: o horário era publicado **em outra data** sem aviso;
(2) a entrada inválida virava `TypeError`, ou seja, erro 500 sem regra, e agora é `ErroDeValidacao` no campo `hora`;
(3) o relato do lote mostrava a regra só da primeira recusa, e agora mostra a de cada uma.

## 13. Questões em aberto

- **Formato do lote:** a baseline não define limite de entradas nem se o lote cobre várias datas; hoje é uma data e N horas.
- **OPEN-09:** editar horário vago continua sem RF.

## 14. Definition of Done

1. a equipe aprovar este rascunho;
2. CA-01 a CA-05 e INV-001 a INV-005 com evidência automatizada (feito, §12);
3. nenhuma divergência conhecida com a baseline.
