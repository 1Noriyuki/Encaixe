# SPEC-029 — Trilha de auditoria consultável pelo admin

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 seguem registradas para decisão posterior |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 29 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 · ADR-003 |

## 1. Identificação

- **ID:** SPEC-029
- **Nome:** Trilha de auditoria consultável pelo admin
- **Objetivo:** registrar as ações administrativas e as interpretações do LLM e permitir que o admin reconstrua por que um resultado foi exibido ou uma decisão foi tomada.
- **Valor entregue:** reconstrução ponta a ponta de qualquer desfecho (C-IX).

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-084 (consulta), RF-085 | spec §7.9 |
| RN | RN-32 | spec §6 |
| RNF | RNF-07 | spec §8 |
| Histórias | US-45 | spec §5.2 |
| Entidades | `LogAuditoria`, `InterpretacaoBusca` | spec §9.2 |
| Invariantes globais | INV-13 | spec §9.8 |
| ADRs | ADR-003 | `docs/adr/` |
| Dependências | SPEC-001 (gravação da trilha), SPEC-023, SPEC-025, SPEC-028 | mapa §2 |

## 3. Escopo

### Incluído

1. Toda transição das cinco entidades do RF-084 (agendamento, horário, conta, disputa, comissão) com ator, instante, estados e correlação.
2. Toda ação administrativa com o admin como ator.
3. Tela `/admin/auditoria`: trilha recente com ação, entidade, estados, ator e correlação; filtro por correlação, que mostra tudo o que uma requisição gravou.
4. Interpretações recentes com texto, categoria, região e janela interpretadas, confiança, status, desfecho e modelo, e a taxa de qualidade da extração.
5. Histórico por entidade nos detalhes (agendamento, dossiê da conta).

### Fora do escopo

A gravação de cada transição em si (SPEC-001 e cada Spec produtora); exportação da trilha.

## 4. Dependências

SPEC-001, SPEC-003 (só admin), SPEC-023, SPEC-025, SPEC-028.

## 5. Comportamento esperado

O admin abre a auditoria e vê o que aconteceu, quem fez e em que operação; clica numa correlação e vê só aquela operação, na ordem; para uma busca com LLM, vê o texto e os filtros extraídos, o suficiente para refazer a busca determinística (INV-14).

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Nenhuma transição das cinco entidades acontece sem registro | varredura por gatilho em todos os fluxos | INV-13, RF-084 |
| INV-002 | Toda ação administrativa tem o admin como ator | cada ação do admin | RF-085, OPEN-104 |
| INV-003 | Toda interpretação tem registro com o cliente como ator | interpretação | RF-085, RN-32 |
| INV-004 | Uma correlação reúne só os registros da mesma operação | filtro pela tela | RNF-07 |

## 7. Modelo de domínio envolvido

`log_auditoria` (`ator_id`, `acao`, `entidade_tipo`, `entidade_id`, `estado_anterior`, `estado_novo`, `detalhe`, `correlacao_id`, `criado_em`), `interpretacao_busca`.

## 8. Impacto arquitetural

`infra/auditoria.js` (`registrar`, `historicoDe`, `recentes`, `daCorrelacao`, `comCorrelacao`), `infra/repositorios/interpretacoes.js` (`recentes` com região), `aplicacao/admin.js` (`rastreabilidade`), `interface/http/rotas/admin.js` (`telaAuditoria`).

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Rastreabilidade | admin; limite; correlação? | trilha, interpretações, estatísticas | autorização |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-07 | correlação por requisição, sem mistura entre requisições | `T-AUDIT-03`, `03b`, `08` |

## 11. Critérios de aceitação

**CA-01** · Toda transição das cinco entidades tem registro com ator e estados.

**CA-02** · Toda ação administrativa fica registrada com o admin como ator.

**CA-03** · A tela mostra ator e correlação e filtra por correlação.

**CA-04** · A interpretação aparece com texto, categoria, região, janela, confiança e modelo, e o registro tem o cliente como ator.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-AUDIT-01..04` (SPEC-001) | CA-01, RNF-07 |
| `T-AUDIT-05 / 06 / 07 \| INV-13` (T-67), agora com o lançamento de comissão na varredura | CA-01, INV-001 |
| `T-AUDIT-08 \| RF-084/RNF-07: a tela da auditoria mostra ator e correlacao e filtra por ela` | CA-03, INV-004 |
| `T-AUDIT-09 \| RF-085: toda acao administrativa deixa registro com o admin como ator` | CA-02, INV-002 |
| `T-AUDIT-10 \| RF-085/RN-32: a interpretacao aparece na tela com o que permite refazer a busca` | CA-04, INV-003 |
| `T-LLM-06 \| RN-32` | CA-04 |

**Evidência (registro etapa 60, 2026-10-30).** Todos passam. **Divergências corrigidas:** (1) a varredura do INV-13 não
incluía o lançamento de comissão, que o RF-084 lista; incluída, sem falha (a comissão já auditava por
`aplicacao/comissao.js`). (2) A tabela de interpretações não mostrava região nem janela, sem as quais não se refaz a busca
que o cliente viu; as duas colunas entraram. As correções de tela da etapa 42 (correlação) também valem para esta Spec.

## 13. Questões em aberto

- **Período e paginação da trilha:** a tela mostra os 120 registros mais recentes e as 30 interpretações mais recentes; a baseline não define período, busca ou paginação.
- **Retenção:** não há política de retenção da trilha nem das interpretações (texto livre do cliente).

## 14. Definition of Done

1. a equipe aprovar este rascunho e decidir paginação e retenção;
2. CA-01 a CA-04 e INV-001 a INV-004 com evidência automatizada (feito, §12).
