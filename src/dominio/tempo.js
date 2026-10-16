/**
 * Tempo - RNF-08.
 *
 * Regra da casa: instantes sao persistidos em UTC (ISO-8601 com 'Z') e
 * apresentados em America/Sao_Paulo. Nenhuma regra de negocio olha o relogio
 * do navegador.
 *
 * O relogio e injetavel (`definirRelogio`) porque metade das regras da spec
 * depende de "quanto falta para o horario" - sem controlar o tempo nos testes,
 * RN-01, RN-10, RN-18 e RN-20 seriam intestaveis.
 */

export const FUSO = 'America/Sao_Paulo';

let fonteDeTempo = () => new Date();

/** Instante atual, como Date. */
export function agora() {
  return fonteDeTempo();
}

/** Instante atual, como string ISO UTC. */
export function agoraIso() {
  return fonteDeTempo().toISOString();
}

/** Substitui o relogio (uso exclusivo de testes e de scripts de demonstracao). */
export function definirRelogio(fn) {
  fonteDeTempo = typeof fn === 'function' ? fn : () => new Date(fn);
}

/** Volta ao relogio real. */
export function restaurarRelogio() {
  fonteDeTempo = () => new Date();
}

// ---------------------------------------------------------------- aritmetica

export function paraDate(valor) {
  return valor instanceof Date ? valor : new Date(valor);
}

export function paraIso(valor) {
  return paraDate(valor).toISOString();
}

/** Minutos de `de` ate `ate` (positivo quando `ate` e futuro). */
export function minutosEntre(de, ate) {
  return Math.floor((paraDate(ate).getTime() - paraDate(de).getTime()) / 60000);
}

export function adicionarMinutos(valor, minutos) {
  return new Date(paraDate(valor).getTime() + minutos * 60000).toISOString();
}

export function adicionarHoras(valor, horas) {
  return adicionarMinutos(valor, horas * 60);
}

export function adicionarDias(valor, dias) {
  return adicionarMinutos(valor, dias * 24 * 60);
}

/** true se `a` e anterior a `b`. */
export function antesDe(a, b) {
  return paraDate(a).getTime() < paraDate(b).getTime();
}

/** Antecedencia em minutos entre agora e um instante futuro. Negativa se ja passou. */
export function antecedenciaMin(instante, referencia = agora()) {
  return minutosEntre(referencia, instante);
}

// ------------------------------------------------------------- fuso horario

/** Offset de America/Sao_Paulo, em minutos, para o instante informado. */
export function offsetFusoMin(instante = agora()) {
  const data = paraDate(instante);
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: FUSO,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(data).map((p) => [p.type, p.value]),
  );
  const comoUtc = Date.UTC(
    Number(partes.year), Number(partes.month) - 1, Number(partes.day),
    Number(partes.hour) % 24, Number(partes.minute), Number(partes.second),
  );
  return Math.round((comoUtc - data.getTime()) / 60000);
}

/**
 * Converte data/hora digitadas pelo usuario (horario de Sao Paulo) em ISO UTC.
 * @param {string} data 'AAAA-MM-DD'
 * @param {string} hora 'HH:MM'
 */
export function deLocalParaUtc(data, hora) {
  const [ano, mes, dia] = String(data).split('-').map(Number);
  const [h, min] = String(hora).split(':').map(Number);
  if ([ano, mes, dia, h, min].some((n) => Number.isNaN(n))) {
    throw new TypeError(`Data ou hora inválida: "${data} ${hora}"`);
  }
  const ingenuo = Date.UTC(ano, mes - 1, dia, h, min);
  let instante = ingenuo;
  // Duas passadas convergem para qualquer offset (inclusive se o Brasil voltar a ter horario de verao).
  for (let i = 0; i < 2; i += 1) {
    instante = ingenuo - offsetFusoMin(new Date(instante)) * 60000;
  }
  return new Date(instante).toISOString();
}

// -------------------------------------------------------------- apresentacao

const FMT_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});
const FMT_DATA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric',
});
const FMT_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO, hour: '2-digit', minute: '2-digit',
});
const FMT_DIA_SEMANA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO, weekday: 'short', day: '2-digit', month: '2-digit',
});
const FMT_DIA_LONGO = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long',
});

export function formatarDataHora(valor) {
  return valor ? FMT_DATA_HORA.format(paraDate(valor)) : '-';
}

export function formatarData(valor) {
  return valor ? FMT_DATA.format(paraDate(valor)) : '-';
}

export function formatarHora(valor) {
  return valor ? FMT_HORA.format(paraDate(valor)) : '-';
}

export function formatarDiaSemana(valor) {
  return valor ? FMT_DIA_SEMANA.format(paraDate(valor)) : '-';
}

/**
 * 'hoje', 'amanha' ou 'sabado, 22 de agosto' (rotulo humano) - cabecalho de dia na agenda.
 * Recebe a referencia para nao consultar o relogio real: o mesmo motivo pelo
 * qual nenhuma regra temporal daqui usa `new Date()` direto (RNF-08).
 */
export function formatarDiaLongo(valor, referencia = agora()) {
  if (!valor) return '-';
  const dia = partesLocais(valor).data;
  const hoje = partesLocais(referencia).data;
  const amanha = partesLocais(adicionarDias(referencia, 1)).data;

  if (dia === hoje) return 'hoje';
  if (dia === amanha) return 'amanhã';
  return FMT_DIA_LONGO.format(paraDate(valor));
}

/** 'AAAA-MM-DD' e 'HH:MM' em Sao Paulo, para preencher inputs de formulario. */
export function partesLocais(valor) {
  const d = paraDate(valor);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${String(Number(p.hour) % 24).padStart(2, '0')}:${p.minute}` };
}

/** '3 h 20 min', '45 min', 'agora' - usado para mostrar a antecedencia. */
export function humanizarMinutos(minutos) {
  const m = Math.round(minutos);
  if (m <= 0) return 'agora';
  if (m < 60) return `${m} min`;
  const horas = Math.floor(m / 60);
  const resto = m % 60;
  if (horas < 24) return resto ? `${horas} h ${resto} min` : `${horas} h`;
  const dias = Math.floor(horas / 24);
  const hs = horas % 24;
  return hs ? `${dias} d ${hs} h` : `${dias} d`;
}
