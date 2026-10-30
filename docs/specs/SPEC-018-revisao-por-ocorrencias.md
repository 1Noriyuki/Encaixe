# SPEC-018 — Revisão automática por ocorrências do prestador

| Campo | Valor |
|---|---|
| Versão | 1.1.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 foram decididas na etapa 63, o que completa a Definition of Done |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 18 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 |

## 1. Identificação

- **ID:** SPEC-018
- **Nome:** Revisão automática por ocorrências do prestador
- **Objetivo:** com P-12a ocorrências negativas em P-12b dias, a conta do prestador vai para `EM_REVISAO`, perde o direito de publicar, sai da busca e entra na fila do admin. Agendamentos confirmados são preservados.
- **Valor entregue:** a plataforma detecta sozinha o prestador que está queimando clientes.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-056 | spec §7.7 |
| RN | RN-21 | spec §6 |
| RNF | RNF-07 | spec §8 |
| Caso de uso | UC-08 (alternativo 7a), UC-13 (gatilho) | spec §10 |
| Entidades | `Usuario`, `EventoReputacao` | spec §9.2 |
| Parâmetros | P-12a (padrão 3), P-12b (padrão 30 dias) | spec §6.1 |
| Dependências | SPEC-017; SPEC-019 acrescenta o no-show como fonte | mapa §2 |

## 3. Escopo

### Incluído

1. Contar, para o prestador, eventos `CANCELAMENTO_PARCIAL`, `CANCELAMENTO_TOTAL` e `NO_SHOW` não revertidos dentro de P-12b.
2. Ao atingir P-12a: `EM_REVISAO`, auditoria com a regra, aviso ao prestador; a conta aparece na fila com motivo RN-21.
3. Efeitos: não publica (RN-21), os horários publicados saem da busca (RF-030), os agendamentos confirmados seguem.
4. Verificar depois de cada fonte de ocorrência: cancelamento do prestador, no-show do prestador e desfecho de disputa que o declara ausente.

### Fora do escopo

Decisão do admin sobre a conta (SPEC-025); revisão por reputação (RN-22, SPEC-006).

## 4. Dependências

SPEC-006 (livro-razão), SPEC-017 (cancelamento), SPEC-019 (no-show), SPEC-023 (reversão por disputa).

## 5. Comportamento esperado

Depois de gravar a ocorrência (fora da transação que a gerou), o sistema conta as ocorrências da janela; abaixo de P-12a nada muda; ao atingir, e se a conta pode ir a `EM_REVISAO`, aplica a transição com ator sistema, registra `PRESTADOR_EM_REVISAO_POR_OCORRENCIAS` com a contagem e avisa o prestador. Conta já em revisão, suspensa ou que não é de prestador não é tocada.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Só ocorrência dentro de P-12b e não revertida conta | ocorrência antiga e revertida | RN-21, RN-27 |
| INV-002 | A regra vale só para prestador | cliente com ausências repetidas | RN-21 |
| INV-003 | Em revisão, nenhuma publicação nova e nenhum horário na busca | publicar e buscar | RN-21, RF-030 |
| INV-004 | Agendamento já confirmado segue até o desfecho | concluir depois da revisão | RF-056 |
| INV-005 | P-12a e P-12b vêm dos parâmetros | alterar P-12a | RN-00 |

## 7. Modelo de domínio envolvido

`Usuario.estado_conta` (`ATIVO → EM_REVISAO`), `EventoReputacao` (`tipo`, `criado_em`, `revertido_em`).

## 8. Impacto arquitetural

`aplicacao/reputacao.js` (`verificarOcorrenciasDoPrestador`), `infra/repositorios/agendamentos.js` (`contarOcorrenciasNegativas`), chamadas em `agendamentos.cancelar`, `registrarNoShow` e `disputas.aplicarEfeitosDe`.

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Verificar ocorrências | prestador | `{ total, emRevisao }` | nenhum: conta não elegível é ignorada |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-07 | transição auditada com a contagem e a regra | `T-AUDIT-07`, `T-CONTA-REVISAO-01b` |

## 11. Critérios de aceitação

**CA-01** · **Dado** P-12a ocorrências na janela, **então** a conta vai a `EM_REVISAO` e entra na fila com motivo RN-21.

**CA-02** · **Dado** prestador em revisão, **então** não publica, seus horários saem da busca e o confirmado é concluído normalmente.

**CA-03** · **Dado** ocorrência fora da janela ou revertida, **então** não conta; alterar P-12a muda o limiar.

**CA-04** · **Dado** cliente com ausências repetidas, **então** esta regra não o move.

**CA-05** · **Dado** cancelamento livre, **então** não é ocorrência.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-REVISAO-01 \| RN-21: tres cancelamentos com penalidade levam o prestador a revisao` | CA-01 |
| `RN-21: cancelamento livre nao conta como ocorrencia negativa` | CA-05 |
| `T-CONTA-REVISAO-01b \| RF-078/RN-21: prestador sinalizado por ocorrencias mostra a contagem e o historico` | CA-01 |
| `T-REVISAO-06 \| RF-056: em revisao, o prestador sai da busca e da publicacao, e o confirmado continua valendo` | CA-01, CA-02, INV-003, INV-004 |
| `T-REVISAO-04 \| RN-21: so conta ocorrencia dentro de P-12b e nao revertida; P-12a vem do parametro` | CA-03, INV-001, INV-005 |
| `T-REVISAO-05 \| RN-21: cliente nunca entra em revisao por esta regra` | CA-04, INV-002 |

**Evidência (registro etapa 53, 2026-10-30).** `T-REVISAO-01` e o caso da faixa livre em `penalidades.test.js`,
`T-CONTA-REVISAO-01b` em `telas-admin.test.js`, `T-REVISAO-04` a `06` em `spec-018-revisao-ocorrencias.test.js`; todos
passam. **Divergência corrigida:** `verificarOcorrenciasDoPrestador()` não conferia o perfil; os chamadores atuais só a
usam para prestador, mas a função moveria um cliente para revisão "sem poder publicar" se chamada para ele.

## 13. Questões decididas

1. **"Consecutivas":** Decidida em 2026-10-30 (etapa 63): a contagem é acumulada na janela P-12b, como fazem a RN-21 e o código. O rótulo da P-12a e o título da RN-21 foram corrigidos na spec v0.1.11; a chave `ocorrencias_consecutivas_max` fica, porque é a gravada na tabela `parametro`.
2. **Depois da reativação:** Decidida em 2026-10-30 (etapa 63): a reativação pelo admin (RF-079) recomeça a contagem: só contam as ocorrências posteriores a ela, porque as anteriores já foram julgadas. Teste: `T-SPEC018-Q2`.

As decisões foram aprovadas pela equipe e registradas em `registro-sdd.md`, etapa 63.

## 14. Definition of Done

1. a equipe aprovar este rascunho e decidir as duas questões;
2. CA-01 a CA-05 e INV-001 a INV-005 com evidência automatizada (feito, §12).
