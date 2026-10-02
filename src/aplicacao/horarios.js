/**
 * UC-02 - publicar horario vago.
 * Cobre RF-014 a RF-017, RF-022, RF-023. Regras: RN-05, RN-06, RN-07, RN-08.
 */

import * as horariosRepo from '../infra/repositorios/horarios.js';
import * as catalogoRepo from '../infra/repositorios/catalogo.js';
import * as agendamentosRepo from '../infra/repositorios/agendamentos.js';
import * as auditoria from '../infra/auditoria.js';
import { transacao } from '../infra/db/conexao.js';
import { ErroDeRegra, ErroDeValidacao, NaoEncontrado, ErroDeAutorizacao } from '../dominio/erros.js';
import { assegurarTransicao } from '../dominio/estados.js';
import {
  assegurarAntecedenciaPublicacao, assegurarSemSobreposicao,
} from '../dominio/reserva.js';
import { projetarRegua } from '../dominio/precificacao.js';
import { agoraIso, deLocalParaUtc, minutosEntre } from '../dominio/tempo.js';
import { params } from './parametros.js';
import { precificarLista, precificarUm } from './precos.js';
import { assegurarPodePublicar } from './contas.js';

/**
 * RF-014 - publica um horario vago.
 * @param {string} data 'AAAA-MM-DD' no fuso do usuario
 * @param {string} hora 'HH:MM'
 */
export function publicar({ prestadorId, servicoId, reguaId, data, hora }) {
  const p = params();
  assegurarPodePublicar(prestadorId);

  const servico = catalogoRepo.servicoPorId(Number(servicoId));
  if (!servico) throw new ErroDeValidacao('Escolha um serviço.', 'servicoId');
  if (servico.prestador_id !== prestadorId) throw new ErroDeAutorizacao();

  const regua = catalogoRepo.reguaPorId(Number(reguaId));
  if (!regua) throw new ErroDeValidacao('Escolha uma régua de desconto.', 'reguaId');
  if (regua.prestador_id !== prestadorId) throw new ErroDeAutorizacao();
  if (regua.faixas.length === 0) {
    throw new ErroDeRegra('RN-02', 'Esta régua não tem faixas de desconto cadastradas.');
  }

  const inicio = deLocalParaUtc(data, hora);
  const agora = agoraIso();

  // RN-07
  assegurarAntecedenciaPublicacao(minutosEntre(agora, inicio), p);

  // RN-06
  assegurarSemSobreposicao(
    horariosRepo.ativosDoPrestador(prestadorId),
    { inicio, duracao_min: servico.duracao_min },
  );

  return transacao(() => {
    const id = horariosRepo.criar({
      prestador_id: prestadorId,
      servico_id: servico.id,
      regua_id: regua.id,
      inicio,
      duracao_min: servico.duracao_min,
      // Snapshots: editar o servico depois nao muda o horario ja publicado (RN-05).
      preco_base_snapshot: servico.preco_base,
      preco_minimo_snapshot: servico.preco_minimo,
      estado: 'PUBLICADO',
      criado_em: agora,
    });

    auditoria.registrar({
      atorId: prestadorId,
      acao: 'HORARIO_PUBLICADO',
      entidade: 'horario',
      entidadeId: id,
      para: 'PUBLICADO',
      detalhe: { inicio, servico: servico.nome, precoBase: servico.preco_base },
    });

    return horariosRepo.porId(id);
  });
}

/** RF-023 - publicacao em lote: cada entrada e validada isoladamente. */
export function publicarLote({ prestadorId, servicoId, reguaId, data, horas }) {
  const resultados = [];

  for (const hora of horas) {
    try {
      const horario = publicar({ prestadorId, servicoId, reguaId, data, hora });
      resultados.push({ hora, ok: true, horario });
    } catch (erro) {
      resultados.push({ hora, ok: false, erro: erro.message, regra: erro.regra ?? null });
    }
  }

  return resultados;
}

/** RF-022 - cancelar horario ainda livre (sem penalidade). */
export function cancelarHorarioLivre({ prestadorId, horarioId }) {
  const horario = horariosRepo.porId(horarioId);
  if (!horario) throw new NaoEncontrado('Horário não encontrado.');
  if (horario.prestador_id !== prestadorId) throw new ErroDeAutorizacao();

  const agendamento = agendamentosRepo.porHorario(horarioId);
  if (agendamento) {
    throw new ErroDeRegra(
      'RN-05',
      'Este horário já tem uma reserva. Para desfazer, cancele o agendamento - '
      + 'ai a política de penalidade se aplica.',
      { agendamentoId: agendamento.id },
    );
  }

  return transacao(() => {
    assegurarTransicao('horario', horario.estado, 'CANCELADO');
    horariosRepo.atualizarEstado(horarioId, 'CANCELADO');

    auditoria.registrar({
      atorId: prestadorId,
      acao: 'HORARIO_CANCELADO',
      entidade: 'horario',
      entidadeId: horarioId,
      de: horario.estado,
      para: 'CANCELADO',
    });

    return horariosRepo.porId(horarioId);
  });
}

/** Agenda do prestador, ja precificada para exibicao. */
export function agendaDoPrestador(prestadorId, { estados = null, desde = null } = {}) {
  const p = params();
  const agora = agoraIso();
  const lista = horariosRepo.doPrestador(prestadorId, { estados, desde });
  return precificarLista(lista, p, agora);
}

/**
 * Horario unico, ja precificado, com a projecao da regua junto (RF-026/RF-027).
 *
 * A projecao vem daqui e nao da interface: a tela mostra os degraus, mas quem
 * calcula cada preco continua sendo o dominio (RN-01, INV-14).
 */
export function detalhe(horarioId) {
  const p = params();
  const horario = horariosRepo.porId(horarioId);
  if (!horario) throw new NaoEncontrado('Horário não encontrado.');

  const precificado = precificarUm(horario, p, agoraIso());
  const faixas = horariosRepo.faixasDoHorario(horario.id);

  return {
    ...precificado,
    // Snapshots do proprio horario: editar o servico depois nao muda esta
    // projecao, pelo mesmo motivo de RN-05.
    regua: faixas.length
      ? projetarRegua({
        precoBase: horario.preco_base_snapshot,
        precoMinimo: horario.preco_minimo_snapshot ?? 0,
        faixas,
        tetoPct: p.desconto_maximo_pct,
      })
      : [],
  };
}
