# SPEC-024 — Extrato do prestador

| Campo | Valor |
|---|---|
| Versão | 0.2.0 |
| Data | 2026-10-29 |
| Status | **Aprovada** em 2026-10-29 (etapa 32). Evidência completa na etapa 33: todos os critérios da §11 têm teste e passam. **Concluída** com o merge do PR #145 em 2026-10-29; issue #103 fechada |
| Baseline | `docs/spec.md` v0.1.8 e `docs/specs/mapa-de-specs.md` |
| Dependências | SPEC-020, SPEC-023 |
| Responsável | gostislavs |

## 1. Identificação
Formaliza **extrato do prestador**, mantendo a lógica publicada na baseline e a arquitetura da aplicação. Não redefine produto nem decisões OPEN.

## 2. Rastreabilidade
- **RF:** RF-061, RF-062.
- **RN:** RN-17, RN-33.
- **RNF:** RNF-01 (persistência), RNF-03 (titularidade/autorização), RNF-06 (testes), RNF-07 (auditoria) e RNF-08 (instantes) onde pertinentes.
- **Entidades:** LancamentoComissao, Agendamento, Usuario, Servico.
- **Fluxo:** caso de uso correspondente à entrada SPEC-024 do mapa aprovado.
- **ADRs:** ADR-002 (dinheiro e eventos imutáveis) e/ou ADR-005 (sem gateway no MVP), conforme o domínio.

## 3. Escopo
1. Prestador autorizado consulta apenas seus lançamentos associados a agendamentos próprios.
2. Extrato lista data, serviço, cliente, bruto, percentual, comissão, líquido, status da comissão e estado da cobrança.
3. Lançamentos EFETIVADO entram nos totais de bruto, comissão e líquido; RETIDO é exibido separadamente, sem compor disponível.
4. Lançamento ESTORNADO continua no histórico mas não compõe disponível.
5. Filtros de período se aplicam às linhas exibidas e aos totais, preservando consistência entre eles.
6. Não se confunde resultado da comissão com transferência monetária real (ADR-005).

### Fora do escopo
Gateway, geração de nota fiscal, cobrança de assinatura, recebíveis bancários, cronograma de transferência não contratado.

## 4. Dependências
SPEC-020, SPEC-023. Esta especificação define contratos necessários à sua área e não modifica as anteriores nem aprova automaticamente dependências pendentes.

## 5. Comportamento esperado
- **Fluxo principal:** identificar usuário/titular autorizado; validar regras e parâmetros vigentes; executar a transação de domínio; registrar efeitos de auditoria e notificações previstos; disponibilizar resultado consistente.
- **Alternativo:** quando não há registros ou a janela não se aplica, retornar estado vazio ou operação proibida com explicação.
- **Exceção:** estado inválido, limite excedido, tentativa de outro titular e falha de persistência não podem produzir gravações parciais.
- **Detalhamento específico:** Prestador autorizado consulta apenas seus lançamentos associados a agendamentos próprios. Extrato lista data, serviço, cliente, bruto, percentual, comissão, líquido, status da comissão e estado da cobrança. Lançamentos EFETIVADO entram nos totais de bruto, comissão e líquido; RETIDO é exibido separadamente, sem compor disponível. Lançamento ESTORNADO continua no histórico mas não compõe disponível. Filtros de período se aplicam às linhas exibidas e aos totais, preservando consistência entre eles. Não se confunde resultado da comissão com transferência monetária real (ADR-005).

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
LancamentoComissao, Agendamento, Usuario, Servico. A base usa chaves de identidade e referências entre entidades; o histórico é preservado nas transições e extratos.

## 8. Impacto arquitetural
Conferir os módulos: `src/infra/repositorios/financeiro.js`, `src/interface/http/rotas/prestador.js`, `src/dominio/comissao.js`. Alterações devem ser mínimas e rastreadas por critério de aceitação, com aplicação/dados/dominio separados.

## 9. Contratos necessários
1. Contrato 1: Prestador autorizado consulta apenas seus lançamentos associados a agendamentos próprios.
2. Contrato 2: Extrato lista data, serviço, cliente, bruto, percentual, comissão, líquido, status da comissão e estado da cobrança.
3. Contrato 3: Lançamentos EFETIVADO entram nos totais de bruto, comissão e líquido; RETIDO é exibido separadamente, sem compor disponível.
4. Contrato 4: Lançamento ESTORNADO continua no histórico mas não compõe disponível.
5. Contrato 5: Filtros de período se aplicam às linhas exibidas e aos totais, preservando consistência entre eles.
6. Contrato 6: Não se confunde resultado da comissão com transferência monetária real (ADR-005).

## 10. Requisitos não funcionais
Garantir atomicidade, filtros por titularidade, instantes ISO-8601 em UTC, uso de parâmetros do domínio, prova de cálculo em centavos e mensagens claras; nenhuma afirmação de movimentação financeira real quando o MVP apenas registra o fato.

## 11. Critérios de aceitação
**CA-01 — O extrato lista apenas lançamentos do prestador autenticado.**
- **Dado** o cenário pertinente de extrato do prestador, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz o extrato lista apenas lançamentos do prestador autenticado. sem modificar registros fora do escopo.

**CA-02 — Valores em centavos preservam identidade bruto = comissão + líquido.**
- **Dado** o cenário pertinente de extrato do prestador, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz valores em centavos preservam identidade bruto = comissão + líquido. sem modificar registros fora do escopo.

**CA-03 — Comissão retida aparece como categoria separada.**
- **Dado** o cenário pertinente de extrato do prestador, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz comissão retida aparece como categoria separada. sem modificar registros fora do escopo.

**CA-04 — Lançamento estornado permanece histórico sem somar disponível.**
- **Dado** o cenário pertinente de extrato do prestador, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz lançamento estornado permanece histórico sem somar disponível. sem modificar registros fora do escopo.

**CA-05 — Filtro de período exclui lançamentos fora da janela.**
- **Dado** o cenário pertinente de extrato do prestador, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz filtro de período exclui lançamentos fora da janela. sem modificar registros fora do escopo.

**CA-06 — Total zero usa estrutura válida sem NaN ou divisão inválida.**
- **Dado** o cenário pertinente de extrato do prestador, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz total zero usa estrutura válida sem NaN ou divisão inválida. sem modificar registros fora do escopo.

**CA-07 — Estados de cobrança e comissão são apresentados separadamente.**
- **Dado** o cenário pertinente de extrato do prestador, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz estados de cobrança e comissão são apresentados separadamente. sem modificar registros fora do escopo.

**CA-08 — Acesso a extrato de outro prestador é recusado.**
- **Dado** o cenário pertinente de extrato do prestador, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz acesso a extrato de outro prestador é recusado. sem modificar registros fora do escopo.

## 12. Casos de teste derivados

Testes em `tests/integracao/spec-024-evidencia.test.js`, com os IDs propostos.

| Teste | Cobre |
|---|---|
| `T-SPEC024-01 \| RF-061: o extrato lista apenas lançamentos do prestador autenticado` | CA-01, INV-002 |
| `T-SPEC024-02 \| RF-061: valores em centavos preservam identidade bruto = comissão + líquido` | CA-02, INV-004 |
| `T-SPEC024-03 \| RF-062: comissão retida aparece como categoria separada` | CA-03 |
| `T-SPEC024-04 \| RF-062: lançamento estornado permanece histórico sem somar disponível` | CA-04 |
| `T-SPEC024-05 \| RF-061: filtro de período exclui lançamentos fora da janela` | CA-05, INV-006 |
| `T-SPEC024-06 \| RF-061: total zero usa estrutura válida sem nan ou divisão inválida` | CA-06 |
| `T-SPEC024-07 \| RN-33: estados de cobrança e comissão são apresentados separadamente` | CA-07 |
| `T-SPEC024-08 \| RNF-03: acesso a extrato de outro prestador é recusado` | CA-08, INV-002 |
| `T-SPEC026-CA09 \| RF-081: lançamentos antigos mantêm percentual e valores originais` | INV-001 (lançamento antigo não muda com a comissão nova) |

**Evidência (etapa 33, 2026-10-29).** Todos os testes acima existem e passam em `npm test` no Node 24.

**INV-003 e INV-005** não se aplicam: o extrato é só leitura. **INV-007** é conferência de dependências.

## 13. Questões decididas

1. **Base do período:** Decidida em 2026-10-29 (etapa 32): `criado_em` do lançamento; o MVP não tem competência financeira.
2. **Filtro das retenções:** Decidida em 2026-10-29 (etapa 32): usam o mesmo intervalo dos efetivados, como o código já faz (`totaisPrestador`, RF-062).
3. **Pagamentos e repasses:** restrição confirmada, sem decisão nova: fora do MVP e não anunciados.

As decisões foram aprovadas pela equipe e registradas em `registro-sdd.md`, etapa 32.

## 14. Definition of Done
- CA e invariantes confrontados individualmente com o código.
- Testes automatizados aprovados em Node.js >=24, com evidência reproduzível.
- Nenhuma transição não autorizada, escrita retroativa ou diferença financeira entre extrato e ledger.
- Questões abertas que mudem produto registradas sem presumir resolução.
- Alterações de código e documentação correlacionadas à issue SPEC-024.
