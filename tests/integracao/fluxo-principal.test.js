/**
 * T-RESERVA, T-EXPIRA, T-COMISSAO, T-AVAL - jornada completa.
 * Exercita UC-03, UC-05, UC-06, UC-07, UC-09 e UC-10 ponta a ponta.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara, avancarHoras, agoraDoTeste, publicarDaquiA } from '../apoio/cenario.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as avaliacoes from '../../src/aplicacao/avaliacoes.js';
import * as busca from '../../src/aplicacao/busca.js';
import * as rotinas from '../../src/aplicacao/rotinas.js';
import * as horariosApp from '../../src/aplicacao/horarios.js';
import * as financeiroRepo from '../../src/infra/repositorios/financeiro.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import * as socialRepo from '../../src/infra/repositorios/social.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-BUSCA-01 | UC-03: o horario publicado aparece na busca com o preco ja descontado', () => {
  const c = cenarioBasico({ horasAteHorario: 3, precoBase: '100,00' });

  const resultados = busca.buscarPorFiltros({ categoriaId: c.categoria.id });
  assert.equal(resultados.length, 1);

  const achado = resultados[0];
  assert.equal(achado.id, c.horario.id);
  // 3h de antecedencia cai na faixa de 240 min => 20% off.
  assert.equal(achado.preco.percentualTabela, 20);
  assert.equal(achado.preco.precoVigente, 8000);
  assert.equal(achado.preco.reservavel, true);
});

test('T-BUSCA-02 | RF-029: horario dentro da antecedencia minima some da busca', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });

  // Faltando 20 min para o horario (minimo para reservar e 30 min).
  viajarPara(adicionarHoras(c.horario.inicio, -20 / 60));
  assert.equal(busca.buscarPorFiltros({ categoriaId: c.categoria.id }).length, 0);
});

test('T-RESERVA-01 | UC-05: reservar cria agendamento pendente, trava o preco e bloqueia o horario', () => {
  const c = cenarioBasico({ horasAteHorario: 3, precoBase: '100,00' });

  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  assert.equal(ag.estado, 'PENDENTE_CONFIRMACAO');
  assert.equal(ag.valor_travado, 8000);
  assert.equal(ag.percentual_desconto_aplicado, 20);
  assert.equal(horariosApp.detalhe(c.horario.id).estado, 'BLOQUEADO');

  // RN-10: prazo = agora + janela do prestador (15 min).
  assert.equal(ag.prazo_confirmacao_em, adicionarHoras(agoraDoTeste(), 0.25));
});

test('T-RESERVA-03 | RN-04: o preco travado NAO muda quando o desconto aumenta depois', () => {
  const c = cenarioBasico({ horasAteHorario: 3, precoBase: '100,00' });

  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  assert.equal(ag.valor_travado, 8000);

  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  // Agora falta menos de 1h: a tabela daria 35% (65,00), mas o valor esta travado.
  viajarPara(adicionarHoras(c.horario.inicio, -0.5));
  const depois = agendamentos.detalhe({ agendamentoId: ag.id, usuarioId: c.cliente.id });
  assert.equal(depois.valor_travado, 8000, 'o valor travado na reserva e imutavel');
});

test('T-RESERVA-04 | INV-01: duas reservas concorrentes no mesmo horario, so uma vence', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });

  agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  assert.throws(
    () => agendamentos.reservar({ clienteId: c.cliente2.id, horarioId: c.horario.id }),
    (e) => e.regra === 'RN-09',
  );
});

test('T-EXPIRA-02 | RF-045: sem resposta e politica LIBERAR, o horario volta para a busca', () => {
  const c = cenarioBasico({ horasAteHorario: 5, politicaExpiracao: 'LIBERAR', janelaConfirmacaoMin: 15 });

  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  const reputacaoAntes = usuariosRepo.porId(c.cliente.id).reputacao;

  avancarHoras(0.5); // passou dos 15 min
  const resumo = rotinas.executar();

  assert.equal(resumo.reservasExpiradas, 1);
  assert.equal(agendamentos.detalhe({ agendamentoId: ag.id, usuarioId: c.cliente.id }).estado, 'EXPIRADO');
  assert.equal(horariosApp.detalhe(c.horario.id).estado, 'PUBLICADO', 'o horario volta a ser vendavel');
  assert.equal(
    usuariosRepo.porId(c.cliente.id).reputacao, reputacaoAntes,
    'RN-10: o cliente nao e penalizado quando o prestador nao responde',
  );

  // E pode ser reservado de novo.
  const nova = agendamentos.reservar({ clienteId: c.cliente2.id, horarioId: c.horario.id });
  assert.equal(nova.estado, 'PENDENTE_CONFIRMACAO');
});

test('T-EXPIRA-03 | RF-046: com politica AUTOCONFIRMAR, a reserva vira confirmada sozinha', () => {
  const c = cenarioBasico({ horasAteHorario: 5, politicaExpiracao: 'AUTOCONFIRMAR', janelaConfirmacaoMin: 10 });

  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  avancarHoras(0.5);

  const resumo = rotinas.executar();
  assert.equal(resumo.reservasAutoconfirmadas, 1);
  assert.equal(agendamentos.detalhe({ agendamentoId: ag.id, usuarioId: c.cliente.id }).estado, 'CONFIRMADO');
  assert.equal(horariosApp.detalhe(c.horario.id).estado, 'OCUPADO');
});

test('T-EXPIRA-04 | RF-044: expirando perto demais do horario, ele nao volta para a busca', () => {
  const c = cenarioBasico({ horasAteHorario: 1, janelaConfirmacaoMin: 15 });

  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  // Vai para 20 min antes do horario: abaixo da antecedencia minima de reserva (30 min).
  viajarPara(adicionarHoras(c.horario.inicio, -20 / 60));

  rotinas.executar();
  assert.equal(agendamentos.detalhe({ agendamentoId: ag.id, usuarioId: c.cliente.id }).estado, 'EXPIRADO');
  assert.equal(horariosApp.detalhe(c.horario.id).estado, 'EXPIRADO');
});

test('T-COMISSAO-01i | UC-09: concluir gera comissao sobre o valor final e nao sobre o preco-base', () => {
  const c = cenarioBasico({ horasAteHorario: 3, precoBase: '100,00', comissaoPct: 12 });

  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  // Depois do fim do atendimento.
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({
    prestadorId: c.prestador.id, agendamentoId: ag.id, estadoCobranca: 'PAGO_PRESENCIAL',
  });

  const lancamento = financeiroRepo.porAgendamento(ag.id);
  assert.equal(lancamento.valor_bruto, 8000, 'base = valor travado (com desconto)');
  assert.equal(lancamento.valor_comissao, 960, '12% de 80,00');
  assert.equal(lancamento.valor_liquido, 7040);
  assert.equal(lancamento.valor_comissao + lancamento.valor_liquido, lancamento.valor_bruto, 'INV-06');
  assert.equal(lancamento.estado, 'EFETIVADO');

  // Comissao NAO e 12% de 100,00.
  assert.notEqual(lancamento.valor_comissao, 1200);
});

test('RF-058 | RN-16: nao se conclui antes do fim do atendimento', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  assert.throws(
    () => agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id }),
    (e) => e.regra === 'RN-16',
  );
});

test('T-COMISSAO-05i | RN-16 / INV-05: agendamento cancelado nao gera comissao', () => {
  const c = cenarioBasico({ horasAteHorario: 10 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  agendamentos.cancelar({ usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'imprevisto' });

  assert.equal(financeiroRepo.porAgendamento(ag.id), null);
});

test('RF-060 | UC-09: conclusao automatica apos o prazo sem contestacao', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  // Fim do atendimento + 25h (prazo padrao de autoconclusao e 24h).
  viajarPara(adicionarHoras(c.horario.inicio, 1 + 25));
  const resumo = rotinas.executar();

  assert.equal(resumo.concluidosAutomaticamente, 1);
  const depois = agendamentos.detalhe({ agendamentoId: ag.id, usuarioId: c.cliente.id });
  assert.equal(depois.estado, 'CONCLUIDO');
  assert.ok(financeiroRepo.porAgendamento(ag.id));
});

test('T-AVAL-01/04 | UC-10: avaliacao bilateral com revelacao cega', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  viajarPara(adicionarHoras(c.horario.inicio, 1.2));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  // Cliente avalia primeiro: nota fica oculta.
  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 5, comentario: 'otimo' });

  const visaoPrestador = avaliacoes.situacao({ agendamentoId: ag.id, usuarioId: c.prestador.id });
  assert.equal(visaoPrestador.visiveis.length, 0, 'RN-25: nada visivel antes de ambos avaliarem');
  assert.equal(visaoPrestador.podeAvaliar, true);

  // Prestador avalia: revela as duas.
  avaliacoes.avaliar({ usuarioId: c.prestador.id, agendamentoId: ag.id, nota: 4 });
  const depois = avaliacoes.situacao({ agendamentoId: ag.id, usuarioId: c.cliente.id });
  assert.equal(depois.visiveis.length, 2);

  // RN-23: prestador recebeu 5 (+3) e conclusao (+1); cliente recebeu 4 (+1) e conclusao (+1).
  assert.equal(usuariosRepo.porId(c.prestador.id).reputacao, 70 + 1 + 3);
  assert.equal(usuariosRepo.porId(c.cliente.id).reputacao, 70 + 1 + 1);
});

test('T-AVAL-03 | RN-24: nao se avalia duas vezes nem fora da janela', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.2));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 5 });
  assert.throws(
    () => avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 1 }),
    (e) => e.regra === 'RN-24',
  );

  // 8 dias depois (janela e de 7).
  avancarHoras(24 * 8);
  assert.throws(
    () => avaliacoes.avaliar({ usuarioId: c.prestador.id, agendamentoId: ag.id, nota: 3 }),
    (e) => e.regra === 'RN-24',
  );
});

test('RN-25 | a rotina revela as avaliacoes quando a janela encerra', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.2));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });

  avaliacoes.avaliar({ usuarioId: c.cliente.id, agendamentoId: ag.id, nota: 2 });
  assert.equal(socialRepo.avaliacoesDoAgendamento(ag.id)[0].visivel, 0);

  avancarHoras(24 * 8);
  const resumo = rotinas.executar();
  assert.equal(resumo.avaliacoesReveladas, 1);
  assert.equal(socialRepo.avaliacoesDoAgendamento(ag.id)[0].visivel, 1);
});

test('RN-06 | dois horarios sobrepostos do mesmo prestador nao coexistem', () => {
  const c = cenarioBasico({ horasAteHorario: 5, duracaoMin: 60 });

  assert.throws(
    () => publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 5.5),
    (e) => e.regra === 'RN-06',
  );

  // Fora do intervalo, tudo bem.
  const seguinte = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 6.5);
  assert.equal(seguinte.estado, 'PUBLICADO');
});
