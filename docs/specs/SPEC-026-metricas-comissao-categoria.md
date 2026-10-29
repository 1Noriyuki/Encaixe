# SPEC-026 — Métricas de comissão e percentual por categoria

| Campo | Valor |
|---|---|
| Versão | 0.2.0 |
| Data | 2026-10-29 |
| Status | **Aprovada** em 2026-10-29 (etapa 32). Definition of Done **pendente**: 4 de 9 testes da §12 existem com o identificador proposto |
| Baseline | `docs/spec.md` v0.1.8 e `docs/specs/mapa-de-specs.md` |
| Dependências | SPEC-017, SPEC-019, SPEC-020, SPEC-023 |
| Responsável | gostislavs |

## 1. Identificação
Formaliza **métricas de comissão e percentual por categoria**, mantendo a lógica publicada na baseline e a arquitetura da aplicação. Não redefine produto nem decisões OPEN.

## 2. Rastreabilidade
- **RF:** RF-063, RF-064, RF-080, RF-081.
- **RN:** RN-00, RN-14, RN-15.
- **RNF:** RNF-01 (persistência), RNF-03 (titularidade/autorização), RNF-06 (testes), RNF-07 (auditoria) e RNF-08 (instantes) onde pertinentes.
- **Entidades:** LancamentoComissao, CategoriaServico, Agendamento, Usuario.
- **Fluxo:** caso de uso correspondente à entrada SPEC-026 do mapa aprovado.
- **ADRs:** ADR-002 (dinheiro e eventos imutáveis) e/ou ADR-005 (sem gateway no MVP), conforme o domínio.

## 3. Escopo
1. Admin consulta total de conclusões, bruto e comissão reconhecidos, ticket médio, cancelamentos e no-shows.
2. Painel permite recorte por período, categoria e prestador, com resultado determinístico e consistência de filtros.
3. Somente lançamentos EFETIVADO contribuem para receita financeira; retidos/estornados não entram como ganhos.
4. Taxas de cancelamento/no-show usam denominador de agendamentos elegíveis no mesmo período de recorte.
5. Admin altera o percentual da categoria respeitando faixa RN-15 (8–15%), com data de vigência e auditoria.
6. Percentual novo é utilizado nos lançamentos constituídos depois da mudança; valores já apurados nunca são reescritos.

### Fora do escopo
Métricas de aquisição de marketing e CRM; custos de gateway não existentes; projeções de faturamento; controle de margem operacional não definido.

## 4. Dependências
SPEC-017, SPEC-019, SPEC-020, SPEC-023. Esta especificação define contratos necessários à sua área e não modifica as anteriores nem aprova automaticamente dependências pendentes.

## 5. Comportamento esperado
- **Fluxo principal:** identificar usuário/titular autorizado; validar regras e parâmetros vigentes; executar a transação de domínio; registrar efeitos de auditoria e notificações previstos; disponibilizar resultado consistente.
- **Alternativo:** quando não há registros ou a janela não se aplica, retornar estado vazio ou operação proibida com explicação.
- **Exceção:** estado inválido, limite excedido, tentativa de outro titular e falha de persistência não podem produzir gravações parciais.
- **Detalhamento específico:** Admin consulta total de conclusões, bruto e comissão reconhecidos, ticket médio, cancelamentos e no-shows. Painel permite recorte por período, categoria e prestador, com resultado determinístico e consistência de filtros. Somente lançamentos EFETIVADO contribuem para receita financeira; retidos/estornados não entram como ganhos. Taxas de cancelamento/no-show usam denominador de agendamentos elegíveis no mesmo período de recorte. Admin altera o percentual da categoria respeitando faixa RN-15 (8–15%), com data de vigência e auditoria. Percentual novo é utilizado nos lançamentos constituídos depois da mudança; valores já apurados nunca são reescritos.

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
LancamentoComissao, CategoriaServico, Agendamento, Usuario. A base usa chaves de identidade e referências entre entidades; o histórico é preservado nas transições e extratos.

## 8. Impacto arquitetural
Conferir os módulos: `src/aplicacao/admin.js`, `src/infra/repositorios/financeiro.js`, `src/infra/repositorios/catalogo.js`, `src/dominio/comissao.js`. Alterações devem ser mínimas e rastreadas por critério de aceitação, com aplicação/dados/dominio separados.

## 9. Contratos necessários
1. Contrato 1: Admin consulta total de conclusões, bruto e comissão reconhecidos, ticket médio, cancelamentos e no-shows.
2. Contrato 2: Painel permite recorte por período, categoria e prestador, com resultado determinístico e consistência de filtros.
3. Contrato 3: Somente lançamentos EFETIVADO contribuem para receita financeira; retidos/estornados não entram como ganhos.
4. Contrato 4: Taxas de cancelamento/no-show usam denominador de agendamentos elegíveis no mesmo período de recorte.
5. Contrato 5: Admin altera o percentual da categoria respeitando faixa RN-15 (8–15%), com data de vigência e auditoria.
6. Contrato 6: Percentual novo é utilizado nos lançamentos constituídos depois da mudança; valores já apurados nunca são reescritos.

## 10. Requisitos não funcionais
Garantir atomicidade, filtros por titularidade, instantes ISO-8601 em UTC, uso de parâmetros do domínio, prova de cálculo em centavos e mensagens claras; nenhuma afirmação de movimentação financeira real quando o MVP apenas registra o fato.

## 11. Critérios de aceitação
**CA-01 — Painel sem movimentação devolve zeros válidos.**
- **Dado** o cenário pertinente de métricas de comissão e percentual por categoria, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz painel sem movimentação devolve zeros válidos. sem modificar registros fora do escopo.

**CA-02 — Painel com conclusão efetivada soma bruto, comissão e ticket corretamente.**
- **Dado** o cenário pertinente de métricas de comissão e percentual por categoria, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz painel com conclusão efetivada soma bruto, comissão e ticket corretamente. sem modificar registros fora do escopo.

**CA-03 — RETIDO/ESTORNADO não contam como receita.**
- **Dado** o cenário pertinente de métricas de comissão e percentual por categoria, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz rETIDO/ESTORNADO não contam como receita. sem modificar registros fora do escopo.

**CA-04 — Recortes por categoria e prestador incluem apenas agendamentos correspondentes.**
- **Dado** o cenário pertinente de métricas de comissão e percentual por categoria, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz recortes por categoria e prestador incluem apenas agendamentos correspondentes. sem modificar registros fora do escopo.

**CA-05 — Cancelamento e no-show têm taxas coerentes e nunca dividem por zero.**
- **Dado** o cenário pertinente de métricas de comissão e percentual por categoria, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz cancelamento e no-show têm taxas coerentes e nunca dividem por zero. sem modificar registros fora do escopo.

**CA-06 — Admin altera percentual dentro de 8% a 15%.**
- **Dado** o cenário pertinente de métricas de comissão e percentual por categoria, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz admin altera percentual dentro de 8% a 15%. sem modificar registros fora do escopo.

**CA-07 — Percentual inválido é recusado e não persistido.**
- **Dado** o cenário pertinente de métricas de comissão e percentual por categoria, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz percentual inválido é recusado e não persistido. sem modificar registros fora do escopo.

**CA-08 — Mudança de categoria é auditável com estado anterior e novo.**
- **Dado** o cenário pertinente de métricas de comissão e percentual por categoria, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz mudança de categoria é auditável com estado anterior e novo. sem modificar registros fora do escopo.

**CA-09 — Lançamentos antigos mantêm percentual e valores originais.**
- **Dado** o cenário pertinente de métricas de comissão e percentual por categoria, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz lançamentos antigos mantêm percentual e valores originais. sem modificar registros fora do escopo.

## 12. Casos de teste derivados
| Teste proposto | Critério |
|---|---|
| `T-SPEC026-01 \| RN-00: painel sem movimentação devolve zeros válidos` | CA-01 |
| `T-SPEC026-02 \| RN-00: painel com conclusão efetivada soma bruto, comissão e ticket corretamente` | CA-02 |
| `T-SPEC026-03 \| RN-00: retido/estornado não contam como receita` | CA-03 |
| `T-SPEC026-04 \| RN-00: recortes por categoria e prestador incluem apenas agendamentos correspondentes` | CA-04 |
| `T-SPEC026-05 \| RN-00: cancelamento e no-show têm taxas coerentes e nunca dividem por zero` | CA-05 |
| `T-SPEC026-06 \| RN-00: admin altera percentual dentro de 8% a 15%` | CA-06 |
| `T-SPEC026-07 \| RN-00: percentual inválido é recusado e não persistido` | CA-07 |
| `T-SPEC026-08 \| RN-00: mudança de categoria é auditável com estado anterior e novo` | CA-08 |
| `T-SPEC026-09 \| RN-00: lançamentos antigos mantêm percentual e valores originais` | CA-09 |

A implementação candidata já existe no repositório. A equipe deve relacionar os IDs aqui propostos com os testes existentes antes de declarar cobertura integral; teste listado não equivale a teste executado.

## 13. Questões decididas

1. **Fonte da P-13:** já decidida na OPEN-103: uma única fonte operacional por categoria.
2. **Receita acumulada:** Decidida em 2026-10-29 (etapa 32): soma das comissões `EFETIVADO` no recorte, com as `RETIDO` à parte, como no extrato (SPEC-024).
3. **Permissões do admin:** restrição confirmada, sem decisão nova: pertencem à SPEC-003.

As decisões foram aprovadas pela equipe e registradas em `registro-sdd.md`, etapa 32.

## 14. Definition of Done
- CA e invariantes confrontados individualmente com o código.
- Testes automatizados aprovados em Node.js >=24, com evidência reproduzível.
- Nenhuma transição não autorizada, escrita retroativa ou diferença financeira entre extrato e ledger.
- Questões abertas que mudem produto registradas sem presumir resolução.
- Alterações de código e documentação correlacionadas à issue SPEC-026.
