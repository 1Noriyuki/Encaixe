# SPEC-020 — Conclusão do atendimento e apuração de comissão

| Campo | Valor |
|---|---|
| Versão | 0.2.0 |
| Data | 2026-10-29 |
| Status | **Aprovada** em 2026-10-29 (etapa 32). Definition of Done **pendente**: 0 de 9 testes da §12 existem com o identificador proposto |
| Baseline | `docs/spec.md` v0.1.8 e `docs/specs/mapa-de-specs.md` |
| Dependências | SPEC-016, SPEC-019 |
| Responsável | gostislavs |

## 1. Identificação
Formaliza **conclusão do atendimento e apuração de comissão**, mantendo a lógica publicada na baseline e a arquitetura da aplicação. Não redefine produto nem decisões OPEN.

## 2. Rastreabilidade
- **RF:** RF-058, RF-059, RF-060.
- **RN:** RN-14, RN-15, RN-16, RN-23, RN-33.
- **RNF:** RNF-01 (persistência), RNF-03 (titularidade/autorização), RNF-06 (testes), RNF-07 (auditoria) e RNF-08 (instantes) onde pertinentes.
- **Entidades:** Agendamento, HorarioVago, LancamentoComissao, CategoriaServico, EventoReputacao.
- **Fluxo:** caso de uso correspondente à entrada SPEC-020 do mapa aprovado.
- **ADRs:** ADR-002 (dinheiro e eventos imutáveis) e/ou ADR-005 (sem gateway no MVP), conforme o domínio.

## 3. Escopo
1. Somente agendamento CONFIRMADO, após o término do serviço, pode ser concluído por prestador autorizado.
2. O prestador registra estado de cobrança PAGO_PRESENCIAL ou NAO_PAGO; conclusão automática usa estado PENDENTE sem comprovar pagamento.
3. Ao confirmar o agendamento, grava-se o prazo de autoconclusão derivado de P-17 vigente; alterações posteriores não antecipam nem adiam a obrigação original.
4. Rotina conclui após o prazo travado, desde que não haja contestação ou no-show impeditivo; uma falha em um registro não bloqueia as demais rotinas.
5. Conclusão cria exatamente um lançamento de comissão, a partir do valor da reserva travado e percentual da categoria vigente na conclusão.
6. Lancamento usa centavos, garante bruto = comissão + líquido, registra status inicial EFETIVADO e eventos de reputação (P-22 vigente) para ambos.
7. Status NAO_PAGO sinaliza situação da cobrança, sem integração de gateway; não significa repasse efetivo.

### Fora do escopo
Gateway, cobranças externas, transferência financeira, dispute/estorno posteriores (SPEC-022/023), política de penalidades de cancelamento.

## 4. Dependências
SPEC-016, SPEC-019. Esta especificação define contratos necessários à sua área e não modifica as anteriores nem aprova automaticamente dependências pendentes.

## 5. Comportamento esperado
- **Fluxo principal:** identificar usuário/titular autorizado; validar regras e parâmetros vigentes; executar a transação de domínio; registrar efeitos de auditoria e notificações previstos; disponibilizar resultado consistente.
- **Alternativo:** quando não há registros ou a janela não se aplica, retornar estado vazio ou operação proibida com explicação.
- **Exceção:** estado inválido, limite excedido, tentativa de outro titular e falha de persistência não podem produzir gravações parciais.
- **Detalhamento específico:** Somente agendamento CONFIRMADO, após o término do serviço, pode ser concluído por prestador autorizado. O prestador registra estado de cobrança PAGO_PRESENCIAL ou NAO_PAGO; conclusão automática usa estado PENDENTE sem comprovar pagamento. Ao confirmar o agendamento, grava-se o prazo de autoconclusão derivado de P-17 vigente; alterações posteriores não antecipam nem adiam a obrigação original. Rotina conclui após o prazo travado, desde que não haja contestação ou no-show impeditivo; uma falha em um registro não bloqueia as demais rotinas. Conclusão cria exatamente um lançamento de comissão, a partir do valor da reserva travado e percentual da categoria vigente na conclusão. Lancamento usa centavos, garante bruto = comissão + líquido, registra status inicial EFETIVADO e eventos de reputação (P-22 vigente) para ambos. Status NAO_PAGO sinaliza situação da cobrança, sem integração de gateway; não significa repasse efetivo.

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
Agendamento, HorarioVago, LancamentoComissao, CategoriaServico, EventoReputacao. A base usa chaves de identidade e referências entre entidades; o histórico é preservado nas transições e extratos.

## 8. Impacto arquitetural
Conferir os módulos: `src/aplicacao/agendamentos.js`, `src/aplicacao/rotinas.js`, `src/infra/repositorios/agendamentos.js`, `src/infra/repositorios/financeiro.js`, `src/dominio/comissao.js`, `src/dominio/prazos.js`. Alterações devem ser mínimas e rastreadas por critério de aceitação, com aplicação/dados/dominio separados.

## 9. Contratos necessários
1. Contrato 1: Somente agendamento CONFIRMADO, após o término do serviço, pode ser concluído por prestador autorizado.
2. Contrato 2: O prestador registra estado de cobrança PAGO_PRESENCIAL ou NAO_PAGO; conclusão automática usa estado PENDENTE sem comprovar pagamento.
3. Contrato 3: Ao confirmar o agendamento, grava-se o prazo de autoconclusão derivado de P-17 vigente; alterações posteriores não antecipam nem adiam a obrigação original.
4. Contrato 4: Rotina conclui após o prazo travado, desde que não haja contestação ou no-show impeditivo; uma falha em um registro não bloqueia as demais rotinas.
5. Contrato 5: Conclusão cria exatamente um lançamento de comissão, a partir do valor da reserva travado e percentual da categoria vigente na conclusão.
6. Contrato 6: Lancamento usa centavos, garante bruto = comissão + líquido, registra status inicial EFETIVADO e eventos de reputação (P-22 vigente) para ambos.
7. Contrato 7: Status NAO_PAGO sinaliza situação da cobrança, sem integração de gateway; não significa repasse efetivo.

## 10. Requisitos não funcionais
Garantir atomicidade, filtros por titularidade, instantes ISO-8601 em UTC, uso de parâmetros do domínio, prova de cálculo em centavos e mensagens claras; nenhuma afirmação de movimentação financeira real quando o MVP apenas registra o fato.

## 11. Critérios de aceitação
**CA-01 — Prestador não conclui antes do fim do serviço.**
- **Dado** o cenário pertinente de conclusão do atendimento e apuração de comissão, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz prestador não conclui antes do fim do serviço. sem modificar registros fora do escopo.

**CA-02 — Agendamento não CONFIRMADO não conclui.**
- **Dado** o cenário pertinente de conclusão do atendimento e apuração de comissão, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz agendamento não CONFIRMADO não conclui. sem modificar registros fora do escopo.

**CA-03 — Estado de cobrança inválido é recusado.**
- **Dado** o cenário pertinente de conclusão do atendimento e apuração de comissão, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz estado de cobrança inválido é recusado. sem modificar registros fora do escopo.

**CA-04 — Conclusão manual cria um único lançamento com identidade financeira e percentual correto.**
- **Dado** o cenário pertinente de conclusão do atendimento e apuração de comissão, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz conclusão manual cria um único lançamento com identidade financeira e percentual correto. sem modificar registros fora do escopo.

**CA-05 — Duas tentativas de conclusão não duplicam lançamento.**
- **Dado** o cenário pertinente de conclusão do atendimento e apuração de comissão, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz duas tentativas de conclusão não duplicam lançamento. sem modificar registros fora do escopo.

**CA-06 — Conclusão automática respeita prazo P-17 congelado.**
- **Dado** o cenário pertinente de conclusão do atendimento e apuração de comissão, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz conclusão automática respeita prazo P-17 congelado. sem modificar registros fora do escopo.

**CA-07 — Alterar P-17 depois da confirmação não altera prazo já existente.**
- **Dado** o cenário pertinente de conclusão do atendimento e apuração de comissão, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz alterar P-17 depois da confirmação não altera prazo já existente. sem modificar registros fora do escopo.

**CA-08 — Eventos de reputação preservam deltas do momento da conclusão.**
- **Dado** o cenário pertinente de conclusão do atendimento e apuração de comissão, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz eventos de reputação preservam deltas do momento da conclusão. sem modificar registros fora do escopo.

**CA-09 — NAO_PAGO registra cobrança pendente sem alegar pagamento.**
- **Dado** o cenário pertinente de conclusão do atendimento e apuração de comissão, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz nAO_PAGO registra cobrança pendente sem alegar pagamento. sem modificar registros fora do escopo.

## 12. Casos de teste derivados
| Teste proposto | Critério |
|---|---|
| `T-SPEC020-01 \| RN-14: prestador não conclui antes do fim do serviço` | CA-01 |
| `T-SPEC020-02 \| RN-14: agendamento não confirmado não conclui` | CA-02 |
| `T-SPEC020-03 \| RN-14: estado de cobrança inválido é recusado` | CA-03 |
| `T-SPEC020-04 \| RN-14: conclusão manual cria um único lançamento com identidade financeira e percentual correto` | CA-04 |
| `T-SPEC020-05 \| RN-14: duas tentativas de conclusão não duplicam lançamento` | CA-05 |
| `T-SPEC020-06 \| RN-14: conclusão automática respeita prazo p-17 congelado` | CA-06 |
| `T-SPEC020-07 \| RN-14: alterar p-17 depois da confirmação não altera prazo já existente` | CA-07 |
| `T-SPEC020-08 \| RN-14: eventos de reputação preservam deltas do momento da conclusão` | CA-08 |
| `T-SPEC020-09 \| RN-14: nao_pago registra cobrança pendente sem alegar pagamento` | CA-09 |

A implementação candidata já existe no repositório. A equipe deve relacionar os IDs aqui propostos com os testes existentes antes de declarar cobertura integral; teste listado não equivale a teste executado.

## 13. Questões decididas

1. **Bancos legados sem P-17 gravada:** Decidida em 2026-10-29 (etapa 32): a migração grava nos confirmados legados a P-17 vigente naquele momento, e dali em diante o prazo fica travado (`acrescentarPrazoAutoconclusao`, teste T-P17-04).
2. **NAO_PAGO e comissão apurada:** Decidida em 2026-10-29 (etapa 32): são estados independentes. O estado de cobrança não altera o lançamento, e os dois aparecem lado a lado (RN-33).
3. **Máquina e auditoria:** restrição confirmada, sem decisão nova: o fluxo financeiro segue a SPEC-001 §9.7.1.

As decisões foram aprovadas pela equipe e registradas em `registro-sdd.md`, etapa 32.

## 14. Definition of Done
- CA e invariantes confrontados individualmente com o código.
- Testes automatizados aprovados em Node.js >=24, com evidência reproduzível.
- Nenhuma transição não autorizada, escrita retroativa ou diferença financeira entre extrato e ledger.
- Questões abertas que mudem produto registradas sem presumir resolução.
- Alterações de código e documentação correlacionadas à issue SPEC-020.
