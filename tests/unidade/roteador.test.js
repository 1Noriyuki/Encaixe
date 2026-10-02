/**
 * Testes do roteador.
 * Nasceram de um bug real: escapar o padrao inteiro de uma vez quebrava o
 * ':param', e toda rota com parametro respondia 404 em producao.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { criarRoteador } from '../../src/interface/http/roteador.js';

function roteadorDeTeste() {
  const r = criarRoteador();
  r.get('/', () => 'home');
  r.get('/buscar', () => 'buscar');
  r.get('/agendamentos/:id', () => 'detalhe');
  r.post('/agendamentos/:id/confirmar', () => 'confirmar');
  r.post('/agendamentos/:id/cancelar', () => 'cancelar');
  r.get('/admin/contas/:id', () => 'conta', { perfil: 'ADMIN' });
  return r;
}

test('rota estatica casa', () => {
  const r = roteadorDeTeste();
  assert.equal(r.resolver('GET', '/')?.padrao, '/');
  assert.equal(r.resolver('GET', '/buscar')?.padrao, '/buscar');
});

test('rota com parametro casa e extrai o valor', () => {
  const r = roteadorDeTeste();
  const achada = r.resolver('GET', '/agendamentos/42');
  assert.ok(achada, 'rota com :id precisa casar');
  assert.equal(achada.padrao, '/agendamentos/:id');
  assert.deepEqual(achada.params, { id: '42' });
});

test('rota com parametro no meio do caminho casa', () => {
  const r = roteadorDeTeste();
  const achada = r.resolver('POST', '/agendamentos/7/confirmar');
  assert.ok(achada, 'o bug original fazia esta rota responder 404');
  assert.equal(achada.params.id, '7');
});

test('rotas irmas nao se confundem', () => {
  const r = roteadorDeTeste();
  assert.equal(r.resolver('POST', '/agendamentos/7/cancelar').padrao, '/agendamentos/:id/cancelar');
  assert.equal(r.resolver('POST', '/agendamentos/7/confirmar').padrao, '/agendamentos/:id/confirmar');
});

test('barra final e ignorada', () => {
  const r = roteadorDeTeste();
  assert.ok(r.resolver('GET', '/buscar/'));
  assert.ok(r.resolver('GET', '/agendamentos/9/'));
});

test('metodo errado nao casa, mas e detectavel', () => {
  const r = roteadorDeTeste();
  assert.equal(r.resolver('GET', '/agendamentos/7/confirmar'), null);
  assert.equal(r.existeEmOutroMetodo('GET', '/agendamentos/7/confirmar'), true);
});

test('caminho inexistente devolve null', () => {
  const r = roteadorDeTeste();
  assert.equal(r.resolver('GET', '/nao-existe'), null);
  assert.equal(r.resolver('GET', '/agendamentos/1/2/3'), null);
});

test('as opcoes de autorizacao viajam junto com a rota', () => {
  const r = roteadorDeTeste();
  assert.equal(r.resolver('GET', '/admin/contas/3').opcoes.perfil, 'ADMIN');
});

test('parametro com caractere especial e decodificado', () => {
  const r = criarRoteador();
  r.get('/prestadores/:slug', () => 'x');
  assert.equal(r.resolver('GET', '/prestadores/sal%C3%A3o').params.slug, 'salão');
});
