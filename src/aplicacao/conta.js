/**
 * A propria conta do usuario - SPEC-030, RF-087 a RF-095.
 *
 * Tudo aqui age sobre a conta de quem esta autenticado: o id vem da sessao,
 * nunca do formulario, entao nao ha titularidade a conferir alem dela (RF-006).
 * A exclusao de conta e a fase 2 da SPEC-030 e ainda nao mora aqui.
 */

import * as usuarios from '../infra/repositorios/usuarios.js';
import * as catalogo from '../infra/repositorios/catalogo.js';
import * as agendamentosRepo from '../infra/repositorios/agendamentos.js';
import * as social from '../infra/repositorios/social.js';
import * as fotos from '../infra/fotos.js';
import * as auditoria from '../infra/auditoria.js';
import { gerarHash, verificar, validarForca } from '../infra/senha.js';
import { transacao } from '../infra/db/conexao.js';
import { ErroDeRegra, ErroDeValidacao, NaoEncontrado } from '../dominio/erros.js';
import { agoraIso } from '../dominio/tempo.js';

/**
 * ADR-007: teto do arquivo da foto. E limite tecnico de upload, como o teto do
 * corpo de formulario no servidor, e nao numero de regra de negocio - por isso
 * nao mora na tabela `parametro`.
 */
export const FOTO_MAX_BYTES = 2 * 1024 * 1024;
const NOME_MAX = 80;
const TELEFONE_MAX = 20;

function carregar(usuarioId) {
  const usuario = usuarios.porId(usuarioId);
  if (!usuario) throw new NaoEncontrado('Conta não encontrada.');
  return usuario;
}

/** Conta, perfil do papel e regiao, prontos para a tela de configuracoes. */
export function minhaConta(usuarioId) {
  const usuario = carregar(usuarioId);
  const cliente = usuario.perfil === 'CLIENTE' ? usuarios.cliente(usuarioId) : null;
  return {
    ...usuario,
    telefone: cliente?.telefone ?? null,
    regiao_preferida_id: cliente?.regiao_preferida_id ?? null,
    outrasSessoes: Math.max(0, usuarios.contarSessoes(usuarioId) - 1),
  };
}

/**
 * RF-087 - nome, e no cliente tambem telefone e regiao preferida. O e-mail nao
 * entra: trocar o login com seguranca exigiria confirmar o endereco novo, e o
 * sistema nao envia e-mail. Registros ja gravados com o nome antigo ficam como
 * estao (a auditoria e imutavel, RNF-07).
 */
export function salvarDadosPessoais({ usuarioId, nome, telefone, regiaoId }) {
  const usuario = carregar(usuarioId);

  const nomeLimpo = String(nome ?? '').trim().replace(/\s+/g, ' ');
  if (nomeLimpo.length < 2) throw new ErroDeValidacao('Informe seu nome.', 'nome');
  if (nomeLimpo.length > NOME_MAX) {
    throw new ErroDeValidacao(`O nome pode ter até ${NOME_MAX} caracteres.`, 'nome');
  }

  const ehCliente = usuario.perfil === 'CLIENTE';
  const telefoneLimpo = String(telefone ?? '').trim();
  if (ehCliente && telefoneLimpo.length > TELEFONE_MAX) {
    throw new ErroDeValidacao(`O telefone pode ter até ${TELEFONE_MAX} caracteres.`, 'telefone');
  }
  if (ehCliente && regiaoId && !catalogo.regiaoPorId(Number(regiaoId))) {
    throw new ErroDeValidacao('Escolha uma região da lista.', 'regiaoId');
  }

  return transacao(() => {
    usuarios.atualizarNome(usuarioId, nomeLimpo);
    if (ehCliente) {
      usuarios.atualizarPerfilCliente(usuarioId, {
        telefone: telefoneLimpo,
        regiao_preferida_id: regiaoId ? Number(regiaoId) : null,
      });
    }
    // So os nomes dos campos: o valor e dado pessoal e nao vai para a trilha.
    auditoria.registrar({
      atorId: usuarioId,
      acao: 'DADOS_PESSOAIS_ATUALIZADOS',
      entidade: 'conta',
      entidadeId: usuarioId,
      detalhe: { campos: ehCliente ? ['nome', 'telefone', 'regiao'] : ['nome'] },
    });
    return minhaConta(usuarioId);
  });
}

/**
 * RF-088 / RF-089 - a foto so entra se for JPEG, PNG ou WebP pelo conteudo e
 * couber no teto. Recusada, a foto anterior fica como estava.
 */
export function salvarFoto({ usuarioId, conteudo, excedeuLimite = false }) {
  const usuario = carregar(usuarioId);
  const limiteMb = FOTO_MAX_BYTES / (1024 * 1024);

  if (excedeuLimite || (conteudo && conteudo.length > FOTO_MAX_BYTES)) {
    throw new ErroDeRegra('RF-089', `A foto passa de ${limiteMb} MB. Envie uma imagem menor; a foto atual não mudou.`);
  }
  if (!conteudo || conteudo.length === 0) {
    throw new ErroDeRegra('RF-089', 'Escolha um arquivo de imagem antes de enviar.');
  }
  const formato = fotos.detectarFormato(conteudo);
  if (!formato) {
    throw new ErroDeRegra('RF-089',
      'O arquivo não é uma imagem JPEG, PNG ou WebP. O formato é conferido pelo conteúdo, '
      + 'não pela extensão do nome; a foto atual não mudou.');
  }

  const nome = fotos.gravar(conteudo, formato);
  try {
    transacao(() => {
      usuarios.atualizarFoto(usuarioId, nome);
      auditoria.registrar({
        atorId: usuarioId, acao: 'FOTO_ATUALIZADA', entidade: 'conta', entidadeId: usuarioId,
        detalhe: { formato, bytes: conteudo.length },
      });
    });
  } catch (erro) {
    fotos.apagar(nome); // banco recusou: o arquivo novo nao pode ficar orfao
    throw erro;
  }
  fotos.apagar(usuario.foto);
  return nome;
}

/** RF-090 - sem foto, a interface volta as iniciais. */
export function removerFoto({ usuarioId }) {
  const usuario = carregar(usuarioId);
  if (!usuario.foto) return;
  transacao(() => {
    usuarios.atualizarFoto(usuarioId, null);
    auditoria.registrar({
      atorId: usuarioId, acao: 'FOTO_REMOVIDA', entidade: 'conta', entidadeId: usuarioId,
    });
  });
  fotos.apagar(usuario.foto);
}

/**
 * RF-091 - troca de senha. Pede a senha atual, para que uma sessao esquecida
 * aberta nao baste para tomar a conta, e derruba as outras sessoes: quem tinha
 * a senha antiga perde o acesso na hora. A sessao de quem trocou continua.
 */
export function trocarSenha({ usuarioId, sessaoAtualId, senhaAtual, novaSenha, confirmacao }) {
  const usuario = carregar(usuarioId);

  if (!verificar(String(senhaAtual ?? ''), usuario.senha_hash)) {
    throw new ErroDeRegra('RF-091', 'A senha atual não confere. Nada foi alterado.');
  }
  if (String(novaSenha ?? '') !== String(confirmacao ?? '')) {
    throw new ErroDeValidacao('A confirmação não é igual à nova senha.', 'confirmacao');
  }
  validarForca(novaSenha);
  if (verificar(String(novaSenha), usuario.senha_hash)) {
    throw new ErroDeValidacao('A nova senha precisa ser diferente da atual.', 'novaSenha');
  }

  transacao(() => {
    usuarios.atualizarSenha(usuarioId, gerarHash(String(novaSenha)));
    usuarios.encerrarOutrasSessoes(usuarioId, sessaoAtualId);
    auditoria.registrar({
      atorId: usuarioId, acao: 'SENHA_ALTERADA', entidade: 'conta', entidadeId: usuarioId,
    });
  });
}

/** RF-092 - encerra as sessoes de outros aparelhos e devolve quantas eram. */
export function sairDosOutrosAparelhos({ usuarioId, sessaoAtualId }) {
  carregar(usuarioId);
  const outras = Math.max(0, usuarios.contarSessoes(usuarioId) - 1);
  transacao(() => {
    usuarios.encerrarOutrasSessoes(usuarioId, sessaoAtualId);
    auditoria.registrar({
      atorId: usuarioId, acao: 'OUTRAS_SESSOES_ENCERRADAS', entidade: 'conta', entidadeId: usuarioId,
      detalhe: { encerradas: outras },
    });
  });
  return outras;
}

/** RF-095 - os eventos que formaram a reputacao, do mais recente ao mais antigo (RN-23). */
export function historicoDeReputacao(usuarioId) {
  const usuario = carregar(usuarioId);
  return {
    atual: usuario.reputacao,
    inicial: usuario.reputacao_inicial,
    eventos: social.eventosDoUsuario(usuarioId),
  };
}

/**
 * RF-094 - copia dos dados pessoais do titular (LGPD, art. 18, II e V).
 * Leva o que e dele; da contraparte de cada agendamento vai so o nome, nunca
 * e-mail ou telefone. O hash da senha nao sai em hipotese nenhuma.
 */
export function exportarDados(usuarioId) {
  const usuario = carregar(usuarioId);
  const geradoEm = agoraIso();

  let perfil = null;
  let agendamentos = [];
  if (usuario.perfil === 'CLIENTE') {
    const c = usuarios.cliente(usuarioId);
    const regiao = c?.regiao_preferida_id ? catalogo.regiaoPorId(c.regiao_preferida_id) : null;
    perfil = {
      telefone: c?.telefone ?? '',
      regiao_preferida: regiao ? `${regiao.bairro}, ${regiao.cidade}` : null,
    };
    agendamentos = agendamentosRepo.doCliente(usuarioId).map((a) => resumoDeAgendamento(a, 'cliente'));
  } else if (usuario.perfil === 'PRESTADOR') {
    const p = usuarios.prestador(usuarioId);
    perfil = {
      nome_exibicao: p?.nome_exibicao ?? null,
      descricao: p?.descricao ?? '',
      regiao: p?.bairro ? `${p.bairro}, ${p.cidade}` : null,
      janela_confirmacao_min: p?.janela_confirmacao_min ?? null,
      politica_expiracao: p?.politica_expiracao ?? null,
    };
    agendamentos = agendamentosRepo.doPrestador(usuarioId).map((a) => resumoDeAgendamento(a, 'prestador'));
  }

  const dados = {
    formato: 'encaixe/dados-pessoais@1',
    gerado_em: geradoEm,
    conta: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      estado_conta: usuario.estado_conta,
      criado_em: usuario.criado_em,
      reputacao: usuario.reputacao,
      reputacao_inicial: usuario.reputacao_inicial,
      tem_foto: Boolean(usuario.foto),
    },
    perfil,
    agendamentos,
    avaliacoes_feitas: usuarios.avaliacoesFeitas(usuarioId),
    avaliacoes_recebidas: usuarios.avaliacoesRecebidas(usuarioId, 1000),
    eventos_de_reputacao: social.eventosDoUsuario(usuarioId),
    notificacoes: social.notificacoesDoUsuario(usuarioId, 1000)
      .map(({ tipo, titulo, mensagem, criada_em, lida_em }) => ({ tipo, titulo, mensagem, criada_em, lida_em })),
  };

  auditoria.registrar({
    atorId: usuarioId, acao: 'DADOS_EXPORTADOS', entidade: 'conta', entidadeId: usuarioId,
  });
  return dados;
}

function resumoDeAgendamento(a, papel) {
  return {
    id: a.id,
    papel,
    estado: a.estado,
    servico: a.servico_nome,
    inicio: a.inicio,
    valor_travado_centavos: a.valor_travado,
    contraparte: papel === 'cliente' ? (a.nome_exibicao ?? a.prestador_nome) : a.cliente_nome,
  };
}
