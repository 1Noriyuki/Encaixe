# ADR-004 — Autenticação por sessão em cookie e autorização por perfil no servidor

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data | 2026-08-21 |
| Decisores | Equipe |
| Relacionado | [ADR-001](ADR-001-stack-tecnica.md) · spec §4.5 (matriz de permissões), RF-004 a RF-007, RNF-02, RNF-03 |

## Contexto

O sistema tem três perfis com interesses conflitantes (cliente, prestador, admin) e uma matriz de
permissões explícita na spec §4.5. Além do perfil, quase toda operação depende de **titularidade**:
o prestador confirma *a reserva dele*, o cliente cancela *o agendamento dele*.

A aplicação é renderizada no servidor, sem SPA e sem API pública. Não há aplicativo móvel nem
integração de terceiros no escopo do MVP.

Alternativas consideradas:

| Alternativa | Por que não |
|---|---|
| JWT em `localStorage` | Resolve um problema que não temos (cliente separado do servidor) e cria outro: token não revogável e exposto a XSS |
| JWT em cookie | Mesma complexidade de assinatura/rotação, sem ganho sobre sessão em banco para um monólito |
| HTTP Basic | Sem logout, credencial enviada em toda requisição |

## Decisão

**Sessão opaca em cookie, com estado no banco.**

### Sessão

- Identificador aleatório de 24 bytes (`randomBytes`), sem informação embutida.
- Cookie `encaixe_sid` com `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` de 12 h.
- A linha em `sessao` guarda `usuario_id`, `csrf`, `criada_em` e `expira_em`. Expirada, é apagada na
  primeira tentativa de uso.
- Logout apaga a linha — a sessão é **revogável de verdade**, ao contrário de um JWT.

### Senha

`scrypt` do `node:crypto`, com sal de 16 bytes por usuário e custo `N=16384`. O hash é armazenado como
`scrypt$N$sal$chave`, o que deixa o parâmetro de custo versionado junto. Comparação em tempo constante
com `timingSafeEqual`.

Na autenticação, o hash é calculado **mesmo quando o e-mail não existe** (contra um hash descartável),
para que o tempo de resposta não revele a existência da conta. A mensagem de erro é sempre a mesma
(`RF-005`).

### Autorização

Declarativa na rota, verificada no servidor antes do handler:

```js
r.get('/prestador/extrato', telaExtrato, { perfil: 'PRESTADOR' });
r.post('/admin/disputas/:id/resolver', resolverDisputa, { perfil: 'ADMIN' });
```

Perfil errado devolve **403 e grava `ACESSO_NEGADO` na auditoria** (`RF-007`) — tentativa de acesso
indevido é informação de segurança, não apenas um erro.

**Titularidade é checada na camada de aplicação**, não na rota: `carregarComoParte()` e
`carregarDoPrestador()` em `src/aplicacao/agendamentos.js` lançam `ErroDeAutorizacao` quando o
agendamento não pertence a quem pediu. Isso mantém a regra junto do caso de uso, e não espalhada
pelas rotas.

### CSRF

Token por sessão, exposto como campo oculto em todo formulário POST e comparado em tempo constante.
Rota sem token válido devolve 403 e registra a tentativa.

**Exceção documentada:** `POST /entrar` e `POST /cadastrar` rodam sem CSRF, porque não existe sessão
antes deles. O risco residual é *login CSRF* (forçar a vítima a autenticar numa conta do atacante) —
aceito no escopo acadêmico e registrado em [`docs/seguranca.md`](../seguranca.md).

### Visibilidade de dados de contato

E-mail e telefone das partes só aparecem depois que o agendamento está `CONFIRMADO` (`RNF-04`). Antes
disso, o perfil público mostra apenas nome de exibição, região, reputação e histórico agregado.

## Consequências

### Positivas

- **Revogação imediata.** Suspender uma conta ou fazer logout encerra o acesso na hora.
- **Cookie opaco não vaza nada** se interceptado fora do contexto da sessão.
- **A autorização é auditável**: perfil na rota (visível em uma linha), titularidade no caso de uso
  (junto da regra), tentativa negada na trilha.
- **Zero dependências** — coerente com ADR-001.

### Negativas

- **Estado no servidor.** Escalar para vários processos exigiria sessão compartilhada.
- **Sem `Secure` no cookie em desenvolvimento**, porque o MVP roda em HTTP local. Em produção seria
  obrigatório junto com HTTPS.
- **Sem rate limiting no login.** Ataque de força bruta é possível; mitigado apenas pelo custo do
  `scrypt`. Registrado como pendência em `docs/seguranca.md`.
- **Login/cadastro sem CSRF**, conforme exceção acima.
- **Sem recuperação de senha** no MVP.

### Limites conhecidos

- Não há sessão anônima, então usuário não autenticado não pode executar POST algum (a busca por texto
  livre foi feita `GET` justamente por isso — e ficou compartilhável por URL como efeito colateral bom).
- Não há autenticação de dois fatores nem política de expiração de senha.

## Revisão

Rever se: (a) o sistema for exposto na internet (HTTPS + `Secure` + rate limiting viram obrigatórios);
(b) surgir cliente móvel ou API pública, quando token deixa de ser complexidade desnecessária.
