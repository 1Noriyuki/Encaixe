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
  /* --- superficies e texto --- */
  --fundo: #f5f6fa;
  --fundo-fundo: #eceef6;
  --superficie: #ffffff;
  --superficie-2: #f1f3f9;
  --superficie-3: #e6e9f4;
  --borda: #e0e3ee;
  --borda-forte: #cbd0e2;
  --texto: #171a26;
  --texto-fraco: #5b6379;
  --texto-tenue: #7c849c;

  /* --- marca --- */
  --primaria: #3b41c5;
  --primaria-forte: #2b30a0;
  --primaria-fraca: #eaebfb;
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
  --txt-mini: 0.75rem;
  --txt-peq: 0.8438rem;
  --txt-corpo: 0.9688rem;
  --txt-md: 1.0625rem;
  --txt-lg: 1.1875rem;
  --txt-xl: 1.4375rem;
  --txt-2xl: 1.75rem;

  /* --- ritmo vertical e horizontal --- */
  --e1: 4px;  --e2: 8px;  --e3: 12px; --e4: 16px;
  --e5: 24px; --e6: 32px; --e7: 48px; --e8: 72px;

  /* --- forma --- */
  --raio-p: 8px;
  --raio: 13px;
  --raio-g: 20px;
  --pilula: 999px;
  --largura: 1140px;

  /* --- profundidade --- */
  --sombra: 0 1px 2px rgba(20,25,50,.05), 0 3px 12px rgba(20,25,50,.045);
  --sombra-alta: 0 2px 4px rgba(20,25,50,.04), 0 14px 34px rgba(20,25,50,.10);
  --sombra-flutuante: 0 18px 50px -14px rgba(20,25,50,.30);

  /* --- movimento --- */
  --mola: cubic-bezier(.22,.68,.36,1);
  --rapido: .18s var(--mola);
  --medio: .32s var(--mola);

  --grao: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='r'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23r)' opacity='.42'/%3E%3C/svg%3E");
}

@media (prefers-color-scheme: dark) {
  :root {
    --fundo: #121420;
    --fundo-fundo: #0d0f18;
    --superficie: #1b1e2b;
    --superficie-2: #232739;
    --superficie-3: #2c3145;
    --borda: #2e3345;
    --borda-forte: #3f465d;
    --texto: #eef0f7;
    --texto-fraco: #a7aec5;
    --texto-tenue: #868da4;

    --primaria: #8b90ff;
    --primaria-forte: #a8acff;
    --primaria-fraca: #23264a;
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

    --sombra: 0 1px 2px rgba(0,0,0,.34), 0 3px 14px rgba(0,0,0,.24);
    --sombra-alta: 0 2px 4px rgba(0,0,0,.3), 0 16px 38px rgba(0,0,0,.42);
    --sombra-flutuante: 0 20px 55px -14px rgba(0,0,0,.72);
  }
}

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
  letter-spacing: -.021em;
  line-height: 1.22;
  font-weight: 700;
}
p { text-wrap: pretty; }

h2 { font-size: var(--txt-lg); margin: var(--e6) 0 var(--e3); }
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
.preco-vigente, .preco-base, .metrica .valor, .heroi-numeros dt,
.vaga-quando .hora, .cartao-flutuante .agora, .regua-preco, .num {
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
  background: color-mix(in srgb, var(--superficie) 84%, transparent);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
  border-bottom: 1px solid transparent;
  transition: border-color var(--medio), box-shadow var(--medio);
}
.topo.rolado {
  border-bottom-color: var(--borda);
  box-shadow: 0 1px 22px rgba(20,25,50,.07);
}

.topo-interno {
  max-width: var(--largura); margin: 0 auto; padding: 0 var(--e5);
  display: flex; align-items: center; gap: var(--e5); min-height: 64px;
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
  color: var(--texto-fraco); padding: 8px 12px; border-radius: var(--raio-p);
  font-size: var(--txt-peq); font-weight: 600; white-space: nowrap;
  transition: background var(--rapido), color var(--rapido);
}
.nav a:hover { background: var(--superficie-2); color: var(--texto); text-decoration: none; }
.nav a[aria-current="page"] { background: var(--primaria-fraca); color: var(--primaria-forte); }

.topo-conta {
  display: flex; align-items: center; gap: var(--e3);
  margin-left: var(--e3); padding-left: var(--e3);
  border-left: 1px solid var(--borda); flex-shrink: 0;
}
.nav-perfil {
  display: flex; align-items: center; gap: var(--e2);
  font-size: var(--txt-mini); color: var(--texto-fraco); white-space: nowrap;
}
.nav-perfil .quem { font-weight: 600; color: var(--texto); }

.sino {
  position: relative; display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px; border-radius: var(--pilula);
  background: var(--superficie-2); color: var(--texto-fraco);
  font-size: var(--txt-mini); font-weight: 650;
}
.sino:hover { text-decoration: none; color: var(--texto); background: var(--superficie-3); }
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
.cabecalho-pagina h1 { margin: 0 0 6px; font-size: var(--txt-2xl); letter-spacing: -.03em; }
.cabecalho-pagina p { margin: 0; color: var(--texto-fraco); max-width: 64ch; }

.secao-titulo {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: var(--e4); flex-wrap: wrap; margin: var(--e7) 0 var(--e4);
}
.secao-titulo:first-child { margin-top: 0; }
.secao-titulo h2 { margin: 0; font-size: var(--txt-xl); }
.secao-titulo p { margin: 5px 0 0; color: var(--texto-fraco); font-size: var(--txt-peq); max-width: 60ch; }
.olho {
  display: block; font-size: var(--txt-mini); font-weight: 700;
  letter-spacing: .11em; text-transform: uppercase;
  color: var(--primaria); margin-bottom: 5px;
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
  border-top: 1px solid var(--borda);
  background: var(--fundo-fundo);
  color: var(--texto-fraco); font-size: var(--txt-peq);
  flex-shrink: 0;
}
.rodape-interno {
  max-width: var(--largura); margin: 0 auto; padding: var(--e6) var(--e5) var(--e7);
  display: grid; gap: var(--e5);
  grid-template-columns: minmax(230px, 1.5fr) repeat(auto-fit, minmax(140px, 1fr));
}
.rodape h2 {
  font-size: var(--txt-mini); text-transform: uppercase; letter-spacing: .1em;
  margin: 0 0 var(--e2); color: var(--texto-tenue);
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
  padding: 0 var(--e5) var(--e6);
  font-size: var(--txt-mini); color: var(--texto-tenue);
}

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
  box-shadow: var(--sombra);
  transition: transform var(--medio), box-shadow var(--medio), border-color var(--medio);
}
.cartao + .cartao { margin-top: var(--e3); }
.cartao > :first-child { margin-top: 0; }
.cartao > :last-child { margin-bottom: 0; }
.cartao-vivo:hover {
  transform: translateY(-3px);
  box-shadow: var(--sombra-alta);
  border-color: color-mix(in srgb, var(--primaria) 34%, var(--borda));
}
.cartao-calmo { box-shadow: none; background: var(--superficie-2); border-color: transparent; }
.cartao-realce { border-left: 3px solid var(--primaria); }
.cartao-alerta { border-left: 3px solid var(--perigo); }

.lista-cartoes { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--e3); }

/* Card inteiro clicavel: o <a> do titulo se estica sobre o cartao pelo
   ::after. Um unico link na arvore de acessibilidade, foco por teclado
   intacto, texto ainda selecionavel. */
.item-clicavel { position: relative; cursor: pointer; }
.item-clicavel:hover { background: color-mix(in srgb, var(--primaria) 4%, var(--superficie)); }
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
.selo-regra {
  background: var(--superficie-2); color: var(--texto-fraco);
  font-family: var(--fonte-mono); font-size: 11.5px; font-weight: 650;
  letter-spacing: -.01em;
}
.selo-regra::before, .selo-desconto::before { display: none; }

/* ==============================================================
   8. BOTOES
   ============================================================== */
.botao {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px 18px; border-radius: var(--raio-p);
  border: 1px solid transparent;
  background: var(--primaria); color: var(--sobre-primaria);
  font-family: inherit; font-size: var(--txt-peq); font-weight: 650;
  line-height: 1.45; cursor: pointer; text-align: center;
  box-shadow: 0 1px 2px rgba(20,25,50,.09);
  transition: transform var(--rapido), background var(--rapido), box-shadow var(--medio), filter var(--rapido);
}
.botao:hover {
  background: var(--primaria-forte); color: var(--sobre-primaria); text-decoration: none;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--primaria) 72%, transparent);
}
.botao:active { transform: translateY(0); }
.botao:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.botao-secundario { background: var(--superficie); color: var(--texto); border-color: var(--borda-forte); }
.botao-secundario:hover { background: var(--superficie-2); color: var(--texto); box-shadow: var(--sombra); }
.botao-perigo { background: var(--perigo); color: var(--sobre-perigo); }
.botao-perigo:hover {
  background: var(--perigo); filter: brightness(.9);
  box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--perigo) 70%, transparent);
}
.botao-fantasma { background: transparent; color: var(--texto-fraco); border-color: transparent; box-shadow: none; }
.botao-fantasma:hover { background: var(--superficie-2); color: var(--texto); box-shadow: none; }
.botao-pequeno { padding: 7px 13px; font-size: var(--txt-mini); }
.botao-grande { padding: 13px 24px; font-size: var(--txt-corpo); }
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

input, select, textarea {
  width: 100%; padding: 10px 12px;
  border: 1px solid var(--borda-forte); border-radius: var(--raio-p);
  background: var(--superficie); color: var(--texto);
  font: inherit; font-size: var(--txt-peq);
  transition: border-color var(--rapido), box-shadow var(--rapido);
}
input::placeholder, textarea::placeholder { color: var(--texto-tenue); }
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
  border: 1px solid var(--borda-forte);
  border-radius: var(--raio-g);
  padding: var(--e2);
  box-shadow: var(--sombra-alta);
}
.busca-principal input {
  border: 0; background: transparent; box-shadow: none;
  font-size: var(--txt-corpo); padding: 10px 14px;
}
.busca-principal input:hover { border-color: transparent; }
.busca-principal input:focus { box-shadow: none; }
.busca-principal:focus-within { border-color: var(--primaria); }
.busca-principal .botao { border-radius: var(--raio-p); flex-shrink: 0; }

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
  border-left: 3px solid var(--primaria);
  padding: 11px 15px; border-radius: 0 var(--raio-p) var(--raio-p) 0;
  font-size: var(--txt-peq); color: var(--texto-fraco);
  margin: var(--e4) 0 0;
}
.regra-nota code {
  color: var(--primaria-forte); font-weight: 700; flex-shrink: 0;
  font-size: var(--txt-mini); letter-spacing: -.01em;
}

/* ==============================================================
   11. PRECO E OPORTUNIDADE
   ============================================================== */
.preco { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }
.preco-base {
  color: var(--texto-tenue); text-decoration: line-through;
  text-decoration-thickness: 1.5px; font-size: var(--txt-peq);
}
.preco-vigente { font-size: 1.625rem; font-weight: 750; letter-spacing: -.035em; line-height: 1.1; }
.preco-nota { font-size: var(--txt-mini); color: var(--texto-fraco); margin-top: 4px; }
.preco-nota strong { color: var(--desconto); font-weight: 700; }

/* Regua de desconto: como o preco caminha ate o horario. Todos os degraus
   vem do dominio (projetarRegua) - o navegador so desenha (INV-14). */
.regua { list-style: none; padding: 0; margin: 0; display: grid; gap: 2px; }
.regua-degrau {
  display: grid; grid-template-columns: 96px 1fr auto; align-items: center;
  gap: var(--e3); padding: 10px 12px; border-radius: var(--raio-p);
  font-size: var(--txt-peq);
}
.regua-quando { color: var(--texto-fraco); font-size: var(--txt-mini); white-space: nowrap; }
.regua-barra { height: 8px; border-radius: var(--pilula); background: var(--superficie-2); overflow: hidden; }
.regua-barra > i {
  display: block; height: 100%; border-radius: var(--pilula);
  background: linear-gradient(90deg, var(--primaria), var(--acento));
}
.regua-preco { font-weight: 700; white-space: nowrap; }
.regua-degrau.agora { background: var(--desconto-fraco); box-shadow: inset 0 0 0 1px var(--desconto-borda); }
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
.vaga-quando .dia {
  font-size: var(--txt-mini); color: var(--texto-fraco);
  text-transform: uppercase; letter-spacing: .06em; font-weight: 650;
}
.vaga-quando .hora { font-size: 1.375rem; font-weight: 750; letter-spacing: -.03em; line-height: 1.2; }
.vaga-quando .duracao { font-size: var(--txt-mini); color: var(--texto-tenue); }

.vaga-corpo { flex: 1; min-width: 0; }
.vaga-titulo { font-weight: 650; font-size: var(--txt-md); letter-spacing: -.015em; }
.vaga-meta {
  display: flex; flex-wrap: wrap; gap: 3px var(--e2);
  font-size: var(--txt-peq); color: var(--texto-fraco); margin-top: 2px;
}
.vaga-meta .ponto { color: var(--borda-forte); }
.vaga-sinais { display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--e3); }
.vaga-lado {
  flex-shrink: 0; min-width: 198px;
  display: flex; flex-direction: column; justify-content: space-between; gap: var(--e3);
  text-align: right;
}
.vaga-lado form { width: 100%; }

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
.agenda-lista { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--e2); }

/* ==============================================================
   14. TABELAS
   ============================================================== */
.tabela-rolagem { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; font-size: var(--txt-peq); }
th, td { padding: 11px 13px; text-align: left; border-bottom: 1px solid var(--borda); vertical-align: top; }
th {
  font-size: var(--txt-mini); text-transform: uppercase; letter-spacing: .05em;
  color: var(--texto-tenue); font-weight: 700; white-space: nowrap;
}
tbody tr:last-child td { border-bottom: none; }
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
  background: var(--superficie-2); border-radius: var(--raio);
  padding: var(--e4) var(--e4) 15px;
  border: 1px solid transparent;
  transition: border-color var(--medio);
}
.metrica:hover { border-color: var(--borda); }
.metrica .valor { font-size: var(--txt-2xl); font-weight: 750; letter-spacing: -.035em; line-height: 1.15; }
.metrica .rotulo { font-size: var(--txt-mini); color: var(--texto-fraco); font-weight: 600; margin-top: 2px; }
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
  background: repeating-linear-gradient(135deg,
    transparent 0 10px,
    color-mix(in srgb, var(--borda) 24%, transparent) 10px 11px);
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
.rotulo-filtros {
  font-size: var(--txt-mini); color: var(--texto-tenue); font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
}
.chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 7px 5px 13px; border-radius: var(--pilula);
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
.chip-neutro { background: var(--superficie-2); color: var(--texto-fraco); }
a.chip-neutro:hover { background: var(--superficie-3); color: var(--texto); }

/* ==============================================================
   18. PASSOS NUMERADOS
   ============================================================== */
.passo { position: relative; padding-top: var(--e3); }
.passo::before {
  content: attr(data-passo); display: block; margin-bottom: var(--e3);
  font-family: var(--fonte-mono); font-size: var(--txt-peq); font-weight: 700;
  color: var(--primaria); letter-spacing: .08em;
}
.passo::after {
  content: ''; position: absolute; top: 0; left: 0; height: 2px; width: 36px;
  background: linear-gradient(90deg, var(--primaria), transparent); border-radius: 2px;
}
.passo h3 { margin: 0 0 6px; font-size: var(--txt-md); }
.passo p { margin: 0; }

/* ==============================================================
   19. FAIXA DE CHAMADA
   ============================================================== */
.faixa {
  position: relative; overflow: hidden;
  border-radius: var(--raio-g); padding: var(--e7) var(--e6);
  background: linear-gradient(125deg, #262a91, #3b41c5 52%, #8f4a6e 100%);
  color: #fff; box-shadow: var(--sombra-alta);
}
.faixa::before {
  content: ''; position: absolute; inset: 0;
  background-image: var(--grao); opacity: .2; mix-blend-mode: soft-light;
}
.faixa > * { position: relative; }
.faixa h2 { margin: 0 0 var(--e2); font-size: var(--txt-2xl); color: #fff; }
.faixa p { margin: 0 0 var(--e5); color: rgba(255,255,255,.88); max-width: 54ch; }
.faixa .botao { background: #fff; color: #262a91; }
.faixa .botao:hover { background: #fff; color: #262a91; filter: brightness(.94); }
.faixa .botao-secundario { background: transparent; color: #fff; border-color: rgba(255,255,255,.5); }
.faixa .botao-secundario:hover { background: rgba(255,255,255,.14); color: #fff; filter: none; }

/* ==============================================================
   20. HERO
   ============================================================== */
.progresso {
  position: fixed; top: 0; left: 0; height: 2px; z-index: 30;
  width: var(--avanco, 0%);
  background: linear-gradient(90deg, var(--primaria), var(--acento));
  transition: width .1s linear;
}

.heroi { position: relative; overflow: clip; border-bottom: 1px solid var(--borda); isolation: isolate; }
.heroi-fundo { position: absolute; inset: 0; z-index: -1; pointer-events: none; }
.heroi-brilho {
  position: absolute; border-radius: 50%; filter: blur(90px); opacity: .5;
  animation: derivar 22s ease-in-out infinite alternate;
}
.heroi-brilho-a {
  width: 46vw; height: 46vw; max-width: 620px; max-height: 620px; top: -22%; left: -8%;
  background: radial-gradient(circle, var(--primaria) 0%, transparent 68%);
}
.heroi-brilho-b {
  width: 38vw; height: 38vw; max-width: 520px; max-height: 520px; bottom: -30%; right: -6%;
  background: radial-gradient(circle, var(--acento) 0%, transparent 66%);
  animation-duration: 27s; animation-direction: alternate-reverse;
}
@keyframes derivar {
  from { transform: translate3d(0,0,0) scale(1); }
  to   { transform: translate3d(4%, 6%, 0) scale(1.14); }
}
.heroi-grade {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(to right, color-mix(in srgb, var(--borda) 70%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--borda) 70%, transparent) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 10%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 10%, transparent 75%);
  opacity: .7;
}
.heroi::after {
  content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background-image: var(--grao); opacity: .16; mix-blend-mode: overlay;
}

.heroi-interno {
  max-width: var(--largura); margin: 0 auto; padding: var(--e8) var(--e5);
  display: grid; grid-template-columns: 1.08fr .92fr; gap: var(--e7); align-items: center;
}
.heroi-texto { max-width: 35rem; }

.etiqueta {
  display: inline-flex; align-items: center; gap: var(--e2);
  padding: 6px 14px 6px 11px; border-radius: var(--pilula);
  background: var(--superficie); border: 1px solid var(--borda);
  box-shadow: var(--sombra);
  font-size: var(--txt-peq); font-weight: 600; color: var(--texto-fraco);
  margin-bottom: var(--e5);
}
.etiqueta b { color: var(--texto); font-weight: 750; }
a.etiqueta:hover { text-decoration: none; border-color: var(--borda-forte); color: var(--texto); }
.ponto-vivo {
  width: 7px; height: 7px; border-radius: 50%; background: var(--ok);
  animation: farol 2.2s ease-out infinite; flex-shrink: 0;
}
@keyframes farol {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ok) 60%, transparent); }
  70%  { box-shadow: 0 0 0 9px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

.heroi h1 {
  margin: 0 0 var(--e4);
  font-size: clamp(2.3rem, 4.9vw, 3.45rem);
  line-height: 1.05; letter-spacing: -.042em; font-weight: 800;
}
.heroi h1 em {
  font-style: normal;
  background: linear-gradient(105deg, var(--primaria) 8%, var(--acento) 92%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
.heroi-chamada {
  font-size: var(--txt-md); line-height: 1.62; color: var(--texto-fraco);
  margin: 0 0 var(--e5); max-width: 46ch;
}
.heroi-busca { margin-bottom: var(--e3); }
.heroi-atalhos { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: var(--e5); }
.heroi-atalhos .rotulo-atalhos { font-size: var(--txt-mini); color: var(--texto-tenue); margin-right: 2px; }
.heroi-acoes { display: flex; gap: var(--e3); flex-wrap: wrap; align-items: center; }

.heroi-numeros {
  display: flex; gap: var(--e6); flex-wrap: wrap;
  margin: var(--e6) 0 0; padding-top: var(--e5);
  border-top: 1px solid var(--borda);
}
.heroi-numeros div { margin: 0; }
.heroi-numeros dt { font-size: var(--txt-xl); font-weight: 800; letter-spacing: -.035em; }
.heroi-numeros dd { margin: 2px 0 0; font-size: var(--txt-mini); color: var(--texto-fraco); }

.heroi-arte { position: relative; }
.heroi-moldura {
  position: relative; margin: 0;
  border-radius: var(--raio-g); overflow: hidden;
  border: 1px solid var(--borda);
  box-shadow: var(--sombra-flutuante);
  aspect-ratio: 4 / 5;
  background: linear-gradient(140deg,
    color-mix(in srgb, var(--primaria) 22%, var(--superficie)) 0%,
    var(--superficie-2) 48%,
    color-mix(in srgb, var(--acento) 18%, var(--superficie)) 100%);
  transform: rotate(1.4deg);
  transition: transform .6s var(--mola);
}
.heroi-arte:hover .heroi-moldura { transform: rotate(0deg) translateY(-4px); }
.heroi-moldura img { width: 100%; height: 100%; object-fit: cover; object-position: 60% 38%; display: block; }
.heroi-moldura::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  /* Escurece o canto inferior esquerdo: e onde o cartao de preco branco pousa. */
  background: linear-gradient(to top right, rgba(0,0,0,.34), transparent 55%);
}

.cartao-flutuante {
  position: absolute; left: -26px; bottom: 34px; z-index: 2;
  background: var(--superficie); border: 1px solid var(--borda);
  border-radius: var(--raio); padding: 14px 16px; min-width: 238px;
  box-shadow: var(--sombra-flutuante);
  animation: boiar 6s ease-in-out infinite;
}
.cartao-flutuante-alto {
  left: auto; right: -22px; bottom: auto; top: 30px;
  min-width: 0; padding: 11px 14px; animation-delay: -3s;
}
@keyframes boiar {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-9px); }
}
.cartao-flutuante .antes { color: var(--texto-tenue); text-decoration: line-through; font-size: var(--txt-peq); }
.cartao-flutuante .agora { font-size: 1.6875rem; font-weight: 800; letter-spacing: -.035em; line-height: 1.15; }
.contagem { font-family: var(--fonte-mono); font-size: var(--txt-mini); color: var(--desconto); font-weight: 700; }

/* ==============================================================
   21. MOVIMENTO
   Tudo aqui e decoracao: nada funcional depende destas classes.
   ============================================================== */
[data-revelar] {
  opacity: 0; transform: translateY(18px);
  transition: opacity .7s var(--mola), transform .7s var(--mola);
  transition-delay: var(--atraso, 0ms);
}
[data-revelar].visivel { opacity: 1; transform: none; }

/* Sem JS a pagina nao pode ficar em branco: o script do <head> marca .sem-js. */
.sem-js [data-revelar] { opacity: 1; transform: none; transition: none; }

@media (prefers-reduced-motion: reduce) {
  [data-revelar] { opacity: 1 !important; transform: none !important; transition: none !important; }
  .marca-simbolo .peca-movel { transform: none !important; opacity: 1 !important; }
  *, *::before, *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
    scroll-behavior: auto !important;
  }
}

/* ==============================================================
   22. RESPONSIVO
   Larguras pensadas de baixo para cima: o celular nao recebe a
   grade do desktop espremida, recebe outra composicao.
   ============================================================== */
@media (max-width: 980px) {
  .heroi-interno { grid-template-columns: 1fr; gap: var(--e7); padding: var(--e7) var(--e5); }
  .heroi-texto { max-width: none; }
  .heroi-arte { max-width: 430px; }
  .heroi-moldura { aspect-ratio: 4 / 3; transform: none; }
  .cartao-flutuante { left: 0; bottom: -18px; }
  .cartao-flutuante-alto { right: 0; top: -18px; }
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
  .nav-perfil .quem { display: none; }
}

@media (max-width: 680px) {
  :root { --e5: 18px; --e6: 26px; --e7: 36px; --e8: 52px; }

  .pagina { padding: var(--e5) var(--e4) var(--e7); }
  .cartao { padding: var(--e4); }
  .cabecalho-pagina h1 { font-size: var(--txt-xl); }
  .metrica .valor { font-size: var(--txt-xl); }

  /* O cartao de horario vira empilhado, mas o trilho de tempo continua
     sendo o primeiro sinal: horario tem o mesmo peso que preco. */
  .vaga { display: grid; grid-template-columns: auto 1fr; gap: var(--e3) var(--e4); }
  .vaga-quando {
    min-width: 76px; padding: 10px 8px;
    flex-direction: row; flex-wrap: wrap; gap: 2px 8px;
    align-items: baseline; justify-content: center;
  }
  .vaga-quando::after { display: none; }
  .vaga-quando .hora { font-size: var(--txt-lg); }
  .vaga-quando .duracao { width: 100%; }
  .vaga-lado {
    grid-column: 1 / -1; min-width: 0; text-align: left;
    flex-direction: row; align-items: flex-end; justify-content: space-between;
    gap: var(--e3); flex-wrap: wrap;
    padding-top: var(--e3); border-top: 1px solid var(--borda);
  }
  .vaga-lado > * { flex: 1 1 auto; }
  .vaga-lado form, .vaga-lado > .botao { max-width: 210px; }

  .heroi-numeros { gap: var(--e4) var(--e5); }
  .heroi-numeros dt { font-size: var(--txt-lg); }
  .faixa { padding: var(--e6) var(--e5); }
  .faixa h2 { font-size: var(--txt-xl); }
  .cartao-flutuante { position: static; margin-top: var(--e4); animation: none; }
  .cartao-flutuante-alto { display: none; }

  .regua-degrau { grid-template-columns: 74px 1fr auto; gap: var(--e2); padding: 9px 10px; }

  /* Alvo de toque confortavel. */
  .botao { padding: 11px 18px; }
  .botao-pequeno { padding: 9px 14px; }
}

@media (max-width: 390px) {
  /* Manter a largura minima de desktop aqui estouraria a tela de 320 px. */
  .cartao-flutuante { min-width: 0; }
  .vaga { grid-template-columns: 1fr; }
  .vaga-quando { justify-content: flex-start; text-align: left; }
  .heroi h1 { font-size: 2.05rem; }
  .busca-principal { flex-direction: column; }
  .busca-principal .botao { width: 100%; }
  .regua-degrau { grid-template-columns: 1fr auto; }
  .regua-degrau .regua-barra { display: none; }
}

/* Impressao: quem imprimir a tela nao leva o cromo junto. */
@media print {
  .topo, .rodape, .progresso, .heroi-fundo, .botao, .pular { display: none !important; }
  body { background: #fff; }
  .cartao { box-shadow: none; border-color: #ccc; break-inside: avoid; }
}
`;
