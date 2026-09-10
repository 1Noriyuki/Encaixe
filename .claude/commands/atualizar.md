---
description: Atualiza o CLAUDE.md com o estado atual do projeto, para depois limpar o chat
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(npm test:*)
---

Atualize o `CLAUDE.md` na raiz do projeto para refletir o estado atual, de modo que a próxima
sessão comece com o contexto certo sem precisar redescobrir nada.

Faça nesta ordem:

1. Leia o `CLAUDE.md` atual.
2. Levante o que mudou desde a última atualização: `git status --short`, `git log --oneline -15`
   e, se houver muita coisa não commitada, `git diff --stat`.
3. Confirme que os comandos documentados ainda funcionam e que os caminhos citados ainda existem
   antes de mantê-los no arquivo. Comando ou caminho que não existe mais é pior que ausência de
   documentação.
4. Reescreva apenas as seções afetadas. **Não engorde o arquivo a cada rodada** — se algo virou
   detalhe histórico ou deixou de ser verdade, remova. O valor dele está em ser curto e confiável.

O que o `CLAUDE.md` deve conter, e só isso:

- comandos reais do dia a dia, incluindo rodar um teste isolado;
- arquitetura de alto nível e as fronteiras entre camadas que não dá para inferir de um arquivo só;
- convenções do projeto que um recém-chegado violaria sem saber (idioma, rastreabilidade por
  identificador de regra, parâmetro como dado, ausência de dependências);
- armadilhas já encontradas na prática — coisas que custaram tempo a descobrir;
- mapa da documentação e variáveis de ambiente.

Não inclua conselho genérico de programação, lista exaustiva de arquivos, nem nada descobrível em
dez segundos com `ls`.

Ao terminar, informe em duas ou três linhas o que mudou no arquivo e **lembre o usuário de rodar
`/clear` em seguida** — a limpeza do chat é um comando do próprio Claude Code e precisa ser digitada
por ele; não há como disparar daqui.
