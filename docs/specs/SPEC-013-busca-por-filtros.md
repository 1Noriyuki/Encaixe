# SPEC-013 — Busca de horários por filtros

| Campo | Valor |
|---|---|
| Versão | 1.1.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 foram decididas na etapa 63, o que completa a Definition of Done |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 13 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.10 |

## 1. Identificação

- **ID:** SPEC-013
- **Nome:** Busca de horários por filtros
- **Objetivo:** busca pública por categoria, região e janela, que mostra só horários elegíveis, com preço vigente, e ordena de forma determinística com desempate pelo identificador do horário.
- **Valor entregue:** o cliente encontra o encaixe; é também a busca que a SPEC-028 reaproveita quando o LLM interpreta o texto.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-028, RF-029, RF-030, RF-031 | spec §7.4 |
| RN | RN-07 (P-04 na reserva), RN-28 (prestador não `ATIVO` fica fora); RN-01/RN-03 pelo preço (SPEC-011) | spec §6 |
| RNF | RNF-05 (até 2 s), RNF-11 | spec §8 |
| Histórias | US-16, US-17 | spec §5.2 |
| Caso de uso | UC-03 | spec §10.4 |
| Entidades | `HorarioVago`, `CategoriaServico`, `Regiao`, `Usuario` | spec §9.2 |
| Invariantes globais | INV-14 (a seleção não depende do LLM) | spec §9.8 |
| Dependências | SPEC-006 (reputação), SPEC-011 (preço vigente) | mapa §2 |

## 3. Escopo

### Incluído

1. Filtros de categoria, região e janela, todos opcionais; sem janela, as próximas 24 h (UC-03 1a).
2. Elegibilidade: `PUBLICADO`, início ≥ agora + P-04, prestador `ATIVO`; só o que ainda é reservável pelo preço.
3. Ordenação por proximidade, menor preço, maior desconto ou melhor reputação, sempre com desempate pelo id.
4. Estado vazio que diz a janela consultada e oferece saída (UC-03 2a).
5. Tudo por formulário GET, sem JavaScript.

### Fora do escopo

| Comportamento | Onde fica |
|---|---|
| Cálculo do preço vigente, piso e projeção | SPEC-011 |
| Interpretação de texto livre | SPEC-028 |
| Reserva | SPEC-014 |

## 4. Dependências

SPEC-006, SPEC-011; SPEC-001 (P-04).

## 5. Comportamento esperado

- **Pré-condições:** nenhuma; a busca é pública.
- **Fluxo principal:** (1) o cliente escolhe categoria, região, janela e ordenação; (2) o sistema seleciona os horários elegíveis da janela, a partir de agora + P-04; (3) precifica cada um e descarta os não reserváveis; (4) ordena pelo critério, desempatando pelo id; (5) exibe preço-base, preço vigente, desconto, reputação e o próximo degrau.
- **Alternativos:** 1a. sem janela: próximas 24 h; 1b. janela da descrição (SPEC-028) vale até o cliente escolher outra no formulário; 4a. trocar a ordenação não consulta o LLM.
- **Exceções:** 2a. nenhum resultado: estado vazio com a janela consultada e o caminho para ampliar a busca, sem trazer outra categoria.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Só aparece horário `PUBLICADO`, de prestador `ATIVO`, com início ≥ agora + P-04 | horários cancelados, de conta não ativa e no limite | RF-029, RF-030 |
| INV-002 | A mesma busca, repetida, devolve a mesma ordem | leituras sucessivas com empates em todos os critérios | RF-031 |
| INV-003 | Sem janela informada, o recorte é de 24 h | horário a 23 h e a 25 h | UC-03 1a |
| INV-004 | Nenhuma parte da seleção depende do LLM | a busca por filtros não chama o provedor | INV-14 |

## 7. Modelo de domínio envolvido

`HorarioVago` (estado, início), `Usuario` (estado e reputação do prestador), `CategoriaServico`, `Regiao`.

## 8. Impacto arquitetural

| Item | Impacto |
|---|---|
| Módulos | `aplicacao/busca.js` (`buscarPorFiltros`, `JANELA_PADRAO_H`, `JANELAS_H`), `infra/repositorios/horarios.js` (`buscar`), `interface/http/rotas/publicas.js` (`/buscar` e contador da home) |
| Frontend | formulário GET com categoria, região, "Quando" e ordenação; filtros ativos removíveis |

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Buscar | categoria?, região?, janela (`de`/`ate` ou horas)?, ordenação | lista precificada e ordenada | nenhum: filtro inválido resulta em lista vazia ou no padrão |

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta | Verificação |
|---|---|---|
| RNF-05 | resposta em até 2 s | 131 horários em 72 h, nos quatro critérios, pela rota |
| RNF-11 | formulário sem JavaScript e utilizável em 320 px | teste HTTP; conferência visual a 375 px sem rolagem lateral |

## 11. Critérios de aceitação

**CA-01** · **Dado** horários de várias categorias, regiões e horas, **quando** o cliente filtra, **então** vêm só os compatíveis e elegíveis.

**CA-02** · **Dado** horários cancelados, de prestador fora de `ATIVO` ou a menos de P-04, **então** não aparecem.

**CA-03** · **Dado** empate no critério, **então** o menor id vem antes, em todos os critérios e em leituras repetidas.

**CA-04** · **Dado** busca sem janela, **então** o recorte é de 24 h; com janela escolhida, vale a escolhida.

**CA-05** · **Dado** nenhum resultado, **então** a tela diz a janela consultada e oferece ampliar a busca.

**CA-06** · **Dado** o volume do MVP, **então** a resposta vem em até 2 s.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-BUSCA-02 \| RF-029: horario dentro da antecedencia minima some da busca` | CA-02 |
| `T-BUSCA-03 \| RF-028 a RF-030: filtros de categoria, regiao e janela e oferta elegivel` | CA-01, INV-001 |
| `T-BUSCA-03b \| RF-029/RF-030: busca respeita P-04 e exclui prestador inativo` | CA-02, INV-001 |
| `T-BUSCA-04 \| RF-031: empate na ordenacao por proximidade usa id estavel` | CA-03 |
| `T-BUSCA-04b \| RF-031: empate em preco, desconto e reputacao cai no id, nao no inicio` | CA-03, INV-002 |
| `T-BUSCA-05 \| UC-03 1a: sem janela informada, a busca olha as proximas 24 h` | CA-04, INV-003 |
| `T-BUSCA-06 \| RF-028: o formulario oferece a janela e a busca respeita a escolhida` | CA-01, CA-04 |
| `T-BUSCA-07 \| UC-03 2a: sem resultado, a tela diz a janela consultada e oferece saida` | CA-05 |
| `T-BUSCA-08 \| RNF-05: a busca responde em ate 2 s com volume acima do esperado no MVP` | CA-06 |

**Evidência (registro etapa 48, 2026-10-30).** `T-BUSCA-02` em `fluxo-principal.test.js`, `03` a `04b` em `trilha-b.test.js`
(T-28, T-29), `05` a `08` em `spec-013-busca.test.js`; todos passam. INV-004: `busca-llm.test.js` prova a busca com o
provedor fora do ar. **Divergências corrigidas:** (1) **UC-03 1a:** sem janela, o código olhava 72 h, não as 24 h da
baseline; a home dizia "próximas 72 h" pelo mesmo motivo. (2) **RF-028:** o formulário não tinha campo de janela, que só
chegava pela descrição em texto livre; agora há "Quando" (6, 12, 24, 48 ou 72 h).

## 13. Questões decididas

1. **Corte de 200:** Decidida em 2026-10-30 (etapa 63): a busca ordena a janela inteira e só então corta os 200 exibidos. O repositório deixou de limitar antes da ordenação, e o corte virou `LIMITE_EXIBIDOS` na aplicação. Teste: `T-SPEC013-Q1`.
2. **Janelas oferecidas:** Decidida em 2026-10-30 (etapa 63): 6, 12, 24, 48 e 72 h ficam como escolha de interface, sem RF.
3. **Padrão de 24 h:** Decidida em 2026-10-30 (etapa 63): fica em 24 h, como manda o UC-03 1a.

As decisões foram aprovadas pela equipe e registradas em `registro-sdd.md`, etapa 63.

## 14. Definition of Done

1. a equipe aprovar este rascunho e decidir o corte de 200;
2. CA-01 a CA-06 com evidência automatizada (feito, §12);
3. nenhuma divergência conhecida com a baseline.
