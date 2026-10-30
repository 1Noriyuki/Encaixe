# SPEC-021 — Avaliação bilateral, revelação cega e perfil público

| Campo | Valor |
|---|---|
| Versão | 0.1.0 |
| Data | 2026-10-21 |
| Situação | Especificação técnica da Trilha A produzida a partir da baseline; lacunas documentadas, sem decisão nova |
| Baseline | `docs/spec.md` v0.1.8 e `docs/specs/mapa-de-specs.md` |
| Dependências | SPEC-016, SPEC-020 |
| Responsável | gostislavs |

## 1. Identificação
Formaliza **avaliação bilateral, revelação cega e perfil público**, mantendo a lógica publicada na baseline e a arquitetura da aplicação. Não redefine produto nem decisões OPEN.

## 2. Rastreabilidade
- **RF:** RF-065, RF-066, RF-067, RF-068, RF-070.
- **RN:** RN-23, RN-24, RN-25.
- **RNF:** RNF-01 (persistência), RNF-03 (titularidade/autorização), RNF-06 (testes), RNF-07 (auditoria) e RNF-08 (instantes) onde pertinentes.
- **Entidades:** Avaliacao, Agendamento, EventoReputacao, Usuario.
- **Fluxo:** caso de uso correspondente à entrada SPEC-021 do mapa aprovado.
- **ADRs:** ADR-002 (dinheiro e eventos imutáveis) e/ou ADR-005 (sem gateway no MVP), conforme o domínio.

## 3. Escopo
1. Cliente e prestador podem avaliar um ao outro após o estado CONCLUIDO, na janela P-14 e com nota inteira de 1 a 5.
2. Cada parte avalia exatamente uma vez; índice único da aplicação/banco preserva unicidade por agendamento e autor.
3. Enquanto uma única avaliação existe, a nota da contraparte permanece oculta para evitar retaliação.
4. Duas avaliações ou expiração de P-14 disparam revelação e notificações, sem alterar notas anteriores.
5. O evento de reputação usa o delta da nota P-22 vigente no registro, congelado no livro-razão.
6. Perfil público mostra reputação, atendimentos agregados e taxa de no-show, sem dados pessoais de contato.

### Fora do escopo
Avaliação de atendimento não concluído; editabilidade/remoção posterior da nota, publicidade médica e dados clínicos; contestação da avaliação (não prevista).

## 4. Dependências
SPEC-016, SPEC-020. Esta especificação define contratos necessários à sua área e não modifica as anteriores nem aprova automaticamente dependências pendentes.

## 5. Comportamento esperado
- **Fluxo principal:** identificar usuário/titular autorizado; validar regras e parâmetros vigentes; executar a transação de domínio; registrar efeitos de auditoria e notificações previstos; disponibilizar resultado consistente.
- **Alternativo:** quando não há registros ou a janela não se aplica, retornar estado vazio ou operação proibida com explicação.
- **Exceção:** estado inválido, limite excedido, tentativa de outro titular e falha de persistência não podem produzir gravações parciais.
- **Detalhamento específico:** Cliente e prestador podem avaliar um ao outro após o estado CONCLUIDO, na janela P-14 e com nota inteira de 1 a 5. Cada parte avalia exatamente uma vez; índice único da aplicação/banco preserva unicidade por agendamento e autor. Enquanto uma única avaliação existe, a nota da contraparte permanece oculta para evitar retaliação. Duas avaliações ou expiração de P-14 disparam revelação e notificações, sem alterar notas anteriores. O evento de reputação usa o delta da nota P-22 vigente no registro, congelado no livro-razão. Perfil público mostra reputação, atendimentos agregados e taxa de no-show, sem dados pessoais de contato.

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
Avaliacao, Agendamento, EventoReputacao, Usuario. A base usa chaves de identidade e referências entre entidades; o histórico é preservado nas transições e extratos.

## 8. Impacto arquitetural
Conferir os módulos: `src/aplicacao/avaliacoes.js`, `src/aplicacao/contas.js`, `src/aplicacao/rotinas.js`, `src/infra/repositorios/social.js`, `src/infra/repositorios/usuarios.js`. Alterações devem ser mínimas e rastreadas por critério de aceitação, com aplicação/dados/dominio separados.

## 9. Contratos necessários
1. Contrato 1: Cliente e prestador podem avaliar um ao outro após o estado CONCLUIDO, na janela P-14 e com nota inteira de 1 a 5.
2. Contrato 2: Cada parte avalia exatamente uma vez; índice único da aplicação/banco preserva unicidade por agendamento e autor.
3. Contrato 3: Enquanto uma única avaliação existe, a nota da contraparte permanece oculta para evitar retaliação.
4. Contrato 4: Duas avaliações ou expiração de P-14 disparam revelação e notificações, sem alterar notas anteriores.
5. Contrato 5: O evento de reputação usa o delta da nota P-22 vigente no registro, congelado no livro-razão.
6. Contrato 6: Perfil público mostra reputação, atendimentos agregados e taxa de no-show, sem dados pessoais de contato.

## 10. Requisitos não funcionais
Garantir atomicidade, filtros por titularidade, instantes ISO-8601 em UTC, uso de parâmetros do domínio, prova de cálculo em centavos e mensagens claras; nenhuma afirmação de movimentação financeira real quando o MVP apenas registra o fato.

## 11. Critérios de aceitação
**CA-01 — Apenas partes de atendimento CONCLUIDO podem avaliar.**
- **Dado** o cenário pertinente de avaliação bilateral, revelação cega e perfil público, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz apenas partes de atendimento CONCLUIDO podem avaliar. sem modificar registros fora do escopo.

**CA-02 — Nota deve ser inteira entre 1 e 5; recusas não criam avaliação.**
- **Dado** o cenário pertinente de avaliação bilateral, revelação cega e perfil público, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz nota deve ser inteira entre 1 e 5; recusas não criam avaliação. sem modificar registros fora do escopo.

**CA-03 — Cada participante avalia uma única vez.**
- **Dado** o cenário pertinente de avaliação bilateral, revelação cega e perfil público, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz cada participante avalia uma única vez. sem modificar registros fora do escopo.

**CA-04 — Primeira nota não é exposta à contraparte antes da revelação.**
- **Dado** o cenário pertinente de avaliação bilateral, revelação cega e perfil público, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz primeira nota não é exposta à contraparte antes da revelação. sem modificar registros fora do escopo.

**CA-05 — Duas notas provocam revelação para ambas as partes.**
- **Dado** o cenário pertinente de avaliação bilateral, revelação cega e perfil público, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz duas notas provocam revelação para ambas as partes. sem modificar registros fora do escopo.

**CA-06 — Fim da janela P-14 revela avaliações sem segunda nota.**
- **Dado** o cenário pertinente de avaliação bilateral, revelação cega e perfil público, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz fim da janela P-14 revela avaliações sem segunda nota. sem modificar registros fora do escopo.

**CA-07 — Avaliação gera evento P-22 para o alvo, preservando delta aplicado.**
- **Dado** o cenário pertinente de avaliação bilateral, revelação cega e perfil público, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz avaliação gera evento P-22 para o alvo, preservando delta aplicado. sem modificar registros fora do escopo.

**CA-08 — Perfil público não retorna telefone nem email.**
- **Dado** o cenário pertinente de avaliação bilateral, revelação cega e perfil público, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz perfil público não retorna telefone nem email. sem modificar registros fora do escopo.

**CA-09 — Histórico agregado de reputação e no-show é consistente com dados registrados.**
- **Dado** o cenário pertinente de avaliação bilateral, revelação cega e perfil público, **quando** a operação de domínio acima ocorrer, **então** o sistema satisfaz histórico agregado de reputação e no-show é consistente com dados registrados. sem modificar registros fora do escopo.

## 12. Casos de teste derivados
| Teste proposto | Critério |
|---|---|
| `T-SPEC021-01 \| RN-23: apenas partes de atendimento concluido podem avaliar` | CA-01 |
| `T-SPEC021-02 \| RN-23: nota deve ser inteira entre 1 e 5; recusas não criam avaliação` | CA-02 |
| `T-SPEC021-03 \| RN-23: cada participante avalia uma única vez` | CA-03 |
| `T-SPEC021-04 \| RN-23: primeira nota não é exposta à contraparte antes da revelação` | CA-04 |
| `T-SPEC021-05 \| RN-23: duas notas provocam revelação para ambas as partes` | CA-05 |
| `T-SPEC021-06 \| RN-23: fim da janela p-14 revela avaliações sem segunda nota` | CA-06 |
| `T-SPEC021-07 \| RN-23: avaliação gera evento p-22 para o alvo, preservando delta aplicado` | CA-07 |
| `T-SPEC021-08 \| RN-23: perfil público não retorna telefone nem email` | CA-08 |
| `T-SPEC021-09 \| RN-23: histórico agregado de reputação e no-show é consistente com dados registrados` | CA-09 |

A implementação candidata já existe no repositório. A equipe deve relacionar os IDs aqui propostos com os testes existentes antes de declarar cobertura integral; teste listado não equivale a teste executado.

## 13. Questões e lacunas documentadas
1. Definir se os comentários também permanecem ocultos até a revelação, considerando o comportamento atual do repositório.
2. Regra de visualização de avaliações para usuários não autenticados deve seguir RNF-04.
3. Alterar P-14 depois da conclusão pode afetar avaliações existentes; a precedência temporal requer alinhamento com RN-00.

Estas pendências não são decisões implícitas e não alteram a baseline.

## 14. Definition of Done
- CA e invariantes confrontados individualmente com o código.
- Testes automatizados aprovados em Node.js >=24, com evidência reproduzível.
- Nenhuma transição não autorizada, escrita retroativa ou diferença financeira entre extrato e ledger.
- Questões abertas que mudem produto registradas sem presumir resolução.
- Alterações de código e documentação correlacionadas à issue SPEC-021.
