/**
 * Testes da camada HTTP: autenticacao, autorizacao por perfil (RF-006/RF-007),
 * CSRF (RNF-03) e escape de saida.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as auditoria from '../../src/infra/auditoria.js';

let servidor;
let base;

test.before(async () => {
  prepararBanco();
  servidor = criarAplicacao();
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

// O servidor nao guarda referencia ao banco (usa `bd()` sob demanda), entao
// da para recriar o banco a cada teste sem reiniciar o servidor.
test.beforeEach(prepararBanco);

test.after(() => {
  servidor?.close();
  encerrar();
});

// --------------------------------------------------------------- apoio

async function entrar(email, senha = 'senha1234') {
  const resposta = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, senha }),
    redirect: 'manual',
  });
  const cookie = (resposta.headers.getSetCookie?.() ?? [])[0]?.split(';')[0] ?? null;
  return { resposta, cookie };
}

function pegar(caminho, cookie = null) {
  return fetch(`${base}${caminho}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: 'manual',
  });
}

async function csrfDe(caminho, cookie) {
  const corpo = await (await pegar(caminho, cookie)).text();
  return corpo.match(/name="_csrf" value="([a-f0-9]+)"/)?.[1] ?? null;
}

// --------------------------------------------------------------- testes

test('paginas publicas respondem sem sessao', async () => {
  cenarioBasico({ horasAteHorario: 4 });

  for (const caminho of ['/', '/buscar', '/entrar', '/cadastrar', '/estatico/estilo.css']) {
    const r = await pegar(caminho);
    assert.equal(r.status, 200, `${caminho} deveria responder 200`);
  }
});

test('RF-005 | credencial invalida devolve mensagem generica', async () => {
  cenarioBasico();
  const r = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'prestador@teste.dev', senha: 'errada12' }),
    redirect: 'manual',
  });

  const corpo = await r.text();
  assert.match(corpo, /E-mail ou senha inválidos/);
  assert.doesNotMatch(corpo, /senha incorreta|usuario nao existe/i,
    'a mensagem nao pode revelar qual campo errou');
});

test('RF-004 | login valido cria sessao com cookie httpOnly', async () => {
  cenarioBasico();
  const { resposta, cookie } = await entrar('cliente@teste.dev');

  assert.equal(resposta.status, 302);
  assert.ok(cookie, 'deveria vir um cookie de sessao');
  const bruto = resposta.headers.getSetCookie()[0];
  assert.match(bruto, /HttpOnly/);
  assert.match(bruto, /SameSite=Lax/);
});

test('RF-006 | rota de perfil exige sessao e redireciona para o login', async () => {
  cenarioBasico();
  const r = await pegar('/prestador');
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), /\/entrar/);
});

test('RF-007 | cliente na area do prestador leva 403 e vira registro de auditoria', async () => {
  cenarioBasico();
  const { cookie } = await entrar('cliente@teste.dev');

  const r = await pegar('/prestador/extrato', cookie);
  assert.equal(r.status, 403);

  const registros = auditoria.recentes(20).filter((l) => l.acao === 'ACESSO_NEGADO');
  assert.ok(registros.length > 0, 'a tentativa precisa aparecer na trilha de auditoria');
});

test('RF-007 | prestador nao entra na area do admin', async () => {
  cenarioBasico();
  const { cookie } = await entrar('prestador@teste.dev');

  assert.equal((await pegar('/admin', cookie)).status, 403);
  assert.equal((await pegar('/admin/parametros', cookie)).status, 403);
});

test('RNF-03 | POST sem token CSRF valido e recusado', async () => {
  const c = cenarioBasico({ horasAteHorario: 4 });
  const { cookie } = await entrar('cliente@teste.dev');

  const r = await fetch(`${base}/reservar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams({ horarioId: String(c.horario.id), _csrf: 'token-falso' }),
    redirect: 'manual',
  });

  assert.equal(r.status, 403);
  assert.match(await r.text(), /Sessão expirada/);
});

test('UC-05 | reserva pelo HTTP com CSRF valido funciona', async () => {
  const c = cenarioBasico({ horasAteHorario: 4 });
  const { cookie } = await entrar('cliente@teste.dev');
  const csrf = await csrfDe('/buscar', cookie);
  assert.ok(csrf, 'a pagina de busca precisa expor o token');

  const r = await fetch(`${base}/reservar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams({ horarioId: String(c.horario.id), _csrf: csrf }),
    redirect: 'manual',
  });

  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), /\/agendamentos\/\d+/);

  const detalhe = await (await pegar(r.headers.get('location'), cookie)).text();
  assert.match(detalhe, /Aguardando confirmação/);
});

test('a saida e escapada: nome com HTML nao vira markup', async () => {
  cenarioBasico();

  const r = await fetch(`${base}/cadastrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      perfil: 'CLIENTE',
      nome: '<script>alert(1)</script>',
      email: 'xss@teste.dev',
      senha: 'senha1234',
    }),
    redirect: 'manual',
  });

  const cookie = r.headers.getSetCookie()[0].split(';')[0];
  const corpo = await (await pegar('/buscar', cookie)).text();

  assert.doesNotMatch(corpo, /<script>alert\(1\)<\/script>/, 'o nome nao pode virar markup');
  assert.match(corpo, /&lt;script&gt;/, 'deve aparecer escapado');
});

test('rota inexistente responde 404 e metodo errado e diagnosticado', async () => {
  const r404 = await pegar('/nao-existe');
  assert.equal(r404.status, 404);

  const rMetodo = await pegar('/reservar');
  assert.equal(rMetodo.status, 404);
  assert.match(await rMetodo.text(), /não aceita este método/);
});

test('a pagina inicial nao vaza HTML escapado por engano', async () => {
  cenarioBasico({ horasAteHorario: 4 });
  const corpo = await (await pegar('/')).text();

  assert.match(corpo, /^<!doctype html>/);
  assert.doesNotMatch(corpo, /&lt;div class/, 'sintoma do bug de duplo escape');
  assert.match(corpo, /<header class="topo">/);
});
