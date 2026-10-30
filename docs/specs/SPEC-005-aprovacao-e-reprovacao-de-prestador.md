# SPEC-005 — Aprovação e reprovação de prestador

| Campo | Valor |
|---|---|
| Versão | 1.3.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 foram decididas na etapa 63, o que completa a Definition of Done |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 5 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.6 · RN-28 · ADR-004 |

## 1. Identificação

- **ID:** SPEC-005
- **Nome:** Aprovação e reprovação de prestador
- **Objetivo:** permitir que o admin consulte cadastros pendentes e decida aprovar ou reprovar um prestador, com justificativa obrigatória na reprovação e notificação ao titular.
- **Valor entregue:**
  - **Ao marketplace:** só prestadores aprovados alcançam `ATIVO` e ficam elegíveis para publicar.
  - **Ao prestador:** recebe o resultado da análise e, se reprovado, a justificativa da decisão.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-003 (fila de moderação), RF-008, RF-009 | spec §7.1 |
| RN | RN-08, RN-28 | spec §6.3, §6.7 |
| RNF | RNF-03, RNF-07, RNF-11 | spec §8 |
| Histórias | US-04 | spec §5.2 |
| Caso de uso / fluxo | UC-01, passos 3–5 e alternativo 4a | spec §10.2 |
| Entidades | `Usuario`, `PerfilPrestador`, `Notificacao`, `LogAuditoria` | spec §9.2 |
| Invariantes globais | INV-13 | spec §9.8 |
| Drivers arquiteturais | R-6.1, R-6.2, C-IX | spec §1.5, constituição |
| ADRs | ADR-004 (papel admin, sessão e acesso protegido) | `docs/adr/` |
| Dependências | **SPEC-002:** contas e estados. **SPEC-003:** autorização. **SPEC-004:** notificação ao prestador | mapa §2 |

## 3. Escopo

### Incluído

1. Listar no contexto administrativo os prestadores em `PENDENTE_APROVACAO`.
2. Exibir informações de cadastro necessárias à revisão, sem permitir que o cliente ou prestador execute decisão administrativa.
3. Aprovar prestador pendente, alterando sua conta para `ATIVO`.
4. Reprovar cadastro com justificativa textual, alterando a conta para `REPROVADO`.
5. Registrar as transições administrativas com ator, estados e instante.
6. Notificar o prestador do resultado; a reprovação inclui a justificativa.
7. Impedir publicação enquanto a conta não estiver elegível `ATIVO`, conforme RN-08.

### Fora do escopo

| Comportamento | Onde fica |
|---|---|
| Cadastro e autenticação do prestador | SPEC-002 |
| Matriz de acesso às rotas e validação de titularidade | SPEC-003 |
| Completar perfil, serviços e régua do prestador | SPEC-009 e Specs de catálogo |
| Revisar conta sinalizada por reputação ou suspendê-la | SPEC-025 |
| Criar conta de administrador | OPEN-206 |
| Alterar os estados permitidos pela máquina global | SPEC-001 e spec §9.6 |

## 4. Dependências

| Tipo | Item |
|---|---|
| Specs anteriores | **SPEC-002:** conta `PENDENTE_APROVACAO` e sessão. **SPEC-003:** operações exclusivas do admin. **SPEC-004:** avisos ao titular |
| Decisões arquiteturais | transição de conta validada pela máquina e auditada na mesma unidade atômica (SPEC-001); sessão opaca (ADR-004) |
| Regras da baseline | RN-08 impede publicar antes da aprovação; RN-28 define estados iniciais e transições |

## 5. Comportamento esperado

### 5.1 Consultar fila de prestadores (RF-003)

- **Pré-condições:** usuário autenticado como `ADMIN`.
- **Fluxo principal:**
  1. Admin acessa a fila de moderação.
  2. O sistema lista prestadores em `PENDENTE_APROVACAO`, identificando os dados necessários à análise.
  3. Admin seleciona um cadastro para consultar seu dossiê.
- **Fluxos alternativos:**
  - 2a. Fila vazia: exibir estado vazio, sem erro.
- **Fluxos de exceção:**
  - 1a. Usuário sem perfil admin: negar a operação conforme SPEC-003, sem revelar dados da fila.

### 5.2 Aprovar prestador (RF-008)

- **Pré-condições:** admin autenticado; conta existe, é prestador e está `PENDENTE_APROVACAO`.
- **Fluxo principal:**
  1. Admin solicita aprovação.
  2. Sistema valida autorização e transição permitida.
  3. Em uma unidade atômica, muda o estado para `ATIVO` e registra auditoria com ator, estado anterior e novo.
  4. Sistema notifica o prestador que o cadastro foi aprovado e que pode seguir os requisitos de perfil antes de publicar.
- **Fluxos de exceção:**
  - 2a. Conta inexistente, não é prestador ou não está pendente: decisão recusada; não é criada transição administrativa duplicada.

### 5.3 Reprovar prestador (RF-009)

- **Pré-condições:** admin autenticado; conta é prestador e está `PENDENTE_APROVACAO`.
- **Fluxo principal:**
  1. Admin submete uma justificativa textual.
  2. Sistema valida que a justificativa foi informada e que a transição é permitida.
  3. Em uma unidade atômica, muda o estado para `REPROVADO` e registra auditoria com autor, estado anterior, novo estado e justificativa.
  4. Sistema notifica o prestador com o motivo da reprovação.
- **Fluxos de exceção:**
  - 1a. Justificativa ausente: recusar sem alterar conta nem gerar notificação de resultado.
  - 2a. Conta inexistente ou fora do estado elegível: recusar sem alterar estado.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Apenas admin autenticado decide aprovação/reprovação | tentativa de cliente/prestador deve ser negada | RF-006 a RF-009 |
| INV-002 | Aprovação só transita `PENDENTE_APROVACAO` para `ATIVO` | inspecionar conta e auditoria após decisão | RF-008, RN-28 |
| INV-003 | Reprovação só transita `PENDENTE_APROVACAO` para `REPROVADO` | inspecionar conta e auditoria após decisão | RF-009, RN-28 |
| INV-004 | Toda reprovação tem justificativa textual persistida/auditada e comunicada ao titular | comparar dossiê/auditoria/notificação | RF-009, INV-13 |
| INV-005 | Uma decisão recusada não altera conta nem notifica resultado como sucesso | comparar estado e notificações antes/depois | RF-008, RF-009 |
| INV-006 | Prestador que não está `ATIVO` não publica horário | tentativa de publicação segue RN-08 | RF-011, RN-08 |
| INV-007 | Decisão administrativa aceita deixa trilha com ator e instante UTC | consultar trilha da conta | RF-084, INV-13 |

## 7. Modelo de domínio envolvido

| Entidade | Atributos relevantes | Restrições |
|---|---|---|
| `Usuario` | `id`, `perfil`, `estado_conta`, `criado_em` | perfil `PRESTADOR`; elegível para decisão inicial enquanto `PENDENTE_APROVACAO` |
| `PerfilPrestador` | `usuario_id`, dados de identificação e aprovação | extensão da conta prestadora; aprovação não substitui completar perfil (SPEC-009) |
| `Notificacao` | destinatário, tipo, título, mensagem, instante | aviso endereçado ao próprio prestador (SPEC-004) |
| `LogAuditoria` | ator, ação, entidade, estados, detalhe, instante e correlação | registra aprovação/reprovação (SPEC-001) |

## 8. Impacto arquitetural

| Item | Impacto |
|---|---|
| Módulos envolvidos | `interface/http` (fila, dossiê, formulários); `aplicacao` (decisão); `dominio` (transição); `infra` (contas, auditoria e notificações) |
| Fronteiras | interface só solicita decisão; aplicação autoriza, valida estado e orquestra transação; notificação é persistida para o prestador |
| Integrações externas | nenhuma |
| Frontend | fila e dossiê administrativos; formulário acessível; motivo da reprovação exposto ao titular na central |
| Backend | autorização admin, validação de estado, transação, auditoria e notificação |
| ADRs que restringem | ADR-001 (sem dependências); ADR-002 (SQLite/UTC/transações); ADR-004 (sessão e perfis) |

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Listar pendentes | admin autenticado | prestadores pendentes para análise | não autenticado; perfil incompatível |
| Consultar cadastro | admin; id do prestador | dados necessários à decisão | não encontrado; perfil incompatível |
| Aprovar | admin; prestador | conta `ATIVO`, auditoria e notificação | transição inválida; conta inexistente |
| Reprovar | admin; prestador; justificativa | conta `REPROVADO`, justificativa, auditoria e notificação | justificativa ausente; transição inválida; conta inexistente |

Assinaturas, rotas e texto exato das mensagens são responsabilidade da implementação revisada contra esta Spec.

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta esta Spec | Como será verificado |
|---|---|---|
| RNF-01 Persistência | decisão, estado e notificação persistem | consulta após reabrir conexão |
| RNF-03 Autorização | somente admin acessa fila e decide | testes HTTP por perfil, com auditoria da negação |
| RNF-07 Observabilidade | transição é auditável com ator e instante | verificar registro correspondente |
| RNF-08 Consistência temporal | datas gravadas em UTC | teste com relógio controlado |
| RNF-11 Usabilidade | decisão e justificativa são claras em celular | inspeção de HTML responsivo e fluxo sem JS |

## 11. Critérios de aceitação

**CA-01 — Fila**
- **Dado** prestadores pendentes e um admin autenticado,
- **quando** o admin abre a fila,
- **então** todos os cadastros pendentes aparecem e os demais estados não aparecem como pendentes.

**CA-02 — Fila vazia**
- **Dado** nenhum prestador pendente,
- **quando** o admin abre a fila,
- **então** o sistema apresenta estado vazio compreensível.

**CA-03 — Acesso administrativo**
- **Dado** cliente ou prestador autenticado,
- **quando** tenta abrir a fila ou submeter uma decisão,
- **então** a operação é negada conforme SPEC-003 e nenhum estado muda.

**CA-04 — Aprovação**
- **Dado** um prestador pendente,
- **quando** admin autorizado aprova,
- **então** a conta passa a `ATIVO`, a transição fica auditada e o prestador é notificado.

**CA-05 — Reprovação**
- **Dado** um prestador pendente e justificativa textual,
- **quando** admin autorizado reprova,
- **então** a conta passa a `REPROVADO`, a justificativa é auditada e o prestador recebe aviso com o motivo.

**CA-06 — Justificativa obrigatória**
- **Dado** uma tentativa de reprovação sem justificativa,
- **quando** o admin a submete,
- **então** a decisão é recusada sem mudar estado nem criar notificação de reprovação.

**CA-07 — Estado não elegível**
- **Dado** conta que não está `PENDENTE_APROVACAO`,
- **quando** o admin tenta aprovar ou reprovar como cadastro inicial,
- **então** o sistema recusa a transição sem alterar conta.

**CA-08 — Barreira de publicação**
- **Dado** prestador pendente ou reprovado,
- **quando** tenta publicar horário,
- **então** a publicação é recusada pela RN-08.

## 12. Casos de teste derivados

Casos propostos para execução após aprovação da Spec.

| Teste | Cobre |
|---|---|
| `T-MODERACAO-01 \| RF-003: fila lista apenas prestadores pendentes` | CA-01 |
| `T-MODERACAO-02 \| RF-003: fila sem pendencias apresenta estado vazio` | CA-02 |
| `T-MODERACAO-03 \| RF-007: perfil nao admin nao acessa fila nem decide` | CA-03 |
| `T-CONTA-02a \| RF-008: admin aprova prestador pendente e notifica titular` | CA-04, INV-002, INV-007 |
| `T-CONTA-02b \| RF-009: reprovar exige justificativa textual` | CA-05, CA-06, INV-004 |
| `T-CONTA-02c \| RF-008/RF-009: estado nao pendente nao aceita decisao inicial` | CA-07, INV-005 |
| `T-CONTA-02d \| RN-08: prestador nao aprovado nao publica` | CA-08, INV-006 |
| `T-MODERACAO-04 \| RF-084: decisao registra ator e transicao da conta` | CA-04, CA-05, INV-007 |

**Evidência (registro etapa 45, 2026-10-30).** Todos os testes acima existem em
`tests/integracao/spec-005-moderacao.test.js` e passam. A conferência encontrou duas divergências, corrigidas no código:

1. **CA-07 / INV-002 violados.** `aprovarPrestador()` só conferia se a máquina de contas aceitava ir para `ATIVO`. Como
   `SUSPENSO → ATIVO`, `EM_REVISAO → ATIVO` e `RESTRITO → ATIVO` são transições válidas (as do RF-079), um POST em
   `/admin/contas/:id/aprovar` reativava conta suspensa, inclusive de cliente, sem justificativa, e a auditoria gravava
   `PRESTADOR_APROVADO`. Aprovar e reprovar agora exigem prestador em `PENDENTE_APROVACAO` (`carregarCadastroPendente`).
2. **CA-02.** Sem pendências, a seção "Aguardando aprovação" sumia da tela; agora aparece com estado vazio.

| Critério | Evidência |
|---|---|
| CA-01 | `T-MODERACAO-01`: dois pendentes listados; reprovado e ativo fora da fila |
| CA-02 | `T-MODERACAO-02` |
| CA-03, INV-001 | `T-MODERACAO-03`: cliente e prestador levam 403 na fila e nas duas decisões, com CSRF válido; a recusa não revela a fila; nada muda |
| CA-04, INV-002 | `T-CONTA-02a` (pela rota, com aviso sem agendamento) |
| CA-05, CA-06, INV-003, INV-004 | `T-CONTA-02b`: vazio, só espaços e curto recusados sem estado nem aviso; com texto, justificativa aparada na auditoria e no aviso |
| CA-07, INV-005 | `T-CONTA-02c`: suspensa, em revisão, ativa e reprovada recusam aprovar e reprovar, pela aplicação e pela rota, sem estado, aviso nem registro novos |
| CA-08, INV-006 | `T-CONTA-02d`: pendente recusado pela RN-28 (a regra específica do cadastro pendente) e reprovado pela RN-08; nenhum horário gravado |
| INV-007, RNF-07, RNF-08 | `T-MODERACAO-04` |

## 13. Questões decididas

1. **Justificativa mínima:** Decidida em 2026-10-30 (etapa 63): 10 caracteres é critério de produto, igual ao da suspensão (RF-079) e ao da evidência de disputa (RN-26).
2. **Aparição na fila:** Decidida em 2026-10-30 (etapa 63): a fila consultável de pendentes satisfaz o RF-003, sem aviso adicional ao admin.
3. **Conta reprovada:** Decidida em 2026-10-30 (etapa 63): o que o `REPROVADO` pode fazer continua definido pela autorização (SPEC-003) e pelas Specs de cada operação.
4. **OPEN-03:** já resolvida em 2026-10-29 (etapa 32): vale a leitura do mapa (spec §1.5 e constituição).

As decisões foram aprovadas pela equipe e registradas em `registro-sdd.md`, etapa 63.

## 14. Definition of Done

Esta Spec estará concluída quando:

1. a equipe aprovar o rascunho e resolver as questões que mudem o critério de decisão;
2. fila, dossiê, autorização e duas decisões estiverem conferidos contra RF-003, RF-008 e RF-009;
3. CA-01 a CA-08 e INV-001 a INV-007 tiverem evidência automatizada;
4. transição, auditoria e notificação forem consistentes e nenhum usuário não admin puder decidir;
5. publicação continuar bloqueada até `ATIVO`, conforme RN-08;
6. as Specs produtoras de notificações e as decisões desta Spec mantiverem rastreabilidade ponta a ponta.
