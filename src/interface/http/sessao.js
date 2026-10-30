/**
 * Sessao e CSRF - RNF-02, RNF-03.
 *
 * Cookie httpOnly + SameSite=Lax com um identificador aleatorio; o estado da
 * sessao vive no banco. Cada sessao carrega um token CSRF que todo formulario
 * POST precisa devolver.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { um, executar, inserir } from '../../infra/db/conexao.js';
import { agoraIso, adicionarHoras, antesDe, minutosEntre } from '../../dominio/tempo.js';
import * as usuariosRepo from '../../infra/repositorios/usuarios.js';

const COOKIE = 'encaixe_sid';
// ADR-004 (revisao, OPEN-12): 2 h sem uso expiram a sessao, e 12 h desde o
// login sao o teto mesmo com uso continuo. `expira_em` guarda o prazo de
// inatividade e anda a cada uso, mas nunca passa de `criada_em` + teto.
const INATIVIDADE_HORAS = 2;
const TETO_HORAS = 12;
// O ADR-004 pede que a renovacao nao escreva no banco a cada requisicao: so
// grava quando o prazo andaria ao menos isto. Custo: a sessao pode expirar ate
// 1 min antes das 2 h exatas de inatividade.
const RENOVACAO_MINIMA_MIN = 1;

/** Mensagens efemeras entre requisicoes (pos-redirect). Vivem so no processo. */
const avisos = new Map();

export function criarSessao(usuarioId) {
  const id = randomBytes(24).toString('hex');
  const csrf = randomBytes(24).toString('hex');
  const agora = agoraIso();

  executar(
    'INSERT INTO sessao (id, usuario_id, csrf, criada_em, expira_em) VALUES (?, ?, ?, ?, ?)',
    id, usuarioId, csrf, agora, proximoPrazo(agora, agora),
  );

  return { id, csrf };
}

function proximoPrazo(criadaEm, agora) {
  const inatividade = adicionarHoras(agora, INATIVIDADE_HORAS);
  const teto = adicionarHoras(criadaEm, TETO_HORAS);
  return antesDe(inatividade, teto) ? inatividade : teto;
}

export function carregarSessao(req) {
  const id = lerCookie(req, COOKIE);
  if (!id) return null;

  const sessao = um('SELECT * FROM sessao WHERE id = ?', id);
  if (!sessao) return null;

  const agora = agoraIso();
  if (!antesDe(agora, sessao.expira_em)) {
    encerrarSessao(id);
    return null;
  }

  const usuario = usuariosRepo.porId(sessao.usuario_id);
  if (!usuario) return null;

  const prazo = proximoPrazo(sessao.criada_em, agora);
  if (minutosEntre(sessao.expira_em, prazo) < RENOVACAO_MINIMA_MIN) {
    return { ...sessao, usuario };
  }
  executar('UPDATE sessao SET expira_em = ? WHERE id = ?', prazo, id);

  return { ...sessao, expira_em: prazo, usuario };
}

export function encerrarSessao(id) {
  if (id) executar('DELETE FROM sessao WHERE id = ?', id);
}

export function cookieDeSessao(id) {
  return `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TETO_HORAS * 3600}`;
}

export function cookieDeSaida() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Comparacao de token em tempo constante. */
export function csrfValido(sessao, enviado) {
  if (!sessao?.csrf || !enviado) return false;
  const a = Buffer.from(String(sessao.csrf));
  const b = Buffer.from(String(enviado));
  return a.length === b.length && timingSafeEqual(a, b);
}

// -------------------------------------------------------------- avisos

export function guardarAviso(sessaoId, aviso) {
  if (!sessaoId) return;
  const lista = avisos.get(sessaoId) ?? [];
  lista.push(aviso);
  avisos.set(sessaoId, lista);
}

export function consumirAvisos(sessaoId) {
  if (!sessaoId) return [];
  const lista = avisos.get(sessaoId) ?? [];
  avisos.delete(sessaoId);
  return lista;
}

function lerCookie(req, nome) {
  const cabecalho = req.headers.cookie;
  if (!cabecalho) return null;

  for (const parte of cabecalho.split(';')) {
    const [chave, ...resto] = parte.trim().split('=');
    if (chave === nome) return decodeURIComponent(resto.join('='));
  }
  return null;
}
