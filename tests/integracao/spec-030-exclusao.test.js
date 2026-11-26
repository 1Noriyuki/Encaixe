/**
 * SPEC-030 - configuracoes da conta, fase 2: exclusao por anonimizacao
 * (RF-097, RF-098, SPEC-030 INV-004).
 *
 * Servidor real em porta efemera, como a fase 1: o cookie que some e a sessao
 * que deixa de valer so aparecem pelo HTTP de verdade.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  prepararBanco, encerrar, cenarioBasico, viajarPara, agoraDoTeste, publicarDaquiA,
} from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import * as conta from '../../src/aplicacao/conta.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as busca from '../../src/aplicacao/busca.js';
import { bd, migrar, contar } from '../../src/infra/db/conexao.js';
import { adicionarHoras, adicionarDias } from '../../src/dominio/tempo.js';
import { impedimentosDeExclusao } from '../../src/dominio/exclusao.js';

let servidor;
let base;
let pastaDeFotos;

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

async function postar(caminho, cookie, campos) {
  const corpo = await (await pegar('/conta', cookie)).text();
  const _csrf = corpo.match(/name="_csrf" value="([a-f0-9]+)"/)?.[1] ?? '';
  return fetch(`${base}${caminho}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie, Referer: `${base}/conta/privacidade`,
    },
    body: new URLSearchParams({ _csrf, ...campos }),
    redirect: 'manual',
  });
}

/** Agendamento CONCLUIDO, com comissao apurada na competencia do dia. */
function concluido(c) {
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return ag;
}

/** Primeiro dia do mes seguinte ao instante do teste: outra competencia. */
function irParaOMesSeguinte() {
  let alvo = agoraDoTeste();
  const mes = alvo.slice(0, 7);
  while (alvo.slice(0, 7) === mes) alvo = adicionarDias(alvo, 1);
  viajarPara(alvo);
}

const regraDe = (fn) => {
  try { fn(); } catch (erro) { return erro.regra ?? erro.name; }
  return null;
};

// --------------------------------------------------------------- testes

test('T-SPEC030-CA16 | RF-097: o cliente exclui a conta, sai dos aparelhos e o histórico fica sem identificá-lo', async () => {
  const c = cenarioBasico();
  const ag = concluido(c);
  const cookie = await entrar('cliente@teste.dev');
  const outroAparelho = await entrar('cliente@teste.dev');

  const r = await postar('/conta/excluir', cookie, { senha: 'senha1234', confirmacao: 'sim' });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/conta/excluida');
  assert.match(r.headers.getSetCookie().join(';'), /Max-Age=0/);

  const eu = usuariosRepo.porId(c.cliente.id);
  assert.equal(eu.estado_conta, 'EXCLUIDO');
  assert.equal(eu.nome, 'Conta excluída');
  assert.equal(eu.email, `excluida-${c.cliente.id}@encaixe.invalid`);
  assert.equal(usuariosRepo.cliente(c.cliente.id).telefone, '');
  assert.equal(usuariosRepo.contarSessoes(c.cliente.id), 0);
  assert.equal(contar('SELECT COUNT(*) AS total FROM notificacao WHERE usuario_id = ?', c.cliente.id), 0);

  // O agendamento e a comissao continuam: sustentam a outra parte e as metricas.
  assert.equal(contar('SELECT COUNT(*) AS total FROM agendamento WHERE id = ? AND cliente_id = ?', ag.id, c.cliente.id), 1);
  assert.equal(contar('SELECT COUNT(*) AS total FROM lancamento_comissao WHERE agendamento_id = ?', ag.id), 1);
  assert.equal(contar("SELECT COUNT(*) AS total FROM log_auditoria WHERE acao = 'CONTA_EXCLUIDA'"), 1);

  assert.equal((await pegar('/conta', outroAparelho)).status, 302, 'a sessão do outro aparelho caiu');
  assert.equal(await entrar('cliente@teste.dev'), null, 'o e-mail antigo não autentica mais');
  assert.equal((await pegar('/conta/excluida')).status, 200);

  // O e-mail fica livre para um cadastro novo, que nasce do zero.
  const novo = contas.cadastrar({ nome: 'De Volta', email: 'cliente@teste.dev', senha: 'senha1234', perfil: 'CLIENTE' });
  assert.notEqual(novo.id, c.cliente.id);
});

test('T-SPEC030-CA17 | RF-097: senha errada ou falta da confirmação recusam e nada muda', async () => {
  const c = cenarioBasico();
  assert.equal(regraDe(() => conta.excluirConta({ usuarioId: c.cliente.id, senha: 'errada123', confirmacao: true })), 'RF-097');
  assert.equal(regraDe(() => conta.excluirConta({ usuarioId: c.cliente.id, senha: 'senha1234', confirmacao: false })), 'ErroDeValidacao');

  const cookie = await entrar('cliente@teste.dev');
  await postar('/conta/excluir', cookie, { senha: 'errada123', confirmacao: 'sim' });
  const eu = usuariosRepo.porId(c.cliente.id);
  assert.equal(eu.estado_conta, 'ATIVO');
  assert.equal(eu.email, 'cliente@teste.dev');
  assert.equal((await pegar('/conta', cookie)).status, 200, 'a sessão continua');
});

test('T-SPEC030-CA18 | RF-098: agendamento em aberto barra a exclusão e a tela lista o impedimento', async () => {
  const c = cenarioBasico();
  agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  assert.equal(regraDe(() => conta.excluirConta({ usuarioId: c.cliente.id, senha: 'senha1234', confirmacao: true })), 'RF-098');
  assert.equal(regraDe(() => conta.excluirConta({ usuarioId: c.prestador.id, senha: 'senha1234', confirmacao: true })), 'RF-098');
  assert.equal(usuariosRepo.porId(c.cliente.id).estado_conta, 'ATIVO');

  const cookie = await entrar('cliente@teste.dev');
  const tela = await (await pegar('/conta/privacidade', cookie)).text();
  assert.match(tela, /falta resolver/);
  assert.match(tela, /1 agendamento em aberto/);
  assert.doesNotMatch(tela, /action="\/conta\/excluir"/, 'sem formulário enquanto houver impedimento');
});

test('T-SPEC030-CA19 | RF-098: comissão do mês prende o prestador; no mês seguinte ele sai e os horários livres caem', () => {
  const c = cenarioBasico();
  concluido(c);
  assert.equal(regraDe(() => conta.excluirConta({ usuarioId: c.prestador.id, senha: 'senha1234', confirmacao: true })), 'RF-098');

  irParaOMesSeguinte();
  publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 30);
  assert.equal(busca.buscarPorFiltros({ janelaHoras: 48 }).length, 1);

  const { horariosCancelados } = conta.excluirConta({ usuarioId: c.prestador.id, senha: 'senha1234', confirmacao: true });
  assert.ok(horariosCancelados >= 1);
  assert.equal(contar("SELECT COUNT(*) AS total FROM horario_vago WHERE prestador_id = ? AND estado = 'PUBLICADO'", c.prestador.id), 0);
  assert.equal(contar('SELECT COUNT(*) AS total FROM servico WHERE prestador_id = ? AND ativo = 1', c.prestador.id), 0);
  assert.equal(usuariosRepo.prestador(c.prestador.id).nome_exibicao, 'Prestador que saiu do Encaixe');
  assert.equal(
    contar("SELECT COUNT(*) AS total FROM log_auditoria WHERE acao = 'HORARIO_CANCELADO' AND entidade_id IN (SELECT id FROM horario_vago WHERE prestador_id = ?)", c.prestador.id),
    horariosCancelados,
    'INV-13: cada horário cancelado tem rastro',
  );
  assert.equal(busca.buscarPorFiltros({ janelaHoras: 48 }).length, 0, 'o horário some da busca');
});

test('T-SPEC030-CA20 | RF-098: disputa não resolvida barra as duas partes', () => {
  const c = cenarioBasico();
  const ag = concluido(c);
  disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'SERVICO_NAO_REALIZADO',
    relato: 'Não fui atendido.', evidencia: 'Cheguei e o salão estava fechado.',
  });
  irParaOMesSeguinte();

  const motivos = conta.impedimentosParaExcluir(c.cliente.id);
  assert.ok(motivos.some((m) => /disputa sua aguardando/.test(m)));
  assert.equal(regraDe(() => conta.excluirConta({ usuarioId: c.cliente.id, senha: 'senha1234', confirmacao: true })), 'RF-098');
  assert.equal(regraDe(() => conta.excluirConta({ usuarioId: c.prestador.id, senha: 'senha1234', confirmacao: true })), 'RF-098');
});

test('T-SPEC030-CA21 | RF-098: o admin não tem a ação e a conta em revisão espera a decisão', async () => {
  const c = cenarioBasico();
  const cookieAdmin = await entrar('admin@teste.dev');
  assert.equal((await postar('/conta/excluir', cookieAdmin, { senha: 'senha1234', confirmacao: 'sim' })).status, 403);
  assert.equal(regraDe(() => conta.excluirConta({ usuarioId: c.adminId, senha: 'senha1234', confirmacao: true })), 'RF-098');
  assert.match(await (await pegar('/conta/privacidade', cookieAdmin)).text(), /só é criada e removida pela implantação/);

  usuariosRepo.atualizarEstadoConta(c.cliente.id, 'EM_REVISAO');
  assert.equal(regraDe(() => conta.excluirConta({ usuarioId: c.cliente.id, senha: 'senha1234', confirmacao: true })), 'RF-098');
  assert.equal(usuariosRepo.porId(c.cliente.id).estado_conta, 'EM_REVISAO');
});

test('T-SPEC030-INV04 | RF-097: o banco recusa conta excluída com e-mail real ou com foto', () => {
  const c = cenarioBasico();
  assert.throws(() => bd().prepare("UPDATE usuario SET estado_conta = 'EXCLUIDO' WHERE id = ?").run(c.cliente.id), /CHECK/);
  assert.throws(() => bd().prepare(
    "UPDATE usuario SET estado_conta = 'EXCLUIDO', email = ?, foto = ? WHERE id = ?",
  ).run(`excluida-${c.cliente.id}@encaixe.invalid`, `${'a'.repeat(32)}.png`, c.cliente.id), /CHECK/);
});

test('T-SPEC030-UN02 | RF-098: a regra lista todos os impedimentos de uma vez', () => {
  const motivos = impedimentosDeExclusao(
    { perfil: 'PRESTADOR', estado_conta: 'EM_REVISAO' },
    { agendamentosAtivos: 2, disputasAbertas: 1, comissoesDaCompetencia: 3 },
  );
  assert.equal(motivos.length, 4);
  assert.deepEqual(impedimentosDeExclusao({ perfil: 'CLIENTE', estado_conta: 'RESTRITO' }), []);
  assert.deepEqual(impedimentosDeExclusao({ perfil: 'PRESTADOR', estado_conta: 'REPROVADO' }), []);
  assert.equal(impedimentosDeExclusao({ perfil: 'CLIENTE', estado_conta: 'SUSPENSO' }).length, 1);
});

test('T-SPEC030-MIG01 | RF-097: banco antigo sem EXCLUIDO no CHECK é reconstruído sem perder contas', () => {
  const c = cenarioBasico();
  const banco = bd();
  const antes = contar('SELECT COUNT(*) AS total FROM usuario');
  // Recria a tabela com o CHECK anterior a v0.1.13, como num banco da equipe.
  const atual = banco.prepare("SELECT sql FROM sqlite_master WHERE name = 'usuario'").get().sql;
  const legado = atual
    .replace(",'EXCLUIDO'", '')
    .replace(/,\s*--[^\n]*\n(\s*--[^\n]*\n)*\s*CHECK \(estado_conta <> 'EXCLUIDO'[^\n]*\)\s*\n?\)$/, '\n)')
    .replace('CREATE TABLE usuario', 'CREATE TABLE usuario_legado')
    .replace('CREATE TABLE "usuario"', 'CREATE TABLE usuario_legado');
  assert.doesNotMatch(legado, /EXCLUIDO/);
  banco.exec('PRAGMA foreign_keys = OFF');
  banco.exec(legado);
  banco.exec('INSERT INTO usuario_legado SELECT * FROM usuario');
  banco.exec('DROP TABLE usuario');
  banco.exec('ALTER TABLE usuario_legado RENAME TO usuario');
  banco.exec('PRAGMA foreign_keys = ON');

  migrar();

  assert.match(banco.prepare("SELECT sql FROM sqlite_master WHERE name = 'usuario'").get().sql, /'EXCLUIDO'/);
  assert.equal(contar('SELECT COUNT(*) AS total FROM usuario'), antes);
  assert.equal(banco.prepare('PRAGMA foreign_key_check').all().length, 0);
  assert.equal(contar("SELECT COUNT(*) AS total FROM sqlite_master WHERE name = 'usuario_nasce_no_estado_inicial'"), 1);
  conta.excluirConta({ usuarioId: c.cliente2.id, senha: 'senha1234', confirmacao: true });
  assert.equal(usuariosRepo.porId(c.cliente2.id).estado_conta, 'EXCLUIDO');
});
