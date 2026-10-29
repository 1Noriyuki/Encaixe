/** SPEC-007: evidência dos critérios de aceitação do catálogo de serviços (CA-01 a CA-08). */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as horariosRepo from '../../src/infra/repositorios/horarios.js';
import * as auditoria from '../../src/infra/auditoria.js';
import { contar, executar } from '../../src/infra/db/conexao.js';
import { ErroDeAutorizacao, ErroDeValidacao } from '../../src/dominio/erros.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

const totalServicos = () => contar('SELECT COUNT(*) AS total FROM servico');

function entrada(c, extra = {}) {
  return {
    prestadorId: c.prestador.id, nome: 'Escova', categoriaId: c.categoria.id,
    duracaoMin: 40, precoBase: '80,50', precoMinimo: '30,00', ...extra,
  };
}

function outroPrestador() {
  return contas.cadastrar({
    nome: 'Outro Prestador', email: 'outro@prestador.dev', senha: 'senha1234', perfil: 'PRESTADOR',
  });
}

test('T-SPEC007-01 | RF-012: criar serviço com categoria existente, nome válido, duração múltiplo de 5 e base/piso em centavos', () => {
  const c = cenarioBasico();
  const antes = totalServicos();
  const s = catalogo.salvarServico(entrada(c, { nome: '  Escova  ' }));
  assert.equal(s.nome, 'Escova');
  assert.equal(s.prestador_id, c.prestador.id);
  assert.equal(s.categoria_id, c.categoria.id);
  assert.equal(s.duracao_min, 40);
  assert.equal(s.preco_base, 8050);
  assert.equal(s.preco_minimo, 3000);
  assert.equal(s.ativo, 1);
  assert.equal(totalServicos(), antes + 1);
});

test('T-SPEC007-02 | RF-012: rejeitar nome vazio, duração zero, fracionária ou não múltipla de cinco', () => {
  const c = cenarioBasico();
  const antes = totalServicos();
  for (const nome of ['', '   ', null]) {
    assert.throws(() => catalogo.salvarServico(entrada(c, { nome })),
      (e) => e instanceof ErroDeValidacao && e.campo === 'nome');
  }
  for (const duracaoMin of [0, 12.5, 7, -10, 'abc']) {
    assert.throws(() => catalogo.salvarServico(entrada(c, { duracaoMin })),
      (e) => e instanceof ErroDeValidacao && e.campo === 'duracaoMin');
  }
  assert.equal(totalServicos(), antes);
});

test('T-SPEC007-03 | RF-012: rejeitar preço-base não positivo e preço mínimo acima da base sem gravar', () => {
  const c = cenarioBasico();
  const antes = totalServicos();
  for (const precoBase of ['0', '0,00', '-10,00', -10, 'abc']) {
    assert.throws(() => catalogo.salvarServico(entrada(c, { precoBase })),
      (e) => e instanceof ErroDeValidacao && e.campo === 'precoBase');
  }
  for (const precoMinimo of ['50,01', -5, 'abc']) {
    assert.throws(() => catalogo.salvarServico(entrada(c, { precoBase: '50,00', precoMinimo })),
      (e) => e instanceof ErroDeValidacao && e.campo === 'precoMinimo');
  }
  assert.equal(totalServicos(), antes);
});

test('T-SPEC007-04 | RF-012: editar serviço mantém seu identificador e só altera seus dados atuais', () => {
  const c = cenarioBasico();
  const snapshot = horariosRepo.porId(c.horario.id).preco_base_snapshot;
  const editado = catalogo.salvarServico(entrada(c, {
    servicoId: c.servico.id, nome: 'Corte premium', duracaoMin: 90, precoBase: '150,00',
  }));
  assert.equal(editado.id, c.servico.id);
  assert.equal(editado.nome, 'Corte premium');
  assert.equal(editado.duracao_min, 90);
  assert.equal(editado.preco_base, 15000);
  assert.equal(totalServicos(), 1);
  // O horário já publicado guarda o preço da publicação (INV-004, RN-00).
  assert.equal(horariosRepo.porId(c.horario.id).preco_base_snapshot, snapshot);
  assert.equal(horariosRepo.porId(c.horario.id).duracao_min, 60);
});

test('T-SPEC007-05 | RF-012: desativação marca ativo=0 sem excluir nem reescrever históricos', () => {
  const c = cenarioBasico();
  const antes = { ...catalogo.servicoPorId(c.servico.id) };
  const horario = { ...horariosRepo.porId(c.horario.id) };
  catalogo.desativarServico({ prestadorId: c.prestador.id, servicoId: c.servico.id });
  const depois = { ...catalogo.servicoPorId(c.servico.id) };
  assert.equal(depois.ativo, 0);
  assert.deepEqual({ ...depois, ativo: 1 }, antes);
  assert.equal(totalServicos(), 1);
  assert.deepEqual({ ...horariosRepo.porId(c.horario.id) }, horario);
  assert.deepEqual(contas.pendenciasDoPrestador(c.prestador.id).faltando, ['ao menos um servico']);
});

test('T-SPEC007-06 | RF-012: prestador a não edita/desativa serviço de b', () => {
  const c = cenarioBasico();
  const outro = outroPrestador();
  const antes = { ...catalogo.servicoPorId(c.servico.id) };
  assert.throws(
    () => catalogo.salvarServico(entrada(c, { prestadorId: outro.id, servicoId: c.servico.id, nome: 'Invasão' })),
    (e) => e instanceof ErroDeAutorizacao && !/Corte|Salao/.test(e.message),
  );
  assert.throws(
    () => catalogo.desativarServico({ prestadorId: outro.id, servicoId: c.servico.id }),
    (e) => e instanceof ErroDeAutorizacao,
  );
  assert.deepEqual({ ...catalogo.servicoPorId(c.servico.id) }, antes);
  assert.equal(auditoria.historicoDe('servico', c.servico.id)
    .filter((l) => l.ator_id === outro.id).length, 0);
});

test('T-SPEC007-07 | RF-012: categoria não cadastrada é recusada', () => {
  const c = cenarioBasico();
  const antes = totalServicos();
  for (const categoriaId of [9999, null, 'x']) {
    assert.throws(() => catalogo.salvarServico(entrada(c, { categoriaId })),
      (e) => e instanceof ErroDeValidacao && e.campo === 'categoriaId');
  }
  assert.throws(
    () => catalogo.salvarServico(entrada(c, { servicoId: c.servico.id, categoriaId: 9999 })),
    (e) => e.campo === 'categoriaId',
  );
  assert.equal(totalServicos(), antes);
  assert.equal(catalogo.servicoPorId(c.servico.id).categoria_id, c.categoria.id);
});

test('T-SPEC007-08 | RF-012: operações bem-sucedidas são auditadas e atomicamente persistidas', () => {
  const c = cenarioBasico();
  const s = catalogo.salvarServico(entrada(c));
  catalogo.salvarServico(entrada(c, { servicoId: s.id, nome: 'Escova longa' }));
  catalogo.desativarServico({ prestadorId: c.prestador.id, servicoId: s.id });
  const acoes = auditoria.historicoDe('servico', s.id).map((l) => [l.acao, l.ator_id]);
  assert.deepEqual(acoes.map(([a]) => a).sort(), ['SERVICO_ATUALIZADO', 'SERVICO_CRIADO', 'SERVICO_DESATIVADO']);
  assert.ok(acoes.every(([, ator]) => ator === c.prestador.id));

  // Falha na auditoria desfaz a criação: nada fica gravado pela metade (INV-001).
  const antes = totalServicos();
  executar(`CREATE TRIGGER sem_auditoria_servico BEFORE INSERT ON log_auditoria
    WHEN NEW.acao = 'SERVICO_CRIADO' BEGIN SELECT RAISE(ABORT, 'auditoria fora'); END`);
  assert.throws(() => catalogo.salvarServico(entrada(c, { nome: 'Hidratação' })), /auditoria fora/);
  assert.equal(totalServicos(), antes);
});
