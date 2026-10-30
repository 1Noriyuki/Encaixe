/**
 * T-53, T-55, T-58, T-66 e T-67 - o que as telas mostram.
 * A regra ja e provada na aplicacao; aqui se prova que ela chega a quem decide.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  prepararBanco, encerrar, cenarioBasico, viajarPara,
} from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';

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

async function pagina(caminho, cookie) {
  const r = await fetch(`${base}${caminho}`, { headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(r.status, 200, `${caminho} deveria responder 200`);
  return r.text();
}

async function enviar(caminho, cookie, campos) {
  const corpo = await pagina(caminho.replace(/\/[a-z]+$/, ''), cookie);
  const csrf = corpo.match(/name="_csrf" value="([a-f0-9]+)"/)?.[1];
  return fetch(`${base}${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams({ _csrf: csrf, ...campos }),
    redirect: 'manual',
  });
}

/** Atendimento concluido e contestado pelo cliente. */
function disputaAberta(c) {
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'OUTRO',
    evidencia: 'Evidencia suficiente para abrir a disputa pela tela.',
  });
}

// --------------------------------------------------------------- testes

test('T-DISPUTA-07c | RF-075: a fila do admin destaca a disputa fora do SLA', async () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  disputaAberta(c);
  const cookie = await entrar('admin@teste.dev');

  const dentro = await pagina('/admin/disputas', cookie);
  assert.doesNotMatch(dentro, /selo-perigo">vencido/);

  // A sessao dura 2 h (RNF-02); depois do salto de relogio, entra de novo.
  viajarPara(adicionarHoras(disputas.fila()[0].prazo_sla_em, 1));
  const novaSessao = await entrar('admin@teste.dev');
  const vencida = await pagina('/admin/disputas', novaSessao);
  assert.match(vencida, /selo-perigo">vencido/);
  assert.match(await pagina('/admin', novaSessao), /1 disputa fora do SLA/);
});
