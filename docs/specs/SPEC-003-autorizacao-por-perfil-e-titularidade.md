# SPEC-003 — Autorização por perfil e titularidade

| Campo | Valor |
|---|---|
| Versão | 1.2.0 |
| Data | 2026-10-30 |
| Status | Aprovada pela equipe em 2026-10-30 (informado por 2dart5, registro etapa 61), com o código conferido e a evidência completa na §12. **Concluída.** As questões da §13 seguem registradas para decisão posterior |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 3 de 29 |
| Baseline | [`docs/spec.md`](../spec.md) v0.1.6 · ADR-004 · constituição |

## 1. Identificação

- **ID:** SPEC-003
- **Nome:** Autorização por perfil e titularidade
- **Objetivo:** permitir uma operação apenas quando o perfil autenticado e a titularidade do recurso autorizam a ação, negando e registrando tentativas indevidas no servidor.
- **Valor entregue:**
  - **Ao usuário:** dados e ações de uma conta não ficam acessíveis a outros perfis ou titulares.
  - **Ao sistema:** a matriz da spec §4.5 é aplicada de forma uniforme nas rotas e nos casos de uso, com trilha para as recusas.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-006, RF-007; RF-084 para o registro de auditoria | spec §7.1, §7.9 |
| RN | nenhuma específica; a matriz de permissão da spec §4.5 define os papéis autorizados | spec §4.5 |
| RNF | RNF-03, RNF-07 | spec §8 |
| Histórias | US-03 | spec §5.2 |
| Caso de uso / fluxo | Transversal a todos os casos de uso protegidos | spec §10 |
| Entidades | `Usuario`, `LogAuditoria`; recursos de negócio cujo titular é conferido | spec §9.2 |
| Invariantes globais | INV-13 (trilha de auditoria) | spec §9.8 |
| Drivers arquiteturais | R-6.1, C-IX | spec §1.5, constituição |
| ADRs | ADR-004 (sessão no servidor, perfil na rota, titularidade na aplicação) | `docs/adr/` |
| Dependências | SPEC-001 (auditoria); SPEC-002 (conta autenticada e sessão) | mapa §2 |

## 3. Escopo

### Incluído

1. Resolver a identidade e o perfil exclusivamente pela sessão válida mantida no servidor.
2. Restringir cada rota protegida ao perfil ou conjunto de perfis declarado para aquela ação.
3. Validar titularidade do recurso no caso de uso, inclusive em operações que não têm uma restrição única por perfil.
4. Recusar acesso sem sessão, com perfil incompatível ou sobre recurso alheio, sem executar a operação protegida.
5. Registrar tentativas negadas por perfil na trilha de auditoria conforme RF-007.
6. Manter a resposta HTTP e a mensagem de recusa distintas de sucesso, sem revelar dados privados do recurso alheio.

### Fora do escopo

| Comportamento | Onde fica |
|---|---|
| Criar, expirar ou revogar sessão e autenticar credenciais | SPEC-002 |
| Criar regras novas de negócio ou ampliar a matriz de permissões | Baseline `docs/spec.md`; decisão da equipe antes de alterar |
| CSRF de formulários autenticados | RNF-03 / ADR-004 e fluxo transversal |
| Auditar ações administrativas autorizadas e consulta da trilha | SPEC-029 |
| Definir o catálogo de papéis e os estados da conta | SPEC-001 e SPEC-002 |

## 4. Dependências

| Tipo | Item |
|---|---|
| Specs anteriores | **SPEC-001:** trilha de auditoria. **SPEC-002:** conta, perfil e sessão autenticada |
| Decisões arquiteturais | ADR-004: sessão opaca no cookie, resolução no servidor; autorização declarativa por perfil na rota; titularidade na aplicação |
| Decisão humana | OPEN-01 e OPEN-02 aprovadas em 2026-10-08 e ratificadas no registro SDD em 2026-10-18 |

## 5. Comportamento esperado

### 5.1 Resolver identidade e perfil

- **Pré-condições:** uma requisição alcança uma rota.
- **Fluxo principal:**
  1. O servidor resolve a sessão pelo identificador opaco do cookie.
  2. O usuário e o perfil usados na decisão vêm dessa sessão e do registro da conta, nunca de campos submetidos pelo navegador.
  3. Para rota protegida, o servidor exige autenticação antes de invocar o handler.
- **Fluxos de exceção:**
  - 1a. Sem sessão válida: a operação protegida não é executada e o visitante é conduzido ao login.
  - 1b. Sessão expirada ou revogada: trata-se a requisição como não autenticada, conforme SPEC-002.

### 5.2 Autorizar por perfil

- **Pré-condições:** há usuário autenticado e a operação está definida na matriz da spec §4.5.
- **Fluxo principal:**
  1. A rota confere se o perfil autenticado pertence ao conjunto autorizado para a ação.
  2. Se autorizado, o processamento continua para o caso de uso.
- **Fluxo de exceção:**
  - 1a. Perfil não autorizado: o servidor responde com acesso negado (HTTP 403), registra a tentativa com o ator e o contexto da ação e não executa o handler.

### 5.3 Autorizar por titularidade

- **Pré-condições:** a operação se refere a recurso pertencente a um usuário ou prestador.
- **Fluxo principal:**
  1. O caso de uso carrega o recurso e compara o titular persistido com o usuário da sessão.
  2. A operação só continua quando a relação de titularidade ou a exceção de papel (por exemplo, admin explicitamente permitido pela matriz) é válida.
- **Fluxo de exceção:**
  - 1a. Recurso de outra pessoa: a operação é recusada, não altera estado nem revela dados privados do recurso.
  - 1b. Recurso inexistente: aplica-se a resposta de não encontrado, sem tratar a falha como autorização concedida.

## 6. Regras e invariantes

| ID | Invariante | Verificação | Origem |
|---|---|---|---|
| INV-001 | O perfil usado para autorizar vem da conta associada à sessão, não de dado controlado pelo cliente | tentar forjar perfil em query/form e manter o resultado determinado pela sessão | RF-006, RNF-03 |
| INV-002 | Nenhum handler ou caso de uso protegido executa após recusa de perfil | verificar resposta e ausência de efeito de negócio | RF-006, RF-007 |
| INV-003 | A titularidade é validada no servidor para cada recurso pertencente a uma parte | usuário alheio tenta ler ou alterar o recurso; operação não prossegue | RF-006, RNF-03 |
| INV-004 | Tentativa negada por perfil produz registro de auditoria atribuído ao usuário e à ação | comparar ator, ação e recurso/contexto do registro | RF-007, RF-084, INV-13 |
| INV-005 | A recusa não divulga dados privados de recurso alheio | resposta da tentativa não contém dados do recurso | RNF-03, RNF-04 |
| INV-006 | Requisição anônima não executa operações protegidas | requisição sem cookie não produz efeito | RF-006, ADR-004 |

## 7. Modelo de domínio envolvido

| Entidade | Atributos relevantes | Restrições |
|---|---|---|
| `Usuario` | `id`, `perfil`, `estado_conta` | perfil e estado vêm da conta autenticada; estados e transições seguem SPEC-001 |
| Sessão técnica | `id`, `usuario_id`, `criada_em`, `expira_em` | identificador opaco; resolvida no servidor conforme ADR-004 e SPEC-002 |
| `LogAuditoria` | ator, ação, tipo/ID da entidade, detalhe, instante, correlação | registra recusa conforme RF-007 e princípios de SPEC-001 |
| Recursos de negócio | identificador e titular persistidos | o caso de uso confere o titular antes de ler conteúdo protegido ou gravar alteração |

## 8. Impacto arquitetural

| Item | Impacto |
|---|---|
| Módulos envolvidos | `interface/http` (autenticação, política da rota, resposta 403); `aplicacao` (titularidade); `infra` (auditoria); `dominio` (erros de autorização) |
| Fronteiras | Interface aplica perfil; aplicação protege propriedade do recurso. Nenhum dado de autorização é confiado ao navegador |
| Integrações externas | nenhuma |
| Frontend | apresenta recusa acessível e identificada pela regra aplicável, sem controlar acesso |
| Backend | checagem obrigatória no servidor antes de efeitos de negócio |
| ADRs que restringem | ADR-004 e ADR-001 (sem middleware ou dependência externa necessária) |

## 9. Contratos necessários (conceituais)

| Operação | Entradas | Saída | Erros |
|---|---|---|---|
| Resolver identidade | cookie de sessão | usuário e perfil autenticados, ou anônimo | sessão inválida/ausente tratada conforme SPEC-002 |
| Autorizar rota | usuário da sessão; perfis permitidos; ação/caminho | autorização | HTTP 403; auditoria da tentativa |
| Autorizar titularidade | usuário da sessão; recurso; papel excepcional permitido, quando houver | recurso autorizado | acesso negado ou não encontrado; sem mutação |
| Registrar tentativa negada | ator; ação; recurso/contexto; instante e correlação | registro de auditoria | falha de persistência explícita; nenhum efeito protegido |

Assinaturas HTTP e nomes de helpers não são definidos por esta Spec.

## 10. Requisitos não funcionais aplicáveis

| RNF | Como afeta esta Spec | Como será verificado |
|---|---|---|
| RNF-03 Autorização | checagem no servidor de perfil e titularidade | testes HTTP com sessão válida de cada perfil e tentativa sobre recurso alheio |
| RNF-04 Privacidade | resposta de negação não expõe contato nem conteúdo privado | inspeção da resposta em cenários de titularidade negativa |
| RNF-07 Observabilidade | tentativas negadas por perfil deixam trilha | teste de auditoria com ator, ação e correlação |
| RNF-08 Consistência temporal | registros usam instante UTC do sistema | inspeção dos registros em teste com relógio controlado |

## 11. Critérios de aceitação

**CA-01 — Rota protegida sem sessão**
- **Dado** um visitante sem sessão válida,
- **quando** solicita uma operação protegida,
- **então** o handler não executa e a resposta conduz ao login.

**CA-02 — Perfil autorizado**
- **Dado** uma sessão de um perfil permitido pela matriz,
- **quando** solicita a operação correspondente,
- **então** o controle de autorização deixa a operação prosseguir.

**CA-03 — Perfil não autorizado**
- **Dado** uma sessão válida de perfil não permitido,
- **quando** tenta a operação,
- **então** recebe HTTP 403, a tentativa é auditada e nenhum efeito de negócio ocorre.

**CA-04 — Perfil forjado**
- **Dado** uma sessão de cliente e um formulário que declara `perfil=ADMIN`,
- **quando** solicita uma rota exclusiva de admin,
- **então** o servidor usa o perfil da sessão e recusa a operação.

**CA-05 — Recurso de outro titular**
- **Dado** um recurso pertencente a outra conta,
- **quando** o usuário tenta acessá-lo ou alterá-lo,
- **então** o caso de uso recusa sem expor dados privados nem modificar o recurso.

**CA-06 — Titular legítimo**
- **Dado** usuário que é titular do recurso e tem perfil autorizado,
- **quando** executa a ação permitida,
- **então** a operação segue normalmente.

**CA-07 — Registro da recusa por perfil**
- **Dado** uma tentativa negada por incompatibilidade de perfil,
- **quando** a resposta 403 é produzida,
- **então** existe registro identificando o ator e a operação negada.

## 12. Casos de teste derivados

Os casos abaixo são propostas para a implementação/conferência após aprovação da Spec; os testes existentes de HTTP são evidência parcial, não substituem a conferência de todos os critérios.

| Teste | Cobre |
|---|---|
| `T-AUTORIZ-01 \| RF-006: visitante sem sessao nao executa rota protegida` | CA-01 |
| `T-AUTORIZ-02 \| RF-006: perfil permitido acessa a operacao da matriz` | CA-02 |
| `T-AUTORIZ-03 \| RF-007: perfil incompatível recebe 403 e tentativa e auditada` | CA-03, CA-07 |
| `T-AUTORIZ-04 \| RNF-03: perfil enviado pelo navegador nao altera a autorizacao` | CA-04, INV-001 |
| `T-TITULAR-01 \| RF-006: usuario nao le agendamento de outra parte` | CA-05, INV-003, INV-005 |
| `T-TITULAR-02 \| RF-006: usuario nao altera recurso de outro titular` | CA-05, INV-002, INV-003 |
| `T-TITULAR-03 \| RF-006: titular autorizado consulta o proprio recurso` | CA-06 |
| `T-AUTORIZ-05 \| RF-007: recusa nao executa handler nem altera estado` | CA-03, INV-002 |

**Evidência (registro etapa 43, 2026-10-30).** Todos os testes acima existem em
`tests/integracao/spec-003-autorizacao.test.js` e passam. Código conferido sem alteração: a rota resolve
o perfil pela sessão e recusa antes do CSRF e do handler (`servidor.js`); a titularidade é conferida em
`carregarComoParte`, `carregarDoPrestador` e `papelDe` (`aplicacao/agendamentos.js`).

| Critério | Evidência |
|---|---|
| CA-01, INV-006 | `T-AUTORIZ-01`: as 38 rotas protegidas redirecionam o visitante ao login; a reserva anônima não cria agendamento; as 6 públicas respondem sem sessão |
| CA-02, DoD 2 | `T-AUTORIZ-02`: tabela com **todas** as rotas, cada uma ligada à ação da §4.5, testada com os três perfis |
| CA-03, CA-07, INV-004 | `T-AUTORIZ-03`: 403 com RF-007 na tela; registro `ACESSO_NEGADO` com ator, caminho, perfil, perfil exigido, correlação e instante UTC |
| CA-04, INV-001 | `T-AUTORIZ-04`: `perfil=ADMIN` no formulário e na query, com CSRF válido, não muda a decisão nem o parâmetro |
| INV-002 | `T-AUTORIZ-05`: prestador com CSRF válido tenta reservar; nada é gravado |
| CA-05, INV-003, INV-005 | `T-TITULAR-01` (leitura alheia: 403 sem observação, telefone nem nome; inexistente: 404) e `T-TITULAR-02` (cancelar, confirmar e cancelar horário alheios não mudam estado nem geram transição) |
| CA-06 | `T-TITULAR-03` |
| RNF-08 | `T-AUTORIZ-03` (instante UTC do registro) |

## 13. Questões em aberto

- **OPEN-03:** a interpretação de drivers arquiteturais do mapa usa spec §1.5 e a constituição; a equipe ainda não formalizou uma lista separada.
- **Cobertura de auditoria da titularidade:** RF-007 explicita auditoria para operação não permitida ao perfil; confirmar se toda tentativa sobre recurso alheio deve receber o mesmo registro, além da resposta de negação.
- A matriz da spec §4.5 é transcrita como fonte, sem alterar permissões nesta proposta. Qualquer ampliação ou exceção precisa de decisão da equipe.
- **Divergências da matriz encontradas na conferência (etapa 43), não corrigidas:** (1) "Cancelar agendamento — Admin: Sim (qualquer, com justificativa)" não tem caminho no código: `cancelar()` só aceita as partes. A linha não diz que penalidade ou estado o cancelamento pelo admin produz, então implementá-lo é decisão da SPEC-017. (2) "Ver extrato próprio de comissão — Admin: Sim": `/prestador/extrato` é só do prestador; o admin vê métricas consolidadas, não o extrato de um prestador (SPEC-024).

## 14. Definition of Done

Esta Spec estará concluída quando:

1. a equipe aprovar o rascunho e resolver as questões que alterem comportamento;
2. cada linha aplicável da matriz de permissões estiver ligada a rota/caso de uso protegido;
3. CA-01 a CA-07 e os invariantes INV-001 a INV-006 tiverem evidência automatizada;
4. as recusas por perfil tiverem evidência de auditoria e ausência de efeito de negócio;
5. os testes de titularidade provarem que recurso alheio não é divulgado nem alterado;
6. a implementação revisada continuar conforme ADR-004, RNF-03 e RNF-07.
