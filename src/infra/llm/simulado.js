/**
 * Provedor simulado - padrao do projeto.
 *
 * Por que existe: o sistema precisa rodar, ser demonstrado e ser testado sem
 * chave de API e sem rede (RNF-12, ADR-003). Ele imita a MESMA interface e o
 * MESMO formato de saida do provedor real - inclusive devolvendo confianca
 * baixa quando o texto e vago, para exercitar a RN-30.
 *
 * Nao e "a IA do projeto": e um dublê deterministico. O provedor real esta em
 * ./anthropic.js.
 */

import { validarSaida, STATUS } from './contrato.js';
import { adicionarHoras, adicionarDias, offsetFusoMin } from '../../dominio/tempo.js';

export const NOME = 'simulado/regras-locais';

/** Sinais de tempo reconhecidos no texto livre. */
const SINAIS_TEMPO = [
  { re: /\bagora\b|\bja\b|\burgente\b|\bemergenc/i, urgencia: 'ALTA', horas: [0, 3] },
  { re: /\bhoje a tarde\b|\bhoje à tarde\b|\besta tarde\b/i, urgencia: 'ALTA', periodo: [12, 18] },
  { re: /\bhoje de manha\b|\bhoje de manhã\b|\besta manha\b|\besta manhã\b/i, urgencia: 'ALTA', periodo: [6, 12] },
  { re: /\bhoje a noite\b|\bhoje à noite\b|\besta noite\b/i, urgencia: 'ALTA', periodo: [18, 23] },
  { re: /\bhoje\b/i, urgencia: 'ALTA', horas: [0, 12] },
  { re: /\bamanha\b|\bamanhã\b/i, urgencia: 'MEDIA', dias: 1 },
  { re: /\besta semana\b|\bnesta semana\b/i, urgencia: 'MEDIA', horas: [0, 24 * 5] },
  { re: /\bfim de semana\b|\bsabado\b|\bsábado\b|\bdomingo\b/i, urgencia: 'BAIXA', horas: [0, 24 * 7] },
];

const SINAIS_DURACAO = [
  { re: /\bcompleto\b|\bcompleta\b|\bpacote\b/i, minutos: 90 },
  { re: /\bsimples\b|\brapido\b|\brápido\b|\bexpress\b/i, minutos: 30 },
];

export function criar({ padraoDuracaoMin = 45 } = {}) {
  return {
    nome: NOME,

    async interpretar({ texto, categorias, regioes, agoraIso }) {
      const limpo = String(texto ?? '').trim();
      if (!limpo) {
        return { status: STATUS.FALHA, modelo: NOME, motivo: 'texto vazio' };
      }

      const normalizado = semAcento(limpo.toLowerCase());
      let pontos = 0;

      // --- categoria: melhor casamento por palavras do nome da categoria
      const categoria = melhorCategoria(normalizado, categorias);
      if (categoria.acertos > 0) pontos += Math.min(categoria.acertos, 2);

      // --- tempo
      const tempo = interpretarTempo(normalizado, agoraIso);
      if (tempo.reconhecido) pontos += 1;

      // --- regiao
      const regiao = melhorRegiao(normalizado, regioes);
      if (regiao) pontos += 1;

      // --- duracao
      const duracao = SINAIS_DURACAO.find((s) => s.re.test(normalizado))?.minutos
        ?? categoria.duracaoTipica
        ?? padraoDuracaoMin;

      // Confianca cresce com a quantidade de sinais reconhecidos; sem categoria,
      // nunca passa do limiar - e exatamente o caso que RN-30 quer capturar.
      const confianca = categoria.nome
        ? Math.min(0.95, 0.45 + pontos * 0.15)
        : Math.min(0.4, 0.15 + pontos * 0.1);

      const validado = validarSaida({
        categoria_servico: categoria.nome ?? primeiraPalavraRelevante(normalizado),
        duracao_estimada_min: duracao,
        urgencia: tempo.urgencia,
        janela_inicio: tempo.inicio ?? '',
        janela_fim: tempo.fim ?? '',
        regiao: regiao?.bairro ?? '',
        confianca,
      }, categorias);

      if (!validado.ok) {
        return { status: STATUS.FALHA, modelo: NOME, motivo: validado.motivo };
      }

      return { status: STATUS.SUCESSO, modelo: NOME, ...validado.dados };
    },
  };
}

// ------------------------------------------------------------------ auxiliares

function semAcento(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function melhorCategoria(texto, categorias) {
  let melhor = { nome: null, acertos: 0, duracaoTipica: null };

  for (const categoria of categorias) {
    const termos = [
      ...semAcento(categoria.nome.toLowerCase()).split(/[^a-z0-9]+/),
      ...(SINONIMOS[semAcento(categoria.nome.toLowerCase())] ?? []),
    ].filter((t) => t.length >= 4);

    const acertos = termos.filter((t) => texto.includes(t)).length;
    if (acertos > melhor.acertos) {
      melhor = { nome: categoria.nome, acertos, duracaoTipica: null };
    }
  }
  return melhor;
}

/** Vocabulario do cliente que nao coincide com o nome da categoria. */
const SINONIMOS = {
  'cabelo e barba': ['corte', 'cabelo', 'barba', 'barbeiro', 'barbearia', 'cortar'],
  estetica: ['unha', 'unhas', 'manicure', 'pedicure', 'limpeza', 'pele', 'sobrancelha', 'depilacao'],
  'saude e bem-estar': ['massagem', 'fisioterapia', 'terapia', 'relaxante'],
  'treino e esporte': ['treino', 'personal', 'academia', 'musculacao', 'corrida'],
  'automotivo': ['carro', 'oficina', 'revisao', 'lavagem', 'polimento', 'mecanico', 'veiculo'],
  'assistencia tecnica': ['conserto', 'reparo', 'notebook', 'celular', 'computador', 'tecnico'],
};

function melhorRegiao(texto, regioes) {
  return (regioes ?? []).find((r) => texto.includes(semAcento(r.bairro.toLowerCase())))
    ?? (regioes ?? []).find((r) => texto.includes(semAcento(r.cidade.toLowerCase())))
    ?? null;
}

function interpretarTempo(texto, agoraIso) {
  const sinal = SINAIS_TEMPO.find((s) => s.re.test(texto));
  if (!sinal) {
    // Sem pista de tempo: assume as proximas 48h e sinaliza pouca urgencia.
    return {
      reconhecido: false,
      urgencia: 'BAIXA',
      inicio: agoraIso,
      fim: adicionarHoras(agoraIso, 48),
    };
  }

  if (sinal.periodo) {
    const [horaIni, horaFim] = sinal.periodo;
    return {
      reconhecido: true,
      urgencia: sinal.urgencia,
      inicio: horaLocalDoDia(agoraIso, horaIni),
      fim: horaLocalDoDia(agoraIso, horaFim),
    };
  }

  if (sinal.dias) {
    const base = adicionarDias(agoraIso, sinal.dias);
    return {
      reconhecido: true,
      urgencia: sinal.urgencia,
      inicio: horaLocalDoDia(base, 6),
      fim: horaLocalDoDia(base, 23),
    };
  }

  const [de, ate] = sinal.horas;
  return {
    reconhecido: true,
    urgencia: sinal.urgencia,
    inicio: adicionarHoras(agoraIso, de),
    fim: adicionarHoras(agoraIso, ate),
  };
}

/** Uma hora local (Sao Paulo) do mesmo dia do instante de referencia, em UTC. */
function horaLocalDoDia(referenciaIso, horaLocal) {
  const offset = offsetFusoMin(referenciaIso);
  const local = new Date(new Date(referenciaIso).getTime() + offset * 60000);
  local.setUTCHours(horaLocal, 0, 0, 0);
  return new Date(local.getTime() - offset * 60000).toISOString();
}

function primeiraPalavraRelevante(texto) {
  return texto.split(/[^a-z0-9]+/).find((p) => p.length >= 5) ?? '';
}
