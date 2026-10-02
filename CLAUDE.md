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
npm test             # suíte completa (node --test), 141 testes, ~3 s
npm run db:seed      # cria o banco e popula demonstração
npm run db:reset     # apaga dados/encaixe.db e recomeça do zero
```

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
| `docs/spec.md` | fonte de verdade: personas, requisitos EARS, regras §6, invariantes §9.8 |
| `.specify/memory/constitution.md` | os dez princípios que governam o repositório |
| `docs/adr/` | decisões técnicas: stack, modelo de dados, uso de LLM, autenticação, escopo financeiro, fonte da marca |
| `docs/identidade-visual/` | guia de marca e SVGs da logo (símbolo "E de agenda" com a peça laranja); cores = tokens de `estilo.js`. Aplicada no site: `MARCA_SVG`, `PALAVRA_SVG` e `FAVICON` em `views/layout.js`. A palavra "encaixe" está em curvas (Bricolage Grotesque 700). O site inteiro usa a Bricolage, servida de `public/bricolage-grotesque.woff2` (ADR-006); a fonte do sistema fica só como reserva |
| `docs/specs/` | roteiro SDD: `mapa-de-specs.md`, `SPEC-NNN-*.md` e `registro-sdd.md` (diário de toda etapa, atualizado a cada ação) |
| `docs/plan.md`, `docs/tasks.md` | arquitetura e quebra em tarefas |
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
