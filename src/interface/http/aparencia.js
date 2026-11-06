/**
 * Preferencias de aparencia - RF-093 (SPEC-030, ADR-007).
 *
 * Vivem num cookie do navegador, e nao no banco: valem tambem para quem nao
 * entrou, nao mexem no modelo de dados e funcionam sem JavaScript (o
 * formulario e um POST comum). Sao preferencia de exibicao, nao dado de
 * negocio - nenhuma regra le daqui.
 */

const COOKIE = 'encaixe_aparencia';
const UM_ANO_S = 365 * 24 * 3600;

export const TEMAS = {
  sistema: 'Seguir o sistema',
  claro: 'Branco',
  azul: 'Azul-escuro',
  preto: 'Preto',
};

export const MOVIMENTOS = {
  normal: 'Animações completas',
  reduzido: 'Reduzir animações',
};

export const PADRAO = { tema: 'sistema', movimento: 'normal' };

/** Valor fora da lista vira o padrao: o cookie e controlado pelo cliente. */
export function normalizar({ tema, movimento } = {}) {
  return {
    tema: Object.hasOwn(TEMAS, tema) ? tema : PADRAO.tema,
    movimento: Object.hasOwn(MOVIMENTOS, movimento) ? movimento : PADRAO.movimento,
  };
}

export function lerAparencia(req) {
  const cabecalho = req?.headers?.cookie ?? '';
  for (const parte of cabecalho.split(';')) {
    const [chave, valor = ''] = parte.trim().split('=');
    if (chave !== COOKIE) continue;
    const [tema, movimento] = valor.split('.');
    return normalizar({ tema, movimento });
  }
  return { ...PADRAO };
}

export function cookieDeAparencia({ tema, movimento }) {
  const valor = normalizar({ tema, movimento });
  return `${COOKIE}=${valor.tema}.${valor.movimento}; Path=/; SameSite=Lax; Max-Age=${UM_ANO_S}`;
}
