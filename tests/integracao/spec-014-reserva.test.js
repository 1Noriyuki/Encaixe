/**
 * SPEC-014 - reserva com preco travado e exclusividade (RF-017, RF-039 a RF-041, RF-047, RNF-09).
 * Os IDs seguem a §12 da Spec; os testes de reserva ja existentes estao listados la.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, agoraDoTeste, publicarDaquiA } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as auditoria from '../../src/infra/auditoria.js';
import * as notificacoes from '../../src/infra/notificacoes.js';
import * as agendamentosRepo from '../../src/infra/repositorios/agendamentos.js';
import * as horariosRepo from '../../src/infra/repositorios/horarios.js';
import * as parametrosRepo from '../../src/infra/repositorios/parametros.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import { executar, um } from '../../src/infra/db/conexao.js';
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

const agendamentosNoBanco = () => um('SELECT COUNT(*) AS n FROM agendamento').n;

test('T-RESERVA-07 | RF-039/RF-040: reserva cria PENDENTE com preco vigente travado, bloqueia e avisa', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  assert.equal(ag.estado, 'PENDENTE_CONFIRMACAO');
  assert.equal(ag.valor_travado, 8000, 'R$ 100 com os 20% da faixa de ate 4 h');
  assert.equal(ag.percentual_desconto_aplicado, 20);
  assert.equal(horariosRepo.porId(c.horario.id).estado, 'BLOQUEADO');
  assert.ok(ag.prazo_confirmacao_em > agoraDoTeste());
  assert.equal(notificacoes.listar(c.prestador.id).filter((n) => n.tipo === 'RESERVA_RECEBIDA').length, 1);
  assert.deepEqual(auditoria.historicoDe('agendamento', ag.id).map((l) => [l.acao, l.ator_id]),
    [['RESERVA_CRIADA', c.cliente.id]]);
});

test('T-RESERVA-08 | RF-039/RF-047: cada recusa informa o motivo e nao grava nada', () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  const tentar = (clienteId = c.cliente.id, horarioId = c.horario.id) => () => agendamentos.reservar({ clienteId, horarioId });
  const recusa = (fn, regra, texto) => assert.throws(fn, (e) => e.regra === regra && (!texto || texto.test(e.message)), regra);

  usuariosRepo.atualizarEstadoConta(c.cliente.id, 'SUSPENSO');
  recusa(tentar(), 'RN-13', /suspensa/);
  usuariosRepo.atualizarEstadoConta(c.cliente.id, 'EM_REVISAO');
  recusa(tentar(), 'RN-13', /revisão/);
  usuariosRepo.atualizarEstadoConta(c.cliente.id, 'ATIVO');

  parametrosRepo.salvarGlobal('antecedencia_min_reserva_min', 120, c.adminId);
  const perto = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 1.5);
  recusa(tentar(c.cliente.id, perto.id), 'RN-07');

  // RF-047: restrito (reputacao abaixo de P-10) fica em 1 reserva aberta e e informado do limite.
  executar('UPDATE usuario SET reputacao = 40, estado_conta = ? WHERE id = ?', 'RESTRITO', c.cliente2.id);
  const outro = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 8);
  agendamentos.reservar({ clienteId: c.cliente2.id, horarioId: outro.id });
  recusa(tentar(c.cliente2.id), 'RN-12', /limite atual é 1/);

  usuariosRepo.atualizarEstadoConta(c.prestador.id, 'SUSPENSO');
  recusa(tentar(), 'RN-28');

  assert.equal(agendamentosNoBanco(), 1, 'so a reserva valida do restrito existe');
  assert.equal(horariosRepo.porId(c.horario.id).estado, 'PUBLICADO');
});

test('T-RESERVA-09 | RF-041/INV-01: a segunda reserva do mesmo horario e recusada, pela rota e pelo banco', async () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  const primeira = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  const login = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'cliente2@teste.dev', senha: 'senha1234' }),
    redirect: 'manual',
  });
  const cookie = login.headers.getSetCookie()[0].split(';')[0];
  const csrf = um('SELECT csrf FROM sessao WHERE id = ?', decodeURIComponent(cookie.split('=')[1])).csrf;
  await fetch(`${base}/reservar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams({ _csrf: csrf, horarioId: String(c.horario.id) }),
    redirect: 'manual',
  });
  assert.equal(agendamentosNoBanco(), 1);
  const tela = await (await fetch(`${base}/horarios/${c.horario.id}`, { headers: { Cookie: cookie } })).text();
  assert.match(tela, /RN-09/);

  // Mesmo que o dominio fosse contornado, o indice unico parcial recusa.
  assert.throws(() => agendamentosRepo.criar({
    horario_id: c.horario.id, cliente_id: c.cliente2.id, prestador_id: c.prestador.id,
    estado: 'PENDENTE_CONFIRMACAO', valor_travado: primeira.valor_travado,
    percentual_desconto_aplicado: 20, prazo_confirmacao_em: primeira.prazo_confirmacao_em,
    criado_em: agoraDoTeste(), observacao: '',
  }), /UNIQUE/);
});

test('T-RESERVA-10 | RNF-09: reserva e atomica; falha no meio nao deixa agendamento nem horario bloqueado', () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  executar(`CREATE TRIGGER falha_bloqueio BEFORE INSERT ON log_auditoria
    WHEN NEW.acao = 'HORARIO_BLOQUEADO' BEGIN SELECT RAISE(FAIL, 'auditoria indisponivel'); END`);

  assert.throws(() => agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id }), /auditoria indisponivel/);
  assert.equal(agendamentosNoBanco(), 0);
  assert.equal(horariosRepo.porId(c.horario.id).estado, 'PUBLICADO');
  assert.equal(notificacoes.listar(c.prestador.id).filter((n) => n.tipo === 'RESERVA_RECEBIDA').length, 0);
});

test('T-RESERVA-11 | INV-03/INV-04: o banco recusa mudar o valor travado e travar abaixo do piso', () => {
  const c = cenarioBasico({ horasAteHorario: 3, precoMinimo: '40,00' });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  assert.throws(() => executar('UPDATE agendamento SET valor_travado = 1 WHERE id = ?', ag.id), /INV-03/);
  executar('UPDATE agendamento SET observacao = ? WHERE id = ?', 'outra coluna muda normalmente', ag.id);
  assert.equal(agendamentosRepo.porId(ag.id).valor_travado, 8000);

  const outro = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 8);
  assert.throws(() => agendamentosRepo.criar({
    horario_id: outro.id, cliente_id: c.cliente2.id, prestador_id: c.prestador.id,
    estado: 'PENDENTE_CONFIRMACAO', valor_travado: 3999, percentual_desconto_aplicado: 60,
    prazo_confirmacao_em: adicionarHoras(agoraDoTeste(), 1), criado_em: agoraDoTeste(), observacao: '',
  }), /INV-04/);
});

test('T-RESERVA-12 | RF-017/RN-04: editar servico ou regua depois da reserva nao muda o horario nem o valor', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  catalogo.salvarServico({
    prestadorId: c.prestador.id, servicoId: c.servico.id, nome: 'Corte', categoriaId: c.categoria.id,
    duracaoMin: 120, precoBase: '300,00', precoMinimo: '200,00',
  });
  catalogo.salvarRegua({
    prestadorId: c.prestador.id, reguaId: c.regua.id, nome: 'Regua nova',
    faixas: [{ antecedencia_min: 240, percentual_desconto: 50 }],
  });

  const horario = horariosRepo.porId(c.horario.id);
  assert.equal(horario.duracao_min, 60);
  assert.equal(horario.preco_base_snapshot, 10000);
  assert.equal(horario.inicio, c.horario.inicio);
  assert.equal(agendamentosRepo.porId(ag.id).valor_travado, 8000);
});
