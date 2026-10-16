/**
 * Precificacao dinamica - RN-01, RN-02, RN-03.
 *
 * Uma regua e uma lista de faixas no formato
 *   { antecedencia_min: 240, percentual_desconto: 20 }
 * lida como "a partir de 240 min antes do horario, 20% de desconto".
 *
 * Modulo puro: nao conhece banco, nao conhece relogio. Recebe a antecedencia
 * ja calculada. E o que torna estas regras trivialmente testaveis.
 */

import { ErroDeRegra, ErroDeValidacao } from './erros.js';
import { percentualDe } from './dinheiro.js';

/**
 * RN-02 - Regua valida: ao menos uma faixa, antecedencias distintas,
 * percentuais dentro do teto e desconto nao crescente conforme a antecedencia
 * aumenta (quanto mais perto do horario, maior ou igual o desconto).
 */
export function validarRegua(faixas, tetoPct) {
  if (!Array.isArray(faixas) || faixas.length === 0) {
    throw new ErroDeRegra('RN-02', 'A régua precisa de pelo menos uma faixa de desconto.');
  }

  const vistas = new Set();
  for (const faixa of faixas) {
    const ant = Number(faixa.antecedencia_min);
    const pct = Number(faixa.percentual_desconto);

    if (!Number.isInteger(ant) || ant <= 0) {
      throw new ErroDeRegra('RN-02', 'Cada faixa precisa de uma antecedência em minutos maior que zero.', { faixa });
    }
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
      throw new ErroDeRegra('RN-02', 'O desconto de cada faixa deve estar entre 0% e 100%.', { faixa });
    }
    if (pct > tetoPct) {
      throw new ErroDeRegra(
        'RN-02',
        `A faixa de ${ant} min pede ${pct}% de desconto, acima do teto da plataforma (${tetoPct}%).`,
        { faixa, tetoPct },
      );
    }
    if (vistas.has(ant)) {
      throw new ErroDeRegra('RN-02', `Existe mais de uma faixa com antecedência de ${ant} min.`, { faixa });
    }
    vistas.add(ant);
  }

  // Monotonicidade: ordenado por antecedencia crescente, o desconto nao pode subir.
  const ordenadas = ordenarPorAntecedencia(faixas);
  for (let i = 1; i < ordenadas.length; i += 1) {
    if (Number(ordenadas[i].percentual_desconto) > Number(ordenadas[i - 1].percentual_desconto)) {
      throw new ErroDeRegra(
        'RN-02',
        `Régua inválida: a faixa de ${ordenadas[i].antecedencia_min} min oferece mais desconto que a de `
        + `${ordenadas[i - 1].antecedencia_min} min. Esperar mais não pode sair mais barato.`,
        { faixas: ordenadas },
      );
    }
  }

  return ordenadas;
}

/** Faixas ordenadas da menor para a maior antecedencia. */
export function ordenarPorAntecedencia(faixas) {
  return [...faixas].sort((a, b) => Number(a.antecedencia_min) - Number(b.antecedencia_min));
}

/**
 * RN-01 - Faixa aplicavel: a de MENOR antecedencia entre as que cobrem o
 * instante atual (antecedencia_min >= antecedencia atual).
 * Retorna null quando ainda falta muito tempo e nenhuma faixa cobre.
 */
export function faixaAplicavel(faixas, antecedenciaMin) {
  if (!Array.isArray(faixas) || faixas.length === 0) return null;
  const candidatas = faixas.filter((f) => Number(f.antecedencia_min) >= antecedenciaMin);
  if (candidatas.length === 0) return null;
  return candidatas.reduce((menor, f) => (
    Number(f.antecedencia_min) < Number(menor.antecedencia_min) ? f : menor
  ));
}

/** RN-03 - Piso: vence o mais restritivo entre o minimo do prestador e o teto da plataforma. */
export function pisoDePreco(precoBase, precoMinimo, tetoPct) {
  const pisoPorTeto = precoBase - percentualDe(precoBase, tetoPct);
  return Math.max(Number(precoMinimo) || 0, pisoPorTeto);
}

/**
 * Preco vigente de um horario, com desconto e piso aplicados.
 *
 * @param {object} p
 * @param {number} p.precoBase        centavos
 * @param {number} p.precoMinimo      centavos (piso do prestador)
 * @param {Array}  p.faixas           faixas da regua
 * @param {number} p.antecedenciaMin  minutos ate o inicio do horario
 * @param {number} p.tetoPct          teto global de desconto (P-05)
 */
export function calcularPreco({ precoBase, precoMinimo = 0, faixas = [], antecedenciaMin, tetoPct }) {
  if (!Number.isFinite(precoBase) || precoBase <= 0) {
    throw new ErroDeValidacao('Preço-base inválido.');
  }

  const faixa = faixaAplicavel(faixas, antecedenciaMin);
  const percentualTabela = faixa ? Number(faixa.percentual_desconto) : 0;

  const precoDeTabela = precoBase - percentualDe(precoBase, percentualTabela);
  const piso = pisoDePreco(precoBase, precoMinimo, tetoPct);
  const precoVigente = Math.max(precoDeTabela, piso);

  const economia = precoBase - precoVigente;
  const percentualEfetivo = Math.round((economia / precoBase) * 100);

  return {
    precoBase,
    precoVigente,
    percentualTabela,
    percentualEfetivo,
    economia,
    piso,
    pisoAtingido: precoVigente > precoDeTabela,
    faixa,
  };
}

/**
 * Proximo degrau de desconto (RF-026): a faixa de maior antecedencia entre as
 * que ainda vao entrar em vigor. `emMinutos` diz daqui a quanto tempo isso ocorre.
 */
export function proximoDegrau(faixas, antecedenciaMin) {
  const futuras = (faixas ?? []).filter((f) => Number(f.antecedencia_min) < antecedenciaMin);
  if (futuras.length === 0) return null;
  const proxima = futuras.reduce((maior, f) => (
    Number(f.antecedencia_min) > Number(maior.antecedencia_min) ? f : maior
  ));
  return {
    faixa: proxima,
    percentual: Number(proxima.percentual_desconto),
    emMinutos: antecedenciaMin - Number(proxima.antecedencia_min),
  };
}

/**
 * Simulacao da regua (US-15 / RF-027): preco resultante em cada faixa,
 * sem persistir nada.
 */
export function projetarRegua({ precoBase, precoMinimo = 0, faixas = [], tetoPct }) {
  const ordenadas = ordenarPorAntecedencia(faixas);
  const linhas = ordenadas.map((f) => {
    const r = calcularPreco({
      precoBase, precoMinimo, faixas, antecedenciaMin: Number(f.antecedencia_min), tetoPct,
    });
    return { antecedenciaMin: Number(f.antecedencia_min), ...r };
  });

  // Linha de referencia: antes de qualquer faixa entrar em vigor, preco cheio.
  const maiorAntecedencia = ordenadas.length ? Number(ordenadas[ordenadas.length - 1].antecedencia_min) : 0;
  const semDesconto = calcularPreco({
    precoBase, precoMinimo, faixas, antecedenciaMin: maiorAntecedencia + 1, tetoPct,
  });

  return [{ antecedenciaMin: maiorAntecedencia + 1, ...semDesconto }, ...linhas.reverse()];
}
