/**
 * SPEC-002 - cadastro e autenticacao. Um teste por linha da secao 12 da Spec.
 * Cadastro e verificado na aplicacao; login, sessao e logout, pelo HTTP, porque
 * cookie e expiracao so existem ali.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, avancarHoras, T0 } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as reputacao from '../../src/aplicacao/reputacao.js';
import { params } from '../../src/aplicacao/parametros.js';
import * as auditoria from '../../src/infra/auditoria.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import * as parametrosRepo from '../../src/infra/repositorios/parametros.js';
import { um, contar } from '../../src/infra/db/conexao.js';

let servidor;
let base;

test.before(async () => {
  prepararBanco();
  servidor = criarAplicacao();
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

test.beforeEach(prepararBanco);

test.after(() => {
  servidor?.close();
  encerrar();
});

// --------------------------------------------------------------- apoio

const SENHA = 'senha1234';

function cadastrarCliente(email = 'nova@teste.dev', senha = SENHA) {
  return contas.cadastrar({ nome: 'Nova Cliente', email, senha, perfil: 'CLIENTE' });
}

function postar(caminho, campos, cookie = null) {
  return fetch(`${base}${caminho}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: new URLSearchParams(campos),
    redirect: 'manual',
  });
}

function cookieDe(resposta) {
  return (resposta.headers.getSetCookie?.() ?? [])[0]?.split(';')[0] ?? null;
}

async function entrar(email, senha = SENHA) {
  const resposta = await postar('/entrar', { email, senha });
  return { resposta, cookie: cookieDe(resposta), corpo: await resposta.text() };
}

/** true se o cookie ainda identifica alguem: rota autenticada responde 200, e nao redireciona ao login. */
async function autenticado(cookie) {
  const r = await fetch(`${base}/notificacoes`, { headers: { Cookie: cookie }, redirect: 'manual' });
  return r.status === 200;
}

const totalDeSessoes = () => contar('SELECT COUNT(*) AS total FROM sessao');

// ------------------------------------------------------------- cadastro

test('T-CONTA-01a | RF-001: cadastro de cliente nasce ATIVO com reputacao P-08', () => {
  const conta = cadastrarCliente();

  assert.equal(conta.perfil, 'CLIENTE');
  assert.equal(conta.estado_conta, 'ATIVO');
  assert.equal(conta.reputacao, params().reputacao_inicial);
  assert.equal(conta.criado_em, T0);
  assert.ok(um('SELECT 1 AS ok FROM perfil_cliente WHERE usuario_id = ?', conta.id));
});

test('T-CONTA-01b | RN-28: cadastro de prestador nasce PENDENTE_APROVACAO', () => {
  const conta = contas.cadastrar({
    nome: 'Novo Prestador', email: 'novo@prestador.dev', senha: SENHA, perfil: 'PRESTADOR',
  });

  assert.equal(conta.estado_conta, 'PENDENTE_APROVACAO');
  assert.ok(um('SELECT 1 AS ok FROM perfil_prestador WHERE usuario_id = ?', conta.id));
});

test('T-CONTA-01c | RF-002: e-mail repetido e recusado sem vazar dado da conta', () => {
  const existente = contas.cadastrar({
    nome: 'Renata Existente', email: 'repetido@teste.dev', senha: SENHA, perfil: 'PRESTADOR',
  });
  const antes = contar('SELECT COUNT(*) AS total FROM usuario');

  assert.throws(
    () => cadastrarCliente('repetido@teste.dev'),
    (erro) => {
      assert.equal(erro.campo, 'email');
      assert.match(erro.message, /não está disponível/);
      for (const dado of [existente.nome, 'PRESTADOR', 'PENDENTE', 'prestador']) {
        assert.ok(!erro.message.includes(dado), `a mensagem nao pode revelar "${dado}"`);
      }
      return true;
    },
  );
  assert.equal(contar('SELECT COUNT(*) AS total FROM usuario'), antes);
});

test('T-CONTA-01d | RF-001: senha fora da politica e recusada apontando o campo', () => {
  for (const senha of ['curta1', 'somenteletras', '1234567890']) {
    assert.throws(() => cadastrarCliente('fraca@teste.dev', senha), { campo: 'senha' }, senha);
  }
  assert.equal(contar('SELECT COUNT(*) AS total FROM usuario'), 0);
});

test('T-CONTA-01e | RF-001: perfil ADMIN nao pode ser escolhido no cadastro', () => {
  for (const perfil of ['ADMIN', 'admin', 'QUALQUER', '']) {
    assert.throws(
      () => contas.cadastrar({ nome: 'Intrusa', email: 'intrusa@teste.dev', senha: SENHA, perfil }),
      { campo: 'perfil' },
      perfil,
    );
  }
  assert.equal(contar('SELECT COUNT(*) AS total FROM usuario'), 0);
});

test('T-CONTA-01f | RNF-02: senha so existe como hash com sal proprio', () => {
  const a = cadastrarCliente('a@teste.dev');
  const b = cadastrarCliente('b@teste.dev');

  assert.match(a.senha_hash, /^scrypt\$\d+\$[0-9a-f]+\$[0-9a-f]+$/, 'algoritmo e custo ficam versionados no hash');
  assert.notEqual(a.senha_hash, b.senha_hash, 'mesma senha, sal diferente, hash diferente');

  // INV-002: nem a conta, nem a auditoria guardam a senha em texto puro.
  const conta = JSON.stringify(um('SELECT * FROM usuario WHERE id = ?', a.id));
  const trilha = JSON.stringify(auditoria.recentes(50));
  assert.ok(!conta.includes(SENHA));
  assert.ok(!trilha.includes(SENHA));
});

test('T-CONTA-01g | RF-084: criacao de conta gera um registro de auditoria', () => {
  const conta = cadastrarCliente();

  const registros = auditoria.recentes(50).filter((l) => l.entidade_id === conta.id);
  assert.equal(registros.length, 1);
  assert.equal(registros[0].acao, 'CONTA_CRIADA');
  assert.equal(registros[0].estado_anterior, null);
  assert.equal(registros[0].estado_novo, 'ATIVO');
});

test('T-CONTA-01h | RN-23: reputacao inicial usa P-08 vigente no cadastro', () => {
  const antiga = cadastrarCliente('antes@teste.dev');
  parametrosRepo.salvarGlobal('reputacao_inicial', 55, null);
  const nova = cadastrarCliente('depois@teste.dev');

  assert.equal(nova.reputacao, 55);
  assert.equal(usuariosRepo.porId(antiga.id).reputacao, 70, 'mudar P-08 nao retroage (RN-00)');
});

test('T-CONTA-01i | RF-001: cadastro aceito ja sai com sessao valida', async () => {
  for (const perfil of ['CLIENTE', 'PRESTADOR']) {
    const r = await postar('/cadastrar', {
      nome: 'Recem Chegada', email: `${perfil.toLowerCase()}@novo.dev`, senha: SENHA, perfil,
    });
    const cookie = cookieDe(r);

    assert.equal(r.status, 302, perfil);
    assert.ok(cookie, `${perfil}: o cadastro deveria devolver o cookie de sessao`);
    assert.match(r.headers.getSetCookie()[0], /HttpOnly.*SameSite=Lax/);
    assert.ok(await autenticado(cookie), `${perfil}: a sessao do cadastro deveria valer`);
  }

  const recusado = await postar('/cadastrar', {
    nome: 'Sem Sorte', email: 'cliente@novo.dev', senha: SENHA, perfil: 'CLIENTE',
  });
  assert.equal(cookieDe(recusado), null, 'cadastro recusado nao cria sessao');
  assert.equal(totalDeSessoes(), 2);
});

test('T-CONTA-01j | RF-002: e-mail com espacos ou maiusculas e o mesmo e-mail', async () => {
  cadastrarCliente('ana@teste.dev');

  assert.throws(
    () => cadastrarCliente('  Ana@Teste.DEV '),
    (erro) => erro.campo === 'email' && /não está disponível/.test(erro.message),
    'antes da OPEN-208 isto estourava UNIQUE constraint failed',
  );
  const { cookie } = await entrar(' ANA@teste.dev ');
  assert.ok(cookie && await autenticado(cookie), 'o login normaliza o e-mail do mesmo jeito');
});

test('T-CONTA-01k | SPEC-002 INV-004: o banco recusa conta nascida no estado errado', () => {
  const inserirDireto = (perfil, estado) => usuariosRepo.criar({
    nome: 'Atalho', email: `${perfil}-${estado}@teste.dev`, senha_hash: 'x',
    perfil, estado_conta: estado, reputacao: 70, criado_em: T0,
  });

  assert.throws(() => inserirDireto('PRESTADOR', 'ATIVO'), /INV-004/);
  assert.throws(() => inserirDireto('CLIENTE', 'PENDENTE_APROVACAO'), /INV-004/);
  assert.ok(inserirDireto('ADMIN', 'ATIVO'), 'o admin nasce por implantacao (OPEN-206)');

  const prestador = contas.cadastrar({ nome: 'P', email: 'p@teste.dev', senha: SENHA, perfil: 'PRESTADOR' });
  usuariosRepo.atualizarEstadoConta(prestador.id, 'ATIVO');
  assert.equal(usuariosRepo.porId(prestador.id).estado_conta, 'ATIVO', 'o gatilho olha so a criacao');
});

test('T-CONTA-01l | RN-00: mudar P-08 nao altera a reputacao de conta existente', () => {
  const antiga = cadastrarCliente('antiga@teste.dev');
  parametrosRepo.salvarGlobal('reputacao_inicial', 55, null);

  reputacao.recalcular(antiga.id);

  assert.equal(usuariosRepo.porId(antiga.id).reputacao, 70, 'antes da OPEN-207 o recalculo usava a P-08 atual');
  assert.equal(usuariosRepo.porId(antiga.id).reputacao_inicial, 70);
});

// ------------------------------------------------------- login e sessao

test('T-SESSAO-01 | RF-004: login valido cria sessao com cookie HttpOnly e SameSite', async () => {
  cenarioBasico();
  const { resposta, cookie } = await entrar('cliente@teste.dev');

  assert.equal(resposta.status, 302);
  assert.ok(cookie, 'deveria vir um cookie de sessao');
  const bruto = resposta.headers.getSetCookie()[0];
  assert.match(bruto, /HttpOnly/);
  assert.match(bruto, /SameSite=Lax/);
  assert.ok(await autenticado(cookie));
});

test('T-SESSAO-02 | RF-005: credencial invalida devolve mensagem generica identica', async () => {
  cenarioBasico();
  const senhaErrada = await entrar('cliente@teste.dev', 'errada123');
  const emailInexistente = await entrar('ninguem@teste.dev', 'errada123');

  assert.match(senhaErrada.corpo, /E-mail ou senha inválidos/);
  assert.equal(senhaErrada.resposta.status, emailInexistente.resposta.status);
  assert.equal(senhaErrada.corpo, emailInexistente.corpo, 'as duas respostas precisam ser iguais (INV-005)');
  assert.equal(senhaErrada.cookie, null);
  assert.equal(emailInexistente.cookie, null);
  assert.equal(totalDeSessoes(), 0);
});

test('T-SESSAO-03 | RN-28: conta suspensa nao autentica e recebe mensagem propria', async () => {
  const c = cenarioBasico();
  contas.decidirSobreConta({
    adminId: c.adminId, usuarioId: c.cliente.id, decisao: 'SUSPENSO', justificativa: 'Teste de suspensao.',
  });

  const certa = await entrar('cliente@teste.dev');
  assert.equal(certa.cookie, null);
  assert.match(certa.corpo, /conta está suspensa/);
  assert.match(certa.corpo, /RN-28/);

  // Com a senha errada, quem tenta nao fica sabendo que a conta existe e esta suspensa.
  const errada = await entrar('cliente@teste.dev', 'errada123');
  assert.match(errada.corpo, /E-mail ou senha inválidos/);
  assert.doesNotMatch(errada.corpo, /suspensa/);
  assert.equal(totalDeSessoes(), 0);
});

test('T-SESSAO-03b | RN-28: suspender a conta encerra as sessoes abertas', async () => {
  const c = cenarioBasico();
  const { cookie } = await entrar('cliente@teste.dev');
  assert.ok(await autenticado(cookie));

  contas.decidirSobreConta({
    adminId: c.adminId, usuarioId: c.cliente.id, decisao: 'SUSPENSO', justificativa: 'Teste de suspensao.',
  });

  assert.equal(await autenticado(cookie), false);
  assert.equal(totalDeSessoes(), 0);
});

test('T-SESSAO-04a | RNF-02: 2 h sem uso expiram a sessao', async () => {
  cenarioBasico();
  const { cookie } = await entrar('cliente@teste.dev');

  avancarHoras(1.99);
  assert.ok(await autenticado(cookie), 'pouco antes das 2 h a sessao ainda vale');

  avancarHoras(2);
  assert.equal(await autenticado(cookie), false);
  assert.equal(totalDeSessoes(), 0, 'a sessao expirada e apagada no primeiro uso');
});

test('T-SESSAO-04b | RNF-02: cada uso renova o prazo de inatividade', async () => {
  cenarioBasico();
  const { cookie } = await entrar('cliente@teste.dev');

  for (let hora = 1; hora <= 5; hora += 1) {
    avancarHoras(1);
    assert.ok(await autenticado(cookie), `a sessao deveria valer na hora ${hora}`);
  }
});

test('T-SESSAO-04c | RNF-02: 12 h desde o login expiram a sessao mesmo em uso', async () => {
  cenarioBasico();
  const { cookie } = await entrar('cliente@teste.dev');

  for (let hora = 1; hora < 12; hora += 1) {
    avancarHoras(1);
    assert.ok(await autenticado(cookie), `a sessao deveria valer na hora ${hora}`);
  }

  avancarHoras(1);
  assert.equal(await autenticado(cookie), false, 'o teto de 12 h vale mesmo com uso continuo');
});

test('T-SESSAO-04d | RNF-02: a renovacao nao grava no banco a cada requisicao', async () => {
  cenarioBasico();
  const { cookie } = await entrar('cliente@teste.dev');
  const prazo = () => um('SELECT expira_em FROM sessao').expira_em;

  const inicial = prazo();
  avancarHoras(0.5 / 60);
  assert.ok(await autenticado(cookie));
  assert.equal(prazo(), inicial, '30 s depois, o prazo nao e regravado (ADR-004)');

  avancarHoras(1);
  assert.ok(await autenticado(cookie));
  assert.notEqual(prazo(), inicial, 'passado mais de 1 min, a renovacao e gravada');
});

test('T-SESSAO-07 | RF-004: pendente, reprovado, em revisao e restrito autenticam', async () => {
  const c = cenarioBasico();

  const pendente = contas.cadastrar({
    nome: 'Pendente', email: 'pendente@teste.dev', senha: SENHA, perfil: 'PRESTADOR',
  });
  const reprovado = contas.cadastrar({
    nome: 'Reprovado', email: 'reprovado@teste.dev', senha: SENHA, perfil: 'PRESTADOR',
  });
  contas.reprovarPrestador({
    adminId: c.adminId, prestadorId: reprovado.id, justificativa: 'Documentacao incompleta.',
  });
  usuariosRepo.atualizarEstadoConta(c.cliente.id, 'EM_REVISAO');
  usuariosRepo.atualizarEstadoConta(c.cliente2.id, 'RESTRITO');

  const casos = [
    [pendente.email, 'PENDENTE_APROVACAO'],
    [reprovado.email, 'REPROVADO'],
    ['cliente@teste.dev', 'EM_REVISAO'],
    ['cliente2@teste.dev', 'RESTRITO'],
  ];
  for (const [email, estado] of casos) {
    assert.equal(usuariosRepo.porEmail(email).estado_conta, estado);
    const { cookie } = await entrar(email);
    assert.ok(cookie, `${estado} deveria autenticar`);
    assert.ok(await autenticado(cookie), `${estado}: a sessao deveria valer`);
  }
});

test('T-SESSAO-05 | RNF-02: logout revoga a sessao', async () => {
  cenarioBasico();
  const { cookie } = await entrar('cliente@teste.dev');

  const saida = await fetch(`${base}/sair`, { headers: { Cookie: cookie }, redirect: 'manual' });
  assert.match(saida.headers.getSetCookie()[0], /Max-Age=0/);

  assert.equal(await autenticado(cookie), false, 'o mesmo cookie reenviado nao autentica mais');
  assert.equal(totalDeSessoes(), 0);
});

test('T-SESSAO-06 | RNF-03: identificador de sessao forjado nao autentica', async () => {
  cenarioBasico();
  await entrar('cliente@teste.dev');

  for (const forjado of ['encaixe_sid=' + 'a'.repeat(48), 'encaixe_sid=1', 'encaixe_sid=%27%20OR%201%3D1']) {
    assert.equal(await autenticado(forjado), false, forjado);
  }
});
