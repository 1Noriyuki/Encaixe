/** SPEC-024 RF-062: filtros do extrato devem incluir retenções. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as financeiro from '../../src/infra/repositorios/financeiro.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-EXTRATO-04 | RF-062: totais retidos respeitam o recorte temporal', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  financeiro.atualizarEstado(ag.id, 'RETIDO');
  const original = financeiro.porAgendamento(ag.id);
  const tudo = financeiro.totaisPrestador(c.prestador.id);
  assert.equal(tudo.retido_qtd, 1);
  assert.ok(tudo.retido_liquido > 0);

  const depois = financeiro.totaisPrestador(c.prestador.id, {
    de: adicionarHoras(original.criado_em, 1),
  });
  assert.equal(depois.retido_qtd, 0);
  assert.equal(depois.retido_liquido, 0);
  assert.equal(financeiro.extratoPrestador(c.prestador.id, {
    de: adicionarHoras(original.criado_em, 1),
  }).length, 0);

  const antes = financeiro.totaisPrestador(c.prestador.id, {
    ate: adicionarHoras(original.criado_em, -1),
  });
  assert.equal(antes.retido_qtd, 0);
  assert.equal(antes.retido_liquido, 0);
  const incluso = financeiro.totaisPrestador(c.prestador.id, {
    de: original.criado_em, ate: original.criado_em,
  });
  assert.equal(incluso.retido_qtd, 1);
  assert.equal(incluso.retido_liquido, tudo.retido_liquido);
});
