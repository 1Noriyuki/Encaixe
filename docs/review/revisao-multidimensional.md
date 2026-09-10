# Revisão multidimensional — Encaixe

| Campo | Valor |
|---|---|
| Data | 2026-08-21 |
| Alvo | MVP completo (domínio, aplicação, infra, interface) |
| Base | [`spec.md`](../spec.md) v0.1.3, [`plan.md`](../plan.md) v1.0.0 |
| Dimensões | Arquitetura · Performance · Segurança · Observabilidade · Aderência spec↔código |
| Suíte no momento da revisão | 141 testes, todos verdes |

> Revisão feita lendo o código contra a spec, não por inspeção superficial. Cada achado traz
> **evidência**, **decisão** e, quando aplicável, **o commit de correção**.
> Achados aceitos como dívida estão declarados como tal — uma revisão que só lista acertos não serve
> para nada.

---

## Resumo

| Dimensão | Achados | Corrigidos | Aceitos como dívida |
|---|:--:|:--:|:--:|
| Aderência spec↔código | 3 | 3 | 0 |
| Arquitetura | 3 | 1 | 2 |
| Performance | 3 | 0 | 3 |
| Segurança | 3 | 1 | 2 |
| Observabilidade | 2 | 0 | 2 |
| **Total** | **14** | **5** | **9** |

---

## 1. Aderência entre spec e código

Esta é a dimensão que o enunciado trata como falha de projeto quando divergente, então foi revisada primeiro.

### A-01 — `RESTRITO` estava sendo aplicado a prestador *(corrigido)*

**Severidade:** média · **Regra:** RN-22

A spec é específica: *"Conta de qualquer perfil com reputação abaixo de P-09 entra em `EM_REVISAO`.
**Cliente** entre P-09 e P-10 fica `RESTRITO`"*. O estado `RESTRITO` existe para limitar reservas
simultâneas (RN-12) — algo que prestador não faz.

O código aplicava `RESTRITO` a qualquer perfil. Efeito prático: um prestador com reputação 45 ficava
`RESTRITO` sem que esse estado significasse coisa alguma para ele, e o painel exibia um selo de
restrição enganoso.

**Correção:** `classificarPorReputacao()` passou a receber o perfil; o prestador entre os limiares
segue `ATIVO` — o freio dele é RN-21 (ocorrências negativas), não este.
**Teste:** `T-REVISAO-03 | RN-22: RESTRITO e estado de cliente, nao de prestador`.

### A-02 — RN-01 estava escrita ao contrário na spec *(corrigido na spec, v0.1.1)*

**Severidade:** alta · **Regra:** RN-01

A redação original — *"a maior faixa menor ou igual à antecedência atual"* — inverte a régua: a 5 h do
horário daria 20% e a 40 min daria 0%. Ou seja, **esperar mais sairia mais barato**, o exato oposto do
produto.

**Correção:** spec corrigida **antes** do código (v0.1.1), com exemplo numérico embutido.
**Teste:** `T-PRECO-04b` verifica a propriedade que a regra precisa garantir — o desconto nunca
diminui conforme o horário se aproxima — em vez de só conferir valores pontuais.

### A-03 — Máquina de estados do horário incompleta *(corrigido na spec, v0.1.3)*

**Severidade:** alta · **Regra:** RN-18 / RF-049 / spec §9.5

Faltava a transição `OCUPADO → PUBLICADO`. Quando o cliente cancelava um agendamento **confirmado**, o
horário não tinha destino válido e a operação estourava. O teste `T-COMISSAO-05i` pegou.

**Correção:** spec §9.5 ganhou as transições `OCUPADO → PUBLICADO` e `OCUPADO → EXPIRADO`, com a
assimetria documentada (cliente cancela → horário volta a ser vendável; prestador cancela → horário
morre junto, porque quem não vai atender é ele). Só então `estados.js` foi ajustado.

---

## 2. Arquitetura

### AR-01 — Filtro morto no repositório de horários *(corrigido)*

**Severidade:** baixa · **Arquivo:** `src/infra/repositorios/horarios.js`

`buscar()` aceitava `precoMax` e traduzia em `h.preco_base_snapshot >= 0` — condição sempre verdadeira.
Um parâmetro que **aparenta** filtrar e não filtra é pior que a ausência dele: quem lesse a assinatura
assumiria que a busca por preço existia. Nenhum chamador passava o parâmetro.

**Correção:** parâmetro removido. Filtro por preço, se voltar, entra como tarefa com teste.

### AR-02 — Acoplamento entre serviços de aplicação *(aceito)*

**Severidade:** baixa

`avaliacoes.js` e `disputas.js` importam `carregarComoParte` e `papelDe` de `agendamentos.js`. É
acoplamento horizontal dentro da mesma camada.

**Decisão: aceito.** A alternativa — extrair um módulo `autorizacao-agendamento.js` — criaria um
arquivo de duas funções para evitar um import que expressa uma dependência real: quem avalia ou disputa
precisa ser parte do agendamento. O domínio segue sem acoplamento, que é o que importa para a regra de
dependência do plano.

### AR-03 — `LIMIT 200` silencioso na busca *(aceito, com registro)*

**Severidade:** baixa · **Arquivo:** `horarios.js:buscar`

A busca corta em 200 resultados sem avisar o usuário. No volume do MVP (dezenas de prestadores) o
limite nunca é atingido, mas truncamento silencioso é o tipo de coisa que engana em produção.

**Decisão: aceito para o MVP, registrado aqui.** Se o volume crescer, o certo é paginar e exibir a
contagem total — não aumentar o limite.

---

## 3. Performance

### P-01 — Rotinas temporais disparadas na requisição *(aceito)*

**Severidade:** baixa

Além do agendador de 60 s, as rotinas rodam sob demanda antes de leituras sensíveis a tempo, com trava
de 15 s. Isso significa que **uma requisição a cada 15 s paga o custo da varredura** (~5 consultas
indexadas).

**Decisão: aceito e deliberado.** É a resposta ao QA-08: redundância que garante correção mesmo se o
agendador falhar. O custo é irrelevante no volume do MVP. Em produção, o agendador sairia do processo web.

### P-02 — Consulta extra por página renderizada *(aceito)*

`contarNaoLidas(usuario.id)` roda a cada renderização, para o contador do sino. É um `COUNT(*)` com
índice em `(usuario_id, criada_em)`.

**Decisão: aceito.** Custo desprezível; a alternativa (cache em sessão) introduziria inconsistência
visível para ganho nenhum nesta escala.

### P-03 — Precificação em memória *(aceito, com mitigação já aplicada)*

A busca precifica cada horário em JavaScript, não em SQL. Para 200 horários são 200 execuções de
`calcularPreco`, cada uma trivial.

**Mitigação já no código:** `faixasPorRegua()` carrega as faixas de todas as réguas em **uma** consulta,
eliminando o N+1 óbvio. Manter o cálculo fora do SQL é decisão de arquitetura: a regra de preço tem que
viver no domínio, testável, e não espalhada em `CASE WHEN`.

---

## 4. Segurança

Análise completa em [`../seguranca.md`](../seguranca.md). Achados desta revisão:

### S-01 — Erro em POST sem sessão era engolido *(corrigido)*

**Severidade:** média (usabilidade com efeito em segurança)

O aviso pós-redirect é guardado por sessão. Em `POST /entrar` com senha errada **não existe sessão**,
então o usuário era redirecionado sem mensagem alguma — sem saber se errou a senha, se a conta estava
suspensa ou se o sistema falhou. Feedback ausente em fluxo de autenticação leva o usuário a repetir a
ação às cegas.

**Correção:** erro em POST sem sessão passou a ser renderizado na hora, com a mensagem e um caminho de
volta. **Teste:** `RF-005 | credencial invalida devolve mensagem generica`.

### S-02 — Login e cadastro sem CSRF *(aceito, documentado)*

Não existe sessão antes do login, logo não há token. Risco residual: *login CSRF*.
**Decisão: aceito no escopo acadêmico**, registrado em `seguranca.md` (P1) e no
[ADR-004](../adr/ADR-004-autenticacao.md), com a correção mapeada como tarefa T-81.

### S-03 — Sem rate limiting no login *(aceito, documentado)*

Mitigado apenas pelo custo do `scrypt` e pelo fato de o sistema rodar em `127.0.0.1`.
Registrado como P2 e tarefa T-80. **Obrigatório antes de qualquer exposição pública.**

---

## 5. Observabilidade

### O-01 — Trilha de auditoria: ponto forte confirmado

Toda transição de estado grava ator, estado anterior, estado novo, detalhe em JSON e **identificador de
correlação da requisição**. Isso permite reconstruir uma operação inteira a partir de um id, e é o que
dá base factual para o admin julgar uma disputa. A tela do agendamento mostra esse histórico para as
próprias partes — transparência, não só log interno.

Verificado por `INV-13` e pelo teste de auditoria de acesso negado.

### O-02 — Log de aplicação não é estruturado *(aceito)*

Erros vão para `console.error` em texto livre, com o id de correlação no prefixo. Não há JSON
estruturado nem níveis de log.

**Decisão: aceito.** Para um MVP local, o par "auditoria no banco + erro no console" cobre o
diagnóstico. Em produção, o mínimo seria log estruturado com nível e correlação.

### O-03 — Métricas de negócio existem; métricas técnicas não *(aceito)*

O painel do admin mostra comissão, ticket médio, taxa de cancelamento, taxa de no-show e qualidade da
extração por LLM. Não há métrica técnica (latência, taxa de erro HTTP, tempo de resposta do provedor).

**Decisão: aceito.** Métrica de negócio é o que a disciplina avalia e o que o admin usa; métrica
técnica entraria junto com o log estruturado.

---

## 6. Ações e pendências

### Corrigido nesta revisão

| Achado | Correção | Evidência |
|---|---|---|
| A-01 | `classificarPorReputacao` passou a considerar o perfil | `T-REVISAO-03` |
| A-02 | Spec v0.1.1 corrigiu RN-01 antes do código | `T-PRECO-04b` |
| A-03 | Spec v0.1.3 completou a máquina de estados do horário | `T-COMISSAO-05i` |
| AR-01 | Parâmetro `precoMax` morto removido | Suíte verde após remoção |
| S-01 | Erro em POST sem sessão é renderizado | `RF-005` |

### Dívida registrada

| Achado | Onde está rastreado |
|---|---|
| AR-02 acoplamento entre serviços | Este documento (aceito) |
| AR-03 limite silencioso de 200 | Este documento |
| P-01, P-02, P-03 | Este documento (aceitos com justificativa) |
| S-02 CSRF em login | `seguranca.md` P1 · `tasks.md` T-81 |
| S-03 rate limiting | `seguranca.md` P2 · `tasks.md` T-80 |
| O-02 log estruturado | Este documento |
| O-03 métricas técnicas | Este documento |

---

## 7. Conclusão

O ponto mais forte do sistema é a **separação entre regra e infraestrutura**: as 34 regras de negócio
vivem em módulos puros, sem banco, sem rede e sem relógio real, o que as torna testáveis de forma
exaustiva — e foi isso que permitiu que a suíte encontrasse dois erros na própria especificação.

O ponto mais frágil é a **infraestrutura HTTP escrita do zero** (consequência assumida do
[ADR-001](../adr/ADR-001-stack-tecnica.md)). Dois dos cinco bugs desta revisão nasceram ali — roteador
e camada de renderização — não no domínio. A mitigação aplicada foi cobrir essa camada com testes
próprios, incluindo um arquivo inteiro de regressão para o roteador.

Nenhum achado aberto impede a entrega do MVP. Os dois que bloqueariam produção real
(rate limiting e HTTPS com cookie `Secure`) estão registrados com dono e caminho de correção.
