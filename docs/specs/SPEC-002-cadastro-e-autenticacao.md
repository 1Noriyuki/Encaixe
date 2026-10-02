# SPEC-002 — Cadastro e autenticação

| Campo | Valor |
|---|---|
| Versão | 1.1.0 |
| Data | 2026-10-01 |
| Status | **Aprovada** pela equipe em 2026-10-01. v1.1.0 incorpora as decisões das OPEN-12, 202 e 203, também aprovadas. Seguem abertas a OPEN-210 e as OPEN 201, 204 a 209 |
| Layout | [canvas com 8 telas](https://claude.ai/artifact/RNxkqRrx1kn9TQ3F8wuZrW) · fontes em [`layouts/SPEC-002/`](layouts/SPEC-002/) · aguardando aprovação |

> **v0.1.1:** acrescentados o layout das telas (seção 8.1) e a OPEN-210. Nenhum critério, invariante ou
> escopo mudou.
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 2 de 29 |
| Baseline | `docs/spec.md` v0.1.3 · ADR-004 · `docs/seguranca.md` |

---

## 1. Identificação

- **ID:** SPEC-002
- **Nome:** Cadastro e autenticação
- **Objetivo:** permitir que um visitante crie conta de **cliente** ou de **prestador**, que um usuário cadastrado inicie uma sessão autenticada vinculada ao perfil da conta, e que encerre essa sessão.
- **Valor entregue:**
  - **Ao usuário:** é a porta de entrada dos perfis. O cliente já sai do cadastro apto a usar a plataforma, e o prestador sai aguardando a aprovação.
  - **Ao sistema:** toda operação seguinte passa a ter um usuário identificado, que é a base da autorização (SPEC-003) e da titularidade.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-001, RF-002, RF-003 (só o estado inicial), RF-004, RF-005 | spec §7.1 |
| RB | RN-28 (prestador nasce `PENDENTE_APROVACAO`), RN-23 (reputação inicial P-08, só o valor de partida) | spec §6.7, §6.8 |
| RNF | RNF-02, RNF-03, RNF-08 | spec §8 |
| Histórias | US-01, US-02 | spec §5.2 |
| Caso de uso / fluxo | UC-01, passos 1–2 e exceção 1a | spec §10.2 |
| Máquina de estados | `Usuario`: `[*] → PENDENTE_APROVACAO` e `[*] → ATIVO` | spec §9.6 |
| Entidades | `Usuario`, `PerfilCliente`, `PerfilPrestador` | spec §9.2 |
| Drivers arquiteturais | R-6.1 (múltiplos perfis), C-IX (rastreabilidade) | spec §1.5, constituição |
| ADRs | ADR-004 (sessão em cookie, `scrypt`, mensagem genérica, CSRF fora de login e cadastro) | `docs/adr/` |
| Outros documentos | `docs/seguranca.md` §2 (A1, A2), §3 (política mínima de senha), §4 (P1, P2, P3, P4) | |

## 3. Escopo

### Incluído

1. Cadastro com e-mail único, senha e perfil escolhido (`CLIENTE` ou `PRESTADOR`).
2. Estado inicial da conta: `ATIVO` para cliente, `PENDENTE_APROVACAO` para prestador.
3. Reputação inicial da conta igual a P-08 vigente no instante do cadastro.
4. Recusa de e-mail já cadastrado sem revelar dados da conta existente.
5. Armazenamento da senha somente como hash de derivação lenta com sal por usuário.
6. Autenticação com credenciais válidas de conta não suspensa, criando sessão vinculada ao perfil.
7. Recusa de credenciais inválidas com mensagem genérica, em tempo que não revela se o e-mail existe.
8. Expiração da sessão e encerramento voluntário (logout), com revogação imediata.
9. Registro de auditoria da criação da conta (transição a partir do estado inicial).

### Fora do escopo

| Comportamento | Onde fica |
|---|---|
| Negar acesso a operação de outro perfil e auditar a tentativa | SPEC-003 |
| Notificar a fila de moderação do admin sobre o novo prestador (RF-003, 2ª parte) | SPEC-004 e SPEC-005 |
| Aprovação e reprovação do prestador | SPEC-005 |
| Completar o perfil do prestador (nome de exibição, região, categorias, P-01, P-02) | SPEC-009 |
| Cálculo da reputação por eventos | SPEC-006 |
| Suspensão de conta pelo admin | SPEC-025 |
| Criação de conta de admin | não definida na baseline (OPEN-206) |
| CSRF em login e cadastro | fora do MVP (ADR-004, `seguranca.md` P1, T-81) |
| Limitação de tentativas de login | fora do MVP (`seguranca.md` P2, T-80) |
| Recuperação de senha | fora do MVP (`seguranca.md` P4, T-82) |

## 4. Dependências

| Tipo | Item |
|---|---|
| Specs anteriores | **SPEC-001:** parâmetro P-08, máquina de estados de `Usuario` e auditoria de transição |
| Decisões arquiteturais | ADR-004 (sessão opaca com estado no servidor, cookie `HttpOnly` e `SameSite=Lax`, `scrypt`, comparação em tempo constante, hash calculado mesmo para e-mail inexistente) |
| Decisões humanas pendentes | OPEN-01 e OPEN-02 do mapa |

## 5. Comportamento esperado

### 5.1 Cadastrar conta (US-01, UC-01 passos 1–2)

- **Pré-condições:** o visitante não está autenticado.
- **Fluxo principal:**
  1. O visitante informa e-mail, senha e perfil (`CLIENTE` ou `PRESTADOR`), além dos dados de identificação exigidos (ver OPEN-205).
  2. O sistema valida o formato do e-mail, a política de senha e o perfil.
  3. O sistema verifica que o e-mail não pertence a nenhuma conta (ver OPEN-208 sobre normalização).
  4. O sistema gera o hash da senha com sal próprio do usuário.
  5. Numa única unidade atômica, o sistema cria a conta com o estado inicial do perfil, a reputação inicial P-08 vigente, a data de criação e a extensão de perfil correspondente (`PerfilCliente` ou `PerfilPrestador`), e registra a auditoria da transição inicial.
  6. O sistema informa o resultado. Para o prestador, informa que a conta aguarda aprovação.
- **Fluxos alternativos:**
  - 5a. Perfil `CLIENTE`: estado inicial `ATIVO` (RF-001, spec §9.6).
  - 5b. Perfil `PRESTADOR`: estado inicial `PENDENTE_APROVACAO` (RF-003, RN-28).
- **Fluxos de exceção:**
  - 2a. Dados inválidos (e-mail malformado, senha fora da política, perfil fora de `CLIENTE`/`PRESTADOR`): o cadastro é recusado apontando o campo, e nada é gravado.
  - 3a. E-mail já cadastrado: o cadastro é recusado informando que o e-mail não está disponível, sem revelar nome, perfil, estado ou qualquer outro dado da conta existente (RF-002). Ver OPEN-209.
- **Pós-condições:** existe exatamente uma conta para o e-mail, com senha só em forma de hash e um registro de auditoria da criação.

### 5.2 Autenticar (US-02, RF-004, RF-005)

- **Pré-condições:** nenhuma.
- **Fluxo principal:**
  1. O usuário informa e-mail e senha.
  2. O sistema localiza a conta pelo e-mail e compara a senha com o hash em tempo constante.
  3. O sistema verifica que a conta não está `SUSPENSO`. Todos os outros estados autenticam (`ATIVO`, `RESTRITO`, `PENDENTE_APROVACAO`, `REPROVADO`, `EM_REVISAO`); o que cada um pode fazer depois é decidido pela autorização (SPEC-003) e pelas regras de cada Spec (decisão da OPEN-202).
  4. O sistema cria uma sessão com identificador aleatório e opaco, vinculada à conta e ao perfil, com instante de criação, de último uso e de expiração.
  5. O sistema entrega o identificador ao navegador em cookie `HttpOnly` e `SameSite=Lax`.
- **Fluxos de exceção:**
  - 2a. E-mail inexistente: o sistema calcula um hash descartável de custo equivalente e recusa com a **mesma** mensagem genérica de senha errada (RF-005, ADR-004).
  - 2b. Senha errada: recusa com mensagem genérica que não indica qual campo errou.
  - 3a. Conta `SUSPENSO` com senha correta: a autenticação é recusada com a mensagem de que a conta está suspensa (não a genérica), sem criar sessão (RF-004, RN-28, decisão da OPEN-203). Com senha errada, vale 2b.
- **Pós-condições:** em caso de sucesso, existe uma sessão válida. Em caso de falha, nenhuma sessão é criada.

### 5.3 Usar e encerrar a sessão (RNF-02, ADR-004)

- **Fluxo principal (uso):** a cada requisição, o sistema resolve a sessão pelo cookie e confere os dois prazos do ADR-004: menos de **2 h** desde o último uso e menos de **12 h** desde o login. Válida, a requisição segue identificada pela conta e pelo perfil, e o último uso é renovado (decisão da OPEN-12).
- **Fluxo alternativo (expiração):** sessão que estourou qualquer dos dois prazos é apagada na primeira tentativa de uso, e a requisição segue como anônima.
- **Fluxo alternativo (suspensão):** quando a conta é suspensa (SPEC-025), as sessões abertas dela são encerradas (RN-28).
- **Fluxo alternativo (logout):** o usuário encerra a sessão; o sistema apaga o registro e instrui o navegador a descartar o cookie. Ver OPEN-204.
- **Fluxo de exceção:** cookie com identificador inexistente ou adulterado é tratado como ausência de sessão, sem erro e sem revelar o motivo.
- **Pós-condições:** uma sessão apagada não volta a autenticar, mesmo que o cookie seja reenviado.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | O e-mail é único entre todas as contas | teste: segundo cadastro com o mesmo e-mail é recusado; a unicidade também é garantida no banco | RF-002, spec §9.2 |
| INV-002 | Nenhuma senha é armazenada ou registrada em texto puro, nem na conta, nem na auditoria, nem no log | teste: inspeção da conta e da auditoria após o cadastro | RNF-02, `seguranca.md` §6 |
| INV-003 | Cada hash de senha usa sal próprio: duas contas com a mesma senha têm hashes diferentes | teste | RNF-02 |
| INV-004 | Conta de cliente nasce `ATIVO`; conta de prestador nasce `PENDENTE_APROVACAO`; nenhuma outra combinação é possível pelo cadastro | teste por perfil mais tentativa com perfil `ADMIN` | RF-001, RF-003, RN-28 |
| INV-005 | A resposta de autenticação recusada é idêntica para e-mail inexistente e para senha errada | teste comparando as duas respostas | RF-005 |
| INV-006 | Nenhuma sessão é criada para credencial inválida ou conta `SUSPENSO` | teste | RF-004, RF-005 |
| INV-007 | Sessão expirada ou encerrada não autentica | teste com relógio controlado e teste de logout | RNF-02, ADR-004 |
| INV-008 | A criação de conta gera exatamente um registro de auditoria da transição inicial | teste | RF-084, INV-13 (via SPEC-001) |
| INV-009 | A reputação inicial é a P-08 vigente no instante do cadastro e respeita [0, 100] | teste com P-08 alterado antes do cadastro | RN-23, INV-07 |

## 7. Modelo de domínio envolvido

| Entidade | Atributos relevantes | Restrições |
|---|---|---|
| `Usuario` | `id`, `nome`, `email`, `senha_hash`, `perfil`, `estado_conta`, `reputacao`, `criado_em` | `email` único; `perfil` ∈ {`CLIENTE`, `PRESTADOR`, `ADMIN`}; pelo cadastro, só `CLIENTE` ou `PRESTADOR`; `reputacao` ∈ [0, 100]; `criado_em` em UTC |
| `PerfilCliente` | `usuario_id`, `telefone`, `regiao_preferida_id` | extensão 1–1, existe só quando `perfil = CLIENTE` |
| `PerfilPrestador` | `usuario_id` (os demais atributos são preenchidos em SPEC-009) | extensão 1–1, existe só quando `perfil = PRESTADOR` |

A **sessão** não é entidade do modelo de domínio (spec §9.2). Ela existe por decisão do ADR-004, que define
identificador, conta, token CSRF, criação e expiração. Esta Spec não a promove a entidade de domínio.

## 8. Impacto arquitetural

| Item | Impacto |
|---|---|
| Módulos envolvidos | `aplicacao` (casos de uso de cadastro e autenticação); `infra` (hash de senha, persistência de conta e sessão); `interface/http` (formulários de cadastro e de login, cookie, logout); `dominio` (validação de perfil e estado inicial, máquina de estados da conta via SPEC-001) |
| Fronteiras | A política de senha e o estado inicial são regras: ficam fora da camada HTTP. A camada HTTP só traduz formulário e cookie (plan §2) |
| Integrações externas | nenhuma |
| Frontend | formulário de cadastro com escolha de perfil; formulário de login; ação de sair; mensagem de erro exibida (C-VIII). Precisa funcionar sem JavaScript e em tela de celular (RNF-11) |
| Backend | todas as validações, hash, sessão e auditoria |
| ADRs que restringem | ADR-001 (`scrypt` e aleatoriedade do `node:crypto`, sem biblioteca); ADR-004 (sessão opaca no banco, flags do cookie, `Max-Age` de 12 h, sem CSRF em login e cadastro, sem `Secure` em desenvolvimento) |

### 8.1 Layout das telas

Proposta visual em formato de celular (RNF-11), com os tokens de cor e tipografia de
`src/interface/http/estilo.js`. Cada tela usa só elementos nativos de formulário e funciona sem
JavaScript. [Ver o canvas](https://claude.ai/artifact/RNxkqRrx1kn9TQ3F8wuZrW).

| Tela | Critérios | Observação |
|---|---|---|
| Entrar | CA-06 | |
| Entrar · credencial inválida | CA-07, INV-005 | mensagem única com o selo `RF-005`; o e-mail digitado é mantido, a senha não |
| Entrar · conta suspensa | CA-08 | decisão da OPEN-203 aprovada; canal de contato não definido → `[CANAL DE CONTATO]` |
| Criar conta | CA-01, CA-02, CA-05 | perfil escolhido entre duas opções; só o campo Nome além de e-mail e senha (OPEN-205); política de senha visível (OPEN-201); nota `RN-28` |
| Criar conta · campos inválidos | CA-03, CA-04 | e-mail indisponível (`RF-002`) e senha fora da política, erro no próprio campo |
| Prestador · aguardando aprovação | CA-02 | o que acontece depois do cadastro depende da OPEN-210 |
| Saiu da conta | CA-10 | |
| Sessão expirada | CA-09a | decisão da OPEN-12 aprovada; o texto da tela diz "2 horas" |

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Cadastrar | e-mail; senha; perfil; dados de identificação (OPEN-205) | conta criada, com estado inicial | campo inválido (indicado); e-mail indisponível (sem dados da conta existente) |
| Autenticar | e-mail; senha | sessão vinculada à conta e ao perfil | credencial inválida (mensagem única); conta sem permissão de autenticar |
| Resolver sessão | identificador vindo do cookie | conta e perfil, ou anônimo | nenhum erro exposto: inválida ou expirada vale como anônima |
| Encerrar sessão | sessão atual | sessão revogada | nenhum |

Rotas HTTP, nomes de campo e formato de mensagem **não** são definidos aqui. O texto exato da mensagem
genérica não está na baseline e fica a cargo da implementação, desde que cumpra INV-005.

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta esta Spec | Como será verificado |
|---|---|---|
| RNF-02 Autenticação e sessão | hash de derivação lenta com sal por usuário; sessão com expiração | testes INV-002, INV-003, INV-007; inspeção do formato do hash (algoritmo e custo versionados, ADR-004) |
| RNF-03 Autorização no servidor | o vínculo sessão → conta → perfil é resolvido no servidor, nunca a partir de dado enviado pelo navegador | teste: cookie com identificador forjado não autentica |
| RNF-08 Consistência temporal | `criado_em` e expiração em UTC; a expiração não depende do relógio do cliente | teste com relógio controlado |

## 11. Critérios de aceitação

**CA-01 — Cadastro de cliente**
- **Dado** um e-mail não usado e uma senha dentro da política,
- **quando** o visitante se cadastra como cliente,
- **então** a conta é criada em `ATIVO`, com reputação igual a P-08, data de criação registrada, senha apenas como hash e um registro de auditoria da criação.

**CA-02 — Cadastro de prestador**
- **Dado** um e-mail não usado e uma senha dentro da política,
- **quando** o visitante se cadastra como prestador,
- **então** a conta é criada em `PENDENTE_APROVACAO`.

**CA-03 — E-mail já usado**
- **Dado** uma conta existente com o e-mail E,
- **quando** um visitante tenta se cadastrar com E,
- **então** o cadastro é recusado com a informação de que o e-mail não está disponível, nenhum dado da conta existente aparece na resposta, e nenhuma conta é criada.

**CA-04 — Senha fora da política**
- **Dado** a política mínima de senha (OPEN-201),
- **quando** o visitante informa uma senha que não a cumpre,
- **então** o cadastro é recusado apontando o campo senha.

**CA-05 — Perfil não permitido no cadastro**
- **Dado** um formulário de cadastro,
- **quando** o perfil enviado é `ADMIN` ou qualquer valor diferente de `CLIENTE` e `PRESTADOR`,
- **então** o cadastro é recusado.

**CA-06 — Login válido**
- **Dado** uma conta `ATIVO` com senha S,
- **quando** o usuário se autentica com o e-mail e S,
- **então** uma sessão é criada vinculada à conta e ao perfil, e o cookie é `HttpOnly` e `SameSite=Lax`.

**CA-07 — Credencial inválida**
- **Dado** uma conta existente,
- **quando** o usuário erra a senha, ou informa um e-mail inexistente,
- **então** a autenticação é recusada com a mesma mensagem genérica nos dois casos, e nenhuma sessão é criada.

**CA-08 — Conta suspensa**
- **Dado** uma conta `SUSPENSO` com senha correta,
- **quando** o titular tenta se autenticar,
- **então** a autenticação é recusada com a mensagem de que a conta está suspensa, e nenhuma sessão é criada.

**CA-09a — Expiração por inatividade**
- **Dado** uma sessão usada pela última vez no instante t,
- **quando** a próxima requisição chega 2 h ou mais depois de t,
- **então** a requisição é tratada como anônima e o registro da sessão deixa de existir.

**CA-09b — Uso renova o prazo**
- **Dado** uma sessão usada a cada hora,
- **quando** se passam 5 h desde o login,
- **então** a sessão continua válida.

**CA-09c — Teto absoluto**
- **Dado** uma sessão usada continuamente desde o login no instante t,
- **quando** uma requisição chega 12 h ou mais depois de t,
- **então** a requisição é tratada como anônima.

**CA-11 — Estados que autenticam**
- **Dado** contas com senha correta nos estados `PENDENTE_APROVACAO`, `REPROVADO`, `EM_REVISAO` e `RESTRITO`,
- **quando** cada titular se autentica,
- **então** uma sessão é criada para cada uma.

**CA-10 — Logout**
- **Dado** uma sessão válida,
- **quando** o usuário a encerra e depois reenvia o mesmo cookie,
- **então** a requisição é tratada como anônima.

## 12. Casos de teste derivados

| Teste | Cobre |
|---|---|
| `T-CONTA-01a \| RF-001: cadastro de cliente nasce ATIVO com reputacao P-08` | CA-01, INV-004, INV-009 |
| `T-CONTA-01b \| RN-28: cadastro de prestador nasce PENDENTE_APROVACAO` | CA-02, INV-004 |
| `T-CONTA-01c \| RF-002: e-mail repetido e recusado sem vazar dado da conta` | CA-03, INV-001 |
| `T-CONTA-01d \| RF-001: senha fora da politica e recusada apontando o campo` | CA-04 |
| `T-CONTA-01e \| RF-001: perfil ADMIN nao pode ser escolhido no cadastro` | CA-05, INV-004 |
| `T-CONTA-01f \| RNF-02: senha so existe como hash com sal proprio` | INV-002, INV-003 |
| `T-CONTA-01g \| RF-084: criacao de conta gera um registro de auditoria` | CA-01, INV-008 |
| `T-CONTA-01h \| RN-23: reputacao inicial usa P-08 vigente no cadastro` | INV-009 |
| `T-SESSAO-01 \| RF-004: login valido cria sessao com cookie HttpOnly e SameSite` | CA-06 |
| `T-SESSAO-02 \| RF-005: credencial invalida devolve mensagem generica identica` | CA-07, INV-005, INV-006 |
| `T-SESSAO-03 \| RN-28: conta suspensa nao autentica e recebe mensagem propria` | CA-08, INV-006 |
| `T-SESSAO-04a \| RNF-02: 2 h sem uso expiram a sessao` | CA-09a, INV-007 |
| `T-SESSAO-04b \| RNF-02: cada uso renova o prazo de inatividade` | CA-09b |
| `T-SESSAO-04c \| RNF-02: 12 h desde o login expiram a sessao mesmo em uso` | CA-09c, INV-007 |
| `T-SESSAO-07 \| RF-004: pendente, reprovado, em revisao e restrito autenticam` | CA-11 |
| `T-SESSAO-05 \| RNF-02: logout revoga a sessao` | CA-10, INV-007 |
| `T-SESSAO-06 \| RNF-03: identificador de sessao forjado nao autentica` | RNF-03 |

> Os nomes `T-CONTA-01..04` já aparecem na matriz da spec §11 para RN-28. Os sufixos (`01a`, `01b`…) evitam
> colisão com SPEC-005 e SPEC-025, que usarão a mesma área. Ver OPEN-21 do mapa.

## 13. Questões em aberto

Herdadas do mapa e pertinentes a esta Spec:

- **OPEN-01, OPEN-02:** sem decisão.
- ~~**OPEN-12**~~ **resolvida em 2026-10-01:** inatividade de 2 h com teto absoluto de 12 h (ADR-004, revisão; RNF-02 na spec v0.1.5). CA-09 virou CA-09a/b/c.

Novas, surgidas nesta Spec:

- **OPEN-201 — decisão necessária:** a política de senha não está na spec. RF-001 diz só "senha válida". A regra "8 caracteres, misturando letras e números" aparece apenas em `seguranca.md` §3. Decisão: promovê-la à spec (como RNF ou parâmetro) ou manter o documento de segurança como fonte.
- ~~**OPEN-202**~~ **resolvida em 2026-10-01:** todos os estados autenticam, exceto `SUSPENSO` (RF-004, spec v0.1.5; CA-11). Texto original: a autenticação de contas `PENDENTE_APROVACAO`, `REPROVADO` e `EM_REVISAO`. RF-004 só exclui "suspensa". Não está definido se um prestador pendente pode entrar para ver o andamento, nem se um reprovado pode entrar para ler o motivo.
- ~~**OPEN-203**~~ **resolvida em 2026-10-01:** conta suspensa não autentica, recebe mensagem própria com a senha certa, e a suspensão encerra as sessões (RN-28, spec v0.1.5; CA-08). Texto original: a RN-28 diz que a conta `SUSPENSO` "não autentica **em funcionalidades de negócio**", o que sugere que ela autentica mas fica bloqueada. Já a RF-004 condiciona o login a "conta não suspensa", ou seja, sem login algum. Esta Spec segue a RF-004 (CA-08) até a decisão.
- **OPEN-204 — decisão necessária:** o logout não tem RF. Ele vem do ADR-004 e da tarefa T-11. Incluí-lo na spec como requisito?
- **OPEN-205 — decisão necessária:** quais dados o cadastro exige além de e-mail, senha e perfil. `Usuario.nome` existe no modelo, e `PerfilCliente.telefone` também, mas RF-001 não exige nenhum dos dois.
- **OPEN-206 — decisão necessária:** como nasce uma conta de admin. Nenhum RF trata disso, e o cadastro público só oferece cliente e prestador.
- **OPEN-207 — decisão necessária:** a reputação inicial P-08 não é um evento, mas o INV-08 diz que a reputação é **sempre igual à soma** dos eventos. Uma conta nova teria soma 0 e reputação 70. Decisão: a reputação passa a ser "P-08 + soma dos eventos", ou a conta nasce com um evento de abertura? Afeta principalmente SPEC-006.
- **OPEN-208 — decisão necessária:** a normalização do e-mail (maiúsculas e minúsculas, espaços). Não está definido se `Ana@x.dev` e `ana@x.dev` são o mesmo e-mail para RF-002.
- **OPEN-209 — decisão necessária:** a RF-002 manda dizer que o e-mail "não está disponível", o que revela que ele já existe. Já o modelo de ameaças (`seguranca.md` A2) só protege a descoberta de e-mail no login. Aceitar a enumeração pelo cadastro como risco residual registrado, ou alterar a RF-002?

- **OPEN-210 — decisão necessária:** o que acontece logo depois do cadastro. A spec não diz se a conta já sai autenticada. Divergência registrada: o código existente (`rotas/publicas.js`) autentica direto após o cadastro e leva o prestador pendente para a área dele, onde já pode cadastrar serviços e régua antes da aprovação. A spec (UC-01, passo 6) põe isso **depois** da aprovação. O cadastro do código também pede telefone, região e nome do negócio, campos que a RF-001 não exige (ver OPEN-205).

## 14. Definition of Done

A SPEC-002 estará concluída quando:

1. os critérios de aceitação CA-01 a CA-10 estiverem implementados;
2. os invariantes INV-001 a INV-009 estiverem preservados, com INV-001 e INV-004 garantidos também no banco (C-VI);
3. os testes derivados da seção 12 estiverem aprovados;
4. os RNFs da seção 10 tiverem sido verificados como descrito;
5. não houver divergência conhecida entre a implementação e esta Spec;
6. toda divergência em relação à baseline tiver sido explicitamente analisada. Divergências já conhecidas no código existente (análise de 2026-10-01): `autenticar()` deixa conta `SUSPENSO` entrar e bloqueia `REPROVADO`, e a sessão tem só a expiração fixa de 12 h. Contrariam CA-08, CA-09a/b e CA-11.

> **Regra fundamental:** se a implementação entrar em conflito com esta Spec ou com a baseline, o
> comportamento não é alterado silenciosamente. A divergência é registrada com uma de duas ações:
> corrigir a implementação ou propor alteração da baseline. A decisão é da equipe.
