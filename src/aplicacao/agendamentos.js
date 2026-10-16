/**
 * Nucleo transacional: UC-05 a UC-09 e UC-11.
 * Cobre RF-039 a RF-060. Regras: RN-04, RN-07, RN-09 a RN-21, RN-33.
 *
 * Todo metodo que muda estado faz, nesta ordem:
 *   1. autoriza (quem e voce neste agendamento?)
 *   2. valida a regra de negocio no dominio
 *   3. `assegurarTransicao` na maquina de estados
 *   4. grava dentro de uma transacao
 *   5. registra auditoria e notifica
 */

import * as agendamentosRepo from '../infra/repositorios/agendamentos.js';
import * as horariosRepo from '../infra/repositorios/horarios.js';
import * as usuariosRepo from '../infra/repositorios/usuarios.js';
import * as financeiroRepo from '../infra/repositorios/financeiro.js';
import * as moderacaoRepo from '../infra/repositorios/moderacao.js';
import * as auditoria from '../infra/auditoria.js';
import { notificar } from '../infra/notificacoes.js';
import { transacao } from '../infra/db/conexao.js';

import {
  ErroDeRegra, ErroDeAutorizacao, ErroDeConcorrencia, ErroDeValidacao, NaoEncontrado,
} from '../dominio/erros.js';
import { assegurarTransicao } from '../dominio/estados.js';
import {
  assegurarHorarioReservavel, assegurarAntecedenciaReserva,
  assegurarClientePodeReservar, prazoDeConfirmacao, podeVoltarParaBusca,
} from '../dominio/reserva.js';
import {
  faixaDeCancelamento, penalidadeDeCancelamento, previaDeCancelamento as previaDominio, FAIXA,
} from '../dominio/cancelamento.js';
import {
  assegurarJanelaNoShow, assegurarAtendimentoTerminou, fimDoHorario,
  prazoDisputa, prazoSlaDisputa, prazoAvaliacao,
} from '../dominio/prazos.js';
import { calcularComissao, competenciaDe } from '../dominio/comissao.js';
import {
  TIPO_EVENTO, DELTA_CONCLUSAO, DELTA_NO_SHOW,
} from '../dominio/reputacao.js';
import { agoraIso, minutosEntre, formatarDataHora, antesDe } from '../dominio/tempo.js';
import { formatarBRL } from '../dominio/dinheiro.js';

import { params } from './parametros.js';
import { precificar } from './precos.js';
import * as reputacao from './reputacao.js';

// =====================================================================
// UC-05 - reservar
// =====================================================================

/** RF-039 a RF-041 */
export function reservar({ clienteId, horarioId, observacao = '' }) {
  const p = params();
  const agora = agoraIso();

  const cliente = usuariosRepo.porId(clienteId);
  if (!cliente || cliente.perfil !== 'CLIENTE') throw new ErroDeAutorizacao('Apenas clientes reservam horários.');

  const horario = horariosRepo.porId(horarioId);
  if (!horario) throw new NaoEncontrado('Horário não encontrado.');

  // RN-28 - horario de prestador nao ativo nem aparece, nem pode ser reservado.
  if (horario.prestador_estado !== 'ATIVO') {
    throw new ErroDeRegra('RN-28', 'Este prestador não está disponível no momento.');
  }

  assegurarHorarioReservavel(horario);                                        // RN-09
  assegurarAntecedenciaReserva(minutosEntre(agora, horario.inicio), p);       // RN-07
  assegurarClientePodeReservar(cliente, agendamentosRepo.contarEmAberto(clienteId), p); // RN-12, RN-13

  const faixas = horariosRepo.faixasDoHorario(horarioId);
  const preco = precificar(horario, faixas, p, agora);                        // RN-01, RN-03
  const prazo = prazoDeConfirmacao(agora, horario.inicio, horario.janela_confirmacao_min); // RN-10

  try {
    return transacao(() => {
      const id = agendamentosRepo.criar({
        horario_id: horario.id,
        cliente_id: clienteId,
        prestador_id: horario.prestador_id,
        estado: 'PENDENTE_CONFIRMACAO',
        valor_travado: preco.precoVigente,          // RN-04 - o preco congela aqui
        percentual_desconto_aplicado: preco.percentualEfetivo,
        prazo_confirmacao_em: prazo,
        criado_em: agora,
        observacao: String(observacao ?? '').trim(),
      });

      assegurarTransicao('horario', horario.estado, 'BLOQUEADO');
      horariosRepo.atualizarEstado(horario.id, 'BLOQUEADO');

      auditoria.registrar({
        atorId: clienteId,
        acao: 'RESERVA_CRIADA',
        entidade: 'agendamento',
        entidadeId: id,
        para: 'PENDENTE_CONFIRMACAO',
        detalhe: {
          valorTravado: preco.precoVigente,
          descontoPct: preco.percentualEfetivo,
          prazoConfirmacao: prazo,
        },
      });
      auditoria.registrar({
        atorId: clienteId,
        acao: 'HORARIO_BLOQUEADO',
        entidade: 'horario',
        entidadeId: horario.id,
        de: horario.estado,
        para: 'BLOQUEADO',
      });

      notificar(horario.prestador_id, {
        tipo: 'RESERVA_RECEBIDA',
        titulo: 'Nova reserva aguardando sua confirmação',
        agendamentoId: id,
        mensagem: `${cliente.nome} reservou ${horario.servico_nome} em `
          + `${formatarDataHora(horario.inicio)} por ${formatarBRL(preco.precoVigente)}. `
          + `Você tem até ${formatarDataHora(prazo)} para responder.`,
      });

      return agendamentosRepo.porId(id);
    });
  } catch (erro) {
    // INV-01 defendida pelo indice unico parcial: duas reservas simultaneas,
    // uma vence (RF-041).
    if (/UNIQUE constraint failed/i.test(erro?.message ?? '')) {
      throw new ErroDeConcorrencia();
    }
    throw erro;
  }
}

// =====================================================================
// UC-06 - confirmar / recusar
// =====================================================================

/** RF-042 */
export function confirmar({ prestadorId, agendamentoId }) {
  const agora = agoraIso();

  return transacao(() => {
    const ag = carregarDoPrestador(agendamentoId, prestadorId);

    if (ag.estado !== 'PENDENTE_CONFIRMACAO') {
      throw new ErroDeRegra('RN-10', `Esta reserva não está mais aguardando confirmação (${ag.estado}).`);
    }
    if (!antesDe(agora, ag.prazo_confirmacao_em)) {
      throw new ErroDeRegra(
        'RN-10',
        `O prazo de confirmação terminou em ${formatarDataHora(ag.prazo_confirmacao_em)}.`,
      );
    }

    aplicarConfirmacao(ag, agora, prestadorId, 'AGENDAMENTO_CONFIRMADO');
    return agendamentosRepo.porId(agendamentoId);
  });
}

/** Compartilhado entre confirmacao manual (RF-042) e automatica (RF-046). */
function aplicarConfirmacao(ag, agora, atorId, acao) {
  assegurarTransicao('agendamento', ag.estado, 'CONFIRMADO');
  agendamentosRepo.atualizar(ag.id, { estado: 'CONFIRMADO', confirmado_em: agora });

  assegurarTransicao('horario', ag.horario_estado, 'OCUPADO');
  horariosRepo.atualizarEstado(ag.horario_id, 'OCUPADO');

  auditoria.registrar({
    atorId, acao, entidade: 'agendamento', entidadeId: ag.id,
    de: ag.estado, para: 'CONFIRMADO',
  });

  const automatica = atorId === null;
  notificar(ag.cliente_id, {
    tipo: 'AGENDAMENTO_CONFIRMADO',
    titulo: automatica ? 'Sua reserva foi confirmada automaticamente' : 'Sua reserva foi confirmada',
    agendamentoId: ag.id,
    mensagem: `${ag.servico_nome} com ${ag.nome_exibicao ?? ag.prestador_nome} em `
      + `${formatarDataHora(ag.inicio)} por ${formatarBRL(ag.valor_travado)}.`
      + (automatica ? ' O prestador não respondeu no prazo e a política dele é de confirmação automática.' : ''),
  });

  if (automatica) {
    notificar(ag.prestador_id, {
      tipo: 'AGENDAMENTO_CONFIRMADO',
      titulo: 'Reserva confirmada automaticamente',
      agendamentoId: ag.id,
      mensagem: `Você não respondeu no prazo e sua política é AUTOCONFIRMAR. `
        + `${ag.cliente_nome} está confirmado para ${formatarDataHora(ag.inicio)}.`,
    });
  }
}

/** RF-043 / RF-044 */
export function recusar({ prestadorId, agendamentoId, motivo }) {
  const texto = String(motivo ?? '').trim();
  if (texto.length < 5) {
    throw new ErroDeValidacao('Informe o motivo da recusa (mínimo 5 caracteres).', 'motivo');
  }

  const p = params();
  const agora = agoraIso();

  return transacao(() => {
    const ag = carregarDoPrestador(agendamentoId, prestadorId);
    if (ag.estado !== 'PENDENTE_CONFIRMACAO') {
      throw new ErroDeRegra('RN-11', 'Só é possível recusar uma reserva ainda pendente.');
    }

    assegurarTransicao('agendamento', ag.estado, 'RECUSADO');
    agendamentosRepo.atualizar(ag.id, {
      estado: 'RECUSADO', encerrado_em: agora, motivo_encerramento: texto,
    });

    liberarHorario(ag, agora, p, prestadorId);

    auditoria.registrar({
      atorId: prestadorId, acao: 'AGENDAMENTO_RECUSADO', entidade: 'agendamento',
      entidadeId: ag.id, de: ag.estado, para: 'RECUSADO', detalhe: { motivo: texto },
    });

    // RN-11 - o cliente nao e penalizado por uma recusa.
    notificar(ag.cliente_id, {
      tipo: 'AGENDAMENTO_RECUSADO',
      titulo: 'Sua reserva foi recusada',
      agendamentoId: ag.id,
      mensagem: `${ag.nome_exibicao ?? ag.prestador_nome} recusou a reserva de `
        + `${formatarDataHora(ag.inicio)}. Motivo: ${texto}. Nenhuma penalidade foi aplicada a você.`,
    });

    return agendamentosRepo.porId(agendamentoId);
  });
}

/**
 * RF-044 - devolve o horario para a busca se ainda houver antecedencia minima;
 * caso contrario ele expira.
 */
function liberarHorario(ag, agora, p, atorId) {
  const horario = horariosRepo.porId(ag.horario_id);
  const destino = podeVoltarParaBusca(horario.inicio, agora, p) ? 'PUBLICADO' : 'EXPIRADO';

  assegurarTransicao('horario', horario.estado, destino);
  horariosRepo.atualizarEstado(horario.id, destino);

  auditoria.registrar({
    atorId, acao: 'HORARIO_LIBERADO', entidade: 'horario', entidadeId: horario.id,
    de: horario.estado, para: destino,
  });

  return destino;
}

// =====================================================================
// UC-07 - expiracao automatica (chamada pela rotina temporal)
// =====================================================================

/** RF-045 / RF-046 - aplica a politica P-02 do prestador. */
export function resolverExpiracao(ag) {
  const p = params();
  const agora = agoraIso();

  return transacao(() => {
    const atual = agendamentosRepo.porId(ag.id);
    if (!atual || atual.estado !== 'PENDENTE_CONFIRMACAO') return null;
    if (antesDe(agora, atual.prazo_confirmacao_em)) return null;

    if (atual.politica_expiracao === 'AUTOCONFIRMAR') {
      aplicarConfirmacao(atual, agora, null, 'AGENDAMENTO_AUTOCONFIRMADO');
      return { agendamentoId: atual.id, desfecho: 'CONFIRMADO' };
    }

    assegurarTransicao('agendamento', atual.estado, 'EXPIRADO');
    agendamentosRepo.atualizar(atual.id, {
      estado: 'EXPIRADO',
      encerrado_em: agora,
      motivo_encerramento: 'Prestador não respondeu dentro da janela de confirmação.',
    });

    const destinoHorario = liberarHorario(atual, agora, p, null);

    auditoria.registrar({
      atorId: null, acao: 'RESERVA_EXPIRADA', entidade: 'agendamento', entidadeId: atual.id,
      de: 'PENDENTE_CONFIRMACAO', para: 'EXPIRADO',
      detalhe: { politica: 'LIBERAR', destinoHorario, regra: 'RN-10' },
    });

    notificar(atual.cliente_id, {
      tipo: 'RESERVA_EXPIRADA',
      titulo: 'Sua reserva expirou',
      agendamentoId: atual.id,
      mensagem: `${atual.nome_exibicao ?? atual.prestador_nome} não respondeu no prazo. `
        + 'O horário voltou para a busca e você não foi penalizado.',
    });
    notificar(atual.prestador_id, {
      tipo: 'RESERVA_EXPIRADA',
      titulo: 'Você perdeu uma reserva por não responder',
      agendamentoId: atual.id,
      mensagem: `A reserva de ${atual.cliente_nome} para ${formatarDataHora(atual.inicio)} expirou.`,
    });

    return { agendamentoId: atual.id, desfecho: 'EXPIRADO' };
  });
}

// =====================================================================
// UC-08 - cancelamento com penalidade progressiva
// =====================================================================

/** RF-048 - previa mostrada ANTES da confirmacao. */
export function previaDeCancelamento({ usuarioId, agendamentoId }) {
  const p = params();
  const ag = carregarComoParte(agendamentoId, usuarioId);
  const papel = papelDe(ag, usuarioId);
  const antecedencia = minutosEntre(agoraIso(), ag.inicio);

  return {
    agendamento: ag,
    papel,
    antecedenciaMin: antecedencia,
    ...previaDominio(antecedencia, papel, p),
  };
}

/** RF-049 / RF-050 */
export function cancelar({ usuarioId, agendamentoId, motivo = '' }) {
  const p = params();
  const agora = agoraIso();

  const resultado = transacao(() => {
    const ag = carregarComoParte(agendamentoId, usuarioId);
    const papel = papelDe(ag, usuarioId);

    if (!['PENDENTE_CONFIRMACAO', 'CONFIRMADO'].includes(ag.estado)) {
      throw new ErroDeRegra('RN-18', `Este agendamento não pode mais ser cancelado (${ag.estado}).`);
    }

    const antecedencia = minutosEntre(agora, ag.inicio);
    const faixa = faixaDeCancelamento(antecedencia, p);
    const penalidade = penalidadeDeCancelamento(faixa, papel); // lanca se ja comecou

    const novoEstado = papel === 'CLIENTE' ? 'CANCELADO_CLIENTE' : 'CANCELADO_PRESTADOR';
    assegurarTransicao('agendamento', ag.estado, novoEstado);

    agendamentosRepo.atualizar(ag.id, {
      estado: novoEstado,
      encerrado_em: agora,
      motivo_encerramento: String(motivo ?? '').trim() || penalidade.rotulo,
    });

    // Cliente cancelou: o horario pode voltar a ser vendido.
    // Prestador cancelou: o horario morre junto (ele nao vai atender).
    if (papel === 'CLIENTE') {
      liberarHorario(ag, agora, p, usuarioId);
    } else {
      const horario = horariosRepo.porId(ag.horario_id);
      assegurarTransicao('horario', horario.estado, 'CANCELADO');
      horariosRepo.atualizarEstado(horario.id, 'CANCELADO');
      auditoria.registrar({
        atorId: usuarioId, acao: 'HORARIO_CANCELADO', entidade: 'horario',
        entidadeId: horario.id, de: horario.estado, para: 'CANCELADO',
      });
    }

    reputacao.aplicarEvento({
      usuarioId,
      tipo: penalidade.tipoEvento,
      delta: penalidade.delta,
      origemTipo: 'agendamento',
      origemId: ag.id,
    });

    auditoria.registrar({
      atorId: usuarioId, acao: 'AGENDAMENTO_CANCELADO', entidade: 'agendamento',
      entidadeId: ag.id, de: ag.estado, para: novoEstado,
      detalhe: { papel, faixa, delta: penalidade.delta, antecedenciaMin: antecedencia },
    });

    const outraParte = papel === 'CLIENTE' ? ag.prestador_id : ag.cliente_id;
    notificar(outraParte, {
      tipo: 'AGENDAMENTO_CANCELADO',
      titulo: `Agendamento cancelado pelo ${papel === 'CLIENTE' ? 'cliente' : 'prestador'}`,
      agendamentoId: ag.id,
      mensagem: `${ag.servico_nome} de ${formatarDataHora(ag.inicio)} foi cancelado. `
        + `Faixa aplicada: ${penalidade.rotulo}.`
        + (String(motivo ?? '').trim() ? ` Motivo: ${motivo}.` : ''),
    });

    return { agendamento: agendamentosRepo.porId(ag.id), penalidade, papel };
  });

  // RN-21 - fora da transacao principal para nao misturar responsabilidades.
  if (resultado.papel === 'PRESTADOR' && resultado.penalidade.ocorrenciaNegativa) {
    reputacao.verificarOcorrenciasDoPrestador(usuarioId);
  }

  return resultado;
}

// =====================================================================
// UC-11 - no-show
// =====================================================================

/** RF-052 a RF-055 */
export function registrarNoShow({ usuarioId, agendamentoId, relato = '' }) {
  const p = params();
  const agora = agoraIso();

  const resultado = transacao(() => {
    const ag = carregarComoParte(agendamentoId, usuarioId);
    const papel = papelDe(ag, usuarioId);

    // RF-055 - acusacao mutua: quem ja foi acusado responde acusando de volta.
    const jaAcusado = ag.estado === `NO_SHOW_${papel}`;
    if (!jaAcusado && ag.estado !== 'CONFIRMADO') {
      throw new ErroDeRegra('RN-20', `Não é possível registrar ausência neste estado (${ag.estado}).`);
    }

    assegurarJanelaNoShow(ag.inicio, ag.duracao_min, agora, p);

    if (jaAcusado) return acusacaoMutua(ag, usuarioId, papel, relato, agora, p);

    const alvoId = papel === 'CLIENTE' ? ag.prestador_id : ag.cliente_id;
    const novoEstado = papel === 'CLIENTE' ? 'NO_SHOW_PRESTADOR' : 'NO_SHOW_CLIENTE';

    assegurarTransicao('agendamento', ag.estado, novoEstado);
    agendamentosRepo.atualizar(ag.id, {
      estado: novoEstado,
      encerrado_em: agora,
      motivo_encerramento: String(relato ?? '').trim() || 'Ausência registrada pela contraparte.',
    });

    const horario = horariosRepo.porId(ag.horario_id);
    if (horario.estado === 'OCUPADO') {
      assegurarTransicao('horario', horario.estado, 'ENCERRADO');
      horariosRepo.atualizarEstado(horario.id, 'ENCERRADO');
    }

    reputacao.aplicarEvento({
      usuarioId: alvoId,
      tipo: TIPO_EVENTO.NO_SHOW,
      delta: DELTA_NO_SHOW,
      origemTipo: 'agendamento',
      origemId: ag.id,
    });

    auditoria.registrar({
      atorId: usuarioId, acao: 'NO_SHOW_REGISTRADO', entidade: 'agendamento',
      entidadeId: ag.id, de: ag.estado, para: novoEstado,
      detalhe: { acusador: papel, alvoId, delta: DELTA_NO_SHOW, regra: 'RN-20' },
    });

    const prazo = prazoDisputa(ag.inicio, ag.duracao_min, p);
    notificar(alvoId, {
      tipo: 'NO_SHOW_REGISTRADO',
      titulo: 'Registraram sua ausência em um atendimento',
      agendamentoId: ag.id,
      mensagem: `Foi registrada sua ausência no atendimento de ${formatarDataHora(ag.inicio)}. `
        + `Sua reputação caiu ${Math.abs(DELTA_NO_SHOW)} pontos. `
        + `Se você discorda, abra uma disputa até ${formatarDataHora(prazo)}.`,
    });

    return { agendamento: agendamentosRepo.porId(ag.id), alvoId, papel, mutua: false };
  });

  if (resultado.papel === 'CLIENTE' && !resultado.mutua) {
    // O ausente foi o prestador: conta como ocorrencia negativa dele (RN-21).
    reputacao.verificarOcorrenciasDoPrestador(resultado.alvoId);
  }

  return resultado;
}

/**
 * RF-055 - os dois se acusam: ninguem e penalizado automaticamente e o caso vai
 * para o admin com os dois relatos como evidencia.
 */
function acusacaoMutua(ag, usuarioId, papel, relato, agora, p) {
  reputacao.reverterEventosDoAgendamento(ag.id);

  assegurarTransicao('agendamento', ag.estado, 'EM_DISPUTA');
  agendamentosRepo.atualizar(ag.id, {
    estado: 'EM_DISPUTA',
    estado_antes_disputa: ag.estado,
    motivo_encerramento: 'Acusação mútua de ausência.',
  });

  const disputaId = moderacaoRepo.criarDisputa({
    agendamento_id: ag.id,
    aberta_por_id: usuarioId,
    motivo: 'AUSENCIA_CONTESTADA',
    relato: 'Ambas as partes registraram ausência da outra (RF-055).',
    estado: 'ABERTA',
    aberta_em: agora,
    prazo_sla_em: prazoSlaDisputa(agora, p),
  });

  moderacaoRepo.criarEvidencia({
    disputa_id: disputaId,
    autor_id: usuarioId,
    tipo: 'TEXTO',
    descricao: String(relato ?? '').trim() || 'Contesto a ausência registrada contra mim e afirmo que a outra parte não compareceu.',
    criada_em: agora,
  });

  auditoria.registrar({
    atorId: usuarioId, acao: 'NO_SHOW_MUTUO', entidade: 'agendamento', entidadeId: ag.id,
    de: ag.estado, para: 'EM_DISPUTA',
    detalhe: { disputaId, regra: 'RF-055' },
  });

  const outra = papel === 'CLIENTE' ? ag.prestador_id : ag.cliente_id;
  for (const destino of [usuarioId, outra]) {
    notificar(destino, {
      tipo: 'DISPUTA_ABERTA',
      titulo: 'Caso enviado para análise do administrador',
      agendamentoId: ag.id,
      mensagem: 'As duas partes registraram ausência da outra. As penalidades foram suspensas '
        + 'e um administrador vai decidir o caso.',
    });
  }

  return { agendamento: agendamentosRepo.porId(ag.id), disputaId, papel, mutua: true };
}

// =====================================================================
// UC-09 - conclusao e comissao
// =====================================================================

/** RF-058 / RF-059 */
export function concluir({ prestadorId, agendamentoId, estadoCobranca = 'PAGO_PRESENCIAL', observacao = '' }) {
  if (!['PAGO_PRESENCIAL', 'NAO_PAGO'].includes(estadoCobranca)) {
    throw new ErroDeValidacao('Informe se o atendimento foi pago.', 'estadoCobranca');
  }

  const agora = agoraIso();

  return transacao(() => {
    const ag = carregarDoPrestador(agendamentoId, prestadorId);
    if (ag.estado !== 'CONFIRMADO') {
      throw new ErroDeRegra('RN-16', `Só agendamentos confirmados podem ser concluídos (${ag.estado}).`);
    }

    assegurarAtendimentoTerminou(ag.inicio, ag.duracao_min, agora);
    return aplicarConclusao(ag, agora, prestadorId, String(observacao ?? '').trim(), estadoCobranca);
  });
}

/** RF-060 - conclusao automatica, sem ator humano. */
export function concluirAutomaticamente(ag) {
  const agora = agoraIso();

  return transacao(() => {
    const atual = agendamentosRepo.porId(ag.id);
    if (!atual || atual.estado !== 'CONFIRMADO') return null;
    return aplicarConclusao(atual, agora, null, 'Concluído automaticamente pelo sistema.', 'PENDENTE');
  });
}

function aplicarConclusao(ag, agora, atorId, observacao, estadoCobranca) {
  assegurarTransicao('agendamento', ag.estado, 'CONCLUIDO');
  agendamentosRepo.atualizar(ag.id, {
    estado: 'CONCLUIDO',
    encerrado_em: agora,
    estado_cobranca: estadoCobranca,
    observacao: observacao || ag.observacao,
  });

  const horario = horariosRepo.porId(ag.horario_id);
  if (horario.estado === 'OCUPADO') {
    assegurarTransicao('horario', horario.estado, 'ENCERRADO');
    horariosRepo.atualizarEstado(horario.id, 'ENCERRADO');
  }

  const lancamento = apurarComissao(ag, agora);

  // +1 para os dois lados: atendimento concluido sem incidente (RN-23).
  for (const id of [ag.cliente_id, ag.prestador_id]) {
    reputacao.aplicarEvento({
      usuarioId: id,
      tipo: TIPO_EVENTO.CONCLUSAO,
      delta: DELTA_CONCLUSAO,
      origemTipo: 'agendamento',
      origemId: ag.id,
    });
  }

  auditoria.registrar({
    atorId, acao: atorId ? 'AGENDAMENTO_CONCLUIDO' : 'AGENDAMENTO_CONCLUIDO_AUTOMATICAMENTE',
    entidade: 'agendamento', entidadeId: ag.id, de: ag.estado, para: 'CONCLUIDO',
    detalhe: { comissao: lancamento.valor_comissao, liquido: lancamento.valor_liquido },
  });

  const p = params();
  const ate = formatarDataHora(prazoAvaliacao(agora, p));
  notificar(ag.cliente_id, {
    tipo: 'AGENDAMENTO_CONCLUIDO',
    titulo: 'Atendimento concluído - avalie',
    agendamentoId: ag.id,
    mensagem: `Como foi o atendimento de ${formatarDataHora(ag.inicio)}? Você pode avaliar até ${ate}.`,
  });
  notificar(ag.prestador_id, {
    tipo: 'AGENDAMENTO_CONCLUIDO',
    titulo: 'Atendimento concluído',
    agendamentoId: ag.id,
    mensagem: `Valor ${formatarBRL(lancamento.valor_bruto)}, comissão `
      + `${formatarBRL(lancamento.valor_comissao)} (${lancamento.percentual_aplicado}%), `
      + `líquido ${formatarBRL(lancamento.valor_liquido)}. Avalie o cliente até ${ate}.`,
  });

  return agendamentosRepo.porId(ag.id);
}

/** RN-14 a RN-16 - lancamento de comissao sobre o valor final travado. */
function apurarComissao(ag, agora) {
  const existente = financeiroRepo.porAgendamento(ag.id);
  if (existente) return existente;

  const calculo = calcularComissao(ag.valor_travado, ag.percentual_comissao);

  financeiroRepo.criarLancamento({
    agendamento_id: ag.id,
    valor_bruto: calculo.valorBruto,
    percentual_aplicado: calculo.percentualAplicado,
    valor_comissao: calculo.valorComissao,
    valor_liquido: calculo.valorLiquido,
    estado: 'EFETIVADO',
    competencia: competenciaDe(agora),
    criado_em: agora,
  });

  auditoria.registrar({
    atorId: null, acao: 'COMISSAO_APURADA', entidade: 'agendamento', entidadeId: ag.id,
    detalhe: calculo,
  });

  return financeiroRepo.porAgendamento(ag.id);
}

// =====================================================================
// consultas
// =====================================================================

export function doCliente(clienteId, filtros) {
  return agendamentosRepo.doCliente(clienteId, filtros).map(enriquecer);
}

export function doPrestador(prestadorId, filtros) {
  return agendamentosRepo.doPrestador(prestadorId, filtros).map(enriquecer);
}

export function detalhe({ agendamentoId, usuarioId, ehAdmin = false }) {
  const ag = ehAdmin
    ? agendamentosRepo.porId(agendamentoId)
    : carregarComoParte(agendamentoId, usuarioId);
  if (!ag) throw new NaoEncontrado('Agendamento não encontrado.');
  return enriquecer(ag);
}

/** Deriva, para a interface, tudo que depende de tempo e de regra. */
function enriquecer(ag) {
  const p = params();
  const agora = agoraIso();
  const antecedencia = minutosEntre(agora, ag.inicio);

  return {
    ...ag,
    fim: fimDoHorario(ag.inicio, ag.duracao_min),
    antecedenciaMin: antecedencia,
    faixaCancelamento: faixaDeCancelamento(antecedencia, p),
    podeCancelar: ['PENDENTE_CONFIRMACAO', 'CONFIRMADO'].includes(ag.estado)
      && faixaDeCancelamento(antecedencia, p) !== FAIXA.APOS_INICIO,
    podeConcluir: ag.estado === 'CONFIRMADO'
      && !antesDe(agora, fimDoHorario(ag.inicio, ag.duracao_min)),
    podeReportarNoShow: podeReportar(ag, agora, p),
    prazoDisputa: prazoDisputa(ag.inicio, ag.duracao_min, p),
    podeAbrirDisputa: ['CONCLUIDO', 'NO_SHOW_CLIENTE', 'NO_SHOW_PRESTADOR'].includes(ag.estado)
      && antesDe(agora, prazoDisputa(ag.inicio, ag.duracao_min, p)),
    prazoAvaliacao: ag.encerrado_em ? prazoAvaliacao(ag.encerrado_em, p) : null,
  };
}

function podeReportar(ag, agora, p) {
  if (!['CONFIRMADO', 'NO_SHOW_CLIENTE', 'NO_SHOW_PRESTADOR'].includes(ag.estado)) return false;
  try {
    assegurarJanelaNoShow(ag.inicio, ag.duracao_min, agora, p);
    return true;
  } catch {
    return false;
  }
}

// =====================================================================
// autorizacao
// =====================================================================

function carregarComoParte(agendamentoId, usuarioId) {
  const ag = agendamentosRepo.porId(agendamentoId);
  if (!ag) throw new NaoEncontrado('Agendamento não encontrado.');
  if (ag.cliente_id !== usuarioId && ag.prestador_id !== usuarioId) {
    throw new ErroDeAutorizacao('Este agendamento não é seu.');
  }
  return ag;
}

function carregarDoPrestador(agendamentoId, prestadorId) {
  const ag = agendamentosRepo.porId(agendamentoId);
  if (!ag) throw new NaoEncontrado('Agendamento não encontrado.');
  if (ag.prestador_id !== prestadorId) throw new ErroDeAutorizacao('Este agendamento não é seu.');
  return ag;
}

function papelDe(ag, usuarioId) {
  if (ag.cliente_id === usuarioId) return 'CLIENTE';
  if (ag.prestador_id === usuarioId) return 'PRESTADOR';
  throw new ErroDeAutorizacao();
}

export { carregarComoParte, papelDe };
