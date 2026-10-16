/**
 * UC-12 - abertura e resolucao de disputas.
 * Cobre RF-071 a RF-077. Regras: RN-17, RN-26, RN-27.
 *
 * Semantica dos desfechos (RN-27), fixada aqui para nao ficar a criterio de
 * cada tela:
 *   MANTIDO   - confirma o desfecho original, reaplica a penalidade e penaliza
 *               quem abriu a disputa sem razao (-8, RN-23).
 *   REVERTIDO - inverte o desfecho: quem acusava passa a ser o penalizado.
 *   PARCIAL   - mantem o desfecho, mas nenhuma penalidade de reputacao persiste.
 *   ARQUIVADO - sem elementos: agendamento arquivado, comissao estornada,
 *               ninguem penalizado.
 */

import * as moderacaoRepo from '../infra/repositorios/moderacao.js';
import * as agendamentosRepo from '../infra/repositorios/agendamentos.js';
import * as financeiroRepo from '../infra/repositorios/financeiro.js';
import * as auditoria from '../infra/auditoria.js';
import { notificar } from '../infra/notificacoes.js';
import { transacao } from '../infra/db/conexao.js';
import {
  ErroDeRegra, ErroDeValidacao, ErroDeAutorizacao, NaoEncontrado,
} from '../dominio/erros.js';
import { assegurarTransicao } from '../dominio/estados.js';
import { assegurarPrazoDisputa, prazoSlaDisputa } from '../dominio/prazos.js';
import {
  TIPO_EVENTO, DELTA_NO_SHOW, DELTA_CONCLUSAO, DELTA_DISPUTA_CONTRA,
} from '../dominio/reputacao.js';
import { agoraIso, formatarDataHora } from '../dominio/tempo.js';
import { params } from './parametros.js';
import { carregarComoParte, papelDe } from './agendamentos.js';
import * as reputacao from './reputacao.js';

export const MOTIVOS = {
  SERVICO_NAO_REALIZADO: 'O serviço não foi realizado',
  SERVICO_DIFERENTE: 'O serviço foi diferente do anunciado',
  AUSENCIA_CONTESTADA: 'Contesto a ausência registrada contra mim',
  COBRANCA_DIVERGENTE: 'O valor cobrado divergiu do combinado',
  OUTRO: 'Outro motivo',
};

export const DESFECHOS = {
  MANTIDO: 'Manter o desfecho original',
  REVERTIDO: 'Reverter: a outra parte é que estava certa',
  PARCIAL: 'Manter o desfecho, mas remover a penalidade de reputação',
  ARQUIVADO: 'Arquivar: sem elementos para decidir',
};

const ESTADOS_CONTESTAVEIS = ['CONCLUIDO', 'NO_SHOW_CLIENTE', 'NO_SHOW_PRESTADOR'];

// =====================================================================
// abertura
// =====================================================================

/** RF-071 a RF-073 */
export function abrir({ usuarioId, agendamentoId, motivo, relato, evidencia }) {
  const p = params();
  const agora = agoraIso();

  if (!(motivo in MOTIVOS)) {
    throw new ErroDeValidacao('Escolha um motivo da lista.', 'motivo');
  }
  const textoEvidencia = String(evidencia ?? '').trim();
  if (textoEvidencia.length < 10) {
    // RF-072 - abertura sem evidencia e recusada.
    throw new ErroDeRegra(
      'RN-26',
      'Descreva ao menos uma evidência (mínimo 10 caracteres): o que aconteceu, print, link ou testemunha.',
    );
  }

  return transacao(() => {
    const ag = carregarComoParte(agendamentoId, usuarioId);

    if (!ESTADOS_CONTESTAVEIS.includes(ag.estado)) {
      throw new ErroDeRegra(
        'RN-26',
        `Não há o que contestar em um agendamento no estado ${ag.estado}.`,
      );
    }
    if (moderacaoRepo.disputaPorAgendamento(agendamentoId)) {
      throw new ErroDeRegra('RN-26', 'Este agendamento já tem uma disputa aberta.');
    }
    assegurarPrazoDisputa(ag.inicio, ag.duracao_min, agora, p);

    const disputaId = moderacaoRepo.criarDisputa({
      agendamento_id: agendamentoId,
      aberta_por_id: usuarioId,
      motivo,
      relato: String(relato ?? '').trim(),
      estado: 'ABERTA',
      aberta_em: agora,
      prazo_sla_em: prazoSlaDisputa(agora, p),
    });

    moderacaoRepo.criarEvidencia({
      disputa_id: disputaId,
      autor_id: usuarioId,
      tipo: /^https?:\/\//i.test(textoEvidencia) ? 'URL' : 'TEXTO',
      descricao: textoEvidencia,
      criada_em: agora,
    });

    // RN-26 - o agendamento congela em EM_DISPUTA...
    assegurarTransicao('agendamento', ag.estado, 'EM_DISPUTA');
    agendamentosRepo.atualizar(agendamentoId, {
      estado: 'EM_DISPUTA',
      estado_antes_disputa: ag.estado,
    });

    // ...a comissao e retida (RN-17, INV-12)...
    if (financeiroRepo.porAgendamento(agendamentoId)) {
      financeiroRepo.atualizarEstado(agendamentoId, 'RETIDO');
    }

    // ...e as penalidades ficam suspensas ate a decisao.
    reputacao.reverterEventosDoAgendamento(agendamentoId);

    auditoria.registrar({
      atorId: usuarioId, acao: 'DISPUTA_ABERTA', entidade: 'disputa', entidadeId: disputaId,
      para: 'ABERTA',
      detalhe: { agendamentoId, motivo, estadoAnterior: ag.estado },
    });

    const outra = papelDe(ag, usuarioId) === 'CLIENTE' ? ag.prestador_id : ag.cliente_id;
    notificar(outra, {
      tipo: 'DISPUTA_ABERTA',
      titulo: 'Abriram uma disputa sobre um atendimento seu',
      agendamentoId,
      mensagem: `Motivo: ${MOTIVOS[motivo]}. Você pode anexar sua versão e evidências. `
        + 'Um administrador vai decidir o caso.',
    });

    return moderacaoRepo.disputaPorId(disputaId);
  });
}

/** RF-071 - a contraparte tambem anexa evidencias. */
export function adicionarEvidencia({ usuarioId, disputaId, evidencia }) {
  const texto = String(evidencia ?? '').trim();
  if (texto.length < 10) {
    throw new ErroDeValidacao('Descreva a evidência (mínimo 10 caracteres).', 'evidencia');
  }

  const disputa = moderacaoRepo.disputaPorId(disputaId);
  if (!disputa) throw new NaoEncontrado('Disputa não encontrada.');
  if (![disputa.cliente_id, disputa.prestador_id].includes(usuarioId)) {
    throw new ErroDeAutorizacao();
  }
  if (disputa.estado === 'RESOLVIDA') {
    throw new ErroDeRegra('RN-27', 'Esta disputa já foi resolvida.');
  }

  moderacaoRepo.criarEvidencia({
    disputa_id: disputaId,
    autor_id: usuarioId,
    tipo: /^https?:\/\//i.test(texto) ? 'URL' : 'TEXTO',
    descricao: texto,
    criada_em: agoraIso(),
  });

  auditoria.registrar({
    atorId: usuarioId, acao: 'EVIDENCIA_ANEXADA', entidade: 'disputa', entidadeId: disputaId,
  });

  return moderacaoRepo.evidenciasDaDisputa(disputaId);
}

// =====================================================================
// resolucao (admin)
// =====================================================================

/** O admin assume a disputa antes de decidir. */
export function assumir({ adminId, disputaId }) {
  const disputa = moderacaoRepo.disputaPorId(disputaId);
  if (!disputa) throw new NaoEncontrado('Disputa não encontrada.');
  if (disputa.estado !== 'ABERTA') return disputa;

  assegurarTransicao('disputa', disputa.estado, 'EM_ANALISE');
  moderacaoRepo.atualizarDisputa(disputaId, { estado: 'EM_ANALISE', admin_id: adminId });
  auditoria.registrar({
    atorId: adminId, acao: 'DISPUTA_ASSUMIDA', entidade: 'disputa', entidadeId: disputaId,
    de: 'ABERTA', para: 'EM_ANALISE',
  });

  return moderacaoRepo.disputaPorId(disputaId);
}

/** RF-076 / RF-077 */
export function resolver({ adminId, disputaId, desfecho, justificativa }) {
  const texto = String(justificativa ?? '').trim();
  if (!(desfecho in DESFECHOS)) {
    throw new ErroDeValidacao('Escolha um desfecho válido.', 'desfecho');
  }
  if (texto.length < 15) {
    throw new ErroDeValidacao(
      'Registre a justificativa da decisão (mínimo 15 caracteres) - ela vai para as duas partes.',
      'justificativa',
    );
  }

  const agora = agoraIso();

  return transacao(() => {
    const disputa = moderacaoRepo.disputaPorId(disputaId);
    if (!disputa) throw new NaoEncontrado('Disputa não encontrada.');
    if (disputa.estado === 'RESOLVIDA') {
      throw new ErroDeRegra('RN-27', 'Esta disputa já foi resolvida.');
    }

    const ag = agendamentosRepo.porId(disputa.agendamento_id);
    const anterior = disputa.estado_antes_disputa ?? 'CONCLUIDO';
    const quemAbriu = disputa.aberta_por_id;
    const outraParte = quemAbriu === ag.cliente_id ? ag.prestador_id : ag.cliente_id;

    const efeito = aplicarDesfecho({
      desfecho, ag, anterior, quemAbriu, outraParte, agora,
    });

    assegurarTransicao('disputa', disputa.estado, 'RESOLVIDA');
    moderacaoRepo.atualizarDisputa(disputaId, {
      estado: 'RESOLVIDA',
      desfecho,
      justificativa_admin: texto,
      admin_id: adminId,
      resolvida_em: agora,
    });

    auditoria.registrar({
      atorId: adminId, acao: 'DISPUTA_RESOLVIDA', entidade: 'disputa', entidadeId: disputaId,
      de: disputa.estado, para: 'RESOLVIDA',
      detalhe: { desfecho, estadoFinal: efeito.estadoFinal, comissao: efeito.comissao, justificativa: texto },
    });

    for (const destino of [ag.cliente_id, ag.prestador_id]) {
      notificar(destino, {
        tipo: 'DISPUTA_RESOLVIDA',
        titulo: `Disputa resolvida: ${DESFECHOS[desfecho]}`,
        agendamentoId: ag.id,
        mensagem: `Decisão do administrador sobre o atendimento de ${formatarDataHora(ag.inicio)}: ${texto}`,
      });
    }

    return moderacaoRepo.disputaPorId(disputaId);
  });
}

/** Traduz o desfecho em estado do agendamento, reputacao e comissao. */
function aplicarDesfecho({ desfecho, ag, anterior, quemAbriu, outraParte, agora }) {
  let estadoFinal;
  let comissao = 'inalterada';

  switch (desfecho) {
    case 'MANTIDO': {
      estadoFinal = anterior;
      transicionar(ag, estadoFinal);
      aplicarEfeitosDe(estadoFinal, ag);
      // Quem abriu a disputa e perdeu leva a penalidade adicional (RN-23).
      reputacao.aplicarEvento({
        usuarioId: quemAbriu,
        tipo: TIPO_EVENTO.DISPUTA_CONTRA,
        delta: DELTA_DISPUTA_CONTRA,
        origemTipo: 'agendamento',
        origemId: ag.id,
      });
      comissao = restaurarComissao(ag, estadoFinal);
      break;
    }

    case 'REVERTIDO': {
      estadoFinal = inverter(anterior);
      transicionar(ag, estadoFinal);
      aplicarEfeitosDe(estadoFinal, ag);
      reputacao.aplicarEvento({
        usuarioId: outraParte,
        tipo: TIPO_EVENTO.DISPUTA_CONTRA,
        delta: DELTA_DISPUTA_CONTRA,
        origemTipo: 'agendamento',
        origemId: ag.id,
      });
      comissao = restaurarComissao(ag, estadoFinal);
      break;
    }

    case 'PARCIAL': {
      estadoFinal = anterior;
      transicionar(ag, estadoFinal);
      // Efeitos de reputacao seguem revertidos: e exatamente o que "parcial" significa.
      comissao = restaurarComissao(ag, estadoFinal);
      break;
    }

    case 'ARQUIVADO':
    default: {
      estadoFinal = 'ARQUIVADO';
      transicionar(ag, estadoFinal);
      if (financeiroRepo.porAgendamento(ag.id)) {
        financeiroRepo.atualizarEstado(ag.id, 'ESTORNADO');
        comissao = 'ESTORNADO';
      }
      break;
    }
  }

  agendamentosRepo.atualizar(ag.id, { encerrado_em: agora });
  return { estadoFinal, comissao };
}

function transicionar(ag, estadoFinal) {
  if (ag.estado === estadoFinal) return;
  assegurarTransicao('agendamento', ag.estado, estadoFinal);
  agendamentosRepo.atualizar(ag.id, { estado: estadoFinal });
}

/** O oposto de cada desfecho contestavel. */
function inverter(estado) {
  switch (estado) {
    case 'NO_SHOW_CLIENTE': return 'NO_SHOW_PRESTADOR';
    case 'NO_SHOW_PRESTADOR': return 'NO_SHOW_CLIENTE';
    // Contestar um atendimento "concluido" e alegar que ele nao aconteceu.
    case 'CONCLUIDO': return 'NO_SHOW_PRESTADOR';
    default: return 'ARQUIVADO';
  }
}

/** Reaplica as consequencias de reputacao do estado decidido. */
function aplicarEfeitosDe(estado, ag) {
  if (estado === 'NO_SHOW_CLIENTE') {
    reputacao.aplicarEvento({
      usuarioId: ag.cliente_id, tipo: TIPO_EVENTO.NO_SHOW, delta: DELTA_NO_SHOW,
      origemTipo: 'agendamento', origemId: ag.id,
    });
  } else if (estado === 'NO_SHOW_PRESTADOR') {
    reputacao.aplicarEvento({
      usuarioId: ag.prestador_id, tipo: TIPO_EVENTO.NO_SHOW, delta: DELTA_NO_SHOW,
      origemTipo: 'agendamento', origemId: ag.id,
    });
    reputacao.verificarOcorrenciasDoPrestador(ag.prestador_id);
  } else if (estado === 'CONCLUIDO') {
    for (const id of [ag.cliente_id, ag.prestador_id]) {
      reputacao.aplicarEvento({
        usuarioId: id, tipo: TIPO_EVENTO.CONCLUSAO, delta: DELTA_CONCLUSAO,
        origemTipo: 'agendamento', origemId: ag.id,
      });
    }
  }
}

/** RN-16 / RN-17 - a comissao so volta a valer se o desfecho for CONCLUIDO. */
function restaurarComissao(ag, estadoFinal) {
  const lancamento = financeiroRepo.porAgendamento(ag.id);
  if (!lancamento) return 'inexistente';

  const novo = estadoFinal === 'CONCLUIDO' ? 'EFETIVADO' : 'ESTORNADO';
  financeiroRepo.atualizarEstado(ag.id, novo);
  return novo;
}

// =====================================================================
// consultas
// =====================================================================

/** RF-074 / RF-075 - fila do admin com SLA. */
export function fila({ apenasAbertas = true } = {}) {
  const agora = agoraIso();
  return moderacaoRepo.filaDeDisputas({ apenasAbertas }).map((d) => ({
    ...d,
    foraDoSla: d.prazo_sla_em < agora,
  }));
}

export function detalhe(disputaId) {
  const disputa = moderacaoRepo.disputaPorId(disputaId);
  if (!disputa) throw new NaoEncontrado('Disputa não encontrada.');
  return {
    ...disputa,
    foraDoSla: disputa.estado !== 'RESOLVIDA' && disputa.prazo_sla_em < agoraIso(),
    evidencias: moderacaoRepo.evidenciasDaDisputa(disputaId),
  };
}

export function doUsuario(usuarioId) {
  return moderacaoRepo.disputasDoUsuario(usuarioId);
}

export function porAgendamento(agendamentoId) {
  return moderacaoRepo.disputaPorAgendamento(agendamentoId);
}
