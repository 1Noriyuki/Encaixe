# SPEC-028 — Busca por linguagem natural com LLM

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 seguem registradas para decisão posterior |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 28 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 · ADR-003 |

## 1. Identificação

- **ID:** SPEC-028
- **Nome:** Busca por linguagem natural com LLM
- **Objetivo:** o texto livre vira um objeto estruturado validado por esquema; com confiança baixa ou categoria inválida, o sistema pede confirmação **antes** de buscar. A busca em si é a da SPEC-013. A falha do provedor degrada para o formulário, e toda interpretação é persistida com o desfecho.
- **Valor entregue:** o cliente descreve o que precisa no próprio idioma, e o sistema continua decidindo.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-032 a RF-038 | spec §7.4 |
| RN | RN-29, RN-30, RN-31, RN-32 | spec §6 |
| RNF | RNF-05 (timeout), RNF-12 (portabilidade), RNF-13 (custo, P-21) | spec §8 |
| Caso de uso | UC-04 | spec §10.5 |
| Entidades | `InterpretacaoBusca`, `CategoriaServico`, `Regiao` | spec §9.2 |
| Invariantes globais | INV-14 | spec §9.8 |
| ADRs | ADR-003 | `docs/adr/` |
| Dependências | SPEC-013 | mapa §2 |

## 3. Escopo

### Incluído

1. Pedir ao provedor (atrás de `infra/llm/index.js`) a interpretação com saída por JSON Schema; validar o formato.
2. Usar a interpretação só como filtros da busca determinística (RN-29, INV-14).
3. Confiança abaixo de P-19 ou categoria fora do catálogo: mostrar o que foi entendido e **não executar a busca** até o cliente buscar com os filtros (aceita) ou corrigi-los (corrigida).
4. Falha, formato inválido ou timeout: avisar com RN-31, oferecer o formulário e registrar a falha; a busca por filtros segue.
5. Persistir texto, saída, confiança, modelo, status e desfecho; só o dono registra o desfecho.
6. Limitar as interpretações por usuário por dia (P-21).

### Fora do escopo

Provedor e esquema em si (T-61, ADR-003); a busca e a ordenação (SPEC-013); a tela de rastreabilidade (SPEC-029).

## 4. Dependências

SPEC-013; SPEC-027 (P-19, P-21).

## 5. Comportamento esperado

UC-04: (1) o cliente descreve; (2) o sistema interpreta; (3a) confiança suficiente e categoria do catálogo: busca com os filtros, desfecho `ACEITA`; (3b) confiança baixa ou categoria desconhecida: mostra o entendido, não busca, oferece "Buscar com estes filtros" (ou, sem categoria válida, a escolha no formulário); ao buscar, o desfecho vira `ACEITA` se categoria e região ficaram como propostas, ou `CORRIGIDA`; 2a. provedor indisponível: aviso RN-31, formulário, falha registrada.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | A lista exibida com filtros do modelo é idêntica à da busca manual com os mesmos filtros | comparar as duas | INV-14, RN-29 |
| INV-002 | Com confirmação pendente, nenhum horário é listado | tela antes de confirmar | RN-30 |
| INV-003 | Toda interpretação é persistida, inclusive a falha | contar registros | RN-32, RF-037 |
| INV-004 | Só o dono da interpretação registra o desfecho | outra pessoa tenta | RN-32 |
| INV-005 | Falha do provedor nunca impede a busca por filtros | provedor fora do ar | RN-31 |

## 7. Modelo de domínio envolvido

`InterpretacaoBusca` (`texto_original`, saída, `confianca`, `modelo`, `status` SUCESSO/BAIXA_CONFIANCA/FALHA, `desfecho` ACEITA/CORRIGIDA/DESCARTADA).

## 8. Impacto arquitetural

`aplicacao/busca.js` (`interpretar`, `registrarConfirmacao`), `infra/llm/` (contrato, simulado, anthropic), `interface/http/rotas/publicas.js` (`/buscar`: painel, estado de confirmação, campo oculto `interpretacao`).

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Interpretar | cliente?; texto | filtros propostos, `precisaConfirmar`, motivo | RNF-13 (limite P-21); falha vira `precisaFormulario`, nunca exceção |
| Registrar confirmação | interpretação; cliente; filtros usados | `ACEITA` ou `CORRIGIDA` | nenhum: interpretação alheia ou falha é ignorada |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-05 | teto real de espera, sem repetição | `T-LLM-ANTHROPIC-02` |
| RNF-12 | provedor injetável; simulado sem rede | dublês nos testes |
| RNF-13 | limite diário por usuário (P-21) | `RNF-13 \| o limite diario ...` |

## 11. Critérios de aceitação

**CA-01** · Interpretação confiável vira filtros, e a busca é a mesma da manual.

**CA-02** · Confiança baixa: a tela mostra o entendido e não lista horários até o cliente buscar com os filtros; aí o desfecho é `ACEITA`.

**CA-03** · Categoria fora do catálogo: a tela pede a categoria, não lista horários; escolhida outra, o desfecho é `CORRIGIDA`.

**CA-04** · Provedor fora do ar: aviso RN-31, formulário, falha registrada, busca por filtros funcionando.

**CA-05** · Toda interpretação fica registrada; o desfecho é do dono.

**CA-06** · Acima de P-21 interpretações no dia, a interpretação é recusada com RNF-13 e a busca por filtros segue.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-LLM-01 \| RN-29: a saida do modelo vira filtros e o sistema executa a busca` | CA-01 |
| `T-LLM-05 \| INV-14: a busca com os filtros do modelo e identica a busca manual` | CA-01, INV-001 |
| `T-LLM-02 / T-LLM-03 \| RN-30` (aplicação) | CA-02, CA-03 |
| `T-LLM-04 / 04b \| RN-31` (aplicação) | CA-04, INV-005 |
| `T-LLM-06 \| RN-32: toda interpretacao fica registrada com modelo, confianca e desfecho` | CA-05, INV-003 |
| `RNF-13 \| o limite diario de interpretacoes protege o custo` | CA-06 |
| `T-LLM-ANTHROPIC-01..03` (T-61) | RF-032, RF-038 |
| `T-LLM-07 \| RN-30/RF-035: confianca baixa mostra os filtros e nao executa a busca antes da confirmacao` | CA-02, INV-002 |
| `T-LLM-08 \| RN-30/RF-036: categoria fora do catalogo pede a escolha, sem buscar, e a escolha vira CORRIGIDA` | CA-03, INV-002 |
| `T-LLM-09 \| RN-32: so o dono registra o desfecho da propria interpretacao` | CA-05, INV-004 |
| `T-LLM-10 \| RN-31/RF-037: com o provedor fora do ar a tela avisa, oferece o formulario e a busca por filtros roda` | CA-04, INV-003, INV-005 |

**Evidência (registro etapa 59, 2026-10-30).** `T-LLM-01` a `06` em `busca-llm.test.js`, `07` a `10` em
`spec-028-busca-llm-tela.test.js`, os de provedor em `unidade/llm-anthropic.test.js`; todos passam. **Divergências
corrigidas:** (1) **RN-30:** a tela avisava "confira os filtros", mas executava a busca assim mesmo; com categoria
desconhecida, listava todas as categorias. Os testes de aplicação só conferiam a flag `precisaConfirmar`. Agora nada é
listado até o cliente buscar com os filtros ou corrigi-los. (2) **RN-32:** `registrarConfirmacao()` não era chamada por
nenhuma rota; o desfecho ficava o palpite gravado na criação. Agora a busca seguinte decide `ACEITA` ou `CORRIGIDA` pela
comparação dos filtros, e só para o dono. Conferido no navegador a 375 px.

## 13. Questões em aberto

- **Desfecho antes da confirmação:** a RN-32 tem aceita, corrigida e descartada; não há "pendente". Hoje a interpretação que pede confirmação nasce `CORRIGIDA` e é ajustada quando o cliente busca; se ele abandona, fica `CORRIGIDA`. Proposta: `DESCARTADA` para quem não confirma.
- **Reinterpretação a cada filtro:** com descrição no formulário, aplicar outro filtro reenvia o texto ao provedor e gasta uma interpretação do P-21.

## 14. Definition of Done

1. a equipe aprovar este rascunho e decidir o desfecho pendente;
2. CA-01 a CA-06 e INV-001 a INV-005 com evidência automatizada (feito, §12).
