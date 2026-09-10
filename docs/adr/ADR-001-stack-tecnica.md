# ADR-001 — Stack técnica: Node.js 24 com zero dependências de runtime

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data | 2026-08-21 |
| Decisores | Equipe |
| Substitui | — |
| Relacionado | [ADR-002](ADR-002-modelo-de-dados.md), [ADR-004](ADR-004-autenticacao.md) |

## Contexto

O projeto precisa entregar um MVP web funcional com persistência real, autenticação, três perfis
de usuário e testes automatizados desde o início (spec §RNF-01, RNF-02, RNF-03, RNF-06). O enunciado
é explícito: **a tecnologia é secundária, o que importa é a clareza do raciocínio e a aderência entre
spec e código**.

Três restrições práticas moldaram a decisão:

1. **A avaliação depende do sistema rodar na máquina do professor.** Um `npm install` que falha por
   módulo nativo incompatível, versão de Python ausente ou compilador C++ faltando transforma um
   projeto correto em projeto reprovado.
2. **A equipe é pequena e o cronograma tem 13 semanas**, divididas com o conteúdo teórico. Tempo gasto
   configurando build, transpilador e ORM é tempo que não vai para as regras de negócio — que são o
   objeto real da avaliação.
3. **O código precisa ser legível para quem corrige.** Camadas explícitas valem mais que abstrações
   de framework, porque o avaliador vai procurar as regras da §6 da spec dentro do código.

Alternativas consideradas:

| Alternativa | Por que não |
|---|---|
| Node + Express + Prisma + PostgreSQL | Três dependências pesadas, um serviço externo (Postgres) e uma etapa de migração/geração de client. Muito ponto de falha para uma entrega acadêmica |
| Node + Express + better-sqlite3 | `better-sqlite3` é módulo nativo: exige binário pré-compilado compatível ou toolchain C++ instalado. É exatamente o modo de falha do item 1 |
| Python + FastAPI + SQLAlchemy | Stack sólida, mas exige ambiente virtual, `pip install` e um ORM cujo mapeamento esconderia justamente o que queremos mostrar (o modelo de domínio) |
| Java + Spring Boot | Excelente para camadas explícitas, mas o volume de configuração e boilerplate consumiria semanas do cronograma |

## Decisão

**Node.js 24 (ESM), com zero dependências de runtime.** Tudo que o sistema precisa vem da biblioteca
padrão do próprio Node:

| Necessidade | Recurso nativo |
|---|---|
| Banco de dados | `node:sqlite` (`DatabaseSync`) — estável no Node 24 |
| Servidor HTTP | `node:http` + roteador próprio (~60 linhas) |
| Hash de senha | `node:crypto` (`scrypt`, `timingSafeEqual`, `randomBytes`) |
| Testes | `node:test` + `node:assert/strict` |
| Chamada HTTP externa (LLM) | `fetch` global |
| Renderização | *template literals* com escape automático (`src/interface/http/html.js`) |

A interface é **HTML renderizado no servidor**, sem framework de front-end e sem etapa de build.
O CSS é uma folha única servida de um módulo JS.

A única dependência do projeto é **opcional**: o SDK oficial da Anthropic (`@anthropic-ai/sdk`),
carregado por `import()` dinâmico e usado apenas quando `LLM_PROVIDER=anthropic`. Sem ele, o sistema
roda inteiro com o provedor simulado (ver [ADR-003](ADR-003-uso-de-llm.md)).

Comando completo para rodar o projeto:

```bash
npm run db:seed   # cria o banco e popula dados de demonstração
npm start         # sobe o servidor
```

Não existe `npm install` obrigatório.

## Consequências

### Positivas

- **Reprodutibilidade.** `git clone && npm start` funciona em qualquer máquina com Node 24. Não há
  módulo nativo, lockfile divergente ou serviço externo.
- **Superfície de ataque e de supply chain praticamente nula.** Zero pacotes de terceiros no caminho
  de execução significa zero CVEs herdados.
- **As camadas ficam visíveis.** Sem framework escondendo o fluxo, dá para ler a requisição entrando
  em `src/interface/http/servidor.js`, virando caso de uso em `src/aplicacao/` e batendo nas regras
  puras de `src/dominio/`. É exatamente o que a avaliação procura.
- **Testes rápidos.** A suíte completa (141 testes) roda em ~3 s, com banco em memória por teste.

### Negativas

- **Escrevemos infraestrutura que um framework daria de graça:** roteador, parser de formulário,
  sessão, CSRF e camada de renderização. São ~400 linhas que precisam de teste próprio
  (`tests/unidade/roteador.test.js` existe justamente por causa de um bug nessa camada).
- **`node:sqlite` é recente.** A API é estável no Node 24, mas há menos material de apoio na
  comunidade que `better-sqlite3`.
- **SQLite não escala para concorrência de escrita alta.** Irrelevante no volume do MVP (dezenas de
  prestadores), mas seria o primeiro gargalo em produção real.
- **Sem tipagem estática.** Compensamos com testes de domínio densos e com `CHECK` constraints no
  banco, que rejeitam estado inválido mesmo se o código errar.

### Limites conhecidos

- Migração de esquema é `CREATE TABLE IF NOT EXISTS`; não há versionamento incremental de migrations.
  Aceitável enquanto o esquema evolui por recriação (`npm run db:reset`).
- Um único processo Node atende tudo, inclusive as rotinas temporais. Escalar horizontalmente exigiria
  mover o agendador para fora do processo web.

## Revisão

Rever se: (a) o projeto precisar de mais de um processo simultâneo escrevendo no banco;
(b) o esquema estabilizar e passar a exigir migrations versionadas em produção.
