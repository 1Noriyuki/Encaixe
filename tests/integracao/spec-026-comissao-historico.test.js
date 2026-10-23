/** Trilha A — SPEC-026 / T-56 / T-57: histórico real e filtros coerentes. */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';
import { executar, migrar } from '../../src/infra/db/conexao.js';
import * as admin from '../../src/aplicacao/admin.js';
import * as catalogo from '../../src/infra/repositorios/catalogo.js';
import * as financeiro from '../../src/infra/repositorios/financeiro.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as auditoria from '../../src/infra/auditoria.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-SPEC026-01 | RF-080: criação e alteração preservam versões e autor', () => {
  const c = cenarioBasico();
  const antes = catalogo.historicoComissaoCategoria(c.categoria.id);
  assert.equal(antes.length, 1);
  assert.equal(antes[0].percentual, 12);
  assert.equal(antes[0].origem, 'CRIACAO');
  assert.equal(antes[0].autor_id, null);
  admin.ajustarComissao({ adminId: c.adminId, categoriaId: c.categoria.id, percentual: 15 });
  const versoes = catalogo.historicoComissaoCategoria(c.categoria.id);
  assert.deepEqual(versoes.map(v => v.percentual), [12, 15]);
  assert.deepEqual(versoes.map(v => v.origem), ['CRIACAO', 'ALTERACAO']);
  assert.equal(versoes[1].autor_id, c.adminId);
  assert.equal(versoes[1].vigente_desde, catalogo.categoriaPorId(c.categoria.id).vigente_desde);
  assert.equal(auditoria.historicoDe('categoria', c.categoria.id)
    .filter(v => v.acao === 'COMISSAO_CATEGORIA_ALTERADA').length, 1);
  // Gravar o mesmo valor novamente não cria um evento histórico inexistente.
  admin.ajustarComissao({ adminId: c.adminId, categoriaId: c.categoria.id, percentual: 15 });
  assert.equal(catalogo.historicoComissaoCategoria(c.categoria.id).length, 2);
});

test('T-SPEC026-02 | RF-080: falha da auditoria não altera o percentual nem o histórico', () => {
  const c = cenarioBasico();
  executar(`CREATE TRIGGER impedir_auditoria_comissao
    BEFORE INSERT ON log_auditoria
    WHEN NEW.acao = 'COMISSAO_CATEGORIA_ALTERADA'
    BEGIN SELECT RAISE(ABORT, 'auditoria indisponivel'); END`);
  assert.throws(() => admin.ajustarComissao({
    adminId: c.adminId, categoriaId: c.categoria.id, percentual: 15,
  }), /auditoria indisponivel/);
  assert.equal(catalogo.categoriaPorId(c.categoria.id).percentual_comissao, 12);
  assert.equal(catalogo.historicoComissaoCategoria(c.categoria.id).length, 1);
});

test('T-SPEC026-03 | RF-080: migração de legado usa apenas snapshot conhecido, sem inventar histórico', () => {
  const c = cenarioBasico();
  executar('DELETE FROM historico_comissao_categoria WHERE categoria_id = ?', c.categoria.id);
  migrar();
  migrar();
  const historico = catalogo.historicoComissaoCategoria(c.categoria.id);
  assert.equal(historico.length, 1);
  assert.equal(historico[0].percentual, 12);
  assert.equal(historico[0].origem, 'SNAPSHOT_LEGADO');
  assert.equal(historico[0].autor_id, null);
});

test('T-SPEC026-04 | RF-064: totais e divisão por categoria respeitam prestador e categoria', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  const esperado = admin.metricas({
    dias: 30, categoriaId: c.categoria.id, prestadorId: c.prestador.id,
  });
  assert.equal(esperado.total.concluidos, 1);
  assert.equal(esperado.porCategoria.length, 1);
  assert.equal(esperado.porCategoria[0].qtd, 1);
  assert.equal(esperado.porCategoria[0].comissao, 960);

  for (const filtros of [{ categoriaId: 999 }, { prestadorId: 999 }]) {
    const recorte = admin.metricas({ dias: 30, ...filtros });
    assert.equal(recorte.total.concluidos, 0);
    assert.equal(recorte.total.comissao, 0);
    assert.equal(recorte.porCategoria.length, 0);
  }
  assert.deepEqual(financeiro.comissaoPorCategoria({
    categoriaId: c.categoria.id, prestadorId: 999,
  }), []);
});
