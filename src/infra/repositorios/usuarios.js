/**
 * Repositorio de contas e perfis.
 */

import { um, varios, inserir, executar, contar } from '../db/conexao.js';

// ------------------------------------------------------------------- contas

export function criar({ nome, email, senha_hash, perfil, estado_conta, reputacao, criado_em }) {
  return inserir(
    `INSERT INTO usuario (nome, email, senha_hash, perfil, estado_conta, reputacao, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    nome, email.toLowerCase(), senha_hash, perfil, estado_conta, reputacao, criado_em,
  );
}

export function porId(id) {
  return um('SELECT * FROM usuario WHERE id = ?', id);
}

export function porEmail(email) {
  return um('SELECT * FROM usuario WHERE email = ?', String(email ?? '').toLowerCase());
}

export function emailExiste(email) {
  return contar('SELECT COUNT(*) AS total FROM usuario WHERE email = ?', String(email ?? '').toLowerCase()) > 0;
}

export function atualizarEstadoConta(id, estado) {
  executar('UPDATE usuario SET estado_conta = ? WHERE id = ?', estado, id);
}

export function atualizarReputacao(id, reputacao) {
  executar('UPDATE usuario SET reputacao = ? WHERE id = ?', reputacao, id);
}

export function atualizarSenha(id, senhaHash) {
  executar('UPDATE usuario SET senha_hash = ? WHERE id = ?', senhaHash, id);
}

// ------------------------------------------------------------------ perfis

export function criarPerfilPrestador({ usuario_id, nome_exibicao, descricao = '', regiao_id = null }) {
  executar(
    `INSERT INTO perfil_prestador (usuario_id, nome_exibicao, descricao, regiao_id)
     VALUES (?, ?, ?, ?)`,
    usuario_id, nome_exibicao, descricao, regiao_id,
  );
}

export function criarPerfilCliente({ usuario_id, telefone = '', regiao_preferida_id = null }) {
  executar(
    `INSERT INTO perfil_cliente (usuario_id, telefone, regiao_preferida_id)
     VALUES (?, ?, ?)`,
    usuario_id, telefone, regiao_preferida_id,
  );
}

/** Prestador com conta, perfil e regiao em um objeto so. */
export function prestador(usuarioId) {
  return um(
    `SELECT u.*, p.nome_exibicao, p.descricao, p.regiao_id, p.plano,
            p.janela_confirmacao_min, p.politica_expiracao, p.aprovado_em,
            r.cidade, r.bairro
       FROM usuario u
       JOIN perfil_prestador p ON p.usuario_id = u.id
       LEFT JOIN regiao r ON r.id = p.regiao_id
      WHERE u.id = ?`,
    usuarioId,
  );
}

export function cliente(usuarioId) {
  return um(
    `SELECT u.*, c.telefone, c.regiao_preferida_id
       FROM usuario u
       JOIN perfil_cliente c ON c.usuario_id = u.id
      WHERE u.id = ?`,
    usuarioId,
  );
}

export function atualizarPerfilPrestador(usuarioId, { nome_exibicao, descricao, regiao_id, janela_confirmacao_min, politica_expiracao }) {
  executar(
    `UPDATE perfil_prestador
        SET nome_exibicao = ?, descricao = ?, regiao_id = ?,
            janela_confirmacao_min = ?, politica_expiracao = ?
      WHERE usuario_id = ?`,
    nome_exibicao, descricao, regiao_id, janela_confirmacao_min, politica_expiracao, usuarioId,
  );
}

export function atualizarPerfilCliente(usuarioId, { telefone, regiao_preferida_id }) {
  executar(
    'UPDATE perfil_cliente SET telefone = ?, regiao_preferida_id = ? WHERE usuario_id = ?',
    telefone, regiao_preferida_id, usuarioId,
  );
}

export function registrarAprovacao(usuarioId, adminId, quando) {
  executar(
    'UPDATE perfil_prestador SET aprovado_em = ?, aprovado_por = ? WHERE usuario_id = ?',
    quando, adminId, usuarioId,
  );
}

// -------------------------------------------------------------------- filas

export function prestadoresPendentes() {
  return varios(
    `SELECT u.id, u.nome, u.email, u.criado_em, p.nome_exibicao, p.descricao,
            r.cidade, r.bairro
       FROM usuario u
       JOIN perfil_prestador p ON p.usuario_id = u.id
       LEFT JOIN regiao r ON r.id = p.regiao_id
      WHERE u.estado_conta = 'PENDENTE_APROVACAO'
      ORDER BY u.criado_em`,
  );
}

export function contasEmRevisao() {
  return varios(
    `SELECT u.id, u.nome, u.email, u.perfil, u.estado_conta, u.reputacao,
            p.nome_exibicao
       FROM usuario u
       LEFT JOIN perfil_prestador p ON p.usuario_id = u.id
      WHERE u.estado_conta IN ('EM_REVISAO', 'SUSPENSO')
      ORDER BY u.reputacao ASC`,
  );
}

export function listarPorPerfil(perfil) {
  return varios(
    `SELECT u.id, u.nome, u.email, u.estado_conta, u.reputacao, p.nome_exibicao
       FROM usuario u
       LEFT JOIN perfil_prestador p ON p.usuario_id = u.id
      WHERE u.perfil = ?
      ORDER BY u.nome`,
    perfil,
  );
}

// ------------------------------------------------------------ perfil publico

/** RF-070 - dados publicos: reputacao, volume e taxa de no-show. Sem contato. */
export function resumoPublico(usuarioId) {
  const base = um(
    `SELECT u.id, u.nome, u.perfil, u.reputacao, u.estado_conta, u.criado_em,
            p.nome_exibicao, p.descricao, r.cidade, r.bairro
       FROM usuario u
       LEFT JOIN perfil_prestador p ON p.usuario_id = u.id
       LEFT JOIN regiao r ON r.id = p.regiao_id
      WHERE u.id = ?`,
    usuarioId,
  );
  if (!base) return null;

  const numeros = um(
    `SELECT
       (SELECT COUNT(*) FROM agendamento
         WHERE (cliente_id = ? OR prestador_id = ?) AND estado = 'CONCLUIDO') AS concluidos,
       (SELECT COUNT(*) FROM agendamento
         WHERE (cliente_id = ? AND estado = 'NO_SHOW_CLIENTE')
            OR (prestador_id = ? AND estado = 'NO_SHOW_PRESTADOR')) AS noshows,
       (SELECT COUNT(*) FROM agendamento
         WHERE (cliente_id = ? AND estado = 'CANCELADO_CLIENTE')
            OR (prestador_id = ? AND estado = 'CANCELADO_PRESTADOR')) AS cancelamentos`,
    usuarioId, usuarioId, usuarioId, usuarioId, usuarioId, usuarioId,
  );

  const total = numeros.concluidos + numeros.noshows + numeros.cancelamentos;
  return {
    ...base,
    ...numeros,
    total_encerrados: total,
    taxa_noshow: total > 0 ? Math.round((numeros.noshows / total) * 100) : 0,
  };
}

/** Avaliacoes visiveis recebidas por um usuario (RN-25). */
export function avaliacoesRecebidas(usuarioId, limite = 10) {
  return varios(
    `SELECT a.nota, a.comentario, a.criada_em, u.nome AS autor_nome
       FROM avaliacao a
       JOIN usuario u ON u.id = a.autor_id
      WHERE a.alvo_id = ? AND a.visivel = 1
      ORDER BY a.criada_em DESC
      LIMIT ?`,
    usuarioId, limite,
  );
}
