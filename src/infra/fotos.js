/**
 * Fotos de perfil em disco - RF-088 a RF-090 (SPEC-030, ADR-007).
 *
 * O arquivo nunca e confiado pelo nome nem pelo tipo que o navegador declara:
 * o formato sai dos primeiros bytes, e o nome gravado e sempre gerado aqui.
 * Assim um "foto.png" que na verdade e HTML nao entra, e nenhum nome vindo de
 * fora chega perto do sistema de arquivos.
 */

import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { CAMINHO_PADRAO } from './db/conexao.js';

/** Mesmo formato do CHECK de `usuario.foto` no schema. */
const NOME_VALIDO = /^[0-9a-f]{32}\.(jpg|png|webp)$/;

export const TIPOS_DE_FOTO = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Ao lado do banco, para `DB_PATH` temporario levar as fotos junto. */
function pasta() {
  return process.env.FOTOS_DIR ?? resolve(dirname(CAMINHO_PADRAO), 'fotos');
}

/**
 * Formato pela assinatura do arquivo, ou `null` se nao for um dos aceitos.
 * JPEG: FF D8 FF. PNG: 89 50 4E 47 0D 0A 1A 0A. WebP: "RIFF" .... "WEBP".
 */
export function detectarFormato(conteudo) {
  if (!Buffer.isBuffer(conteudo) || conteudo.length < 12) return null;
  if (conteudo[0] === 0xff && conteudo[1] === 0xd8 && conteudo[2] === 0xff) return 'jpg';
  if (conteudo.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (conteudo.toString('latin1', 0, 4) === 'RIFF' && conteudo.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

export function nomeValido(nome) {
  return NOME_VALIDO.test(String(nome ?? ''));
}

/** Grava com nome aleatorio e devolve o nome. Trocar a foto troca o nome, entao cache antigo nao serve a errada. */
export function gravar(conteudo, formato) {
  const nome = `${randomBytes(16).toString('hex')}.${formato}`;
  mkdirSync(pasta(), { recursive: true });
  writeFileSync(join(pasta(), nome), conteudo);
  return nome;
}

export function apagar(nome) {
  if (!nomeValido(nome)) return;
  rmSync(join(pasta(), nome), { force: true });
}

/** Conteudo e tipo para servir, ou `null` se o nome nao for um que o sistema gerou. */
export function ler(nome) {
  if (!nomeValido(nome)) return null;
  try {
    return { conteudo: readFileSync(join(pasta(), nome)), tipo: TIPOS_DE_FOTO[nome.split('.').pop()] };
  } catch {
    return null;
  }
}
