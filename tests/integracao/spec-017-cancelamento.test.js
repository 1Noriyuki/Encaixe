/**
 * SPEC-017 - cancelamento com penalidade progressiva (RF-048 a RF-051, RN-18, RN-19).
 * Os IDs seguem a §12 da Spec; T-CANCEL-01 a 07 e as variantes "i" ja existiam.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, publicarDaquiA } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as reputacao from '../../src/aplicacao/reputacao.js';
import * as notificacoes from '../../src/infra/notificacoes.js';
import { um } from '../../src/infra/db/conexao.js';

let servidor;
let base;

test.before(async () => {
  prepararBanco();
  servidor = criarAplicacao();
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

test.beforeEach(prepararBanco);

test.after(() => {
  servidor?.close();
  encerrar();
});

const estado = (tabela, id) => um(`SELECT estado FROM ${tabela} WHERE id = ?`, id).estado;
const reputacaoDe = (id) => um('SELECT reputacao FROM usuario WHERE id = ?', id).reputacao;

function confirmada(c, horario = c.horario, cliente = c.cliente) {
  const ag = agendamentos.reservar({ clienteId: cliente.id, horarioId: horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return ag;
}

test('T-CANCEL-08 | RF-048/RNF-11: a tela mostra faixa e efeito antes de confirmar, e so olhar nao muda nada', async () => {
  const c = cenarioBasico({ horasAteHorario: 4 });
  const ag = confirmada(c);
  const login = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'cliente@teste.dev', senha: 'senha1234' }),
    redirect: 'manual',
  });
  const cookie = login.headers.getSetCookie()[0].split(';')[0];

  const tela = await (await fetch(`${base}/agendamentos/${ag.id}/cancelar`, { headers: { Cookie: cookie } })).text();
  const previa = agendamentos.previaDeCancelamento({ usuarioId: c.cliente.id, agendamentoId: ag.id });
  assert.ok(tela.includes(previa.rotulo), 'a faixa aparece');
  assert.ok(tela.includes(`${previa.delta} pontos`), 'o delta exato aparece');
  assert.equal(estado('agendamento', ag.id), 'CONFIRMADO', 'UC-08 4a: abrir a tela nao cancela');
  assert.equal(um('SELECT COUNT(*) AS n FROM evento_reputacao').n, 0);
});

test('T-CANCEL-09 | RF-049/RF-050: cliente libera o horario; prestador o cancela e gera ocorrencia', () => {
  const c = cenarioBasico({ horasAteHorario: 4 });
  const h2 = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 5);

  const doCliente = confirmada(c);
  agendamentos.cancelar({ usuarioId: c.cliente.id, agendamentoId: doCliente.id });
  assert.equal(estado('agendamento', doCliente.id), 'CANCELADO_CLIENTE');
  assert.equal(estado('horario_vago', c.horario.id), 'PUBLICADO', 'resta P-04: volta a ser vendido');

  const doPrestador = confirmada(c, h2, c.cliente2);
  agendamentos.cancelar({ usuarioId: c.prestador.id, agendamentoId: doPrestador.id });
  assert.equal(estado('agendamento', doPrestador.id), 'CANCELADO_PRESTADOR');
  assert.equal(estado('horario_vago', h2.id), 'CANCELADO', 'quem nao vai atender e o prestador');
  assert.equal(reputacao.verificarOcorrenciasDoPrestador(c.prestador.id).total, 1, 'faixa parcial conta na RN-21');
});

test('T-CANCEL-10 | RF-051: a outra parte e avisada com motivo, faixa e efeito na reputacao', () => {
  const c = cenarioBasico({ horasAteHorario: 4 });
  const h2 = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 1.5);

  const doCliente = confirmada(c);
  const antesCliente = reputacaoDe(c.cliente.id);
  agendamentos.cancelar({ usuarioId: c.cliente.id, agendamentoId: doCliente.id, motivo: 'Imprevisto no trabalho' });
  const [paraPrestador] = notificacoes.listar(c.prestador.id).filter((n) => n.tipo === 'AGENDAMENTO_CANCELADO');
  const deltaCliente = reputacaoDe(c.cliente.id) - antesCliente;
  assert.match(paraPrestador.mensagem, /Faixa aplicada: /);
  assert.ok(paraPrestador.mensagem.includes(`Efeito na reputação do cliente: ${deltaCliente} pontos`), paraPrestador.mensagem);
  assert.match(paraPrestador.mensagem, /Motivo: Imprevisto no trabalho/);

  // Faixa total pelo prestador, sem motivo: o efeito ainda aparece.
  const doPrestador = confirmada(c, h2, c.cliente2);
  const antesPrestador = reputacaoDe(c.prestador.id);
  agendamentos.cancelar({ usuarioId: c.prestador.id, agendamentoId: doPrestador.id });
  const [paraCliente] = notificacoes.listar(c.cliente2.id).filter((n) => n.tipo === 'AGENDAMENTO_CANCELADO');
  assert.ok(paraCliente.mensagem.includes(`Efeito na reputação do prestador: ${reputacaoDe(c.prestador.id) - antesPrestador} pontos`));
  assert.doesNotMatch(paraCliente.mensagem, /Motivo:/);
});

test('T-CANCEL-11 | UC-08 1b: agendamento terminal nao e cancelado e nada muda', () => {
  const c = cenarioBasico({ horasAteHorario: 4 });
  const ag = confirmada(c);
  agendamentos.cancelar({ usuarioId: c.cliente.id, agendamentoId: ag.id });
  const eventos = um('SELECT COUNT(*) AS n FROM evento_reputacao').n;

  for (const usuarioId of [c.cliente.id, c.prestador.id]) {
    assert.throws(() => agendamentos.cancelar({ usuarioId, agendamentoId: ag.id }), (e) => e.regra === 'RN-18');
  }
  assert.equal(estado('agendamento', ag.id), 'CANCELADO_CLIENTE');
  assert.equal(um('SELECT COUNT(*) AS n FROM evento_reputacao').n, eventos);
});
