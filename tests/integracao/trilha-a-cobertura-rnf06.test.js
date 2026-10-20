/**
 * T-68 (RNF-06): lacunas de rastreabilidade por identificador de regra.
 * Parte desta cobertura usa o comportamento já implementado em outras trilhas;
 * nenhum comportamento ou Spec é alterado.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as horariosRepo from '../../src/infra/repositorios/horarios.js';
import * as financeiroRepo from '../../src/infra/repositorios/financeiro.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-HORARIO-04 | RN-05: servico alterado nao modifica snapshots de horario reservado', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  assert.equal(ag.estado, 'PENDENTE_CONFIRMACAO');
  const antes = horariosRepo.porId(c.horario.id);

  catalogo.salvarServico({
    prestadorId: c.prestador.id, servicoId: c.servico.id,
    nome: 'Preço alterado', categoriaId: c.categoria.id,
    duracaoMin: 90, precoBase: '250,00', precoMinimo: '100,00',
  });
  const depois = horariosRepo.porId(c.horario.id);
  for (const campo of ['inicio', 'duracao_min', 'preco_base_snapshot', 'preco_minimo_snapshot', 'regua_id']) {
    assert.equal(depois[campo], antes[campo], campo);
  }
  // Este teste prova imutabilidade indireta dos snapshots; a proibição de editar
  // um horário diretamente (RF-017) ainda precisa de critério dedicado.
});

test('T-RECUSA-01 | RN-11: motivo obrigatorio e recusa sem penalidade ao cliente', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  const reputacaoInicial = usuariosRepo.porId(c.cliente.id).reputacao;

  assert.throws(
    () => agendamentos.recusar({ prestadorId: c.prestador.id, agendamentoId: ag.id, motivo: 'x' }),
    (e) => e.campo === 'motivo',
  );
  assert.equal(agendamentos.recusar({
    prestadorId: c.prestador.id, agendamentoId: ag.id,
    motivo: 'Não poderei atender nessa data.',
  }).estado, 'RECUSADO');
  assert.equal(horariosRepo.porId(c.horario.id).estado, 'PUBLICADO');
  assert.equal(usuariosRepo.porId(c.cliente.id).reputacao, reputacaoInicial);
  assert.equal(financeiroRepo.porAgendamento(ag.id), null);
});

test('T-COMISSAO-06 | RN-33: pagamento NAO_PAGO e apenas registrado, comissao lançada', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));

  const concluido = agendamentos.concluir({
    prestadorId: c.prestador.id, agendamentoId: ag.id,
    estadoCobranca: 'NAO_PAGO',
  });
  assert.equal(concluido.estado, 'CONCLUIDO');
  assert.equal(concluido.estado_cobranca, 'NAO_PAGO');
  const lancamento = financeiroRepo.porAgendamento(ag.id);
  assert.ok(lancamento);
  assert.equal(lancamento.estado, 'EFETIVADO');
  assert.equal(lancamento.valor_bruto, 8000);
  assert.equal(lancamento.valor_comissao, 960);
  // Registrar cobrança não inicia pagamento; não há gateway no MVP (ADR-005).
});
