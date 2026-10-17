/**
 * SPEC-001 - cobertura estrutural das maquinas atuais e dos CHECKs do banco.
 *
 * Estes testes verificam a implementacao existente. Nao equivalem a aprovacao
 * das transicoes extras identificadas nas OPEN-06/08/15, ainda pendentes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assegurarTransicao,
  podeTransicionar,
  ESTADOS_AGENDAMENTO,
  ESTADOS_HORARIO,
  ESTADOS_CONTA,
  ESTADOS_DISPUTA,
} from '../../src/dominio/estados.js';
import { ErroDeRegra } from '../../src/dominio/erros.js';
import { prepararBanco, encerrar } from '../apoio/cenario.js';
import { um } from '../../src/infra/db/conexao.js';

const MAQUINAS = {
  agendamento: ESTADOS_AGENDAMENTO,
  horario: ESTADOS_HORARIO,
  conta: ESTADOS_CONTA,
  disputa: ESTADOS_DISPUTA,
};

test('T-ESTADO-01 | INV-13: toda transicao declarada na implementacao e aceita', () => {
  for (const [maquina, estados] of Object.entries(MAQUINAS)) {
    for (const [origem, destinos] of Object.entries(estados)) {
      for (const destino of destinos) {
        assert.equal(podeTransicionar(maquina, origem, destino), true);
        assert.equal(assegurarTransicao(maquina, origem, destino), destino);
      }
    }
  }
});

test('T-ESTADO-02 | INV-13: transicao nao declarada e recusada em todas as maquinas', () => {
  for (const [maquina, estados] of Object.entries(MAQUINAS)) {
    const nomes = Object.keys(estados);
    const terminal = nomes.find((estado) => estados[estado].length === 0);
    assert.ok(terminal, `${maquina} deve ter estado terminal`);
    const destino = nomes.find((estado) => estado !== terminal);
    assert.throws(
      () => assegurarTransicao(maquina, terminal, destino),
      (erro) => erro instanceof ErroDeRegra
        && erro.regra === 'INV-13'
        && erro.detalhes.maquina === maquina
        && erro.detalhes.de === terminal
        && erro.detalhes.para === destino,
      maquina,
    );
  }
});

test('T-ESTADO-03 | INV-13: quatro entidades possuem CHECK para seus estados no SQLite', () => {
  prepararBanco();
  try {
    for (const [tabela, coluna] of [
      ['usuario', 'estado_conta'],
      ['horario_vago', 'estado'],
      ['agendamento', 'estado'],
      ['disputa', 'estado'],
    ]) {
      const sql = um('SELECT sql FROM sqlite_master WHERE type = ? AND name = ?', 'table', tabela)?.sql;
      assert.ok(sql, `tabela ${tabela} deve existir`);
      assert.match(sql, new RegExp(`\\b${coluna}\\s+TEXT\\s+NOT NULL\\s+CHECK\\s*\\(`, 'i'));
    }
  } finally {
    encerrar();
  }
});
