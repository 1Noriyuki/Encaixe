# SPEC-011 — Preço dinâmico do horário

| Campo | Valor |
|---|---|
| Versão | 0.2.0 |
| Data | 2026-10-29 |
| Status | **Aprovada** em 2026-10-29 (etapa 32). Definition of Done **pendente**: 3 de 8 testes da §12 existem com o identificador proposto |
| Baseline | `docs/spec.md` v0.1.8 e `docs/specs/mapa-de-specs.md` |
| Dependências | SPEC-008, SPEC-010 |
| Responsável | gostislavs |

## 1. Identificação
Formaliza **preço dinâmico do horário**, mantendo a lógica publicada na baseline e a arquitetura da aplicação. Não redefine produto nem decisões OPEN.

## 2. Rastreabilidade
- **RF:** RF-021, RF-024, RF-025, RF-026.
- **RN:** RN-01, RN-03.
- **RNF:** RNF-01 (persistência), RNF-03 (titularidade/autorização), RNF-06 (testes), RNF-07 (auditoria) e RNF-08 (instantes) onde pertinentes.
- **Entidades:** HorarioVago, Servico, ReguaDesconto, FaixaDesconto.
- **Fluxo:** caso de uso correspondente à entrada SPEC-011 do mapa aprovado.
- **ADRs:** ADR-002 (dinheiro e eventos imutáveis) e/ou ADR-005 (sem gateway no MVP), conforme o domínio.

## 3. Escopo
1. Lê snapshots de preço-base e preço mínimo do horário publicado, as faixas da régua selecionada e os parâmetros globais vigentes.
2. Calcula a antecedência em minutos usando relógio controlado, identifica a faixa aplicável e retorna 0% se nenhuma faixa entrou em vigor.
3. Determina o preço vigente em centavos com piso mais restritivo entre preço mínimo do prestador e o desconto global P-05.
4. Calcula economia, desconto efetivo, indicação de piso atingido e instante do próximo degrau.
5. Busca, página de horário e reserva compartilham a mesma operação de precificação; uma reserva trava o valor calculado na transação.

### Fora do escopo
Publicação, edição de régua, bloqueio exclusivo da reserva, persistência de pagamentos e alteração retroativa de preços travados.

## 4. Dependências
SPEC-008, SPEC-010. Esta especificação define contratos necessários à sua área e não modifica as anteriores nem aprova automaticamente dependências pendentes.

## 5. Comportamento esperado
- **Fluxo principal:** identificar usuário/titular autorizado; validar regras e parâmetros vigentes; executar a transação de domínio; registrar efeitos de auditoria e notificações previstos; disponibilizar resultado consistente.
- **Alternativo:** quando não há registros ou a janela não se aplica, retornar estado vazio ou operação proibida com explicação.
- **Exceção:** estado inválido, limite excedido, tentativa de outro titular e falha de persistência não podem produzir gravações parciais.
- **Detalhamento específico:** Lê snapshots de preço-base e preço mínimo do horário publicado, as faixas da régua selecionada e os parâmetros globais vigentes. Calcula a antecedência em minutos usando relógio controlado, identifica a faixa aplicável e retorna 0% se nenhuma faixa entrou em vigor. Determina o preço vigente em centavos com piso mais restritivo entre preço mínimo do prestador e o desconto global P-05. Calcula economia, desconto efetivo, indicação de piso atingido e instante do próximo degrau. Busca, página de horário e reserva compartilham a mesma operação de precificação; uma reserva trava o valor calculado na transação.

## 6. Regras e invariantes
| ID | Invariante | Verificação |
|---|---|---|
| INV-001 | Não alterar fatos já registrados quando parâmetro muda (RN-00) | comparar antes/depois |
| INV-002 | Operação não autorizada não modifica domínio | testar titularidade |
| INV-003 | Operações que mudam estado devem ser auditadas | correlacionar estado e log |
| INV-004 | Dados monetários utilizam centavos inteiros | teste de identidade e limites |
| INV-005 | Mudança parcial não persiste após falha | simular rollback |
| INV-006 | Relógio de negócio é controlado e datas ficam UTC | testes de janela |
| INV-007 | Nenhuma regra de outras Specs é antecipada | conferência de dependências |

## 7. Modelo de domínio
HorarioVago, Servico, ReguaDesconto, FaixaDesconto. A base usa chaves de identidade e referências entre entidades; o histórico é preservado nas transições e extratos.

## 8. Impacto arquitetural
Conferir os módulos: `src/dominio/precificacao.js`, `src/aplicacao/precos.js`, `src/aplicacao/horarios.js`, `src/infra/repositorios/horarios.js`. Alterações devem ser mínimas e rastreadas por critério de aceitação, com aplicação/dados/dominio separados.

## 9. Contratos necessários
1. Contrato 1: Lê snapshots de preço-base e preço mínimo do horário publicado, as faixas da régua selecionada e os parâmetros globais vigentes.
2. Contrato 2: Calcula a antecedência em minutos usando relógio controlado, identifica a faixa aplicável e retorna 0% se nenhuma faixa entrou em vigor.
3. Contrato 3: Determina o preço vigente em centavos com piso mais restritivo entre preço mínimo do prestador e o desconto global P-05.
4. Contrato 4: Calcula economia, desconto efetivo, indicação de piso atingido e instante do próximo degrau.
5. Contrato 5: Busca, página de horário e reserva compartilham a mesma operação de precificação; uma reserva trava o valor calculado na transação.

## 10. Requisitos não funcionais
Garantir atomicidade, filtros por titularidade, instantes ISO-8601 em UTC, uso de parâmetros do domínio, prova de cálculo em centavos e mensagens claras; nenhuma afirmação de movimentação financeira real quando o MVP apenas registra o fato.

## 11. Critérios de aceitação
**CA-01 — A oferta sem faixa aplicável apresenta preço-base íntegro.**
- **Dado** o cenário pertinente de preço dinâmico do horário, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz a oferta sem faixa aplicável apresenta preço-base íntegro. sem modificar registros fora do escopo.

**CA-02 — Ao cruzar antecedência de uma faixa, preço muda no instante esperado.**
- **Dado** o cenário pertinente de preço dinâmico do horário, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz ao cruzar antecedência de uma faixa, preço muda no instante esperado. sem modificar registros fora do escopo.

**CA-03 — Preço não fica abaixo do piso mínimo do prestador.**
- **Dado** o cenário pertinente de preço dinâmico do horário, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz preço não fica abaixo do piso mínimo do prestador. sem modificar registros fora do escopo.

**CA-04 — Teto P-05 limita o desconto efetivo.**
- **Dado** o cenário pertinente de preço dinâmico do horário, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz teto P-05 limita o desconto efetivo. sem modificar registros fora do escopo.

**CA-05 — Economia e percentual efetivo correspondem ao preço em centavos.**
- **Dado** o cenário pertinente de preço dinâmico do horário, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz economia e percentual efetivo correspondem ao preço em centavos. sem modificar registros fora do escopo.

**CA-06 — Próximo degrau informa antecedência e instante corretamente.**
- **Dado** o cenário pertinente de preço dinâmico do horário, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz próximo degrau informa antecedência e instante corretamente. sem modificar registros fora do escopo.

**CA-07 — Busca, detalhe e reserva usam a mesma regra de cálculo.**
- **Dado** o cenário pertinente de preço dinâmico do horário, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz busca, detalhe e reserva usam a mesma regra de cálculo. sem modificar registros fora do escopo.

**CA-08 — Preço travado de reserva anterior não muda quando o relógio avança.**
- **Dado** o cenário pertinente de preço dinâmico do horário, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz preço travado de reserva anterior não muda quando o relógio avança. sem modificar registros fora do escopo.

## 12. Casos de teste derivados
| Teste proposto | Critério |
|---|---|
| `T-SPEC011-01 \| RN-01: a oferta sem faixa aplicável apresenta preço-base íntegro` | CA-01 |
| `T-SPEC011-02 \| RN-01: ao cruzar antecedência de uma faixa, preço muda no instante esperado` | CA-02 |
| `T-SPEC011-03 \| RN-01: preço não fica abaixo do piso mínimo do prestador` | CA-03 |
| `T-SPEC011-04 \| RN-01: teto p-05 limita o desconto efetivo` | CA-04 |
| `T-SPEC011-05 \| RN-01: economia e percentual efetivo correspondem ao preço em centavos` | CA-05 |
| `T-SPEC011-06 \| RN-01: próximo degrau informa antecedência e instante corretamente` | CA-06 |
| `T-SPEC011-07 \| RN-01: busca, detalhe e reserva usam a mesma regra de cálculo` | CA-07 |
| `T-SPEC011-08 \| RN-01: preço travado de reserva anterior não muda quando o relógio avança` | CA-08 |

A implementação candidata já existe no repositório. A equipe deve relacionar os IDs aqui propostos com os testes existentes antes de declarar cobertura integral; teste listado não equivale a teste executado.

## 13. Questões decididas

1. **Precisão monetária:** Decidida em 2026-10-29 (etapa 32): dinheiro é inteiro de centavos com arredondamento meio para cima (ADR-002, RN-14), como o código já faz.
2. **P-05 reduzido com ofertas publicadas:** Decidida em 2026-10-29 (etapa 32): ver SPEC-008 §13, item 2.
3. **Limites por segmento:** Decidida em 2026-10-29 (etapa 32): fora do MVP.

As decisões foram aprovadas pela equipe e registradas em `registro-sdd.md`, etapa 32.

## 14. Definition of Done
- CA e invariantes confrontados individualmente com o código.
- Testes automatizados aprovados em Node.js >=24, com evidência reproduzível.
- Nenhuma transição não autorizada, escrita retroativa ou diferença financeira entre extrato e ledger.
- Questões abertas que mudem produto registradas sem presumir resolução.
- Alterações de código e documentação correlacionadas à issue SPEC-011.
