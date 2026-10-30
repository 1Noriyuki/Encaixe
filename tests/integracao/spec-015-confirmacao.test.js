/**
 * SPEC-015 - confirmacao e recusa da reserva (RF-042 a RF-044, RN-10, RN-11, RNF-04).
 * Os IDs seguem a §12 da Spec; T-AGENDAMENTO-06 a 07c (T-33) estao listados la.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara, publicarDaquiA } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as adminApp from '../../src/aplicacao/admin.js';
import * as reputacao from '../../src/aplicacao/reputacao.js';
import { um } from '../../src/infra/db/conexao.js';
import { adicionarMinutos } from '../../src/dominio/tempo.js';

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

async function entrar(email) {
  const r = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, senha: 'senha1234' }),
    redirect: 'manual',
  });
  return r.headers.getSetCookie()[0].split(';')[0];
}

const telaDe = async (cookie, id) => (await fetch(`${base}/agendamentos/${id}`, { headers: { Cookie: cookie } })).text();

test('T-CONFIRMA-01 | RNF-04: contatos so aparecem entre as partes depois da confirmacao', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  const cliente = await entrar('cliente@teste.dev');
  const prestador = await entrar('prestador@teste.dev');
  const telefoneCliente = '11 90000-0000';
  const emailPrestador = 'prestador@teste.dev';

  assert.ok(!(await telaDe(prestador, ag.id)).includes(telefoneCliente), 'pendente: prestador nao ve o telefone');
  assert.ok(!(await telaDe(cliente, ag.id)).includes(`>${emailPrestador}<`), 'pendente: cliente nao ve o e-mail');

  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  assert.ok((await telaDe(prestador, ag.id)).includes(telefoneCliente), 'confirmado: prestador ve o telefone do cliente');
  assert.ok((await telaDe(cliente, ag.id)).includes(`>${emailPrestador}<`), 'confirmado: cliente ve o contato do prestador');
  assert.equal((await fetch(`${base}/agendamentos/${ag.id}`, { headers: { Cookie: await entrar('cliente2@teste.dev') } })).status, 403);

  const publico = await (await fetch(`${base}/prestadores/${c.prestador.id}`)).text();
  assert.ok(!publico.includes(emailPrestador), 'perfil publico nunca mostra contato');
});

test('T-CONFIRMA-02 | RN-10: confirmar ou recusar depois do prazo e recusado e o desfecho fica com a rotina', () => {
  const c = cenarioBasico({ horasAteHorario: 3, janelaConfirmacaoMin: 15 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  viajarPara(adicionarMinutos(ag.prazo_confirmacao_em, 1));
  assert.throws(() => agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id }),
    (e) => e.regra === 'RN-10' && /prazo de confirmação terminou/.test(e.message));
  assert.throws(() => agendamentos.recusar({ prestadorId: c.prestador.id, agendamentoId: ag.id, motivo: 'Agenda indisponivel' }),
    (e) => e.regra === 'RN-10');
  assert.equal(um('SELECT estado FROM agendamento WHERE id = ?', ag.id).estado, 'PENDENTE_CONFIRMACAO');

  // Nada que nao esteja pendente aceita nova decisao.
  const outro = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 6);
  const confirmado = agendamentos.reservar({ clienteId: c.cliente2.id, horarioId: outro.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: confirmado.id });
  assert.throws(() => agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: confirmado.id }), (e) => e.regra === 'RN-10');
  assert.throws(() => agendamentos.recusar({ prestadorId: c.prestador.id, agendamentoId: confirmado.id, motivo: 'Mudei de ideia' }),
    (e) => e.regra === 'RN-11');
});

test('T-CONFIRMA-03 | RN-11: recusa nao penaliza ninguem nem conta como cancelamento', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  const antes = [c.cliente.id, c.prestador.id].map((id) => um('SELECT reputacao FROM usuario WHERE id = ?', id).reputacao);

  agendamentos.recusar({ prestadorId: c.prestador.id, agendamentoId: ag.id, motivo: 'Agenda indisponivel' });

  assert.equal(um('SELECT COUNT(*) AS n FROM evento_reputacao').n, 0);
  assert.deepEqual([c.cliente.id, c.prestador.id].map((id) => um('SELECT reputacao FROM usuario WHERE id = ?', id).reputacao), antes);
  assert.equal(reputacao.verificarOcorrenciasDoPrestador(c.prestador.id).total, 0, 'nao vira ocorrencia da RN-21');
  assert.equal(adminApp.dossieDaConta(c.prestador.id).cancelamentos, 0);
});

test('T-CONFIRMA-04 | RN-11: a taxa de recusa do prestador aparece para o admin', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const [h2, h3, h4] = [5, 7, 9].map((h) => publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, h));
  const recusada = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.recusar({ prestadorId: c.prestador.id, agendamentoId: recusada.id, motivo: 'Agenda indisponivel' });
  for (const [cliente, h] of [[c.cliente, h2], [c.cliente2, h3], [c.cliente, h4]]) {
    const ag = agendamentos.reservar({ clienteId: cliente.id, horarioId: h.id });
    agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  }

  assert.deepEqual(adminApp.dossieDaConta(c.prestador.id).recusas, { recebidas: 4, recusadas: 1, taxa: 25, expiradas: 0, taxaExpiracao: 0 });
  assert.equal(adminApp.dossieDaConta(c.cliente.id).recusas, null, 'cliente nao recebe reservas');

  const tela = await (await fetch(`${base}/admin/contas/${c.prestador.id}`, { headers: { Cookie: await entrar('admin@teste.dev') } })).text();
  assert.match(tela, /Recusas/);
  assert.match(tela, /25% das 4 reservas recebidas/);
  const publico = await (await fetch(`${base}/prestadores/${c.prestador.id}`)).text();
  assert.doesNotMatch(publico, /reservas recebidas/, 'a taxa e do admin, nao do perfil publico');
});
