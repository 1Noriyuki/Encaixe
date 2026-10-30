/**
 * SPEC-016 - expiracao automatica da reserva (RF-044 a RF-046, RN-10, UC-07).
 * Os IDs seguem a §12 da Spec; T-EXPIRA-01 a 04 ja existiam.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as rotinas from '../../src/aplicacao/rotinas.js';
import * as auditoria from '../../src/infra/auditoria.js';
import * as notificacoes from '../../src/infra/notificacoes.js';
import * as parametrosRepo from '../../src/infra/repositorios/parametros.js';
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

const estado = (tabela, id) => um(`SELECT estado FROM ${tabela} WHERE id = ?`, id).estado;

// Primeiro teste do arquivo de proposito: a rota dispara as rotinas no maximo
// a cada 15 s de relogio real, e esta e a primeira requisicao deste servidor.
test('T-EXPIRA-05 | UC-07: a leitura pela rota dispara a expiracao sem esperar o intervalo', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  viajarPara(adicionarMinutos(ag.prazo_confirmacao_em, 1));

  const tela = await (await fetch(`${base}/buscar`)).text();
  assert.equal(estado('agendamento', ag.id), 'EXPIRADO');
  assert.ok(tela.includes(`/horarios/${c.horario.id}`), 'o horario devolvido ja aparece na mesma leitura');
});

test('T-EXPIRA-06 | RF-045/RN-10: expirar avisa as duas partes, sem penalidade, e o aviso diz o destino do horario', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  parametrosRepo.salvarGlobal('antecedencia_min_reserva_min', 120, c.adminId);
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  // 16 min depois faltam 164 min: acima de P-04 = 120, o horario volta.
  viajarPara(adicionarMinutos(ag.prazo_confirmacao_em, 1));
  rotinas.executar();
  assert.equal(estado('horario_vago', c.horario.id), 'PUBLICADO');
  const [aviso] = notificacoes.listar(c.cliente.id).filter((n) => n.tipo === 'RESERVA_EXPIRADA');
  assert.match(aviso.mensagem, /voltou para a busca/);
  assert.equal(notificacoes.listar(c.prestador.id).filter((n) => n.tipo === 'RESERVA_EXPIRADA').length, 1);
  assert.equal(um('SELECT COUNT(*) AS n FROM evento_reputacao').n, 0, 'ninguem e penalizado');

  // Segunda reserva, agora expirando sem antecedencia: o aviso nao promete a volta.
  const ag2 = agendamentos.reservar({ clienteId: c.cliente2.id, horarioId: c.horario.id });
  viajarPara(adicionarMinutos(c.horario.inicio, -100));
  rotinas.executar();
  assert.equal(estado('agendamento', ag2.id), 'EXPIRADO');
  assert.equal(estado('horario_vago', c.horario.id), 'EXPIRADO');
  const [aviso2] = notificacoes.listar(c.cliente2.id).filter((n) => n.tipo === 'RESERVA_EXPIRADA');
  assert.doesNotMatch(aviso2.mensagem, /voltou para a busca/);
  assert.match(aviso2.mensagem, /não foi penalizado/);
});

test('T-EXPIRA-07 | RF-046: AUTOCONFIRMAR confirma pelo sistema e avisa as duas partes', () => {
  const c = cenarioBasico({ horasAteHorario: 3, politicaExpiracao: 'AUTOCONFIRMAR' });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  viajarPara(adicionarMinutos(ag.prazo_confirmacao_em, 1));

  assert.equal(rotinas.executar().reservasAutoconfirmadas, 1);
  assert.equal(estado('agendamento', ag.id), 'CONFIRMADO');
  assert.equal(estado('horario_vago', c.horario.id), 'OCUPADO');
  for (const id of [c.cliente.id, c.prestador.id]) {
    const [aviso] = notificacoes.listar(id).filter((n) => n.tipo === 'AGENDAMENTO_CONFIRMADO');
    assert.match(aviso.titulo, /automaticamente/);
  }
  const registro = auditoria.historicoDe('agendamento', ag.id).find((l) => l.acao === 'AGENDAMENTO_AUTOCONFIRMADO');
  assert.equal(registro.ator_id, null, 'OPEN-104: o ator e o sistema');
});

test('T-EXPIRA-08 | RN-10: a rotina e idempotente e nao toca reserva ainda no prazo', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  viajarPara(adicionarMinutos(ag.prazo_confirmacao_em, -1));
  assert.equal(rotinas.executar().reservasExpiradas, 0);
  assert.equal(estado('agendamento', ag.id), 'PENDENTE_CONFIRMACAO');

  viajarPara(adicionarMinutos(ag.prazo_confirmacao_em, 1));
  assert.equal(rotinas.executar().reservasExpiradas, 1);
  assert.equal(rotinas.executar().reservasExpiradas, 0, 'a segunda passada nao repete');
  assert.equal(notificacoes.listar(c.cliente.id).filter((n) => n.tipo === 'RESERVA_EXPIRADA').length, 1);
});
