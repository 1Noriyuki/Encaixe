/**
 * SPEC-001 CA-11 / INV-007: o estado de cada entidade e protegido tambem no
 * banco. O T-ESTADO-03 confere que o CHECK existe no esquema; este grava de
 * verdade, por fora do dominio, e exige que o proprio SQLite recuse.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';
import { executar, um } from '../../src/infra/db/conexao.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as disputas from '../../src/aplicacao/disputas.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-ESTADO-03b | INV-13: gravacao direta de estado inexistente e rejeitada pelo banco', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  const d = disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'SERVICO_NAO_REALIZADO',
    evidencia: 'Print da conversa em que o prestador avisa que nao ia comparecer.',
  });

  for (const [tabela, coluna, id] of [
    ['usuario', 'estado_conta', c.cliente.id],
    ['horario_vago', 'estado', c.horario.id],
    ['agendamento', 'estado', ag.id],
    ['disputa', 'estado', d.id],
  ]) {
    const antes = um(`SELECT ${coluna} AS estado FROM ${tabela} WHERE id = ?`, id).estado;
    assert.throws(
      () => executar(`UPDATE ${tabela} SET ${coluna} = 'INEXISTENTE' WHERE id = ?`, id),
      /CHECK constraint failed/,
      tabela,
    );
    assert.equal(um(`SELECT ${coluna} AS estado FROM ${tabela} WHERE id = ?`, id).estado, antes, tabela);
  }
});
