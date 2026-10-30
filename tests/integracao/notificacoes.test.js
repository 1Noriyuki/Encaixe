/**
 * T-66 e SPEC-004 - notificacoes por evento (RF-082) e central do usuario (RF-083).
 *
 * A matriz abaixo e a que o codigo pratica: quem age recebe a resposta na tela,
 * a outra parte recebe o aviso; transicao que muda a situacao das duas partes
 * avisa as duas. Ela e a proposta para a questao em aberto da SPEC-004 §13.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  prepararBanco, encerrar, cenarioBasico, viajarPara, publicarDaquiA,
} from '../apoio/cenario.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import * as rotinas from '../../src/aplicacao/rotinas.js';
import * as notificacoes from '../../src/infra/notificacoes.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import { adicionarHoras, adicionarMinutos } from '../../src/dominio/tempo.js';

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
  return (r.headers.getSetCookie?.() ?? [])[0]?.split(';')[0] ?? null;
}

async function central(cookie) {
  const r = await fetch(`${base}/notificacoes`, { headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(r.status, 200);
  return r.text();
}

function marcarLidas(cookie, csrf) {
  return fetch(`${base}/notificacoes/lidas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams(csrf ? { _csrf: csrf } : {}),
    redirect: 'manual',
  });
}

/** Avisos avulsos, sem passar por um caso de uso (os testes da central nao dependem deles). */
function avisar(usuarioId, titulo, agendamentoId = null) {
  return notificacoes.notificar(usuarioId, { tipo: 'TESTE', titulo, mensagem: `Mensagem de ${titulo}`, agendamentoId });
}

/** Avisos de um tipo que o usuario recebeu sobre aquele agendamento. */
function avisos(usuarioId, tipo, agendamentoId = undefined) {
  return notificacoes.listar(usuarioId, 500).filter((n) => n.tipo === tipo
    && (agendamentoId === undefined || n.agendamento_id === agendamentoId));
}

function assegurarAviso(usuarioId, tipo, agendamentoId, rotulo) {
  const [aviso] = avisos(usuarioId, tipo, agendamentoId);
  assert.ok(aviso, `${rotulo}: esperava ${tipo} para o usuario ${usuarioId}`);
  assert.ok(aviso.titulo && aviso.mensagem, `${rotulo}: aviso sem texto`);
  assert.match(aviso.criada_em, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, `${rotulo}: instante fora de UTC`);
  return aviso;
}

function semAviso(usuarioId, tipo, agendamentoId, rotulo) {
  assert.equal(avisos(usuarioId, tipo, agendamentoId).length, 0, `${rotulo}: ${tipo} nao deveria ir para ${usuarioId}`);
}

test('T-NOTIF-MATRIZ-01 | RF-082: reserva, confirmacao, conclusao e disputa avisam as partes envolvidas', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const { cliente, prestador } = c;

  const ag = agendamentos.reservar({ clienteId: cliente.id, horarioId: c.horario.id });
  assegurarAviso(prestador.id, 'RESERVA_RECEBIDA', ag.id, 'reserva');

  agendamentos.confirmar({ prestadorId: prestador.id, agendamentoId: ag.id });
  assegurarAviso(cliente.id, 'AGENDAMENTO_CONFIRMADO', ag.id, 'confirmacao');
  semAviso(prestador.id, 'AGENDAMENTO_CONFIRMADO', ag.id, 'confirmacao manual');

  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: prestador.id, agendamentoId: ag.id });
  assegurarAviso(cliente.id, 'AGENDAMENTO_CONCLUIDO', ag.id, 'conclusao');
  assegurarAviso(prestador.id, 'AGENDAMENTO_CONCLUIDO', ag.id, 'conclusao');

  const disputa = disputas.abrir({
    usuarioId: cliente.id, agendamentoId: ag.id, motivo: 'OUTRO',
    evidencia: 'Evidencia suficiente para abrir a disputa da matriz.',
  });
  assegurarAviso(prestador.id, 'DISPUTA_ABERTA', ag.id, 'abertura de disputa');

  disputas.resolver({
    adminId: c.adminId, disputaId: disputa.id, desfecho: 'MANTIDO',
    justificativa: 'Evidencias insuficientes para reverter o desfecho.',
  });
  assegurarAviso(cliente.id, 'DISPUTA_RESOLVIDA', ag.id, 'resolucao de disputa');
  assegurarAviso(prestador.id, 'DISPUTA_RESOLVIDA', ag.id, 'resolucao de disputa');
});

test('T-NOTIF-MATRIZ-02 | RF-082: recusa, expiracao, cancelamento e no-show avisam quem foi afetado', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const { cliente, cliente2, prestador } = c;
  const [h2, h3, h4] = [4, 6, 8].map((h) => publicarDaquiA(prestador.id, c.servico.id, c.regua.id, h));

  const recusada = agendamentos.reservar({ clienteId: cliente.id, horarioId: h2.id });
  agendamentos.recusar({ prestadorId: prestador.id, agendamentoId: recusada.id, motivo: 'Agenda indisponivel' });
  assegurarAviso(cliente.id, 'AGENDAMENTO_RECUSADO', recusada.id, 'recusa');

  const cancelada = agendamentos.reservar({ clienteId: cliente2.id, horarioId: h3.id });
  agendamentos.confirmar({ prestadorId: prestador.id, agendamentoId: cancelada.id });
  agendamentos.cancelar({ usuarioId: cliente2.id, agendamentoId: cancelada.id, motivo: 'Imprevisto' });
  assegurarAviso(prestador.id, 'AGENDAMENTO_CANCELADO', cancelada.id, 'cancelamento pelo cliente');
  semAviso(cliente2.id, 'AGENDAMENTO_CANCELADO', cancelada.id, 'cancelamento pelo cliente');

  // Politica LIBERAR (P-02): a reserva sem resposta expira e as duas partes ficam sabendo.
  const expirada = agendamentos.reservar({ clienteId: cliente.id, horarioId: h4.id });
  const comparecida = agendamentos.reservar({ clienteId: cliente2.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: prestador.id, agendamentoId: comparecida.id });
  viajarPara(adicionarMinutos(expirada.prazo_confirmacao_em, 1));
  rotinas.executar();
  assegurarAviso(cliente.id, 'RESERVA_EXPIRADA', expirada.id, 'expiracao');
  assegurarAviso(prestador.id, 'RESERVA_EXPIRADA', expirada.id, 'expiracao');

  viajarPara(adicionarHoras(c.horario.inicio, 0.5));
  agendamentos.registrarNoShow({ usuarioId: prestador.id, agendamentoId: comparecida.id });
  assegurarAviso(cliente2.id, 'NO_SHOW_REGISTRADO', comparecida.id, 'no-show');
});

test('T-NOTIF-MATRIZ-03 | RF-082: decisoes administrativas avisam o titular, sem agendamento', () => {
  const c = cenarioBasico();

  const aprovacao = assegurarAviso(c.prestador.id, 'CADASTRO_APROVADO', undefined, 'aprovacao de cadastro');
  assert.equal(aprovacao.agendamento_id, null);

  const pendente = contas.cadastrar({
    nome: 'Prestador Pendente', email: 'pendente@teste.dev', senha: 'senha1234',
    perfil: 'PRESTADOR', nomeExibicao: 'Espaco Pendente', regiaoId: c.regiao.id,
  });
  contas.reprovarPrestador({
    adminId: c.adminId, prestadorId: pendente.id, justificativa: 'Documentacao incompleta no cadastro.',
  });
  assert.match(assegurarAviso(pendente.id, 'CADASTRO_REPROVADO', null, 'reprovacao').mensagem, /Documentacao incompleta/);

  contas.decidirSobreConta({
    adminId: c.adminId, usuarioId: c.cliente.id, decisao: 'SUSPENSO', justificativa: 'Fraude confirmada em disputa.',
  });
  assegurarAviso(c.cliente.id, 'CONTA_SUSPENSA', null, 'suspensao');
});

// ---------------------------------------------------------------- central (RF-083)

test('T-NOTIF-03 | RF-083: central lista avisos proprios em ordem decrescente', async () => {
  const c = cenarioBasico();
  avisar(c.cliente.id, 'Aviso antigo');
  viajarPara(adicionarHoras(c.horario.inicio, -3));
  avisar(c.cliente.id, 'Aviso do meio');
  avisar(c.cliente.id, 'Aviso no mesmo instante');
  avisar(c.cliente2.id, 'Aviso de outra pessoa');
  viajarPara(adicionarHoras(c.horario.inicio, -2));
  avisar(c.cliente.id, 'Aviso recente');

  const tela = await central(await entrar('cliente@teste.dev'));
  const ordem = ['Aviso recente', 'Aviso no mesmo instante', 'Aviso do meio', 'Aviso antigo']
    .map((titulo) => tela.indexOf(titulo));
  assert.ok(ordem.every((pos) => pos > 0), 'todos os avisos proprios aparecem');
  assert.deepEqual([...ordem].sort((a, b) => a - b), ordem, 'mais recente primeiro; empate pelo id');
  assert.ok(!tela.includes('Aviso de outra pessoa'), 'aviso de terceiro nao aparece');
});

test('T-NOTIF-04 | RF-083: marcar lidas exige CSRF e altera apenas avisos proprios nao lidos', async () => {
  const c = cenarioBasico();
  avisar(c.cliente.id, 'Aviso do cliente');
  avisar(c.cliente2.id, 'Aviso do outro cliente');
  const cookie = await entrar('cliente@teste.dev');
  const tela = await central(cookie);
  assert.match(tela, /Marcar todas como lidas/);

  assert.equal((await marcarLidas(cookie, null)).status, 403);
  assert.equal(notificacoes.naoLidas(c.cliente.id), 1, 'sem CSRF nada muda');

  const csrf = tela.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
  assert.equal((await marcarLidas(cookie, csrf)).status, 302);
  const [lida] = notificacoes.listar(c.cliente.id).filter((n) => n.tipo === 'TESTE');
  assert.match(lida.lida_em, /Z$/, 'lida_em em UTC');
  assert.equal(notificacoes.naoLidas(c.cliente.id), 0);
  assert.equal(notificacoes.naoLidas(c.cliente2.id), 1, 'aviso de terceiro continua nao lido');

  // 30 min depois, dentro da sessao de 2 h (RNF-02).
  viajarPara(adicionarHoras(c.horario.inicio, -4.5));
  await marcarLidas(cookie, csrf);
  const [denovo] = notificacoes.listar(c.cliente.id).filter((n) => n.tipo === 'TESTE');
  assert.equal(denovo.lida_em, lida.lida_em, 'idempotente: leitura anterior nao e regravada');
  assert.match(await central(cookie), /class="lida"/);
});

test('T-NOTIF-05 | RF-083: central vazia responde com estado vazio', async () => {
  cenarioBasico();
  const tela = await central(await entrar('cliente2@teste.dev'));
  assert.match(tela, /Nenhum aviso ainda/);
  assert.doesNotMatch(tela, /Marcar todas como lidas/);
});

test('T-NOTIF-07 | C-VIII: conteudo da notificacao e escapado na tela', async () => {
  const c = cenarioBasico();
  avisar(c.cliente.id, '<script>alert("x")</script>');
  const tela = await central(await entrar('cliente@teste.dev'));
  assert.ok(tela.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
  assert.ok(!tela.includes('<script>alert("x")</script>'));
});
