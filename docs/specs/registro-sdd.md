# Registro do processo SDD — Encaixe

> Diário das etapas do roteiro de Spec-Driven Development (*Prompt de apoio para SDD*), em ordem
> cronológica. Cada etapa registra o que foi pedido, o que foi produzido, o que foi decidido e por quem,
> e o que ficou pendente. **Toda etapa nova é registrada aqui no mesmo momento em que é feita.**

| Campo | Valor |
|---|---|
| Início | 2026-10-01 |
| Roteiro seguido | `Prompt_SDD_Specs.pdf` (3 páginas: prompt de decomposição, prompt de Spec individual, regra fundamental) |
| Baseline | `docs/spec.md` v0.1.6 · `docs/plan.md` v1.0.0 · ADR-001 a ADR-006 (ADR-004 revisado) · constituição |
| Autorização vigente | A equipe autorizou (etapa 7) atualizar a baseline sempre que uma ação for realizada no projeto. **Decisões de mérito** (`OPEN-XX`, reordenação, recomendações) continuam exigindo aprovação explícita |

---

## Estado atual (resumo)

| Item | Situação |
|---|---|
| Mapa de Specs | **Aprovado** (v1.0.0, etapa 11), na ordem original |
| SPEC-001 Fundação | **Concluída** (v1.2.0, etapa 28): aprovada na etapa 11, decisões na 22, código conferido e com teste para todos os CA, INV e RNF. Issues #80 e #9 fechadas |
| SPEC-002 Cadastro e autenticação | **Aprovada**; v1.2.0 com as decisões das OPEN-12/202/203 (etapa 12) e OPEN-01/02/210 (etapa 14). **Código conferido e corrigido** (etapa 15): CA-01 a CA-12 com teste |
| SPEC-003 Autorização por perfil e titularidade | **Aprovada** (v1.0.0, etapa 21) em [`SPEC-003-autorizacao-por-perfil-e-titularidade.md`](SPEC-003-autorizacao-por-perfil-e-titularidade.md); questões da §13 seguem abertas |
| SPEC-004 Notificações por evento e central do usuário | **Aprovada** (v1.0.0, etapa 21) em [`SPEC-004-notificacoes-por-evento-e-central-do-usuario.md`](SPEC-004-notificacoes-por-evento-e-central-do-usuario.md); questões da §13 seguem abertas |
| SPEC-005 Aprovação e reprovação de prestador | **Aprovada** (v1.0.0, etapa 21) em [`SPEC-005-aprovacao-e-reprovacao-de-prestador.md`](SPEC-005-aprovacao-e-reprovacao-de-prestador.md); questões da §13 seguem abertas |
| SPEC-006 a 009, 011, 020, 021, 024 e 026 | **Rascunhos, não aprovados** (etapa 27). Na `main` pelos PRs #122, #126 e #127; o merge não aprova. Aprovação pela equipe, uma Spec por vez |
| Próxima etapa | Conferir o código contra as SPEC-003, 004 e 005 (Trilha C, 2dart5). Trilha A: levar a SPEC-006 (rascunho) à aprovação |
| Layout da SPEC-002 | 8 telas de celular, [canvas](https://claude.ai/artifact/RNxkqRrx1kn9TQ3F8wuZrW) e fontes em `docs/specs/layouts/SPEC-002/`; **aprovado** (etapa 23); canal de contato definido na etapa 25 |
| Layout da SPEC-001 | Não se aplica: a Fundação não tem tela (SPEC-001 §8) |
| Identidade visual | **Aprovada e aplicada no site** (etapa 10). [Guia](https://claude.ai/artifact/5Nzrg1ZKrp2H8EREk4p9YX) e arquivos em `docs/identidade-visual/` |
| Código (`src/interface/http/`, `public/`) | Marca nova (etapa 10) e fonte da marca no site inteiro (etapa 11). Suíte: 235/235 na etapa 28 |
| Baseline (`spec.md`, ADRs) | `docs/spec.md` v0.1.9; histórico das alterações nas etapas 7, 12, 14, 22, 24 e 25 |
| Código (`src/`, `tests/`) | Commitado na branch (`a653fa7`). Conferido Spec por Spec contra as Specs aprovadas e corrigido onde diverge (OPEN-01, etapa 14) |
| Commits do processo SDD | Na `main`: branch SDD pelo PR #109, Trilha A pelos PRs #110 e #114 (etapa 20); SPEC-003 a 005 vindas da branch `specs-duarte` (etapa 21) |
| Issues no GitHub | 59 fechadas, 48 abertas em 2026-10-20 (gostislavs 18, 2dart5 30, porque assumiu também a Trilha C); #79 decisões, #80–#108 uma por Spec (etapas 13 e 20) |
| Documento de passagem | `docs/proximos-passos.docx`, reescrito com o estado de 2026-10-22 (etapa 28) |

### Decisões humanas pendentes

| ID | Assunto | Onde |
|---|---|---|
| ~~OPEN-01~~ | resolvida na etapa 14 e ratificada pela Trilha C em 2026-10-18: conferir o código Spec por Spec e corrigir onde diverge | mapa §3, etapas 14 e 18 |
| OPEN-04 | ~~Spec §13 desatualizada~~ resolvida na v0.1.4 (QA-10 segue aberta) | mapa §3 |
| ~~OPEN-02~~ | resolvida na etapa 14 e ratificada pela Trilha C em 2026-10-18: mantém `RN-xx`; `INV-001` local | mapa §3, etapas 14 e 18 |
| ~~OPEN-12~~ | resolvida na etapa 12: 2 h de inatividade, teto de 12 h | ADR-004 |
| ~~OPEN-202~~ | resolvida na etapa 12: todos autenticam, exceto `SUSPENSO` | spec v0.1.5 |
| ~~OPEN-203~~ | resolvida na etapa 12: suspensa não autentica, mensagem própria | spec v0.1.5 |
| ~~Divergências da SPEC-002 no código~~ | corrigidas na etapa 15 | etapa 15 |
| ~~INV-004 no banco~~ | resolvido na etapa 24: gatilho `BEFORE INSERT` | etapas 15 e 24 |
| ~~Reordenação~~ | decidida na etapa 11: não reordenar | etapa 11 |
| ~~OPEN-210~~ | resolvida na etapa 14 e ratificada pela Trilha C em 2026-10-18: a conta sai logada do cadastro | spec v0.1.6, etapas 14 e 18 |
| ~~Layout~~ | aprovado na etapa 23; canal de contato da conta suspensa definido na etapa 25 | etapas 8, 23 e 25 |
| ~~Identidade visual~~ | aprovada na etapa 10; resta só trocar a arte do `og.jpg` (opcional) | etapa 10 |
| Demais OPEN | Questões ainda em aberto nas Specs e no mapa | arquivos respectivos |

### Premissas adotadas pelo agente, ainda sem confirmação humana

| # | Premissa | Por quê | Onde aparece |
|---|---|---|---|
| ~~PA-01~~ | ~~O pedido "Gerar SPEC-001" foi tratado como aprovação do mapa~~ **confirmada**: mapa aprovado explicitamente na etapa 11 | o roteiro só permite gerar Specs depois da aprovação do mapa | status do mapa |
| ~~PA-02~~ **confirmada** (OPEN-02, etapa 14) | Os IDs da baseline foram mantidos (`RN-xx` como "RB") | evitar renumerar 34 regras sem decisão (OPEN-02) | mapa, todas as Specs |
| ~~PA-03~~ **confirmada** (OPEN-02, etapa 14) | Os invariantes de cada Spec usam numeração local `INV-001`, citando o `INV-xx` global coberto | o roteiro pede `INV-001`; a baseline já usa `INV-01..14` | SPEC-001 §6, SPEC-002 §6 |
| PA-04 | Os "drivers arquiteturais" foram lidos como as restrições do enunciado (spec §1.5) mais os princípios da constituição | a baseline não tem seção formal de drivers (OPEN-03) | mapa, todas as Specs |
| PA-05 | Os nomes de teste propostos seguem a convenção do projeto, com sufixos para não colidir (`T-CONTA-01a`) | os IDs `T-CONTA-01..04` já estão reservados na matriz da spec §11 | SPEC-002 §12 |
| ~~PA-07~~ **confirmada** (etapa 23) | Faixa da P-22: metade ao dobro do padrão, mesmo sinal, prestador nunca abaixo do cliente na mesma faixa | a decisão E da etapa 22 tornou os deltas parâmetros sem fixar a faixa | spec §6.1 |
| PA-06 | `niltonmack` é o professor, não integrante, e ficou fora da distribuição de issues | sem nome nem atividade no repositório; a spec §15 prevê o professor como colaborador | issues do GitHub, etapa 13 |

---

## Etapas

### Etapa 1 — Recebimento do roteiro e verificação de conformidade · 2026-10-01

- **Pedido:** verificar se o projeto segue o documento recebido e alinhar o que não seguir.
- **Feito:** leitura do PDF e de toda a baseline (spec, plan, constituição, 5 ADRs, tasks, testes, segurança, revisão multidimensional, README).
- **Constatação:** o projeto **não** seguiu o fluxo do roteiro. A implementação existe inteira antes de qualquer Spec, e não havia mapa de Specs.
- **Decisão do agente:** não alterar código nem baseline nesta etapa, porque o roteiro proíbe ("Não implemente código nesta etapa", "não altere silenciosamente"). A primeira entrega exigida é o mapa.

### Etapa 2 — Mapa ordenado de Specs · 2026-10-01

- **Produzido:** [`mapa-de-specs.md`](mapa-de-specs.md).
  - Análise da baseline nos 7 pontos pedidos pelo roteiro.
  - 29 Specs ordenadas por dependência, cada uma com todos os campos pedidos.
  - 21 itens `OPEN-XX` com as inconsistências e lacunas encontradas.
- **Parada obrigatória:** cumprida. O mapa terminou aguardando aprovação.

### Etapa 3 — SPEC-001 · 2026-10-01

- **Pedido:** "Gerar SPEC-001".
- **Produzido:** [`SPEC-001-fundacao.md`](SPEC-001-fundacao.md). Cobre parâmetros, máquinas de estado e auditoria de transição: 11 critérios de aceitação, 7 invariantes, 14 testes derivados e 5 questões novas (OPEN-101 a 105).
- **Alteração em outro arquivo:** status do mapa passou a "aprovado para geração" (PA-01).

### Etapa 4 — SPEC-002 · 2026-10-01

- **Pedido:** "Gerar SPEC-002".
- **Produzido:** [`SPEC-002-cadastro-e-autenticacao.md`](SPEC-002-cadastro-e-autenticacao.md). Cobre cadastro, login, sessão e logout: 10 critérios de aceitação, 9 invariantes, 14 testes derivados e 9 questões novas (OPEN-201 a 209).
- **Destaque:** a OPEN-207 aponta uma contradição na spec. O INV-08 diz que a reputação é a soma dos eventos, mas a conta nova começa em P-08 sem nenhum evento.

### Etapa 5 — Recomendações para OPEN-12, OPEN-202 e OPEN-203 · 2026-10-01

- **Pedido:** recomendações para as três decisões que travam CA-08 e CA-09 da SPEC-002.
- **Recomendado (aguardando aprovação):**
  - **OPEN-203:** conta suspensa não autentica (RF-004). Com senha correta, mostrar mensagem específica; suspender apaga as sessões abertas. Mudança na RN-28.
  - **OPEN-202:** todos os estados autenticam, exceto `SUSPENSO`. Argumento: a central de notificações é o único canal do MVP, então reprovado e pendente precisam entrar para ler os avisos (RF-008, RF-009). O que cada estado pode fazer fica na autorização.
  - **OPEN-12:** expiração por inatividade com teto absoluto de 12 h. O valor de inatividade fica com a equipe (2 h sugeridas como ponto de partida) e seria registrado numa revisão do ADR-004.
- **Nada aplicado.** As mudanças propostas (spec v0.1.4, ADR-004, SPEC-002) dependem de aprovação.

### Etapa 6 — Pedido de reordenação: login como SPEC-001 · 2026-10-01

- **Pedido:** "Spec 1 vai ser login".
- **Conflito identificado:** o roteiro exige que uma Spec posterior não dependa de comportamento ainda não estabelecido. A SPEC-002 atual (login) depende da SPEC-001 atual em três pontos: P-08 (reputação inicial), a máquina de estados de `Usuario` e a auditoria da criação de conta. Só inverter os números quebraria essa regra.
- **Situação:** aguardando a escolha da equipe sobre como reordenar (opções apresentadas na conversa). Nada foi renumerado ainda.
- **Também nesta etapa:** criado este registro, a pedido da equipe.

### Etapa 7 — Autorização para manter a baseline atualizada · 2026-10-01

- **Pedido:** "autorização para atualizar o baseline sempre que alguma ação for realizada no projeto".
- **Interpretação registrada:** a autorização cobre manter a baseline coerente com o que já foi feito ou decidido. Ela não substitui a aprovação humana das decisões que o roteiro reserva à equipe.
- **Alterações feitas:**

| Arquivo | Alteração |
|---|---|
| `docs/spec.md` | v0.1.3 → **v0.1.4**, com entrada no histórico; `docs/specs/` incluído nos documentos derivados; §13 ganhou a coluna "Situação" (QA-02 a 05 e QA-08 resolvidas pelos ADRs e pelo plano já aceitos; QA-01, 06, 07, 09 e 10 abertas, com remissão aos `OPEN-XX`); §15 reescrita com o fluxo SDD |
| `.specify/memory/constitution.md` | fluxo de trabalho ganhou a etapa `specs/` (mapa → Spec aprovada → implementação), a obrigação do registro e a regra fundamental do roteiro |
| `docs/plan.md` | spec de referência v0.1.4; `docs/specs/` na árvore de pastas |
| `README.md` | linha de `docs/specs/` na tabela de documentação |
| `CLAUDE.md` | linha de `docs/specs/` na tabela de documentação |
| `docs/specs/mapa-de-specs.md` | OPEN-04 marcada como resolvida |

- **Não alterado, de propósito:**
  - `docs/tasks.md` marca as 76 tarefas como concluídas, o que contradiz o fluxo SDD. Depende da OPEN-01.
  - Nenhuma regra RN, requisito RF/RNF, estado ou invariante foi mexido.
  - As três recomendações da etapa 5 e a reordenação da etapa 6 continuam aguardando aprovação.

### Etapa 8 — Layout das telas da SPEC-001 e da SPEC-002 · 2026-10-01

- **Pedido:** "criar as telas mesmo, layout da spec 1 e 2".
- **SPEC-001:** sem tela. A própria Spec atribui zero responsabilidade de frontend à Fundação; as telas de parâmetros e auditoria são das SPEC-027 e SPEC-029.
- **SPEC-002 — produzido:** canvas com 8 telas de celular (390 px): Entrar, credencial inválida, conta suspensa, Criar conta, campos inválidos, prestador aguardando aprovação, saiu da conta e sessão expirada.
  - Link: https://claude.ai/artifact/RNxkqRrx1kn9TQ3F8wuZrW (privado; só abre para quem receber o compartilhamento pelo menu Share).
  - Fontes versionadas em `docs/specs/layouts/SPEC-002/`.
- **Critérios usados:** cada tela aponta para os critérios de aceitação da SPEC-002 (tabela na §8.1 dela). Cores e tipografia vêm dos tokens de `src/interface/http/estilo.js`. Só elementos nativos de formulário, funcionando sem JavaScript (CLAUDE.md).
- **Marcado como proposta:** a tela de conta suspensa (OPEN-203) e a de sessão expirada (OPEN-12) desenham as recomendações da etapa 5, que ainda não foram aprovadas. Dados que a baseline não define aparecem como `[CANAL DE CONTATO]` e `[TEMPO DE INATIVIDADE]`.
- **Divergência encontrada ao comparar com as telas já implementadas** (registrada como OPEN-210 na SPEC-002):
  - o código autentica a conta logo depois do cadastro e deixa o prestador pendente cadastrar serviços e régua antes da aprovação;
  - o cadastro do código pede telefone, região e nome do negócio, campos que a RF-001 não exige.
- **Baseline atualizada:** SPEC-002 v0.1.0 → v0.1.1 (link do layout, §8.1, OPEN-210).
- **Não alterado:** código. O layout não substitui as telas existentes até a Spec e o layout serem aprovados e a OPEN-01 ser decidida.

### Etapa 9 — Identidade visual e logo · 2026-10-01

- **Pedido:** "crie uma identidade visual para o Encaixe e crie uma logo também".
- **Decisão de partida do agente:** evoluir o que já existe em vez de começar do zero. As cores são exatamente os tokens de `src/interface/http/estilo.js` (já usados nas telas e no tema escuro), e o símbolo continua o "E" que o cabeçalho do site já mostra. Assim a marca não contradiz o código nem o layout da etapa 8.
- **Produzido** em `docs/identidade-visual/`:

| Arquivo | Conteúdo |
|---|---|
| `logo-simbolo.svg` | símbolo: um E de três faixas de agenda; a do meio, laranja e solta da coluna, é o horário vago entrando no lugar |
| `logo-icone-app.svg` | ícone de app/favicon, fundo índigo forte (o laranja sobre o índigo padrão ficava em 2,7:1) |
| `logo-horizontal.svg` | símbolo + palavra "encaixe" |
| `guia-de-marca.html` | guia completo, [publicado aqui](https://claude.ai/artifact/5Nzrg1ZKrp2H8EREk4p9YX) |

- **O guia tem nove seções:** conceito e construção do símbolo, versões, área de proteção e tamanho mínimo, paleta com contraste medido, tipografia, elementos próprios (selo de regra e preço que cai), usos incorretos, voz e pendências.
- **Tipografia proposta:**
  - Bricolage Grotesque só para a marca e a divulgação;
  - fonte do sistema no produto, mantendo o ADR-001 (roda sem rede);
  - monoespaçada exclusiva para os identificadores de regra.
- **Pendências registradas no próprio guia:**
  - ID-01: aplicar a marca no site (cabeçalho, favicon, `og.jpg`). Mexe em código e depende da aprovação e da OPEN-01.
  - ID-02: usar ou não a fonte de marca no produto. Hospedá-la exigiria revisar o ADR-001.
  - ID-03: converter a palavra da logo horizontal em curvas.
- **Baseline atualizada:** README, CLAUDE.md e `plan.md` (árvore de pastas) passam a citar `docs/identidade-visual/`.
- **Não alterado:** código e o canvas de telas da etapa 8, que ainda mostra o "E" antigo. Isso será atualizado se a logo for aprovada.

### Etapa 10 — Aprovação e aplicação da identidade visual no site · 2026-10-01

- **Pedido:** aprovar as pendências ID-01 a ID-03 e implementar a identidade no site.
- **Correção de um erro do agente:** o guia da etapa 9 dizia que o cabeçalho do site usava um "E" digitado. Estava errado: o site já tinha um símbolo desenhado (uma peça em L com um bloco no vão). O engano veio do protótipo de telas da etapa 8. O guia foi corrigido.
- **Decisões registradas:**
  - **ID-01 aprovada:** marca aplicada no cabeçalho, no rodapé e no favicon. O `og.jpg` continua sendo a foto do hero, porque trocá-lo exige produzir uma imagem e não houve editor de imagem nesta etapa.
  - **ID-02 decidida:** o produto continua na fonte do sistema e o **ADR-001 não muda**. A Bricolage Grotesque só aparece dentro da logo, em curvas.
  - **ID-03 resolvida:** a palavra convertida em curvas a partir da Bricolage Grotesque 700 (OFL). A conversão foi feita uma única vez com `opentype.js`, instalado em pasta temporária, fora do projeto. Nenhuma dependência entrou no `package.json`.
- **Código alterado** (primeira mudança de código desde o início do processo SDD):

| Arquivo | Mudança |
|---|---|
| `src/interface/http/views/layout.js` | `MARCA_SVG` com o símbolo novo (cores pelos tokens, acompanha o tema escuro); nova `PALAVRA_SVG` (palavra em curvas); `FAVICON` com o ícone de app; cabeçalho e rodapé com `aria-label` "Encaixe" no lugar do texto |
| `src/interface/http/estilo.js` | tamanho do símbolo e da palavra; animação da peça desliza na horizontal até a folga do E, e continua desligada com `prefers-reduced-motion` |

- **Verificação:**
  - `npm test`: 141/141 aprovados, antes e depois da correção abaixo.
  - Print do `/entrar` com servidor em porta de teste e banco temporário, nos temas claro e escuro, no desktop e no celular.
- **Bug encontrado e corrigido na própria etapa:** na primeira tentativa a palavra não aparecia. O script de edição usava `Q` como marcador provisório e trocou também os comandos `Q` (curvas) do desenho. A linha foi regravada e o print confirmou a correção.
- **Baseline atualizada:** guia de marca v1.0 republicado; CLAUDE.md e README descrevem a marca como aplicada.
- **Fora desta etapa:** o canvas de telas da SPEC-002 (etapa 8) ainda desenha a marca antiga no cabeçalho. Nada foi commitado.

### Etapa 11 — Aprovações da equipe e fonte da marca no site inteiro · 2026-10-01

- **Decisões da equipe:**

| Decisão | Efeito |
|---|---|
| Mapa de Specs aprovado | mapa v1.0.0; PA-01 confirmada |
| SPEC-001 aprovada | v1.0.0; as OPEN da seção 13 continuam abertas |
| SPEC-002 aprovada | v1.0.0; OPEN-12, 202, 203 e 210 continuam abertas e travam CA-08 e CA-09 |
| Não reordenar | etapa 6 encerrada; login continua sendo a SPEC-002 |
| Fonte da marca no site todo, "se viável" | avaliada viável e aplicada (abaixo) |

- **Avaliação de viabilidade:**
  - o servidor já aceitava `.woff2` em `public/`;
  - a licença OFL permite redistribuir;
  - um arquivo de fonte é dado, não dependência, então o ADR-001 (zero dependências, roda sem rede) continua de pé.
  - Decisão registrada no **ADR-006** (novo).
- **Código alterado:**

| Arquivo | Mudança |
|---|---|
| `public/bricolage-grotesque.woff2` | novo: fonte variável 400–800, eixo óptico, subconjunto latino, 77 KB |
| `src/interface/http/estilo.js` | `@font-face` no topo; `--fonte` começa pela Bricolage, com a pilha do sistema como reserva |
| `src/interface/http/views/layout.js` | `<link rel="preload">` da fonte |
| `src/interface/http/rotas/publicas.js` | espaço inseparável em "72&nbsp;h": com a fonte mais larga, a etiqueta do hero deixava o "h" sozinho em 320 px |

- **Verificação:**
  - `npm test`: 141/141.
  - Servidor em porta de teste com banco temporário populado pelo seed (o `dados/encaixe.db` da equipe não foi tocado).
  - Prints no desktop, nos temas claro e escuro.
  - Emulação de celular via DevTools Protocol a 320 e 390 px em seis rotas: nenhuma rolagem horizontal e a fonte carregada em todas.
  - O Chrome headless comum não desce abaixo de 500 px de janela. O primeiro print de 320 px era só um recorte e foi descartado.
- **Documentação:**
  - **ADR-006** (novo).
  - **`public/LEIAME.md`:** linha da fonte.
  - **Licença:** `docs/identidade-visual/OFL-bricolage-grotesque.txt`.
  - **Guia de marca:** tipografia e ID-02 atualizadas, republicado.
  - **`plan.md`:** ADR-006 e tipografia.
  - **README e CLAUDE.md.**
  - **Status:** mapa, SPEC-001 e SPEC-002 marcados como aprovados.
- **Efeito colateral aceito:** no primeiro acesso a página aparece na fonte do sistema e troca quando a Bricolage chega (`font-display: swap`). Está descrito no ADR-006.

### Etapa 12 — Aprovação das recomendações da etapa 5 · 2026-10-01

- **Pedido:** "você tem meu sim para as pendências restantes", e recomendações para a OPEN-01 e a OPEN-02.
- **Escopo do sim, como registrado:** as três recomendações que aguardavam aprovação (etapa 5), com o tempo de inatividade sugerido de 2 h. A OPEN-210 não estava entre elas, porque não tinha recomendação; ela recebeu uma nesta etapa e segue aberta.
- **Decisões aplicadas:**

| OPEN | Decisão | Onde ficou |
|---|---|---|
| OPEN-203 | conta `SUSPENSO` não autentica; com a senha certa recebe mensagem própria; a suspensão encerra as sessões | spec v0.1.5 (RN-28, RF-004), ADR-004, SPEC-002 CA-08 |
| OPEN-202 | todos os estados autenticam, exceto `SUSPENSO` | spec v0.1.5 (RF-004), ADR-004, SPEC-002 CA-11 (novo) |
| OPEN-12 | 2 h sem uso expiram a sessão; teto de 12 h desde o login | spec v0.1.5 (RNF-02), ADR-004 (revisão), SPEC-002 CA-09a/b/c |

- **Baseline atualizada:**
  - `docs/spec.md` v0.1.4 → **v0.1.5**, com histórico.
  - **ADR-004** ganhou uma seção de revisão.
  - **SPEC-002** v1.0.0 → **v1.1.0**: fluxos 5.2 e 5.3, critérios, testes derivados e OPEN marcadas como resolvidas.
  - **Canvas de telas:** "2 horas" no lugar do marcador e rótulos de "proposta" retirados; cópia em `docs/specs/layouts/SPEC-002/` atualizada.
- **Divergências encontradas no código existente** (análise contra a SPEC-002 v1.1.0):

| Onde | O código faz | A Spec exige |
|---|---|---|
| `src/aplicacao/contas.js` `autenticar()` | deixa conta `SUSPENSO` entrar | recusar com mensagem própria (CA-08) |
| `src/aplicacao/contas.js` `autenticar()` | bloqueia `REPROVADO` | autenticar (CA-11) |
| `src/interface/http/sessao.js` | expiração fixa de 12 h | 2 h de inatividade + teto de 12 h (CA-09a/b/c) |
| `src/dominio/estados.js` | já tem `ATIVO/RESTRITO/PENDENTE → SUSPENSO` e `EM_REVISAO → RESTRITO`, que a spec §9.6 não desenha | relacionado à OPEN-08, ainda aberta |

- **Não corrigido ainda:** pela regra fundamental do roteiro, cada divergência precisa de uma ação. A correção do código depende da OPEN-01, que define como o código existente será tratado.
- **Recomendações entregues** (aguardando decisão, issue #79):
  - **OPEN-01:** manter o código e conferi-lo Spec por Spec.
  - **OPEN-02:** manter `RN-xx`; `INV-001` local citado como "SPEC-00X INV-00Y".
  - **OPEN-210:** a conta sai logada do cadastro; o prestador pendente prepara o catálogo antes da aprovação.

### Etapa 13 — Encerramento do dia: commits, issues e documento de passagem · 2026-10-01

- **Pedido:**
  - documento .docx com os próximos passos e recomendações para os integrantes;
  - commitar tudo e dar push;
  - fechar as issues já resolvidas e distribuir igualmente as que faltam entre os três integrantes.
- **Commits e push:**
  - Branch nova `sdd/especificacao-e-identidade`. As instruções do ambiente pedem branch quando se está na `main`, e a constituição (princípio X) pede branch própria e revisão antes do merge.
  - Commits:
    - `a653fa7`: código anterior às Specs;
    - `36af8ed`: identidade visual;
    - `a47b9bb`: documentação SDD;
    - mais o commit desta etapa.
  - **O merge na `main` ficou para a equipe**, depois da revisão de outro integrante.
- **Análise das issues:** as 74 abertas (T-01 a T-76) foram cruzadas com o código e com os títulos dos testes automatizados.

| Resultado | Critério | Quantidade |
|---|---|---|
| Fechadas | documento existe, ou código com teste cobrindo o critério de aceite da tarefa; cada uma recebeu comentário com a evidência | 51 |
| Mantidas abertas, com comentário do que falta | código existe, mas falta teste do critério de aceite ou há divergência com Spec aprovada (T-11) | 23 |
| Criadas | #79 (decisões OPEN-01/02/210) e #80 a #108 (uma por Spec, com checklist do ciclo) | 30 |

- **Achados da análise:**
  - **T-68** ("toda regra com teste") não está cumprida: RN-00, RN-05, RN-08, RN-11, RN-28 e RN-33 não têm teste nomeado.
  - **T-06:** a migração é idempotente, mas cria **20 tabelas**, não 18. ADR-002, `plan.md` e `tasks.md` foram corrigidos: 19 entidades da spec mais `sessao`.
  - **`tasks.md`:** as 23 tarefas abertas passaram de ✅ para 🔄, com legenda nova.
- **Distribuição:** por trilha do `tasks.md`, para cada pessoa ficar com uma área coerente.

| Integrante | Trilha | Issues abertas |
|---|---|---|
| gostislavs (Gustavo) | A: domínio e financeiro | 18 |
| 2dart5 | B: transação e consequência | 17 |
| 1Noriyuki (Enzo) | C: acesso, admin e IA, mais a #79 | 18 |

- **Premissa do agente (PA-06):** o colaborador `niltonmack` foi tratado como professor, por não ter nome nem atividade no repositório e porque a spec §15 prevê o professor como colaborador. Ele não recebeu issues. Se for integrante, a distribuição precisa ser refeita.
- **Documento de passagem:** `docs/proximos-passos.docx`, 5 páginas, conferido renderizado (Word → PDF → imagem). Conteúdo:
  - estado do projeto;
  - primeiro passo (PR e merge);
  - o ciclo de cada Spec e a regra fundamental;
  - as recomendações da #79;
  - a divisão com ondas de dependência;
  - os pontos de atenção já conhecidos;
  - mapa dos arquivos e ordem de leitura.

### Etapa 14 — Decisões da issue #79: OPEN-01, OPEN-02 e OPEN-210 · 2026-10-08

- **Pedido:** dar continuidade às issues atribuídas a 1Noriyuki. A #79 trava o ciclo da SPEC-002, então as três decisões foram levadas ao Enzo antes de mexer em código.
- **Decisões (Enzo, aceitando as recomendações da etapa 12):**

| OPEN | Decisão | Onde ficou |
|---|---|---|
| OPEN-01 | manter o código existente, conferi-lo contra cada Spec aprovada e corrigir só as divergências | mapa §3, SPEC-001 §13, SPEC-002 §4 e §13, CLAUDE.md |
| OPEN-02 | manter `RN-xx`; invariantes de Spec são `INV-001` locais, citados fora dela como "SPEC-00X INV-00Y". PA-02 e PA-03 confirmadas | mapa §3, SPEC-001 §13, SPEC-002 §13 |
| OPEN-210 | a conta sai autenticada do cadastro; o prestador pendente prepara perfil, serviços e régua antes da aprovação; publicar segue bloqueado pela RN-08 | spec v0.1.6 (UC-01), SPEC-002 v1.2.0 (5.1 passo 6, CA-12, T-CONTA-01i) |

- **Baseline atualizada:**
  - `docs/spec.md` v0.1.5 → **v0.1.6**, com histórico.
  - **SPEC-002** v1.1.0 → **v1.2.0**: fluxo 5.1, pós-condições, tela da §8.1, CA-12 e teste T-CONTA-01i novos, DoD passa a CA-01..CA-12.
  - Mapa, SPEC-001 e CLAUDE.md.
- **Não decidido aqui:** a parte da OPEN-210 sobre os campos extras do formulário (telefone, região, nome do negócio) continua na OPEN-205.
- **Efeito:** o código que já autentica depois do cadastro (`rotas/publicas.js`) deixa de ser divergência; passa a precisar só do teste T-CONTA-01i.

### Etapa 15 — Ciclo da SPEC-002: conferência do código, correções e testes · 2026-10-08

- **Pedido:** continuar as issues de 1Noriyuki. Com a OPEN-01 decidida (etapa 14), a #81 (SPEC-002) foi a primeira da fila, porque fecha as T-09, T-10 e T-11.
- **Conferência:** cada critério da SPEC-002 v1.2.0 contra `aplicacao/contas.js`, `infra/senha.js`, `interface/http/sessao.js` e `rotas/publicas.js`.

| Critério | Antes | Ação |
|---|---|---|
| CA-01 a CA-05, CA-12 | código conforme, sem teste nomeado | testes T-CONTA-01a a 01i |
| CA-06, CA-07 | conforme; os testes antigos não comparavam as duas recusas (INV-005) | T-SESSAO-01 e 02 substituem os dois testes de `http.test.js` |
| CA-08 | **divergia:** conta `SUSPENSO` entrava | `autenticar()` recusa com `ErroDeRegra('RN-28')`, só depois de a senha conferir |
| CA-11 | **divergia:** `REPROVADO` era barrado | bloqueio removido |
| CA-09a/b/c | **divergia:** só expiração fixa de 12 h | `expira_em` virou prazo deslizante: cada uso o empurra para agora + 2 h, sem passar de `criada_em` + 12 h. Sem coluna nova, então nenhum banco existente precisa migrar |
| 5.3, suspensão | **divergia (achado novo):** suspender não encerrava as sessões | `decidirSobreConta` chama `usuarios.encerrarSessoes()`; teste novo T-SESSAO-03b, acrescentado à §12 da Spec |
| CA-10, RNF-03 | conforme, sem teste | T-SESSAO-05 e 06 |

- **Verificação:**
  - `npm test`: 158/158 (141 − 2 testes substituídos + 19 novos).
  - Os testes novos rodados contra o código antigo falham em 4 (CA-08, CA-11, CA-09a/b e suspensão), o que confirma que eles pegam as divergências.
- **Documentação:** SPEC-002 (§12 e §14), `tasks.md` (T-09, T-10 e T-11 passam a ✅), `testes.md`, README e CLAUDE.md. A RN-28 deixa a lista de regras sem teste nomeado da T-68.
- **Observações, sem decisão tomada:**
  - **INV-004 no banco:** a DoD pede INV-004 garantido também no banco (C-VI). O `CHECK` cobre os valores de `perfil` e `estado_conta`, mas a combinação "nasce `ATIVO` se cliente, `PENDENTE_APROVACAO` se prestador" não cabe num `CHECK`, porque o estado muda depois. Opções: aceitar a garantia só no domínio, ou criar um gatilho `BEFORE INSERT`. Decisão da equipe.
  - **OPEN-208:** o repositório já trata o e-mail sem diferenciar maiúsculas (grava e busca em minúsculas). Isso é uma decisão de fato no código, ainda não registrada na spec.
  - **Mensagem de conta suspensa:** cita "o suporte da plataforma", porque o canal de contato segue indefinido (`[CANAL DE CONTATO]` no layout).
- **Ainda abertas na SPEC-002:** OPEN-201, 204 a 209 e a aprovação do layout (etapa 8). Nenhuma delas muda o comportamento verificado aqui.

### Etapa 16 — Evidências de teste da Trilha B · 2026-10-13

- **Pedido:** acrescentar cobertura automatizada às issues T-22, T-23, T-28, T-29, T-33 e T-53, atualizar `tasks.md` e preparar a SPEC-010.
- **Produzido:** `tests/integracao/trilha-b.test.js`, com oito casos:
  - `T-HORARIO-LOTE-01 | RF-023`: erro isolado no lote é reportado, sem impedir os itens seguintes;
  - `T-HORARIO-CANCEL-01/02 | RF-022`: horário livre pode ser cancelado; horário reservado é recusado;
  - `T-BUSCA-03 | RF-028 a RF-030`: filtros por categoria/região/janela e exclusão de horário não publicado ou prestador inelegível;
  - `T-BUSCA-04 | RF-031`: desempate por ID mantém a ordem entre execuções;
  - `T-AGENDAMENTO-06 | RF-042`: confirmação ocupa o horário;
  - `T-AGENDAMENTO-07 | RF-043/RF-044`: recusa exige motivo e libera o horário;
  - `T-DISPUTA-07 | RF-074/RF-075`: fila prioriza o prazo de SLA e sinaliza o prazo vencido.
- **Verificação:** `node --test tests/integracao/trilha-b.test.js`, 8/8 aprovados; `npm test`, 166/166 aprovados (158 anteriores + 8 novos).
- **Documentação:** `tasks.md` referencia os novos testes nas seis issues. O estado permanece `🔄`: as issues ainda estão abertas e a conferência da Spec correspondente não foi concluída.
- **Sem mudança de regra ou implementação:** os testes registram os critérios já expressos na baseline.
- **SPEC-010:** não gerada nesta etapa. O estado atual do processo identifica a SPEC-003 como próxima (resumo deste registro); o mapa coloca SPEC-010 após a SPEC-009, e o documento de passagem diz que as Specs devem ser geradas uma por vez na ordem aprovada. **Decisão da equipe (2026-10-13):** manter a fila e adiar a SPEC-010 até concluir as SPEC-003 a 009.

### Etapa 17 — Trilha A, início da conferência da SPEC-001 e da T-07 · 2026-10-16

- **Responsável da trilha:** gostislavs. **Escopo:** #80 (SPEC-001), #9 (T-07) e cobertura inicial de #70 (T-68). Não altera as issues dos demais integrantes.
- **Branch própria:** `audit/gostislavs-spec-001-20261016`, derivada de `main`. A branch SDD compartilhada não foi alterada.
- **Conferência estática:** matriz de CA-01 a CA-11 e seis divergências em [`auditoria-SPEC-001-gostislavs.md`](auditoria-SPEC-001-gostislavs.md).
- **Alterações técnicas propostas (ainda sem merge):** criação de `parametro_historico` com backfill idempotente; gravação atômica do valor atual e de cada versão; leitura global em instante UTC; validação estrita com `ErroDeRegra('RN-00')`; histórico visível no repositório; documentação de modelo físico atualizada.
- **Testes criados:** `tests/integracao/spec-001-parametros.test.js`, cobrindo T-PARAM-01/02/03/03b/04/06 e regressões de migração e atomicidade T-PARAM-07/08.
- **Verificação disponível:** smoke test isolado com Node 22 e SQLite confirmou idempotência de backfill, vigência e atualização transacional. **Não equivale ao `npm test` do projeto**, que exige Node >=24. A suíte do repositório não foi executada nem se afirma que está verde.
- **Bloqueios:** OPEN-103 (fonte de P-01/P-02 e precedência de escopo), OPEN-20 (faixas divergentes), OPEN-06/08/15 (máquinas de estado), OPEN-104 (ator do sistema). Nada disso foi decidido pelo agente.
- **Situação:** proposta em branch/PR draft para revisão humana; #9, #80 e #70 permanecem abertas. Executar todos os testes, completar CA-05/08/09/10/11 e verificar todos os invariantes antes de concluir a SPEC-001.

### Etapa 18 — Ratificação da #79 e reconferência da SPEC-002 · 2026-10-18

- **Pedido:** assumir as atribuições da Trilha C e registrar formalmente as decisões da issue #79; reconferir as correções da SPEC-002/T-11 antes de iniciar as Specs seguintes.
- **Decisões ratificadas por `2dart5`:**

| OPEN | Decisão aprovada | Registro |
|---|---|---|
| OPEN-01 | O código existente é candidato à conferência Spec por Spec; corrigir apenas divergências documentadas em relação a Specs aprovadas | `docs/tasks.md`, mapa §3, decisão original na etapa 14 |
| OPEN-02 | Manter `RN-xx` como nomenclatura do projeto equivalente a `RB`; invariantes locais `INV-001` são citados com o ID da Spec fora dela | `docs/tasks.md`, mapa §3, etapas 14 e 18 |
| OPEN-210 | Cadastro aceito já cria sessão autenticada; prestador pendente pode preparar perfil, serviços e régua, sem publicar antes de `ATIVO` (RN-08) | `docs/tasks.md`, spec v0.1.6, SPEC-002 §5.1/CA-12, etapa 14 |

- **Conferência de T-11 / SPEC-002:** as três correções solicitadas já estavam presentes na branch: `autenticar()` recusa `SUSPENSO` com mensagem própria depois da validação da senha; `REPROVADO` autentica; a sessão renova o prazo de 2 h sem ultrapassar 12 h desde a criação. Os testes correspondentes já existem em `tests/integracao/contas-sessao.test.js` (`T-SESSAO-03`, `T-SESSAO-04a/b/c`, `T-SESSAO-07`). Nenhuma alteração de código foi necessária nesta reconferência.
- **Documentação corrigida:** `tasks.md` detalha os critérios e testes de T-11; ADR-004 deixa de afirmar que a implementação está pendente e explica o uso de `expira_em` como prazo renovável; SPEC-002 aponta para spec v0.1.6. OPEN-12 foi marcada resolvida no mapa.
- **Verificação nesta etapa:** `npm test`, 166/166 aprovados; `git diff --check` sem erros.

### Etapa 19 — Rascunhos das SPEC-003, SPEC-004 e SPEC-005 · 2026-10-18

- **Pedido:** gerar as próximas três Specs da Trilha C em sequência, baseadas na baseline `docs/spec.md` v0.1.6.
- **Produzido:** três propostas v0.1.0 com as 14 seções do roteiro:
  - [`SPEC-003-autorizacao-por-perfil-e-titularidade.md`](SPEC-003-autorizacao-por-perfil-e-titularidade.md): RF-006/RF-007, matriz da spec §4.5, titularidade e auditoria;
  - [`SPEC-004-notificacoes-por-evento-e-central-do-usuario.md`](SPEC-004-notificacoes-por-evento-e-central-do-usuario.md): RF-082/RF-083, avisos persistidos, central, leitura e isolamento por usuário;
  - [`SPEC-005-aprovacao-e-reprovacao-de-prestador.md`](SPEC-005-aprovacao-e-reprovacao-de-prestador.md): RF-003/RF-008/RF-009, fila, transições administrativas, justificativa e notificação.
- **Estado:** as três estão em rascunho e aguardam revisão/aprovação explícita da equipe. Nenhuma implementação nova ou teste de comportamento ainda não aprovado foi iniciado. Os testes de T-11 existentes constituem evidência da conferência da SPEC-002.
- **Questões mantidas explícitas:** auditoria de tentativas por titularidade (SPEC-003), matriz/atomicidade/paginação de notificações (SPEC-004), limite mínimo da justificativa e significado de “notificar a fila” (SPEC-005).

### Etapa 20 — Levantamento das issues e recuperação dos PRs empilhados da Trilha A · 2026-10-20

- **Pedido (Enzo):** verificar o andamento do projeto, separar issues fechadas e abertas e apontar as que
  já estariam resolvidas mas esquecidas abertas.
- **Levantamento:** 59 issues fechadas e 48 abertas. Das abertas, 20 são tarefas T-nn, todas 🔄 no
  `tasks.md`, e 28 são Specs (só a #81, SPEC-002, está fechada).
- **Esquecidas abertas:** nenhuma. Pela OPEN-01, uma tarefa só fecha depois da conferência da Spec
  correspondente, e nenhuma das 20 passou por ela. As mais próximas são estas:
  - #9 (T-07): falta CA-05/08/09/10/11 da SPEC-001 e há bloqueio da OPEN-103;
  - #24, #25, #30, #31, #35 e #55: têm testes em `trilha-b.test.js`, mas as Specs ainda não existem;
  - #70 (T-68): RN-05 ainda está parcial.
- **Achado:** os PRs #111, #112 e #113 foram mergeados, mas estavam empilhados, cada um apontando para a
  branch do anterior. O #110, que apontava para a `main`, foi mergeado antes dos outros. Com isso os
  três arquivos de teste e os três de evidências da Trilha A ficaram parados nas branches intermediárias.
- **Correção:**
  - o PR #114 leva `test/gostislavs-perfil-catalogo-20261016`, que acumula os três PRs, para a `main`;
  - sem código novo e sem conflito;
  - `npm test` deu 204/204 localmente e o CI no Node 24 passou;
  - Enzo fez o merge.
- **Trilha C:** desde a etapa 18 (2026-10-18) ela está com o 2dart5. Os rascunhos das
  SPEC-003 a 005 continuam sem PR. O CLAUDE.md passou a mostrar a divisão atual. O
  `docs/proximos-passos.docx` ainda mostra a original.
- **Alteração local registrada junto:** a renovação da sessão (ADR-004, revisão) só regrava `expira_em`
  quando o prazo anda 1 minuto ou mais. Assim a sessão não escreve no banco a cada requisição. Isso vem
  com o teste `T-SESSAO-04d` e com notas na ADR-004, SPEC-002 §12, `testes.md` e README.
- **Verificação:** `npm test` deu 205/205 na `main` com essa alteração.
- **Nenhuma decisão de mérito foi tomada** e nenhuma issue foi fechada.

### Etapa 21 — Aprovação das SPEC-003, SPEC-004 e SPEC-005 · 2026-10-20

- **Pedido e decisão (Enzo):** aprovar as três Specs da Trilha C redigidas pelo 2dart5 na etapa 19.
- **Antes da aprovação:** as três foram lidas inteiras. Têm as 14 seções do roteiro, critérios Dado/quando/então
  testáveis, invariantes com verificação e escopo coerente com o mapa. Nada foi alterado no conteúdo.
- **Mudanças:**
  - as três passam de v0.1.0 (rascunho) para **v1.0.0 (aprovada)**;
  - o resumo deste registro e o fecho do mapa foram atualizados.
- **Integração:** a branch `specs-duarte` foi mergeada numa branch nova a partir da `main`, com dois conflitos:
  - **ADR-004:** ficou o texto da `main`, que já incluía a renovação de 1 minuto, citando a reconferência
    do 2dart5;
  - **registro:** as etapas foram renumeradas em ordem cronológica. A 17 do Gustavo continua 17. As 17 e 18
    do 2dart5 viraram **18 e 19**. A antiga 19 virou **20**.
- **Seguem abertas e não foram decididas aqui (§13 de cada Spec):**
  - SPEC-003: se a tentativa sobre recurso alheio também gera auditoria;
  - SPEC-004: a matriz de eventos e destinatários, a atomicidade com a transição e a paginação;
  - SPEC-005: se os 10 caracteres mínimos da justificativa são regra de produto, e o que significa
    "notificar a fila".
- **Próximo passo:** o 2dart5 confere o código contra as três (T-14 para a SPEC-005, T-66 para a SPEC-004).
  Na fila de geração vem a SPEC-006 (Trilha A).

### Etapa 22 — Decisões sobre os pedidos da Trilha A e spec v0.1.7 · 2026-10-20

- **Pedido e decisão (Enzo):** responder aos pedidos A a E de `propostas-decisoes-trilha-a.md`, aceitando as
  recomendações apresentadas na conversa, e atualizar a spec.
- **Decisões:** A tabela "Decisões" no fim de `propostas-decisoes-trilha-a.md` registra cada uma. Em resumo:
  - **A (OPEN-103):** o perfil é a fonte de P-01 e P-02; P-13 é por categoria;
  - **B (OPEN-20):** P-07 segue a spec; P-12a/b, P-16a/b e P-21 entram na spec; a QA-10 é fechada;
  - **C (OPEN-06/08/15):** novas transições de suspensão, `RASCUNHO` removido, RN-27 explícita;
  - **D (OPEN-104):** `ator_id` nulo é o sistema;
  - **E (OPEN-05/101/102/105):** P-22, definição de fato ocorrido, exceção da P-20 e máquina do lançamento.
- **Ajuste em relação à recomendação inicial:** `EM_REVISAO → RESTRITO` não entrou na spec. Ao conferir o código,
  nenhum caso de uso dispara essa transição, então ela sai do código.
- **Achado ao conferir a OPEN-06:** a acusação mútua não ficou sem desfecho. O código guarda como estado anterior
  a primeira acusação (`NO_SHOW_*`), e a RN-27 passou a dizer isso.
- **Premissa do agente (PA-07), confirmada por Enzo na etapa 23:** a faixa da P-22 é "metade ao dobro do padrão, com o mesmo sinal, e a
  penalidade do prestador nunca abaixo da do cliente na mesma faixa". A decisão foi tornar os deltas parâmetros,
  mas a faixa exata foi proposta pelo agente.
- **Baseline atualizada:**
  - `docs/spec.md` v0.1.6 → **v0.1.7**, com histórico;
  - SPEC-001 v1.0.0 → **v1.1.0**, sem OPEN abertas;
  - mapa (OPEN-05, 06, 08, 15 e 20 marcadas como resolvidas).
- **Código:** não foi alterado nesta etapa. As oito correções que o código passa a dever estão listadas em
  `propostas-decisoes-trilha-a.md` e ficam com a Trilha A (#9, #80).

### Etapa 23 — Aprovação do layout da SPEC-002 e da faixa da P-22 · 2026-10-20

- **Pedido e decisão (Enzo):** aprovar as 8 telas do layout da SPEC-002 (etapa 8) e confirmar a faixa da P-22,
  que tinha sido proposta pelo agente (PA-07, etapa 22).
- **Layout:** aprovado como está no [canvas](https://claude.ai/artifact/RNxkqRrx1kn9TQ3F8wuZrW) e em
  `docs/specs/layouts/SPEC-002/`. A tela de conta suspensa mantém `[CANAL DE CONTATO]`, porque o canal ainda
  não foi definido. Definir o canal não muda o layout, só esse texto.
- **P-22:** a faixa "metade ao dobro do padrão, mesmo sinal, prestador nunca abaixo do cliente na mesma faixa"
  passa a ser decisão da equipe. A spec v0.1.7 já tinha esse texto, então ela não muda.
- **Ainda abertas na SPEC-002:** OPEN-201 e 204 a 209, além da decisão do INV-004 no banco. Recomendações
  apresentadas ao Enzo nesta etapa, sem decisão.
- **Documento de passagem:** `docs/proximos-passos.docx` reescrito com o estado de 2026-10-20.

### Etapa 24 — Decisões da SPEC-002, correções no código e INV-004 no banco · 2026-10-20

- **Pedido e decisão (Enzo):** adotar as recomendações da etapa 23 para as OPEN-201 e 204 a 209, corrigir os dois
  problemas encontrados no código e garantir o INV-004 no banco com um gatilho (opção 2).
- **Decisões, já na spec v0.1.8 e na SPEC-002 v1.3.0:**

| OPEN | Decisão |
|---|---|
| 201 | Política de senha na RF-001 (8 caracteres, letras e números), sem virar parâmetro |
| 204 | Logout vira a RF-005a |
| 205 | Nome, e-mail, senha e perfil obrigatórios; telefone, região e nome de exibição opcionais |
| 206 | Admin nasce só pelo procedimento de implantação (ADR-004) |
| 207 | Reputação parte da P-08 da criação, gravada em `usuario.reputacao_inicial` (RN-23, INV-08) |
| 208 | E-mail comparado sem espaços nas pontas e sem diferenciar maiúsculas |
| 209 | Revelar que o e-mail está em uso é risco residual aceito (`seguranca.md` A2) |

- **Código corrigido:**
  - **OPEN-208:** `normalizarEmail()` em `infra/repositorios/usuarios.js` é o único lugar que normaliza. Antes, a
    checagem de duplicidade não tirava os espaços e a gravação tirava; um e-mail repetido com espaços estourava
    `UNIQUE constraint failed` em vez da mensagem da RF-002.
  - **OPEN-207:** coluna `usuario.reputacao_inicial`, gravada na criação. `reputacao.recalcular()` usa ela, e não a
    P-08 atual. Bancos antigos ganham a coluna em `migrar()`, preenchida com a P-08 em vigor (o valor que o
    recálculo já usava) e, no admin, com a reputação dele.
  - **INV-004:** gatilho `usuario_nasce_no_estado_inicial`, que só olha o `INSERT`. O seed é compatível: cria
    clientes e prestadores pelo `cadastrar()` e só insere direto o admin.
- **Testes novos:** `T-CONTA-01j`, `01k` e `01l`. Rodados contra o código anterior, os três falham.
- **Verificação:**
  - `npm test`: 208/208;
  - migração de um banco no formato antigo, executada duas vezes;
  - seed do zero num banco temporário.
- **Documentos:** spec, SPEC-002, ADR-002, ADR-004, `seguranca.md`, README, `testes.md` e CLAUDE.md.

### Etapa 25 — Canal de contato da conta suspensa · 2026-10-20

- **Pedido:** recomendação para a única pendência da SPEC-002, o `[CANAL DE CONTATO]` da tela de conta suspensa.
- **Recomendação do agente:** e-mail de suporte fixo, definido em configuração, mostrado na tela com link
  `mailto:`. Motivos: a conta suspensa não autentica (RN-28), então nenhum canal interno serve; um formulário
  público de contestação seria escopo novo (RF, tabela, fila no admin, proteção contra spam) dentro de uma Spec
  aprovada; e "fale com o suporte" sem canal deixa o usuário sem saída. Não entra na tabela `parametro`, que
  guarda números de regra com faixa, e não endereços.
- **Decisão (Enzo):** aprovada como recomendada.
- **Baseline:** spec v0.1.9 (RF-004 informa o canal); SPEC-002 v1.4.0 (CA-08 e tabela do layout); layout
  `Entrar-suspensa` e `canvas.json` com o e-mail no lugar do marcador; variável `CONTATO_SUPORTE` no README, no
  `plan.md` e no CLAUDE.md.
- **Código:** `contatoDeSuporte()` em `aplicacao/contas.js` lê `CONTATO_SUPORTE` (padrão `suporte@encaixe.dev`) e
  vai na mensagem e nos detalhes do `ErroDeRegra` RN-28. `tratarErroDeAcao()` mostra o botão "Escrever para a
  administração" quando o erro traz um contato.
- **Teste:** `T-SESSAO-03` passa a exigir o e-mail e o link `mailto:` na tela.
- **Verificação:** `npm test`: 208/208.
- **Fica de fora:** o canvas publicado no claude.ai não foi republicado; as fontes em `layouts/SPEC-002/` já trazem o
  texto novo.

### Etapa 26 — Correções aprovadas da SPEC-001 e rascunho da SPEC-006 · 2026-10-21

- **Pedido (gostislavs):** executar todas as tarefas possíveis da Trilha A após os merges de Enzo, sem aprovar regras por conta própria.
- **Decisões:** nenhuma nova. Usadas as decisões A–E aprovadas por Enzo na etapa 22; SPEC-001 v1.1.0 e baseline v0.1.8.
- **Branch de correção:** `gostislavs-spec001-fix` (base `main`). Ajustes de P-07 (0,5 h), remoção de transições/estado `RASCUNHO` não previstos, P-01/P-02 globais herdados ao cadastrar novo prestador e proteção de banco novo/legado; testes `T-PARAM-05`, `T-PARAM-09` e `T-ESTADO-04..06`.
- **Evidência:** `evidencias-trilha-a-spec001-alinhamento-20261021.md` registra cobertura parcial, migração conservadora e pendências. Não fechar #9/#80 antes de conferir todos os CA e INV, CI e revisão.
- **Próxima Spec:** rascunho completo da SPEC-006 preparado na branch `gostislavs-spec006-rascunho` (base `main`) com 14 seções; aguarda aprovação explícita de Enzo/equipe e questões da §13. Nenhuma regra de reputação foi modificada por esse rascunho.
- **Ainda pendente:** P-22 e classificação/notificação aguardam SPEC-006; máquina/auditoria financeira aguardam fluxo de SPEC-020/022/023; P-17 congelada no nascimento da obrigação exige alinhar SPEC-020. Não foram tomadas decisões implícitas.
- **Verificação:** commits enviados ao GitHub; resultados de CI da nova branch devem ser anexados após a execução. Não confundir testes escritos com testes executados.

### Etapa 27 — Revisão e merge dos PRs da Trilha A (#121 a #129) · 2026-10-22

- **Pedido (Enzo):** revisar e mergear os nove PRs abertos por gostislavs.
- **Revisão:** os nove entram na `main` sem conflito e com a suíte verde a cada passo. Os PRs de código cumprem os
  itens da etapa 22: #121 (itens 1–4 e 8), #125 (item 5, P-22), #123 (item 6, máquina da comissão) e #124 (item 7,
  P-17). O #128 (total retido fora do período, RF-062) e o #129 (evento de reputação atômico, alerta aos admins,
  RF-057/INV-08) corrigem divergências contra a baseline.
- **Correção no #123, aprovada por Enzo antes do merge:** toda transição da comissão era auditada com ator nulo, que
  pela §9.2 (OPEN-104) é o sistema. Agora `aplicacao/comissao.js` exige o ator: a retenção leva quem abriu a
  disputa, e a liberação e o estorno levam o admin. A máquina e a auditoria saíram do repositório, e a apuração passou
  a ter um único registro de nascimento (`COMISSAO_APURADA`, na trilha da comissão). Testes `T-COMISSAO-ESTADO-07`
  e `08`. Com isso o #125 conflitou em `aplicarDesfecho`; resolvido mantendo as duas mudanças.
- **Specs:** os PRs #122, #126 e #127 trazem rascunhos das SPEC-006 a 009, 011, 020, 021, 024 e 026. Entraram como
  **não aprovados**: o merge não substitui a aprovação, que segue uma Spec por vez, começando pela SPEC-006. Nenhum
  dos rascunhos tem layout, embora a SPEC-008 (simulador da régua) tenha tela.
- **Ressalvas registradas, sem bloqueio:** a etapa 26 dizia que P-22, comissão e P-17 aguardavam Specs, e os PRs
  #123–#125 as implementaram com base na etapa 22; esta etapa substitui aquele texto. Os agendamentos anteriores ao
  #124 ficam com o prazo de autoconclusão nulo e releem a P-17 atual. Os IDs `T-COMISSAO-06`, `T-PRECO-06` e
  `T-PRECO-07` já estavam duplicados antes destes PRs.
- **Ajustes visuais no mesmo dia:** a navegação marcava "Painel" junto com a aba atual, porque `/prestador` é prefixo
  de todas as rotas do prestador; agora só o link mais específico fica ativo. Na régua de desconto, a coluna de
  rótulo tinha largura fixa e "a partir de 4 h antes" invadia a barra; agora a coluna se ajusta ao rótulo mais longo
  (subgrid) e as barras seguem alinhadas.
- **Verificação:** `npm test`: 233/233; régua conferida em 1280 px e 600 px.

### Etapa 28 — Conferência final da SPEC-001 e fechamento das issues #80 e #9 · 2026-10-22

- **Pedido (Enzo):** ver se alguma issue podia ser fechada e, sendo o caso da SPEC-001, completar a conferência.
- **Por que nada fechava:** nenhum PR usou `Closes #N`, e o critério combinado (etapa 26) é a Definition of Done
  inteira da Spec. Das 48 issues abertas, só a #80 (SPEC-001) e a #9 (T-07) estavam perto: as demais dependem de
  Spec ainda não aprovada (rascunhos da etapa 27), não escrita, ou de conferência pendente (SPEC-003 a 005).
- **Conferência da seção 12 da SPEC-001:** 13 dos 14 testes existiam. Lendo cada um contra o critério:
  - INV-001, CA-05 e RNF-07 já tinham cobertura completa em testes vizinhos (`T-PARAM-03b`, `T-PERFIL-02`,
    `T-AUDIT-03b`), agora apontados na própria Spec;
  - **faltava o `T-DOMINIO-01`** (INV-006). Escrito: o domínio só importa o próprio domínio, e só o relógio
    injetável lê o agora. Verificado que ele falha com um import de `infra` e com um `Date.now()` injetados;
  - **o `T-ESTADO-03` era fraco para o CA-11:** só lia o `CHECK` no esquema. Entrou o `T-ESTADO-03b`, que grava
    estado inexistente nas quatro entidades e exige a recusa do próprio SQLite.
- **Definition of Done:** CA-01 a 11, INV-001 a 007 e RNF-01/07/08/10 com teste; correções da OPEN-20 feitas
  (P-07 em 0,5 h; P-12 e P-16 divididas). Divergência residual conhecida, fora do escopo da SPEC-001: agendamentos
  confirmados antes do #124 não têm o prazo da P-17 gravado e releem o valor atual (registrado na etapa 27; é da
  SPEC-020).
- **Documentos:** SPEC-001 v1.2.0 (concluída, com a tabela de evidência), `tasks.md` T-07 ✅.
- **Decisão (Enzo):** a conferência das SPEC-003 a 005 continua com o 2dart5; as issues #82 a #84 ficam abertas.
- **Encerramento do dia:** `docs/proximos-passos.docx` reescrito (estado, próximos passos por pessoa e o que mudou nas etapas 25 a 28) e CLAUDE.md atualizado.
- **Verificação:** `npm test`: 235/235.

### Etapa 29 — Evidências complementares da SPEC-006 (Trilha A) · 2026-10-22

- **Pedido (gostislavs):** continuar o máximo possível das issues da Trilha A, sem repetir alterações incorporadas por Enzo na etapa 27.
- **Situação da SPEC-006:** `SPEC-006-reputacao-livro-razao-classificacao-conta.md` atualizado factualmente para v0.1.1, **ainda rascunho/não aprovado**. Não foram tomadas decisões de mérito da §13. A matriz `evidencias-SPEC-006-trilha-a-20261022.md` relaciona CA-01..10 a código e testes existentes/novos.
- **Divergência INV-08/RNF-01:** na `main`, o registro de evento já era transacional (#129), mas `recalcular()` e `reverterEventosDoAgendamento()`, chamados isoladamente, não possuíam proteção completa contra falha entre atualização de histórico/cache/classificação. PR #136 cria transações aninháveis e testes com gatilhos SQLite injetando falhas.
- **Divergência temporal P-20:** filtragem da idade por `minutosEntre()` arredondava em minutos inteiros e incluía eventos de segundos imediatamente fora da janela. PR #136 compara instantes em milissegundos; mantém fronteira exata inclusiva e exclui eventos futuros, com teste da borda.
- **Cobertura CA:** testes novos exercitam proveniência/UTC, inclusão e exclusão de eventos, exclusividade de RESTRITO para cliente, revisões/suspensões sem reativação automática, auditoria, rollback de recálculo/reversão e mudança de janela preservando o livro-razão. Os testes existentes são referenciados, não duplicados.
- **Pendente:** o texto de rascunho ainda requer aprovação da equipe, confirmação do contrato físico P-22, política de avisos para admin, estratégia de reincidência e OPEN-03. Não fechar #85 enquanto faltar a Definition of Done.
- **CI:** verificar a execução do GitHub Actions associada ao último commit do PR #136 antes de merge; não declarar resultados sem execução.

### Etapa 30 — Consistência do catálogo, perfil e régua (Trilha A) · 2026-10-22

- **Pedido (gostislavs):** avançar nas issues ainda abertas após a SPEC-001 concluída, preservando o SDD e as decisões já tomadas.
- **PR #137 — SPEC-007/009:** `desativarServico()` desativava o registro antes de escrever a auditoria, sem transação; se a auditoria falhasse, o serviço ficava desativado sem rastreio. `salvarPerfilPrestador()` tinha a mesma lacuna e registrava sucesso para perfil inexistente. Corrigido com transações e checagem de existência, preservando os contratos atuais. Testes de rollback e ausência de falso sucesso.
- **PR #138 — SPEC-008:** `normalizarFaixas()` usava `parseInt`, que aceitava entradas malformadas (`240abc` → 240, `20.5` → 20) e descartava linhas não numéricas sem erro. Agora somente linhas totalmente em branco são ignoradas; textos inválidos, campos incompletos e decimais são recusados por RF-018/RN-02, inclusive na simulação. Cinco testes novos.
- **Limites:** nenhuma das SPEC-007/008/009 foi formalmente aprovada por esta etapa. As divergências de comportamento foram corrigidas contra a baseline vigente; questões OPEN-10/11/16 permanecem em aberto. Sem fechamento das issues #86/#87/#88 e correlatas antes da Definition of Done.
- **Verificação:** consultar os resultados do GitHub Actions por commit de cada PR; não presumir que testes verdes isolados provam a integração futura após merges.

### Etapa 31 — Integração técnica dos PRs #136 a #141 (Trilha A) · 2026-10-22

- **Pedido:** completar o máximo possível das tarefas do gostislavs, consolidando código em vez de depender apenas de CI isolado por branch.
- **Integração:** PR #142, branch `gostislavs-trilha-a-integrada-20261022`, incorporando sem sobrescrita de mudanças os PRs #136 (SPEC-006), #137 (SPEC-007/009), #138 (SPEC-008), #139 (SPEC-026), #140 (SPEC-011) e #141 (SPEC-021).
- **Conflitos conciliados:** `src/aplicacao/catalogo.js` (desativação transacional + números da régua) e `registro-sdd.md` (etapas 29+30).
- **Evidência:** `evidencias-integracao-trilha-a-20261022.md`, com escopo, matriz de tarefas, limitações e decisões ainda em aberto.
- **Teste de integração:** GitHub Actions Node 24, execução #39884130601, `261 testes aprovados, 0 falhas, 0 ignorados` no commit de integração anterior à inclusão destes documentos.
- **Estado do SDD:** as SPEC-006/007/008/009/011/020/021/024/026 continuam rascunhos até decisões explícitas da equipe; as issues correspondentes não foram fechadas por esta etapa. O merge dos PRs originais não deve duplicar arquivos após uma eventual incorporação do PR #142.
- **CI após documentação:** a execução do novo commit deve ser verificada separadamente.

### Etapa 32 — Aprovação das Specs da Trilha A e correção da P-14 · 2026-10-29

- **Pedido (Enzo):** verificar os PRs abertos e fechar o que fosse possível; em seguida, decidir as questões da §13 das nove Specs da Trilha A.
- **PRs:** nenhum aberto. O #142 (integração dos #136 a #141) foi mergeado em 2026-10-23 e os seis PRs individuais foram fechados como substituídos, como ele pedia. O #143 (2dart5, P-04 e filtros na busca, `Closes #30`) foi fechado em 2026-10-29 sem merge e sem comentário; a #30 segue aberta. Falta perguntar ao 2dart5 se o trabalho foi abandonado ou vai voltar com outra base.
- **Divergência de processo registrada:** em 2026-10-23, depois do merge do #142, o gostislavs fechou as issues #85, #86, #87, #88, #90, #99, #100, #103 e #105 como "encerramento administrativo" pedido pelo responsável do projeto. O comentário de fechamento reconhece que as Specs ainda eram rascunho. Isso contraria a regra de fechar issue só com a Definition of Done inteira, e o fechamento não tinha sido registrado aqui.
- **Decisões aprovadas por Enzo** (proposta do agente, aprovada sem alteração):
  - **OPEN-10:** a régua é do prestador, e cada horário escolhe uma. A §9.2 é corrigida e a QA-07 é fechada.
  - **OPEN-16:** as categorias atendidas derivam dos serviços ativos. O RF-010 deixa de persisti-las e o RF-011 passa a citar a lista da RN-08, que é a que o código já confere.
  - **OPEN-11:** no MVP, categorias e regiões são listas carregadas pela implantação; o admin edita só o percentual de comissão da categoria.
  - **OPEN-03:** fica aceita a leitura do mapa (spec §1.5 e constituição).
  - **P-05 reduzido** (SPEC-008 e SPEC-011): o teto vigente vale no cálculo de horário ainda sem reserva, e a reserva mantém o preço travado. A RN-03 ganha esse texto.
  - **P-14** (SPEC-021): a conclusão trava o prazo de avaliação, conforme a RN-00.
  - **Demais questões:** as outras 23 confirmam o comportamento atual e estão escritas na §13 de cada Spec.
- **Correção de código (P-14):** `prazoAvaliacao()` usava a P-14 do momento da leitura, então alterar o parâmetro movia prazos que já estavam correndo, o que contraria a RN-00. A partir desta etapa:
  - `agendamento.avaliacao_prazo_em` é gravado na conclusão e na decisão de disputa com desfecho `CONCLUIDO`;
  - `migrar()` preenche os concluídos antigos com a P-14 vigente;
  - `prazoAvaliacaoDo(ag)` é a única leitura do prazo.
  - Testes: T-P14-01 a 04 e T-AVAL-02b.
- **Premissa corrigida (SPEC-020 Q1):** a proposta dizia que os registros legados usavam "a P-17 vigente na migração", mas o código deixava o prazo nulo e o calculava na leitura. Para cumprir a decisão aprovada, `acrescentarPrazoAutoconclusao()` passou a gravar a P-17 vigente nos confirmados legados (T-P17-04).
- **Spec v0.1.10:**
  - RN-00: novos exemplos (P-17 e P-14);
  - RN-03: regra do teto vigente;
  - RF-010 e RF-011;
  - §9.2: `Regiao`, `CategoriaServico`, `ReguaDesconto` e `Agendamento`;
  - QA-07 resolvida.
  - O mapa marca as OPEN-03, 10, 11 e 16 como resolvidas.
- **Conferência da Definition of Done:** as nove Specs estão **aprovadas no texto**, mas nenhuma está concluída. Dos 79 testes que as §12 propõem, só 22 existem com o identificador proposto:

  | Spec | Testes da §12 que existem |
  |---|---|
  | 006 | 8 de 10 |
  | 007 | 0 de 8 |
  | 008 | 5 de 9 |
  | 009 | 0 de 9 |
  | 011 | 3 de 8 |
  | 020 | 0 de 9 |
  | 021 | 2 de 9 |
  | 024 | 0 de 8 |
  | 026 | 4 de 9 |

  Parte dos critérios pode estar coberta por testes antigos com outro nome (a própria SPEC-024 pede esse mapeamento), mas isso precisa ser demonstrado numa tabela de evidência como a da SPEC-001 §12. Por isso, as nove issues são **reabertas**, com o motivo e a contagem em comentário.
- **Verificação:** `npm test`: 267/267 em quatro rodadas consecutivas. Numa rodada anterior, 1 teste falhou e a falha não se reproduziu; o nome do teste não foi capturado. Fica como suspeita de teste intermitente, a investigar se reaparecer. O seed do zero e a migração de uma cópia de `dados/encaixe.db` rodaram sem erro.

### Etapa 33 — Evidência das Specs da Trilha A · 2026-10-29

- **Pedido (Enzo):** resolver as nove issues reabertas na etapa 32 (#85, #86, #87, #88, #90, #99, #100, #103 e #105). Elas estão atribuídas ao gostislavs, que não tinha PR aberto nem branch recente sobre o tema; o PR avisa para evitar trabalho duplicado.
- **Correção da contagem da etapa 32:** a etapa anterior contou 22 testes existentes procurando só pelo identificador. Ao comparar o título, quase todos testavam outra coisa, porque os IDs `T-SPEC008-01..05`, `T-SPEC011-01..03`, `T-SPEC021-01..02`, `T-SPEC026-01..03` e `T-REPUT-01..10` tinham sido dados a testes de outro assunto. Só `T-REPUT-07`, `T-REPUT-09`, `T-SPEC026-04` e, em parte, `T-REPUT-03` correspondiam ao critério. Os comentários de reabertura das issues repetem a contagem errada; o PR desta etapa a corrige.
- **Regra adotada:** um identificador não pode nomear dois testes, senão a rastreabilidade por `grep` quebra. Onde havia colisão, os critérios usam `T-SPECnnn-CAnn` (SPEC-008, 011, 021 e 026). Onde não havia, ficaram os IDs propostos (SPEC-007, 009, 020 e 024).
- **SPEC-006:** a evidência já existia na matriz `evidencias-SPEC-006-trilha-a-20261022.md`, com outros IDs (`T-SPEC006-CAnn`, `T-CONTA-01l`, `T-P22-0n` etc.). Os 20 testes foram conferidos e passam; só a §12 estava errada.
- **Testes novos:** 69, em `tests/integracao/spec-0nn-evidencia.test.js`.

  | Spec | Testes novos |
  |---|---|
  | 007 | 8 |
  | 008 | 9 |
  | 009 | 9 |
  | 011 | 8 |
  | 020 | 10 |
  | 021 | 9 |
  | 024 | 8 |
  | 026 | 8 |

  A §12 de cada Spec passou a ser a tabela de evidência no modelo da SPEC-001, ligando cada CA e cada INV ao teste que a cobre. As invariantes que não cabem em teste aparecem como conferência de código.
- **Divergências encontradas e corrigidas:**
  - **SPEC-007 §5:** um preço malformado ou negativo gerava erro sem o campo, e a tela não apontava a entrada. Além disso, um preço mínimo negativo passado como número era gravado. `paraCentavos(entrada, campo)` agora recusa número negativo e leva o campo no erro.
  - **SPEC-009 §13, item 3:** uma região inexistente no perfil estourava `FOREIGN KEY constraint failed`. `salvarPerfilPrestador` agora recusa com erro no campo `regiaoId`.
  - **SPEC-026:** uma categoria inexistente em `ajustarComissao` lançava `Error` genérico, que vira resposta 500. Agora lança `NaoEncontrado`.
- **Pendente:** a DoD da SPEC-006 exige revisão do PR por outro integrante, então o merge espera essa revisão. A tela do extrato não oferece filtro de período, embora o repositório o suporte. Isso é interface e fica fora destas Specs.
- **Verificação:** `npm test` passou com 336/336 em duas rodadas.

### Etapa 34 — Busca por categoria, região e janela (T-28) · 2026-10-29

- **Pedido:** concluir a T-28 e verificar os filtros RF-028 a RF-030.
- **Produzido:** a busca limita a consulta ao primeiro horário que já atende P-04, preservando a janela solicitada quando ela começa depois; os filtros de estado `PUBLICADO` e conta `ATIVO` permanecem no repositório.
- **Evidência:** `T-BUSCA-03` cobre categoria, região, janela e elegibilidade; `T-BUSCA-03b` cobre P-04, o limite inclusivo e as exclusões de horário cancelado e prestador inativo.
- **Spec:** sem alteração; o comportamento implementa os RF-028 a RF-030 já aprovados em `docs/spec.md`.

### Etapa 35 — Ordenação com desempate determinístico (T-29) · 2026-10-30

- **Pedido:** resolver as issues do 2dart5, uma por commit, numa branch a partir da `main` (`issues-2dart5-lote`).
- **Conferência:** `ordenar_()` em `aplicacao/busca.js` já desempata pelo id em todos os critérios (RF-031). `T-BUSCA-04` só provava o empate por proximidade, onde a ordem do banco e a do id coincidem.
- **Evidência:** `T-BUSCA-04b` monta dois horários de mesmo preço e mesma reputação em que o de id menor começa depois, e exige a ordem pelo id em preço, desconto e reputação, igual em três leituras seguidas.
- **Divergência registrada, não corrigida:** `horariosRepo.buscar()` corta em `LIMIT 200` ordenando por início, antes da ordenação por preço ou reputação. Com mais de 200 horários na janela, "Menor preço" pode deixar de fora horários mais baratos. O teto é decisão de desempenho; mudar exige decisão da equipe (paginar, ou ordenar no SQL).

### Etapa 36 — Confirmação e recusa pelo prestador (T-33) · 2026-10-30

- **Conferência:** `confirmar()`, `recusar()` e `liberarHorario()` em `aplicacao/agendamentos.js` atendem RF-042 a RF-044, inclusive as notificações e o desvio para `EXPIRADO`. Faltava evidência de duas partes do critério.
- **Evidência nova:** `T-AGENDAMENTO-07b` prova que o cliente recebe o aviso da confirmação e o da recusa, este com o motivo; `T-AGENDAMENTO-07c` recusa uma reserva quando faltam 88 min para um P-04 de 90 e exige o horário em `EXPIRADO`, fora da busca.
- **Sem alteração de código nem de spec.**

### Etapa 37 — Fila de disputas ordenada por SLA (T-53) · 2026-10-30

- **Conferência:** `moderacaoRepo.filaDeDisputas()` ordena por `prazo_sla_em` e, no empate, por `valor_travado` decrescente (RF-074); `disputas.fila()` calcula `foraDoSla` e a tela `/admin/disputas` usa o selo de perigo (RF-075).
- **Evidência nova:** `T-DISPUTA-07b` abre duas disputas no mesmo instante, com a de maior valor e id maior, e exige que ela venha primeiro. `T-DISPUTA-07c`, no novo `tests/integracao/telas-admin.test.js`, sobe o servidor e prova que a fila só mostra o selo "vencido" depois do prazo e que o painel conta a disputa fora do SLA.
- **Sem alteração de código nem de spec.**

### Etapa 38 — Fila de revisão de contas e decisão do admin (T-55) · 2026-10-30

- **Conferência:** `decidirSobreConta()` já atendia RF-079 (justificativa de 10 caracteres, transição validada, auditoria com o admin e aviso ao titular com o texto). A fila não atendia RF-078: listava reputação e estado, **sem o motivo do sinalizador nem as ocorrências**, e o dossiê carregava o histórico da conta sem exibi-lo.
- **Correção (código, não spec):** `admin.filaDeRevisao()` compõe, na aplicação, o motivo a partir da última transição auditada para o estado atual (RN-22 por reputação, RN-21 por ocorrências, RF-079 por suspensão do admin) e a contagem de eventos negativos não revertidos. A tela `/admin/contas` ganhou as colunas "Motivo do sinalizador" e "Ocorrências"; o dossiê, a seção "Histórico da conta".
- **Evidência:** `T-CONTA-REVISAO-01` (RN-22, aplicação e tela), `T-CONTA-REVISAO-01b` (RN-21 com três cancelamentos, contagem e histórico no dossiê) e `T-CONTA-REVISAO-02` (decisão pela tela recusada sem justificativa, aceita com ela, auditada e notificada).
- **Verificação:** `npm test`, 345/345.

### Etapa 39 — Tela de parâmetros do domínio (T-58) · 2026-10-30

- **Conferência:** a faixa e a vigência já tinham evidência na aplicação (`T-PARAM-01` a `08`, SPEC-001). Faltava provar pela tela, e a conferência achou uma divergência: `admin.ajustarParametro()` gravava o valor e só depois registrava a auditoria, fora de transação. Se a auditoria falhasse, o parâmetro mudava sem rastro, ao contrário de `ajustarComissao()` e da ordem de `aplicacao/` (grava em transação → audita).
- **Correção:** `ajustarParametro()` passa a envolver gravação e auditoria na mesma `transacao()`.
- **Evidência:** `T-PARAM-TELA-01` altera P-04 pelo formulário, sem reinício, e a busca deixa de mostrar o horário que ficou abaixo da antecedência nova, com auditoria do admin; `T-PARAM-TELA-02` envia valor fora da faixa e a tela mostra RN-00 e P-04 sem nada mudar; `T-PARAM-09` derruba a auditoria por gatilho e exige o valor anterior.

### Etapa 40 — Provedor Anthropic com JSON Schema (T-61) · 2026-10-30

- **Conferência contra a API atual:** `infra/llm/anthropic.js` usa o SDK oficial como dependência opcional (ADR-001), `claude-opus-5`, `output_config: { effort: 'low', format: { type: 'json_schema', schema } }`, nenhum parâmetro de amostragem (recusado pela API desde 2026-10-21), nenhum prefill, e trata `stop_reason: 'refusal'` como FALHA (RN-31).
- **Divergência corrigida (RF-038/RNF-05):** o SDK repete a chamada 2 vezes por padrão e trata timeout como repetível; com `LLM_TIMEOUT_MS` de 15 s a espera real chegava a 45 s. O pedido agora leva `maxRetries: 0`. Também: `LLM_MODELO` ou `LLM_TIMEOUT_MS` definidos vazios viravam modelo `''` e timeout de 0 ms; passam a valer como ausentes.
- **Testabilidade:** `criar()` aceita `sdk` injetado, e `tests/unidade/llm-anthropic.test.js` confere o pedido sem rede nem pacote: `T-LLM-ANTHROPIC-01` (modelo, esquema, effort, sem amostragem), `02` (timeout configurável, sem repetição, variáveis vazias) e `03` (timeout, recusa, resposta sem texto, JSON quebrado e confiança fora da faixa viram FALHA).
- **Propostas para a equipe, não aplicadas (decisão de mérito):** (1) o modelo atual da linha Opus é `claude-opus-5-5`, mais barato que o `claude-opus-5` da ADR-003; trocar exige rever a ADR. (2) A API oferece `fallbacks: "default"` (beta) para reexecutar uma recusa em outro modelo; hoje a recusa cai no formulário (RN-31), que é o comportamento especificado.

### Etapa 41 — Notificações por evento e central do usuário (T-66) · 2026-10-30

- **Conferência:** cada categoria de transição do RF-082 tem aviso no código. Faltava evidência de conjunto e não havia teste nenhum da central `/notificacoes` (RF-083).
- **Evidência nova** (`tests/integracao/notificacoes.test.js`): `T-NOTIF-MATRIZ-01/02/03` percorrem as nove categorias e conferem destinatário, vínculo com o agendamento e instante UTC; `T-NOTIF-03/04/05/07` (IDs da SPEC-004 §12) provam pela tela ordem decrescente e isolamento, marcar lidas com CSRF, só os avisos próprios e de forma idempotente, estado vazio e escape.
- **Matriz praticada pelo código** (proposta para a questão em aberto da SPEC-004 §13, **não aprovada**): quem age recebe a resposta na tela e a outra parte recebe o aviso; transição que muda a situação das duas partes avisa as duas.

| Transição | Destinatário | Tipo |
|---|---|---|
| Reserva | prestador | `RESERVA_RECEBIDA` |
| Confirmação manual / automática | cliente / cliente e prestador | `AGENDAMENTO_CONFIRMADO` |
| Recusa | cliente, com o motivo | `AGENDAMENTO_RECUSADO` |
| Expiração (LIBERAR) | cliente e prestador | `RESERVA_EXPIRADA` |
| Cancelamento | a outra parte | `AGENDAMENTO_CANCELADO` |
| No-show / no-show mútuo | quem foi acusado / as duas partes | `NO_SHOW_REGISTRADO` / `DISPUTA_ABERTA` |
| Conclusão | cliente e prestador | `AGENDAMENTO_CONCLUIDO` |
| Abertura / resolução de disputa | a outra parte / as duas partes | `DISPUTA_ABERTA` / `DISPUTA_RESOLVIDA` |
| Aprovação, reprovação, revisão, restrição, reativação, suspensão | o titular (revisão também os admins) | `CADASTRO_*`, `CONTA_*` |

- **Premissa do agente, a confirmar:** o desempate da central, aberto na SPEC-004 §13, passa a ser `id DESC` (a gravada por último primeiro), como o RF-031 faz na busca. Antes a ordem de dois avisos no mesmo instante ficava a critério do SQLite.
- **Verificação:** `npm test`, 358/358.

### Etapa 42 — Trilha de auditoria e tela do admin (T-67) · 2026-10-30

- **Método:** em vez de conferir fluxo por fluxo, `tests/integracao/auditoria-inv13.test.js` cria gatilhos temporários que espiam **toda** mudança de estado de agendamento, horário, conta e disputa (as quatro entidades do RF-084) e exige, para cada uma, registro em `log_auditoria` com a mesma entidade, id e estados.
- **Violações do INV-13 encontradas e corrigidas:** (1) a confirmação movia o horário `BLOQUEADO → OCUPADO` sem registro; (2) a conclusão (manual e automática) e o no-show moviam o horário `OCUPADO → ENCERRADO` sem registro; (3) abrir disputa movia o agendamento para `EM_DISPUTA` e a resolução o movia para o estado final, mas só a disputa era auditada. As três passam por `moverHorario()` em `agendamentos.js` e por registros `AGENDAMENTO_EM_DISPUTA` / `AGENDAMENTO_DECIDIDO_EM_DISPUTA` em `disputas.js`, com o ator real (cliente, prestador, admin ou `null` na rotina).
- **Tela:** a correlação (RNF-07) era gravada e nunca exibida, o que impedia reconstruir uma operação inteira (RF-085). `/admin/auditoria` ganhou a coluna "Correlação" e o filtro `?correlacao=`, que mostra tudo o que uma requisição gravou, na ordem.
- **Evidência:** `T-AUDIT-05` (reserva a disputa resolvida), `T-AUDIT-06` (recusa, cancelamento, cancelamento de horário livre, expiração, no-show, autoconclusão e expiração de horário pelas rotinas), `T-AUDIT-07` (cadastro, reputação, suspensão) e `T-AUDIT-08` (tela com ator, correlação e filtro).
- **Verificação:** `npm test`, 362/362.

### Etapa 43 — Conferência do código contra a SPEC-003 · 2026-10-30

- **Pedido:** conferir o código contra a SPEC-003 (aprovada na etapa 21), pendência do 2dart5 desde a etapa 28.
- **Resultado:** o código atende CA-01 a CA-07 e INV-001 a INV-006 sem alteração. Os oito testes da §12 foram escritos em `tests/integracao/spec-003-autorizacao.test.js`; o `T-AUTORIZ-02` percorre todas as rotas com os três perfis, o que liga cada linha da matriz §4.5 a uma rota (DoD 2). Spec sobe para v1.1.0 com a tabela de evidência na §12.
- **Divergências registradas na §13, sem correção:** a matriz admite o admin cancelar qualquer agendamento com justificativa, e não há esse caminho no código (decisão de regra da SPEC-017); e admite o admin ver o extrato de comissão, que hoje é só do prestador (SPEC-024).
- **Por que a issue #82 não fecha:** a DoD 1 exige resolver as questões da §13 que alteram comportamento. A auditoria das tentativas sobre recurso alheio e as duas linhas da matriz são decisão da equipe.

### Etapa 44 — Conferência do código contra a SPEC-004 · 2026-10-30

- **Resultado:** com os testes da etapa 41 (T-66) e três novos, todos os CA, INV e RNFs da SPEC-004 têm evidência; a Spec sobe para v1.1.0 com a tabela na §12. Novos: `T-NOTIF-01` (nada de aviso órfão; chave estrangeira recusa usuário inexistente), `T-NOTIF-09` (RNF-01, reabertura do banco em arquivo) e `T-NOTIF-10` (o aviso está na mesma transação da mudança de estado).
- **Sem alteração de código** além do desempate já registrado na etapa 41.
- **Por que a issue #83 não fecha:** a DoD 1 pede que a equipe aprove a matriz de eventos e decida atomicidade e paginação. A §13 agora traz a proposta de matriz (etapa 41), o fato sobre atomicidade (`T-NOTIF-10`) e a premissa de desempate, para a decisão ser tomada sobre o que o código já faz.

### Etapa 45 — Conferência do código contra a SPEC-005 · 2026-10-30

- **Divergência grave corrigida (CA-07, INV-002):** `aprovarPrestador()` aceitava qualquer conta cuja máquina de estados permitisse ir para `ATIVO`. Como `SUSPENSO`, `EM_REVISAO` e `RESTRITO` vão para `ATIVO` pelo RF-079, um POST em `/admin/contas/:id/aprovar` reativava conta suspensa, até de cliente, **sem justificativa**, e a auditoria registrava `PRESTADOR_APROVADO`. O formulário só aparecia para pendentes, mas a rota aceitava qualquer id. Aprovar e reprovar agora passam por `carregarCadastroPendente()`, que exige prestador em `PENDENTE_APROVACAO` e recusa com RF-008 / RF-009 apontando o caminho certo.
- **Divergência corrigida (CA-02):** sem pendências, a seção da fila desaparecia; agora mostra estado vazio.
- **Evidência:** os oito testes da §12 em `tests/integracao/spec-005-moderacao.test.js`; Spec em v1.1.0 com a tabela. Observação sem correção: o pendente que tenta publicar é barrado com RN-28 (regra específica do cadastro pendente), não com a RN-08 citada no CA-08; as duas regras vedam a publicação.
- **Por que a issue #84 não fecha:** a DoD 1 depende das questões da §13 que mudam o critério de decisão — se 10 caracteres de justificativa é regra de produto, e se o RF-003 ("notificar a fila de moderação") exige aviso ao admin além da fila consultável.
- **Verificação:** `npm test`, 381/381.

### Etapa 46 — Rascunho e conferência da SPEC-010 · 2026-10-30

- **Critério desta série (etapas 46 a 60):** a pedido do 2dart5, cada Spec ainda inexistente da Trilha B e da Trilha C é escrita como **rascunho v0.1.0**, conferida contra o código e completada com os testes da §12. Divergência do código em relação à baseline **já aprovada** (`docs/spec.md`, constituição, ADRs) é corrigida, como manda a OPEN-01; o que exigiria regra nova vira questão da §13. Nenhuma Spec é aprovada por esta série, e as issues recebem `Refs`, não `Closes`.
- **SPEC-010:** [`SPEC-010-publicacao-de-horario-vago.md`](SPEC-010-publicacao-de-horario-vago.md), RF-014 a RF-016.
- **Divergência corrigida:** INV-02 (sem sobreposição) só era barrado no domínio. O gatilho `horario_sem_sobreposicao` em `schema.sql` recusa no banco a gravação sobreposta; só no `INSERT`, porque nenhuma transição leva horário inativo de volta a ativo. Seed refeito do zero num banco temporário para provar.
- **Evidência:** `T-PUBLICACAO-01` a `07`. Questões: OPEN-09 (editar horário vago) e passo de minutos da hora de início.

### Etapa 47 — Rascunho e conferência da SPEC-012 · 2026-10-30

- **SPEC-012:** [`SPEC-012-manutencao-da-agenda.md`](SPEC-012-manutencao-da-agenda.md), RF-022 e RF-023.
- **Divergências corrigidas:** (1) `deLocalParaUtc()` aceitava `25:00`, `10:75` e `31/02`; o `Date.UTC` transbordava e o horário era publicado **em outro dia**, sem aviso. A conversão agora recusa o que não existe no calendário. (2) A entrada inválida subia como `TypeError` e virava erro 500 sem regra; `publicar()` a devolve como `ErroDeValidacao` no campo `hora`. (3) O relato do lote na tela trazia a regra só da primeira recusa; agora cada item mostra `hora (REGRA: motivo)`.
- **Evidência:** `T-AGENDA-01` a `05`. Questão: formato e limite do lote.
- **Verificação:** `npm test`, 393/393.

### Etapa 48 — Rascunho e conferência da SPEC-013 · 2026-10-30

- **SPEC-013:** [`SPEC-013-busca-por-filtros.md`](SPEC-013-busca-por-filtros.md), RF-028 a RF-031.
- **Divergência corrigida (UC-03 1a):** sem janela informada, a busca olhava as próximas **72 h**; a baseline diz **24 h**. Não há decisão registrada para as 72 h, que vinham do código anterior às Specs (`a653fa7`). O padrão vira `JANELA_PADRAO_H = 24` em `aplicacao/busca.js`, e a home e o estado vazio leem a constante em vez de repetir "72". **Mudança visível:** a home e a busca sem filtro passam a mostrar menos horários; se a equipe preferir 72 h, muda-se a spec.
- **Divergência corrigida (RF-028):** o formulário não tinha campo de janela; ela só chegava pela descrição ao LLM, o que deixava a busca por filtros sem um dos três filtros do RF. Campo "Quando" (6 a 72 h) adicionado; a escolha no formulário vale mais que a janela extraída da descrição. Conferido no navegador a 800 e a 375 px, sem rolagem lateral.
- **Evidência:** `T-BUSCA-02` a `08`; `T-BUSCA-08` mede RNF-05 com 131 horários nos quatro critérios. Questão mantida: o corte de 200 (etapa 35).

### Etapa 49 — Rascunho e conferência da SPEC-014 · 2026-10-30

- **SPEC-014:** [`SPEC-014-reserva-preco-travado-exclusividade.md`](SPEC-014-reserva-preco-travado-exclusividade.md), RF-017, RF-039 a RF-041 e RF-047.
- **Conferência:** `reservar()` atende todos os RF, com recusa por regra e a reserva inteira numa transação. INV-01 já tinha o índice único parcial.
- **Divergência corrigida:** INV-03 (valor travado imutável) e INV-04 (valor travado ≥ piso) só eram garantidas no domínio. Gatilhos `agendamento_valor_travado_imutavel` e `agendamento_respeita_piso` em `schema.sql`. Seed refeito do zero.
- **Evidência:** `T-RESERVA-07` a `12`, mais os testes de reserva anteriores. Questão: RF-017 é atendido porque não existe edição de horário (OPEN-09).
- **Verificação:** `npm test`, 403/403.

### Etapa 50 — Rascunho e conferência da SPEC-015 · 2026-10-30

- **SPEC-015:** [`SPEC-015-confirmacao-e-recusa.md`](SPEC-015-confirmacao-e-recusa.md), RF-042 a RF-044.
- **Divergências corrigidas:** (1) **RN-11:** a recusa deveria contar na "taxa de recusa exibida ao admin", que não existia. `admin.dossieDaConta()` compõe recusas e taxa sobre as reservas recebidas (`respostasDoPrestador()`), e o dossiê do prestador mostra a métrica; o perfil público não. (2) **UC-06 1a:** `recusar()` não conferia o prazo de confirmação; chamada fora da rota aceitava recusa depois do prazo, cujo desfecho é da política P-02.
- **Evidência:** `T-CONFIRMA-01` a `04`, além de `T-AGENDAMENTO-06` a `07c` (T-33). Questões: janela da taxa de recusa e o mínimo de 5 caracteres do motivo.
- **Verificação:** `npm test`, 407/407.

### Etapa 51 — Rascunho e conferência da SPEC-016 · 2026-10-30

- **SPEC-016:** [`SPEC-016-expiracao-automatica-da-reserva.md`](SPEC-016-expiracao-automatica-da-reserva.md), RF-044 a RF-046.
- **Divergência corrigida:** o aviso de expiração ao cliente dizia sempre que o horário voltou para a busca, inclusive quando ele expirava por falta da antecedência P-04 (RF-044). O texto agora segue o destino real do horário.
- **Evidência:** `T-EXPIRA-05` a `08` (leitura pela rota, avisos, autoconfirmação com ator sistema, idempotência), além de `T-EXPIRA-01` a `04`. Questões: OPEN-19 e o intervalo de 15 s da rota.

### Etapa 52 — Rascunho e conferência da SPEC-017 · 2026-10-30

- **SPEC-017:** [`SPEC-017-cancelamento-com-penalidade.md`](SPEC-017-cancelamento-com-penalidade.md), RF-048 a RF-051.
- **Divergência corrigida (RF-051):** o aviso à outra parte trazia faixa e motivo, mas não o efeito na reputação de quem cancelou. O horário cancelado pelo prestador passa por `moverHorario()` (etapa 42) em vez de repetir a auditoria.
- **Evidência:** `T-CANCEL-08` a `11`, além dos `T-CANCEL-01` a `07` e `01i` a `05i`. Questões: cancelamento pelo admin (OPEN-09), OPEN-18 e a tensão RN-19 × RN-21 sobre a faixa livre.

### Etapa 53 — Rascunho e conferência da SPEC-018 · 2026-10-30

- **SPEC-018:** [`SPEC-018-revisao-por-ocorrencias.md`](SPEC-018-revisao-por-ocorrencias.md), RF-056.
- **Divergência corrigida:** `verificarOcorrenciasDoPrestador()` não conferia o perfil. Os três chamadores atuais só a usam para prestador, mas, chamada para um cliente com três ausências, ela o moveria para `EM_REVISAO` com o aviso "publicação de horários suspensa". A RN-21 é regra do prestador; a função agora ignora outros perfis.
- **Evidência:** `T-REVISAO-03` a `05`, além de `T-REVISAO-01`. Questões: "consecutivas" × acumuladas, e se a reativação pelo admin zera a contagem.

### Etapa 54 — Rascunho e conferência da SPEC-019 · 2026-10-30

- **SPEC-019:** [`SPEC-019-registro-de-no-show.md`](SPEC-019-registro-de-no-show.md), RF-052 a RF-054.
- **Divergência corrigida (RF-052):** o reporte sobre agendamento fora de `CONFIRMADO` era recusado sem informar a janela válida; agora a recusa traz a janela, como nos outros dois casos.
- **Questão nova, para a Trilha A:** as faixas permitem P-17 (conclusão automática) menor que P-16b (prazo de no-show); a rotina então conclui o agendamento com a janela de no-show ainda aberta. Proposta registrada na §13 da SPEC-019, sem alteração de código, porque a regra é da SPEC-020, aprovada.
- **Evidência:** `T-NOSHOW-05` a `07`, além de `T-NOSHOW-01i` a `03`.

### Etapa 55 — Rascunho e conferência da SPEC-022 · 2026-10-30

- **SPEC-022:** [`SPEC-022-abertura-de-disputa.md`](SPEC-022-abertura-de-disputa.md), RF-055 e RF-071 a RF-073.
- **Divergências corrigidas:** (1) INV-12 (comissão de agendamento em disputa nunca `EFETIVADO`) só existia no domínio; gatilhos `comissao_sem_efetivar_em_disputa_insert/update` em `schema.sql`, com seed refeito do zero. (2) RF-072: sem motivo e sem evidência, a recusa citava só o motivo; agora cita os dois.
- **Evidência:** `T-DISPUTA-08` a `11`. Questões: OPEN-07 (o código pratica "abre quem acusa por último"), OPEN-17 e evidência em arquivo.
- **Verificação:** `npm test`, 425/425.
