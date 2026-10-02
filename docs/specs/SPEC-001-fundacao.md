# SPEC-001 — Fundação: parâmetros, máquinas de estado e trilha de auditoria

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-10-01 |
| Status | **Aprovada** pela equipe em 2026-10-01. As questões da seção 13 continuam abertas e precisam de decisão antes de declarar a Spec concluída (seção 14) |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 1 de 29 |
| Baseline | `docs/spec.md` v0.1.3 · `docs/plan.md` v1.0.0 · ADR-001, ADR-002 |

---

## 1. Identificação

- **ID:** SPEC-001
- **Nome:** Fundação: parâmetros, máquinas de estado e trilha de auditoria
- **Objetivo:** estabelecer três mecanismos que todas as Specs seguintes usam:
  1. os **parâmetros do domínio** (spec §6.1) são dados, com valor padrão, faixa validada e vigência, e nunca retroagem;
  2. as **máquinas de estado** de `Agendamento`, `HorarioVago`, `Usuario` e `Disputa` (spec §9.4 a §9.7) são declaradas, e nenhuma transição fora delas é aceita;
  3. toda **transição de estado** fica registrada na trilha de auditoria, com autor, instante, estados e correlação.
- **Valor entregue:**
  - **Ao sistema:** nenhuma Spec posterior precisa decidir sozinha como ler um limiar, como validar uma mudança de estado ou como auditar. Tudo isso fica igual para o sistema inteiro.
  - **Ao usuário (indireto):** a transição recusada sai com o motivo identificado (C-VIII), e qualquer desfecho de agendamento pode ser reconstruído depois (C-IX).

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-084 (registro de toda transição) | spec §7.9 |
| RB | RN-00 (parâmetros são dados e não retroagem) | spec §6.1 |
| RNF | RNF-01, RNF-07, RNF-08, RNF-10 | spec §8 |
| Caso de uso / fluxo | Transversal: as máquinas de estado das §9.4 a §9.7 são a pós-condição de todos os UC-01 a UC-14 | spec §9, §10 |
| Entidades | `ParametroSistema`, `LogAuditoria`, e o atributo `estado` de `Agendamento`, `HorarioVago`, `Usuario` e `Disputa` | spec §9.2 |
| Invariantes globais | INV-13 | spec §9.8 |
| Drivers arquiteturais | R-6.2 (persistência de estado), R-6.4 (regras explícitas), C-III, C-VI, C-VIII, C-IX | spec §1.5, constituição |
| ADRs | ADR-001 (stack), ADR-002 (modelo de dados, tempo em UTC, defesa no banco) | `docs/adr/` |
| Plano | §5.1 (parâmetros), §5.4 (transações), §6 (modelo físico), §4 (ciclo da requisição) | `docs/plan.md` |

## 3. Escopo

### Incluído

1. **Catálogo de parâmetros:** todos os parâmetros da spec §6.1, com identificador, escopo, valor padrão e faixa permitida.
2. **Leitura do valor vigente** de um parâmetro, para o escopo e o instante pedidos.
3. **Validação** de um valor de parâmetro contra a faixa permitida.
4. **Registro de alteração** de parâmetro com vigência (`vigente_desde`) e autor (`atualizado_por`), garantindo que a alteração não retroage.
5. **Declaração das quatro máquinas de estado** e uma única operação de verificação que recusa qualquer transição não declarada.
6. **Registro de auditoria** de toda transição de estado, na mesma unidade atômica da própria transição, com identificador de correlação.

### Fora do escopo

| Comportamento | Onde fica |
|---|---|
| Tela do admin para editar parâmetros globais | SPEC-027 |
| Prestador configurando P-01 e P-02 no próprio perfil | SPEC-009 |
| Percentual de comissão por categoria (P-13 com vigência) | SPEC-026 |
| Executar as transições de negócio (reservar, confirmar, cancelar…) | cada Spec do respectivo UC |
| Notificar as partes de uma transição | SPEC-004 |
| Auditoria de acesso negado | SPEC-003 |
| Auditoria de ação administrativa e de interpretação do LLM, e a consulta da trilha | SPEC-029 |
| Máquina de estados do `LancamentoComissao` (`EFETIVADO`/`RETIDO`/`ESTORNADO`) | não declarada na baseline (OPEN-105) |

## 4. Dependências

| Tipo | Item |
|---|---|
| Specs anteriores | nenhuma (é a primeira do mapa) |
| Decisões arquiteturais | ADR-001 (Node.js 24 sem dependências de runtime), ADR-002 (SQLite, tempo em ISO-8601 UTC, invariantes no banco), plan §2 (domínio sem I/O, então o instante chega como parâmetro), plan §5.4 (transação com `SAVEPOINT` para aninhamento) |
| Decisões humanas pendentes | OPEN-01 e OPEN-02 do mapa (ver seção 13) |

## 5. Comportamento esperado

### 5.1 Ler o valor vigente de um parâmetro

- **Pré-condições:** o parâmetro está no catálogo (seção 7.1).
- **Fluxo principal:**
  1. O chamador pede o parâmetro pela chave, com o escopo (global, prestador ou serviço, conforme o parâmetro) e o instante de referência.
  2. O sistema localiza o registro de maior `vigente_desde` que seja menor ou igual ao instante de referência, no escopo pedido.
  3. O sistema devolve o valor.
- **Fluxos alternativos:**
  - 2a. Não existe registro no escopo específico (prestador ou serviço): o sistema usa o valor global vigente (ver OPEN-103).
  - 2b. Não existe registro algum: o sistema devolve o valor padrão da spec §6.1.
- **Fluxo de exceção:**
  - 1a. A chave não está no catálogo: a operação é recusada como erro de programação, não como erro de regra, e nenhum valor padrão é inventado.
- **Pós-condições:** nenhuma alteração de estado.

### 5.2 Alterar o valor de um parâmetro

- **Pré-condições:** quem altera já foi autorizado pela Spec que expõe a alteração (SPEC-009, SPEC-026 ou SPEC-027).
- **Fluxo principal:**
  1. O sistema recebe a chave, o escopo, o novo valor e o autor.
  2. O sistema valida o tipo e a faixa permitida.
  3. O sistema registra o novo valor com `vigente_desde` igual ao instante atual e `atualizado_por` igual ao autor. O valor anterior é preservado.
- **Fluxo de exceção:**
  - 2a. O valor está fora da faixa ou é de tipo inválido: a alteração é recusada com erro de regra que carrega `RN-00` e o identificador do parâmetro (por exemplo `P-01`), informando a faixa permitida. Nada é gravado.
- **Pós-condições:** fatos ocorridos antes de `vigente_desde` continuam com os valores da época (INV-002).

### 5.3 Verificar uma transição de estado

- **Pré-condições:** a entidade é uma das quatro com máquina declarada.
- **Fluxo principal:**
  1. O chamador informa a entidade, o estado atual e o estado pretendido.
  2. O sistema confirma que o par (atual → pretendido) está declarado na máquina da entidade (seção 7.2).
  3. A verificação passa e o chamador segue com a transição.
- **Fluxo de exceção:**
  - 2a. O par não está declarado: a transição é recusada com erro que identifica a entidade, os dois estados e a regra violada. Nenhuma gravação ocorre.
- **Pós-condições:** nenhuma. A verificação só autoriza.

### 5.4 Registrar uma transição na auditoria

- **Pré-condições:** a transição passou pela verificação de 5.3.
- **Fluxo principal:**
  1. Dentro da mesma unidade atômica que grava o novo estado, o sistema grava um `LogAuditoria` com ator, ação, tipo e identificador da entidade, estado anterior, estado novo, identificador de correlação e instante.
  2. A unidade atômica é confirmada: o estado novo e o registro passam a existir juntos.
- **Fluxos alternativos:**
  - 1a. A transição foi disparada por rotina temporal, sem ator humano: o registro identifica o sistema como ator (ver OPEN-104).
- **Fluxo de exceção:**
  - 1b. A gravação da auditoria falha: a unidade atômica inteira é desfeita e o estado não muda (INV-003).
- **Pós-condições:** para toda mudança persistida de `estado` existe exatamente um registro correspondente.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Nenhum valor de parâmetro fora da faixa permitida da spec §6.1 é aceito pela alteração | teste: valor no limite (aceito) e um passo além do limite (recusado), para cada parâmetro com faixa | RN-00, RNF-10 |
| INV-002 | A leitura de um parâmetro com instante de referência anterior a uma alteração devolve o valor anterior à alteração | teste com relógio controlado: altera em t₁ e lê em t₀ < t₁ e em t₂ > t₁ | RN-00 ("não retroage") |
| INV-003 | Toda mudança persistida do atributo `estado` de `Agendamento`, `HorarioVago`, `Usuario` ou `Disputa` tem exatamente um `LogAuditoria` correspondente | teste: força uma falha na gravação da auditoria e verifica que o estado não mudou | INV-13, RF-084 |
| INV-004 | Nenhuma transição fora das máquinas declaradas na seção 7.2 é persistida | teste: tenta, para cada máquina, ao menos uma transição não declarada e um estado terminal como origem | spec §9.4 a §9.7 |
| INV-005 | Todo `LogAuditoria` de transição tem estado anterior, estado novo, ator, instante em UTC e identificador de correlação preenchidos | teste de esquema mais teste de gravação | RF-084, RNF-07, RNF-08 |
| INV-006 | As regras do domínio não leem o relógio real: todo instante usado em verificação chega como parâmetro | revisão de dependências do módulo de domínio mais testes executados com relógio controlado | plan §2, C-II |
| INV-007 | Os valores de estado aceitos para cada entidade estão protegidos também no banco, além do domínio | teste: gravação direta de estado inexistente é rejeitada pelo banco | C-VI, ADR-002 |

> **Nota sobre IDs:** os invariantes acima usam a numeração local `INV-001` pedida pelo roteiro. O
> invariante global da baseline coberto por esta Spec é o **INV-13** (spec §9.8). Ver OPEN-02.

## 7. Modelo de domínio envolvido

### 7.1 `ParametroSistema` (spec §9.2)

| Atributo | Papel nesta Spec |
|---|---|
| `chave` | identifica o parâmetro do catálogo |
| `valor` | valor vigente a partir de `vigente_desde` |
| `escopo` | `GLOBAL`, `PRESTADOR` ou `SERVICO` |
| `alvo_id` | prestador ou serviço, quando o escopo não é global |
| `vigente_desde` | instante a partir do qual o valor vale (RN-00) |
| `atualizado_por` | autor da alteração |

Catálogo exigido (spec §6.1, transcrito sem alteração):

| ID | Parâmetro | Escopo | Padrão | Faixa |
|---|---|:--:|---|---|
| P-01 | Janela de confirmação do prestador | P | 15 min | 5 a 60 min |
| P-02 | Política ao expirar a janela | P | `LIBERAR` | `LIBERAR` ou `AUTOCONFIRMAR` |
| P-03 | Antecedência mínima para publicar | G | 60 min | 30 a 240 min |
| P-04 | Antecedência mínima para reservar | G | 30 min | 15 a 120 min |
| P-05 | Teto de desconto da plataforma | G | 60% | 30% a 80% |
| P-06 | Janela de cancelamento sem penalidade | G | 6 h | 2 a 24 h |
| P-07 | Janela de penalidade total | G | 2 h | 0,5 a 6 h |
| P-08 | Reputação inicial | G | 70 | 50 a 80 |
| P-09 | Limiar de revisão administrativa | G | 40 | 20 a 60 |
| P-10 | Limiar de restrição do cliente | G | 50 | 30 a 70 |
| P-11 | Reservas simultâneas (normal / restrito) | G | 3 / 1 | 1 a 5 / 1 a 2 |
| P-12 | Ocorrências negativas do prestador | G | 3 em 30 dias | 2 a 5 |
| P-13 | Percentual de comissão | G / S | 12% | 8% a 15% |
| P-14 | Janela de avaliação | G | 7 dias | 3 a 15 dias |
| P-15 | Prazo para abrir disputa | G | 48 h após o fim | 24 a 96 h |
| P-16 | Janela para reportar no-show | G | +15 min do início até 24 h após o fim | — (OPEN-20) |
| P-17 | Prazo de conclusão automática | G | 24 h após o fim | 12 a 72 h |
| P-18 | SLA de resolução de disputa | G | 72 h | 24 a 120 h |
| P-19 | Confiança mínima do LLM | G | 0,60 | 0,40 a 0,90 |
| P-20 | Janela móvel da reputação | G | 90 dias | 30 a 180 dias |

Restrição: a alteração preserva o histórico. Um registro anterior não é sobrescrito.

### 7.2 Máquinas de estado (transcrição das §9.4 a §9.7)

**`Agendamento`**: `PENDENTE_CONFIRMACAO → CONFIRMADO | RECUSADO | EXPIRADO | CANCELADO_CLIENTE` ·
`CONFIRMADO → CANCELADO_CLIENTE | CANCELADO_PRESTADOR | NO_SHOW_CLIENTE | NO_SHOW_PRESTADOR | EM_DISPUTA | CONCLUIDO` ·
`CONCLUIDO → EM_DISPUTA` · `NO_SHOW_CLIENTE → EM_DISPUTA` · `NO_SHOW_PRESTADOR → EM_DISPUTA` ·
`EM_DISPUTA → CONCLUIDO | NO_SHOW_CLIENTE | NO_SHOW_PRESTADOR | ARQUIVADO`.
Terminais: `RECUSADO`, `EXPIRADO`, `CANCELADO_CLIENTE`, `CANCELADO_PRESTADOR`, `ARQUIVADO`, e `CONCLUIDO` depois de esgotado P-15.

**`HorarioVago`**: `RASCUNHO → PUBLICADO` · `PUBLICADO → BLOQUEADO | CANCELADO | EXPIRADO` ·
`BLOQUEADO → OCUPADO | PUBLICADO | EXPIRADO` · `OCUPADO → ENCERRADO | CANCELADO | PUBLICADO | EXPIRADO`.
Terminais: `CANCELADO`, `EXPIRADO`, `ENCERRADO`.

**`Usuario`**: estado inicial `PENDENTE_APROVACAO` (prestador) ou `ATIVO` (cliente) ·
`PENDENTE_APROVACAO → ATIVO | REPROVADO` · `ATIVO → RESTRITO | EM_REVISAO` · `RESTRITO → ATIVO | EM_REVISAO` ·
`EM_REVISAO → ATIVO | SUSPENSO` · `SUSPENSO → ATIVO`. Terminal: `REPROVADO`.

**`Disputa`**: estado inicial `ABERTA` · `ABERTA → EM_ANALISE | RESOLVIDA` · `EM_ANALISE → RESOLVIDA`. Terminal: `RESOLVIDA`.

> As lacunas já conhecidas nestas máquinas (OPEN-06, OPEN-08, OPEN-15) **não** foram corrigidas aqui.
> Esta Spec declara as máquinas exatamente como a baseline as define. A correção, se aprovada, entra
> primeiro na spec com registro no histórico de versões.

### 7.3 `LogAuditoria` (spec §9.2)

| Atributo | Papel nesta Spec |
|---|---|
| `ator_id` | quem causou a transição (ver OPEN-104 para o ator "sistema") |
| `acao` | nome da operação que causou a transição |
| `entidade_tipo`, `entidade_id` | qual registro mudou |
| `estado_anterior`, `estado_novo` | a transição em si |
| `correlacao_id` | liga todas as gravações de uma mesma requisição ou rotina (RNF-07) |
| `criado_em` | instante em UTC (RNF-08) |

Relacionamentos: o `LogAuditoria` referencia a entidade por tipo e identificador, sem chave estrangeira
única, porque cobre quatro entidades diferentes. A spec não define isso; está em ADR-002 e plan §6.

## 8. Impacto arquitetural

| Item | Impacto |
|---|---|
| Módulos envolvidos | `dominio` (catálogo de parâmetros, validação de faixa, declaração das máquinas, verificação de transição); `infra` (persistência de parâmetros e auditoria, unidade atômica); `aplicacao` (composição verificar → gravar → auditar, a ser seguida por todos os casos de uso) |
| Fronteiras | O domínio não lê banco nem relógio (plan §2): recebe o valor do parâmetro e o instante já resolvidos. A infra conhece o domínio; o domínio não conhece a infra |
| Integrações externas | nenhuma |
| Frontend | nenhuma responsabilidade nesta Spec. A exibição do erro de regra com seu identificador é obrigação da camada de interface (C-VIII), verificada nas Specs com tela |
| Backend | todos os mecanismos desta Spec |
| ADRs que restringem | ADR-001 (sem bibliotecas: nada de ORM nem de biblioteca de máquina de estados); ADR-002 (tempo em ISO-8601 UTC; estados protegidos por `CHECK`; transação com `SAVEPOINT` em aninhamento) |

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Ler parâmetro | chave; escopo e alvo (quando aplicável); instante de referência | valor vigente | chave desconhecida (erro de programação) |
| Alterar parâmetro | chave; escopo e alvo; novo valor; autor | registro com `vigente_desde` | `RN-00` mais o ID do parâmetro quando fora da faixa ou de tipo inválido |
| Verificar transição | entidade; estado atual; estado pretendido | sucesso (sem valor) | transição não declarada, com entidade, estados e regra |
| Registrar transição | ator; ação; entidade e id; estado anterior e novo; correlação | registro gravado | falha de gravação desfaz a unidade atômica inteira |

O formato concreto (assinatura de função, nome de tabela, rota HTTP) **não** é definido por esta Spec. A
persistência física já tem decisão em ADR-002 e plan §6. Nenhuma rota HTTP é necessária nesta Spec.

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta esta Spec | Como será verificado |
|---|---|---|
| RNF-01 Persistência | parâmetros e auditoria sobrevivem ao reinício | teste: grava, reabre a base e lê de novo |
| RNF-07 Observabilidade | todo registro de transição tem correlação | teste: duas transições na mesma requisição compartilham a correlação; requisições diferentes não |
| RNF-08 Consistência temporal | `vigente_desde` e `criado_em` em UTC; nenhuma verificação usa o relógio do cliente | teste com relógio controlado; inspeção do formato gravado |
| RNF-10 Configurabilidade | alterar parâmetro não exige mudar código nem fazer deploy | teste: alterar o valor muda a leitura seguinte sem reiniciar |

## 11. Critérios de aceitação

**CA-01 — Valor padrão**
- **Dado** que nenhum valor foi registrado para P-03,
- **quando** o sistema lê P-03,
- **então** obtém 60 minutos.

**CA-02 — Alteração dentro da faixa**
- **Dado** P-03 vigente em 60 minutos,
- **quando** um autor altera P-03 para 90 minutos,
- **então** a alteração é gravada com `vigente_desde` igual ao instante da alteração e o autor identificado, e a leitura seguinte devolve 90.

**CA-03 — Alteração fora da faixa**
- **Dado** a faixa de P-03 de 30 a 240 minutos,
- **quando** um autor tenta gravar 29 ou 241,
- **então** a alteração é recusada com erro que cita `RN-00` e `P-03` e informa a faixa permitida, e o valor vigente continua o anterior.

**CA-04 — Não retroatividade**
- **Dado** P-03 alterado de 60 para 90 no instante t₁,
- **quando** o sistema lê P-03 com instante de referência anterior a t₁,
- **então** obtém 60.

**CA-05 — Escopo específico sobre o global**
- **Dado** P-01 global de 15 minutos e P-01 de 30 minutos para o prestador X,
- **quando** o sistema lê P-01 para X e para outro prestador Y,
- **então** obtém 30 para X e 15 para Y.

**CA-06 — Transição declarada**
- **Dado** um `Agendamento` em `PENDENTE_CONFIRMACAO`,
- **quando** a transição pretendida é para `CONFIRMADO`,
- **então** a verificação passa.

**CA-07 — Transição não declarada**
- **Dado** um `Agendamento` em `RECUSADO` (terminal),
- **quando** a transição pretendida é para `CONFIRMADO`,
- **então** a verificação recusa, identificando a entidade, os dois estados e a regra, e nada é gravado.

**CA-08 — Transição sempre auditada**
- **Dado** uma transição válida de `HorarioVago` de `PUBLICADO` para `BLOQUEADO`,
- **quando** ela é persistida,
- **então** existe exatamente um `LogAuditoria` com estado anterior `PUBLICADO`, estado novo `BLOQUEADO`, ator, instante em UTC e correlação.

**CA-09 — Atomicidade entre estado e auditoria**
- **Dado** uma transição válida,
- **quando** a gravação da auditoria falha,
- **então** o estado da entidade permanece o anterior.

**CA-10 — Correlação**
- **Dado** uma única operação que muda o estado de um `Agendamento` e de um `HorarioVago`,
- **quando** ambas as transições são auditadas,
- **então** os dois registros têm o mesmo identificador de correlação.

**CA-11 — Defesa no banco**
- **Dado** a base de dados,
- **quando** se tenta gravar diretamente um estado inexistente numa das quatro entidades,
- **então** a gravação é rejeitada pelo próprio banco.

## 12. Casos de teste derivados

Nomenclatura conforme a convenção do projeto (`T-<ÁREA>-NN | <regra>: <comportamento>`). Os testes não são implementados nesta etapa.

| Teste | Cobre |
|---|---|
| `T-PARAM-01 \| RN-00: parametro sem registro devolve o padrao da spec` | CA-01 |
| `T-PARAM-02 \| RN-00: alteracao dentro da faixa vale a partir de vigente_desde` | CA-02 |
| `T-PARAM-03 \| RN-00: valor fora da faixa e recusado citando o parametro` (limites inferior e superior de cada parâmetro com faixa) | CA-03, INV-001 |
| `T-PARAM-04 \| RN-00: alteracao nao retroage a leitura anterior` | CA-04, INV-002 |
| `T-PARAM-05 \| RN-00: escopo de prestador prevalece sobre o global` | CA-05 |
| `T-PARAM-06 \| RNF-01: parametro alterado sobrevive a reabertura da base` | RNF-01 |
| `T-ESTADO-01 \| INV-13: toda transicao declarada e aceita` (percorre as quatro máquinas) | CA-06 |
| `T-ESTADO-02 \| INV-13: transicao nao declarada e recusada` (ao menos uma por máquina, incluindo origem terminal) | CA-07, INV-004 |
| `T-AUDIT-01 \| RF-084: transicao persistida gera exatamente um registro` | CA-08, INV-003, INV-005 |
| `T-AUDIT-02 \| RF-084: falha na auditoria desfaz a transicao` | CA-09, INV-003 |
| `T-AUDIT-03 \| RNF-07: transicoes da mesma operacao compartilham correlacao` | CA-10 |
| `T-AUDIT-04 \| RNF-08: instantes de auditoria e vigencia gravados em UTC` | INV-005, RNF-08 |
| `T-ESTADO-03 \| INV-13: banco rejeita estado inexistente` | CA-11, INV-007 |
| `T-DOMINIO-01 \| plan §2: modulos de dominio nao importam I/O nem relogio real` | INV-006 |

## 13. Questões em aberto

Herdadas do mapa e pertinentes a esta Spec:

- **OPEN-01:** o código existente será verificado contra esta Spec ou reimplementado? Até a decisão, a seção 14 vale para qualquer das duas opções.
- **OPEN-02:** a numeração local `INV-001` convive com a global `INV-13`. Confirmar a convenção.
- **OPEN-05:** os deltas de reputação e a janela de 30 dias da RN-21 não estão no catálogo de parâmetros. Se forem parâmetros, o catálogo da seção 7.1 muda.
- **OPEN-06, OPEN-08, OPEN-15:** lacunas nas máquinas de estado da seção 7.2, transcritas sem correção.
- **OPEN-20:** P-16 não tem faixa na spec, e o código existente diverge da §6.1 em P-07, P-12, P-16 e no limite do RNF-13.

Novas, surgidas na elaboração desta Spec:

- **OPEN-101 — decisão necessária:** o que conta como "fato ocorrido" na RN-00 para processos em andamento. Exemplo: se P-17 muda enquanto um agendamento já está `CONFIRMADO`, o prazo da conclusão automática segue o valor antigo ou o novo?
- **OPEN-102 — decisão necessária:** P-20 (janela da reputação) é retroativa por natureza. Alterá-la muda imediatamente a reputação de todas as contas, porque a reputação é recalculada sobre eventos passados. Isso contradiz a letra da RN-00?
- **OPEN-103 — decisão necessária:** a precedência entre escopos. P-01 e P-02 aparecem ao mesmo tempo como atributos de `PerfilPrestador` (`janela_confirmacao_min`, `politica_expiracao`) e como `ParametroSistema` de escopo `PRESTADOR`. Qual dos dois é a fonte? P-13 tem escopo "G / S" (serviço), mas RN-15, RF-080 e `CategoriaServico` tratam o percentual por **categoria**.
- **OPEN-104 — decisão necessária:** como identificar o ator de transições disparadas por rotina temporal (expiração, conclusão automática), já que `LogAuditoria.ator_id` pressupõe um usuário.
- **OPEN-105 — decisão necessária:** `LancamentoComissao` tem estados (`EFETIVADO`, `RETIDO`, `ESTORNADO`) mas não tem máquina declarada, e RF-084 não o inclui na auditoria obrigatória. Ele deve ganhar máquina e auditoria?

## 14. Definition of Done

A SPEC-001 estará concluída quando:

1. os critérios de aceitação CA-01 a CA-11 estiverem implementados;
2. os invariantes INV-001 a INV-007 estiverem preservados;
3. os testes derivados da seção 12 estiverem aprovados;
4. os RNFs da seção 10 tiverem sido verificados como descrito;
5. não houver divergência conhecida entre a implementação e esta Spec;
6. toda divergência em relação à baseline tiver sido explicitamente analisada. Em particular, as divergências de faixa da OPEN-20 precisam ser corrigidas na implementação **ou** levadas à spec como proposta de alteração, com aprovação humana.

> **Regra fundamental:** se a implementação entrar em conflito com esta Spec ou com a baseline, o
> comportamento não é alterado silenciosamente. A divergência é registrada com uma de duas ações:
> corrigir a implementação ou propor alteração da baseline. A decisão é da equipe.
