/**
 * T-22, T-23, T-28, T-29, T-33 e T-53.
 * Evidencias de aceite para transacao, busca e consequencias.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  prepararBanco, encerrar, cenarioBasico, viajarPara, agoraDoTeste, publicarDaquiA,
} from '../apoio/cenario.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as busca from '../../src/aplicacao/busca.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import * as horarios from '../../src/aplicacao/horarios.js';
import * as catalogoRepo from '../../src/infra/repositorios/catalogo.js';
import * as horariosRepo from '../../src/infra/repositorios/horarios.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import { adicionarHoras, partesLocais } from '../../src/dominio/tempo.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

function criarPrestadorComHorario(c, {
  sufixo, instante, regiaoId = c.regiao.id, categoriaId = c.categoria.id,
  precoBase = '100,00',
}) {
  const prestador = contas.cadastrar({
    nome: `Prestador ${sufixo}`,
    email: `prestador-${sufixo}@teste.dev`,
    senha: 'senha1234',
    perfil: 'PRESTADOR',
    nomeExibicao: `Espaco ${sufixo}`,
    regiaoId,
  });
  contas.aprovarPrestador({ adminId: c.adminId, prestadorId: prestador.id });
  contas.salvarPerfilPrestador({
    prestadorId: prestador.id,
    nomeExibicao: `Espaco ${sufixo}`,
    descricao: 'Cenario de busca',
    regiaoId,
    janelaConfirmacaoMin: 15,
    politicaExpiracao: 'LIBERAR',
  });
  const servico = catalogo.salvarServico({
    prestadorId: prestador.id,
    nome: `Servico ${sufixo}`,
    categoriaId,
    duracaoMin: 60,
    precoBase,
    precoMinimo: '40,00',
  });
  const regua = catalogo.salvarRegua({
    prestadorId: prestador.id,
    nome: `Regua ${sufixo}`,
    faixas: [
      { antecedencia_min: 240, percentual_desconto: 20 },
      { antecedencia_min: 60, percentual_desconto: 35 },
    ],
  });
  const { data, hora } = partesLocais(instante);
  const horario = horarios.publicar({
    prestadorId: prestador.id, servicoId: servico.id, reguaId: regua.id, data, hora,
  });
  return { prestador, servico, regua, horario };
}

test('T-HORARIO-LOTE-01 | RF-023: falha parcial do lote e reportada sem abortar as demais', () => {
  const c = cenarioBasico();
  const instante = adicionarHoras(agoraDoTeste(), 10);
  const { data, hora } = partesLocais(instante);
  const [h, m] = hora.split(':').map(Number);
  const meiaHoraDepois = `${String(h + Math.floor((m + 30) / 60)).padStart(2, '0')}:${String((m + 30) % 60).padStart(2, '0')}`;
  const umaHoraDepois = partesLocais(adicionarHoras(instante, 1)).hora;

  const resultados = horarios.publicarLote({
    prestadorId: c.prestador.id,
    servicoId: c.servico.id,
    reguaId: c.regua.id,
    data,
    horas: [hora, meiaHoraDepois, umaHoraDepois],
  });

  assert.deepEqual(resultados.map(({ ok }) => ok), [true, false, true]);
  assert.equal(resultados[1].hora, meiaHoraDepois);
  assert.equal(resultados[1].regra, 'RN-06');
  assert.equal(horarios.agendaDoPrestador(c.prestador.id).length, 3);
});

test('T-HORARIO-CANCEL-01 | RF-022: prestador cancela horario publicado sem penalidade', () => {
  const c = cenarioBasico();

  const cancelado = horarios.cancelarHorarioLivre({
    prestadorId: c.prestador.id, horarioId: c.horario.id,
  });

  assert.equal(cancelado.estado, 'CANCELADO');
  assert.equal(horariosRepo.porId(c.horario.id).estado, 'CANCELADO');
});

test('T-HORARIO-CANCEL-02 | RF-022: horario reservado nao pode ser cancelado por essa via', () => {
  const c = cenarioBasico();
  agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  assert.throws(
    () => horarios.cancelarHorarioLivre({
      prestadorId: c.prestador.id, horarioId: c.horario.id,
    }),
    (erro) => erro.regra === 'RN-05',
  );
  assert.equal(horariosRepo.porId(c.horario.id).estado, 'BLOQUEADO');
});

test('T-BUSCA-03 | RF-028 a RF-030: filtros de categoria, regiao e janela e oferta elegivel', () => {
  const c = cenarioBasico();
  const outraRegiaoId = catalogoRepo.criarRegiao('Sao Paulo', 'Moema');
  const outraCategoriaId = catalogoRepo.criarCategoria('Estetica de teste', 12);
  const instante = adicionarHoras(c.horario.inicio, 2);
  const outraOferta = criarPrestadorComHorario(c, {
    sufixo: 'busca', instante, regiaoId: outraRegiaoId, categoriaId: outraCategoriaId,
  });

  assert.deepEqual(
    busca.buscarPorFiltros({ categoriaId: c.categoria.id, regiaoId: c.regiao.id })
      .map(({ id }) => id),
    [c.horario.id],
  );
  assert.deepEqual(
    busca.buscarPorFiltros({ categoriaId: outraCategoriaId, regiaoId: outraRegiaoId })
      .map(({ id }) => id),
    [outraOferta.horario.id],
  );
  assert.deepEqual(
    busca.buscarPorFiltros({
      de: c.horario.inicio, ate: c.horario.inicio,
    }).map(({ id }) => id),
    [c.horario.id],
  );

  usuariosRepo.atualizarEstadoConta(outraOferta.prestador.id, 'REPROVADO');
  horariosRepo.atualizarEstado(c.horario.id, 'CANCELADO');
  assert.deepEqual(busca.buscarPorFiltros().map(({ id }) => id), []);
});

test('T-BUSCA-04 | RF-031: empate na ordenacao por proximidade usa id estavel', () => {
  const c = cenarioBasico({ horasAteHorario: 6 });
  const mesmaHora = criarPrestadorComHorario(c, {
    sufixo: 'desempate', instante: c.horario.inicio,
  });

  const primeiraLeitura = busca.buscarPorFiltros({ ordenar: 'proximidade' }).map(({ id }) => id);
  const segundaLeitura = busca.buscarPorFiltros({ ordenar: 'proximidade' }).map(({ id }) => id);

  assert.deepEqual(primeiraLeitura, [c.horario.id, mesmaHora.horario.id].sort((a, b) => a - b));
  assert.deepEqual(segundaLeitura, primeiraLeitura);
});

test('T-AGENDAMENTO-06 | RF-042: prestador confirma reserva pendente e ocupa o horario', () => {
  const c = cenarioBasico();
  const reserva = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  const confirmada = agendamentos.confirmar({
    prestadorId: c.prestador.id, agendamentoId: reserva.id,
  });

  assert.equal(confirmada.estado, 'CONFIRMADO');
  assert.equal(horariosRepo.porId(c.horario.id).estado, 'OCUPADO');
});

test('T-AGENDAMENTO-07 | RF-043/RF-044: recusa exige motivo e libera o horario', () => {
  const c = cenarioBasico();
  const reserva = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });

  assert.throws(
    () => agendamentos.recusar({
      prestadorId: c.prestador.id, agendamentoId: reserva.id, motivo: 'nao',
    }),
    (erro) => erro.campo === 'motivo',
  );

  const recusada = agendamentos.recusar({
    prestadorId: c.prestador.id, agendamentoId: reserva.id, motivo: 'Agenda indisponivel',
  });

  assert.equal(recusada.estado, 'RECUSADO');
  assert.equal(recusada.motivo_encerramento, 'Agenda indisponivel');
  assert.equal(horariosRepo.porId(c.horario.id).estado, 'PUBLICADO');
});

test('T-DISPUTA-07 | RF-074/RF-075: fila prioriza o SLA e destaca disputas vencidas', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const outroHorario = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 6);

  const primeiroAgendamento = agendamentos.reservar({
    clienteId: c.cliente.id, horarioId: c.horario.id,
  });
  agendamentos.confirmar({
    prestadorId: c.prestador.id, agendamentoId: primeiroAgendamento.id,
  });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({
    prestadorId: c.prestador.id, agendamentoId: primeiroAgendamento.id,
  });
  disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: primeiroAgendamento.id,
    motivo: 'OUTRO', evidencia: 'Evidencia suficiente para abrir a primeira disputa.',
  });

  const segundoAgendamento = agendamentos.reservar({
    clienteId: c.cliente2.id, horarioId: outroHorario.id,
  });
  agendamentos.confirmar({
    prestadorId: c.prestador.id, agendamentoId: segundoAgendamento.id,
  });
  viajarPara(adicionarHoras(outroHorario.inicio, 1.5));
  agendamentos.concluir({
    prestadorId: c.prestador.id, agendamentoId: segundoAgendamento.id,
  });
  disputas.abrir({
    usuarioId: c.cliente2.id, agendamentoId: segundoAgendamento.id,
    motivo: 'OUTRO', evidencia: 'Evidencia suficiente para abrir a segunda disputa.',
  });

  const fila = disputas.fila();
  assert.equal(fila.length, 2);
  assert.ok(fila[0].prazo_sla_em < fila[1].prazo_sla_em);

  viajarPara(adicionarHoras(fila[0].prazo_sla_em, 1));
  const atualizada = disputas.fila();
  assert.deepEqual(atualizada.map(({ foraDoSla }) => foraDoSla), [true, false]);
});
