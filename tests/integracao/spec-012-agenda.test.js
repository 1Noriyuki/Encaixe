/**
 * SPEC-012 - manutencao da agenda: cancelar horario livre (RF-022) e publicar em lote (RF-023).
 * Os IDs seguem a §12 da Spec.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  prepararBanco, encerrar, cenarioBasico, agoraDoTeste, viajarPara, publicarDaquiA,
} from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as busca from '../../src/aplicacao/busca.js';
import * as horarios from '../../src/aplicacao/horarios.js';
import * as auditoria from '../../src/infra/auditoria.js';
import * as horariosRepo from '../../src/infra/repositorios/horarios.js';
import { um } from '../../src/infra/db/conexao.js';
import { adicionarHoras, deLocalParaUtc, partesLocais } from '../../src/dominio/tempo.js';

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

function lote(c, horas, data = partesLocais(adicionarHoras(agoraDoTeste(), 30)).data) {
  return horarios.publicarLote({ prestadorId: c.prestador.id, servicoId: c.servico.id, reguaId: c.regua.id, data, horas });
}

test('T-AGENDA-01 | RF-022: cancelar horario PUBLICADO o retira da busca, sem penalidade, com registro', () => {
  const c = cenarioBasico();
  const reputacaoAntes = um('SELECT reputacao FROM usuario WHERE id = ?', c.prestador.id).reputacao;
  assert.ok(busca.buscarPorFiltros().some(({ id }) => id === c.horario.id));

  horarios.cancelarHorarioLivre({ prestadorId: c.prestador.id, horarioId: c.horario.id });

  assert.equal(horariosRepo.porId(c.horario.id).estado, 'CANCELADO');
  assert.ok(!busca.buscarPorFiltros().some(({ id }) => id === c.horario.id));
  assert.equal(um('SELECT COUNT(*) AS n FROM evento_reputacao WHERE usuario_id = ?', c.prestador.id).n, 0);
  assert.equal(um('SELECT reputacao FROM usuario WHERE id = ?', c.prestador.id).reputacao, reputacaoAntes);
  const registro = auditoria.historicoDe('horario', c.horario.id).at(-1);
  assert.equal(registro.acao, 'HORARIO_CANCELADO');
  assert.equal(registro.ator_id, c.prestador.id);
});

test('T-AGENDA-02 | RF-022: horario que nao esta PUBLICADO nao e cancelado por essa via', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const reservado = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  assert.throws(
    () => horarios.cancelarHorarioLivre({ prestadorId: c.prestador.id, horarioId: c.horario.id }),
    (e) => e.regra === 'RN-05' && e.detalhes.agendamentoId === reservado.id,
  );
  assert.equal(horariosRepo.porId(c.horario.id).estado, 'BLOQUEADO');

  // Recusada a reserva, o horario volta a PUBLICADO e pode ser cancelado.
  agendamentos.recusar({ prestadorId: c.prestador.id, agendamentoId: reservado.id, motivo: 'Agenda indisponivel' });
  assert.equal(horarios.cancelarHorarioLivre({ prestadorId: c.prestador.id, horarioId: c.horario.id }).estado, 'CANCELADO');

  // Horario que ja expirou (estado terminal) nao muda.
  const vencido = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 5);
  viajarPara(adicionarHoras(vencido.inicio, 1));
  horariosRepo.atualizarEstado(vencido.id, 'EXPIRADO');
  assert.throws(() => horarios.cancelarHorarioLivre({ prestadorId: c.prestador.id, horarioId: vencido.id }));
  assert.equal(horariosRepo.porId(vencido.id).estado, 'EXPIRADO');
});

test('T-AGENDA-03 | RF-023: o lote cria cada entrada valida e reporta cada recusa com a sua regra', () => {
  const c = cenarioBasico();
  const resultados = lote(c, ['09:00', '09:30', '11:00', '25:00', 'abc', '11:00']);

  assert.deepEqual(resultados.map(({ hora, ok }) => [hora, ok]), [
    ['09:00', true], ['09:30', false], ['11:00', true], ['25:00', false], ['abc', false], ['11:00', false],
  ]);
  assert.deepEqual(resultados.filter((r) => !r.ok).map((r) => r.regra ?? r.erro.slice(0, 21)), [
    'RN-06', 'Data ou hora inválida', 'Data ou hora inválida', 'RN-06',
  ]);
  assert.equal(um("SELECT COUNT(*) AS n FROM horario_vago WHERE estado = 'PUBLICADO'").n, 3, 'o do cenario + 2 do lote');
});

test('T-AGENDA-04 | RF-023: hora ou data fora do calendario e recusada, nunca transborda para outro dia', () => {
  for (const [data, hora] of [['2026-09-11', '25:00'], ['2026-09-11', '10:75'], ['2026-02-31', '10:00'], ['2026-13-01', '10:00']]) {
    assert.throws(() => deLocalParaUtc(data, hora), TypeError, `${data} ${hora}`);
  }
  assert.equal(deLocalParaUtc('2028-02-29', '23:59'), '2028-03-01T02:59:00.000Z', 'bissexto e fim do dia valem');

  // Pela aplicacao, a entrada invalida e erro de validacao (422 com o campo), nao falha interna.
  const c = cenarioBasico();
  assert.throws(() => horarios.publicar({
    prestadorId: c.prestador.id, servicoId: c.servico.id, reguaId: c.regua.id, data: '2026-09-11', hora: '24:00',
  }), (e) => e.name === 'ErroDeValidacao' && e.campo === 'hora');
  assert.equal(um('SELECT COUNT(*) AS n FROM horario_vago').n, 1);
});

test('T-AGENDA-05 | RF-023: a tela do lote mostra cada recusa com a regra', async () => {
  const c = cenarioBasico();
  const login = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'prestador@teste.dev', senha: 'senha1234' }),
    redirect: 'manual',
  });
  const cookie = login.headers.getSetCookie()[0].split(';')[0];
  const csrf = um('SELECT csrf FROM sessao WHERE id = ?', decodeURIComponent(cookie.split('=')[1])).csrf;
  const { data } = partesLocais(adicionarHoras(agoraDoTeste(), 30));

  const r = await fetch(`${base}/prestador/horarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams({
      _csrf: csrf, servicoId: String(c.servico.id), reguaId: String(c.regua.id), data, horas: '09:00, 09:30, 25:00',
    }),
    redirect: 'manual',
  });
  assert.equal(r.status, 302);
  const tela = await (await fetch(`${base}/prestador/horarios`, { headers: { Cookie: cookie } })).text();
  assert.match(tela, /1 horário publicado/);
  assert.match(tela, /09:30 \(RN-06: /);
  assert.match(tela, /25:00 \(Data ou hora inválida/);
});
