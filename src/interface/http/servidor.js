/**
 * Servidor HTTP (node:http) - montagem, contexto de requisicao e tratamento de erros.
 *
 * Responsabilidades desta camada, e so estas:
 *   - traduzir HTTP em chamada de caso de uso;
 *   - autenticar/autorizar (RNF-03) e validar CSRF;
 *   - transformar erro de dominio em mensagem para o usuario.
 * Nenhuma regra de negocio mora aqui.
 */

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { criarRoteador } from './roteador.js';
import { CSS } from './estilo.js';
import { JS } from './interacoes.js';
import { pagina } from './views/layout.js';
import { html, paraTexto } from './html.js';
import {
  carregarSessao, csrfValido, guardarAviso, consumirAvisos,
} from './sessao.js';
import * as auditoria from '../../infra/auditoria.js';
import { naoLidas as contarNaoLidas } from '../../infra/notificacoes.js';
import * as rotinas from '../../aplicacao/rotinas.js';
import { registrarRotas } from './rotas/index.js';
import { lerAparencia } from './aparencia.js';
import * as fotos from '../../infra/fotos.js';

const TAMANHO_MAX_CORPO = 128 * 1024;
let ultimaRotina = 0;

export function criarAplicacao() {
  const roteador = criarRoteador();
  registrarRotas(roteador);

  return createServer(async (req, res) => {
    const correlacao = randomUUID();
    await auditoria.comCorrelacao(correlacao, async () => {
      try {
        await atender(req, res, roteador);
      } catch (erro) {
        console.error(`[${correlacao}]`, erro);
        if (!res.headersSent) {
          responder(res, 500, paginaDeErro(500, 'Erro interno', 'Algo quebrou do nosso lado. Tente de novo em instantes.'));
        }
      }
    });
  });
}

async function atender(req, res, roteador) {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname === '/estatico/estilo.css') {
    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=60' });
    res.end(CSS);
    return;
  }
  if (url.pathname === '/estatico/interacoes.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=60' });
    res.end(JS);
    return;
  }
  if (url.pathname.startsWith('/estatico/')) {
    if (await servirArquivo(url.pathname.slice('/estatico/'.length), res)) return;
  }
  // RF-088 (SPEC-030): foto de perfil. O nome so e aceito se for um que o
  // sistema gerou, e os cabecalhos impedem o navegador de tratar o arquivo como
  // outra coisa que nao imagem, mesmo que alguem consiga gravar um poliglota.
  if (req.method === 'GET' && url.pathname.startsWith('/fotos/')) {
    const foto = fotos.ler(url.pathname.slice('/fotos/'.length));
    if (foto) {
      res.writeHead(200, {
        'Content-Type': foto.tipo,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(foto.conteudo);
      return;
    }
  }
  if (url.pathname === '/saude') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const rota = roteador.resolver(req.method, url.pathname);
  if (!rota) {
    const dica = roteador.existeEmOutroMetodo(req.method, url.pathname)
      ? 'Este endereço existe, mas não aceita este método.'
      : 'Confira o endereço, ou volte para a busca de horários.';
    responder(res, 404, paginaDeErro(404, 'Página não encontrada', dica, null, null, lerAparencia(req)));
    return;
  }

  // As regras temporais precisam estar em dia antes de qualquer leitura (QA-08).
  executarRotinasSeNecessario();

  const sessao = carregarSessao(req);
  const usuario = sessao?.usuario ?? null;
  const corpo = req.method === 'POST' ? await lerCorpo(req, rota.opcoes) : {};
  const aparencia = lerAparencia(req);

  const ctx = criarContexto({ req, res, url, rota, sessao, usuario, corpo, aparencia });

  // ------------------------------------------------------ autorizacao
  const exigido = rota.opcoes?.perfil;
  if (exigido || rota.opcoes?.autenticado) {
    if (!usuario) {
      ctx.redirecionar(`/entrar?destino=${encodeURIComponent(url.pathname)}`, {
        tipo: 'info', texto: 'Entre na sua conta para continuar.',
      });
      return;
    }
    const perfis = Array.isArray(exigido) ? exigido : (exigido ? [exigido] : []);
    if (perfis.length && !perfis.includes(usuario.perfil)) {
      // RF-007 - tentativa de acesso fora do perfil vai para a auditoria.
      auditoria.registrar({
        atorId: usuario.id,
        acao: 'ACESSO_NEGADO',
        entidade: 'rota',
        detalhe: { caminho: url.pathname, perfil: usuario.perfil, exigido: perfis },
      });
      responder(res, 403, paginaDeErro(
        403, 'Acesso negado',
        `Esta área é do perfil ${perfis.join(' ou ').toLowerCase()}. Você está autenticado como `
        + `${usuario.perfil.toLowerCase()}. A tentativa foi registrada na trilha de auditoria.`,
        usuario, 'RF-007', aparencia,
      ));
      return;
    }
  }

  // ------------------------------------------------------------- CSRF
  if (req.method === 'POST' && !rota.opcoes?.semCsrf) {
    if (!csrfValido(sessao, corpo._csrf)) {
      auditoria.registrar({
        atorId: usuario?.id ?? null,
        acao: 'CSRF_INVALIDO',
        entidade: 'rota',
        detalhe: { caminho: url.pathname },
      });
      responder(res, 403, paginaDeErro(
        403, 'Sessão expirada',
        'Seu formulário expirou por segurança. Entre de novo e repita a ação.', usuario, 'RNF-03', aparencia,
      ));
      return;
    }
  }

  try {
    await rota.manipulador(ctx);
  } catch (erro) {
    tratarErroDeAcao(ctx, erro);
  }

  if (!res.writableEnded) {
    responder(res, 204, '');
  }
}

/**
 * Arquivos soltos em `public/` (a imagem do hero, por exemplo).
 * So estes tipos, e so dentro da pasta: `normalize` mais o teste de prefixo
 * barram travessia de caminho (`../`) antes de qualquer leitura de disco.
 */
const PUBLICO = fileURLToPath(new URL('../../../public/', import.meta.url));

const TIPOS = {
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function servirArquivo(nomeRelativo, res) {
  const tipo = TIPOS[extname(nomeRelativo).toLowerCase()];
  if (!tipo) return false;

  const alvo = normalize(join(PUBLICO, decodeURIComponent(nomeRelativo)));
  if (!alvo.startsWith(PUBLICO.endsWith(sep) ? PUBLICO : PUBLICO + sep)) return false;

  try {
    const conteudo = await readFile(alvo);
    res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'public, max-age=3600' });
    res.end(conteudo);
    return true;
  } catch {
    return false; // Arquivo ausente cai no 404 normal do roteador.
  }
}

function criarContexto({ req, res, url, rota, sessao, usuario, corpo, aparencia }) {
  const avisosPendentes = consumirAvisos(sessao?.id);

  const ctx = {
    req,
    res,
    url,
    params: rota.params,
    query: Object.fromEntries(url.searchParams),
    corpo,
    sessao,
    usuario,
    csrf: sessao?.csrf ?? '',
    avisos: avisosPendentes,
    aparencia,

    /** Renderiza uma pagina completa. */
    render(corpoHtml, {
      titulo = 'Encaixe', estreita = false, status = 200, hero = null, descricao = undefined,
    } = {}) {
      responder(res, status, pagina({
        titulo,
        usuario,
        avisos: ctx.avisos,
        naoLidas: usuario ? contarNaoLidas(usuario.id) : 0,
        caminho: url.pathname,
        corpo: corpoHtml,
        estreita,
        hero,
        descricao,
        // Absoluta: os scrapers de link (og:image) nao resolvem caminho relativo.
        origem: url.origin,
        aparencia,
      }));
    },

    /** Adiciona um aviso a proxima renderizacao desta mesma requisicao. */
    avisar(aviso) {
      ctx.avisos.push(aviso);
    },

    /** Redireciona guardando um aviso para a proxima pagina. */
    redirecionar(destino, aviso = null, cabecalhos = {}) {
      if (aviso) guardarAviso(sessao?.id, aviso);
      res.writeHead(302, { Location: destino, ...cabecalhos });
      res.end();
    },

    /** Volta para a pagina de origem (usado apos POST com erro). */
    voltar(aviso = null) {
      const origem = req.headers.referer ?? '/';
      ctx.redirecionar(origem, aviso);
    },

    definirCookie(valor) {
      res.setHeader('Set-Cookie', valor);
    },
  };

  return ctx;
}

/**
 * Erro de regra vira mensagem para o usuario, com o identificador da regra
 * visivel - a interface conta ao usuario QUAL regra o barrou.
 */
function tratarErroDeAcao(ctx, erro) {
  const status = erro?.status ?? 500;
  const aviso = {
    tipo: status >= 500 ? 'erro' : (status === 422 ? 'atencao' : 'erro'),
    titulo: tituloDoErro(erro),
    texto: erro?.message ?? 'Não foi possível concluir a operação.',
    regra: erro?.regra ?? null,
  };

  if (status >= 500) {
    console.error(erro);
    aviso.texto = 'Erro interno ao processar a operação. Nada foi alterado.';
  }

  // SPEC-003 §13: mexer em recurso alheio e a tentativa mais suspeita, e entra
  // na trilha como a negacao por perfil (RF-007). A transacao da acao ja foi
  // desfeita; este registro fica de fora dela de proposito.
  if (erro?.name === 'ErroDeAutorizacao') {
    auditoria.registrar({
      atorId: ctx.usuario?.id ?? null,
      acao: 'ACESSO_NEGADO',
      entidade: 'rota',
      detalhe: { caminho: ctx.url?.pathname ?? null, motivo: 'titularidade', regra: 'RF-006' },
    });
  }

  // O aviso pos-redirect e guardado por sessao. Sem sessao (login e cadastro
  // com erro), redirecionar engoliria a mensagem e o usuario ficaria sem saber
  // o que aconteceu - entao a resposta e renderizada na hora.
  if (ctx.req.method === 'POST' && ctx.sessao?.id) {
    ctx.voltar(aviso);
    return;
  }

  ctx.avisar(aviso);
  ctx.render(html`
    <div class="cartao">
      <p class="medida">A operação foi recusada e <strong>nada mudou de estado</strong>. O aviso acima
      traz a regra que decidiu isso.</p>
      <p class="linha sem-fundo">
        ${erro?.detalhes?.contato
          ? html`<a class="botao" href="mailto:${erro.detalhes.contato}">Escrever para a administração</a>`
          : ''}
        <a class="botao botao-secundario" href="${ctx.req.headers.referer ?? '/'}">Tentar de novo</a>
        <a class="botao botao-secundario" href="/">Início</a>
      </p>
    </div>`, {
    titulo: aviso.titulo, estreita: true, status,
  });
}

function tituloDoErro(erro) {
  switch (erro?.name) {
    case 'ErroDeRegra':
    case 'ErroDeConcorrencia': return 'Uma regra de negócio impediu esta operação';
    case 'ErroDeValidacao': return 'Confira os dados informados';
    case 'ErroDeAutorizacao': return 'Acesso negado';
    case 'ErroDeAutenticacao': return 'Não foi possível entrar';
    case 'NaoEncontrado': return 'Não encontrado';
    default: return 'Erro';
  }
}

function paginaDeErro(status, titulo, texto, usuario = null, regra = null, aparencia = null) {
  return pagina({
    titulo,
    usuario,
    aparencia,
    caminho: '/',
    estreita: true,
    corpo: html`
      <div class="cartao centro">
        <div class="vazio-slot acima-2" aria-hidden="true"></div>
        <p class="mono fraco sem-fundo">Erro ${status}</p>
        <h1 class="acima-1">${titulo}</h1>
        <p class="fraco medida centralizado">${texto}</p>
        ${regra ? html`<p class="sem-fundo"><span class="selo selo-regra">${regra}</span></p>` : ''}
        <p class="linha acima-4 sem-fundo linha-centro">
          <a class="botao" href="/">Voltar ao início</a>
          <a class="botao botao-secundario" href="/buscar">Buscar horários</a>
        </p>
      </div>`,
  });
}

function responder(res, status, corpo) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  });
  res.end(paraTexto(corpo));
}

/**
 * Corpo de formulario. So rota que declara `arquivo` (o teto em bytes) aceita
 * multipart; nas outras, o teto pequeno de sempre continua valendo.
 */
function lerCorpo(req, opcoes = {}) {
  const tipo = req.headers['content-type'] ?? '';
  if (opcoes?.arquivo && tipo.startsWith('multipart/form-data')) {
    return lerMultipart(req, tipo, opcoes.arquivo);
  }
  return lerFormulario(req);
}

/**
 * multipart/form-data sem dependencia (ADR-001, ADR-007). Passado o teto, o
 * resto do envio e lido e descartado: o caso de uso recebe `_excedeuLimite` e
 * responde com a regra (RF-089), em vez de a conexao cair no meio.
 * Os campos de texto vem antes do arquivo no formulario, entao o token CSRF
 * chega inteiro mesmo quando o arquivo e cortado.
 */
function lerMultipart(req, tipo, limiteArquivo) {
  const fronteira = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(tipo);
  const teto = limiteArquivo + 64 * 1024;

  return new Promise((resolve, reject) => {
    const pedacos = [];
    let tamanho = 0;
    let excedeu = false;

    req.on('data', (pedaco) => {
      if (excedeu) return;
      if (tamanho + pedaco.length > teto) {
        pedacos.push(pedaco.subarray(0, teto - tamanho));
        tamanho = teto;
        excedeu = true;
        return;
      }
      pedacos.push(pedaco);
      tamanho += pedaco.length;
    });

    req.on('end', () => {
      if (!fronteira) {
        resolve({});
        return;
      }
      const corpo = separarPartes(Buffer.concat(pedacos), fronteira[1] ?? fronteira[2].trim());
      if (excedeu) corpo._excedeuLimite = true;
      resolve(corpo);
    });

    req.on('error', reject);
  });
}

function separarPartes(bruto, fronteira) {
  const corpo = {};
  const marca = Buffer.from(`--${fronteira}`);
  let inicio = bruto.indexOf(marca);

  while (inicio !== -1) {
    const comeco = inicio + marca.length;
    // "--" logo apos a fronteira encerra o envio.
    if (bruto[comeco] === 0x2d && bruto[comeco + 1] === 0x2d) break;
    const proxima = bruto.indexOf(marca, comeco);
    // Parte sem fronteira de fechamento foi cortada pelo teto: fica de fora.
    if (proxima === -1) break;

    const parte = bruto.subarray(comeco + 2, proxima - 2); // tira os \r\n das pontas
    const fimCabecalho = parte.indexOf('\r\n\r\n');
    if (fimCabecalho !== -1) {
      const cabecalho = parte.subarray(0, fimCabecalho).toString('utf8');
      const conteudo = parte.subarray(fimCabecalho + 4);
      const nome = /name="([^"]*)"/i.exec(cabecalho)?.[1];
      const ehArquivo = /filename="([^"]*)"/i.test(cabecalho);
      if (nome) corpo[nome] = ehArquivo ? conteudo : conteudo.toString('utf8');
    }
    inicio = proxima;
  }
  return corpo;
}

/** Corpo de formulario (application/x-www-form-urlencoded). */
function lerFormulario(req) {
  return new Promise((resolve, reject) => {
    let bruto = '';
    let tamanho = 0;

    req.on('data', (pedaco) => {
      tamanho += pedaco.length;
      if (tamanho > TAMANHO_MAX_CORPO) {
        reject(new Error('Corpo da requisicao grande demais.'));
        req.destroy();
        return;
      }
      bruto += pedaco;
    });

    req.on('end', () => {
      const parametros = new URLSearchParams(bruto);
      const corpo = {};
      for (const [chave, valor] of parametros.entries()) {
        if (chave in corpo) {
          corpo[chave] = Array.isArray(corpo[chave]) ? [...corpo[chave], valor] : [corpo[chave], valor];
        } else {
          corpo[chave] = valor;
        }
      }
      resolve(corpo);
    });

    req.on('error', reject);
  });
}

/** No maximo uma varredura a cada 15s por requisicao (o agendador cobre o resto). */
function executarRotinasSeNecessario() {
  const agora = Date.now();
  if (agora - ultimaRotina < 15_000) return;
  ultimaRotina = agora;
  try {
    rotinas.executar();
  } catch (erro) {
    console.error('[rotinas]', erro);
  }
}
