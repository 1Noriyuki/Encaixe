/**
 * Hash de senha - RNF-02.
 *
 * scrypt do proprio Node: derivacao lenta, sal por usuario, comparacao em tempo
 * constante. Nenhuma senha em texto puro toca o banco ou o log.
 */

import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { ErroDeValidacao } from '../dominio/erros.js';

const TAMANHO_SAL = 16;
const TAMANHO_CHAVE = 64;
const CUSTO = { N: 16384, r: 8, p: 1 };
const MIN_CARACTERES = 8;

export function gerarHash(senha) {
  const sal = randomBytes(TAMANHO_SAL);
  const derivada = scryptSync(senha, sal, TAMANHO_CHAVE, CUSTO);
  return `scrypt$${CUSTO.N}$${sal.toString('hex')}$${derivada.toString('hex')}`;
}

export function verificar(senha, hashArmazenado) {
  try {
    const [algoritmo, n, salHex, chaveHex] = String(hashArmazenado).split('$');
    if (algoritmo !== 'scrypt') return false;

    const sal = Buffer.from(salHex, 'hex');
    const esperada = Buffer.from(chaveHex, 'hex');
    const calculada = scryptSync(senha, sal, esperada.length, { ...CUSTO, N: Number(n) });

    return calculada.length === esperada.length && timingSafeEqual(calculada, esperada);
  } catch {
    return false;
  }
}

/** Politica minima de senha. Nao e o foco do projeto, mas nao pode ser nula. */
export function validarForca(senha) {
  const texto = String(senha ?? '');
  if (texto.length < MIN_CARACTERES) {
    throw new ErroDeValidacao(`A senha precisa de pelo menos ${MIN_CARACTERES} caracteres.`, 'senha');
  }
  if (!/[a-zA-Z]/.test(texto) || !/[0-9]/.test(texto)) {
    throw new ErroDeValidacao('A senha precisa misturar letras e numeros.', 'senha');
  }
  return texto;
}
