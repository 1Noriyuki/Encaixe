/**
 * Servico de reputacao - RN-21, RN-22, RN-23.
 *
 * Toda alteracao de reputacao do sistema passa por aqui. Nenhum outro servico
 * escreve em `usuario.reputacao` diretamente: registra-se o EVENTO e a
 * reputacao e recalculada a partir do livro-razao (INV-08).
 */

import * as social from '../infra/repositorios/social.js';
import * as usuarios from '../infra/repositorios/usuarios.js';
import * as agendamentosRepo from '../infra/repositorios/agendamentos.js';
import * as auditoria from '../infra/auditoria.js';
import { notificar } from '../infra/notificacoes.js';
import {
  calcularReputacao, classificarPorReputacao, TIPOS_OCORRENCIA_NEGATIVA,
} from '../dominio/reputacao.js';
import { podeTransicionar } from '../dominio/estados.js';
import { agoraIso, adicionarDias } from '../dominio/tempo.js';
import { params } from './parametros.js';

/**
 * Registra um evento de reputacao e recalcula a pontuacao do usuario.
 * Delta zero ainda e registrado: manter o rastro de "cancelou dentro da janela
 * livre" e util para o admin em UC-13.
 */
export function aplicarEvento({ usuarioId, tipo, delta, origemTipo, origemId }) {
  social.registrarEvento({
    usuario_id: usuarioId,
    tipo,
    delta,
    origem_tipo: origemTipo,
    origem_id: origemId,
    criado_em: agoraIso(),
  });

  return recalcular(usuarioId);
}

/** Recalcula a reputacao a partir dos eventos e reclassifica a conta (RN-22). */
export function recalcular(usuarioId) {
  const p = params();
  const usuario = usuarios.porId(usuarioId);
  if (!usuario) return null;

  const eventos = social.eventosDoUsuario(usuarioId);
  const nova = calcularReputacao(eventos, {
    inicial: p.reputacao_inicial,
    janelaDias: p.janela_reputacao_dias,
    agora: agoraIso(),
  });

  if (nova !== usuario.reputacao) {
    usuarios.atualizarReputacao(usuarioId, nova);
    auditoria.registrar({
      atorId: null,
      acao: 'REPUTACAO_RECALCULADA',
      entidade: 'conta',
      entidadeId: usuarioId,
      de: String(usuario.reputacao),
      para: String(nova),
    });
  }

  reclassificarConta({ ...usuario, reputacao: nova }, p);
  return nova;
}

/**
 * RN-22 - a reputacao empurra a conta entre ATIVO, RESTRITO e EM_REVISAO.
 * Sair de EM_REVISAO ou de SUSPENSO exige decisao do admin (RF-079): a
 * reputacao sozinha nunca reabilita uma conta bloqueada.
 */
function reclassificarConta(usuario, p) {
  const alvo = classificarPorReputacao(usuario.reputacao, p, usuario.perfil);
  const atual = usuario.estado_conta;

  if (atual === alvo) return;
  if (['SUSPENSO', 'EM_REVISAO', 'PENDENTE_APROVACAO', 'REPROVADO'].includes(atual)) return;
  if (!podeTransicionar('conta', atual, alvo)) return;

  usuarios.atualizarEstadoConta(usuario.id, alvo);
  auditoria.registrar({
    atorId: null,
    acao: 'CONTA_RECLASSIFICADA_POR_REPUTACAO',
    entidade: 'conta',
    entidadeId: usuario.id,
    de: atual,
    para: alvo,
    detalhe: { reputacao: usuario.reputacao, regra: 'RN-22' },
  });

  if (alvo === 'EM_REVISAO') {
    notificar(usuario.id, {
      tipo: 'CONTA_EM_REVISAO',
      titulo: 'Sua conta entrou em revisão',
      mensagem: `Sua reputação está em ${usuario.reputacao} pontos, abaixo do limite de `
        + `${p.limiar_revisao}. Um administrador vai analisar sua conta.`,
    });
  } else if (alvo === 'RESTRITO') {
    notificar(usuario.id, {
      tipo: 'CONTA_RESTRITA',
      titulo: 'Sua conta ficou restrita',
      mensagem: `Com ${usuario.reputacao} pontos você pode manter apenas `
        + `${p.limite_reservas_restrito} reserva em aberto por vez.`,
    });
  }
}

/**
 * RN-21 - prestador com ocorrencias negativas demais na janela entra em revisao
 * e perde o direito de publicar novos horarios.
 */
export function verificarOcorrenciasDoPrestador(prestadorId) {
  const p = params();
  const desde = adicionarDias(agoraIso(), -p.janela_ocorrencias_dias);
  const total = agendamentosRepo.contarOcorrenciasNegativas(
    prestadorId, desde, TIPOS_OCORRENCIA_NEGATIVA,
  );

  if (total < p.ocorrencias_consecutivas_max) return { total, emRevisao: false };

  const prestador = usuarios.porId(prestadorId);
  if (!prestador || !podeTransicionar('conta', prestador.estado_conta, 'EM_REVISAO')) {
    return { total, emRevisao: prestador?.estado_conta === 'EM_REVISAO' };
  }

  usuarios.atualizarEstadoConta(prestadorId, 'EM_REVISAO');
  auditoria.registrar({
    atorId: null,
    acao: 'PRESTADOR_EM_REVISAO_POR_OCORRENCIAS',
    entidade: 'conta',
    entidadeId: prestadorId,
    de: prestador.estado_conta,
    para: 'EM_REVISAO',
    detalhe: { ocorrencias: total, janelaDias: p.janela_ocorrencias_dias, regra: 'RN-21' },
  });

  notificar(prestadorId, {
    tipo: 'CONTA_EM_REVISAO',
    titulo: 'Publicação de horários suspensa',
    mensagem: `Você acumulou ${total} ocorrências negativas em `
      + `${p.janela_ocorrencias_dias} dias. Até a análise do administrador você não pode `
      + 'publicar novos horários. Os agendamentos já confirmados seguem valendo.',
  });

  return { total, emRevisao: true };
}

/** RN-27 - a resolucao de disputa reverte os eventos daquele agendamento. */
export function reverterEventosDoAgendamento(agendamentoId, usuarioId = null) {
  const afetados = social.eventosDaOrigem('agendamento', agendamentoId)
    .filter((e) => !e.revertido_em)
    .filter((e) => !usuarioId || e.usuario_id === usuarioId)
    .map((e) => e.usuario_id);

  social.reverterEventosDaOrigem('agendamento', agendamentoId, agoraIso(), usuarioId);

  for (const id of new Set(afetados)) recalcular(id);
  return [...new Set(afetados)];
}
