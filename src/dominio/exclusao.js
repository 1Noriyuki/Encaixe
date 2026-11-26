/**
 * Exclusao de conta - SPEC-030 fase 2, RF-097 e RF-098.
 *
 * A regra so decide se a conta pode sair e o que a substitui. Quem conta os
 * agendamentos, as disputas e as comissoes e a aplicacao: aqui nao ha banco,
 * e por isso a lista de impedimentos e testavel com numeros soltos.
 */

import { podeTransicionar } from './estados.js';

/**
 * RF-098 - devolve todos os impedimentos de uma vez, nao so o primeiro: quem
 * quer sair precisa saber tudo o que falta resolver antes de tentar de novo.
 *
 * @param {object} conta        `perfil` e `estado_conta` da conta
 * @param {object} pendencias   contagens montadas pela aplicacao
 * @returns {string[]} frases para o titular; vazia quando a exclusao pode seguir
 */
export function impedimentosDeExclusao(conta, {
  agendamentosAtivos = 0,
  disputasAbertas = 0,
  comissoesDaCompetencia = 0,
} = {}) {
  const motivos = [];

  if (conta.perfil === 'ADMIN') {
    motivos.push('Conta de administrador só é criada e removida pela implantação.');
  }
  if (conta.estado_conta === 'EM_REVISAO') {
    motivos.push('A conta está em revisão: a decisão da administração vem antes da exclusão.');
  } else if (conta.perfil !== 'ADMIN' && !podeTransicionar('conta', conta.estado_conta, 'EXCLUIDO')) {
    motivos.push(`Uma conta no estado atual (${conta.estado_conta}) não pode ser excluída.`);
  }
  if (agendamentosAtivos > 0) {
    motivos.push(agendamentosAtivos === 1
      ? 'Há 1 agendamento em aberto ou em disputa. Conclua ou cancele antes.'
      : `Há ${agendamentosAtivos} agendamentos em aberto ou em disputa. Conclua ou cancele antes.`);
  }
  if (disputasAbertas > 0) {
    motivos.push(disputasAbertas === 1
      ? 'Há 1 disputa sua aguardando decisão da administração.'
      : `Há ${disputasAbertas} disputas suas aguardando decisão da administração.`);
  }
  if (comissoesDaCompetencia > 0) {
    motivos.push('Há comissão deste mês ainda em apuração. A exclusão fica liberada a partir do mês que vem.');
  }
  return motivos;
}

/**
 * RF-097 - o que entra no lugar dos dados pessoais. O e-mail usa o dominio
 * reservado `.invalid` (RFC 2606) e o id, para continuar unico sem apontar para
 * ninguem. A senha vira um valor que nenhum hash produz, entao nenhuma senha
 * confere.
 */
export function dadosAnonimos(usuarioId) {
  return {
    nome: 'Conta excluída',
    email: `excluida-${usuarioId}@encaixe.invalid`,
    senha_hash: 'excluida',
    nome_exibicao: 'Prestador que saiu do Encaixe',
  };
}
