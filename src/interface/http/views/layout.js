/**
 * Layout e componentes reutilizaveis da interface.
 *
 * Regra desta camada: monta HTML e nada mais. Nenhum calculo de preco,
 * nenhuma decisao de estado, nenhuma leitura de relogio para regra - tudo
 * isso chega pronto do dominio e da aplicacao.
 */

import { html, cru, juntar, paraTexto } from '../html.js';
import { rotulo, tom } from '../../../dominio/estados.js';
import { formatarBRL } from '../../../dominio/dinheiro.js';
import {
  formatarDataHora, formatarHora, formatarDiaSemana, humanizarMinutos,
} from '../../../dominio/tempo.js';

const DESCRICAO_PADRAO = 'Encaixe: horários ociosos de prestadores locais, '
  + 'com preço que cai conforme a hora se aproxima.';

/**
 * Marca do produto (docs/identidade-visual/): um E feito de tres faixas de
 * agenda. A do meio, na cor de acento, e o horario vago entrando no lugar.
 * As cores vem dos tokens, entao a marca acompanha o tema escuro.
 */
const MARCA_SVG = `<svg class="marca-simbolo" viewBox="10 10 44 44" aria-hidden="true" focusable="false">
  <rect x="14" y="12" width="11" height="40" rx="3.5" fill="var(--primaria)"/>
  <rect x="14" y="12" width="36" height="11" rx="3.5" fill="var(--primaria)"/>
  <rect x="14" y="41" width="36" height="11" rx="3.5" fill="var(--primaria)"/>
  <rect class="peca-movel" x="30" y="26.5" width="20" height="11" rx="3.5" fill="var(--acento)"/>
</svg>`;

/**
 * A palavra "encaixe" em Bricolage Grotesque 700, ja convertida em curvas: o
 * desenho da marca nao depende de baixar fonte nenhuma (ADR-001).
 */
const PALAVRA_SVG = `<svg class="marca-palavra" viewBox="0 0 123.1 27.5" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9.88 27.47L9.88 27.47Q7.18 27.47 5.30 26.67Q3.42 25.88 2.24 24.47Q1.06 23.06 0.53 21.24Q0 19.42 0 17.33L0 17.33Q0 15.16 0.55 13.20Q1.10 11.25 2.24 9.73Q3.38 8.21 5.21 7.33Q7.03 6.46 9.50 6.46L9.50 6.46Q11.97 6.46 13.76 7.31Q15.54 8.17 16.63 9.69Q17.71 11.21 18.07 13.24Q18.43 15.27 18.09 17.71L18.09 17.71L3.38 17.93L3.38 14.86L13.91 14.63L13.15 16.41Q13.34 14.67 13.00 13.41Q12.65 12.16 11.80 11.49Q10.94 10.83 9.50 10.83L9.50 10.83Q7.98 10.83 7.05 11.61Q6.12 12.39 5.70 13.79Q5.28 15.20 5.28 17.06L5.28 17.06Q5.28 20.29 6.44 21.81Q7.60 23.33 9.92 23.33L9.92 23.33Q10.98 23.33 11.69 23.05Q12.39 22.76 12.83 22.25Q13.26 21.73 13.43 21.05Q13.60 20.37 13.57 19.57L13.57 19.57L18.58 19.87Q18.66 21.20 18.26 22.55Q17.86 23.90 16.85 25.00Q15.85 26.10 14.12 26.79Q12.39 27.47 9.88 27.47ZM25.27 26.94L19.80 26.94L19.80 16.11L19.76 6.99L24.47 6.99L24.32 15.43L24.66 15.43Q24.89 12.39 25.67 10.41Q26.45 8.43 27.87 7.45Q29.30 6.46 31.50 6.46L31.50 6.46Q34.77 6.46 36.40 8.68Q38.04 10.90 38.04 15.39L38.04 15.39L38.04 26.94L32.57 26.94L32.57 16.00Q32.57 13.60 31.86 12.42Q31.16 11.25 29.60 11.25L29.60 11.25Q28.27 11.25 27.30 12.16Q26.33 13.07 25.80 15.05Q25.27 17.02 25.27 20.25L25.27 20.25L25.27 26.94ZM49.21 27.47L49.21 27.47Q46.63 27.47 44.74 26.67Q42.86 25.88 41.65 24.45Q40.43 23.03 39.86 21.16Q39.29 19.30 39.29 17.17L39.29 17.17Q39.29 15.01 39.86 13.09Q40.43 11.17 41.61 9.67Q42.79 8.17 44.67 7.31Q46.55 6.46 49.13 6.46L49.13 6.46Q52.17 6.46 54.09 7.62Q56.01 8.78 56.81 10.62Q57.61 12.46 57.34 14.59L57.34 14.59L52.55 15.01Q52.59 13.60 52.17 12.67Q51.76 11.74 50.96 11.27Q50.16 10.79 49.02 10.79L49.02 10.79Q48.11 10.79 47.33 11.13Q46.55 11.47 45.98 12.22Q45.41 12.96 45.11 14.12Q44.80 15.27 44.80 16.91L44.80 16.91Q44.80 19.00 45.33 20.42Q45.87 21.85 46.87 22.59Q47.88 23.33 49.29 23.33L49.29 23.33Q50.81 23.33 51.62 22.63Q52.44 21.92 52.74 20.84Q53.05 19.76 52.90 18.62L52.90 18.62L57.95 18.88Q58.14 20.59 57.72 22.13Q57.30 23.67 56.24 24.89Q55.18 26.10 53.43 26.79Q51.68 27.47 49.21 27.47ZM64.33 27.47L64.33 27.47Q62.78 27.47 61.43 26.92Q60.08 26.37 59.22 25.19Q58.37 24.01 58.37 22.04L58.37 22.04Q58.37 20.21 59.07 19.05Q59.77 17.90 60.99 17.21Q62.21 16.53 63.65 16.15Q65.09 15.77 66.58 15.50L66.58 15.50Q68.59 15.12 69.60 14.91Q70.60 14.70 70.95 14.38Q71.29 14.06 71.29 13.49L71.29 13.49Q71.29 12.20 70.38 11.53Q69.46 10.87 67.98 10.87L67.98 10.87Q67.11 10.87 66.20 11.19Q65.28 11.51 64.69 12.35Q64.11 13.18 64.11 14.67L64.11 14.67L59.20 14.25Q59.20 11.97 59.98 10.47Q60.76 8.97 62.09 8.09Q63.42 7.22 65.02 6.84Q66.61 6.46 68.17 6.46L68.17 6.46Q70.98 6.46 72.86 7.50Q74.75 8.55 75.70 10.56Q76.65 12.58 76.65 15.50L76.65 15.50L76.65 19.11Q76.65 20.40 76.65 21.72Q76.65 23.03 76.66 24.34Q76.68 25.65 76.68 26.94L76.68 26.94L71.86 26.94Q71.90 25.50 71.93 24.01Q71.97 22.53 71.97 20.94L71.97 20.94L71.74 20.94Q71.55 22.72 70.57 24.20Q69.58 25.69 67.98 26.58Q66.39 27.47 64.33 27.47ZM66.46 23.41L66.46 23.41Q67.22 23.41 68.08 23.08Q68.93 22.76 69.65 22.10Q70.38 21.43 70.83 20.35Q71.29 19.26 71.29 17.71L71.29 17.71L71.33 16.83L72.31 16.64Q72.01 17.17 71.23 17.48Q70.45 17.78 69.50 17.95Q68.55 18.12 67.56 18.31Q66.58 18.50 65.74 18.81Q64.90 19.11 64.39 19.66Q63.88 20.21 63.88 21.16L63.88 21.16Q63.88 22.23 64.60 22.82Q65.32 23.41 66.46 23.41ZM83.87 26.94L78.39 26.94L78.39 6.99L83.87 6.99L83.87 26.94ZM81.09 5.28L81.09 5.28Q79.50 5.28 78.66 4.60Q77.82 3.91 77.82 2.66L77.82 2.66Q77.82 1.37 78.66 0.68Q79.50-0.00 81.09-0.00L81.09-0.00Q82.69-0.00 83.54 0.68Q84.40 1.37 84.40 2.66L84.40 2.66Q84.40 3.91 83.54 4.60Q82.69 5.28 81.09 5.28ZM90.90 26.94L84.59 26.94L91.01 16.95L84.63 6.99L91.01 6.99L94.39 13.79L94.54 13.79L97.89 6.99L104.20 6.99L97.96 16.95L104.27 26.94L97.81 26.94L94.51 20.25L94.39 20.25L90.90 26.94ZM114.30 27.47L114.30 27.47Q111.61 27.47 109.73 26.67Q107.84 25.88 106.67 24.47Q105.49 23.06 104.96 21.24Q104.42 19.42 104.42 17.33L104.42 17.33Q104.42 15.16 104.98 13.20Q105.53 11.25 106.67 9.73Q107.81 8.21 109.63 7.33Q111.45 6.46 113.92 6.46L113.92 6.46Q116.39 6.46 118.18 7.31Q119.97 8.17 121.05 9.69Q122.13 11.21 122.49 13.24Q122.85 15.27 122.51 17.71L122.51 17.71L107.81 17.93L107.81 14.86L118.33 14.63L117.57 16.41Q117.76 14.67 117.42 13.41Q117.08 12.16 116.22 11.49Q115.37 10.83 113.92 10.83L113.92 10.83Q112.40 10.83 111.47 11.61Q110.54 12.39 110.12 13.79Q109.71 15.20 109.71 17.06L109.71 17.06Q109.71 20.29 110.87 21.81Q112.02 23.33 114.34 23.33L114.34 23.33Q115.41 23.33 116.11 23.05Q116.81 22.76 117.25 22.25Q117.69 21.73 117.86 21.05Q118.03 20.37 117.99 19.57L117.99 19.57L123.01 19.87Q123.08 21.20 122.68 22.55Q122.28 23.90 121.28 25.00Q120.27 26.10 118.54 26.79Q116.81 27.47 114.30 27.47Z"/></svg>`;

/** Icone de app achatado para o favicon: fundo indigo forte, faixas brancas, peca laranja. */
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
  + "%3Crect width='32' height='32' rx='7.5' fill='%232b30a0'/%3E"
  + "%3Crect x='8.5' y='7.5' width='5' height='17' rx='1.5' fill='%23ffffff'/%3E"
  + "%3Crect x='8.5' y='7.5' width='15.5' height='5' rx='1.5' fill='%23ffffff'/%3E"
  + "%3Crect x='8.5' y='19.5' width='15.5' height='5' rx='1.5' fill='%23ffffff'/%3E"
  + "%3Crect x='15.5' y='13.5' width='8.5' height='5' rx='1.5' fill='%23f97316'/%3E%3C/svg%3E";

/**
 * Estrutura completa da pagina.
 * Devolve HTML ja seguro (`cru`): o conteudo interpolado abaixo passou por
 * `paraTexto`, entao o resultado nao pode ser escapado de novo pelo servidor.
 */
export function pagina({
  titulo, usuario, avisos = [], naoLidas = 0, caminho = '/', corpo, estreita = false, hero = null,
  origem = '', descricao = DESCRICAO_PADRAO,
}) {
  return cru(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${paraTexto(titulo)} - Encaixe</title>
<meta name="description" content="${paraTexto(descricao)}">
<meta name="theme-color" content="#3b41c5">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Encaixe">
<meta property="og:title" content="${paraTexto(titulo)} - Encaixe">
<meta property="og:description" content="${paraTexto(descricao)}">
<meta property="og:url" content="${paraTexto(origem)}${paraTexto(caminho)}">
<meta property="og:image" content="${paraTexto(origem)}/estatico/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Cabeleireira penteando uma cliente em um salão de bairro">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${paraTexto(origem)}${paraTexto(caminho)}">
<link rel="preload" href="/estatico/bricolage-grotesque.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/estatico/estilo.css">
<link rel="icon" href="${FAVICON}">
</head>
<body class="sem-js">
<script>document.body.classList.remove('sem-js');
// Rede de segurança: se /estatico/interacoes.js não rodar, nada pode ficar invisível.
setTimeout(function(){if(!document.documentElement.dataset.animado){document.body.classList.add('sem-js');}},2000);</script>
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
<div class="progresso" aria-hidden="true"></div>
${paraTexto(topo(usuario, naoLidas, caminho))}
${hero ? paraTexto(hero) : ''}
<main id="conteudo" class="pagina${estreita ? ' pagina-estreita' : ''}">
${paraTexto(juntar(avisos.map(caixaDeAviso)))}
${paraTexto(corpo)}
</main>
${paraTexto(rodape())}
<script src="/estatico/interacoes.js" defer></script>
</body>
</html>`);
}

// ------------------------------------------------------------ cabecalho

function topo(usuario, naoLidas, caminho) {
  const links = [];

  if (!usuario) {
    links.push(['/buscar', 'Buscar horários']);
    links.push(['/entrar', 'Entrar']);
    links.push(['/cadastrar', 'Criar conta']);
  } else if (usuario.perfil === 'CLIENTE') {
    links.push(['/buscar', 'Buscar horários']);
    links.push(['/meus-agendamentos', 'Meus agendamentos']);
  } else if (usuario.perfil === 'PRESTADOR') {
    links.push(['/prestador', 'Painel']);
    links.push(['/prestador/horarios', 'Agenda']);
    links.push(['/prestador/agendamentos', 'Agendamentos']);
    links.push(['/prestador/extrato', 'Extrato']);
    links.push(['/prestador/catalogo', 'Serviços e régua']);
    links.push(['/prestador/perfil', 'Perfil']);
  } else if (usuario.perfil === 'ADMIN') {
    links.push(['/admin', 'Painel']);
    links.push(['/admin/disputas', 'Disputas']);
    links.push(['/admin/contas', 'Contas']);
    links.push(['/admin/parametros', 'Parâmetros']);
    links.push(['/admin/auditoria', 'Auditoria']);
  }

  // `aria-current` faz a pagina atual ser anunciada por leitor de tela; a
  // cor sozinha nao cumpre esse papel.
  const navegacao = juntar(links.map(([href, texto]) => {
    const aqui = caminho === href || caminho.startsWith(`${href}/`);
    return html`<a href="${href}"${aqui ? cru(' aria-current="page"') : cru('')}>${texto}</a>`;
  }));

  const areaConta = usuario
    ? html`
      <div class="topo-conta">
        <a href="/notificacoes" class="sino"
           aria-label="${naoLidas > 0 ? `Avisos: ${naoLidas} não ${naoLidas === 1 ? 'lido' : 'lidos'}` : 'Avisos'}">
          ${cru(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`)}
          <span>Avisos</span>
          ${naoLidas > 0 ? html`<span class="sino-contador" aria-hidden="true">${naoLidas}</span>` : cru('')}
        </a>
        <span class="nav-perfil">
          <span class="quem">${usuario.nome}</span>
          <a href="/sair">sair</a>
        </span>
      </div>`
    : cru('');

  return html`
<header class="topo">
  <div class="topo-interno">
    <a class="marca" href="/" aria-label="Encaixe, página inicial">${cru(MARCA_SVG)}${cru(PALAVRA_SVG)}</a>
    <nav class="nav" aria-label="Navegação principal">${navegacao}</nav>
    ${areaConta}
  </div>
</header>`;
}

function rodape() {
  return html`
<footer class="rodape">
  <div class="rodape-interno">
    <div>
      <div class="rodape-marca" role="img" aria-label="Encaixe">${cru(MARCA_SVG)}${cru(PALAVRA_SVG)}</div>
      <p class="rodape-nota">
        Marketplace de horários ociosos de prestadores de serviço locais.
        O preço cai conforme o horário se aproxima, seguindo a régua que o
        próprio prestador define.
      </p>
    </div>
    <div>
      <h2>Para clientes</h2>
      <ul>
        <li><a href="/buscar">Buscar horários</a></li>
        <li><a href="/meus-agendamentos">Meus agendamentos</a></li>
        <li><a href="/cadastrar">Criar conta</a></li>
      </ul>
    </div>
    <div>
      <h2>Para prestadores</h2>
      <ul>
        <li><a href="/cadastrar?perfil=PRESTADOR">Cadastrar meu negócio</a></li>
        <li><a href="/prestador/horarios">Publicar horário</a></li>
        <li><a href="/prestador/extrato">Extrato de comissão</a></li>
      </ul>
    </div>
    <div>
      <h2>Como funciona</h2>
      <ul>
        <li><a href="/#como-funciona">Os três passos</a></li>
        <li><a href="/#preco">Preço que cai</a></li>
        <li><a href="/#regras">Regras e confiança</a></li>
      </ul>
    </div>
  </div>
  <div class="rodape-fim">
    Projeto acadêmico de Modelagem de Software (2026-2, turma 04I).
    A especificação é a fonte de verdade: <code>docs/spec.md</code>.
    Os códigos <code>RN</code>, <code>RF</code> e <code>INV</code> que aparecem nas telas
    apontam a regra que governa cada comportamento.
  </div>
</footer>`;
}

// ------------------------------------------------------------ componentes

const ICONES_AVISO = {
  'aviso-sucesso': '<path d="M20 6 9 17l-5-5"/>',
  'aviso-erro': '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>',
  'aviso-atencao': '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  'aviso-info': '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 7.5v.01"/>',
};

export function caixaDeAviso(aviso) {
  const classe = {
    sucesso: 'aviso-sucesso', erro: 'aviso-erro', info: 'aviso-info', atencao: 'aviso-atencao',
  }[aviso.tipo] ?? 'aviso-info';

  // Erro e sucesso precisam chegar ao leitor de tela assim que a pagina abre.
  const papel = classe === 'aviso-erro' ? ' role="alert"' : ' role="status"';

  return html`
  <div class="aviso ${classe}"${cru(papel)}>
    ${cru(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES_AVISO[classe]}</svg>`)}
    <div class="aviso-corpo">
      ${aviso.titulo ? html`<strong>${aviso.titulo}</strong>` : ''}
      ${aviso.texto}
      ${aviso.regra ? html` <span class="selo selo-regra">${aviso.regra}</span>` : ''}
    </div>
  </div>`;
}

export function selo(estado) {
  return html`<span class="selo selo-${tom(estado)}">${rotulo(estado)}</span>`;
}

export function seloRegra(regra) {
  return regra ? html`<span class="selo selo-regra">${regra}</span>` : cru('');
}

/** Nota que liga o comportamento da tela a uma regra da spec. */
export function notaDeRegra(regra, texto) {
  return html`<p class="regra-nota"><code>${regra}</code> <span>${texto}</span></p>`;
}

export function campoCsrf(csrf) {
  return cru(`<input type="hidden" name="_csrf" value="${paraTexto(csrf)}">`);
}

/** "3 horários" / "1 horário" - sem o "(s)" que denuncia texto gerado. */
export function plural(quantidade, singular, pluralForma) {
  return `${quantidade} ${Number(quantidade) === 1 ? singular : pluralForma}`;
}

/**
 * Reputacao (RN-23). A barra e decorativa: o numero ao lado ja diz tudo,
 * entao ela fica fora da arvore de acessibilidade.
 */
export function reputacao(valor, { rotuloTexto = 'Reputação' } = {}) {
  const classe = valor < 40 ? ' baixa' : (valor < 50 ? ' media' : '');
  return html`
    <div class="reputacao-bloco">
      <span class="mini fraco">${rotuloTexto}</span>
      <div><strong class="num">${valor}</strong><span class="mini tenue">/100</span></div>
      <div class="barra${classe}" aria-hidden="true"><i style="width:${Math.max(2, valor)}%"></i></div>
    </div>`;
}

/** Reputacao compacta, para dentro de um cartao de horario. */
export function seloReputacao(valor) {
  const cor = valor < 40 ? 'perigo' : (valor < 50 ? 'aviso' : 'ok');
  return html`<span class="selo selo-${cor}" title="Reputação do prestador, de 0 a 100 (RN-23)">Reputação ${valor}</span>`;
}

/** Nota de 1 a 5 em estrelas, com alternativa textual (RN-24). */
export function estrelas(nota) {
  const cheias = '★'.repeat(nota);
  const vazias = '☆'.repeat(5 - nota);
  return html`<span class="estrelas" role="img" aria-label="${nota} de 5 estrelas">${cheias}<span
    class="apagada" aria-hidden="true">${vazias}</span></span>`;
}

/**
 * Bloco de preco: base riscada, valor vigente e proximo degrau (RF-026).
 * Todos os numeros vem calculados do dominio - o navegador nunca precifica.
 */
export function blocoDePreco(preco) {
  return html`
  <div>
    <div class="preco">
      ${preco.economia > 0 ? html`<span class="preco-base">${formatarBRL(preco.precoBase)}</span>` : ''}
      <span class="preco-vigente">${formatarBRL(preco.precoVigente)}</span>
      ${preco.percentualEfetivo > 0
    ? html`<span class="selo selo-desconto">−${preco.percentualEfetivo}%</span>`
    : cru('')}
    </div>
    ${preco.economia > 0
    ? html`<div class="preco-nota">Você economiza <strong>${formatarBRL(preco.economia)}</strong>${preco.pisoAtingido ? ' — desconto máximo do prestador atingido' : ''}</div>`
    : html`<div class="preco-nota">Preço cheio: o desconto começa mais perto do horário</div>`}
    ${preco.proximoDegrau
    ? html`<div class="preco-nota">Cai para −${preco.proximoDegrau.percentual}% em ${humanizarMinutos(preco.proximoDegrau.emMinutos)}</div>`
    : cru('')}
  </div>`;
}

/**
 * Regua de desconto desenhada: cada degrau da projecao do dominio
 * (`projetarRegua`, RF-027) vira uma linha, com o degrau vigente destacado.
 *
 * Por construcao a primeira linha da projecao e a referencia "preco cheio" -
 * a faixa em que nenhum desconto entrou em vigor ainda. A largura da barra e
 * proporcional ao desconto; nenhum preco e calculado aqui.
 */
export function reguaDeDesconto(linhas, { antecedenciaMin = null, titulo = null } = {}) {
  if (!linhas?.length) return cru('');

  const maior = Math.max(...linhas.map((l) => l.percentualEfetivo), 1);

  // RN-01: vale a faixa de menor antecedência entre as que já cobrem o
  // instante atual. Quando ainda falta mais tempo que a maior faixa, quem
  // vale é a linha de referência (preço cheio).
  let vigente = null;
  if (antecedenciaMin != null) {
    const cobrem = linhas.filter((l) => l.antecedenciaMin >= antecedenciaMin);
    vigente = cobrem.length
      ? cobrem.reduce((menor, l) => (l.antecedenciaMin < menor.antecedenciaMin ? l : menor))
      : linhas.reduce((maiorLinha, l) => (l.antecedenciaMin > maiorLinha.antecedenciaMin ? l : maiorLinha));
  }

  return html`
  ${titulo ? html`<h3 class="sem-topo">${titulo}</h3>` : cru('')}
  <ol class="regua">
    ${juntar(linhas.map((l, i) => {
    const ehVigente = vigente != null && l.antecedenciaMin === vigente.antecedenciaMin;
    const jaPassou = vigente != null && l.antecedenciaMin > vigente.antecedenciaMin;
    const classe = ehVigente ? ' agora' : (jaPassou ? ' passado' : '');

    // A linha 0 e o "antes de qualquer faixa"; as demais comecam na propria antecedencia.
    const quando = i === 0 && linhas.length > 1
      ? `mais de ${humanizarMinutos(linhas[1].antecedenciaMin)} antes`
      : `a partir de ${humanizarMinutos(l.antecedenciaMin)} antes`;

    return html`
      <li class="regua-degrau${cru(classe)}">
        <span class="regua-quando">${ehVigente ? 'agora' : quando}</span>
        <span class="regua-barra" aria-hidden="true">
          <i style="width:${Math.round((l.percentualEfetivo / maior) * 100)}%"></i>
        </span>
        <span class="regua-preco">
          ${formatarBRL(l.precoVigente)}
          ${l.percentualEfetivo > 0
    ? html`<span class="mini fraco">−${l.percentualEfetivo}%${l.pisoAtingido ? ' (piso)' : ''}</span>`
    : html`<span class="mini fraco">preço cheio</span>`}
        </span>
      </li>`;
  }))}
  </ol>`;
}

/**
 * Cartao de um horario na busca - o componente central do produto.
 *
 * Hierarquia deliberada: quando (trilho a esquerda), o que (corpo) e quanto
 * (coluna direita). O horario tem o mesmo peso visual que o preco, para o
 * cliente nunca pensar "e barato, mas quando e?".
 */
export function cartaoDeVaga(vaga, { acao = null, href = null } = {}) {
  const nome = vaga.nome_exibicao ?? vaga.prestador_nome;
  const politica = vaga.politica_expiracao === 'AUTOCONFIRMAR'
    ? 'Confirmação automática'
    : `Responde em até ${vaga.janela_confirmacao_min} min`;

  return html`
  <article class="cartao cartao-vivo${href ? ' item-clicavel' : ''}" data-revelar>
    <div class="vaga">
      <div class="vaga-quando">
        <span class="dia">${formatarDiaSemana(vaga.inicio)}</span>
        <span class="hora">${formatarHora(vaga.inicio)}</span>
        <span class="duracao">${vaga.duracao_min} min</span>
      </div>

      <div class="vaga-corpo">
        <h3 class="vaga-titulo sem-topo sem-fundo">
          ${href
    ? html`<a class="link-estendido" href="${href}">${vaga.servico_nome}</a>`
    : vaga.servico_nome}
        </h3>
        <p class="vaga-meta sem-fundo">
          <span>${nome}</span>
          ${vaga.bairro ? html`<span class="ponto">·</span><span>${vaga.bairro}</span>` : cru('')}
          <span class="ponto">·</span><span>${vaga.categoria_nome}</span>
        </p>
        <div class="vaga-sinais">
          ${seloReputacao(vaga.prestador_reputacao)}
          <span class="selo selo-neutro">Começa em ${humanizarMinutos(vaga.preco.antecedenciaMin)}</span>
          <span class="selo selo-info">${politica}</span>
        </div>
      </div>

      <div class="vaga-lado">
        ${blocoDePreco(vaga.preco)}
        ${acao ?? cru('')}
      </div>
    </div>
  </article>`;
}

/**
 * Estado vazio. Nunca encerra a jornada: recebe alternativas de saida,
 * porque "nada encontrado" sem proximo passo e um beco.
 */
export function vazio(texto, { titulo = null, acoes = [] } = {}) {
  return html`
  <div class="vazio">
    <div class="vazio-slot" aria-hidden="true"></div>
    ${titulo ? html`<span class="vazio-titulo">${titulo}</span>` : cru('')}
    <p>${texto}</p>
    ${acoes.length
    ? html`<div class="vazio-acoes">${juntar(acoes.map(([href, rot]) => html`
        <a class="botao botao-secundario botao-pequeno" href="${href}">${rot}</a>`))}</div>`
    : cru('')}
  </div>`;
}

export function metrica(rotuloTexto, valor, detalhe = null) {
  return html`
  <div class="metrica">
    <div class="valor num">${valor}</div>
    <div class="rotulo">${rotuloTexto}</div>
    ${detalhe ? html`<div class="detalhe">${detalhe}</div>` : cru('')}
  </div>`;
}

/** Filtro aplicado, com link para removê-lo. */
export function chip(texto, { href = null, neutro = false } = {}) {
  const classe = `chip${neutro ? ' chip-neutro' : ''}`;
  if (!href) return html`<span class="${classe}">${texto}</span>`;
  return html`<a class="${classe}" href="${href}">${texto}<span
    class="so-leitor">: remover filtro</span><span class="x" aria-hidden="true">×</span></a>`;
}

/**
 * Linha de agendamento. Com `href`, a linha INTEIRA vira area de clique:
 * o link do titulo se estica sobre o <li> (`.link-estendido`), o que mantem
 * um unico link na arvore de acessibilidade e o foco por teclado funcionando -
 * diferente de embrulhar tudo em <a> ou de pendurar onclick no <li>.
 */
export function linhaAgendamento(ag, { href = null, extra = null } = {}) {
  return html`
  <li class="cartao${href ? ' cartao-vivo item-clicavel' : ''}">
    <div class="linha entre linha-topo">
      <div class="crescer">
        <div class="forte">
          ${href ? html`<a class="link-estendido" href="${href}">${ag.servico_nome}</a>` : ag.servico_nome}
        </div>
        <div class="pequeno fraco">
          ${formatarDataHora(ag.inicio)} · ${ag.nome_exibicao ?? ag.prestador_nome}
          · cliente ${ag.cliente_nome}
        </div>
        ${extra ?? cru('')}
      </div>
      <div class="direita">
        <div class="forte num">${formatarBRL(ag.valor_travado)}</div>
        <div class="acima-1">${selo(ag.estado)}</div>
      </div>
    </div>
  </li>`;
}

export { html, cru, juntar, paraTexto };
