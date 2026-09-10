# Segurança e SSDLC — Encaixe

> Complementa [`spec.md`](spec.md) §8 (RNF-02, RNF-03, RNF-04, RNF-07) e
> [ADR-004](adr/ADR-004-autenticacao.md).
> Escopo: aplicação acadêmica, executada localmente, sem exposição pública.

---

## 1. O que o sistema protege

| Ativo | Por que importa | Onde vive |
|---|---|---|
| Credenciais | Acesso à conta e ao histórico de outra pessoa | `usuario.senha_hash` |
| Dados de contato | E-mail e telefone das partes (LGPD) | `usuario`, `perfil_cliente` |
| Integridade do agendamento | Confirmar, cancelar ou concluir agendamento alheio muda dinheiro e reputação | `agendamento` |
| Reputação | Define permissões (limite de reservas, direito de publicar) | `evento_reputacao` |
| Lançamentos de comissão | Receita da plataforma | `lancamento_comissao` |
| Parâmetros do domínio | Quem os altera muda todas as regras de uma vez | `parametro` |
| Trilha de auditoria | Prova do que aconteceu; base para julgar disputa | `log_auditoria` |

---

## 2. Modelo de ameaças (STRIDE aplicado ao domínio)

| # | Ameaça | Categoria | Controle implementado | Onde |
|---|---|---|---|---|
| A1 | Fazer-se passar por outro usuário | Spoofing | Sessão opaca em cookie `HttpOnly`+`SameSite=Lax`, com estado revogável no banco | `interface/http/sessao.js` |
| A2 | Descobrir se um e-mail está cadastrado | Information disclosure | Mensagem genérica no login; hash calculado mesmo para e-mail inexistente (defesa contra *timing*) | `aplicacao/contas.js` |
| A3 | Confirmar/cancelar agendamento de outra pessoa | Elevation of privilege | Titularidade verificada no caso de uso, não só na rota | `carregarComoParte`, `carregarDoPrestador` |
| A4 | Cliente acessando área de prestador ou admin | Elevation of privilege | Autorização declarativa por rota, verificada no servidor + registro `ACESSO_NEGADO` | `interface/http/servidor.js` |
| A5 | Ação forjada a partir de outro site | Tampering | Token CSRF por sessão em todo POST autenticado, comparado em tempo constante | `sessao.js`, `servidor.js` |
| A6 | Injeção de HTML/JS via nome ou comentário | Tampering | Escape automático em toda interpolação; markup pronto exige `cru()` explícito | `interface/http/html.js` |
| A7 | Injeção de SQL | Tampering | Exclusivamente *prepared statements*; nenhuma concatenação de valor em SQL | `infra/repositorios/*` |
| A8 | Corromper estado por requisição fora de ordem | Tampering | `assegurarTransicao` em toda mudança + `CHECK` de estado no banco | `dominio/estados.js`, `schema.sql` |
| A9 | Duas reservas do mesmo horário | Tampering | Índice único parcial (`INV-01`); segunda tentativa vira 409 | `schema.sql` |
| A10 | Adulterar reputação | Tampering | Reputação é derivada de eventos; nenhum caminho escreve o campo diretamente | `aplicacao/reputacao.js` |
| A11 | Negar que agiu | Repudiation | Toda transição gravada com ator, estados, instante e correlação de requisição | `infra/auditoria.js` |
| A12 | Expor contato antes da hora | Information disclosure | Contato só após `CONFIRMADO`; perfil público mostra apenas dados agregados (`RNF-04`) | `rotas/agendamentos.js` |
| A13 | Estourar custo do provedor de LLM | Denial of service | Limite por usuário/dia (`RNF-13`) + timeout + degradação segura | `aplicacao/busca.js` |
| A14 | Corpo de requisição gigante | Denial of service | Limite de 128 KB no parser de formulário | `servidor.js` |
| A15 | Saída do LLM maliciosa ou fora do formato | Tampering | Validação de esquema antes de qualquer uso; a saída vira *filtro*, nunca decisão | `infra/llm/contrato.js` |

---

## 3. Controles por camada

### Autenticação
- `scrypt` (`N=16384`, sal de 16 bytes por usuário), hash no formato `scrypt$N$sal$chave` — o custo
  fica versionado junto e pode ser elevado sem invalidar hashes antigos.
- Comparação com `timingSafeEqual`.
- Política mínima: 8 caracteres, misturando letras e números.
- Sessão de 12 h, apagada do banco na expiração e no logout.

### Autorização
Duas verificações independentes, propositalmente em camadas diferentes:

1. **Perfil**, declarado na rota (`{ perfil: 'ADMIN' }`), verificado antes do handler.
2. **Titularidade**, verificada no caso de uso — porque é regra de negócio, não de transporte.

Nenhum controle depende da interface: esconder um botão não é autorização.

### Entrada e saída
- Toda escrita usa *prepared statement*.
- Toda saída HTML é escapada por padrão.
- Valores monetários passam por `paraCentavos()`, que rejeita entrada inválida.
- Enums são validados no domínio **e** no banco.

### Cabeçalhos de resposta
`X-Content-Type-Options: nosniff` e `Referrer-Policy: same-origin` em toda resposta HTML.

### Observabilidade (RNF-07)
Cada requisição recebe um identificador de correlação (`randomUUID`) propagado para todos os registros
de auditoria gerados por ela — o que permite reconstruir uma operação inteira a partir de um único id.

---

## 4. Pendências assumidas

Registradas explicitamente porque um documento de segurança que só lista acertos não serve para nada.

| # | Pendência | Risco | Por que foi aceito | Como resolver |
|---|---|---|---|---|
| P1 | Sem CSRF em `/entrar` e `/cadastrar` | *Login CSRF* | Não existe sessão antes do login; criar sessão anônima só para isso adicionaria estado sem ganho no escopo local | Sessão anônima com token (T-81) |
| P2 | Sem rate limiting no login | Força bruta | Sistema roda em `127.0.0.1`; o custo do `scrypt` limita a taxa | Contador por IP/conta com backoff (T-80) |
| P3 | Cookie sem `Secure` | Interceptação | O MVP roda em HTTP local; `Secure` quebraria o desenvolvimento | Ligar junto com HTTPS ao publicar |
| P4 | Sem recuperação de senha | Indisponibilidade para o usuário | Depende de serviço de e-mail, fora do escopo (§2.2) | T-82 |
| P5 | Evidência de disputa aceita apenas texto/URL | URL pode apontar para conteúdo malicioso | Decisão QA-09; upload real exigiria armazenamento e varredura | T-83 |
| P6 | Sem `Content-Security-Policy` | XSS residual | Não há JavaScript inline nem script de terceiros; o escape é a defesa primária | Adicionar CSP restritiva |
| P7 | Banco sem criptografia em repouso | Acesso físico ao arquivo | Ambiente local, dados fictícios | Cifrar volume em produção |
| P8 | `estado_cobranca` é declaratório | Prestador pode marcar "pago" indevidamente | Consequência direta do [ADR-005](adr/ADR-005-escopo-financeiro.md) | Pagamento intermediado |

---

## 5. SSDLC — como a segurança entra no processo

| Fase | Prática adotada | Evidência |
|---|---|---|
| **Requisitos** | Segurança escrita como requisito numerado (RNF-02, RNF-03, RNF-04, RNF-07, RNF-13), não como item de checklist | `spec.md` §8 |
| **Design** | Decisões de segurança viram ADR com limites conhecidos declarados | [ADR-004](adr/ADR-004-autenticacao.md) |
| **Modelagem de ameaças** | Tabela STRIDE mantida neste documento, revisada quando um novo fluxo é adicionado | §2 |
| **Implementação** | Segurança por padrão: escape automático, *prepared statements*, `assegurarTransicao` obrigatório | `html.js`, `estados.js` |
| **Defesa em profundidade** | Invariantes garantidas no domínio **e** no banco (`CHECK`, `UNIQUE`, índice parcial) | `schema.sql` |
| **Testes** | Autorização, CSRF e escape têm teste automatizado, não inspeção manual | `tests/integracao/http.test.js` |
| **Revisão** | PR revisado por outro integrante; revisão multidimensional documentada | [`review/`](review/) |
| **Operação** | Trilha de auditoria com correlação; tentativas negadas registradas | `log_auditoria` |

### Testes de segurança automatizados

| Teste | Verifica |
|---|---|
| `RF-005 \| credencial invalida devolve mensagem generica` | A mensagem não revela qual campo errou |
| `RF-004 \| login valido cria sessao com cookie httpOnly` | Flags `HttpOnly` e `SameSite` presentes |
| `RF-007 \| cliente na area do prestador leva 403...` | Autorização por perfil + registro de auditoria |
| `RF-007 \| prestador nao entra na area do admin` | Separação entre perfis privilegiados |
| `RNF-03 \| POST sem token CSRF valido e recusado` | CSRF ativo |
| `a saida e escapada: nome com HTML nao vira markup` | XSS armazenado bloqueado |
| `T-RESERVA-06 \| RN-13: conta suspensa ou em revisao nao reserva` | Estado da conta limita ação |

---

## 6. Privacidade (LGPD, aplicada ao escopo)

| Princípio | Aplicação |
|---|---|
| Minimização | Coletamos nome, e-mail, telefone e região. Nada além |
| Finalidade | Contato só é exposto entre partes de um agendamento confirmado |
| Transparência | O perfil público mostra exatamente o que é público: reputação e histórico agregado |
| Segurança | Senha só como hash; nenhum dado pessoal em log de aplicação |
| Retenção | Janela móvel de reputação (P-20) limita o peso do histórico antigo |

**Não implementado:** exclusão de conta a pedido do titular e exportação de dados pessoais. Ambos
seriam obrigatórios em produção.
