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
| SPEC-001 Fundação | **Aprovada** (v1.0.0, etapa 11); v1.1.0 com as decisões da etapa 22. Falta a conferência do código (Trilha A) |
| SPEC-002 Cadastro e autenticação | **Aprovada**; v1.2.0 com as decisões das OPEN-12/202/203 (etapa 12) e OPEN-01/02/210 (etapa 14). **Código conferido e corrigido** (etapa 15): CA-01 a CA-12 com teste |
| SPEC-003 Autorização por perfil e titularidade | **Aprovada** (v1.0.0, etapa 21) em [`SPEC-003-autorizacao-por-perfil-e-titularidade.md`](SPEC-003-autorizacao-por-perfil-e-titularidade.md); questões da §13 seguem abertas |
| SPEC-004 Notificações por evento e central do usuário | **Aprovada** (v1.0.0, etapa 21) em [`SPEC-004-notificacoes-por-evento-e-central-do-usuario.md`](SPEC-004-notificacoes-por-evento-e-central-do-usuario.md); questões da §13 seguem abertas |
| SPEC-005 Aprovação e reprovação de prestador | **Aprovada** (v1.0.0, etapa 21) em [`SPEC-005-aprovacao-e-reprovacao-de-prestador.md`](SPEC-005-aprovacao-e-reprovacao-de-prestador.md); questões da §13 seguem abertas |
| Próxima etapa | Conferir o código contra as SPEC-003, 004 e 005 (Trilha C, 2dart5). Próxima Spec a gerar: SPEC-006 (Trilha A) |
| Layout da SPEC-002 | 8 telas de celular, [canvas](https://claude.ai/artifact/RNxkqRrx1kn9TQ3F8wuZrW) e fontes em `docs/specs/layouts/SPEC-002/`; **aprovado** (etapa 23); canal de contato definido na etapa 25 |
| Layout da SPEC-001 | Não se aplica: a Fundação não tem tela (SPEC-001 §8) |
| Identidade visual | **Aprovada e aplicada no site** (etapa 10). [Guia](https://claude.ai/artifact/5Nzrg1ZKrp2H8EREk4p9YX) e arquivos em `docs/identidade-visual/` |
| Código (`src/interface/http/`, `public/`) | Marca nova (etapa 10) e fonte da marca no site inteiro (etapa 11). Suíte: 208/208 na etapa 25 |
| Baseline (`spec.md`, ADRs) | `docs/spec.md` v0.1.9; histórico das alterações nas etapas 7, 12, 14, 22, 24 e 25 |
| Código (`src/`, `tests/`) | Commitado na branch (`a653fa7`). Conferido Spec por Spec contra as Specs aprovadas e corrigido onde diverge (OPEN-01, etapa 14) |
| Commits do processo SDD | Na `main`: branch SDD pelo PR #109, Trilha A pelos PRs #110 e #114 (etapa 20); SPEC-003 a 005 vindas da branch `specs-duarte` (etapa 21) |
| Issues no GitHub | 59 fechadas, 48 abertas em 2026-10-20 (gostislavs 18, 2dart5 30, porque assumiu também a Trilha C); #79 decisões, #80–#108 uma por Spec (etapas 13 e 20) |
| Documento de passagem | `docs/proximos-passos.docx` (etapa 13) |

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

### Etapa 25 — Correções aprovadas da SPEC-001 e rascunho da SPEC-006 · 2026-10-21

- **Pedido (gostislavs):** executar todas as tarefas possíveis da Trilha A após os merges de Enzo, sem aprovar regras por conta própria.
- **Decisões:** nenhuma nova. Usadas as decisões A–E aprovadas por Enzo na etapa 22; SPEC-001 v1.1.0 e baseline v0.1.8.
- **Branch de correção:** `gostislavs-spec001-fix` (base `main`). Ajustes de P-07 (0,5 h), remoção de transições/estado `RASCUNHO` não previstos, P-01/P-02 globais herdados ao cadastrar novo prestador e proteção de banco novo/legado; testes `T-PARAM-05`, `T-PARAM-07` e `T-ESTADO-01..03`.
- **Evidência:** `evidencias-trilha-a-spec001-alinhamento-20261021.md` registra cobertura parcial, migração conservadora e pendências. Não fechar #9/#80 antes de conferir todos os CA e INV, CI e revisão.
- **Próxima Spec:** rascunho completo da SPEC-006 preparado na branch `gostislavs-spec006-rascunho` (base `main`) com 14 seções; aguarda aprovação explícita de Enzo/equipe e questões da §13. Nenhuma regra de reputação foi modificada por esse rascunho.
- **Ainda pendente:** P-22 e classificação/notificação aguardam SPEC-006; máquina/auditoria financeira aguardam fluxo de SPEC-020/022/023; P-17 congelada no nascimento da obrigação exige alinhar SPEC-020. Não foram tomadas decisões implícitas.
- **Verificação:** commits enviados ao GitHub; resultados de CI da nova branch devem ser anexados após a execução. Não confundir testes escritos com testes executados.
