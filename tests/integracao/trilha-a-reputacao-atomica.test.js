/** SPEC-006 RF-057/RF-069: atomicidade e avisos da reputação. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, encerrar, cenarioBasico, T0 } from '../apoio/cenario.js';
import { executar } from '../../src/infra/db/conexao.js';
import { calcularReputacao, TIPO_EVENTO } from '../../src/dominio/reputacao.js';
import * as reputacao from '../../src/aplicacao/reputacao.js';
import * as usuarios from '../../src/infra/repositorios/usuarios.js';
import * as social from '../../src/infra/repositorios/social.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-REPUT-07 | RF-057: conta em revisão notifica titular e admin', () => {
  const c = cenarioBasico();
  const resultado = reputacao.aplicarEvento({
    usuarioId: c.cliente.id, tipo: TIPO_EVENTO.AJUSTE_ADMIN, delta: -31,
    origemTipo: 'ajuste_admin', origemId: c.adminId,
  });
  assert.equal(resultado, 39);
  assert.equal(usuarios.porId(c.cliente.id).estado_conta, 'EM_REVISAO');
  const avisosTitular = social.notificacoesDoUsuario(c.cliente.id);
  const avisosAdmin = social.notificacoesDoUsuario(c.adminId);
  assert.ok(avisosTitular.some(a => a.tipo === 'CONTA_EM_REVISAO'));
  assert.ok(avisosAdmin.some(a => a.tipo === 'CONTA_EM_REVISAO'));
});

test('T-REPUT-09 | INV-08: falha ao recalcular reverte evento recém-criado', () => {
  const c = cenarioBasico();
  const antes = social.eventosDoUsuario(c.cliente.id).length;
  executar(`CREATE TRIGGER negar_reputacao
    BEFORE UPDATE OF reputacao ON usuario
    BEGIN SELECT RAISE(ABORT, 'falha reputacao'); END`);
  assert.throws(() => reputacao.aplicarEvento({
    usuarioId: c.cliente.id, tipo: TIPO_EVENTO.AJUSTE_ADMIN, delta: -1,
    origemTipo: 'ajuste_admin', origemId: c.adminId,
  }), /falha reputacao/);
  assert.equal(social.eventosDoUsuario(c.cliente.id).length, antes);
  assert.equal(usuarios.porId(c.cliente.id).reputacao, 70);
});

test('T-REPUT-11 | INV-08: evento com data futura não participa da janela', () => {
  const futuro = '2026-12-01T13:00:00.000Z';
  const eventos = [{
    delta: -20, criado_em: futuro, revertido_em: null,
  }, {
    delta: -3, criado_em: T0, revertido_em: null,
  }];
  assert.equal(calcularReputacao(eventos, {
    inicial: 70, janelaDias: 90, agora: T0,
  }), 67);
});
