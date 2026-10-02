/**
 * Parametros do dominio - secao 6.1 da spec, regra RN-00.
 *
 * "Parametros sao dados, nao codigo": nenhum destes numeros pode aparecer
 * espalhado no meio das regras. O admin altera pela interface; a alteracao vale
 * apenas para fatos posteriores.
 */

export const PARAMETROS = {
  janela_confirmacao_min: {
    id: 'P-01', rotulo: 'Janela de confirmação do prestador',
    padrao: 15, min: 5, max: 60, unidade: 'min', escopo: 'PRESTADOR',
    ajuda: 'Prazo que o prestador tem para responder a uma reserva.',
  },
  politica_expiracao: {
    id: 'P-02', rotulo: 'Política ao expirar a janela',
    padrao: 'LIBERAR', opcoes: ['LIBERAR', 'AUTOCONFIRMAR'], escopo: 'PRESTADOR',
    ajuda: 'LIBERAR devolve o horário para a busca; AUTOCONFIRMAR confirma sozinho.',
  },
  antecedencia_min_publicacao_min: {
    id: 'P-03', rotulo: 'Antecedência mínima para publicar',
    padrao: 60, min: 30, max: 240, unidade: 'min',
    ajuda: 'Impede publicar um horário impossível de cumprir.',
  },
  antecedencia_min_reserva_min: {
    id: 'P-04', rotulo: 'Antecedência mínima para reservar',
    padrao: 30, min: 15, max: 120, unidade: 'min',
    ajuda: 'Abaixo disso o horário sai da busca.',
  },
  desconto_maximo_pct: {
    id: 'P-05', rotulo: 'Teto de desconto da plataforma',
    padrao: 60, min: 30, max: 80, unidade: '%',
    ajuda: 'Nenhuma régua pode descontar mais que isso.',
  },
  cancelamento_livre_h: {
    id: 'P-06', rotulo: 'Cancelamento sem penalidade (X)',
    padrao: 6, min: 2, max: 24, unidade: 'h',
    ajuda: 'Acima desta antecedência, cancelar não penaliza.',
  },
  cancelamento_total_h: {
    id: 'P-07', rotulo: 'Penalidade total abaixo de (Y)',
    padrao: 2, min: 1, max: 6, unidade: 'h',
    ajuda: 'Abaixo desta antecedência, a penalidade é a máxima.',
  },
  reputacao_inicial: {
    id: 'P-08', rotulo: 'Reputação inicial',
    padrao: 70, min: 50, max: 80, unidade: 'pts',
  },
  limiar_revisao: {
    id: 'P-09', rotulo: 'Limiar de revisão administrativa',
    padrao: 40, min: 20, max: 60, unidade: 'pts',
    ajuda: 'Abaixo disso a conta entra em revisão do admin.',
  },
  limiar_restricao_cliente: {
    id: 'P-10', rotulo: 'Limiar de restrição do cliente',
    padrao: 50, min: 30, max: 70, unidade: 'pts',
    ajuda: 'Abaixo disso o cliente só mantém uma reserva em aberto.',
  },
  limite_reservas_normal: {
    id: 'P-11a', rotulo: 'Reservas simultâneas (normal)',
    padrao: 3, min: 1, max: 5, unidade: 'reservas',
  },
  limite_reservas_restrito: {
    id: 'P-11b', rotulo: 'Reservas simultâneas (restrito)',
    padrao: 1, min: 1, max: 2, unidade: 'reservas',
  },
  ocorrencias_consecutivas_max: {
    id: 'P-12a', rotulo: 'Ocorrências negativas do prestador',
    padrao: 3, min: 2, max: 5, unidade: 'ocorrencias',
    ajuda: 'Atingido o limite, o prestador entra em revisão.',
  },
  janela_ocorrencias_dias: {
    id: 'P-12b', rotulo: 'Janela de apuração das ocorrências',
    padrao: 30, min: 7, max: 90, unidade: 'dias',
  },
  comissao_pct_padrao: {
    id: 'P-13', rotulo: 'Comissão padrão da plataforma',
    padrao: 12, min: 8, max: 15, unidade: '%',
    ajuda: 'Usada quando a categoria não define percentual próprio.',
  },
  janela_avaliacao_dias: {
    id: 'P-14', rotulo: 'Janela de avaliação',
    padrao: 7, min: 3, max: 15, unidade: 'dias',
  },
  prazo_disputa_h: {
    id: 'P-15', rotulo: 'Prazo para abrir disputa',
    padrao: 48, min: 24, max: 96, unidade: 'h',
  },
  noshow_carencia_min: {
    id: 'P-16a', rotulo: 'Carência para reportar no-show',
    padrao: 15, min: 5, max: 60, unidade: 'min',
    ajuda: 'Tempo após o início do horário antes de poder acusar ausência.',
  },
  noshow_prazo_pos_fim_h: {
    id: 'P-16b', rotulo: 'Prazo final para reportar no-show',
    padrao: 24, min: 6, max: 72, unidade: 'h',
  },
  autoconclusao_h: {
    id: 'P-17', rotulo: 'Conclusão automática',
    padrao: 24, min: 12, max: 72, unidade: 'h',
    ajuda: 'Sem contestação nesse prazo, o sistema conclui e apura a comissão.',
  },
  sla_disputa_h: {
    id: 'P-18', rotulo: 'SLA de resolução de disputa',
    padrao: 72, min: 24, max: 120, unidade: 'h',
  },
  confianca_minima_llm: {
    id: 'P-19', rotulo: 'Confiança mínima da interpretação',
    padrao: 0.6, min: 0.4, max: 0.9, unidade: '0-1', decimal: true,
    ajuda: 'Abaixo disso o sistema pede confirmação dos filtros ao cliente.',
  },
  janela_reputacao_dias: {
    id: 'P-20', rotulo: 'Janela móvel da reputação',
    padrao: 90, min: 30, max: 180, unidade: 'dias',
  },
  limite_interpretacoes_dia: {
    id: 'RNF-13', rotulo: 'Interpretações por usuário por dia',
    padrao: 20, min: 1, max: 200, unidade: 'buscas',
    ajuda: 'Trava de custo do provedor de LLM.',
  },
};

/** Mapa chave -> valor padrao. */
export const PADROES = Object.freeze(
  Object.fromEntries(Object.entries(PARAMETROS).map(([k, v]) => [k, v.padrao])),
);

/** Parametros que o prestador pode sobrescrever para si. */
export const PARAMETROS_DO_PRESTADOR = Object.entries(PARAMETROS)
  .filter(([, v]) => v.escopo === 'PRESTADOR')
  .map(([k]) => k);

/**
 * Valida e normaliza o valor de um parametro.
 * @returns {number|string} valor normalizado
 */
export function normalizarParametro(chave, valorBruto) {
  const meta = PARAMETROS[chave];
  if (!meta) throw new Error(`Parâmetro desconhecido: ${chave}`);

  if (meta.opcoes) {
    const v = String(valorBruto).toUpperCase();
    if (!meta.opcoes.includes(v)) {
      throw new Error(`${meta.rotulo}: valor inválido. Use ${meta.opcoes.join(' ou ')}.`);
    }
    return v;
  }

  const numero = meta.decimal ? Number(String(valorBruto).replace(',', '.')) : Number.parseInt(valorBruto, 10);
  if (!Number.isFinite(numero)) throw new Error(`${meta.rotulo}: informe um número.`);
  if (numero < meta.min || numero > meta.max) {
    throw new Error(`${meta.rotulo}: use um valor entre ${meta.min} e ${meta.max} ${meta.unidade ?? ''}.`.trim());
  }
  return numero;
}

/** Aplica os padroes por cima do que veio do banco. */
export function comPadroes(parciais = {}) {
  return { ...PADROES, ...parciais };
}
