/**
 * Maquinas de estado - secao 9.4 a 9.7 da spec.
 *
 * Uma transicao que nao esta declarada aqui simplesmente nao acontece: todo
 * servico de aplicacao passa por `assegurarTransicao` antes de gravar. E o que
 * impede, por exemplo, concluir um agendamento ja cancelado.
 */

import { ErroDeRegra } from './erros.js';

// -------------------------------------------------------------- agendamento

export const ESTADOS_AGENDAMENTO = {
  PENDENTE_CONFIRMACAO: ['CONFIRMADO', 'RECUSADO', 'EXPIRADO', 'CANCELADO_CLIENTE'],
  CONFIRMADO: [
    'CANCELADO_CLIENTE', 'CANCELADO_PRESTADOR',
    'NO_SHOW_CLIENTE', 'NO_SHOW_PRESTADOR',
    'EM_DISPUTA', 'CONCLUIDO',
  ],
  CONCLUIDO: ['EM_DISPUTA'],
  NO_SHOW_CLIENTE: ['EM_DISPUTA'],
  NO_SHOW_PRESTADOR: ['EM_DISPUTA'],
  EM_DISPUTA: ['CONCLUIDO', 'NO_SHOW_CLIENTE', 'NO_SHOW_PRESTADOR', 'ARQUIVADO'],
  RECUSADO: [],
  EXPIRADO: [],
  CANCELADO_CLIENTE: [],
  CANCELADO_PRESTADOR: [],
  ARQUIVADO: [],
};

/** Estados em que o agendamento ainda ocupa o horario (INV-01). */
export const AGENDAMENTO_ATIVO = ['PENDENTE_CONFIRMACAO', 'CONFIRMADO', 'EM_DISPUTA'];

/** Estados que contam para o limite de reservas em aberto (RN-12). */
export const AGENDAMENTO_EM_ABERTO = ['PENDENTE_CONFIRMACAO', 'CONFIRMADO'];

// ------------------------------------------------------------------ horario

export const ESTADOS_HORARIO = {
  RASCUNHO: ['PUBLICADO', 'CANCELADO'],
  PUBLICADO: ['BLOQUEADO', 'CANCELADO', 'EXPIRADO'],
  BLOQUEADO: ['OCUPADO', 'PUBLICADO', 'EXPIRADO', 'CANCELADO'],
  // Cliente cancelou um confirmado: o prestador segue disponivel, entao o
  // horario volta a ser vendavel (PUBLICADO) ou expira, se ja nao houver
  // antecedencia. Prestador cancelou: CANCELADO, porque quem nao atende e ele.
  OCUPADO: ['ENCERRADO', 'CANCELADO', 'PUBLICADO', 'EXPIRADO'],
  ENCERRADO: [],
  CANCELADO: [],
  EXPIRADO: [],
};

/** Estados que ocupam a agenda do prestador e disputam sobreposicao (RN-06). */
export const HORARIO_OCUPA_AGENDA = ['PUBLICADO', 'BLOQUEADO', 'OCUPADO'];

// -------------------------------------------------------------------- conta

export const ESTADOS_CONTA = {
  PENDENTE_APROVACAO: ['ATIVO', 'REPROVADO', 'SUSPENSO'],
  ATIVO: ['RESTRITO', 'EM_REVISAO', 'SUSPENSO'],
  RESTRITO: ['ATIVO', 'EM_REVISAO', 'SUSPENSO'],
  EM_REVISAO: ['ATIVO', 'RESTRITO', 'SUSPENSO'],
  SUSPENSO: ['ATIVO'],
  REPROVADO: [],
};

/** Contas que podem operar normalmente. */
export const CONTA_OPERANTE = ['ATIVO', 'RESTRITO'];

// ------------------------------------------------------------------ disputa

export const ESTADOS_DISPUTA = {
  ABERTA: ['EM_ANALISE', 'RESOLVIDA'],
  EM_ANALISE: ['RESOLVIDA'],
  RESOLVIDA: [],
};

// ------------------------------------------------------------------ helpers

const MAQUINAS = {
  agendamento: ESTADOS_AGENDAMENTO,
  horario: ESTADOS_HORARIO,
  conta: ESTADOS_CONTA,
  disputa: ESTADOS_DISPUTA,
};

export function transicoesDe(maquina, estado) {
  const tabela = MAQUINAS[maquina];
  if (!tabela) throw new Error(`Máquina desconhecida: ${maquina}`);
  if (!(estado in tabela)) throw new Error(`Estado desconhecido em ${maquina}: ${estado}`);
  return tabela[estado];
}

export function podeTransicionar(maquina, de, para) {
  return transicoesDe(maquina, de).includes(para);
}

export function ehTerminal(maquina, estado) {
  return transicoesDe(maquina, estado).length === 0;
}

/** Barreira usada por todos os servicos de aplicacao antes de gravar um novo estado. */
export function assegurarTransicao(maquina, de, para) {
  if (!podeTransicionar(maquina, de, para)) {
    throw new ErroDeRegra(
      'INV-13',
      `Transição inválida de ${maquina}: ${ROTULOS[de] ?? de} não pode virar ${ROTULOS[para] ?? para}.`,
      { maquina, de, para },
    );
  }
  return para;
}

// -------------------------------------------------------- rotulos de exibicao

export const ROTULOS = {
  // agendamento
  PENDENTE_CONFIRMACAO: 'Aguardando confirmação',
  CONFIRMADO: 'Confirmado',
  RECUSADO: 'Recusado',
  EXPIRADO: 'Expirado',
  CANCELADO_CLIENTE: 'Cancelado pelo cliente',
  CANCELADO_PRESTADOR: 'Cancelado pelo prestador',
  NO_SHOW_CLIENTE: 'No-show do cliente',
  NO_SHOW_PRESTADOR: 'No-show do prestador',
  EM_DISPUTA: 'Em disputa',
  CONCLUIDO: 'Concluido',
  ARQUIVADO: 'Arquivado',
  // horario
  RASCUNHO: 'Rascunho',
  PUBLICADO: 'Publicado',
  BLOQUEADO: 'Reservado',
  OCUPADO: 'Confirmado',
  ENCERRADO: 'Encerrado',
  CANCELADO: 'Cancelado',
  // conta
  PENDENTE_APROVACAO: 'Aguardando aprovação',
  ATIVO: 'Ativa',
  RESTRITO: 'Restrita',
  EM_REVISAO: 'Em revisão',
  SUSPENSO: 'Suspensa',
  REPROVADO: 'Reprovada',
  // disputa
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em análise',
  RESOLVIDA: 'Resolvida',
  // desfechos
  MANTIDO: 'Mantido',
  REVERTIDO: 'Revertido',
  PARCIAL: 'Parcial',
  // cobranca
  PENDENTE: 'Pendente',
  PAGO_PRESENCIAL: 'Pago presencialmente',
  NAO_PAGO: 'Não pago',
  // comissao
  EFETIVADO: 'Efetivado',
  RETIDO: 'Retido',
  ESTORNADO: 'Estornado',
};

/** Cor semantica usada pelos selos na interface. */
export const TOM_DO_ESTADO = {
  PENDENTE_CONFIRMACAO: 'aviso',
  CONFIRMADO: 'ok',
  CONCLUIDO: 'ok',
  PUBLICADO: 'ok',
  ATIVO: 'ok',
  OCUPADO: 'info',
  BLOQUEADO: 'aviso',
  EM_DISPUTA: 'perigo',
  EM_REVISAO: 'perigo',
  RESTRITO: 'aviso',
  SUSPENSO: 'perigo',
  REPROVADO: 'perigo',
  NO_SHOW_CLIENTE: 'perigo',
  NO_SHOW_PRESTADOR: 'perigo',
  CANCELADO_CLIENTE: 'neutro',
  CANCELADO_PRESTADOR: 'neutro',
  RECUSADO: 'neutro',
  EXPIRADO: 'neutro',
  ARQUIVADO: 'neutro',
  PENDENTE_APROVACAO: 'aviso',
  ABERTA: 'aviso',
  EM_ANALISE: 'info',
  RESOLVIDA: 'ok',
  RETIDO: 'aviso',
  ESTORNADO: 'neutro',
  EFETIVADO: 'ok',
};

export function rotulo(estado) {
  return ROTULOS[estado] ?? estado;
}

export function tom(estado) {
  return TOM_DO_ESTADO[estado] ?? 'neutro';
}
