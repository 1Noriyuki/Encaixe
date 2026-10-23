/** SPEC-006: evidências complementares dos CA e das fronteiras de atomicidade.
 * A Spec ainda é rascunho; estes testes protegem regras da baseline já aprovadas.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, encerrar, cenarioBasico, T0, viajarPara } from '../apoio/cenario.js';
import { adicionarDias, adicionarMinutos } from '../../src/dominio/tempo.js';
import { calcularReputacao, TIPO_EVENTO } from '../../src/dominio/reputacao.js';
import { salvarGlobal } from '../../src/aplicacao/parametros.js';
import * as reputacao from '../../src/aplicacao/reputacao.js';
import * as social from '../../src/infra/repositorios/social.js';
import * as usuarios from '../../src/infra/repositorios/usuarios.js';
import * as auditoria from '../../src/infra/auditoria.js';
import { executar } from '../../src/infra/db/conexao.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

const origem = (c) => ({
  usuarioId: c.cliente.id,
  tipo: TIPO_EVENTO.AJUSTE_ADMIN,
  origemTipo: 'ajuste_admin',
  origemId: c.adminId,
});

test('T-SPEC006-CA01 | RF-069: grava tipo, delta, origem, titular e UTC', () => {
  const c = cenarioBasico();
  assert.equal(reputacao.aplicarEvento({ ...origem(c), delta: -1 }), 69);
  const [evento] = social.eventosDoUsuario(c.cliente.id);
  assert.equal(evento.usuario_id, c.cliente.id);
  assert.equal(evento.tipo, TIPO_EVENTO.AJUSTE_ADMIN);
  assert.equal(evento.delta, -1);
  assert.equal(evento.origem_tipo, 'ajuste_admin');
  assert.equal(evento.origem_id, c.adminId);
  assert.equal(evento.criado_em, T0);
  assert.equal(evento.revertido_em, null);
});

test('T-SPEC006-CA03 | INV-08: limite P-20 inclui instante exato, exclui 1 segundo anterior e futuro', () => {
  const limite = adicionarDias(T0, -90);
  const eventos = [
    { delta: -3, criado_em: limite, revertido_em: null },
    { delta: -20, criado_em: adicionarMinutos(limite, -1 / 60), revertido_em: null },
    { delta: -4, criado_em: T0, revertido_em: null },
    { delta: 50, criado_em: adicionarMinutos(T0, 1 / 60), revertido_em: null },
    { delta: -10, criado_em: T0, revertido_em: T0 },
  ];
  assert.equal(calcularReputacao(eventos, {
    inicial: 70, janelaDias: 90, agora: T0,
  }), 63);
});

test('T-SPEC006-CA06 | RN-22: cliente restrito e prestador ativo na mesma reputacao', () => {
  const c = cenarioBasico();
  reputacao.aplicarEvento({ ...origem(c), delta: -25 });
  assert.equal(usuarios.porId(c.cliente.id).estado_conta, 'RESTRITO');
  reputacao.aplicarEvento({
    usuarioId: c.prestador.id, tipo: TIPO_EVENTO.AJUSTE_ADMIN, delta: -25,
    origemTipo: 'ajuste_admin', origemId: c.adminId,
  });
  assert.equal(usuarios.porId(c.prestador.id).estado_conta, 'ATIVO');
});

test('T-SPEC006-CA08 | RN-22: melhoria da pontuacao nao reativa conta em revisao', () => {
  const c = cenarioBasico();
  reputacao.aplicarEvento({ ...origem(c), delta: -35 });
  assert.equal(usuarios.porId(c.cliente.id).estado_conta, 'EM_REVISAO');
  reputacao.aplicarEvento({ ...origem(c), delta: 40 });
  assert.equal(usuarios.porId(c.cliente.id).reputacao, 75);
  assert.equal(usuarios.porId(c.cliente.id).estado_conta, 'EM_REVISAO');
});

test('T-SPEC006-CA09a | RNF-01: falha da classificacao reverte cache e auditoria em recalculo direto', () => {
  const c = cenarioBasico();
  social.registrarEvento({
    usuario_id: c.cliente.id, tipo: TIPO_EVENTO.AJUSTE_ADMIN,
    delta: -31, origem_tipo: 'ajuste_admin', origem_id: c.adminId, criado_em: T0,
  });
  const antes = auditoria.historicoDe('conta', c.cliente.id).length;
  executar(`CREATE TRIGGER falhar_classificacao
    BEFORE UPDATE OF estado_conta ON usuario
    WHEN NEW.estado_conta = 'EM_REVISAO'
    BEGIN SELECT RAISE(ABORT, 'classificacao indisponivel'); END`);
  assert.throws(() => reputacao.recalcular(c.cliente.id), /classificacao indisponivel/);
  assert.equal(usuarios.porId(c.cliente.id).reputacao, 70);
  assert.equal(usuarios.porId(c.cliente.id).estado_conta, 'ATIVO');
  assert.equal(auditoria.historicoDe('conta', c.cliente.id).length, antes);
});

test('T-SPEC006-CA09b | RNF-01: reversao falha nao marca evento nem deixa cache inconsistente', () => {
  const c = cenarioBasico();
  reputacao.aplicarEvento({
    usuarioId: c.cliente.id, tipo: TIPO_EVENTO.AJUSTE_ADMIN, delta: -10,
    origemTipo: 'agendamento', origemId: c.horario.id,
  });
  const evento = social.eventosDaOrigem('agendamento', c.horario.id)[0];
  assert.equal(usuarios.porId(c.cliente.id).reputacao, 60);
  executar(`CREATE TRIGGER falhar_reversao
    BEFORE UPDATE OF reputacao ON usuario
    BEGIN SELECT RAISE(ABORT, 'reversao indisponivel'); END`);
  assert.throws(
    () => reputacao.reverterEventosDoAgendamento(c.horario.id, c.cliente.id),
    /reversao indisponivel/,
  );
  assert.equal(social.eventosDaOrigem('agendamento', c.horario.id)[0].id, evento.id);
  assert.equal(social.eventosDaOrigem('agendamento', c.horario.id)[0].revertido_em, null);
  assert.equal(usuarios.porId(c.cliente.id).reputacao, 60);
});

test('T-SPEC006-CA10 | RN-00: mudar P-20 recalcula projeção, preservando eventos', () => {
  const c = cenarioBasico();
  reputacao.aplicarEvento({ ...origem(c), delta: -20 });
  assert.equal(usuarios.porId(c.cliente.id).reputacao, 50);
  const [original] = social.eventosDoUsuario(c.cliente.id);
  viajarPara(adicionarDias(T0, 31));
  salvarGlobal('janela_reputacao_dias', 30, c.adminId);
  assert.equal(reputacao.recalcular(c.cliente.id), 70);
  salvarGlobal('janela_reputacao_dias', 60, c.adminId);
  assert.equal(reputacao.recalcular(c.cliente.id), 50);
  const [atual] = social.eventosDoUsuario(c.cliente.id);
  assert.deepEqual(atual, original);
});
