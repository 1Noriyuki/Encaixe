/**
 * UC-01 (cadastro e aprovacao) e UC-13 (revisao administrativa).
 * Cobre RF-001 a RF-011, RF-078, RF-079. Regras: RN-08, RN-28.
 */

import * as usuarios from '../infra/repositorios/usuarios.js';
import * as catalogo from '../infra/repositorios/catalogo.js';
import * as auditoria from '../infra/auditoria.js';
import { notificar } from '../infra/notificacoes.js';
import { gerarHash, verificar, validarForca } from '../infra/senha.js';
import { transacao } from '../infra/db/conexao.js';
import {
  ErroDeRegra, ErroDeValidacao, ErroDeAutenticacao, NaoEncontrado,
} from '../dominio/erros.js';
import { assegurarTransicao } from '../dominio/estados.js';
import { agoraIso } from '../dominio/tempo.js';
import { params } from './parametros.js';

const PERFIS_PUBLICOS = ['CLIENTE', 'PRESTADOR'];

/**
 * RF-001 a RF-003 - cadastro.
 * Prestador nasce PENDENTE_APROVACAO; cliente ja nasce ATIVO.
 */
export function cadastrar({ nome, email, senha, perfil, nomeExibicao, telefone, regiaoId }) {
  const p = params();

  if (!PERFIS_PUBLICOS.includes(perfil)) {
    throw new ErroDeValidacao('Escolha entre cliente e prestador.', 'perfil');
  }
  if (!String(nome ?? '').trim()) {
    throw new ErroDeValidacao('Informe seu nome.', 'nome');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email ?? '').trim())) {
    throw new ErroDeValidacao('Informe um e-mail válido.', 'email');
  }
  validarForca(senha);

  // RF-002 - nao revela nada sobre a conta existente.
  if (usuarios.emailExiste(email)) {
    throw new ErroDeValidacao('Este e-mail não está disponível.', 'email');
  }

  return transacao(() => {
    const estadoInicial = perfil === 'PRESTADOR' ? 'PENDENTE_APROVACAO' : 'ATIVO';

    const id = usuarios.criar({
      nome: String(nome).trim(),
      email: String(email).trim(),
      senha_hash: gerarHash(senha),
      perfil,
      estado_conta: estadoInicial,
      reputacao: p.reputacao_inicial,
      criado_em: agoraIso(),
    });

    if (perfil === 'PRESTADOR') {
      usuarios.criarPerfilPrestador({
        usuario_id: id,
        nome_exibicao: String(nomeExibicao ?? nome).trim(),
        regiao_id: regiaoId ? Number(regiaoId) : null,
      });
    } else {
      usuarios.criarPerfilCliente({
        usuario_id: id,
        telefone: String(telefone ?? '').trim(),
        regiao_preferida_id: regiaoId ? Number(regiaoId) : null,
      });
    }

    auditoria.registrar({
      atorId: id,
      acao: 'CONTA_CRIADA',
      entidade: 'conta',
      entidadeId: id,
      para: estadoInicial,
      detalhe: { perfil },
    });

    return usuarios.porId(id);
  });
}

/** RF-004 / RF-005 - autenticacao com mensagem generica. */
export function autenticar({ email, senha }) {
  const usuario = usuarios.porEmail(email);
  const generica = 'E-mail ou senha inválidos.';

  // Calcula o hash mesmo quando o usuario nao existe, para nao vazar por tempo de resposta.
  const hashReferencia = usuario?.senha_hash ?? gerarHash('senha-inexistente-1');
  const senhaConfere = verificar(String(senha ?? ''), hashReferencia);

  if (!usuario || !senhaConfere) {
    throw new ErroDeAutenticacao(generica);
  }
  if (usuario.estado_conta === 'REPROVADO') {
    throw new ErroDeAutenticacao('Seu cadastro foi reprovado. Fale com o suporte da plataforma.');
  }

  return usuario;
}

// --------------------------------------------------------------- moderacao

/** RF-008 - aprovacao do prestador pelo admin. */
export function aprovarPrestador({ adminId, prestadorId }) {
  return transacao(() => {
    const prestador = usuarios.porId(prestadorId);
    if (!prestador) throw new NaoEncontrado('Prestador não encontrado.');

    assegurarTransicao('conta', prestador.estado_conta, 'ATIVO');
    usuarios.atualizarEstadoConta(prestadorId, 'ATIVO');
    usuarios.registrarAprovacao(prestadorId, adminId, agoraIso());

    auditoria.registrar({
      atorId: adminId,
      acao: 'PRESTADOR_APROVADO',
      entidade: 'conta',
      entidadeId: prestadorId,
      de: prestador.estado_conta,
      para: 'ATIVO',
    });

    notificar(prestadorId, {
      tipo: 'CADASTRO_APROVADO',
      titulo: 'Cadastro aprovado',
      mensagem: 'Seu cadastro foi aprovado. Complete o perfil, cadastre um serviço e uma régua '
        + 'de desconto para começar a publicar horários.',
    });

    return usuarios.porId(prestadorId);
  });
}

/** RF-009 - reprovacao exige justificativa. */
export function reprovarPrestador({ adminId, prestadorId, justificativa }) {
  const motivo = String(justificativa ?? '').trim();
  if (motivo.length < 10) {
    throw new ErroDeValidacao('Descreva o motivo da reprovação (mínimo 10 caracteres).', 'justificativa');
  }

  return transacao(() => {
    const prestador = usuarios.porId(prestadorId);
    if (!prestador) throw new NaoEncontrado('Prestador não encontrado.');

    assegurarTransicao('conta', prestador.estado_conta, 'REPROVADO');
    usuarios.atualizarEstadoConta(prestadorId, 'REPROVADO');

    auditoria.registrar({
      atorId: adminId,
      acao: 'PRESTADOR_REPROVADO',
      entidade: 'conta',
      entidadeId: prestadorId,
      de: prestador.estado_conta,
      para: 'REPROVADO',
      detalhe: { justificativa: motivo },
    });

    notificar(prestadorId, {
      tipo: 'CADASTRO_REPROVADO',
      titulo: 'Cadastro reprovado',
      mensagem: motivo,
    });

    return usuarios.porId(prestadorId);
  });
}

/** RF-079 - decisao do admin sobre conta em revisao (UC-13). */
export function decidirSobreConta({ adminId, usuarioId, decisao, justificativa }) {
  const motivo = String(justificativa ?? '').trim();
  if (motivo.length < 10) {
    throw new ErroDeValidacao('Registre a justificativa da decisão (mínimo 10 caracteres).', 'justificativa');
  }
  if (!['ATIVO', 'SUSPENSO'].includes(decisao)) {
    throw new ErroDeValidacao('Decisão inválida.', 'decisao');
  }

  return transacao(() => {
    const usuario = usuarios.porId(usuarioId);
    if (!usuario) throw new NaoEncontrado('Conta não encontrada.');

    assegurarTransicao('conta', usuario.estado_conta, decisao);
    usuarios.atualizarEstadoConta(usuarioId, decisao);

    auditoria.registrar({
      atorId: adminId,
      acao: decisao === 'ATIVO' ? 'CONTA_REATIVADA' : 'CONTA_SUSPENSA',
      entidade: 'conta',
      entidadeId: usuarioId,
      de: usuario.estado_conta,
      para: decisao,
      detalhe: { justificativa: motivo },
    });

    notificar(usuarioId, {
      tipo: decisao === 'ATIVO' ? 'CONTA_REATIVADA' : 'CONTA_SUSPENSA',
      titulo: decisao === 'ATIVO' ? 'Sua conta foi reativada' : 'Sua conta foi suspensa',
      mensagem: motivo,
    });

    return usuarios.porId(usuarioId);
  });
}

// ------------------------------------------------------------------ perfis

/** RF-010 - perfil do prestador, incluindo os parametros que sao dele (P-01, P-02). */
export function salvarPerfilPrestador({ prestadorId, nomeExibicao, descricao, regiaoId, janelaConfirmacaoMin, politicaExpiracao }) {
  const nome = String(nomeExibicao ?? '').trim();
  if (!nome) throw new ErroDeValidacao('Informe o nome de exibição.', 'nomeExibicao');

  const janela = Number(janelaConfirmacaoMin);
  if (!Number.isInteger(janela) || janela < 5 || janela > 60) {
    throw new ErroDeValidacao('A janela de confirmação deve ficar entre 5 e 60 minutos.', 'janelaConfirmacaoMin');
  }
  if (!['LIBERAR', 'AUTOCONFIRMAR'].includes(politicaExpiracao)) {
    throw new ErroDeValidacao('Política de expiração inválida.', 'politicaExpiracao');
  }

  usuarios.atualizarPerfilPrestador(prestadorId, {
    nome_exibicao: nome,
    descricao: String(descricao ?? '').trim(),
    regiao_id: regiaoId ? Number(regiaoId) : null,
    janela_confirmacao_min: janela,
    politica_expiracao: politicaExpiracao,
  });

  auditoria.registrar({
    atorId: prestadorId,
    acao: 'PERFIL_PRESTADOR_ATUALIZADO',
    entidade: 'conta',
    entidadeId: prestadorId,
    detalhe: { janela, politicaExpiracao },
  });

  return usuarios.prestador(prestadorId);
}

export function salvarPerfilCliente({ clienteId, telefone, regiaoId }) {
  usuarios.atualizarPerfilCliente(clienteId, {
    telefone: String(telefone ?? '').trim(),
    regiao_preferida_id: regiaoId ? Number(regiaoId) : null,
  });
  return usuarios.cliente(clienteId);
}

/** RN-08 / RF-011 - o que ainda falta para o prestador poder publicar. */
export function pendenciasDoPrestador(prestadorId) {
  return catalogo.prestadorEstaCompleto(prestadorId);
}

/** RF-070 - perfil publico: reputacao e historico agregado, sem dados de contato. */
export function perfilPublico(usuarioId) {
  const resumo = usuarios.resumoPublico(usuarioId);
  if (!resumo) throw new NaoEncontrado('Perfil não encontrado.');
  return { ...resumo, avaliacoes: usuarios.avaliacoesRecebidas(usuarioId) };
}

/** RN-08 - barreira usada antes de qualquer publicacao. */
export function assegurarPodePublicar(prestadorId) {
  const prestador = usuarios.porId(prestadorId);
  if (!prestador) throw new NaoEncontrado('Prestador não encontrado.');

  if (prestador.estado_conta === 'PENDENTE_APROVACAO') {
    throw new ErroDeRegra('RN-28', 'Seu cadastro ainda aguarda aprovação do administrador.');
  }
  if (prestador.estado_conta === 'EM_REVISAO') {
    throw new ErroDeRegra(
      'RN-21',
      'Sua conta está em revisão e não pode publicar novos horários até a decisão do administrador. '
      + 'Os agendamentos já confirmados seguem valendo.',
    );
  }
  if (prestador.estado_conta !== 'ATIVO') {
    throw new ErroDeRegra('RN-08', `Conta ${prestador.estado_conta.toLowerCase()} não pode publicar horários.`);
  }

  const { completo, faltando } = catalogo.prestadorEstaCompleto(prestadorId);
  if (!completo) {
    throw new ErroDeRegra(
      'RN-08',
      `Complete seu cadastro antes de publicar: falta ${faltando.join(', ')}.`,
      { faltando },
    );
  }

  return prestador;
}
