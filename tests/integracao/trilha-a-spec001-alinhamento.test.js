/**
 * Trilha A — SPEC-001 v1.1.0: decisões humanas da etapa 22 do SDD.
 * Testa as regras aprovadas sem antecipar regras das Specs posteriores.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import { normalizarParametro } from '../../src/dominio/parametros.js';
import { podeTransicionar, assegurarTransicao, ESTADOS_HORARIO } from '../../src/dominio/estados.js';
import { salvarGlobal } from '../../src/aplicacao/parametros.js';
import { cadastrar } from '../../src/aplicacao/contas.js';
import * as usuarios from '../../src/infra/repositorios/usuarios.js';
import { executar, um } from '../../src/infra/db/conexao.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-PARAM-08 | RN-00 / OPEN-20: P-07 aceita 0,5 h, mas não valores fora da faixa', () => {
  assert.equal(normalizarParametro('cancelamento_total_h', '0,5'), 0.5);
  assert.equal(normalizarParametro('cancelamento_total_h', 0.5), 0.5);
  assert.equal(salvarGlobal('cancelamento_total_h', 0.5, null), 0.5);
  for (const valor of [0.49, 6.01, '1abc', '0.5.5', -1]) {
    assert.throws(() => normalizarParametro('cancelamento_total_h', valor), (e) => e.regra === 'RN-00');
  }
});

test('T-PARAM-05 | RN-00 / OPEN-103: prestador nasce com P-01/P-02 vigentes', () => {
  salvarGlobal('janela_confirmacao_min', 30, null);
  salvarGlobal('politica_expiracao', 'AUTOCONFIRMAR', null);
  const primeiro = cadastrar({
    nome: 'Prestador Regra', email: 'prestador-regra@teste.dev',
    senha: 'senha1234', perfil: 'PRESTADOR',
  });
  assert.equal(usuarios.prestador(primeiro.id).janela_confirmacao_min, 30);
  assert.equal(usuarios.prestador(primeiro.id).politica_expiracao, 'AUTOCONFIRMAR');

  salvarGlobal('janela_confirmacao_min', 45, null);
  salvarGlobal('politica_expiracao', 'LIBERAR', null);
  const segundo = cadastrar({
    nome: 'Prestador Novo', email: 'prestador-novo@teste.dev',
    senha: 'senha1234', perfil: 'PRESTADOR',
  });
  assert.equal(usuarios.prestador(segundo.id).janela_confirmacao_min, 45);
  assert.equal(usuarios.prestador(segundo.id).politica_expiracao, 'LIBERAR');
  // Os parâmetros do perfil existente não são alterados retroativamente.
  assert.equal(usuarios.prestador(primeiro.id).janela_confirmacao_min, 30);
  assert.equal(usuarios.prestador(primeiro.id).politica_expiracao, 'AUTOCONFIRMAR');
});

test('T-ESTADO-04 | INV-13 / OPEN-08: a máquina de horários não possui RASCUNHO', () => {
  assert.equal(Object.hasOwn(ESTADOS_HORARIO, 'RASCUNHO'), false);
  assert.equal(podeTransicionar('horario', 'BLOQUEADO', 'CANCELADO'), false);
  assert.throws(
    () => assegurarTransicao('horario', 'BLOQUEADO', 'CANCELADO'),
    (erro) => erro.regra === 'INV-13',
  );
});

test('T-ESTADO-05 | INV-13 / OPEN-08: conta em revisão não muda para restrita', () => {
  assert.equal(podeTransicionar('conta', 'EM_REVISAO', 'RESTRITO'), false);
  assert.throws(
    () => assegurarTransicao('conta', 'EM_REVISAO', 'RESTRITO'),
    (erro) => erro.regra === 'INV-13',
  );
});

test('T-ESTADO-06 | INV-13: o SQLite recusa RASCUNHO e mantém o horário publicado', () => {
  const c = cenarioBasico();
  assert.throws(
    () => executar("UPDATE horario_vago SET estado = 'RASCUNHO' WHERE id = ?", c.horario.id),
  );
  assert.equal(um('SELECT estado FROM horario_vago WHERE id = ?', c.horario.id).estado, 'PUBLICADO');
});
