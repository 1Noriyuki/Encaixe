# SPEC-027 — Administração dos parâmetros do domínio

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 seguem registradas para decisão posterior |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 27 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 |

## 1. Identificação

- **ID:** SPEC-027
- **Nome:** Administração dos parâmetros do domínio
- **Objetivo:** o admin altera os parâmetros globais da spec §6.1 dentro da faixa validada, sem deploy, com vigência só para fatos futuros.
- **Valor entregue:** as regras são ajustáveis sem programador, e a história não é reescrita.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | nenhum RF próprio (OPEN-09) | mapa §3 |
| RN | RN-00 | spec §6 |
| RNF | RNF-10 | spec §8 |
| Caso de uso | UC-14 (extensão), sem UC dedicado | spec §10 |
| Entidades | `ParametroSistema` (`parametro`, `parametro_historico`) | spec §9.2 |
| Dependências | SPEC-001 (catálogo, faixas, vigência), SPEC-003 (só admin) | mapa §2 |

## 3. Escopo

### Incluído

1. Tela `/admin/parametros` com um formulário por parâmetro global da §6.1, mostrando o identificador, a faixa e a unidade.
2. Validação da faixa (RN-00) com recusa que cita o parâmetro e a faixa.
3. Gravação com vigência a partir de agora, histórico e auditoria na mesma transação.
4. Parâmetros de escopo `P` (P-01, P-02) mostrados como informação: quem os edita é o prestador (SPEC-009).
5. P-13 por categoria no bloco de comissão (SPEC-026).

### Fora do escopo

Faixas, padrões e leitura vigente dos parâmetros (SPEC-001); percentual por categoria (SPEC-026).

## 4. Dependências

SPEC-001, SPEC-003, SPEC-026.

## 5. Comportamento esperado

O admin abre a tela, altera um valor e salva. Dentro da faixa: o valor passa a valer na hora, para fatos ocorridos depois; a tela confirma com RN-00 e a trilha registra antes e depois com o admin. Fora da faixa: recusa com RN-00, o identificador e a faixa; nada muda.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Todo parâmetro global da §6.1 é editável pela tela, com o identificador da spec | ler a tabela da spec e comparar | RNF-10 |
| INV-002 | Valor fora da faixa nunca é gravado | limites de cada parâmetro | RN-00 |
| INV-003 | Alteração não retroage | leitura no instante anterior | RN-00 |
| INV-004 | Alteração e auditoria são uma unidade | falha simulada na auditoria | RNF-07 |

## 7. Modelo de domínio envolvido

`parametro` (valor vigente), `parametro_historico` (valor e `vigente_desde`), catálogo `PARAMETROS` em `dominio/parametros.js`.

## 8. Impacto arquitetural

`dominio/parametros.js` (catálogo e faixas), `aplicacao/parametros.js` (`salvarGlobal`), `aplicacao/admin.js` (`ajustarParametro`), `interface/http/rotas/admin.js` (`telaParametros`).

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Ajustar parâmetro | admin; chave; valor | valor normalizado vigente | RN-00 (faixa, com o identificador), autorização |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-10 | regra ajustável sem deploy | `T-PARAM-TELA-01`: a busca usa o P-04 novo sem reinício |

## 11. Critérios de aceitação

**CA-01** · Todo parâmetro global da §6.1 tem formulário, com o identificador da spec.

**CA-02** · Valor dentro da faixa vale na hora, sem reinício, e não retroage.

**CA-03** · Valor fora da faixa é recusado com RN-00, o identificador e a faixa.

**CA-04** · Falha na auditoria desfaz a alteração.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-PARAM-01..08` (SPEC-001) | CA-02, CA-03, INV-002, INV-003 |
| `T-PARAM-TELA-01 \| RN-00: o admin altera P-04 pela tela e a busca usa o valor novo sem reinicio` | CA-02 |
| `T-PARAM-TELA-02 \| RN-00: valor fora da faixa pela tela e recusado com a regra e nada muda` | CA-03 |
| `T-PARAM-09 \| RN-00: falha na auditoria desfaz a alteracao do parametro` | CA-04, INV-004 |
| `T-PARAM-10 \| RN-00: todo parametro global da §6.1 tem formulario na tela do admin` | CA-01, INV-001 |
| `T-PARAM-11 \| RN-00: o limite de interpretacoes e identificado como P-21, como na spec` | CA-01, CA-03 |

**Evidência (registro etapa 58, 2026-10-30).** Todos passam; `T-PARAM-10` lê a tabela da §6.1 do próprio `docs/spec.md`,
então um parâmetro novo na spec sem formulário quebra a suíte. **Divergência corrigida:** o limite de interpretações por
dia era identificado como `RNF-13` no catálogo, na tela e na mensagem de faixa; desde a spec v0.1.7 ele é o parâmetro
P-21 (a recusa por excesso continua citando o RNF-13, que é o requisito).

## 13. Questões em aberto

- **OPEN-09:** a edição de parâmetros pelo admin não tem RF.
- **P-11:** a spec tem uma linha com dois valores (normal / restrito); o código os identifica como P-11a e P-11b, como a spec já fez com P-12 e P-16. Propor o desdobramento na §6.1.

## 14. Definition of Done

1. a equipe aprovar este rascunho e decidir OPEN-09;
2. CA-01 a CA-04 e INV-001 a INV-004 com evidência automatizada (feito, §12).
