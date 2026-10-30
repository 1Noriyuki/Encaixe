# SPEC-010 — Publicação de horário vago

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 seguem registradas para decisão posterior |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 10 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 · ADR-002 |

## 1. Identificação

- **ID:** SPEC-010
- **Nome:** Publicação de horário vago
- **Objetivo:** o prestador elegível publica um horário com antecedência mínima P-03, sem sobreposição com outro horário ativo, herdando duração e preço do serviço e congelando esses valores no horário.
- **Valor entregue:**
  - **Ao prestador:** o buraco na agenda vira oferta em poucos passos.
  - **Ao sistema:** toda oferta nasce coerente (cumprível, sem conflito, com preço próprio) e rastreável.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-014, RF-015, RF-016 | spec §7.3 |
| RN | RN-06, RN-07 (publicação), RN-08, RN-21 (só a leitura de `EM_REVISAO`) | spec §6 |
| RNF | RNF-08, RNF-11 | spec §8 |
| Histórias | US-07, US-08 | spec §5.2 |
| Caso de uso | UC-02 (passos 1–4 e 7; exceções 1a, 3a, 4a) | spec §10.3 |
| Entidades | `HorarioVago`, `Servico`, `ReguaDesconto` | spec §9.2 |
| Invariantes globais | INV-02, INV-13 | spec §9.8 |
| ADRs | ADR-002 (snapshots no horário) | `docs/adr/` |
| Dependências | SPEC-009 (perfil completo e elegibilidade), SPEC-008 (régua válida), SPEC-001 (P-03, máquina do horário, auditoria) | mapa §2 |

## 3. Escopo

### Incluído

1. Publicar um horário informando serviço, régua, data e hora, no fuso do usuário.
2. Recusar publicação de prestador que não esteja `ATIVO`, com a regra que barrou (RN-08, RN-21, RN-28).
3. Recusar antecedência menor que P-03, informando o mínimo.
4. Recusar sobreposição com horário ativo (`PUBLICADO`, `BLOQUEADO`, `OCUPADO`) do mesmo prestador, identificando o conflito.
5. Gravar no horário a duração, o preço-base e o preço mínimo do serviço no momento da publicação.
6. Registrar a publicação na trilha de auditoria.

### Fora do escopo

| Comportamento | Onde fica |
|---|---|
| Cálculo do preço vigente e projeção da régua (UC-02 passo 8) | SPEC-011 |
| Validação e cadastro da régua (UC-02 passos 5–6, alternativo 5a) | SPEC-008 |
| Publicação em lote e cancelamento de horário livre | SPEC-012 |
| Edição de horário reservado (RF-017) | SPEC-014 |
| "Editar horário vago" previsto na matriz §4.5 | OPEN-09 |

## 4. Dependências

| Tipo | Item |
|---|---|
| Specs anteriores | SPEC-001, SPEC-008, SPEC-009 |
| Decisões | OPEN-10 (régua do prestador escolhida por horário), OPEN-15 (sem `RASCUNHO`: o horário nasce `PUBLICADO`) |

## 5. Comportamento esperado

### 5.1 Publicar

- **Pré-condições:** prestador autenticado, conta `ATIVO`, perfil completo (RN-08), serviço e régua próprios.
- **Fluxo principal:**
  1. Prestador escolhe serviço, régua, data e hora.
  2. O sistema converte data e hora locais para UTC.
  3. Valida antecedência ≥ P-03 (RN-07).
  4. Valida que `[início, início + duração)` não cruza outro horário ativo dele (RN-06).
  5. Cria o horário em `PUBLICADO` com os snapshots do serviço e registra `HORARIO_PUBLICADO`.
- **Exceções:**
  - 1a. Conta `PENDENTE_APROVACAO` (RN-28), `EM_REVISAO` (RN-21) ou outra fora de `ATIVO` (RN-08): recusa com a regra.
  - 1b. Perfil incompleto: recusa listando o que falta (RN-08, RF-011).
  - 3a. Antecedência insuficiente: recusa com a antecedência mínima vigente.
  - 4a. Sobreposição: recusa com o horário conflitante.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Horário publicado nunca tem antecedência menor que o P-03 vigente na publicação | publicar um minuto antes e exatamente no limite | RN-07 |
| INV-002 | Dois horários ativos do mesmo prestador não se sobrepõem, barrado no domínio **e** no banco | publicação sobreposta e gravação direta | RN-06, INV-02 |
| INV-003 | Duração e preços do horário não mudam quando o serviço muda depois | editar o serviço após publicar | ADR-002 |
| INV-004 | Só prestador `ATIVO` com perfil completo publica | publicar em cada estado de conta | RN-08, RN-21 |
| INV-005 | Toda publicação aceita deixa registro com o prestador como ator | inspecionar a trilha | INV-13 |

## 7. Modelo de domínio envolvido

| Entidade | Atributos relevantes | Restrições |
|---|---|---|
| `HorarioVago` | `prestador_id`, `servico_id`, `regua_id`, `inicio` (UTC), `duracao_min`, `preco_base_snapshot`, `preco_minimo_snapshot`, `estado` | nasce `PUBLICADO`; gatilho `horario_sem_sobreposicao` |
| `Servico` | `duracao_min`, `preco_base`, `preco_minimo` | copiados no horário |
| `ReguaDesconto` | `prestador_id`, faixas | do mesmo prestador, com ao menos uma faixa |

## 8. Impacto arquitetural

| Item | Impacto |
|---|---|
| Módulos | `aplicacao/horarios.js` (`publicar`), `dominio/reserva.js` (antecedência e sobreposição), `aplicacao/contas.js` (`assegurarPodePublicar`), `infra/db/schema.sql` (gatilho) |
| Frontend | formulário em `/prestador/horarios`, sem depender de JavaScript |
| ADRs | ADR-001, ADR-002 |

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Publicar | prestador; serviço; régua; data; hora | horário `PUBLICADO` | RN-08/RN-21/RN-28 (conta), RN-07 (antecedência), RN-06 (conflito, com o horário), validação de serviço ou régua |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-08 | início gravado em UTC a partir do horário local | conversão no teste de publicação |
| RNF-11 | publicação por formulário, sem JavaScript, com a regra na recusa | teste HTTP |

## 11. Critérios de aceitação

**CA-01 — Publicação** · **Dado** prestador elegível, **quando** publica um horário válido, **então** ele nasce `PUBLICADO` com duração e preços do serviço e fica auditado.

**CA-02 — Snapshot** · **Dado** horário publicado, **quando** o serviço é editado, **então** o horário mantém os valores da publicação.

**CA-03 — Antecedência** · **Dado** início a menos de P-03, **quando** o prestador publica, **então** recebe recusa RN-07 com o mínimo; exatamente P-03 é aceito; alteração de P-03 vale para a próxima publicação.

**CA-04 — Sobreposição** · **Dado** horário ativo, **quando** outro cruza seu intervalo, **então** a publicação é recusada com o conflitante; encostar na borda e cruzar um horário inativo é permitido.

**CA-05 — Barreira no banco** · **Dado** gravação sobreposta que não passa pelo domínio, **então** o banco a recusa.

**CA-06 — Elegibilidade** · **Dado** conta `EM_REVISAO`, `SUSPENSO` ou pendente, **quando** publica, **então** a recusa cita a regra; reativada, publica.

**CA-07 — Tela** · **Dado** o formulário, **quando** enviado sem JavaScript, **então** publica, e a recusa mostra a regra.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-PUBLICACAO-01 \| RF-014: horario nasce PUBLICADO herdando duracao e preco do servico` | CA-01, INV-005 |
| `T-PUBLICACAO-02 \| RF-014: editar o servico depois nao muda o horario ja publicado` | CA-02, INV-003 |
| `T-PUBLICACAO-03 \| RF-015/RN-07: antecedencia abaixo de P-03 e recusada informando o minimo` | CA-03, INV-001 |
| `T-PUBLICACAO-04 \| RF-016/RN-06: sobreposicao e recusada identificando o conflito` | CA-04, INV-002 |
| `T-PUBLICACAO-05 \| INV-02: o banco recusa horario sobreposto gravado por fora do dominio` | CA-05, INV-002 |
| `T-PUBLICACAO-06 \| RN-08/RN-21: conta fora de ATIVO nao publica, com a regra que barrou` | CA-06, INV-004 |
| `T-PUBLICACAO-07 \| RNF-11: publicar pelo formulario funciona sem JavaScript e mostra a regra na recusa` | CA-07, RNF-11 |

**Evidência (registro etapa 46, 2026-10-30).** Todos em `tests/integracao/spec-010-publicacao.test.js`, passando.
Complementam: `T-HORARIO-01/01b/02/02b` (unidade, `dominio/reserva.js`), `T-PUBLICAR-01/02` (RF-011, SPEC-009),
`T-CONTA-02d` (pendente, SPEC-005). **Divergência corrigida:** INV-02 só existia no domínio; o gatilho
`horario_sem_sobreposicao` (`schema.sql`) passa a recusá-la também no banco, como a constituição exige.

## 13. Questões em aberto

- **OPEN-09:** a matriz §4.5 dá ao prestador "editar horário vago", sem RF nem UC. Hoje não há edição: o prestador cancela o horário livre (SPEC-012) e publica outro.
- **Granularidade do horário:** a baseline não fixa passo de minutos para a hora de início; o formulário aceita qualquer `HH:MM`.

## 14. Definition of Done

1. a equipe aprovar este rascunho;
2. CA-01 a CA-07 e INV-001 a INV-005 com evidência automatizada (feito, §12);
3. INV-02 barrado no domínio e no banco (feito);
4. nenhuma divergência conhecida com a baseline.
