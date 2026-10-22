/**
 * Maquina do LancamentoComissao (spec §9.7.1). Toda transicao passa por aqui:
 * assegura a maquina, grava e audita na mesma transacao (RF-084).
 *
 * O ator e obrigatorio e explicito: ator nulo identifica o sistema (§9.2,
 * OPEN-104), entao a retencao causada por quem abriu a disputa ou o estorno
 * decidido pelo admin nao podem aparecer como acao do sistema.
 */

import * as financeiroRepo from '../infra/repositorios/financeiro.js';
import * as auditoria from '../infra/auditoria.js';
import { transacao } from '../infra/db/conexao.js';
import { assegurarTransicao } from '../dominio/estados.js';
import { NaoEncontrado } from '../dominio/erros.js';

export function transicionar({ agendamentoId, para, atorId }) {
  if (atorId === undefined) {
    throw new Error('transicionar exige atorId explícito (null identifica o sistema).');
  }

  return transacao(() => {
    const lancamento = financeiroRepo.porAgendamento(agendamentoId);
    if (!lancamento) throw new NaoEncontrado('Lançamento de comissão não encontrado.');
    if (lancamento.estado === para) return lancamento;

    assegurarTransicao('comissao', lancamento.estado, para);
    financeiroRepo.atualizarEstado(agendamentoId, para);
    auditoria.registrar({
      atorId,
      acao: 'COMISSAO_ESTADO_ALTERADO',
      entidade: 'comissao',
      entidadeId: lancamento.id,
      de: lancamento.estado,
      para,
      detalhe: { agendamentoId },
    });
    return financeiroRepo.porAgendamento(agendamentoId);
  });
}
