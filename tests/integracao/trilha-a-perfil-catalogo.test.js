/**
 * Evidências da Trilha A para T-15, T-16 e T-17.
 * Os testes validam a baseline já existente. SPEC-007 e SPEC-009 ainda
 * dependem do ciclo SDD e não ficam automaticamente aprovadas por este arquivo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as usuarios from '../../src/infra/repositorios/usuarios.js';
import { contar } from '../../src/infra/db/conexao.js';
import { ErroDeAutorizacao, ErroDeRegra } from '../../src/dominio/erros.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-PERFIL-01 | RF-010/RN-10: janela e politica validas sao persistidas no perfil', () => {
  const c = cenarioBasico();
  const alterado = contas.salvarPerfilPrestador({
    prestadorId: c.prestador.id, nomeExibicao: 'Salão Atualizado',
    descricao: 'Atendimento local', regiaoId: c.regiao.id,
    janelaConfirmacaoMin: 30, politicaExpiracao: 'AUTOCONFIRMAR',
  });
  assert.equal(alterado.nome_exibicao, 'Salão Atualizado');
  assert.equal(alterado.janela_confirmacao_min, 30);
  assert.equal(alterado.politica_expiracao, 'AUTOCONFIRMAR');
  assert.equal(usuarios.prestador(c.prestador.id).janela_confirmacao_min, 30);
});

test('T-PERFIL-02 | RF-010/RN-10: janela fora de 5 a 60 minutos e recusada', () => {
  const c = cenarioBasico();
  for (const janela of [4, 61, 15.5]) {
    assert.throws(
      () => contas.salvarPerfilPrestador({
        prestadorId: c.prestador.id, nomeExibicao: 'Salão',
        regiaoId: c.regiao.id, janelaConfirmacaoMin: janela, politicaExpiracao: 'LIBERAR',
      }),
      (erro) => erro.campo === 'janelaConfirmacaoMin',
    );
  }
  assert.equal(usuarios.prestador(c.prestador.id).janela_confirmacao_min, 15);
});

test('T-PERFIL-03 | RF-010/RN-10: politica desconhecida e recusada sem gravar', () => {
  const c = cenarioBasico();
  assert.throws(
    () => contas.salvarPerfilPrestador({
      prestadorId: c.prestador.id, nomeExibicao: 'Salão',
      regiaoId: c.regiao.id, janelaConfirmacaoMin: 20, politicaExpiracao: 'QUALQUER',
    }),
    (erro) => erro.campo === 'politicaExpiracao',
  );
  assert.equal(usuarios.prestador(c.prestador.id).janela_confirmacao_min, 15);
  assert.equal(usuarios.prestador(c.prestador.id).politica_expiracao, 'LIBERAR');
});

test('T-PUBLICAR-01 | RF-011/RN-08: prestador incompleto recebe lista de pendencias', () => {
  const c = cenarioBasico();
  const novo = contas.cadastrar({
    nome: 'Novo Prestador', email: 'novo@teste.dev',
    senha: 'senha1234', perfil: 'PRESTADOR',
  });
  contas.aprovarPrestador({ adminId: c.adminId, prestadorId: novo.id });

  const pendencias = contas.pendenciasDoPrestador(novo.id);
  assert.equal(pendencias.completo, false);
  assert.ok(pendencias.faltando.includes('regiao de atendimento'));
  assert.ok(pendencias.faltando.includes('ao menos um servico'));
  assert.ok(pendencias.faltando.includes('uma regua de desconto com faixas'));

  assert.throws(
    () => contas.assegurarPodePublicar(novo.id),
    (erro) => erro instanceof ErroDeRegra && erro.regra === 'RN-08'
      && pendencias.faltando.every((item) => erro.detalhes.faltando.includes(item)),
  );
});

test('T-PUBLICAR-02 | RF-011/RN-08: prestador completo tem publicacao liberada', () => {
  const c = cenarioBasico();
  assert.deepEqual(contas.pendenciasDoPrestador(c.prestador.id), { completo: true, faltando: [] });
  assert.equal(contas.assegurarPodePublicar(c.prestador.id).id, c.prestador.id);
});

test('T-PUBLICAR-03 | RN-21/RN-28: conta pendente ou em revisao nao publica', () => {
  const c = cenarioBasico();
  const novo = contas.cadastrar({
    nome: 'Pendente', email: 'pendente@teste.dev', senha: 'senha1234', perfil: 'PRESTADOR',
  });
  assert.throws(
    () => contas.assegurarPodePublicar(novo.id),
    (erro) => erro.regra === 'RN-28',
  );

  usuarios.atualizarEstadoConta(c.prestador.id, 'EM_REVISAO');
  assert.throws(
    () => contas.assegurarPodePublicar(c.prestador.id),
    (erro) => erro.regra === 'RN-21',
  );
});

test('T-SERVICO-01 | RF-012: servico valido guarda duracao, categoria e centavos', () => {
  const c = cenarioBasico();
  const antes = contar('SELECT COUNT(*) AS total FROM servico');
  const servico = catalogo.salvarServico({
    prestadorId: c.prestador.id, nome: 'Barba',
    categoriaId: c.categoria.id, duracaoMin: 45,
    precoBase: '90,00', precoMinimo: '55,00',
  });
  assert.equal(servico.duracao_min, 45);
  assert.equal(servico.preco_base, 9000);
  assert.equal(servico.preco_minimo, 5500);
  assert.equal(servico.categoria_id, c.categoria.id);
  assert.equal(contar('SELECT COUNT(*) AS total FROM servico'), antes + 1);
});

test('T-SERVICO-02 | RF-013: editar e desativar servico conserva integridade do registro', () => {
  const c = cenarioBasico();
  const alterado = catalogo.salvarServico({
    prestadorId: c.prestador.id, servicoId: c.servico.id, nome: 'Corte especial',
    categoriaId: c.categoria.id, duracaoMin: 75,
    precoBase: '120,00', precoMinimo: '60,00',
  });
  assert.equal(alterado.nome, 'Corte especial');
  assert.equal(alterado.duracao_min, 75);
  assert.equal(alterado.preco_base, 12000);

  catalogo.desativarServico({ prestadorId: c.prestador.id, servicoId: c.servico.id });
  assert.equal(catalogo.servicoPorId(c.servico.id).ativo, 0);
  assert.ok(catalogo.servicosDoPrestador(c.prestador.id).some((s) => s.id === c.servico.id));
});

test('T-SERVICO-03 | RF-012: duracao invalida ou piso maior que preco-base e recusado', () => {
  const c = cenarioBasico();
  const entrada = {
    prestadorId: c.prestador.id, nome: 'Corte',
    categoriaId: c.categoria.id, precoBase: '100,00', precoMinimo: '50,00',
  };
  for (const duracaoMin of [0, 7, -5, 12.5]) {
    assert.throws(
      () => catalogo.salvarServico({ ...entrada, duracaoMin }),
      (erro) => erro.campo === 'duracaoMin',
    );
  }
  assert.throws(
    () => catalogo.salvarServico({ ...entrada, duracaoMin: 30, precoMinimo: '101,00' }),
    (erro) => erro.campo === 'precoMinimo',
  );
});

test('T-SERVICO-04 | RF-013/RNF-03: outro prestador nao edita nem desativa servico alheio', () => {
  const c = cenarioBasico();
  const outro = contas.cadastrar({
    nome: 'Outro Prestador', email: 'outro@prestador.dev',
    senha: 'senha1234', perfil: 'PRESTADOR',
  });
  assert.throws(
    () => catalogo.salvarServico({
      prestadorId: outro.id, servicoId: c.servico.id, nome: 'Invasão',
      categoriaId: c.categoria.id, duracaoMin: 30,
      precoBase: '100,00', precoMinimo: '20,00',
    }),
    (erro) => erro instanceof ErroDeAutorizacao,
  );
  assert.throws(
    () => catalogo.desativarServico({ prestadorId: outro.id, servicoId: c.servico.id }),
    (erro) => erro instanceof ErroDeAutorizacao,
  );
  assert.equal(catalogo.servicoPorId(c.servico.id).ativo, 1);
});
