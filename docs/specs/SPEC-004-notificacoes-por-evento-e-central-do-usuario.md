# SPEC-004 — Notificações por evento e central do usuário

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-10-20 |
| Status | **Aprovada** por Enzo em 2026-10-20 (registro, etapa 21), sem alteração do rascunho v0.1.0 do 2dart5. Seguem abertas as questões da §13: matriz de eventos e destinatários, atomicidade, paginação e OPEN-03 |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 4 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.6 · plan §2 e §5 |

## 1. Identificação

- **ID:** SPEC-004
- **Nome:** Notificações por evento e central do usuário
- **Objetivo:** persistir avisos para os usuários afetados por transições relevantes e permitir que cada usuário consulte e marque como lidas suas notificações.
- **Valor entregue:**
  - **Ao usuário:** recebe no próprio sistema informação sobre mudanças que o afetam, sem depender de e-mail ou push.
  - **Ao sistema:** comunica transições de forma consistente e oferece uma fonte consultável dos avisos.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-082, RF-083 | spec §7.9 |
| RN | nenhuma específica | spec §6 |
| RNF | RNF-01, RNF-07, RNF-08, RNF-11 | spec §8 |
| Histórias | US-44 | spec §5.2 |
| Caso de uso / fluxo | Transversal às transições de estado que afetam usuário; consulta da central | spec §7.9 |
| Entidades | `Notificacao` | spec §9.2 |
| Invariantes globais | INV-13 para a relação entre eventos e trilha quando houver transição | spec §9.8 |
| Drivers arquiteturais | R-6.3, C-IX | spec §1.5, constituição |
| Dependências | **SPEC-002:** identidade e sessão. As transições que geram avisos são entregues pelas Specs de negócio; **SPEC-003:** acesso à central | mapa §2 |

## 3. Escopo

### Incluído

1. Criar uma notificação persistente para cada usuário afetado por transição definida em RF-082.
2. Exibir a lista do usuário autenticado em ordem cronológica decrescente.
3. Indicar visualmente avisos lidos e não lidos.
4. Permitir marcar as notificações não lidas do usuário atual como lidas.
5. Associar, quando aplicável, aviso e agendamento para oferecer navegação ao detalhe permitido.
6. Manter os avisos disponíveis após reinício do processo.

### Fora do escopo

| Comportamento | Onde fica |
|---|---|
| Envio de e-mail, SMS ou push | fora do MVP, salvo decisão posterior |
| Decidir quais mudanças de estado existem e seus efeitos | Spec da respectiva capacidade |
| Autorizar acesso à central e validar titularidade | SPEC-003 |
| Definir modelo de sessão | SPEC-002 / ADR-004 |
| Editar ou apagar notificações individuais | não previsto em RF-082/RF-083 |

## 4. Dependências

| Tipo | Item |
|---|---|
| Specs anteriores | **SPEC-002:** usuário autenticado. **SPEC-003:** autorização e titularidade |
| Decisões arquiteturais | plan §2: aplicação orquestra; infra persiste; views não decidem regra |
| Decisões humanas | OPEN-01 e OPEN-02 aprovadas em 2026-10-08 e ratificadas em 2026-10-18; esta proposta não cria canal externo |

## 5. Comportamento esperado

### 5.1 Gerar notificação por evento (RF-082)

- **Pré-condições:** ocorre uma transição que afeta uma ou mais partes.
- **Fluxo principal:**
  1. O caso de uso identifica os usuários afetados pela transição.
  2. O sistema persiste para cada destinatário o tipo, título, mensagem, instante UTC e, quando existir, o agendamento relacionado.
  3. O aviso fica disponível na central do destinatário.
- **Fluxos alternativos:**
  - 2a. Transição sem agendamento (por exemplo, decisão de cadastro): notificação sem referência a agendamento.
  - 2b. Transição que afeta duas partes: cada parte recebe aviso endereçado à própria conta.
- **Fluxo de exceção:**
  - 1a. Não há destinatário usuário afetado: não se cria notificação órfã.

### 5.2 Consultar central (RF-083)

- **Pré-condições:** usuário autenticado.
- **Fluxo principal:**
  1. O usuário abre sua central.
  2. O sistema lista somente as notificações cujo `usuario_id` corresponde à sessão, da mais recente à mais antiga.
  3. A interface indica lidas e não lidas; aviso associado a agendamento oferece ligação para o detalhe autorizado.
- **Fluxos de exceção:**
  - 1a. Usuário sem avisos: a central mostra estado vazio compreensível, sem erro.
  - 2a. Notificações de outro usuário nunca aparecem, ainda que o navegador altere parâmetros ou identificadores.

### 5.3 Marcar notificações como lidas

- **Pré-condições:** usuário autenticado e solicitação protegida por CSRF válido.
- **Fluxo principal:**
  1. O usuário solicita marcar como lidas as notificações não lidas da própria conta.
  2. O sistema grava o instante UTC da leitura.
  3. A central passa a apresentá-las como lidas e a contagem de não lidas é atualizada.
- **Fluxo alternativo:**
  - 1a. Não há notificações não lidas: a operação é idempotente e não altera avisos lidos anteriormente.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | Cada notificação pertence a um usuário existente | integridade referencial e teste de persistência | RF-082, RNF-01 |
| INV-002 | Usuário só consulta e marca como lidas notificações próprias | sessão A não lista nem altera avisos de B | RF-083, RNF-03 |
| INV-003 | Ordenação é cronológica decrescente por `criada_em` | criar avisos em instantes distintos e comparar ordem | RF-083 |
| INV-004 | A notificação lida tem `lida_em`; a não lida mantém esse campo nulo | verificar estado antes e depois da ação | RF-083 |
| INV-005 | A ausência de agendamento associado não impede aviso de conta/moderação | persistir e listar notificação sem `agendamento_id` | RF-082 |
| INV-006 | Título, mensagem e conteúdo exibido são escapados pela interface | teste HTTP com texto contendo markup | RNF-03, C-VIII |

## 7. Modelo de domínio envolvido

| Entidade | Atributos relevantes | Restrições |
|---|---|---|
| `Notificacao` | `id`, `usuario_id`, `tipo`, `agendamento_id`, `titulo`, `mensagem`, `criada_em`, `lida_em` | destinatário obrigatório; agendamento opcional; pertence ao modelo de apoio da spec §9.2 |
| `Usuario` | `id` | destinatário resolvido pela sessão autenticada |
| `Agendamento` | `id` | ligação opcional para contextualizar a notificação, sem conceder autorização de leitura |

## 8. Impacto arquitetural

| Item | Impacto |
|---|---|
| Módulos envolvidos | `aplicacao` (orquestra eventos), `infra` (persistência/consulta), `interface/http` (central e formulário), `dominio/tempo` (instante UTC) |
| Fronteiras | geradores de evento chamam a porta de notificação; interface exibe resultado persistido, sem inferir regras |
| Integrações externas | nenhuma; não há e-mail ou push no MVP |
| Frontend | central utilizável em celular e sem JavaScript; estado vazio e marcador de lida |
| Backend | persistência, ordenação, isolamento por usuário e CSRF no POST |
| ADRs que restringem | ADR-001 (sem dependência externa); ADR-002 (persistência e UTC) |

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Criar aviso | destinatário; tipo; título; mensagem; instante; referência opcional | notificação persistida | falha de persistência explícita |
| Listar avisos | usuário autenticado; limite/paginação se definidos | lista cronológica decrescente | acesso negado conforme SPEC-003 |
| Contar não lidas | usuário autenticado | quantidade | acesso negado conforme SPEC-003 |
| Marcar lidas | usuário autenticado; instante UTC | resultado da operação | CSRF inválido; sem alterar avisos de terceiros |

Limite de paginação e desempate quando duas notificações têm o mesmo `criada_em` não são definidos pela baseline e ficam como questões em aberto.

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta esta Spec | Como será verificado |
|---|---|---|
| RNF-01 Persistência | aviso sobrevive a reinício | teste de gravação e leitura em nova conexão |
| RNF-03 Autorização | isolamento por usuário e mutação autenticada | testes HTTP com duas contas e CSRF |
| RNF-07 Observabilidade | evento tem registro persistente e contexto do destinatário | inspeção de registros |
| RNF-08 Consistência temporal | `criada_em` e `lida_em` são UTC | teste com relógio controlado |
| RNF-11 Usabilidade | central e ação funcionam em celular, sem depender de JS | teste de HTML sem script como requisito de funcionamento |

## 11. Critérios de aceitação

**CA-01 — Notificação para usuário afetado**
- **Dado** uma transição listada em RF-082 que afeta uma parte,
- **quando** o caso de uso a conclui,
- **então** a parte recebe notificação persistida com conteúdo contextual e instante UTC.

**CA-02 — Aviso bilateral**
- **Dado** uma transição que afeta cliente e prestador,
- **quando** a transição gera aviso,
- **então** cada parte recebe aviso em sua própria conta.

**CA-03 — Consulta ordenada e isolada**
- **Dado** notificações de dois usuários em instantes distintos,
- **quando** um usuário acessa a central,
- **então** recebe somente as próprias, em ordem cronológica decrescente.

**CA-04 — Marcar lidas**
- **Dado** avisos não lidos do usuário,
- **quando** solicita marcar como lidas com CSRF válido,
- **então** apenas avisos próprios não lidos recebem `lida_em`.

**CA-05 — Sem avisos**
- **Dado** usuário sem notificações,
- **quando** acessa a central,
- **então** recebe estado vazio útil e a página responde normalmente.

**CA-06 — Aviso sem agendamento**
- **Dado** decisão de cadastro que afeta o prestador,
- **quando** o sistema gera o aviso,
- **então** ele pode ser consultado mesmo sem vínculo a agendamento.

**CA-07 — Conteúdo seguro**
- **Dado** título ou mensagem que contém caracteres de markup,
- **quando** o aviso é renderizado,
- **então** o texto aparece escapado, sem executar HTML.

## 12. Casos de teste derivados

Casos propostos para execução após aprovação da Spec.

| Teste | Cobre |
|---|---|
| `T-NOTIF-01 \| RF-082: transicao gera aviso persistido para a parte afetada` | CA-01, INV-001 |
| `T-NOTIF-02 \| RF-082: transicao bilateral gera um aviso para cada parte` | CA-02 |
| `T-NOTIF-03 \| RF-083: central lista avisos proprios em ordem decrescente` | CA-03, INV-002, INV-003 |
| `T-NOTIF-04 \| RF-083: marcar lidas altera apenas avisos proprios nao lidos` | CA-04, INV-004 |
| `T-NOTIF-05 \| RF-083: central vazia responde com estado vazio` | CA-05 |
| `T-NOTIF-06 \| RF-082: aviso de moderacao nao exige agendamento` | CA-06, INV-005 |
| `T-NOTIF-07 \| C-VIII: conteudo da notificacao e escapado na tela` | CA-07, INV-006 |
| `T-NOTIF-08 \| RNF-08: instantes de criacao e leitura estao em UTC` | RNF-08 |

## 13. Questões em aberto

- **Matriz de eventos e destinatários:** RF-082 enumera categorias de transição, mas não define exaustivamente cada tipo, texto e destinatário; validar a matriz com as Specs produtoras de eventos.
- **Atomicidade:** confirmar se a gravação de cada notificação deve compartilhar a mesma transação da mudança de estado; a baseline não enuncia a exigência explicitamente.
- **Paginação e empate:** RF-083 não define limite de itens nem desempate quando `criada_em` é idêntico.
- **OPEN-03:** drivers arquiteturais continuam derivados de spec §1.5 e da constituição, sem catálogo formal aprovado.

## 14. Definition of Done

Esta Spec estará concluída quando:

1. a equipe aprovar a matriz de eventos/destinatários e decidir as questões que afetem atomicidade ou contrato;
2. as transições abrangidas por RF-082 tiverem notificações verificadas em suas próprias Specs;
3. CA-01 a CA-07 e INV-001 a INV-006 tiverem evidência automatizada;
4. a central e a ação de marcar lidas respeitarem autenticação, titularidade, CSRF e saída escapada;
5. os RNFs aplicáveis tiverem evidência registrada e não houver divergência conhecida com a baseline.
