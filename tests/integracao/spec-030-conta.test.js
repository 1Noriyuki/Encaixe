/**
 * SPEC-030 - configuracoes da conta, fase 1 (RF-087 a RF-096).
 *
 * Sobe o servidor real em porta efemera, como http.test.js: o que esta Spec
 * entrega e quase todo interface (formulario com arquivo, cookie de
 * aparencia, download), e so o HTTP de verdade prova isso.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as auditoria from '../../src/infra/auditoria.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as reputacao from '../../src/aplicacao/reputacao.js';
import { detectarFormato } from '../../src/infra/fotos.js';
import { bd } from '../../src/infra/db/conexao.js';
import { TIPO_EVENTO } from '../../src/dominio/reputacao.js';

let servidor;
let base;
let pastaDeFotos;

/** PNG 1x1 de verdade: a assinatura e o que a RF-089 confere. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

test.before(async () => {
  pastaDeFotos = mkdtempSync(join(tmpdir(), 'encaixe-fotos-'));
  process.env.FOTOS_DIR = pastaDeFotos;
  prepararBanco();
  servidor = criarAplicacao();
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

test.beforeEach(prepararBanco);

test.after(() => {
  servidor?.close();
  encerrar();
  delete process.env.FOTOS_DIR;
  rmSync(pastaDeFotos, { recursive: true, force: true });
});

// --------------------------------------------------------------- apoio

async function entrar(email, senha = 'senha1234') {
  const resposta = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, senha }),
    redirect: 'manual',
  });
  return (resposta.headers.getSetCookie?.() ?? [])[0]?.split(';')[0] ?? null;
}

function pegar(caminho, cookie = null) {
  return fetch(`${base}${caminho}`, { headers: cookie ? { Cookie: cookie } : {}, redirect: 'manual' });
}

async function csrfDe(caminho, cookie) {
  const corpo = await (await pegar(caminho, cookie)).text();
  return corpo.match(/name="_csrf" value="([a-f0-9]+)"/)?.[1] ?? null;
}

async function postar(caminho, cookie, campos) {
  const _csrf = await csrfDe('/conta', cookie);
  return fetch(`${base}${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams({ _csrf, ...campos }),
    redirect: 'manual',
  });
}

async function enviarFoto(cookie, conteudo, nomeArquivo = 'foto.png', tipo = 'image/png') {
  const formulario = new FormData();
  formulario.append('_csrf', await csrfDe('/conta', cookie)); // antes do arquivo, como na tela
  formulario.append('foto', new Blob([conteudo], { type: tipo }), nomeArquivo);
  return fetch(`${base}/conta/foto`, {
    method: 'POST', headers: { Cookie: cookie, Referer: `${base}/conta` }, body: formulario, redirect: 'manual',
  });
}

/** Le a pagina seguinte ao redirect, onde o aviso guardado na sessao aparece. */
async function avisoDepois(resposta, cookie) {
  return (await pegar(new URL(resposta.headers.get('location'), base).pathname, cookie)).text();
}

// --------------------------------------------------------------- testes

test('T-SPEC030-CA01 | RF-087: o titular salva nome, telefone e região; o e-mail não muda', async () => {
  const c = cenarioBasico();
  const cookie = await entrar('cliente@teste.dev');

  const r = await postar('/conta/dados', cookie, {
    nome: '  Cliente   Renomeado ', telefone: '11 98888-7777', regiaoId: String(c.regiao.id),
    email: 'outro@teste.dev',
  });
  assert.equal(r.status, 302);

  const eu = usuariosRepo.cliente(c.cliente.id);
  assert.equal(eu.nome, 'Cliente Renomeado');
  assert.equal(eu.telefone, '11 98888-7777');
  assert.equal(eu.email, 'cliente@teste.dev');
  assert.ok(auditoria.historicoDe('conta', c.cliente.id).some((a) => a.acao === 'DADOS_PESSOAIS_ATUALIZADOS'));
});

test('T-SPEC030-CA02 | RF-087: nome vazio é recusado e nada muda', async () => {
  const c = cenarioBasico();
  const cookie = await entrar('cliente@teste.dev');

  const r = await postar('/conta/dados', cookie, { nome: ' ' });
  assert.equal(r.status, 302);
  assert.equal(usuariosRepo.porId(c.cliente.id).nome, 'Cliente Teste');
});

test('T-SPEC030-CA03 | RF-088: foto PNG é aceita e servida só como imagem', async () => {
  const c = cenarioBasico();
  const cookie = await entrar('cliente@teste.dev');

  const r = await enviarFoto(cookie, PNG);
  assert.equal(r.status, 302);
  const foto = usuariosRepo.porId(c.cliente.id).foto;
  assert.match(foto, /^[0-9a-f]{32}\.png$/);

  const servida = await pegar(`/fotos/${foto}`);
  assert.equal(servida.status, 200);
  assert.equal(servida.headers.get('content-type'), 'image/png');
  assert.equal(servida.headers.get('x-content-type-options'), 'nosniff');
  assert.match(servida.headers.get('content-security-policy'), /sandbox/);

  const pagina = await (await pegar('/conta', cookie)).text();
  assert.ok(pagina.includes(`/fotos/${foto}`), 'o cabeçalho mostra a foto nova');
});

test('T-SPEC030-CA04 | RF-089: HTML com nome .png é recusado pelo conteúdo e a foto anterior fica', async () => {
  const c = cenarioBasico();
  const cookie = await entrar('cliente@teste.dev');
  await enviarFoto(cookie, PNG);
  const anterior = usuariosRepo.porId(c.cliente.id).foto;

  const r = await enviarFoto(cookie, Buffer.from('<html><script>alert(1)</script></html>'), 'foto.png');
  assert.equal(r.status, 302);
  assert.match(await avisoDepois(r, cookie), /RF-089/);
  assert.equal(usuariosRepo.porId(c.cliente.id).foto, anterior);
});

test('T-SPEC030-CA05 | RF-089: arquivo acima do teto é recusado com a regra, sem erro interno', async () => {
  const c = cenarioBasico();
  const cookie = await entrar('cliente@teste.dev');
  const grande = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);

  const r = await enviarFoto(cookie, grande);
  assert.equal(r.status, 302);
  const aviso = await avisoDepois(r, cookie);
  assert.match(aviso, /passa de 2 MB/);
  assert.match(aviso, /RF-089/);
  assert.equal(usuariosRepo.porId(c.cliente.id).foto, null);
});

test('T-SPEC030-CA06 | RF-090: remover a foto apaga o arquivo e volta às iniciais', async () => {
  const c = cenarioBasico();
  const cookie = await entrar('cliente@teste.dev');
  await enviarFoto(cookie, PNG);
  const foto = usuariosRepo.porId(c.cliente.id).foto;
  assert.ok(readdirSync(pastaDeFotos).includes(foto));

  await postar('/conta/foto/remover', cookie, {});
  assert.equal(usuariosRepo.porId(c.cliente.id).foto, null);
  assert.ok(!readdirSync(pastaDeFotos).includes(foto));
  assert.equal((await pegar(`/fotos/${foto}`)).status, 404);
  assert.match(await (await pegar('/conta', cookie)).text(), /class="avatar avatar-p"[^>]*>CT</);
});

test('T-SPEC030-CA07 | RF-091: senha atual errada recusa a troca e nada muda', async () => {
  const c = cenarioBasico();
  const cookie = await entrar('cliente@teste.dev');
  const hashAntes = usuariosRepo.porId(c.cliente.id).senha_hash;

  const r = await postar('/conta/senha', cookie, {
    senhaAtual: 'errada123', novaSenha: 'novaSenha99', confirmacao: 'novaSenha99',
  });
  assert.equal(r.status, 302);
  assert.equal(usuariosRepo.porId(c.cliente.id).senha_hash, hashAntes);
});

test('T-SPEC030-CA08 | RF-091: trocar a senha derruba as outras sessões e mantém a atual', async () => {
  cenarioBasico();
  const aqui = await entrar('cliente@teste.dev');
  const outroAparelho = await entrar('cliente@teste.dev');

  const r = await postar('/conta/senha', aqui, {
    senhaAtual: 'senha1234', novaSenha: 'novaSenha99', confirmacao: 'novaSenha99',
  });
  assert.equal(r.status, 302);
  assert.equal((await pegar('/conta', aqui)).status, 200);
  assert.equal((await pegar('/conta', outroAparelho)).status, 302, 'a outra sessão foi encerrada');
  assert.ok(await entrar('cliente@teste.dev', 'novaSenha99'), 'a senha nova autentica');
});

test('T-SPEC030-CA09 | RF-092: sair dos outros aparelhos encerra as demais sessões', async () => {
  const c = cenarioBasico();
  const aqui = await entrar('cliente@teste.dev');
  const outra = await entrar('cliente@teste.dev');

  await postar('/conta/sessoes/encerrar', aqui, {});
  assert.equal((await pegar('/conta', outra)).status, 302);
  assert.equal((await pegar('/conta', aqui)).status, 200);
  assert.equal(usuariosRepo.contarSessoes(c.cliente.id), 1);
});

test('T-SPEC030-CA10 | RF-093: o tema escolhido vale sem login e valor desconhecido cai no padrão', async () => {
  cenarioBasico();
  const r = await fetch(`${base}/conta/aparencia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ tema: 'preto', movimento: 'reduzido' }),
    redirect: 'manual',
  });
  const cookie = (r.headers.getSetCookie?.() ?? [])[0]?.split(';')[0];
  assert.equal(cookie, 'encaixe_aparencia=preto.reduzido');

  const home = await (await pegar('/', cookie)).text();
  assert.match(home, /<html lang="pt-BR" data-tema="preto" data-movimento="reduzido">/);

  const forjado = await (await pegar('/', 'encaixe_aparencia="><script>.x')).text();
  assert.match(forjado, /<html lang="pt-BR">/);
});

test('T-SPEC030-CA11 | RF-094: o titular baixa os próprios dados sem senha nem contato alheio', async () => {
  const c = cenarioBasico();
  agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  const cookie = await entrar('cliente@teste.dev');

  const r = await postar('/conta/privacidade/exportar', cookie, {});
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition'), /attachment; filename="encaixe-meus-dados-/);
  const texto = await r.text();
  const dados = JSON.parse(texto);

  assert.equal(dados.conta.email, 'cliente@teste.dev');
  assert.equal(dados.perfil.telefone, '11 90000-0000');
  assert.equal(dados.agendamentos.length, 1);
  assert.equal(dados.agendamentos[0].contraparte, 'Salao Teste');
  assert.ok(!texto.includes('senha_hash') && !texto.includes('scrypt$'), 'o hash da senha não sai');
  assert.ok(!texto.includes('prestador@teste.dev'), 'o e-mail da contraparte não sai');
  assert.ok(auditoria.historicoDe('conta', c.cliente.id).some((a) => a.acao === 'DADOS_EXPORTADOS'));
});

test('T-SPEC030-CA12 | RF-095: o titular vê os eventos da reputação; o admin não tem a seção', async () => {
  const c = cenarioBasico();
  reputacao.aplicarEvento({
    usuarioId: c.cliente.id, tipo: TIPO_EVENTO.CONCLUSAO, delta: 1, origemTipo: 'teste', origemId: null,
  });
  const cookie = await entrar('cliente@teste.dev');

  const pagina = await (await pegar('/conta/reputacao', cookie)).text();
  assert.match(pagina, /Atendimento concluído sem incidente/);
  assert.match(pagina, /RN-23/);

  const admin = await entrar('admin@teste.dev');
  assert.equal((await pegar('/conta/reputacao', admin)).status, 403);
});

test('T-SPEC030-CA13 | RF-096: sobre, ajuda e privacidade abrem sem conta', async () => {
  cenarioBasico();
  for (const caminho of ['/sobre', '/ajuda', '/privacidade', '/conta/aparencia']) {
    assert.equal((await pegar(caminho)).status, 200, `${caminho} deveria responder 200`);
  }
  assert.match(await (await pegar('/ajuda')).text(), /<details>/);
});

test('T-SPEC030-CA14 | RF-006: as seções da conta exigem sessão', async () => {
  cenarioBasico();
  for (const caminho of ['/conta', '/conta/seguranca', '/conta/privacidade']) {
    const r = await pegar(caminho);
    assert.equal(r.status, 302);
    assert.match(r.headers.get('location'), /\/entrar/);
  }
});

test('T-SPEC030-CA15 | RF-088: nome de foto fora do formato gerado não lê o disco', async () => {
  cenarioBasico();
  for (const caminho of ['/fotos/..%2F..%2Fpackage.json', '/fotos/abc.png', '/fotos/encaixe.db']) {
    assert.equal((await pegar(caminho)).status, 404, caminho);
  }
});

test('T-SPEC030-INV01 | RF-088: o banco recusa nome de foto fora do formato', () => {
  const c = cenarioBasico();
  assert.throws(() => bd().prepare('UPDATE usuario SET foto = ? WHERE id = ?').run('../../x.png', c.cliente.id),
    /CHECK constraint failed/);
  bd().prepare('UPDATE usuario SET foto = ? WHERE id = ?').run(`${'a'.repeat(32)}.webp`, c.cliente.id);
});

test('T-SPEC030-UN01 | RF-089: o formato sai da assinatura do arquivo, não do nome', () => {
  assert.equal(detectarFormato(PNG), 'png');
  assert.equal(detectarFormato(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), 'jpg');
  assert.equal(detectarFormato(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'latin1')), 'webp');
  assert.equal(detectarFormato(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
  assert.equal(detectarFormato(Buffer.alloc(4)), null);
});
