/**
 * SPEC-021: evidência dos critérios de aceitação da avaliação bilateral (CA-01 a CA-09).
 * Os IDs T-SPEC021-01 e 02 já identificam testes de atomicidade da revelação
 * (spec-021-revelacao-atomica.test.js); por isso os critérios usam T-SPEC021-CAnn.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara, publicarDaquiA } from '../apoio/cenario.js';
import { adicionarHoras, adicionarMinutos } from '../../src/dominio/tempo.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as avaliacoes from '../../src/aplicacao/avaliacoes.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as rotinas from '../../src/aplicacao/rotinas.js';
import * as social from '../../src/infra/repositorios/social.js';
import * as agRepo from '../../src/infra/repositorios/agendamentos.js';
import * as auditoria from '../../src/infra/auditoria.js';
import * as usuarios from '../../src/infra/repositorios/usuarios.js';
import { salvarGlobal } from '../../src/aplicacao/parametros.js';
import { contar, varios } from '../../src/infra/db/conexao.js';
import { ErroDeRegra, ErroDeValidacao } from '../../src/dominio/erros.js';
import { PADROES } from '../../src/dominio/parametros.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

const totalAvaliacoes = () => contar('SELECT COUNT(*) AS total FROM avaliacao');

function confirmado(c, horario = c.horario) {
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return ag;
}

function concluido() {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = confirmado(c);
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return { c, ag: agRepo.porId(ag.id) };
}

test('T-SPEC021-CA01 | RN-24: apenas partes de atendimento concluido podem avaliar', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = confirmado(c);
  assert.throws(() => avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 5 }),
    (e) => e instanceof ErroDeRegra && e.regra === 'RN-24');
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  assert.throws(() => avaliacoes.avaliar({ usuarioId: c.cliente2.id, agendamentoId: ag.id, nota: 1 }));
  assert.throws(() => avaliacoes.avaliar({ usuarioId: c.adminId, agendamentoId: ag.id, nota: 1 }));
  assert.equal(totalAvaliacoes(), 0);
});

test('T-SPEC021-CA02 | RN-24: nota deve ser inteira entre 1 e 5; recusas não criam avaliação', () => {
  const { c, ag } = concluido();
  for (const nota of [0, 6, 3.5, -1, 'cinco', null]) {
    assert.throws(() => avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota }),
      (e) => e instanceof ErroDeValidacao && e.campo === 'nota');
  }
  assert.equal(totalAvaliacoes(), 0);
  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: '1' });
  assert.equal(social.avaliacoesDoAgendamento(ag.id)[0].nota, 1);
});

test('T-SPEC021-CA03 | RN-24: cada participante avalia uma única vez', () => {
  const { c, ag } = concluido();
  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 4 });
  assert.throws(() => avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 2 }),
    (e) => e.regra === 'RN-24');
  avaliacoes.avaliar({ usuarioId: c.prestador.id, agendamentoId: ag.id, nota: 5 });
  assert.throws(() => avaliacoes.avaliar({ usuarioId: c.prestador.id, agendamentoId: ag.id, nota: 5 }));
  assert.equal(totalAvaliacoes(), 2);
  assert.equal(social.avaliacaoDoAutor(ag.id, c.cliente.id).nota, 4);
  // Cada avaliação aceita deixa um registro de auditoria com o autor (INV-003).
  const log = auditoria.historicoDe('agendamento', ag.id).filter((l) => l.acao === 'AVALIACAO_REGISTRADA');
  assert.deepEqual(log.map((l) => l.ator_id).sort(), [c.cliente.id, c.prestador.id].sort());
});

test('T-SPEC021-CA04 | RN-25: primeira nota não é exposta à contraparte antes da revelação', () => {
  const { c, ag } = concluido();
  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 2, comentario: 'Atrasou' });
  const doPrestador = avaliacoes.situacao({ agendamentoId: ag.id, usuarioId: c.prestador.id });
  assert.deepEqual(doPrestador.visiveis, []);
  assert.equal(doPrestador.minha, null);
  assert.equal(JSON.stringify(doPrestador).includes('Atrasou'), false);
  assert.deepEqual(contas.perfilPublico(c.prestador.id).avaliacoes, []);
  // Quem avaliou vê a própria nota e sabe que aguarda a contraparte.
  const doCliente = avaliacoes.situacao({ agendamentoId: ag.id, usuarioId: c.cliente.id });
  assert.equal(doCliente.minha.nota, 2);
  assert.equal(doCliente.aguardandoContraparte, true);
});

test('T-SPEC021-CA05 | RN-25: duas notas provocam revelação para ambas as partes', () => {
  const { c, ag } = concluido();
  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 5, comentario: 'Ótimo' });
  avaliacoes.avaliar({ usuarioId: c.prestador.id, agendamentoId: ag.id, nota: 4 });
  for (const usuarioId of [c.cliente.id, c.prestador.id]) {
    assert.equal(avaliacoes.situacao({ agendamentoId: ag.id, usuarioId }).visiveis.length, 2);
  }
  assert.equal(contas.perfilPublico(c.prestador.id).avaliacoes[0].comentario, 'Ótimo');
  assert.equal(contas.perfilPublico(c.cliente.id).avaliacoes[0].nota, 4);
});

test('T-SPEC021-CA06 | RN-25: fim da janela p-14 revela avaliações sem segunda nota', () => {
  const { c, ag } = concluido();
  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 3 });
  viajarPara(adicionarMinutos(ag.avaliacao_prazo_em, -1));
  rotinas.executar();
  assert.equal(social.avaliacoesDoAgendamento(ag.id)[0].visivel, 0);
  viajarPara(ag.avaliacao_prazo_em);
  rotinas.executar();
  assert.equal(social.avaliacoesDoAgendamento(ag.id)[0].visivel, 1);
  assert.equal(contas.perfilPublico(c.prestador.id).avaliacoes.length, 1);
  assert.throws(() => avaliacoes.avaliar({ usuarioId: c.prestador.id, agendamentoId: ag.id, nota: 5 }),
    (e) => e.regra === 'RN-24');
});

test('T-SPEC021-CA07 | RN-23: avaliação gera evento p-22 para o alvo, preservando delta aplicado', () => {
  const { c, ag } = concluido();
  const eventos = () => varios(
    "SELECT delta FROM evento_reputacao WHERE usuario_id = ? AND tipo = 'AVALIACAO_RECEBIDA' AND origem_id = ?",
    c.prestador.id, ag.id,
  ).map((e) => e.delta);
  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 5 });
  assert.deepEqual(eventos(), [PADROES.delta_reputacao_avaliacao_5]);
  const reputacao = usuarios.porId(c.prestador.id).reputacao;
  salvarGlobal('delta_reputacao_avaliacao_5', PADROES.delta_reputacao_avaliacao_5 + 2, null);
  assert.deepEqual(eventos(), [PADROES.delta_reputacao_avaliacao_5]);
  assert.equal(usuarios.porId(c.prestador.id).reputacao, reputacao);
  // O cliente, que não foi avaliado, não recebe evento de avaliação.
  assert.equal(contar(
    "SELECT COUNT(*) AS total FROM evento_reputacao WHERE usuario_id = ? AND tipo = 'AVALIACAO_RECEBIDA'", c.cliente.id,
  ), 0);
});

test('T-SPEC021-CA08 | RNF-04: perfil público não retorna telefone nem email', () => {
  const { c, ag } = concluido();
  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 5 });
  avaliacoes.avaliar({ usuarioId: c.prestador.id, agendamentoId: ag.id, nota: 5 });
  for (const usuarioId of [c.cliente.id, c.prestador.id]) {
    const perfil = contas.perfilPublico(usuarioId);
    const texto = JSON.stringify(perfil);
    for (const chave of ['email', 'telefone', 'senha_hash']) assert.equal(chave in perfil, false, chave);
    assert.equal(/@teste\.dev|90000-000/.test(texto), false);
  }
});

test('T-SPEC021-CA09 | RF-070: histórico agregado de reputação e no-show é consistente com dados registrados', () => {
  const { c } = concluido();
  const segundo = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 3);
  const ag2 = confirmado(c, segundo);
  viajarPara(adicionarMinutos(segundo.inicio, 30));
  agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: ag2.id });
  assert.equal(agRepo.porId(ag2.id).estado, 'NO_SHOW_CLIENTE');

  const perfil = contas.perfilPublico(c.cliente.id);
  assert.equal(perfil.concluidos, 1);
  assert.equal(perfil.noshows, 1);
  assert.equal(perfil.total_encerrados, 2);
  assert.equal(perfil.taxa_noshow, 50);
  assert.equal(perfil.reputacao, usuarios.porId(c.cliente.id).reputacao);
});
