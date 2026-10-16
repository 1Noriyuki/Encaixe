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

const TAMANHO_MAX_CORPO = 128 * 1024;
let ultimaRotina = 0;

export function criarAplicacao() {
  const roteador = criarRoteador();
  registrarRotas(roteador);

  return createServer(async (req, res) => {
    const correlacao = randomUUID();
    auditoria.definirCorrelacao(correlacao);

    try {
      await atender(req, res, roteador);
    } catch (erro) {
      console.error(`[${correlacao}]`, erro);
      if (!res.headersSent) {
        responder(res, 500, paginaDeErro(500, 'Erro interno', 'Algo quebrou do nosso lado. Tente de novo em instantes.'));
      }
    } finally {
      auditoria.limparCorrelacao();
    }
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
    responder(res, 404, paginaDeErro(404, 'Página não encontrada', dica));
    return;
  }

  // As regras temporais precisam estar em dia antes de qualquer leitura (QA-08).
  executarRotinasSeNecessario();

  const sessao = carregarSessao(req);
  const usuario = sessao?.usuario ?? null;
  const corpo = req.method === 'POST' ? await lerCorpo(req) : {};

  const ctx = criarContexto({ req, res, url, rota, sessao, usuario, corpo });

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
        usuario, 'RF-007',
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
        'Seu formulário expirou por segurança. Entre de novo e repita a ação.', usuario, 'RNF-03',
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

function criarContexto({ req, res, url, rota, sessao, usuario, corpo }) {
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

function paginaDeErro(status, titulo, texto, usuario = null, regra = null) {
  return pagina({
    titulo,
    usuario,
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

/** Corpo de formulario (application/x-www-form-urlencoded). */
function lerCorpo(req) {
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
