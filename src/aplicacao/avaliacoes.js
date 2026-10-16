/**
 * UC-10 - avaliacao bilateral.
 * Cobre RF-065 a RF-068. Regras: RN-24 (janela e unicidade) e RN-25 (revelacao cega).
 */

import * as social from '../infra/repositorios/social.js';
import * as agendamentosRepo from '../infra/repositorios/agendamentos.js';
import * as auditoria from '../infra/auditoria.js';
import { notificar } from '../infra/notificacoes.js';
import { transacao } from '../infra/db/conexao.js';
import { ErroDeRegra, ErroDeValidacao } from '../dominio/erros.js';
import { assegurarJanelaAvaliacao, dentroDaJanelaAvaliacao } from '../dominio/prazos.js';
import { deltaPorAvaliacao, TIPO_EVENTO } from '../dominio/reputacao.js';
import { agoraIso } from '../dominio/tempo.js';
import { params } from './parametros.js';
import { carregarComoParte, papelDe } from './agendamentos.js';
import * as reputacao from './reputacao.js';

/** RF-065 a RF-067 */
export function avaliar({ usuarioId, agendamentoId, nota, comentario = '' }) {
  const p = params();
  const agora = agoraIso();

  const valor = Number(nota);
  if (!Number.isInteger(valor) || valor < 1 || valor > 5) {
    throw new ErroDeValidacao('A nota precisa ser um número de 1 a 5.', 'nota');
  }

  return transacao(() => {
    const ag = carregarComoParte(agendamentoId, usuarioId);

    // RN-24 - so agendamento concluido libera avaliacao.
    if (ag.estado !== 'CONCLUIDO') {
      throw new ErroDeRegra(
        'RN-24',
        `Só é possível avaliar um atendimento concluído (estado atual: ${ag.estado}).`,
      );
    }
    assegurarJanelaAvaliacao(ag.encerrado_em, agora, p);

    if (social.avaliacaoDoAutor(agendamentoId, usuarioId)) {
      throw new ErroDeRegra('RN-24', 'Você já avaliou este atendimento.');
    }

    const papel = papelDe(ag, usuarioId);
    const alvoId = papel === 'CLIENTE' ? ag.prestador_id : ag.cliente_id;

    social.criarAvaliacao({
      agendamento_id: agendamentoId,
      autor_id: usuarioId,
      alvo_id: alvoId,
      nota: valor,
      comentario: String(comentario ?? '').trim(),
      criada_em: agora,
    });

    reputacao.aplicarEvento({
      usuarioId: alvoId,
      tipo: TIPO_EVENTO.AVALIACAO,
      delta: deltaPorAvaliacao(valor),
      origemTipo: 'agendamento',
      origemId: agendamentoId,
    });

    auditoria.registrar({
      atorId: usuarioId, acao: 'AVALIACAO_REGISTRADA', entidade: 'agendamento',
      entidadeId: agendamentoId, detalhe: { nota: valor, alvoId, papel },
    });

    // RN-25 - revela quando os dois lados avaliarem.
    const total = social.contarAvaliacoes(agendamentoId);
    if (total >= 2) {
      revelar(agendamentoId, ag);
    } else {
      notificar(alvoId, {
        tipo: 'AVALIACAO_PENDENTE',
        titulo: 'Você recebeu uma avaliação',
        agendamentoId,
        mensagem: 'A nota fica visível quando você também avaliar, ou quando a janela de avaliação encerrar.',
      });
    }

    return social.avaliacoesDoAgendamento(agendamentoId);
  });
}

/** RN-25 - torna as notas do agendamento visiveis para ambos. */
export function revelar(agendamentoId, agendamento = null) {
  social.revelarAvaliacoes(agendamentoId);

  const ag = agendamento ?? agendamentosRepo.porId(agendamentoId);
  auditoria.registrar({
    atorId: null, acao: 'AVALIACOES_REVELADAS', entidade: 'agendamento', entidadeId: agendamentoId,
  });

  if (ag) {
    for (const destino of [ag.cliente_id, ag.prestador_id]) {
      notificar(destino, {
        tipo: 'AVALIACAO_REVELADA',
        titulo: 'As avaliações ficaram visíveis',
        agendamentoId,
        mensagem: 'As duas partes avaliaram (ou a janela encerrou). Veja as notas no detalhe do agendamento.',
      });
    }
  }
}

/**
 * O que a interface precisa saber sobre a avaliacao de um agendamento:
 * se este usuario pode avaliar, se ja avaliou e o que ele pode ver (RN-25).
 */
export function situacao({ agendamentoId, usuarioId }) {
  const p = params();
  const agora = agoraIso();
  const ag = agendamentosRepo.porId(agendamentoId);
  if (!ag) return null;

  const todas = social.avaliacoesDoAgendamento(agendamentoId);
  const minha = todas.find((a) => a.autor_id === usuarioId) ?? null;
  const naJanela = ag.encerrado_em ? dentroDaJanelaAvaliacao(ag.encerrado_em, agora, p) : false;

  return {
    podeAvaliar: ag.estado === 'CONCLUIDO' && naJanela && !minha,
    minha,
    // Avaliacao do outro so aparece quando visivel (RN-25).
    visiveis: todas.filter((a) => a.visivel === 1),
    aguardandoContraparte: todas.length === 1 && !!minha,
    naJanela,
  };
}
