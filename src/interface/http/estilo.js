/**
 * Folha de estilo unica, servida em /estatico/estilo.css.
 * Fica em JS para o projeto continuar sem etapa de build (ADR-001).
 *
 * Organizacao: tokens -> base -> primitivas de layout -> componentes ->
 * camada de acabamento (hero, movimento) -> responsivo.
 *
 * Nenhuma regra de negocio depende de classe daqui. Com o CSS fora do ar a
 * pagina continua legivel, porque o HTML por baixo e semantico.
 */

/** Tema escuro azulado: "Azul-escuro" e o "seguir o sistema" no escuro. */
const TOKENS_AZUL = `
  --fundo: #0a1122;
  --fundo-fundo: #070c19;
  --superficie: #101a31;
  --superficie-2: #16223d;
  --superficie-3: #1f2c4a;
  --borda: #1d2945;
  --borda-forte: #324164;
  --texto: #eef0f7;
  --texto-fraco: #a7aec5;
  --texto-tenue: #868da4;

  --primaria: #8b90ff;
  --primaria-forte: #a8acff;
  --primaria-fraca: #1c2248;
  --acento: #fb923c;
  --acento-forte: #fdba74;
  --acento-fraco: #35210f;

  --sobre-primaria: #14162a;
  --sobre-acento: #2a1508;
  --sobre-perigo: #2b0f0d;

  --ok: #5cd39a;
  --ok-fraco: #143026;
  --aviso: #efc069;
  --aviso-fraco: #362c13;
  --perigo: #ff8a80;
  --perigo-fraco: #381c1b;
  --info: #7cc7ec;
  --info-fraco: #112c3a;

  --desconto: #fdba74;
  --desconto-fraco: #3a2211;
  --desconto-borda: #5d3a1a;

  --sombra: none;
  --sombra-alta: 0 2px 4px rgba(0,0,0,.3), 0 16px 38px rgba(0,0,0,.42);
  --sombra-flutuante: 0 20px 55px -14px rgba(0,0,0,.72);
`;

/** Preto: so as superficies e bordas mudam; marca e estados herdam do azul. */
const TOKENS_PRETO = `
  --fundo: #000000;
  --fundo-fundo: #000000;
  --superficie: #0d0d10;
  --superficie-2: #16161a;
  --superficie-3: #202025;
  --borda: #26262c;
  --borda-forte: #3b3b43;
  --primaria-fraca: #1d1f3a;
`;

/** O mesmo corte de movimento serve ao sistema operacional e a preferencia do site. */
const SEM_MOVIMENTO = `
  [data-revelar] { opacity: 1 !important; transform: none !important; transition: none !important; }
  .marca-simbolo .peca-movel { transform: none !important; opacity: 1 !important; }
  *, *::before, *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
    scroll-behavior: auto !important;
  }
`;

/** RF-093: os mesmos seletores, valendo so com <html data-movimento="reduzido">. */
const SEM_MOVIMENTO_ESCOLHIDO = SEM_MOVIMENTO.replace(/^  (.+?) \{/gm, (_, sel) => '  ' + sel.split(', ')
  .map((x) => ':root[data-movimento="reduzido"] ' + x).join(', ') + ' {');

export const CSS = `
/* ==============================================================
   0. FONTE DA MARCA
   Bricolage Grotesque variavel (pesos 400-800, eixo optico 12-96),
   subconjunto latino, servida de public/ (ADR-006). Nada vem de rede
   externa: o site continua rodando offline, como exige o ADR-001.
   Sem o arquivo, a pilha de --fonte cai na fonte do sistema.
   ============================================================== */
@font-face {
  font-family: "Bricolage Grotesque";
  src: url("/estatico/bricolage-grotesque.woff2") format("woff2");
  font-weight: 400 800;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* ==============================================================
   1. TOKENS
   Um unico lugar decide cor, ritmo, raio e sombra. Tela que
   precisa de um valor novo ganha um token, nao um numero solto.
   ============================================================== */
:root {
  /* --- superficies e texto ---
     Neutro quase sem matiz, um passo para o quente: o cinza-lavanda de antes
     (etapa 67) somado ao indigo deixava o site com cara de painel SaaS. A
     superficie se separa do fundo pelo tom, nao por sombra. */
  --fundo: #f7f5ef;
  --fundo-fundo: #eeebe2;
  --superficie: #ffffff;
  --superficie-2: #f2efe7;
  --superficie-3: #e7e3d9;
  --borda: #e6e1d6;
  --borda-forte: #cbc5b8;
  --texto: #15161c;
  --texto-fraco: #4f515b;
  --texto-tenue: #686a73;

  /* --- marca --- */
  --primaria: #3b41c5;
  --primaria-forte: #2b30a0;
  --primaria-fraca: #ebecfa;
  /* Campo da marca: o indigo escuro nos tres temas. No escuro a --primaria-forte
     clareia e o texto branco do campo deixava de ser legivel. */
  --campo-marca: #2b30a0;
  --acento: #f97316;
  --acento-forte: #c2530a;
  --acento-fraco: #fff0e2;

  /* Texto que pousa sobre a cor cheia. No tema escuro a marca clareia,
     entao o branco deixa de ser legivel e a polaridade inverte. */
  --sobre-primaria: #ffffff;
  --sobre-acento: #3d1a02;
  --sobre-perigo: #ffffff;

  /* --- semantica de estado --- */
  --ok: #0f7245;
  --ok-fraco: #e0f4ea;
  --aviso: #8f5c09;
  --aviso-fraco: #fdf1da;
  --perigo: #b3261e;
  --perigo-fraco: #fdeceb;
  --info: #0d5980;
  --info-fraco: #e3f1f9;

  /* --- oportunidade ---
     Preco que cai NAO e alerta: usa a luz quente da marca, nunca o
     vermelho de perigo. E o par visual do gradiente do hero. */
  --desconto: #9c4208;
  --desconto-fraco: #ffeedd;
  --desconto-borda: #f6c99e;

  /* --- tipografia --- */
  --fonte: "Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --fonte-mono: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  /* Piso de 13 px: regra, prazo e penalidade nao podem morar em letra minuscula. */
  --txt-mini: 0.8125rem;
  --txt-peq: 0.875rem;
  --txt-corpo: 1rem;
  --txt-md: 1.125rem;
  --txt-lg: 1.25rem;
  --txt-xl: 1.5rem;
  --txt-2xl: 2rem;
  /* Titulo de secao publica e titulo do hero: os dois tamanhos grandes do site. */
  --txt-3xl: clamp(1.75rem, 1.1rem + 2.2vw, 2.75rem);
  --txt-display: clamp(2.25rem, 1.1rem + 3.6vw, 3.875rem);

  /* --- ritmo vertical e horizontal --- */
  --e1: 4px;  --e2: 8px;  --e3: 12px; --e4: 16px;
  --e5: 24px; --e6: 32px; --e7: 48px; --e8: 72px;
  /* Distancia entre secoes da pagina publica: maior que qualquer folga interna. */
  --e9: 128px;

  /* --- forma ---
     Botao e chip sao pilula, como as faixas arredondadas do "E de agenda";
     cartao e campo usam o raio medio. */
  --raio-p: 10px;
  --raio: 16px;
  --raio-g: 24px;
  --pilula: 999px;
  --largura: 1200px;

  /* --- profundidade ---
     Nada em repouso tem sombra: so o que de fato flutua (o "pular para o
     conteudo", a aba de foco). Cartao se separa do fundo pelo tom. */
  --sombra: none;
  --sombra-alta: 0 1px 2px rgba(21,22,28,.06), 0 10px 30px -12px rgba(21,22,28,.16);
  --sombra-flutuante: 0 18px 50px -14px rgba(21,22,28,.28);

  /* --- movimento --- */
  --mola: cubic-bezier(.22,.68,.36,1);
  --rapido: .18s var(--mola);
  --medio: .32s var(--mola);
  /* Hover de cartao: acende e apaga devagar, sem o "estalo" do --rapido. */
  --suave: .45s cubic-bezier(.4,0,.2,1);
}

/* RF-093 (SPEC-030): "seguir o sistema" usa o azul-escuro quando o sistema
   esta escuro; a escolha explicita no <html data-tema> vence o sistema. */
@media (prefers-color-scheme: dark) {
  :root:not([data-tema]) { ${TOKENS_AZUL} color-scheme: dark; }
}
:root[data-tema="claro"] { color-scheme: light; }
:root[data-tema="azul"] { ${TOKENS_AZUL} color-scheme: dark; }
/* Preto de verdade nas superficies: em tela OLED, pixel preto e pixel apagado. */
:root[data-tema="preto"] { ${TOKENS_AZUL} ${TOKENS_PRETO} color-scheme: dark; }

/* ==============================================================
   2. BASE
   ============================================================== */
* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--fundo);
  color: var(--texto);
  font-family: var(--fonte);
  font-size: var(--txt-corpo);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  /* O rodape encosta no fim mesmo em pagina curta. */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
body > main { flex: 1 0 auto; }

body, .cartao, td, th, .aviso, .vazio { overflow-wrap: break-word; }
code { overflow-wrap: anywhere; }

a { color: var(--primaria); text-decoration: none; }
a:hover { text-decoration: underline; }

h1, h2, h3, h4 {
  text-wrap: balance;
  letter-spacing: -.022em;
  line-height: 1.18;
  font-weight: 700;
}
p { text-wrap: pretty; }

h2 { font-size: var(--txt-xl); margin: var(--e7) 0 var(--e3); }
h3 { font-size: var(--txt-md); margin: var(--e5) 0 var(--e2); }
h4 { font-size: var(--txt-corpo); margin: var(--e4) 0 var(--e1); }

code { font-family: var(--fonte-mono); font-size: .92em; }
img { max-width: 100%; }

:focus-visible {
  outline: 2px solid var(--primaria);
  outline-offset: 2px;
  border-radius: var(--raio-p);
}
::selection { background: var(--primaria-fraca); color: var(--primaria-forte); }

/* Numero, preco e horario sempre com digito de largura fixa: coluna que
   nao "treme" quando o valor muda. */
.preco-vigente, .preco-base, .metrica .valor, .selo-regra, .regra-nota code,
.vaga-quando, .agenda-aberta-hora, .agenda-aberta-preco, .regua-preco, .num, td, th {
  font-variant-numeric: tabular-nums;
}

/* Texto so para leitor de tela: nomeia acao que o icone ja resolve no visual. */
.so-leitor {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;
}

/* Primeiro alvo do Tab: pula o cabecalho inteiro. */
.pular {
  position: fixed; left: var(--e3); top: -64px; z-index: 60;
  background: var(--primaria); color: var(--sobre-primaria);
  padding: 10px 16px; border-radius: var(--raio-p); font-weight: 600;
  transition: top var(--rapido);
}
.pular:focus { top: var(--e3); text-decoration: none; }

/* ==============================================================
   3. CABECALHO E NAVEGACAO
   Uma linha no desktop; no celular vira cabecalho compacto + trilha
   de abas rolavel. Nenhuma parte depende de JavaScript para abrir.
   ============================================================== */
.topo {
  position: sticky; top: 0; z-index: 20;
  /* Sem backdrop-filter: o desfoque refazia a pintura do cabecalho a cada
     quadro de rolagem e travava o hero em maquina fraca. A barra tem a cor
     do fundo: e a pagina que continua, nao uma faixa a parte. */
  background: var(--fundo);
  border-bottom: 1px solid transparent;
  transition: border-color var(--medio);
}
.topo.rolado { border-bottom-color: var(--borda); }

.topo-interno {
  max-width: var(--largura); margin: 0 auto; padding: 0 var(--e5);
  display: flex; align-items: center; gap: var(--e5); min-height: 68px;
}

.marca {
  display: inline-flex; align-items: center; gap: 9px;
  font-weight: 750; font-size: 1.1875rem; letter-spacing: -.03em;
  color: var(--texto); flex-shrink: 0;
}
.marca:hover { text-decoration: none; }
.marca-simbolo { display: block; width: 28px; height: 28px; flex-shrink: 0; }
/* A palavra ja vem em curvas (Bricolage Grotesque 700): herda a cor do texto. */
.marca-palavra { display: block; height: 19px; width: auto; color: var(--texto); }
/* A faixa do meio desliza da direita e para na folga do E: o "encaixe". */
.marca-simbolo .peca-movel { animation: encaixar 6s var(--mola) infinite; }
@keyframes encaixar {
  0%, 10%   { transform: translate(9px, 0); opacity: .45; }
  32%, 88%  { transform: translate(0, 0); opacity: 1; }
  100%      { transform: translate(9px, 0); opacity: .45; }
}

.nav { display: flex; align-items: center; gap: 2px; margin-left: auto; min-width: 0; }
.nav a {
  color: var(--texto-fraco); padding: 9px 14px; border-radius: var(--pilula);
  font-size: var(--txt-peq); font-weight: 600; white-space: nowrap;
  transition: background var(--rapido), color var(--rapido);
}
/* Todo item de texto do cabecalho (abas, Avisos, nome, sair) segue um padrao
   so: sem fundo nem contorno; no hover um sublinhado cresce da esquerda para
   a direita e, ao sair, recolhe pela direita. A pagina atual fica com ele
   aceso. Fundo cheio e so da acao. */
.nav a:not(.nav-acao), .sino, .nav-perfil a { position: relative; }
.nav a:not(.nav-acao)::after, .sino::after, .nav-perfil a::after {
  content: ""; position: absolute; left: 14px; right: 14px; bottom: 4px; height: 2px;
  border-radius: 2px; background: currentColor; pointer-events: none;
  transform: scaleX(0); transform-origin: 100% 50%;
  transition: transform var(--medio);
}
.nav a:not(.nav-acao):hover, .sino:hover, .nav-perfil a:hover { color: var(--texto); text-decoration: none; }
.nav a:not(.nav-acao):hover::after, .nav a:not(.nav-acao):focus-visible::after, .nav a[aria-current="page"]::after,
.sino:hover::after, .sino:focus-visible::after, .nav-perfil a:hover::after, .nav-perfil a:focus-visible::after {
  transform: scaleX(1); transform-origin: 0 50%;
}
.nav a[aria-current="page"] { color: var(--texto); }
/* A acao do visitante (criar conta) e a unica do cabecalho com a cor da marca. */
.nav a.nav-acao { background: var(--primaria); color: var(--sobre-primaria); margin-left: var(--e1); }
.nav a.nav-acao:hover { background: var(--primaria-forte); color: var(--sobre-primaria); }

.topo-conta {
  display: flex; align-items: center; gap: var(--e3);
  margin-left: var(--e3); padding-left: var(--e3);
  border-left: 1px solid var(--borda); flex-shrink: 0;
}
.nav-perfil {
  display: flex; align-items: center; gap: var(--e2);
  font-size: var(--txt-peq); color: var(--texto-fraco); white-space: nowrap;
}
.nav-perfil .quem {
  display: inline-flex; align-items: center; gap: 7px;
  font-weight: 600; color: var(--texto); padding: 9px 0;
  transition: color var(--rapido);
}
.nav-perfil .quem::after { left: 35px; right: 0; }
.nav-perfil > a:not(.quem) { padding: 9px 0; font-weight: 600; color: var(--texto-fraco); }
.nav-perfil > a:not(.quem)::after { left: 0; right: 0; }

/* RF-088 / RF-090: foto de perfil, ou as iniciais sobre a cor da marca. */
.avatar {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  border-radius: 50%; object-fit: cover; overflow: hidden;
  background: var(--primaria-fraca); color: var(--primaria-forte);
  font-weight: 750; letter-spacing: -.02em; line-height: 1;
}
.avatar-p { width: 28px; height: 28px; font-size: 11px; }
.avatar-m { width: 44px; height: 44px; font-size: 15px; }
.avatar-g { width: 88px; height: 88px; font-size: 30px; box-shadow: 0 0 0 4px var(--superficie), 0 0 0 5px var(--borda); }

.sino {
  position: relative; display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 14px;
  color: var(--texto-fraco);
  font-size: var(--txt-peq); font-weight: 600;
}
.sino svg { width: 15px; height: 15px; }
.sino-contador {
  background: var(--acento); color: var(--sobre-acento);
  font-size: 11px; font-weight: 700; line-height: 1.5;
  border-radius: var(--pilula); padding: 0 6px; min-width: 18px; text-align: center;
}

/* ==============================================================
   4. ESTRUTURA DE PAGINA
   ============================================================== */
.pagina { width: 100%; max-width: var(--largura); margin: 0 auto; padding: var(--e6) var(--e5) var(--e8); }
.pagina-estreita { max-width: 640px; }

.cabecalho-pagina { margin-bottom: var(--e5); }
.cabecalho-pagina h1 { margin: 0 0 var(--e2); font-size: var(--txt-2xl); letter-spacing: -.032em; }
.cabecalho-pagina p { margin: 0; color: var(--texto-fraco); max-width: 64ch; }

.secao-titulo {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: var(--e4); flex-wrap: wrap; margin: var(--e7) 0 var(--e4);
}
.secao-titulo:first-child { margin-top: 0; }
.secao-titulo h2 { margin: 0; font-size: var(--txt-xl); }
.secao-titulo p { margin: 6px 0 0; color: var(--texto-fraco); font-size: var(--txt-peq); max-width: 60ch; }
/* Contexto acima de um titulo de tela (a categoria do horario, a area do
   painel). Em caixa normal e no tamanho do texto: rotulo minusculo em caixa
   alta espacada era o sotaque de template que a etapa 67 tirou. */
.olho {
  display: block; font-size: var(--txt-peq); font-weight: 650;
  color: var(--primaria); margin-bottom: var(--e1);
}

.grade { display: grid; gap: var(--e4); }
.grade-2 { grid-template-columns: repeat(auto-fit, minmax(min(290px, 100%), 1fr)); }
.grade-3 { grid-template-columns: repeat(auto-fit, minmax(min(232px, 100%), 1fr)); }
.grade-4 { grid-template-columns: repeat(auto-fit, minmax(min(178px, 100%), 1fr)); }
.linha { display: flex; gap: var(--e3); align-items: center; flex-wrap: wrap; }
.linha-topo { align-items: flex-start; }
.entre { justify-content: space-between; }
.crescer { flex: 1; min-width: 0; }

/* Utilitarios de ritmo: substituem style="margin-*" solto nas rotas. */
.acima-1 { margin-top: var(--e1); }
.acima-2 { margin-top: var(--e2); }
.acima-3 { margin-top: var(--e3); }
.acima-4 { margin-top: var(--e4); }
.acima-5 { margin-top: var(--e5); }
.abaixo-3 { margin-bottom: var(--e3); }
.sem-topo { margin-top: 0; }
.sem-fundo { margin-bottom: 0; }

.divisor { height: 1px; background: var(--borda); margin: var(--e5) 0; border: 0; }

/* Larguras de campo que nao merecem esticar a linha inteira. */
.campo-estreito { max-width: 200px; }
.campo-curto    { max-width: 130px; }
.campo-micro    { max-width: 96px; }

/* Aviso ja lido continua legivel: recua, nao some. */
.lida { opacity: .62; }

/* Delta de reputacao: o sinal e a cor contam a mesma coisa. */
.delta-mais  { color: var(--ok); }
.delta-menos { color: var(--perigo); }

.centralizado { margin-inline: auto; }
.linha-centro { justify-content: center; }

.trilha { font-size: var(--txt-peq); margin-bottom: var(--e4); }
.trilha a { color: var(--texto-fraco); font-weight: 600; }
.trilha a:hover { color: var(--primaria); }

.rodape {
  margin-top: var(--e8);
  background: var(--fundo-fundo);
  color: var(--texto-fraco); font-size: var(--txt-peq);
  flex-shrink: 0; overflow: hidden;
}
.rodape-interno {
  max-width: var(--largura); margin: 0 auto; padding: var(--e7) var(--e5) var(--e6);
  display: grid; gap: var(--e5);
  grid-template-columns: minmax(230px, 1.5fr) repeat(auto-fit, minmax(140px, 1fr));
}
.rodape h2 {
  font-size: var(--txt-peq); font-weight: 700;
  margin: 0 0 var(--e3); color: var(--texto);
}
.rodape ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 7px; }
.rodape a { color: var(--texto-fraco); }
.rodape a:hover { color: var(--primaria); }
.rodape-marca {
  display: flex; align-items: center; gap: 9px; color: var(--texto);
  font-weight: 750; font-size: var(--txt-md); letter-spacing: -.03em;
}
.rodape-marca .marca-palavra { height: 17px; }
.rodape-nota { margin: var(--e2) 0 0; max-width: 44ch; }
.rodape-fim {
  max-width: var(--largura); margin: 0 auto;
  padding: 0 var(--e5) var(--e5);
  font-size: var(--txt-mini); color: var(--texto-tenue);
}
/* O fechamento: a palavra da marca na largura inteira, cortada pela borda de
   baixo, no tom de uma superficie. Decorativa: o nome ja esta escrito acima. */
.rodape-assinatura {
  max-width: var(--largura); margin: 0 auto; padding: 0 var(--e5);
  /* Escura o bastante para ser lida como a marca, ainda abaixo do texto. */
  color: color-mix(in srgb, var(--texto-tenue) 55%, var(--fundo-fundo)); line-height: 0;
}
.rodape-assinatura { height: clamp(48px, 10vw, 150px); overflow: hidden; }
.rodape-assinatura svg { display: block; width: 100%; height: auto; }

/* ==============================================================
   5. TEXTOS AUXILIARES
   ============================================================== */
.fraco { color: var(--texto-fraco); }
.tenue { color: var(--texto-tenue); }
.pequeno { font-size: var(--txt-peq); }
.mini { font-size: var(--txt-mini); }
.forte { font-weight: 650; }
.mono { font-family: var(--fonte-mono); font-size: var(--txt-peq); }
.centro { text-align: center; }
.direita { text-align: right; }
.medida { max-width: 64ch; }

/* ==============================================================
   6. CARTAO
   ============================================================== */
.cartao {
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio);
  padding: var(--e5);
  transition: border-color var(--suave), background-color var(--suave);
}
.cartao + .cartao { margin-top: var(--e3); }
/* Na grade o espaco vem do gap; a margem acima empurrava o 2o e o 3o cartao da
   linha 12 px para baixo do primeiro. */
.grade > .cartao + .cartao { margin-top: 0; }
.cartao > :first-child { margin-top: 0; }
.cartao > :last-child { margin-bottom: 0; }
/* So em aparelho com mouse: no toque o :hover gruda depois do toque. */
/* Sem pulo nem brilho: a borda assume a cor da marca e basta. */
@media (hover: hover) {
  .cartao-vivo:hover { border-color: color-mix(in srgb, var(--primaria) 45%, var(--borda)); }
}
.cartao-calmo { background: var(--superficie-2); border-color: transparent; }
.cartao-realce { box-shadow: inset 3px 0 0 var(--primaria); }
.cartao-alerta { box-shadow: inset 3px 0 0 var(--perigo); }

.lista-cartoes { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--e3); }

/* Card inteiro clicavel: o <a> do titulo se estica sobre o cartao pelo
   ::after. Um unico link na arvore de acessibilidade, foco por teclado
   intacto, texto ainda selecionavel. */
.item-clicavel { position: relative; cursor: pointer; }
@media (hover: hover) {
  .item-clicavel:hover { background: color-mix(in srgb, var(--primaria) 3%, var(--superficie)); }
}
.item-clicavel .link-estendido { color: var(--texto); }
.item-clicavel .link-estendido:hover { text-decoration: none; }
.link-estendido::after { content: ''; position: absolute; inset: 0; z-index: 1; border-radius: inherit; }
.link-estendido:focus-visible { outline: none; }
.link-estendido:focus-visible::after { outline: 2px solid var(--primaria); outline-offset: -3px; }
.item-clicavel a:not(.link-estendido),
.item-clicavel button,
.item-clicavel form { position: relative; z-index: 2; }

/* ==============================================================
   7. SELOS
   ============================================================== */
.selo {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: var(--pilula);
  font-size: var(--txt-mini); font-weight: 650; white-space: nowrap;
  line-height: 1.55;
}
/* Ponto antes do rotulo: a cor nunca e o unico sinal do estado. */
.selo::before {
  content: ''; width: 6px; height: 6px; border-radius: 50%;
  background: currentColor; opacity: .8; flex-shrink: 0;
}
.selo-ok       { background: var(--ok-fraco); color: var(--ok); }
.selo-aviso    { background: var(--aviso-fraco); color: var(--aviso); }
.selo-perigo   { background: var(--perigo-fraco); color: var(--perigo); }
.selo-info     { background: var(--info-fraco); color: var(--info); }
.selo-neutro   { background: var(--superficie-2); color: var(--texto-fraco); }
.selo-desconto {
  background: var(--desconto-fraco); color: var(--desconto);
  box-shadow: inset 0 0 0 1px var(--desconto-borda); font-weight: 700;
}
/* Codigo de regra (RN-18, RF-082): rastreabilidade que aparece de proposito.
   Na fonte do texto, com algarismo tabular: em mono parecia sobra de debug. */
.selo-regra {
  background: var(--superficie-2); color: var(--texto-fraco);
  box-shadow: inset 0 0 0 1px var(--borda);
  font-size: var(--txt-mini); font-weight: 650; letter-spacing: 0;
}
.selo-regra::before, .selo-desconto::before { display: none; }

/* ==============================================================
   8. BOTOES
   ============================================================== */
.botao {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 11px 20px; border-radius: var(--pilula);
  border: 1px solid transparent;
  background: var(--primaria); color: var(--sobre-primaria);
  font-family: inherit; font-size: var(--txt-peq); font-weight: 650;
  line-height: 1.45; cursor: pointer; text-align: center;
  transition: transform var(--rapido), background var(--rapido), border-color var(--rapido), filter var(--rapido);
}
.botao:hover { background: var(--primaria-forte); color: var(--sobre-primaria); text-decoration: none; }
/* O aperto e o retorno de toque: o botao afunda um pouco enquanto e pressionado. */
.botao:active { transform: scale(.97); }
.botao:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.botao-secundario { background: var(--superficie); color: var(--texto); border-color: var(--borda-forte); }
.botao-secundario:hover { background: var(--superficie-2); color: var(--texto); border-color: var(--texto-tenue); }
.botao-perigo { background: var(--perigo); color: var(--sobre-perigo); }
.botao-perigo:hover { background: var(--perigo); color: var(--sobre-perigo); filter: brightness(.9); }
.botao-fantasma { background: transparent; color: var(--texto-fraco); border-color: transparent; }
.botao-fantasma:hover { background: transparent; color: var(--texto); }
.botao-pequeno { padding: 8px 15px; font-size: var(--txt-mini); }
.botao-grande { padding: 14px 26px; font-size: var(--txt-corpo); }
.botao-largo { width: 100%; }

/* Seta que anda no hover: detalhe pequeno, tira o ar de template. */
.botao .seta { transition: transform var(--medio); }
.botao:hover .seta { transform: translateX(3px); }

/* ==============================================================
   9. FORMULARIOS
   ============================================================== */
.campo { margin-bottom: var(--e4); }
.campo:last-child { margin-bottom: 0; }
.campo label, .rotulo-campo {
  display: block; font-size: var(--txt-peq); font-weight: 650; margin-bottom: 5px;
}
.campo .ajuda { font-size: var(--txt-mini); color: var(--texto-fraco); margin-top: 5px; }
.campo-fim { display: flex; align-items: flex-end; }
/* Grade de campos lado a lado: o espaco entre linhas ja vem do gap. Com a
   margem do .campo, o ultimo (sem margem) descia 16 px abaixo dos outros. */
.grade-campos > .campo { margin-bottom: 0; }
/* Filtros da busca: quatro escolhas e o botao, que so ocupa a largura do rotulo. */
.grade-filtros { grid-template-columns: repeat(4, minmax(0, 1fr)) auto; }

input, select, textarea {
  width: 100%; padding: 11px 13px;
  border: 1px solid var(--borda-forte); border-radius: var(--raio-p);
  background: var(--superficie); color: var(--texto);
  font: inherit; font-size: var(--txt-peq);
  transition: border-color var(--rapido), box-shadow var(--rapido);
}
input::placeholder, textarea::placeholder { color: var(--texto-tenue); }
/* Campo so de leitura (o e-mail na conta, RF-087) nao pode parecer editavel. */
input:disabled { background: var(--superficie-2); color: var(--texto-fraco); border-style: dashed; cursor: not-allowed; }
input:hover, select:hover, textarea:hover { border-color: var(--texto-tenue); }
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--primaria);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primaria) 22%, transparent);
}
textarea { min-height: 96px; resize: vertical; }
select {
  appearance: none; padding-right: 34px; cursor: pointer;
  background-image:
    linear-gradient(45deg, transparent 50%, currentColor 50%),
    linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 17px) calc(50% + 1px), calc(100% - 12px) calc(50% + 1px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}
fieldset { border: 1px solid var(--borda); border-radius: var(--raio); padding: var(--e4); margin: 0 0 var(--e4); }
legend { font-size: var(--txt-peq); font-weight: 650; padding: 0 6px; }

/* Caixa de busca destacada: o campo principal do produto. */
.busca-principal {
  display: flex; gap: var(--e2); align-items: stretch;
  background: var(--superficie);
  border: 1.5px solid var(--borda-forte);
  border-radius: var(--pilula);
  padding: 6px;
  transition: border-color var(--rapido), box-shadow var(--rapido);
}
.busca-principal input {
  border: 0; background: transparent; box-shadow: none;
  font-size: var(--txt-corpo); padding: 10px 16px;
}
.busca-principal input:hover { border-color: transparent; }
.busca-principal input:focus { box-shadow: none; }
.busca-principal:focus-within {
  border-color: var(--primaria);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primaria) 18%, transparent);
}
.busca-principal .botao { flex-shrink: 0; }

/* ==============================================================
   10. AVISOS E NOTAS DE REGRA
   ============================================================== */
.aviso {
  display: flex; gap: var(--e3); align-items: flex-start;
  padding: 13px 16px; border-radius: var(--raio);
  margin-bottom: var(--e4); font-size: var(--txt-peq);
  border: 1px solid; border-left-width: 3px;
}
.aviso-corpo { flex: 1; min-width: 0; }
.aviso strong { display: block; margin-bottom: 2px; font-size: var(--txt-corpo); }
.aviso svg { flex-shrink: 0; width: 18px; height: 18px; margin-top: 2px; }
.aviso-sucesso { background: var(--ok-fraco); color: var(--ok); border-color: color-mix(in srgb, var(--ok) 30%, transparent); border-left-color: var(--ok); }
.aviso-erro    { background: var(--perigo-fraco); color: var(--perigo); border-color: color-mix(in srgb, var(--perigo) 30%, transparent); border-left-color: var(--perigo); }
.aviso-info    { background: var(--info-fraco); color: var(--info); border-color: color-mix(in srgb, var(--info) 30%, transparent); border-left-color: var(--info); }
.aviso-atencao { background: var(--aviso-fraco); color: var(--aviso); border-color: color-mix(in srgb, var(--aviso) 30%, transparent); border-left-color: var(--aviso); }
.aviso .selo-regra { background: color-mix(in srgb, currentColor 13%, transparent); color: inherit; }
.aviso a { color: inherit; text-decoration: underline; font-weight: 650; }

/* Explicacao de regra: liga a tela ao docs/spec.md. Nao e sobra de debug -
   e a rastreabilidade aparecendo na interface (constituicao, principio VIII). */
.regra-nota {
  display: flex; gap: 10px; align-items: baseline;
  background: var(--superficie-2);
  padding: 12px 16px; border-radius: var(--raio-p);
  font-size: var(--txt-peq); color: var(--texto-fraco);
  margin: var(--e4) 0 0;
}
/* O codigo da regra e uma etiqueta, nao codigo-fonte: fonte do texto. */
.regra-nota code {
  font-family: var(--fonte); color: var(--primaria-forte); font-weight: 700; flex-shrink: 0;
  font-size: var(--txt-mini); padding: 1px 8px; border-radius: var(--pilula);
  background: var(--primaria-fraca);
}

/* ==============================================================
   11. PRECO E OPORTUNIDADE
   ============================================================== */
.preco { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }
.preco-base {
  color: var(--texto-tenue); text-decoration: line-through;
  text-decoration-thickness: 1.5px; font-size: var(--txt-peq);
}
.preco-vigente { font-size: 1.75rem; font-weight: 750; letter-spacing: -.035em; line-height: 1.1; }
.preco-nota { font-size: var(--txt-mini); color: var(--texto-fraco); margin-top: 4px; }
.preco-nota strong { color: var(--desconto); font-weight: 700; }

/* Regua de desconto: como o preco caminha ate o horario. Todos os degraus
   vem do dominio (projetarRegua) - o navegador so desenha (INV-14). */
/* As colunas moram na lista e cada degrau herda por subgrid: o rotulo ocupa a
   largura do mais longo e as barras comecam todas no mesmo x. Coluna fixa
   cortava "a partir de 4 h antes" por cima da barra. */
.regua {
  list-style: none; padding: 0; margin: 0; display: grid; gap: 2px;
  grid-template-columns: max-content minmax(48px, 1fr) auto;
}
.regua-degrau {
  display: grid; grid-column: 1 / -1; grid-template-columns: subgrid; align-items: center;
  gap: var(--e3); padding: 10px 12px; border-radius: var(--raio-p);
  font-size: var(--txt-peq);
}
.regua-quando { color: var(--texto-fraco); font-size: var(--txt-mini); white-space: nowrap; }
.regua-barra { height: 8px; border-radius: var(--pilula); background: var(--superficie-2); overflow: hidden; }
.regua-barra > i { display: block; height: 100%; border-radius: var(--pilula); background: var(--primaria); }
.regua-preco { font-weight: 700; white-space: nowrap; }
/* A faixa vigente leva a peca laranja da marca: e o "agora" da regua. */
.regua-degrau.agora { background: var(--desconto-fraco); box-shadow: inset 0 0 0 1px var(--desconto-borda); }
.regua-degrau.agora .regua-barra > i { background: var(--acento); }
.regua-degrau.agora .regua-quando { color: var(--desconto); font-weight: 700; }
.regua-degrau.agora .regua-preco { color: var(--desconto); }
.regua-degrau.passado { opacity: .5; }

/* ==============================================================
   12. CARTAO DE HORARIO (o componente central do produto)
   Trilho de tempo a esquerda com um entalhe: a marca visual de
   "slot de agenda" que da nome ao produto.
   ============================================================== */
.vaga { display: flex; gap: var(--e4); align-items: stretch; }

.vaga-quando {
  position: relative; flex-shrink: 0;
  min-width: 98px; padding: 12px 14px;
  border-radius: var(--raio-p);
  background: var(--superficie-2);
  text-align: center;
  display: flex; flex-direction: column; justify-content: center;
}
/* O entalhe: meia-lua vazada na borda direita do trilho. */
.vaga-quando::after {
  content: ''; position: absolute; right: -6px; top: 50%;
  width: 12px; height: 12px; margin-top: -6px; border-radius: 50%;
  background: var(--superficie);
  box-shadow: inset 0 0 0 1px var(--borda);
}
.vaga-quando .dia { font-size: var(--txt-mini); color: var(--texto-fraco); font-weight: 650; }
.vaga-quando .hora { font-size: 1.5rem; font-weight: 750; letter-spacing: -.03em; line-height: 1.2; }
.vaga-quando .duracao { font-size: var(--txt-mini); color: var(--texto-tenue); }

.vaga-corpo { flex: 1; min-width: 0; }
.vaga-titulo { font-weight: 700; font-size: var(--txt-lg); letter-spacing: -.02em; }
.vaga-meta {
  display: flex; flex-wrap: wrap; gap: 3px var(--e2);
  font-size: var(--txt-peq); color: var(--texto-fraco); margin-top: 2px;
}
.vaga-meta .ponto { color: var(--borda-forte); }
/* Sinais da oferta: texto com icone, sem uma pilula de cor para cada um. So
   ganha cor o que significa alguma coisa (reputacao baixa, por exemplo). */
.vaga-sinais {
  list-style: none; padding: 0; margin: var(--e3) 0 0;
  display: flex; flex-wrap: wrap; gap: 6px var(--e4);
  font-size: var(--txt-peq); color: var(--texto-fraco);
}
.sinal { display: inline-flex; align-items: center; gap: 6px; }
.sinal .icone { color: var(--texto-tenue); }
.sinal-alerta, .sinal-alerta .icone { color: var(--perigo); font-weight: 650; }
.sinal-atencao, .sinal-atencao .icone { color: var(--aviso); font-weight: 650; }

/* Linguagem de icones: traco de 1,75, cantos redondos, sempre ao lado de um
   rotulo escrito. Nenhum icone sozinho carrega significado. */
.icone { width: 16px; height: 16px; flex-shrink: 0; vertical-align: -3px; }
.icone-g { width: 20px; height: 20px; }
/* Largura fixa: crescendo pelo conteudo, a nota longa do preco empurrava o
   titulo para tres linhas em tela de tablet. */
.vaga-lado {
  flex: 0 0 248px; min-width: 0;
  display: flex; flex-direction: column; justify-content: space-between; gap: var(--e3);
  text-align: right;
}
.vaga-lado form { width: 100%; }
/* .preco e flex: text-align nao o move. Sem desconto a linha tem so o valor e
   ficava encostada a esquerda, fora da simetria dos cartoes com desconto. */
.vaga-lado .preco { justify-content: flex-end; }

/* ==============================================================
   13. AGENDA DO PRESTADOR
   Dia como cabecalho, horarios como faixas. No celular a
   composicao muda; nao e a grade do desktop espremida.
   ============================================================== */
.agenda-dia { margin-top: var(--e5); }
.agenda-cabeca {
  display: flex; align-items: baseline; gap: var(--e3); flex-wrap: wrap;
  padding-bottom: var(--e2); margin-bottom: var(--e3);
  border-bottom: 1px solid var(--borda);
}
.agenda-cabeca h3 { margin: 0; font-size: var(--txt-md); text-transform: capitalize; }
.agenda-cabeca .resumo { font-size: var(--txt-mini); color: var(--texto-fraco); margin-left: auto; }
/* Painel do prestador: saudacao e acoes principais na mesma faixa. */
.painel-topo {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: var(--e4) var(--e5); flex-wrap: wrap; margin-bottom: var(--e5);
  padding-bottom: var(--e5); border-bottom: 1px solid var(--borda);
}
/* Duas colunas no maximo: em tres, o nome do servico quebrava em duas linhas. */
.grade-vitrine { grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); }
.vitrine-item { display: flex; align-items: center; gap: var(--e4); }
.vitrine-hora {
  display: flex; flex-direction: column; align-items: center; flex-shrink: 0;
  min-width: 76px; padding: 8px 10px; border-radius: var(--raio-p);
  background: var(--primaria-fraca); line-height: 1.25;
}
.vitrine-hora .hora { font-size: var(--txt-lg); font-weight: 750; letter-spacing: -.03em; color: var(--primaria-forte); }
.vitrine-item .direita { flex-shrink: 0; }
.agenda-lista { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--e2); }

/* ==============================================================
   14. TABELAS
   ============================================================== */
.tabela-rolagem { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; font-size: var(--txt-peq); }
th, td { padding: 11px 13px; text-align: left; border-bottom: 1px solid var(--borda); vertical-align: top; }
th { font-size: var(--txt-mini); color: var(--texto-fraco); font-weight: 700; white-space: nowrap; }
tbody tr:last-child td, tbody tr:last-child th { border-bottom: none; }
tbody tr { transition: background var(--rapido); }
.tabela-rolagem tbody tr:hover { background: var(--superficie-2); }

/* Tabela de duas colunas usada como ficha (rotulo / valor). */
.ficha th {
  text-transform: none; letter-spacing: 0; font-size: var(--txt-peq);
  color: var(--texto-fraco); font-weight: 600; width: 46%; white-space: normal;
}
.ficha td { font-weight: 650; }

/* ==============================================================
   15. METRICAS, REPUTACAO, ESTRELAS
   ============================================================== */
.metrica {
  background: var(--superficie); border-radius: var(--raio);
  padding: var(--e4) var(--e5) 18px;
  border: 1px solid var(--borda);
}
.cartao .metrica { background: var(--superficie-2); border-color: transparent; }
/* Metrica que pede acao: a unica do painel com a cor do acento. */
.metrica-destaque {
  background: var(--acento-fraco);
  border-color: color-mix(in srgb, var(--acento) 35%, transparent);
}
.metrica-destaque .valor { color: var(--acento-forte); }
.metrica .valor { font-size: var(--txt-2xl); font-weight: 750; letter-spacing: -.035em; line-height: 1.15; }
.metrica .rotulo { font-size: var(--txt-peq); color: var(--texto); font-weight: 650; margin-top: 4px; }
.metrica .detalhe { font-size: var(--txt-mini); color: var(--texto-tenue); margin-top: 3px; }

.barra {
  height: 6px; border-radius: var(--pilula);
  background: var(--superficie-3); overflow: hidden; margin-top: 6px;
}
.barra > i { display: block; height: 100%; background: var(--ok); border-radius: var(--pilula); }
.barra.baixa > i { background: var(--perigo); }
.barra.media > i { background: var(--aviso); }

/* Estrelas de verdade; a alternativa textual vai no aria-label do HTML. */
.estrelas { display: inline-flex; gap: 1px; color: var(--acento); font-size: var(--txt-corpo); }
.estrelas .apagada { color: var(--borda-forte); }

/* ==============================================================
   16. LISTAS E ESTADO VAZIO
   ============================================================== */
.lista-limpa { list-style: none; padding: 0; margin: 0; }
.lista-limpa > li { padding: 13px 0; border-bottom: 1px solid var(--borda); }
.lista-limpa > li:first-child { padding-top: 0; }
.lista-limpa > li:last-child { border-bottom: none; padding-bottom: 0; }

/* Estado vazio como slot esperando ser preenchido: o conceito do produto
   aparece exatamente onde falta alguma coisa. */
.vazio {
  text-align: center; padding: var(--e7) var(--e5);
  color: var(--texto-fraco);
  border: 1.5px dashed var(--borda-forte); border-radius: var(--raio);
  background: var(--superficie-2);
}
.vazio-titulo { display: block; font-weight: 700; color: var(--texto); font-size: var(--txt-md); margin-bottom: 5px; }
.vazio p { margin: 0 auto; max-width: 48ch; }
.vazio-acoes { display: flex; gap: var(--e2); flex-wrap: wrap; justify-content: center; margin-top: var(--e4); }
.vazio-slot {
  width: 48px; height: 28px; margin: 0 auto var(--e4);
  border-radius: 7px; border: 1.5px dashed var(--borda-forte);
  position: relative; overflow: hidden;
}
.vazio-slot::after {
  content: ''; position: absolute; inset: 3px;
  border-radius: 4px; background: var(--primaria-fraca);
  animation: encaixar-vazio 3.8s var(--mola) infinite;
}
@keyframes encaixar-vazio {
  0%, 18%  { transform: translateY(-30px); opacity: 0; }
  42%, 82% { transform: translateY(0); opacity: 1; }
  100%     { transform: translateY(-30px); opacity: 0; }
}

/* ==============================================================
   17. FILTROS ATIVOS
   ============================================================== */
.filtros-ativos { display: flex; flex-wrap: wrap; gap: var(--e2); align-items: center; margin: var(--e4) 0; }
.rotulo-filtros { font-size: var(--txt-peq); color: var(--texto-fraco); font-weight: 650; }
.chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 8px 6px 14px; border-radius: var(--pilula);
  background: var(--primaria-fraca); color: var(--primaria-forte);
  font-size: var(--txt-mini); font-weight: 650; white-space: nowrap;
}
.chip:hover { text-decoration: none; }
.chip .x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 50%; line-height: 1; font-size: 13px;
  background: color-mix(in srgb, var(--primaria) 18%, transparent);
}
a.chip:hover .x { background: var(--primaria); color: #fff; }
.chip-neutro { background: var(--superficie-3); color: var(--texto); }
.chip-ir { padding: 7px 15px; transition: background var(--suave), color var(--suave); }
a.chip-neutro:hover { background: var(--superficie-3); color: var(--texto); }

/* ==============================================================
   18. PASSOS
   Lista ordenada de verdade (<ol>): a ordem e conteudo, entao o
   leitor de tela anuncia "1 de 5". O marcador e uma faixa curta da
   marca, nao um "01" em fonte mono.
   ============================================================== */
.passos { list-style: none; padding: 0; margin: 0; counter-reset: passo; display: grid; gap: var(--e5); }
.passos > li { counter-increment: passo; position: relative; padding-left: 52px; }
.passos > li::before {
  content: counter(passo); position: absolute; left: 0; top: -1px;
  width: 36px; height: 26px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: var(--primaria-fraca); color: var(--primaria-forte);
  font-weight: 750; font-size: var(--txt-peq); font-variant-numeric: tabular-nums;
}
.passos h3 { margin: 0 0 4px; font-size: var(--txt-md); }
.passos p { margin: 0; color: var(--texto-fraco); }
/* Em linha: os passos lado a lado, para fluxos curtos (o depois da reserva). */
.passos-linha { grid-template-columns: repeat(auto-fit, minmax(min(168px, 100%), 1fr)); gap: var(--e5); }
.passos-linha > li { padding-left: 0; padding-top: 40px; }
.passos-linha > li::before { top: 0; }
.passos.cartao { padding: var(--e5); }

/* ==============================================================
   19. SECOES DA PAGINA PUBLICA
   Cada secao tem composicao propria; o espaco entre elas e maior
   que qualquer folga interna. Nenhuma e "rotulo + titulo + 3 cartoes".
   ============================================================== */
.secao { margin-top: var(--e9); }
.secao-primeira { margin-top: var(--e4); }
.secao-cabeca h2, .secao-texto h2 {
  font-size: var(--txt-3xl); letter-spacing: -.035em; line-height: 1.08; margin: 0;
}
.secao-cabeca {
  display: flex; justify-content: space-between; align-items: flex-end;
  gap: var(--e4) var(--e6); flex-wrap: wrap; margin-bottom: var(--e6);
}
.secao-cabeca p { margin: var(--e3) 0 0; color: var(--texto-fraco); font-size: var(--txt-md); max-width: 52ch; }
.secao-texto > p { margin: var(--e4) 0 0; font-size: var(--txt-md); max-width: 46ch; }
.secao-texto > p + p { color: var(--texto-fraco); }

/* Texto de um lado, prova do outro. A coluna de texto e a mais estreita. */
.par { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: var(--e7); align-items: start; }
.par-centro { align-items: center; }

/* Glossario do preco: os quatro termos que o cliente encontra na tela. */
.termos { margin: var(--e6) 0 0; display: grid; gap: var(--e4); }
.termos div { display: grid; grid-template-columns: 8.5rem minmax(0, 1fr); gap: var(--e3); align-items: baseline; }
.termos dt { font-weight: 700; }
.termos dd { margin: 0; color: var(--texto-fraco); }

/* Categorias: a foto do mundo de cada uma, com a contagem real embaixo. */
.categorias { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, .95fr); gap: var(--e5); align-items: start; }
.categoria-foto { display: block; color: var(--texto); }
.categoria-foto:hover { text-decoration: none; }
.categoria-foto figure { margin: 0; aspect-ratio: 4 / 5; border-radius: var(--raio); overflow: hidden; background: var(--superficie-3); }
.categoria-foto img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .7s var(--mola); }
@media (hover: hover) { .categoria-foto:hover img { transform: scale(1.04); } }
.categoria-nome { display: block; margin-top: var(--e3); font-weight: 700; font-size: var(--txt-md); }
.categoria-conta { display: block; color: var(--texto-fraco); font-size: var(--txt-peq); }
.categoria-foto:hover .categoria-nome { color: var(--primaria); }
.categorias-outras {
  padding: var(--e5); border-radius: var(--raio);
  background: var(--superficie); border: 1px solid var(--borda);
}
.categorias-outras h3 { margin: 0 0 var(--e3); font-size: var(--txt-md); }
.categorias-outras ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.categorias-outras a {
  display: flex; justify-content: space-between; gap: var(--e3); align-items: baseline;
  padding: 10px 12px; margin: 0 -12px; border-radius: var(--raio-p); color: var(--texto); font-weight: 600;
}
.categorias-outras a:hover { background: var(--superficie-2); text-decoration: none; color: var(--primaria); }
.categorias-outras .num { color: var(--texto-fraco); font-weight: 500; font-size: var(--txt-peq); white-space: nowrap; }

/* Bloco do prestador: a foto de quem atende ao lado do que ele faz aqui. */
.bloco-prestador {
  display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: var(--e7);
  background: var(--superficie); border: 1px solid var(--borda);
  border-radius: var(--raio-g); padding: var(--e6); align-items: center;
}
.bloco-prestador figure { margin: 0; aspect-ratio: 4 / 5; border-radius: var(--raio); overflow: hidden; }
.bloco-prestador img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bloco-prestador .passos { margin-top: var(--e6); }
.vantagens { display: grid; grid-template-columns: 1fr 1fr; gap: var(--e5); margin: var(--e6) 0; padding: var(--e5); border-radius: var(--raio); background: var(--superficie-2); }
.vantagens h3 { margin: 0 0 4px; font-size: var(--txt-corpo); }
.vantagens p { margin: 0; color: var(--texto-fraco); font-size: var(--txt-peq); }

/* Regras de confianca: duas colunas de texto, o codigo da regra ao lado do titulo. */
.regras-lista { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: var(--e6) var(--e7); }
.regras-lista h3 { margin: 0 0 6px; font-size: var(--txt-md); display: flex; gap: var(--e3); align-items: baseline; justify-content: space-between; }
.regras-lista p { margin: 0; color: var(--texto-fraco); }

/* ==============================================================
   19b. CAMPO DA MARCA (chamada final)
   Cor cheia e chapada: sem degrade, sem grao.
   ============================================================== */
.campo-marca {
  border-radius: var(--raio-g); padding: var(--e7) var(--e6);
  background: var(--campo-marca); color: #fff;
}
.campo-marca h2 { color: #fff; }
.campo-marca p { color: rgba(255,255,255,.86); }
.campo-marca .botao { background: #fff; color: #2b30a0; }
.campo-marca .botao:hover { background: #fff; color: #2b30a0; filter: brightness(.94); }
.campo-marca .botao-secundario { background: transparent; color: #fff; border-color: rgba(255,255,255,.55); }
.campo-marca .botao-secundario:hover { background: rgba(255,255,255,.12); color: #fff; filter: none; }
/* Sobre cor cheia o vidro so satura o indigo: os botoes do campo ficam chapados. */
.campo-marca .botao { -webkit-backdrop-filter: none; backdrop-filter: none; box-shadow: none; }
.chamada-final { display: grid; grid-template-columns: 1fr 1fr; gap: var(--e6) var(--e7); }
.chamada-final h2 { font-size: var(--txt-2xl); margin: 0 0 var(--e2); letter-spacing: -.03em; }
.chamada-final p { margin: 0 0 var(--e5); max-width: 42ch; }
.chamada-final > div + div { padding-left: var(--e7); box-shadow: inset 1px 0 0 rgba(255,255,255,.22); }

/* ==============================================================
   20. HERO: A AGENDA ABERTA
   O titulo de um lado; do outro, os proximos horarios abertos de
   verdade, numa coluna de agenda. Cada linha e uma faixa da marca
   com a peca laranja do preco encaixada na ponta, como no logo.
   ============================================================== */
.progresso {
  position: fixed; top: 0; left: 0; height: 2px; z-index: 30; width: 100%;
  /* scaleX em vez de width: largura muda o layout a cada quadro de rolagem. */
  transform: scaleX(var(--avanco, 0)); transform-origin: 0 50%;
  background: var(--primaria);
}

/* Fundo do hero: a grade de agenda desenhada em publicas.js, inclinada e
   esmaecida para o fundo da pagina pela esquerda (onde fica o titulo) e por
   baixo. As cores sao tokens, entao a mesma regra serve aos tres temas. */
.heroi { position: relative; isolation: isolate; overflow: hidden; }
.heroi-fundo {
  position: absolute; inset: -10% -6% -10% 18%; z-index: -1; pointer-events: none;
  -webkit-mask-image: linear-gradient(to right, transparent 22%, rgba(0,0,0,.45) 42%, #000 68%),
    linear-gradient(to bottom, #000 50%, transparent 92%);
  -webkit-mask-composite: source-in;
  mask-image: linear-gradient(to right, transparent 22%, rgba(0,0,0,.45) 42%, #000 68%),
    linear-gradient(to bottom, #000 50%, transparent 92%);
  mask-composite: intersect;
  animation: heroi-fundo-entrar 1.4s var(--mola) both;
}
.heroi-fundo svg { width: 100%; height: 100%; display: block; transform: rotate(-12deg) scale(1.15); }
.heroi-fundo .af-livre { fill: none; stroke: var(--primaria); stroke-opacity: .22; stroke-width: 2; }
.heroi-fundo .af-ocupado { fill: var(--primaria); fill-opacity: .1; }
.heroi-fundo .af-vago { fill: var(--primaria); fill-opacity: .32; }
.heroi-fundo .af-peca { fill: var(--acento); fill-opacity: .7; }
@keyframes heroi-fundo-entrar { from { opacity: 0; transform: translateY(16px); } }

.heroi-interno {
  max-width: var(--largura); margin: 0 auto; padding: var(--e7) var(--e5) var(--e6);
  display: grid; grid-template-columns: minmax(0, 6fr) minmax(0, 5fr); gap: var(--e7); align-items: center;
}
.heroi h1 {
  margin: 0 0 var(--e5);
  font-size: var(--txt-display); line-height: 1.04; letter-spacing: -.036em; font-weight: 800;
}
.heroi-chamada { font-size: var(--txt-lg); line-height: 1.5; margin: 0 0 var(--e6); max-width: 36ch; }
.heroi-busca { margin-bottom: var(--e4); max-width: 34rem; }
.heroi-busca .busca-principal input { font-size: var(--txt-md); }
.heroi-atalhos { display: flex; flex-wrap: wrap; gap: var(--e2); align-items: center; max-width: 34rem; }
.heroi-atalhos .rotulo-atalhos { font-size: var(--txt-peq); color: var(--texto-fraco); margin-right: 2px; }
.heroi-prestador {
  margin: var(--e6) 0 0; padding-top: var(--e5); max-width: 34rem;
  box-shadow: inset 0 1px 0 var(--borda); color: var(--texto-fraco);
}
.heroi-prestador a { font-weight: 650; }

.agenda-aberta {
  background: var(--superficie); border: 1px solid var(--borda);
  border-radius: var(--raio-g); padding: var(--e5) var(--e5) var(--e4);
}
.agenda-aberta-cabeca { display: flex; justify-content: space-between; align-items: baseline; gap: 2px var(--e3); flex-wrap: wrap; margin-bottom: var(--e4); }
.agenda-aberta-cabeca h2 { margin: 0; font-size: var(--txt-lg); }
.agenda-aberta-cabeca p { margin: 0; color: var(--texto-fraco); font-size: var(--txt-peq); }
.agenda-aberta-lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
.agenda-aberta-dia { font-size: var(--txt-peq); font-weight: 700; color: var(--texto-fraco); padding: var(--e3) 0 2px; }
.agenda-aberta-dia:first-child { padding-top: 0; }
.agenda-aberta-link {
  display: grid; grid-template-columns: 3.4rem minmax(0, 1fr) 6.75rem; align-items: stretch; gap: 6px;
  color: var(--texto); border-radius: 12px;
}
.agenda-aberta-link:hover { text-decoration: none; }
.agenda-aberta-hora { align-self: center; font-weight: 750; font-size: var(--txt-md); letter-spacing: -.02em; }
.agenda-aberta-faixa {
  display: flex; flex-direction: column; justify-content: center; min-width: 0;
  padding: 10px 14px; border-radius: 12px; background: var(--primaria-fraca);
  transition: background var(--rapido);
}
.agenda-aberta-servico { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.agenda-aberta-onde { font-size: var(--txt-peq); color: var(--texto-fraco); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* A peca do preco: a mesma do logo, que entra na folga do E. */
.agenda-aberta-preco {
  display: flex; flex-direction: column; justify-content: center; align-items: flex-end;
  padding: 8px 14px; border-radius: 12px;
  background: var(--desconto-fraco); color: var(--desconto);
  transition: transform var(--medio);
}
.agenda-aberta-preco strong { font-size: var(--txt-md); font-weight: 750; color: var(--texto); letter-spacing: -.02em; white-space: nowrap; }
.agenda-aberta-preco span { font-size: var(--txt-mini); font-weight: 700; white-space: nowrap; }
.agenda-aberta-preco.cheio { background: var(--superficie-2); color: var(--texto-fraco); }
@media (hover: hover) {
  .agenda-aberta-link:hover .agenda-aberta-faixa { background: color-mix(in srgb, var(--primaria) 17%, var(--superficie)); }
  .agenda-aberta-link:hover .agenda-aberta-preco { transform: translateX(-4px); }
}
.agenda-aberta-rodape {
  display: flex; justify-content: space-between; align-items: center; gap: var(--e2) var(--e3); flex-wrap: wrap;
  margin-top: var(--e4); padding-top: var(--e4); box-shadow: inset 0 1px 0 var(--borda);
  font-size: var(--txt-peq); color: var(--texto-fraco);
}
.agenda-aberta-rodape a { font-weight: 650; }

/* ==============================================================
   20b. CONFIGURACOES DA CONTA (SPEC-030)
   Menu lateral no desktop; no celular vira trilha de abas, como a
   navegacao principal, sem nada que dependa de JS para abrir.
   ============================================================== */
.conta-grade { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: var(--e6); align-items: start; }
.conta-menu {
  position: sticky; top: 84px;
  display: flex; flex-direction: column; gap: 2px;
}
.conta-menu a {
  padding: 9px 12px; border-radius: var(--raio-p);
  color: var(--texto-fraco); font-weight: 600; font-size: var(--txt-peq);
  transition: background var(--rapido), color var(--rapido);
}
.conta-menu a:hover { background: var(--superficie-2); color: var(--texto); text-decoration: none; }
.conta-menu a[aria-current="page"] { background: var(--primaria-fraca); color: var(--primaria-forte); }
.conta-menu-separador { height: 1px; background: var(--borda); margin: var(--e2) 12px; }
.conta-conteudo > .cartao + .cartao, .conta-conteudo > .cartao + section, .conta-conteudo > form + section,
.conta-conteudo > section + form { margin-top: var(--e4); }

/* Perfil publico: a foto do prestador (RNF-04, SPEC-030) ao lado do nome. */
.perfil-topo { display: flex; align-items: center; gap: var(--e4); }
.perfil-topo .avatar-g { width: 72px; height: 72px; }

.foto-linha { display: flex; gap: var(--e5); align-items: center; flex-wrap: wrap; }
.foto-form input[type="file"] { padding: 8px; background: var(--superficie-2); cursor: pointer; font-size: var(--txt-peq); }
.foto-form input[type="file"]::file-selector-button {
  margin-right: var(--e3); padding: 6px 12px; border-radius: var(--raio-p);
  border: 1px solid var(--borda-forte); background: var(--superficie); color: var(--texto);
  font: inherit; font-weight: 650; cursor: pointer;
}

fieldset.sem-borda { border: 0; padding: 0; margin: 0; min-width: 0; }
fieldset.sem-borda + fieldset.sem-borda { margin-top: var(--e5); }
.temas { margin-top: var(--e2); }
.opcao-tema {
  position: relative; display: flex; flex-direction: column; gap: var(--e2);
  padding: var(--e3); border-radius: var(--raio); cursor: pointer;
  border: 1.5px solid var(--borda); background: var(--superficie);
  transition: border-color var(--suave), box-shadow var(--suave);
}
.opcao-tema:hover { border-color: var(--borda-forte); }
.opcao-tema input { position: absolute; opacity: 0; pointer-events: none; }
.opcao-tema:has(input:checked) {
  border-color: var(--primaria);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primaria) 22%, transparent);
}
.opcao-tema:has(input:focus-visible) { outline: 2px solid var(--primaria); outline-offset: 2px; }
.opcao-rotulo { font-weight: 650; font-size: var(--txt-peq); }
/* Amostra: fundo, cartao e a cor da marca de cada tema, sem depender do tema atual. */
.amostra {
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 10px; gap: 5px;
  height: 64px; padding: 8px; border-radius: var(--raio-p); border: 1px solid rgba(127,127,127,.25);
}
.amostra i { border-radius: 4px; }
.amostra i:nth-child(3) { grid-column: 1 / -1; }
.amostra-claro { background: #f7f5ef; }
.amostra-claro i { background: #ffffff; } .amostra-claro i:nth-child(3) { background: #3b41c5; }
.amostra-azul { background: #0a1122; }
.amostra-azul i { background: #101a31; } .amostra-azul i:nth-child(3) { background: #8b90ff; }
.amostra-preto { background: #000000; }
.amostra-preto i { background: #16161a; } .amostra-preto i:nth-child(3) { background: #8b90ff; }
.amostra-sistema { background: linear-gradient(90deg, #f7f5ef 50%, #0a1122 50%); }
.amostra-sistema i:nth-child(1) { background: #ffffff; }
.amostra-sistema i:nth-child(2) { background: #172038; }
.amostra-sistema i:nth-child(3) { background: linear-gradient(90deg, #3b41c5 50%, #8b90ff 50%); }
.opcao-linha { display: flex; gap: var(--e2); align-items: baseline; padding: 6px 0; cursor: pointer; font-size: var(--txt-peq); }
.opcao-linha input { width: auto; accent-color: var(--primaria); }

/* Perguntas frequentes em <details>: abre e fecha sem JavaScript. */
.faq details { border-bottom: 1px solid var(--borda); }
.faq details:last-child { border-bottom: 0; }
.faq summary {
  cursor: pointer; padding: var(--e4) 0; font-weight: 650; list-style: none;
  display: flex; justify-content: space-between; gap: var(--e3);
}
.faq summary::-webkit-details-marker { display: none; }
.faq summary::after { content: '+'; color: var(--primaria); font-weight: 750; transition: transform var(--suave); }
.faq details[open] summary::after { transform: rotate(45deg); }
.faq details p { margin: 0 0 var(--e4); color: var(--texto-fraco); }

/* ==============================================================
   21. MOVIMENTO
   Tudo aqui e decoracao: nada funcional depende destas classes.
   ============================================================== */
/* A lista repete as transicoes do .cartao: sem elas, esta regra (que vem
   depois) apagava a do cartao, e sombra e borda do hover trocavam de uma vez. */
[data-revelar] {
  opacity: 0; transform: translateY(18px);
  transition:
    opacity .7s var(--mola) var(--atraso, 0ms),
    transform .7s var(--mola) var(--atraso, 0ms),
    box-shadow var(--suave), border-color var(--suave), background-color var(--suave);
}
[data-revelar].visivel { opacity: 1; transform: none; }

/* Sem JS a pagina nao pode ficar em branco: o script do <head> marca .sem-js. */
.sem-js [data-revelar] { opacity: 1; transform: none; transition: none; }

@media (prefers-reduced-motion: reduce) {${SEM_MOVIMENTO}}
${SEM_MOVIMENTO_ESCOLHIDO}

/* ==============================================================
   21b. VIDRO (EXPERIMENTO, etapa 67)
   Pedido do Enzo para avaliar no navegador: barras e botoes com cara
   de vidro, no espirito do "liquid glass" do iOS. O expo-glass-effect
   e nativo do iOS (React Native) e nao roda na web, entao e CSS puro.
   Bloco isolado de proposito: apagar daqui ate o fim da secao desfaz.
   Atencao: o backdrop-filter do cabecalho fixo ja foi removido uma vez
   por travar a rolagem em PC fraco.
   ============================================================== */
:root {
  --vidro-brilho: rgba(255,255,255,.55);
  --vidro-sombra: 0 1px 2px rgba(20,20,40,.06), 0 8px 24px -10px rgba(20,20,40,.18);
}
:root[data-tema="azul"], :root[data-tema="preto"] {
  --vidro-brilho: rgba(255,255,255,.14);
  --vidro-sombra: 0 1px 2px rgba(0,0,0,.3), 0 10px 28px -10px rgba(0,0,0,.6);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-tema]) {
    --vidro-brilho: rgba(255,255,255,.14);
    --vidro-sombra: 0 1px 2px rgba(0,0,0,.3), 0 10px 28px -10px rgba(0,0,0,.6);
  }
}

@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  /* Barra do topo: a pagina passa por baixo, desfocada. */
  .topo {
    background: color-mix(in srgb, var(--fundo) 62%, transparent);
    -webkit-backdrop-filter: blur(18px) saturate(1.7);
    backdrop-filter: blur(18px) saturate(1.7);
  }
  .topo.rolado { border-bottom-color: color-mix(in srgb, var(--borda-forte) 50%, transparent); }

  /* Barra de busca: vidro claro com borda de luz. */
  .busca-principal {
    background: color-mix(in srgb, var(--superficie) 55%, transparent);
    -webkit-backdrop-filter: blur(14px) saturate(1.6);
    backdrop-filter: blur(14px) saturate(1.6);
    border-color: color-mix(in srgb, var(--borda-forte) 60%, transparent);
    box-shadow: inset 0 1px 0 var(--vidro-brilho), var(--vidro-sombra);
  }

  /* Botoes: vidro tingido, nao plastico. O que faz vidro e a borda: um fio
     de luz no alto, uma refracao clara no pe e o contorno quase invisivel;
     o miolo fica translucido e sem degrade. A tinta e a cor forte da marca
     a 74%: e o minimo que mantem o texto acima de 5:1 nos dois temas. */
  .botao, .nav a.nav-acao {
    background: color-mix(in srgb, var(--primaria-forte) 74%, transparent);
    -webkit-backdrop-filter: blur(16px) saturate(1.8) brightness(1.05);
    backdrop-filter: blur(16px) saturate(1.8) brightness(1.05);
    border-color: rgba(255,255,255,.28);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.5),
      inset 0 -1px 0 rgba(255,255,255,.14),
      inset 0 -10px 18px -12px rgba(255,255,255,.35),
      0 6px 18px -10px color-mix(in srgb, var(--primaria-forte) 60%, transparent);
  }
  .botao:hover, .nav a.nav-acao:hover {
    background: color-mix(in srgb, var(--primaria-forte) 84%, transparent);
  }
  .botao-secundario, .chip-ir {
    -webkit-backdrop-filter: blur(16px) saturate(1.8);
    backdrop-filter: blur(16px) saturate(1.8);
    box-shadow:
      inset 0 1px 0 var(--vidro-brilho),
      inset 0 -1px 0 color-mix(in srgb, var(--vidro-brilho) 40%, transparent),
      inset 0 0 0 1px color-mix(in srgb, var(--vidro-brilho) 35%, transparent),
      var(--vidro-sombra);
  }
  .botao-secundario {
    background: color-mix(in srgb, var(--superficie) 35%, transparent);
    border-color: color-mix(in srgb, var(--borda-forte) 55%, transparent);
  }
  .botao-secundario:hover { background: color-mix(in srgb, var(--superficie) 60%, transparent); }
  .botao-perigo { background: color-mix(in srgb, var(--perigo) 86%, transparent); }
  .botao.botao-fantasma, .botao.botao-fantasma:hover {
    background: transparent; box-shadow: none; border-color: transparent;
    -webkit-backdrop-filter: none; backdrop-filter: none;
  }
}

/* Luz que segue o mouse: um foco suave por dentro e um brilho que corre
   pela borda, os dois centrados em --mx/--my (postos pelo interacoes.js).
   Sem JS as variaveis nao existem e a luz nasce no meio, so no hover. */
.botao, .nav a.nav-acao, .chip-ir { position: relative; isolation: isolate; }
.botao::before, .nav a.nav-acao::before, .chip-ir::before,
.botao::after, .nav a.nav-acao::after, .chip-ir::after {
  content: ""; position: absolute; pointer-events: none;
  border-radius: inherit; opacity: 0; transition: opacity var(--medio);
}
/* Foco por dentro, abaixo do texto. */
.botao::before, .nav a.nav-acao::before, .chip-ir::before {
  inset: 0; z-index: -1;
  background: radial-gradient(150px circle at var(--mx, 50%) var(--my, 50%),
    rgba(255,255,255,.12), rgba(255,255,255,0) 70%);
}
/* Brilho so na borda: a mascara recorta o miolo e deixa o anel de 1px. */
.botao::after, .nav a.nav-acao::after, .chip-ir::after {
  inset: -1px; padding: 1px;
  background: radial-gradient(90px circle at var(--mx, 50%) var(--my, 50%),
    rgba(255,255,255,.45), rgba(255,255,255,0) 70%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
}
/* No botao claro, luz branca some: usa a cor da marca. */
.botao-secundario::before, .chip-ir::before {
  background: radial-gradient(120px circle at var(--mx, 50%) var(--my, 50%),
    color-mix(in srgb, var(--primaria) 8%, transparent), transparent 70%);
}
.botao-secundario::after, .chip-ir::after {
  background: radial-gradient(90px circle at var(--mx, 50%) var(--my, 50%),
    color-mix(in srgb, var(--primaria) 45%, transparent), transparent 70%);
}
.botao-fantasma::before { display: none; }
/* Botao fantasma: so texto. No hover um sublinhado cresce da esquerda
   para a direita, no lugar do fundo e do contorno. Reusa o ::after. */
.botao.botao-fantasma::after {
  inset: auto 20px 7px; height: 2px; padding: 0; border-radius: 2px;
  background: currentColor; -webkit-mask: none; mask: none;
  opacity: 1; transform: scaleX(0); transform-origin: 100% 50%;
  transition: transform var(--medio);
}
.botao.botao-fantasma.botao-pequeno::after { inset: auto 15px 5px; }
.botao.botao-fantasma.botao-grande::after { inset: auto 26px 9px; }
.botao.botao-fantasma:hover::after, .botao.botao-fantasma:focus-visible::after { transform: scaleX(1); transform-origin: 0 50%; }
.botao.botao-fantasma:active { transform: none; }
@media (hover: hover) {
  .botao:hover::before, .nav a.nav-acao:hover::before, .chip-ir:hover::before,
  .botao:hover::after, .nav a.nav-acao:hover::after, .chip-ir:hover::after { opacity: 1; }
  .botao:disabled::before, .botao:disabled::after { opacity: 0; }
}

/* ==============================================================
   22. RESPONSIVO
   Larguras pensadas de baixo para cima: o celular nao recebe a
   grade do desktop espremida, recebe outra composicao.
   ============================================================== */
@media (max-width: 980px) {
  .grade-filtros { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grade-filtros > .campo-fim { grid-column: 1 / -1; }
  /* A agenda aberta desce para baixo do titulo e continua inteira: no
     celular ela e a primeira coisa que se toca depois da busca. */
  .heroi-interno { grid-template-columns: minmax(0, 1fr); gap: var(--e6); padding: var(--e6) var(--e5) var(--e5); }
  .heroi-chamada, .heroi-busca, .heroi-atalhos, .heroi-prestador { max-width: none; }
  .par, .bloco-prestador { grid-template-columns: minmax(0, 1fr); gap: var(--e6); }
  /* A foto do prestador vira faixa larga: em 4:5 ela ocupava a tela toda. */
  .bloco-prestador figure { aspect-ratio: 16 / 10; }
  .bloco-prestador img { object-position: 50% 30%; }
  .categorias { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .categorias-outras { grid-column: 1 / -1; }
  .rodape-interno { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
}

@media (max-width: 820px) {
  /* Cabecalho em duas faixas: identidade e conta em cima, abas embaixo.
     Sem menu sanfona - nada aqui depende de JavaScript para abrir. */
  .topo-interno { flex-wrap: wrap; row-gap: 0; gap: var(--e3); padding: var(--e2) var(--e4) 0; min-height: 0; }
  .topo-conta { margin-left: auto; padding-left: 0; border-left: 0; }
  .nav {
    order: 3; width: 100%; margin: 0 calc(var(--e4) * -1);
    padding: 6px var(--e4) var(--e2);
    overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity;
  }
  .nav::-webkit-scrollbar { display: none; }
  .nav a { padding: 8px 13px; scroll-snap-align: start; }
  .nav-perfil .quem-nome { display: none; }
  .nav-perfil .quem { padding: 2px; }
}

@media (max-width: 680px) {
  :root { --e5: 18px; --e6: 26px; --e7: 36px; --e8: 52px; }

  /* minmax(0, ...): com 1fr a tabela da privacidade alargava a coluna e a pagina rolava para o lado. */
  .conta-grade { grid-template-columns: minmax(0, 1fr); gap: var(--e4); }
  .foto-linha { flex-direction: column; align-items: flex-start; }
  .foto-linha > .crescer { width: 100%; }
  .conta-menu {
    position: static; flex-direction: row; overflow-x: auto; scrollbar-width: none;
    margin: 0 calc(var(--e4) * -1); padding: 0 var(--e4) var(--e1);
  }
  .conta-menu::-webkit-scrollbar { display: none; }
  .conta-menu a { white-space: nowrap; }
  .conta-menu-separador { width: 1px; height: auto; margin: 6px var(--e1); flex-shrink: 0; }

  .pagina { padding: var(--e5) var(--e4) var(--e7); }
  .cartao { padding: var(--e4); }
  .cabecalho-pagina h1 { font-size: var(--txt-xl); }
  .metrica .valor { font-size: var(--txt-xl); }

  /* O cartao de horario vira empilhado, mas o trilho de tempo continua
     sendo o primeiro sinal: horario tem o mesmo peso que preco. Uma coluna
     so: com o trilho ao lado, o bloco da hora esticava ate a altura do
     texto e o titulo e os selos ficavam espremidos ao lado. Cada faixa
     ocupa a largura inteira, senao o lado direito do cartao fica vazio. */
  .vaga { display: flex; flex-direction: column; gap: var(--e3); }
  .vaga-quando {
    min-width: 0; padding: 8px 14px;
    flex-direction: row; flex-wrap: wrap; gap: 0 10px;
    align-items: baseline; justify-content: flex-start; text-align: left;
  }
  .vaga-quando .duracao { margin-left: auto; }
  .vaga-quando::after { display: none; }
  .vaga-quando .hora { font-size: var(--txt-lg); }
  /* O ponto separador sobra no comeco da linha quando a meta quebra. */
  .vaga-meta { gap: 2px var(--e3); }
  .vaga-meta .ponto { display: none; }
  .vaga-lado {
    flex-basis: auto; min-width: 0; text-align: left;
    flex-direction: column; align-items: stretch;
    gap: var(--e3);
    padding-top: var(--e3); border-top: 1px solid var(--borda);
  }
  /* O selo de desconto vai para a borda direita, na linha do preco. */
  .vaga-lado .preco { justify-content: flex-start; }
  .vaga-lado .preco .selo-desconto { margin-left: auto; }
  /* Acao do cartao de ponta a ponta: e o alvo de toque principal. */
  .vaga-lado form, .vaga-lado .botao { width: 100%; }
  .vaga-lado .botao { padding: 13px 18px; font-size: var(--txt-corpo); }

  :root { --e9: 80px; }
  /* No celular o titulo ocupa a largura toda: a grade fica so no alto e mais fraca. */
  .heroi-fundo { inset: -4% -30% auto -10%; height: 420px; opacity: .45; -webkit-mask-image: linear-gradient(to bottom, #000 20%, transparent 100%); mask-image: linear-gradient(to bottom, #000 20%, transparent 100%); }
  .heroi-chamada { font-size: var(--txt-md); }
  .agenda-aberta { padding: var(--e4) var(--e3) var(--e3); margin-inline: calc(var(--e2) * -1); }
  .agenda-aberta-link { grid-template-columns: 3rem minmax(0, 1fr) 6rem; }
  /* No celular a agenda aberta faz o papel dos atalhos: eles empurravam a agenda para fora da tela. */
  .heroi-atalhos { display: none; }
  .heroi-prestador { margin-top: var(--e4); padding-top: 0; box-shadow: none; }
  .agenda-aberta-faixa { padding: 9px 11px; }
  .agenda-aberta-preco { padding: 8px 10px; }
  /* Duas fotos por linha; a lista das outras categorias fecha embaixo. */
  .categorias { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--e4) var(--e3); }
  .categoria-nome { font-size: var(--txt-corpo); }
  .bloco-prestador { padding: var(--e4); }
  .vantagens, .regras-lista, .chamada-final { grid-template-columns: minmax(0, 1fr); }
  /* Filtros dois a dois: empilhados, eles ocupavam a primeira tela inteira do celular. */
  .grade-filtros { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--e3); }
  .grade-filtros > .campo-fim { grid-column: 1 / -1; }
  .chamada-final > div + div { padding-left: 0; padding-top: var(--e6); box-shadow: inset 0 1px 0 rgba(255,255,255,.22); }
  .campo-marca { padding: var(--e6) var(--e5); }
  .termos div { grid-template-columns: minmax(0, 1fr); gap: 2px; }

  .regua-degrau { gap: var(--e2); padding: 9px 10px; }

  /* Alvo de toque confortavel. */
  .botao { padding: 11px 18px; }
  .botao-pequeno { padding: 9px 14px; }
}

@media (max-width: 390px) {
  /* Empilhada, a busca deixa de ser pilula: um retangulo de pilula com dois
     andares parecia um botao deformado. */
  .busca-principal { flex-direction: column; border-radius: var(--raio); }
  .busca-principal .botao { width: 100%; }
  .agenda-aberta-onde { white-space: normal; }
  .regua { grid-template-columns: 1fr auto; }
  .regua-degrau .regua-barra { display: none; }
}

/* Impressao: quem imprimir a tela nao leva o cromo junto. */
@media print {
  .topo, .rodape, .progresso, .botao, .pular { display: none !important; }
  body { background: #fff; }
  .cartao { box-shadow: none; border-color: #ccc; break-inside: avoid; }
}
`;
