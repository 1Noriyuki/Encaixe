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
npm test             # suíte completa (node --test), 205 testes, ~5 s
npm run db:seed      # cria o banco e popula demonstração
npm run db:migrar    # cria as 21 tabelas fisicas (idempotente, com backfill RN-00)
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

## Processo SDD (em andamento)

O projeto segue o roteiro de Spec-Driven Development do professor: **mapa de Specs aprovado → uma
Spec por vez, aprovada antes de implementar**. Tudo vive em `docs/specs/`.

- **O código veio antes das Specs.** O trabalho agora é, Spec por Spec, conferir o código existente
  contra os critérios de aceitação, registrar divergências e corrigir (OPEN-01, decidida em
  2026-10-08).
- **Regra fundamental do roteiro:** conflito entre código, Spec e modelagem nunca é resolvido em
  silêncio. Registra-se e escolhe-se: corrigir o código ou propor mudança na spec.
- **Toda etapa é registrada em `docs/specs/registro-sdd.md`**, inclusive premissas do agente. A
  equipe autorizou atualizar a baseline (spec com versão e histórico, ADRs, plan, README, este
  arquivo) a cada ação; **decisões de mérito** (`OPEN-XX`, recomendações) exigem aprovação explícita.
- **Nomes:** o roteiro chama regra de "RB"; aqui continua `RN-xx`. Invariantes de uma Spec são
  `INV-001` locais; fora dela, cite como "SPEC-002 INV-003" para não confundir com os `INV-01..14`.
- **Issues:** `T-nn` é a issue `#nn+2`; #79 foram as decisões OPEN-01/02/210; #80–#108 são as SPEC-001..029.
  Divididas por trilha do `tasks.md` (`niltonmack` é o professor). Em 2026-10-18 o 2dart5 assumiu
  também a Trilha C (etapa 18 do registro):

  | Trilha | Responsável | Specs abertas |
  |---|---|---|
  | A: domínio e financeiro | gostislavs | SPEC-001, 006–009, 011, 020, 021, 024, 026 |
  | B: transação e consequência | 2dart5 | SPEC-010, 012–019, 022, 023 |
  | C: acesso, admin e IA | 2dart5 (era 1Noriyuki até a SPEC-002 e a #79) | SPEC-003–005, 025, 027–029 |

  `docs/proximos-passos.docx` é o documento de passagem (reescrito em 2026-10-20, etapa 23).
- **Estado em 2026-10-20:** mapa e SPEC-001 a SPEC-005 aprovados (as três últimas na etapa 21); a #81
  (SPEC-002) está fechada. Próximo: o 2dart5 confere o código contra as SPEC-003 a 005, e a próxima
  Spec a gerar é a SPEC-006. As OPEN da SPEC-001 foram decididas na etapa 22 (spec v0.1.7); o código
  ainda deve as oito correções listadas em `docs/specs/propostas-decisoes-trilha-a.md`. PRs empilhados não chegam à `main` se o da base for mergeado antes: foi o que
  aconteceu com os #111–#113, recuperados no #114.
- **SPEC-002 conferida e corrigida** (etapa 15): `SUSPENSO` não entra (mensagem própria, RN-28) e a
  suspensão apaga as sessões; os demais estados entram; a sessão expira com 2 h sem uso ou 12 h desde
  o login (`expira_em` é o prazo deslizante, regravado só quando anda 1 min ou mais). Testes em `integracao/contas-sessao.test.js`.
- **Depois do cadastro a conta já sai logada** (OPEN-210, spec v0.1.6): o prestador pendente prepara
  perfil, serviços e régua, mas só publica quando estiver `ATIVO` (RN-08).

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
registra auditoria e notifica.

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
- **A Bricolage é mais larga que a fonte do sistema.** Texto novo pode quebrar mal em 320 px (a
  etiqueta do hero deixava "h" sozinho; resolvido com `&nbsp;`). Confira nessa largura.
- **Chrome headless não desce abaixo de 500 px de janela**: um print com `--window-size=320` é só um
  recorte. Para medir celular de verdade, use emulação de dispositivo pelo DevTools Protocol.
- **Git Bash converte argumentos que começam com `/` em caminhos do Windows** (`/buscar` vira
  `C:/Program Files/Git/buscar`). Use `MSYS_NO_PATHCONV=1` ao passar rotas para scripts.
- **Os arquivos são CRLF.** Buscar um trecho com `\n` no meio falha em silêncio, e `sed` quebra em
  linha com emoji (`docs/tasks.md`). Para edição programática, use Node e trate `\r\n`.
- **Cinco regras ainda não têm teste nomeado** (RN-00, RN-05, RN-08, RN-11, RN-33; issue
  T-68). "Tudo verde" não significa "toda regra coberta".

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
| `docs/spec.md` | fonte de verdade (v0.1.7): personas, requisitos EARS, regras §6, invariantes §9.8 |
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
