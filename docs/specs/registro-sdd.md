# Registro do processo SDD — Encaixe

> Diário das etapas do roteiro de Spec-Driven Development (*Prompt de apoio para SDD*), em ordem
> cronológica. Cada etapa registra o que foi pedido, o que foi produzido, o que foi decidido e por quem,
> e o que ficou pendente. **Toda etapa nova é registrada aqui no mesmo momento em que é feita.**

| Campo | Valor |
|---|---|
| Início | 2026-10-01 |
| Roteiro seguido | `Prompt_SDD_Specs.pdf` (3 páginas: prompt de decomposição, prompt de Spec individual, regra fundamental) |
| Baseline | `docs/spec.md` v0.1.5 · `docs/plan.md` v1.0.0 · ADR-001 a ADR-006 (ADR-004 revisado) · constituição |
| Autorização vigente | A equipe autorizou (etapa 7) atualizar a baseline sempre que uma ação for realizada no projeto. **Decisões de mérito** (`OPEN-XX`, reordenação, recomendações) continuam exigindo aprovação explícita |

---

## Estado atual (resumo)

| Item | Situação |
|---|---|
| Mapa de Specs | **Aprovado** (v1.0.0, etapa 11), na ordem original |
| SPEC-001 Fundação | **Aprovada** (v1.0.0, etapa 11) |
| SPEC-002 Cadastro e autenticação | **Aprovada**; v1.1.0 com as decisões das OPEN-12/202/203 (etapa 12). OPEN-210 segue aberta |
| Próxima Spec | SPEC-003 Autorização por perfil e titularidade |
| Layout da SPEC-002 | 8 telas de celular, [canvas](https://claude.ai/artifact/RNxkqRrx1kn9TQ3F8wuZrW) e fontes em `docs/specs/layouts/SPEC-002/`; aguardando aprovação (etapa 8) |
| Layout da SPEC-001 | Não se aplica: a Fundação não tem tela (SPEC-001 §8) |
| Identidade visual | **Aprovada e aplicada no site** (etapa 10). [Guia](https://claude.ai/artifact/5Nzrg1ZKrp2H8EREk4p9YX) e arquivos em `docs/identidade-visual/` |
| Código (`src/interface/http/`, `public/`) | Marca nova (etapa 10) e fonte da marca no site inteiro (etapa 11). Suíte: 141/141 |
| Baseline (`spec.md`, ADRs) | Atualizada para refletir o processo (spec v0.1.4, etapa 7). Nenhuma regra, requisito ou estado foi alterado |
| Código (`src/`, `tests/`) | Ainda não commitado. Só a marca foi alterada (linha abaixo); o resto depende da OPEN-01 |
| Commits do processo SDD | Nenhum |

### Decisões humanas pendentes

| ID | Assunto | Onde |
|---|---|---|
| OPEN-01 | Código existente: verificar contra as Specs ou reimplementar | mapa §3 |
| OPEN-04 | ~~Spec §13 desatualizada~~ resolvida na v0.1.4 (QA-10 segue aberta) | mapa §3 |
| OPEN-02 | Nomenclatura RB/RN e INV-001/INV-xx | mapa §3 |
| ~~OPEN-12~~ | resolvida na etapa 12: 2 h de inatividade, teto de 12 h | ADR-004 |
| ~~OPEN-202~~ | resolvida na etapa 12: todos autenticam, exceto `SUSPENSO` | spec v0.1.5 |
| ~~OPEN-203~~ | resolvida na etapa 12: suspensa não autentica, mensagem própria | spec v0.1.5 |
| Divergências da SPEC-002 no código | `autenticar()` e `sessao.js` contrariam CA-08, CA-09a/b e CA-11; correção depende da OPEN-01 | etapa 12 |
| ~~Reordenação~~ | decidida na etapa 11: não reordenar | etapa 11 |
| OPEN-210 | O que acontece logo depois do cadastro (código autentica direto) | SPEC-002 §13 |
| Layout | Aprovação das 8 telas | etapa 8 |
| ~~Identidade visual~~ | aprovada na etapa 10; resta só trocar a arte do `og.jpg` (opcional) | etapa 10 |
| Demais OPEN | 21 no mapa, 5 na SPEC-001, 9 na SPEC-002 | arquivos respectivos |

### Premissas adotadas pelo agente, ainda sem confirmação humana

| # | Premissa | Por quê | Onde aparece |
|---|---|---|---|
| ~~PA-01~~ | ~~O pedido "Gerar SPEC-001" foi tratado como aprovação do mapa~~ **confirmada**: mapa aprovado explicitamente na etapa 11 | o roteiro só permite gerar Specs depois da aprovação do mapa | status do mapa |
| PA-02 | Os IDs da baseline foram mantidos (`RN-xx` como "RB") | evitar renumerar 34 regras sem decisão (OPEN-02) | mapa, todas as Specs |
| PA-03 | Os invariantes de cada Spec usam numeração local `INV-001`, citando o `INV-xx` global coberto | o roteiro pede `INV-001`; a baseline já usa `INV-01..14` | SPEC-001 §6, SPEC-002 §6 |
| PA-04 | Os "drivers arquiteturais" foram lidos como as restrições do enunciado (spec §1.5) mais os princípios da constituição | a baseline não tem seção formal de drivers (OPEN-03) | mapa, todas as Specs |
| PA-05 | Os nomes de teste propostos seguem a convenção do projeto, com sufixos para não colidir (`T-CONTA-01a`) | os IDs `T-CONTA-01..04` já estão reservados na matriz da spec §11 | SPEC-002 §12 |

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
