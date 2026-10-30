# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

**Encaixe** — marketplace de horários ociosos de prestadores de serviço locais, com preço que cai
conforme o horário se aproxima. Projeto final de Modelagem de Software (2026-2, Turma 04I).

O código é em **português** (identificadores, comentários, rotas, colunas do banco). Comentários
explicam *por que*, não *o que*, e citam o identificador da regra quando existe. Escreva no mesmo
idioma e no mesmo registro. Texto que o usuário lê é português **acentuado**; identificador, rota,
coluna e chave de lookup continuam sem acento.

## Comandos

```bash
npm start            # servidor em http://127.0.0.1:3000 (NÃO recarrega sozinho)
npm run dev          # node --watch — use este durante desenvolvimento
npm test             # suíte completa (node --test), 450 testes, ~10 s
npm run db:seed      # cria o banco e popula demonstração
npm run db:migrar    # cria as 22 tabelas (idempotente, com backfill RN-00)
npm run db:reset     # apaga dados/encaixe.db e recomeça do zero
```

Para testar sem tocar no banco da equipe: `DB_PATH=<pasta temporária>/demo.db npm run db:seed` e
`PORT=3917 DB_PATH=... node src/main.js`.

Rodar um teste isolado:

```bash
node --test tests/unidade/precificacao.test.js
node --test --test-name-pattern "RN-19"     # todos os testes de uma regra
```

Requisito único: **Node.js >= 24**. Não há `npm install`, build, bundler, linter nem dependência de
runtime ou de desenvolvimento (ADR-001). Antes de sugerir qualquer biblioteca, saiba que a ausência
de dependências é uma decisão registrada — proponha, não assuma.

Contas de demonstração (senha `senha1234`): `admin@encaixe.dev`, `renata@salao.dev` (prestadora,
política LIBERAR), `marcos@barbearia.dev` (prestador, AUTOCONFIRMAR), `diego@cliente.dev`,
`bruna@cliente.dev` (restrita, demonstra RN-12).

## A regra que governa tudo

**`docs/spec.md` é a fonte de verdade.** Divergência entre spec e código é falha de projeto. Se o
código revelar erro na spec, corrige-se a spec primeiro, com registro no histórico de versões — não
se ajusta o código para acomodar spec errada. `.specify/memory/constitution.md` tem os dez princípios
completos; leia antes de mudanças estruturais.

Consequências práticas disso no dia a dia:

- **Parâmetro é dado, não código.** Nenhum número de regra (janela de confirmação, limiar de
  reputação, percentual de comissão) pode aparecer solto numa função. Todos vivem na tabela
  `parametro`, com faixa validada, editáveis pelo admin. Alteração nunca retroage.
- **O usuário vê a regra que o barrou.** `ErroDeRegra` carrega o identificador (`'RN-12'`) e a
  camada HTTP o exibe. Ninguém recebe "operação inválida". Códigos como `RF-082` e `INV-13`
  aparecem na interface de propósito — são rastreabilidade, não sobra de debug.
- **Invariantes valem em dois lugares.** O que não pode acontecer é barrado no domínio *e* no banco
  (`CHECK`, `UNIQUE`, índice único parcial). A duplicação é deliberada.
- **A IA interpreta; o sistema decide.** O LLM produz *filtros* validados por esquema; seleção,
  ordenação, preço e transição de estado são sempre código determinístico. O sistema inteiro precisa
  funcionar com o provedor fora do ar.

## Processo SDD

O projeto seguiu o roteiro de Spec-Driven Development do professor: **mapa de Specs aprovado → uma
Spec por vez, aprovada antes de implementar**. Tudo vive em `docs/specs/`.

- **Estado em 2026-10-30 (etapa 64):** spec v0.1.11. As 29 Specs estão aprovadas e **concluídas**
  (evidência na §12, questões da §13 decididas); as 107 issues estão fechadas. O que falta está na
  seção 4 de `docs/proximos-passos.docx`: validar a QA-01 com o professor, a lacuna da RN-05, a RN-17
  sem teste nomeado e as pendências P1 a P9 de `docs/seguranca.md`.
- **Mudança nova segue o mesmo rito:** regra que muda altera a `spec.md` primeiro, com linha no
  histórico de versões; bug corrigido vira teste de regressão; a etapa vai para
  `docs/specs/registro-sdd.md` (a próxima é a 65), inclusive as premissas do agente.
- **Regra fundamental:** conflito entre código, Spec e modelagem nunca é resolvido em silêncio.
  Registra-se e escolhe-se: corrigir o código ou propor mudança na spec. A equipe autorizou atualizar
  a baseline (spec, ADRs, README, este arquivo) a cada ação; **decisões de mérito** exigem aprovação
  explícita. O padrão que funcionou: levantar as questões, recomendar uma decisão para cada uma e
  aplicar só depois do "aprovo".
- **Nomes:** regra é `RN-xx` (o roteiro diz "RB"). Invariantes de uma Spec são `INV-001` locais; fora
  dela, cite como "SPEC-002 INV-003" para não confundir com os `INV-01..14` da spec.
- **Issues:** `T-nn` é a issue `#nn+2`; #80–#108 são as SPEC-001..029. Trilhas: A (domínio e
  financeiro) com o gostislavs; B (transação) e C (acesso, admin e IA) com o 2dart5, o Duarte; o
  1Noriyuki (Enzo) revisa, mergeia e decide. `niltonmack` é o professor.
- **Fechar issue:** o PR precisa dizer `Closes #N`, e o critério é a Definition of Done inteira, não a
  aprovação do texto. Issue já foi fechada sem DoD duas vezes (etapas 32 e 62).
- **Aprovada não é concluída.** "Concluída" exige a tabela da §12 ligando cada CA e INV a um teste que
  existe e passa. Confira o **título** do teste, não só o ID: vários IDs propostos já nomeavam testes de
  outro assunto. Havendo colisão, use `T-SPECnnn-CAnn`; o `T-CONVENCAO-01` falha se dois testes
  dividirem um ID.
- **`docs/proximos-passos.docx`** é o documento de passagem para a equipe. É gerado com a lib `docx`
  instalada numa pasta temporária, nunca no projeto (ADR-001). Esta máquina não tem pandoc,
  LibreOffice nem pdftoppm: para conferir, exporte para PDF pelo Word via COM (PowerShell) e renderize
  as páginas com a API `Windows.Data.Pdf`. Títulos precisam de `keepNext`, senão ficam sozinhos no pé
  da página.

## Arquitetura

```
interface/http   traduz HTTP, autentica, autoriza, renderiza    (zero regra de negócio)
aplicacao        casos de uso UC-01..UC-14, orquestra, transaciona
dominio          regras puras RN-00..RN-33                      (sem banco, rede ou relógio real)
infra            SQLite, repositórios, LLM, auditoria, notificações
```

A fronteira mais importante: **`src/dominio/` não importa I/O**. Regra que precisa saber que horas
são recebe o tempo como parâmetro. É isso que torna as regras temporais testáveis.

Todo método de `aplicacao/` que muda estado segue a mesma ordem, e vale seguir ao adicionar um novo:
autoriza → valida no domínio → `assegurarTransicao` na máquina de estados → grava em transação →
registra auditoria e notifica. Nessa ordem, a máquina e a auditoria ficam na aplicação, não no
repositório. A auditoria leva o **ator real**: `atorId: null` significa "o sistema" (§9.2, OPEN-104) e
só vale para rotina temporal. A comissão passa por `aplicacao/comissao.js`, cujo `transicionar()`
exige o ator explícito.

Cálculo que a tela precisa mostrar é composto na **aplicação**, não na view: `horarios.detalhe()`
devolve o preço vigente *e* a projeção da régua (`projetarRegua`), e a interface só desenha. Se uma
tela começar a calcular, a regra vazou de camada.

**Rotinas temporais** (`aplicacao/rotinas.js`) rodam em intervalo no processo *e* são disparadas
antes de qualquer leitura sensível a tempo. Redundância proposital: o sistema fica correto mesmo se
o intervalo falhar.

## Camada HTTP e visual

- **Sem templates.** `interface/http/html.js` expõe a tag `html\`\`` que **escapa tudo que é
  interpolado**. Markup já montado passa por `cru()` — injeção de HTML é decisão explícita e visível
  na revisão.
- **Componentes compartilhados vivem em `views/layout.js`** — `cartaoDeVaga`, `reguaDeDesconto`,
  `blocoDePreco`, `vazio`, `notaDeRegra`, `selo`, `chip`, `estrelas`, `metrica`, `plural`. Antes de
  montar markup novo numa rota, veja se já existe: cartão de horário e régua aparecem em três telas
  cada e precisam contar a mesma história.
- **CSS e JS moram em strings JS** (`interface/http/estilo.js`, `interacoes.js`), servidos em
  `/estatico/`, porque não há etapa de build. Arquivos binários ficam em `public/` e são servidos em
  `/estatico/<nome>` com allowlist de extensão.
- **O JavaScript do cliente é só acabamento** — revelação ao rolar, cabeçalho, contadores, trava de
  clique duplo. Nenhuma funcionalidade pode depender dele; com JS bloqueado o site continua inteiro.
  Por isso a navegação no celular é uma trilha de abas rolável, e não um menu que precisa abrir.
- **O visual é um sistema de tokens**, no topo de `estilo.js`: cor, escala tipográfica, ritmo de
  espaçamento, raio e sombra. Tela que precisa de um valor novo ganha um token, não um número solto.
- **Marca:** `MARCA_SVG` (o "E de agenda"), `PALAVRA_SVG` (a palavra já em curvas) e `FAVICON` vivem
  em `views/layout.js`. A fonte do site inteiro é a Bricolage Grotesque, servida de
  `public/bricolage-grotesque.woff2` (ADR-006); nada vem de rede externa. Guia em
  `docs/identidade-visual/`.
- Como tudo é módulo JS carregado na inicialização, **alteração de CSS ou de tela exige reiniciar o
  servidor**. Daí o `npm run dev`.

## Armadilhas já encontradas na prática

- **Nem toda string com espaço é prosa.** Acentuar em massa quebrou duas coisas de uma vez: as
  chaves de `SINONIMOS` em `infra/llm/simulado.js` (comparadas via `semAcento()`, então
  `'saúde e bem-estar'` deixou de casar) e um `regiao('Butanta')` no seed. Antes de mexer em texto,
  separe o que é exibido do que é chave de busca — e rode o seed do zero para provar.
- **`db:reset` falha com `EPERM` se um servidor estiver rodando** e segurando `dados/encaixe.db`.
  Pare o `npm run dev` antes.
- **Ordem importa no CSS.** Regra sem especificidade extra colocada antes da declaração base perde
  para ela. Ajuste responsivo vai na seção responsiva, no fim do arquivo — não perto do token.
- **Tema escuro inverte a polaridade da marca.** `--primaria` clareia no escuro, então texto branco
  sobre ela cai para ~2,8:1. Texto sobre cor cheia usa `--sobre-primaria` / `--sobre-acento` /
  `--sobre-perigo`, que trocam de lado junto com o tema.
- **`vazio(texto)` escapa o que recebe.** Passar uma string com `<a>` renderiza a tag como texto na
  tela; use `vazio(html\`...\`)`. A assinatura completa é
  `vazio(texto, { titulo, acoes: [[href, rótulo]] })` — estado vazio sem ação é um beco.
- **`grade-2/3/4` usam `minmax(min(Xpx, 100%), 1fr)`.** O `min()` não é enfeite: sem ele a coluna
  fica mais larga que a viewport em 320 px e a página inteira rola para o lado.
- **Dentro de `.grade`, o espaço vem do `gap`.** Margem de irmão desalinha a linha: `.cartao + .cartao`
  descia o 2º e o 3º cartão 12 px, e o último `.campo` (sem margem) descia o botão. Por isso existem
  `.grade > .cartao + .cartao` e `.grade-campos`. Do mesmo jeito, `.preco` é flex: `text-align` não o
  move, e quem alinha é `justify-content`.
- **A Bricolage é mais larga que a fonte do sistema.** Texto novo pode quebrar mal em 320 px (a
  etiqueta do hero deixava "h" sozinho; resolvido com `&nbsp;`). Confira nessa largura.
- **Chrome headless não desce abaixo de 500 px de janela**: um print com `--window-size=320` é só um
  recorte. Para medir celular de verdade, use emulação de dispositivo pelo DevTools Protocol.
- **Git Bash converte argumentos que começam com `/` em caminhos do Windows** (`/buscar` vira
  `C:/Program Files/Git/buscar`). Use `MSYS_NO_PATHCONV=1` ao passar rotas para scripts.
- **Os arquivos são CRLF.** Buscar um trecho com `\n` no meio falha em silêncio, e `sed` quebra em
  linha com emoji (`docs/tasks.md`). Para edição programática, use Node e trate `\r\n`.
- **"Tudo verde" não é "toda regra coberta".** A RN-05 tem um teste só e não barra a edição da régua de
  um horário já reservado (o preço segue travado pela RN-04, mas a projeção muda); a RN-17 não aparece
  no nome de nenhum teste. A issue T-68 foi fechada com essas lacunas abertas.
- **Prazo é gravado quando o fato acontece.** P-01 na reserva; na confirmação, o prazo de conclusão
  automática (o maior entre P-17 e P-16b); P-14 e P-13 na conclusão. Prazo calculado na leitura com o
  parâmetro atual retroage em silêncio: foi o defeito da P-14 (etapa 32).
- **Mudança de estado de conta mexe em agendamentos.** Suspender um prestador expira as reservas
  pendentes dele, e conta que não está `ATIVO` não autoconfirma: sem isso, a rotina confirmava a reserva
  de um prestador suspenso (etapa 63).
- **PR empilhado não chega à `main`.** Se o PR B aponta para a branch do PR A e A é mergeado antes,
  B entra só na branch de A. Aconteceu com os #111–#113 (recuperados no #114). Abra todo PR contra a
  `main`, mesmo partindo da branch de outro.
- **SQLite não tem `ADD COLUMN IF NOT EXISTS`.** O `schema.sql` é reexecutado a cada início, então
  coluna nova em tabela existente precisa entrar também em `migrar()` (`infra/db/conexao.js`),
  checando `PRAGMA table_info` e preenchendo as linhas antigas. Exemplo: `usuario.reputacao_inicial`.
- **Invariante de estado inicial não cabe em `CHECK`**, porque o estado muda depois. Use gatilho
  `BEFORE INSERT`, como `usuario_nasce_no_estado_inicial` (SPEC-002 INV-004).
- **Normalização de entrada mora num lugar só.** O e-mail era minusculizado na busca e aparado na
  gravação, e um repetido com espaços estourava `UNIQUE`. Hoje é `normalizarEmail()` no repositório.

## Testes

O nome do teste carrega o identificador da regra que ele protege:

```
T-CANCEL-04i | RN-19: o prestador cancelando na mesma faixa perde mais
```

Isso torna a rastreabilidade spec → código → teste verificável por `grep`, e faz a saída do
`npm test` funcionar como leitura das regras. Mantenha a convenção. Bug corrigido vira teste de
regressão.

Duas ferramentas tornam a suíte possível, ambas em `tests/apoio/cenario.js`:
**banco em memória** recriado por teste (`prepararBanco()`) e **relógio controlado**
(`viajarPara()`, `avancarHoras()`) — metade das regras depende de "quanto falta". O provedor de LLM
também é injetável, o que permite testar confiança baixa, timeout e formato quebrado.

A interface também é testada: `integracao/http.test.js` (autenticação, autorização, CSRF, escape) e
`integracao/vitrine.test.js` (o que a tela do horário mostra) sobem um servidor real em porta
efêmera. Mudança de texto exibido pode quebrar asserção — atualize o teste, não o esconda.

## Documentação

| Arquivo | Para quê |
|---|---|
| `docs/spec.md` | fonte de verdade (v0.1.11): personas, requisitos EARS, regras §6, invariantes §9.8 |
| `.specify/memory/constitution.md` | os dez princípios que governam o repositório |
| `docs/adr/` | decisões técnicas: stack, modelo de dados, uso de LLM, autenticação, escopo financeiro, fonte da marca |
| `docs/specs/` | roteiro SDD: `mapa-de-specs.md` (29 Specs e todas as `OPEN-XX`), `SPEC-NNN-*.md`, `layouts/` e `registro-sdd.md` (diário de cada etapa) |
| `docs/proximos-passos.docx` | passagem para a equipe: estado, ciclo das Specs, divisão das issues |
| `docs/identidade-visual/` | guia de marca, SVGs da logo e licença OFL da fonte |
| `docs/plan.md`, `docs/tasks.md` | arquitetura e tarefas; no `tasks.md`, 🔄 = implementado antes das Specs e ainda sem evidência |
| `docs/testes.md` | estratégia de testes e evidências |
| `docs/seguranca.md` | modelo de ameaças e controles |
| `docs/review/` | revisão multidimensional periódica, com achados e ações |
| `docs/imagem-hero.md` | briefing da foto do hero, recorte no celular e `og:image` |

## Configuração

| Variável | Padrão | Serve para |
|---|---|---|
| `PORT` / `HOST` | `3000` / `127.0.0.1` | endereço do servidor |
| `DB_PATH` | `dados/encaixe.db` | arquivo SQLite |
| `LLM_PROVIDER` | `simulado` | `simulado` (sem rede) ou `anthropic` |
| `LLM_MODELO` | `claude-opus-5` | modelo usado pelo provedor real |
| `LLM_TIMEOUT_MS` | `15000` | teto da espera pela interpretação (RNF-05) |
| `ANTHROPIC_API_KEY` | — | só com `LLM_PROVIDER=anthropic` |
| `ROTINAS_INTERVALO_MS` | `60000` | intervalo das rotinas temporais |
| `CONTATO_SUPORTE` | `suporte@encaixe.dev` | e-mail mostrado à conta suspensa (RF-004) |
