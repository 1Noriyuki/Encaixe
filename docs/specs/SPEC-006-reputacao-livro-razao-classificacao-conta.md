# SPEC-006 — Reputação como livro-razão e classificação automática da conta

| Campo | Valor |
|---|---|
| Versão | 0.1.1 (rascunho atualizado com a implementação de 22/10) |
| Data | 2026-10-22 |
| Status | **Rascunho — aguardando aprovação explícita da equipe**; não autoriza alterações de regra de negócio |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 6 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.9, RN-00, RN-22, RN-23, RF-057, RF-069; ADR-002 |
| Responsável pela preparação | gostislavs — Trilha A |
| Dependências | SPEC-001, SPEC-002 e SPEC-004 aprovadas; eventos gerados por Specs posteriores têm contratos próprios |

## 1. Identificação

- **ID:** SPEC-006.
- **Nome:** Reputação como livro-razão e classificação automática da conta.
- **Objetivo:** manter a reputação derivada de eventos imutáveis rastreáveis na janela móvel P-20, limitada a 0–100, e aplicar a classificação da conta conforme RN-22.
- **Valor ao cliente e ao prestador:** regras de conduta previsíveis e verificáveis; restrição proporcional à reputação.
- **Valor à operação:** avaliação consistente de risco e fila administrativa de contas em revisão, sem permitir edição direta do escore.

## 2. Rastreabilidade

| Tipo | Referências | Origem |
|---|---|---|
| RF | RF-057 (revisão/notificação), RF-069 (evento e recálculo) | spec §7.7 e §7.8 |
| RN | RN-22, RN-23, RN-00; RN-12 como consumidora da classificação | spec §6.6–6.7 |
| RNF | RNF-01 (persistência), RNF-08 (UTC); RNF-07 (auditoria) como decorrência da SPEC-001 | spec §8 |
| Invariantes globais | INV-07, INV-08, INV-13 | spec §9.8 |
| US | US-30, US-38 | spec §5 |
| UC | UC-13 — gatilho por reputação, sem a decisão administrativa | spec §10.14 |
| Entidades | `Usuario`, `EventoReputacao`; `LogAuditoria` para transição | spec §9.2 |
| Drivers | R-6.2 e R-6.4 | mapa SPEC-006 |
| ADR | ADR-002 — livro-razão, persistência e eventos | docs/ADRs |

## 3. Escopo

### Incluído

1. Gravar um `EventoReputacao` com titular, tipo, delta aplicado, origem rastreável e instante UTC quando uma regra produtora solicitar o registro.
2. Recalcular `Usuario.reputacao` como projeção: reputação inicial congelada na criação + soma dos deltas válidos, não revertidos, dentro dos últimos P-20 dias; limitar o resultado a [0,100].
3. Usar P-08 **da criação da conta**, persistida em `usuario.reputacao_inicial` (SPEC-002); não usar a P-08 atual para recálculo de contas existentes.
4. Aplicar a classificação: abaixo de P-09, `EM_REVISAO` em conta elegível; apenas cliente entre P-09 (inclusive) e P-10 (exclusive), `RESTRITO`; recuperação para `ATIVO` quando cabível, respeitando a máquina aprovada.
5. Registrar transições de conta e notificar titular/admin conforme RF-057 e SPEC-004; nunca reabilitar automaticamente uma conta em revisão ou suspensa, cujo desbloqueio depende de administração.
6. Considerar alterações da janela P-20 sobre a projeção atual, sem reescrever eventos passados (exceção RN-00 aprovada).

### Fora do escopo

- Determinar **quando** ocorre cancelamento, no-show, avaliação ou disputa: os produtores dessas ocorrências são definidos em SPEC-017, 019, 021, 022 e 023.
- Aprovação, suspensão ou reativação por administrador (SPEC-025, RF-078 e RF-079).
- Perfil público e indicadores agregados (SPEC-021, RF-070).
- Cobrança financeira, comissão, prova de pagamento ou multas.
- Qualquer ajuste manual direto no campo `usuario.reputacao`, que viola INV-08.

## 4. Dependências

- **SPEC-001:** parâmetros e histórico (P-08, P-09, P-10, P-20, P-22), máquina de estados e auditoria transacional.
- **SPEC-002:** criação de conta, estado inicial e `reputacao_inicial` gravada na conta.
- **SPEC-004:** canal de notificações; o evento de revisão deve chegar aos destinatários previstos.
- **Specs posteriores:** eventos de avaliação, cancelamento, no-show e disputa devem chamar o serviço de reputação com tipo, delta e origem; a SPEC-006 **não** antecipa sua semântica.

## 5. Comportamento esperado

### 5.1 Registrar um evento e recalcular

1. Serviço produtor fornece titular, tipo, delta vigente de P-22, identificador e tipo da origem.
2. Valida-se o vínculo e grava-se evento com `criado_em` UTC e `revertido_em` nulo.
3. Recalcula-se a projeção de reputação na janela P-20; o delta fica **congelado no evento** (RN-00).
4. Grava-se a projeção em `usuario.reputacao`; classifica-se a conta elegível e audita-se a transição.
5. Se surgir `EM_REVISAO`, notifica-se titular e admin conforme RF-057.

**Exceções:** falha na persistência do evento ou na atualização obrigatória não pode deixar histórico e projeção mutuamente inconsistentes; a unidade de trabalho é revertida. Não se admite origem inventada nem evento sem titular válido.

### 5.2 Consultar e recalcular a projeção

1. Obtém-se a P-08 original gravada em `usuario.reputacao_inicial`.
2. Consideram-se somente eventos válidos com `revertido_em IS NULL` e `criado_em` dentro de P-20 dias até o instante de referência.
3. Soma-se o delta gravado de cada evento, sem recalculá-lo a partir da P-22 atual.
4. Trunca-se o valor final ao intervalo [0,100] e usa-se inteiro, como definido na baseline.

**Nota RN-00:** alterar P-20 pode mudar a reputação corrente porque a janela é móvel; eventos antigos **não** são modificados ou apagados.

### 5.3 Classificar sem violar estados

- Conta operante com reputação **menor que** P-09: transição permitida para `EM_REVISAO`, auditoria e notificação.
- **Cliente** operante com P-09 ≤ reputação < P-10: `RESTRITO`.
- Cliente `RESTRITO` que recupera reputação ≥ P-10: `ATIVO`.
- Prestador não recebe `RESTRITO` por reputação; abaixo de P-09, entra em `EM_REVISAO`.
- `EM_REVISAO` e `SUSPENSO` nunca são reativados automaticamente. Contas `PENDENTE_APROVACAO` ou `REPROVADO` não têm o processo de aprovação contornado pela classificação.

### 5.4 Reverter evento

A reversão definida pelo produtor de uma disputa deve marcar `revertido_em` e recalcular a conta. Não se apaga ou reescreve o delta. A origem deve permitir evitar reversões indevidas e identificar eventos afetados.

## 6. Regras e invariantes

| ID local | Regra derivada | Como verificar |
|---|---|---|
| INV-001 | Reputação está sempre no intervalo [0,100] (INV-07) | extremos acima e abaixo |
| INV-002 | A projeção é P-08 gravada + deltas válidos na janela, sem eventos revertidos (INV-08) | comparação de projeção com livro-razão |
| INV-003 | Alterar P-22 não reescreve deltas de eventos anteriores (RN-00) | alterar configuração e reler eventos |
| INV-004 | Alterar P-20 muda apenas a seleção atual da janela, não os eventos gravados | relógio controlado |
| INV-005 | `RESTRITO` como efeito de reputação é exclusivo do perfil CLIENTE (RN-22) | matriz por perfil |
| INV-006 | Suspensão/revisão nunca é revertida automaticamente pela melhoria da reputação | matriz de transições |
| INV-007 | Toda alteração de estado causada por reputação deixa auditoria e notificações exigidas (SPEC-001/004) | eventos e registros correlacionados |

## 7. Modelo de domínio envolvido

- **`Usuario`:** `id`, `perfil`, `estado_conta`, `reputacao` (cache) e `reputacao_inicial` (P-08 da criação).
- **`EventoReputacao`:** `id`, `usuario_id`, `tipo`, `delta`, `origem_tipo`, `origem_id`, `criado_em`, `revertido_em`. O registro é o livro-razão.
- **`ParametroSistema`:** P-09, P-10, P-20 e P-22 atuais, com vigência histórica da SPEC-001.
- **`LogAuditoria`:** alteração de estado com origem e correlação, ator do sistema nulo quando pertinente.
- **`Notificacao`:** avisos do titular e do admin conforme RF-057/SPEC-004.
- **P-22:** tabela de deltas da RN-23, com valores padrão: conclusão +1, avaliação 5★ +3, 4★ +1, 3★ 0, 2★ −2, 1★ −4, cancelamento parcial cliente −3/prestador −5, total cliente −6/prestador −10, no-show −12, disputa contra −8. A restrição aprovada da faixa é metade ao dobro do padrão, mesmo sinal e prestador nunca com penalidade menor que cliente na mesma faixa; os zeros permanecem zeros.

## 8. Impacto arquitetural

- `src/dominio/reputacao.js`: funções puras de cálculo e classificação.
- `src/aplicacao/reputacao.js`: orquestra registro de eventos, projeção, auditoria e notificação.
- `src/infra/repositorios/social.js`: armazenamento do livro-razão e reversões.
- `src/infra/repositorios/usuarios.js`: atualização do cache de reputação e estado.
- `src/dominio/parametros.js` e repositório de parâmetros: P-22 parametrizado, versionado e validado (atualmente implementado com 14 chaves de P-22; representação final pendente de aprovação).
- As transações devem impedir evento gravado sem a projeção e os efeitos obrigatórios coerentes. Não se deve introduzir acesso a banco ou relógio dentro do módulo puro do domínio.

## 9. Contratos necessários (conceituais)

- `aplicarEvento({usuarioId,tipo,delta,origemTipo,origemId}) -> reputacaoAtual`; produtor fornece delta vigente; serviço persiste e recalcula.
- `recalcular(usuarioId, instante) -> int[0,100]`; idempotente para o mesmo livro-razão/janela/instante.
- `classificarPorReputacao(reputacao,params,perfil) -> estadoAlvo`; não modifica o banco.
- `reverterEventosDaOrigem(origemTipo,origemId,usuarioId?) -> listaAfetados`, com auditoria conforme origem.
- **Sem compromisso de API HTTP externa nesta Spec**; módulos de aplicação e infraestrutura podem definir adaptadores posteriores.

## 10. Requisitos não funcionais aplicáveis

| RNF | Aplicação | Evidência |
|---|---|---|
| RNF-01 | Eventos e reputação persistem com consistência | reabertura de banco e falha transacional |
| RNF-08 | UTC consistente e relógio controlável | teste com janela P-20 e limites |
| RNF-07 | Observabilidade e correlação em mudanças de estado | inspeção do `LogAuditoria` |
| RNF-04 | Resguardo de dados pessoais em notificações e consultas | não expor contatos em fluxos públicos |
| RNF-06 | Testes derivam das regras e invariantes | matriz CA → testes |

## 11. Critérios de aceitação

**CA-01 — Registro:** dado evento válido, quando aplicado, então livro-razão persiste tipo, delta, origem, instante UTC e usuário.

**CA-02 — Limites:** dados deltas que excedam extremos, quando recalcular, então reputação fica em [0,100].

**CA-03 — Janela e reversão:** dados eventos anteriores e posteriores ao limite P-20, inclusive evento revertido, quando recalcular, então somente os elegíveis entram na soma.

**CA-04 — P-08 congelado:** dado usuário criado com P-08 antiga, quando P-08 mudar, então recalcular mantém o valor inicial original.

**CA-05 — P-22 congelado:** dado evento gravado com delta vigente, quando P-22 mudar, então o evento antigo conserva delta e novas ocorrências usam valores aprovados vigentes.

**CA-06 — Cliente restrito:** dado cliente operante com P-09 ≤ reputação < P-10, quando classificar, então fica `RESTRITO`; prestador no mesmo intervalo não fica `RESTRITO`.

**CA-07 — Revisão:** dado usuário operante com reputação abaixo de P-09, quando recalcular, então transita para `EM_REVISAO`, com log e avisos para titular/admin.

**CA-08 — Não reativação automática:** dadas contas `EM_REVISAO` ou `SUSPENSO`, quando a projeção melhora, então estado administrativo não é modificado automaticamente.

**CA-09 — Atomicidade:** dada falha ao persistir uma operação obrigatória, quando aplicar evento, então não pode permanecer evento sem projeção/estado exigidos pela operação.

**CA-10 — Alteração da janela:** dada P-20 modificada, quando recalcular, então a projeção usa a nova janela e os eventos antigos permanecem idênticos.

## 12. Casos de teste derivados

| Teste | Critério |
|---|---|
| `T-REPUT-01 \| RN-23: evento conserva delta, origem e UTC` | CA-01 |
| `T-REPUT-02 \| INV-07: reputacao satura em 0 e 100` | CA-02 |
| `T-REPUT-03 \| INV-08: janela e reversao nao contam eventos excluidos` | CA-03 |
| `T-REPUT-04 \| RN-00: P-08 inicial da conta nao retroage` | CA-04 |
| `T-REPUT-05 \| RN-00: P-22 alterada nao reescreve eventos anteriores` | CA-05 |
| `T-REPUT-06 \| RN-22: somente cliente entra em RESTRITO` | CA-06 |
| `T-REPUT-07 \| RF-057: revisao notifica usuario e admin com auditoria` | CA-07 |
| `T-REPUT-08 \| RN-22: conta em revisao ou suspensa nao reativa sozinha` | CA-08 |
| `T-REPUT-09 \| RNF-01: falha transacional nao separa evento de efeitos` | CA-09 |
| `T-REPUT-10 \| RN-00: P-20 altera projecao, nao o livro-razao` | CA-10 |

## 13. Questões em aberto para decisão humana

1. **P-22 — representação configurável:** o código já usa 14 chaves configuráveis com o identificador P-22 (PR #125); confirmar se esta é a representação definitiva ou se a equipe quer outra estrutura. A SPEC-001 aprovou a política e a faixa, **não** o esquema físico. Preservar todos os deltas históricos.
2. **Notificação ao admin (RF-057):** o código já cria notificações na central do titular e dos administradores (PR #129); confirmar se basta a central, se também deve haver fila dedicada ou ambos, em alinhamento com SPEC-004/SPEC-025.
3. **Atomicidade (RF-069/INV-08):** `aplicarEvento`, `recalcular` e reversão usam transações aninháveis (PRs #129/#136), com testes de rollback. Formalizar na aprovação se esta responsabilidade fica na aplicação ou é exigida do chamador.
4. **P-20 — inclusão de limites e eventos futuros:** a implementação exclui eventos futuros e inclui o instante exato da fronteira P-20, medido em milissegundos (PR #136); confirmar se esta convenção deve entrar no contrato aprovado.
5. **Classificação após alteração administrativa:** o estado `ATIVO` restaurado pelo admin continua sujeito à avaliação automática no evento seguinte; confirmar se é necessário tratamento de reincidência ou trava adicional.
6. **OPEN-03:** drivers arquiteturais seguem derivados das restrições e da constituição, sem catálogo formal aprovado.

Nenhuma das questões acima foi decidida neste rascunho. Alterações de regras de reputação dependem de aprovação explícita da equipe, com registro no SDD.

## 14. Definition of Done

1. Equipe aprova esta Spec, as questões de mérito e o modelo de persistência de P-22.
2. Código existente é conferido contra CA-01 a CA-10; divergências registradas no `registro-sdd.md`.
3. Implementação é corrigida **somente** onde diverge da baseline aprovada, com testes T-REPUT-01 a 10.
4. Integridade de livro-razão, versão dos deltas, inicial congelado, janela, classificação, notificação e auditoria têm evidência.
5. `npm test` no Node >=24 está verde e PR foi revisado por outro integrante.
6. Questões do admin e eventos de Specs posteriores continuam rastreadas sem antecipar implementação.
