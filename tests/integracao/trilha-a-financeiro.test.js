/**
 * Trilha A — evidências para T-47, T-56 e T-57.
 * Regras e contratos existentes, sem alterar especificações não aprovadas.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara, publicarDaquiA } from '../apoio/cenario.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as admin from '../../src/aplicacao/admin.js';
import * as financeiro from '../../src/infra/repositorios/financeiro.js';
import * as catalogo from '../../src/infra/repositorios/catalogo.js';
import * as auditoria from '../../src/infra/auditoria.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

/** Cria uma operação realizada, após o fim do atendimento. */
function atendimentoConcluido(c) {
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  return ag;
}

test('T-EXTRATO-01 | RF-061: extrato identifica comissao e liquido do atendimento', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = atendimentoConcluido(c);
  const linhas = financeiro.extratoPrestador(c.prestador.id);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].agendamento_id, ag.id);
  assert.equal(linhas[0].valor_bruto, 8000);
  assert.equal(linhas[0].valor_comissao, 960);
  assert.equal(linhas[0].valor_liquido, 7040);
  assert.equal(linhas[0].estado, 'EFETIVADO');

  const totais = financeiro.totaisPrestador(c.prestador.id);
  assert.equal(totais.qtd, 1);
  assert.equal(totais.liquido, 7040);
  assert.equal(totais.comissao, 960);
});

test('T-EXTRATO-02 | RF-062: comissao RETIDA consta separada, sem compor liquido disponivel', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = atendimentoConcluido(c);
  financeiro.atualizarEstado(ag.id, 'RETIDO');

  const extrato = financeiro.extratoPrestador(c.prestador.id);
  assert.equal(extrato.length, 1);
  assert.equal(extrato[0].estado, 'RETIDO');

  const totais = financeiro.totaisPrestador(c.prestador.id);
  assert.equal(totais.qtd, 0);
  assert.equal(totais.bruto, 0);
  assert.equal(totais.liquido, 0);
  assert.equal(totais.comissao, 0);
  assert.equal(totais.retido_qtd, 1);
  assert.equal(totais.retido_liquido, 7040);
});

test('T-EXTRATO-03 | RF-061: consulta com data fora do periodo nao retorna lancamentos', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  atendimentoConcluido(c);
  const linhas = financeiro.extratoPrestador(c.prestador.id, {
    ate: '2026-08-01T00:00:00.000Z',
  });
  assert.equal(linhas.length, 0);
});

test('T-METRICAS-01 | RF-063/RF-064: painel recorta concluídos por categoria e prestador', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  atendimentoConcluido(c);
  const total = admin.metricas({ dias: 30 });
  assert.equal(total.total.concluidos, 1);
  assert.equal(total.total.bruto, 8000);
  assert.equal(total.total.comissao, 960);
  assert.equal(total.total.ticket_medio, 8000);

  const recorte = admin.metricas({
    dias: 30, categoriaId: c.categoria.id, prestadorId: c.prestador.id,
  });
  assert.equal(recorte.total.concluidos, 1);
  assert.equal(recorte.total.comissao, 960);
  assert.ok(recorte.porCategoria.some((linha) => linha.id === c.categoria.id));

  assert.equal(admin.metricas({ dias: 30, categoriaId: 999 }).total.concluidos, 0);
  assert.equal(admin.metricas({ dias: 30, prestadorId: 999 }).total.comissao, 0);
});

test('T-METRICAS-02 | RF-063: lancamentos retidos nao sao contabilizados como receita', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = atendimentoConcluido(c);
  financeiro.atualizarEstado(ag.id, 'RETIDO');
  const dados = admin.metricas({ dias: 30 });
  assert.equal(dados.total.concluidos, 0);
  assert.equal(dados.total.comissao, 0);
  assert.equal(dados.total.bruto, 0);
});

test('T-CATEGORIA-01 | RF-080/RN-15: admin altera percentual e registra auditoria', () => {
  const c = cenarioBasico();
  assert.equal(catalogo.categoriaPorId(c.categoria.id).percentual_comissao, 12);
  const alterada = admin.ajustarComissao({
    adminId: c.adminId, categoriaId: c.categoria.id, percentual: 15,
  });
  assert.equal(alterada.percentual_comissao, 15);
  const eventos = auditoria.historicoDe('categoria', c.categoria.id)
    .filter((linha) => linha.acao === 'COMISSAO_CATEGORIA_ALTERADA');
  assert.equal(eventos.length, 1);
  assert.equal(eventos[0].estado_anterior, '12');
  assert.equal(eventos[0].estado_novo, '15');
});

test('T-CATEGORIA-02 | RN-15: comissão fora de 8 a 15% e recusada sem persistencia', () => {
  const c = cenarioBasico();
  for (const percentual of [7, 16, 12.5]) {
    assert.throws(
      () => admin.ajustarComissao({
        adminId: c.adminId, categoriaId: c.categoria.id, percentual,
      }),
      (erro) => erro.regra === 'RN-15',
    );
  }
  assert.equal(catalogo.categoriaPorId(c.categoria.id).percentual_comissao, 12);
});

test('T-CATEGORIA-03 | RF-081: mudança de comissão não recalcula lançamento já concluído', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = atendimentoConcluido(c);
  const antes = financeiro.porAgendamento(ag.id);
  assert.equal(antes.percentual_aplicado, 12);
  assert.equal(antes.valor_comissao, 960);

  admin.ajustarComissao({ adminId: c.adminId, categoriaId: c.categoria.id, percentual: 15 });
  const depois = financeiro.porAgendamento(ag.id);
  assert.equal(depois.percentual_aplicado, 12);
  assert.equal(depois.valor_comissao, 960);
});

test('T-CATEGORIA-04 | RF-081: nova conclusão usa percentual atualizado', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const antigo = atendimentoConcluido(c);
  admin.ajustarComissao({ adminId: c.adminId, categoriaId: c.categoria.id, percentual: 15 });

  const horarioNovo = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 3);
  const novo = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: horarioNovo.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: novo.id });
  viajarPara(adicionarHoras(horarioNovo.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: novo.id });

  assert.equal(financeiro.porAgendamento(antigo.id).percentual_aplicado, 12);
  assert.equal(financeiro.porAgendamento(novo.id).percentual_aplicado, 15);
  assert.equal(financeiro.porAgendamento(novo.id).valor_comissao, 1200);
});
