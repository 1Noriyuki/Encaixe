/**
 * SPEC-025 - revisao administrativa e suspensao de contas (RF-078, RF-079, RN-28, UC-13).
 * Os IDs seguem a §12 da Spec; T-CONTA-REVISAO-01 a 02 (T-55) ja existiam.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara, publicarDaquiA } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as busca from '../../src/aplicacao/busca.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import * as rotinas from '../../src/aplicacao/rotinas.js';
import { um } from '../../src/infra/db/conexao.js';
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

const estado = (tabela, id) => um(`SELECT estado FROM ${tabela} WHERE id = ?`, id).estado;
const naBusca = (id) => busca.buscarPorFiltros().some((h) => h.id === id);

test('T-SUSPENSAO-01 | RN-28: suspender tira da busca o publicado e preserva o confirmado; reativar devolve', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const livre = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 6);
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  contas.decidirSobreConta({
    adminId: c.adminId, usuarioId: c.prestador.id, decisao: 'SUSPENSO', justificativa: 'Fraude confirmada em disputa.',
  });
  assert.equal(naBusca(livre.id), false);
  assert.equal(estado('horario_vago', livre.id), 'PUBLICADO', 'retirado da busca, nao apagado');
  assert.equal(estado('agendamento', ag.id), 'CONFIRMADO', 'o confirmado e preservado');
  assert.throws(() => agendamentos.reservar({ clienteId: c.cliente2.id, horarioId: livre.id }), (e) => e.regra === 'RN-28');

  contas.decidirSobreConta({
    adminId: c.adminId, usuarioId: c.prestador.id, decisao: 'ATIVO', justificativa: 'Recurso aceito apos nova analise.',
  });
  assert.equal(naBusca(livre.id), true);
});

test('T-SUSPENSAO-02 | RF-079: decisao repetida ou sem justificativa e recusada sem efeito', () => {
  const c = cenarioBasico();
  const decidir = (decisao, justificativa) => () => contas.decidirSobreConta({ adminId: c.adminId, usuarioId: c.cliente.id, decisao, justificativa });

  assert.throws(decidir('SUSPENSO', 'curta'), (e) => e.campo === 'justificativa');
  assert.throws(decidir('RESTRITO', 'Justificativa suficiente aqui.'), (e) => e.campo === 'decisao');
  assert.throws(decidir('ATIVO', 'Justificativa suficiente aqui.'), 'ATIVO para ATIVO nao e transicao');
  assert.equal(um('SELECT estado_conta FROM usuario WHERE id = ?', c.cliente.id).estado_conta, 'ATIVO');
  assert.equal(um("SELECT COUNT(*) AS n FROM log_auditoria WHERE acao IN ('CONTA_SUSPENSA','CONTA_REATIVADA')").n, 0);
});

test('T-SUSPENSAO-03 | UC-13 passo 2: o dossie mostra disputas e as taxas de no-show, recusa e expiracao', async () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const [h2, h3] = [4, 6].map((h) => publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, h));
  const concluido = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: concluido.id });
  const recusado = agendamentos.reservar({ clienteId: c.cliente2.id, horarioId: h2.id });
  agendamentos.recusar({ prestadorId: c.prestador.id, agendamentoId: recusado.id, motivo: 'Agenda indisponivel' });
  const expirado = agendamentos.reservar({ clienteId: c.cliente2.id, horarioId: h3.id });
  viajarPara(adicionarMinutos(expirado.prazo_confirmacao_em, 1));
  rotinas.executar();
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: concluido.id });
  disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: concluido.id, motivo: 'COBRANCA_DIVERGENTE',
    evidencia: 'Cobraram mais do que o valor travado.',
  });

  const login = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'admin@teste.dev', senha: 'senha1234' }),
    redirect: 'manual',
  });
  const cookie = login.headers.getSetCookie()[0].split(';')[0];
  const tela = await (await fetch(`${base}/admin/contas/${c.prestador.id}`, { headers: { Cookie: cookie } })).text();

  assert.match(tela, /Ausências/, 'taxa de no-show');
  assert.match(tela, /33% das 3 reservas recebidas/, 'taxa de recusa');
  assert.match(tela, /33% expiraram sem confirmação/, 'taxa de expiracao');
  assert.match(tela, /<h2>Disputas<\/h2>/);
  assert.ok(tela.includes(disputas.MOTIVOS.COBRANCA_DIVERGENTE));
  assert.match(tela, /href="\/admin\/disputas\/\d+"/);
});
