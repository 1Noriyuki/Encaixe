/**
 * T-67 - INV-13: toda transicao de estado tem registro em LogAuditoria.
 *
 * Em vez de conferir fluxo por fluxo, gatilhos SQLite gravam TODA mudanca de
 * estado das cinco entidades do RF-084 numa tabela espia. Depois de percorrer
 * os fluxos, cada mudanca espiada precisa de um registro de auditoria com a
 * mesma entidade, id e estados. Transicao feita em silencio aparece aqui.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  prepararBanco, encerrar, cenarioBasico, viajarPara, publicarDaquiA,
} from '../apoio/cenario.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import * as horarios from '../../src/aplicacao/horarios.js';
import * as reputacao from '../../src/aplicacao/reputacao.js';
import * as rotinas from '../../src/aplicacao/rotinas.js';
import { executar, varios } from '../../src/infra/db/conexao.js';
import { TIPO_EVENTO } from '../../src/dominio/reputacao.js';
import { adicionarHoras, adicionarMinutos } from '../../src/dominio/tempo.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

const ESPIADAS = [
  // [tabela, coluna de estado, entidade na auditoria]
  ['agendamento', 'estado', 'agendamento'],
  ['horario_vago', 'estado', 'horario'],
  ['usuario', 'estado_conta', 'conta'],
  ['disputa', 'estado', 'disputa'],
  // RF-084 inclui o lancamento de comissao (SPEC-029).
  ['lancamento_comissao', 'estado', 'comissao'],
];

function espiarTransicoes() {
  executar(`CREATE TEMP TABLE mudanca (
    seq INTEGER PRIMARY KEY, entidade TEXT, entidade_id INTEGER, de TEXT, para TEXT)`);
  for (const [tabela, coluna, entidade] of ESPIADAS) {
    executar(`CREATE TEMP TRIGGER espia_${tabela} AFTER UPDATE OF ${coluna} ON ${tabela}
      WHEN OLD.${coluna} IS NOT NEW.${coluna}
      BEGIN
        INSERT INTO mudanca (entidade, entidade_id, de, para)
        VALUES ('${entidade}', NEW.id, OLD.${coluna}, NEW.${coluna});
      END`);
  }
}

function transicoesSemAuditoria() {
  return varios(`
    SELECT m.* FROM mudanca m
     WHERE NOT EXISTS (
       SELECT 1 FROM log_auditoria l
        WHERE l.entidade_tipo = m.entidade AND l.entidade_id = m.entidade_id
          AND l.estado_anterior = m.de AND l.estado_novo = m.para)
     ORDER BY m.seq`);
}

function assegurarTudoAuditado(minimo) {
  const total = varios('SELECT COUNT(*) AS n FROM mudanca')[0].n;
  assert.ok(total >= minimo, `os fluxos deveriam ter produzido ao menos ${minimo} transicoes (houve ${total})`);
  assert.deepEqual(transicoesSemAuditoria(), [], 'toda transicao precisa de registro de auditoria');
}

test('T-AUDIT-05 | INV-13: reserva, confirmacao, conclusao e disputa nao mudam estado sem registro', () => {
  espiarTransicoes();
  const c = cenarioBasico({ horasAteHorario: 2 });

  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  const disputa = disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'OUTRO',
    evidencia: 'Evidencia suficiente para abrir a disputa auditada.',
  });
  disputas.assumir({ adminId: c.adminId, disputaId: disputa.id });
  disputas.resolver({
    adminId: c.adminId, disputaId: disputa.id, desfecho: 'REVERTIDO',
    justificativa: 'O prestador nao comprovou o atendimento.',
  });

  assegurarTudoAuditado(8);
});

test('T-AUDIT-06 | INV-13: recusa, cancelamento, expiracao, no-show e rotinas nao mudam estado sem registro', () => {
  espiarTransicoes();
  const c = cenarioBasico({ horasAteHorario: 2 });
  const [h2, h3, h4, h5, h6] = [4, 6, 8, 10, 14].map((h) => publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, h));
  // h7 ninguem reserva: a rotina o expira. h6 fica confirmado sem conclusao: a rotina conclui.
  publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 12);
  const esquecido = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: h6.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: esquecido.id });

  const recusada = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: h2.id });
  agendamentos.recusar({ prestadorId: c.prestador.id, agendamentoId: recusada.id, motivo: 'Agenda indisponivel' });

  const cancelada = agendamentos.reservar({ clienteId: c.cliente2.id, horarioId: h3.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: cancelada.id });
  agendamentos.cancelar({ usuarioId: c.prestador.id, agendamentoId: cancelada.id, motivo: 'Imprevisto' });

  horarios.cancelarHorarioLivre({ prestadorId: c.prestador.id, horarioId: h5.id });

  const expirada = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: h4.id });
  const ausente = agendamentos.reservar({ clienteId: c.cliente2.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ausente.id });
  viajarPara(adicionarMinutos(expirada.prazo_confirmacao_em, 1));
  rotinas.executar();

  viajarPara(adicionarHoras(c.horario.inicio, 0.5));
  agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: ausente.id });

  // Dias depois: as rotinas encerram o que sobrou (horarios vencidos, prazos).
  viajarPara(adicionarHoras(c.horario.inicio, 24 * 10));
  rotinas.executar();

  assert.equal(varios("SELECT estado FROM agendamento WHERE id = ?", esquecido.id)[0].estado, 'CONCLUIDO');
  assert.ok(varios("SELECT 1 FROM mudanca WHERE entidade = 'horario' AND para = 'EXPIRADO'").length >= 1);
  assegurarTudoAuditado(16);
});

test('T-AUDIT-07 | INV-13: estado da conta so muda com registro, por regra ou por decisao do admin', () => {
  espiarTransicoes();
  const c = cenarioBasico();

  const pendente = contas.cadastrar({
    nome: 'Prestador Pendente', email: 'pendente@teste.dev', senha: 'senha1234',
    perfil: 'PRESTADOR', nomeExibicao: 'Espaco Pendente', regiaoId: c.regiao.id,
  });
  contas.reprovarPrestador({
    adminId: c.adminId, prestadorId: pendente.id, justificativa: 'Documentacao incompleta no cadastro.',
  });
  for (const delta of [-25, -10]) {
    reputacao.aplicarEvento({
      usuarioId: c.cliente.id, tipo: TIPO_EVENTO.AJUSTE_ADMIN, delta,
      origemTipo: 'ajuste_admin', origemId: c.adminId,
    });
  }
  contas.decidirSobreConta({
    adminId: c.adminId, usuarioId: c.cliente.id, decisao: 'SUSPENSO', justificativa: 'Fraude confirmada em disputa.',
  });

  assegurarTudoAuditado(5);
});
