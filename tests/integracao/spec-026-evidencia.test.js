/**
 * SPEC-026: evidência dos critérios de aceitação das métricas e da comissão por categoria.
 * Os IDs T-SPEC026-01 a 03 já identificam testes do histórico da comissão
 * (spec-026-comissao-historico.test.js); por isso os critérios usam T-SPEC026-CAnn.
 * O CA-04 é coberto pelo T-SPEC026-04 existente.
 *
 * Cenário padrão: base R$ 100, régua (240 min, 20%) e (60 min, 35%), comissão 12%.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara, publicarDaquiA } from '../apoio/cenario.js';
import { adicionarHoras, adicionarMinutos } from '../../src/dominio/tempo.js';
import * as admin from '../../src/aplicacao/admin.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import * as catalogoRepo from '../../src/infra/repositorios/catalogo.js';
import * as financeiro from '../../src/infra/repositorios/financeiro.js';
import * as auditoria from '../../src/infra/auditoria.js';
import { ErroDeRegra, NaoEncontrado } from '../../src/dominio/erros.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

function reservado(c, horario = c.horario) {
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return ag;
}

function concluir(c, ag, horario = c.horario) {
  viajarPara(adicionarHoras(horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return financeiro.porAgendamento(ag.id);
}

test('T-SPEC026-CA01 | RF-063: painel sem movimentação devolve zeros válidos', () => {
  cenarioBasico();
  const { total, porCategoria } = admin.metricas({ dias: 30 });
  for (const chave of ['concluidos', 'bruto', 'comissao', 'ticket_medio', 'taxa_cancelamento', 'taxa_noshow']) {
    assert.equal(total[chave], 0, chave);
    assert.ok(Number.isFinite(total[chave]));
  }
  assert.deepEqual(porCategoria, []);
});

test('T-SPEC026-CA02 | RF-063: painel com conclusão efetivada soma bruto, comissão e ticket corretamente', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const lanc = concluir(c, reservado(c));
  // Reserva a 3 h: faixa de 240 min, 20% → R$ 80; comissão de 12% → R$ 9,60.
  assert.equal(lanc.valor_bruto, 8000);
  const { total } = admin.metricas({ dias: 30 });
  assert.equal(total.concluidos, 1);
  assert.equal(total.bruto, 8000);
  assert.equal(total.comissao, 960);
  assert.equal(total.ticket_medio, 8000);
});

test('T-SPEC026-CA03 | RF-063: retido/estornado não contam como receita', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = reservado(c);
  concluir(c, ag);
  const d = disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'SERVICO_NAO_REALIZADO',
    relato: 'Não fui atendido.', evidencia: 'Mensagem do prestador cancelando no dia.',
  });
  assert.equal(financeiro.porAgendamento(ag.id).estado, 'RETIDO');
  assert.equal(admin.metricas({ dias: 30 }).total.comissao, 0);

  disputas.resolver({
    adminId: c.adminId, disputaId: d.id, desfecho: 'REVERTIDO', justificativa: 'Evidência conclusiva do cliente.',
  });
  assert.equal(financeiro.porAgendamento(ag.id).estado, 'ESTORNADO');
  const { total } = admin.metricas({ dias: 30 });
  assert.equal(total.concluidos, 0);
  assert.equal(total.bruto, 0);
  assert.equal(total.comissao, 0);
});

test('T-SPEC026-CA05 | RF-063: cancelamento e no-show têm taxas coerentes e nunca dividem por zero', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const segundo = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 6);
  const terceiro = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 9);

  const cancelado = reservado(c);
  agendamentos.cancelar({ usuarioId: c.cliente.id, agendamentoId: cancelado.id });
  const ausente = reservado(c, segundo);
  const ok = reservado(c, terceiro);
  viajarPara(adicionarMinutos(segundo.inicio, 30));
  agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: ausente.id });
  concluir(c, ok, terceiro);

  const { total } = admin.metricas({ dias: 30 });
  assert.equal(total.total_agendamentos, 3);
  assert.equal(total.cancelados, 1);
  assert.equal(total.noshows, 1);
  assert.equal(total.taxa_cancelamento, 33);
  assert.equal(total.taxa_noshow, 33);
  // Recorte vazio: taxas zeradas, sem NaN.
  const vazio = admin.metricas({ dias: 30, prestadorId: 9999 }).total;
  assert.equal(vazio.taxa_cancelamento, 0);
  assert.equal(vazio.taxa_noshow, 0);
});

test('T-SPEC026-CA06 | RN-15: admin altera percentual dentro de 8% a 15%', () => {
  const c = cenarioBasico();
  for (const pct of [8, 15]) {
    assert.equal(admin.ajustarComissao({ adminId: c.adminId, categoriaId: c.categoria.id, percentual: pct })
      .percentual_comissao, pct);
  }
  const historico = catalogoRepo.historicoComissaoCategoria(c.categoria.id).map((h) => h.percentual);
  assert.ok(historico.includes(8) && historico.includes(15));
});

test('T-SPEC026-CA07 | RN-15: percentual inválido é recusado e não persistido', () => {
  const c = cenarioBasico({ comissaoPct: 12 });
  const historico = catalogoRepo.historicoComissaoCategoria(c.categoria.id).length;
  for (const pct of [7, 16, 10.5, 'dez']) {
    assert.throws(() => admin.ajustarComissao({ adminId: c.adminId, categoriaId: c.categoria.id, percentual: pct }),
      (e) => e instanceof ErroDeRegra && e.regra === 'RN-15');
  }
  assert.throws(() => admin.ajustarComissao({ adminId: c.adminId, categoriaId: 9999, percentual: 10 }),
    (e) => e instanceof NaoEncontrado);
  assert.equal(catalogoRepo.categoriaPorId(c.categoria.id).percentual_comissao, 12);
  assert.equal(catalogoRepo.historicoComissaoCategoria(c.categoria.id).length, historico);
});

test('T-SPEC026-CA08 | RF-080: mudança de categoria é auditável com estado anterior e novo', () => {
  const c = cenarioBasico({ comissaoPct: 12 });
  admin.ajustarComissao({ adminId: c.adminId, categoriaId: c.categoria.id, percentual: 10 });
  const log = auditoria.historicoDe('categoria', c.categoria.id)
    .filter((l) => l.acao === 'COMISSAO_CATEGORIA_ALTERADA');
  assert.equal(log.length, 1);
  assert.equal(log[0].ator_id, c.adminId);
  assert.equal(log[0].estado_anterior, '12');
  assert.equal(log[0].estado_novo, '10');
  // Repetir o mesmo valor não gera registro novo.
  admin.ajustarComissao({ adminId: c.adminId, categoriaId: c.categoria.id, percentual: 10 });
  assert.equal(auditoria.historicoDe('categoria', c.categoria.id)
    .filter((l) => l.acao === 'COMISSAO_CATEGORIA_ALTERADA').length, 1);
});

test('T-SPEC026-CA09 | RF-081: lançamentos antigos mantêm percentual e valores originais', () => {
  const c = cenarioBasico({ horasAteHorario: 3, comissaoPct: 12 });
  const antes = { ...concluir(c, reservado(c)) };
  admin.ajustarComissao({ adminId: c.adminId, categoriaId: c.categoria.id, percentual: 15 });
  const depois = { ...financeiro.porAgendamento(antes.agendamento_id) };
  assert.deepEqual(depois, antes);
  assert.equal(depois.percentual_aplicado, 12);
  assert.equal(admin.metricas({ dias: 30 }).total.comissao, 960);
});
