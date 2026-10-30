/**
 * T-53, T-55, T-58, T-66 e T-67 - o que as telas mostram.
 * A regra ja e provada na aplicacao; aqui se prova que ela chega a quem decide.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  prepararBanco, encerrar, cenarioBasico, viajarPara, agoraDoTeste, publicarDaquiA,
} from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import * as adminApp from '../../src/aplicacao/admin.js';
import * as reputacao from '../../src/aplicacao/reputacao.js';
import * as busca from '../../src/aplicacao/busca.js';
import { params } from '../../src/aplicacao/parametros.js';
import { executar } from '../../src/infra/db/conexao.js';
import * as auditoria from '../../src/infra/auditoria.js';
import * as notificacoes from '../../src/infra/notificacoes.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import { TIPO_EVENTO } from '../../src/dominio/reputacao.js';
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

/** POST com o token CSRF da tela do formulario (por padrao, a rota sem a acao). */
async function enviar(caminho, cookie, campos, origem = caminho.replace(/\/[a-z]+$/, '')) {
  const corpo = await pagina(origem, cookie);
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

/** Derruba a reputacao do cliente abaixo do limiar de revisao (RN-22). */
function clienteEmRevisao(c) {
  reputacao.aplicarEvento({
    usuarioId: c.cliente.id, tipo: TIPO_EVENTO.AJUSTE_ADMIN, delta: -35,
    origemTipo: 'ajuste_admin', origemId: c.adminId,
  });
  assert.equal(usuariosRepo.porId(c.cliente.id).estado_conta, 'EM_REVISAO');
}

test('T-CONTA-REVISAO-01 | RF-078: a fila de revisao traz motivo, reputacao e ocorrencias', async () => {
  const c = cenarioBasico();
  clienteEmRevisao(c);

  const [conta] = adminApp.filaDeRevisao();
  assert.equal(conta.id, c.cliente.id);
  assert.equal(conta.reputacao, usuariosRepo.porId(c.cliente.id).reputacao);
  assert.equal(conta.motivo.regra, 'RN-22');
  assert.equal(conta.ocorrencias, 1);

  const tela = await pagina('/admin/contas', await entrar('admin@teste.dev'));
  assert.match(tela, /Motivo do sinalizador/);
  assert.ok(tela.includes(`Reputação caiu para ${conta.reputacao} pontos`));
  assert.match(tela, /selo-regra">RN-22/);
});

test('T-CONTA-REVISAO-01b | RF-078/RN-21: prestador sinalizado por ocorrencias mostra a contagem e o historico', async () => {
  const c = cenarioBasico({ horasAteHorario: 10 });
  const lista = [c.horario, ...[12, 14].map((h) => publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, h))];
  for (const horario of lista) {
    const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: horario.id });
    agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
    const volta = agoraDoTeste();
    viajarPara(adicionarHoras(horario.inicio, -1)); // faixa TOTAL
    agendamentos.cancelar({ usuarioId: c.prestador.id, agendamentoId: ag.id });
    viajarPara(volta);
  }

  const conta = adminApp.filaDeRevisao().find(({ id }) => id === c.prestador.id);
  assert.equal(conta.estado_conta, 'EM_REVISAO');
  assert.equal(conta.motivo.regra, 'RN-21');
  assert.match(conta.motivo.texto, /^3 ocorrências negativas em \d+ dias$/);
  assert.equal(conta.ocorrencias, 3);

  const dossie = await pagina(`/admin/contas/${c.prestador.id}`, await entrar('admin@teste.dev'));
  assert.match(dossie, /Histórico da conta/);
  assert.match(dossie, /PRESTADOR_EM_REVISAO_POR_OCORRENCIAS/);
});

test('T-CONTA-REVISAO-02 | RF-079: decisao pela tela exige justificativa, aplica e notifica o titular', async () => {
  const c = cenarioBasico();
  clienteEmRevisao(c);
  const cookie = await entrar('admin@teste.dev');
  const caminho = `/admin/contas/${c.cliente.id}/decidir`;

  await enviar(caminho, cookie, { decisao: 'ATIVO', justificativa: 'curta' });
  assert.equal(usuariosRepo.porId(c.cliente.id).estado_conta, 'EM_REVISAO');

  const texto = 'Ausencias justificadas por atestado medico.';
  const r = await enviar(caminho, cookie, { decisao: 'ATIVO', justificativa: texto });
  assert.equal(r.status, 302);
  assert.equal(usuariosRepo.porId(c.cliente.id).estado_conta, 'ATIVO');

  const aviso = notificacoes.listar(c.cliente.id).find((n) => n.tipo === 'CONTA_REATIVADA');
  assert.equal(aviso.mensagem, texto);
  const registro = auditoria.historicoDe('conta', c.cliente.id).find((l) => l.acao === 'CONTA_REATIVADA');
  assert.equal(registro.ator_id, c.adminId);
  assert.equal(registro.detalhe.justificativa, texto);
});

test('T-PARAM-TELA-01 | RN-00: o admin altera P-04 pela tela e a busca usa o valor novo sem reinicio', async () => {
  const c = cenarioBasico({ horasAteHorario: 100 / 60 });
  assert.ok(busca.buscarPorFiltros().some(({ id }) => id === c.horario.id), 'com P-04 = 30 min o horario aparece');

  const cookie = await entrar('admin@teste.dev');
  const r = await enviar('/admin/parametros', cookie, { chave: 'antecedencia_min_reserva_min', valor: '110' }, '/admin/parametros');
  assert.equal(r.status, 302);

  assert.equal(params().antecedencia_min_reserva_min, 110);
  assert.ok(!busca.buscarPorFiltros().some(({ id }) => id === c.horario.id), 'faltam 100 min, abaixo do P-04 novo');
  const registro = auditoria.recentes(5).find((l) => l.acao === 'PARAMETRO_ALTERADO');
  assert.equal(registro.ator_id, c.adminId);
  assert.equal(registro.estado_anterior, '30');
  assert.equal(registro.estado_novo, '110');
  assert.match(await pagina('/admin/parametros', cookie), /Parâmetro atualizado para 110/);
});

test('T-PARAM-TELA-02 | RN-00: valor fora da faixa pela tela e recusado com a regra e nada muda', async () => {
  cenarioBasico();
  const cookie = await entrar('admin@teste.dev');

  await enviar('/admin/parametros', cookie, { chave: 'antecedencia_min_reserva_min', valor: '121' }, '/admin/parametros');

  assert.equal(params().antecedencia_min_reserva_min, 30);
  assert.ok(!auditoria.recentes(5).some((l) => l.acao === 'PARAMETRO_ALTERADO'));
  const tela = await pagina('/admin/parametros', cookie);
  assert.match(tela, /RN-00/);
  assert.match(tela, /P-04/);
  assert.match(tela, /15 a 120/);
});

test('T-AUDIT-08 | RF-084/RNF-07: a tela da auditoria mostra ator e correlacao e filtra por ela', async () => {
  const c = cenarioBasico();
  const correlacao = 'c0ffee00-0000-4000-8000-000000000001';
  const ag = await auditoria.comCorrelacao(correlacao, () => agendamentos.reservar({
    clienteId: c.cliente.id, horarioId: c.horario.id,
  }));
  const daReserva = auditoria.daCorrelacao(correlacao);
  assert.ok(daReserva.length >= 2, 'a reserva grava agendamento e horario');
  assert.ok(daReserva.every((l) => l.ator_id === c.cliente.id));

  const cookie = await entrar('admin@teste.dev');
  const trilha = await pagina('/admin/auditoria', cookie);
  assert.match(trilha, /<th scope="col">Correlação<\/th>/);
  assert.ok(trilha.includes(`href="/admin/auditoria?correlacao=${correlacao}"`));

  const filtrada = await pagina(`/admin/auditoria?correlacao=${correlacao}`, cookie);
  for (const l of daReserva) assert.ok(filtrada.includes(l.acao), l.acao);
  assert.ok(filtrada.includes(`agendamento #${ag.id}`));
  assert.ok(filtrada.includes('Cliente Teste'), 'o ator aparece pelo nome');
  assert.ok(!filtrada.includes('CADASTRO_APROVADO') && !filtrada.includes('PRESTADOR_APROVADO'),
    'registros de outra operacao ficam de fora');
});

test('T-PARAM-09 | RN-00: falha na auditoria desfaz a alteracao do parametro', () => {
  const c = cenarioBasico();
  executar(
    `CREATE TRIGGER falha_auditoria_parametro BEFORE INSERT ON log_auditoria
      WHEN NEW.acao = 'PARAMETRO_ALTERADO'
      BEGIN SELECT RAISE(FAIL, 'auditoria indisponivel'); END`,
  );

  assert.throws(
    () => adminApp.ajustarParametro({ adminId: c.adminId, chave: 'antecedencia_min_reserva_min', valor: 90 }),
    /auditoria indisponivel/,
  );
  assert.equal(params().antecedencia_min_reserva_min, 30);
});
