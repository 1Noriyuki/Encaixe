/** SPEC-009: evidência dos critérios de aceitação do perfil e da elegibilidade (CA-01 a CA-09). */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as horarios from '../../src/aplicacao/horarios.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as usuarios from '../../src/infra/repositorios/usuarios.js';
import * as agRepo from '../../src/infra/repositorios/agendamentos.js';
import * as auditoria from '../../src/infra/auditoria.js';
import { salvarGlobal } from '../../src/aplicacao/parametros.js';
import { ErroDeRegra, ErroDeValidacao } from '../../src/dominio/erros.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

let sequencia = 0;
function novoPrestador() {
  sequencia += 1;
  return contas.cadastrar({
    nome: `Prestador ${sequencia}`, email: `p${sequencia}@teste.dev`, senha: 'senha1234', perfil: 'PRESTADOR',
  });
}

function perfil(c, extra = {}) {
  return {
    prestadorId: c.prestador.id, nomeExibicao: 'Salão', descricao: '', regiaoId: c.regiao.id,
    janelaConfirmacaoMin: 20, politicaExpiracao: 'LIBERAR', ...extra,
  };
}

/** Deixa um prestador com tudo o que a RN-08 pede: nome, região, serviço e régua. */
function completar(c, prestadorId) {
  contas.salvarPerfilPrestador({ ...perfil(c), prestadorId });
  catalogo.salvarServico({
    prestadorId, nome: 'Corte', categoriaId: c.categoria.id, duracaoMin: 30, precoBase: '50,00', precoMinimo: '',
  });
  catalogo.salvarRegua({ prestadorId, nome: 'Régua', faixas: [{ antecedencia_min: 120, percentual_desconto: 10 }] });
}

test('T-SPEC009-01 | RF-010: novo perfil herda p-01/p-02 globais do momento do cadastro', () => {
  cenarioBasico();
  salvarGlobal('janela_confirmacao_min', 30, null);
  salvarGlobal('politica_expiracao', 'AUTOCONFIRMAR', null);
  const novo = novoPrestador();
  const p = usuarios.prestador(novo.id);
  assert.equal(p.janela_confirmacao_min, 30);
  assert.equal(p.politica_expiracao, 'AUTOCONFIRMAR');
  assert.equal(novo.estado_conta, 'PENDENTE_APROVACAO');
});

test('T-SPEC009-02 | RF-010: mudanças posteriores nos padrões globais não alteram o perfil já criado', () => {
  cenarioBasico();
  salvarGlobal('janela_confirmacao_min', 30, null);
  const novo = novoPrestador();
  salvarGlobal('janela_confirmacao_min', 45, null);
  salvarGlobal('politica_expiracao', 'AUTOCONFIRMAR', null);
  const p = usuarios.prestador(novo.id);
  assert.equal(p.janela_confirmacao_min, 30);
  assert.equal(p.politica_expiracao, 'LIBERAR');
});

test('T-SPEC009-03 | RF-010: perfil aceita valores p-01 5 e 60 e apenas políticas permitidas', () => {
  const c = cenarioBasico();
  for (const [janela, politica] of [[5, 'LIBERAR'], [60, 'AUTOCONFIRMAR']]) {
    const salvo = contas.salvarPerfilPrestador(perfil(c, { janelaConfirmacaoMin: janela, politicaExpiracao: politica }));
    assert.equal(salvo.janela_confirmacao_min, janela);
    assert.equal(salvo.politica_expiracao, politica);
  }
  assert.equal(auditoria.historicoDe('conta', c.prestador.id)
    .filter((l) => l.acao === 'PERFIL_PRESTADOR_ATUALIZADO').length >= 2, true);
});

test('T-SPEC009-04 | RF-010: perfil rejeita nome vazio, valor de janela fora da faixa e política inválida', () => {
  const c = cenarioBasico();
  const antes = { ...usuarios.prestador(c.prestador.id) };
  const casos = [
    [{ nomeExibicao: '   ' }, 'nomeExibicao'],
    [{ janelaConfirmacaoMin: 4 }, 'janelaConfirmacaoMin'],
    [{ janelaConfirmacaoMin: 61 }, 'janelaConfirmacaoMin'],
    [{ janelaConfirmacaoMin: 10.5 }, 'janelaConfirmacaoMin'],
    [{ politicaExpiracao: 'CANCELAR' }, 'politicaExpiracao'],
    // Decisão da §13, item 3: região inválida é sempre recusada.
    [{ regiaoId: 9999 }, 'regiaoId'],
  ];
  for (const [extra, campo] of casos) {
    assert.throws(() => contas.salvarPerfilPrestador(perfil(c, extra)),
      (e) => e instanceof ErroDeValidacao && e.campo === campo, `campo ${campo}`);
  }
  assert.deepEqual({ ...usuarios.prestador(c.prestador.id) }, antes);
});

test('T-SPEC009-05 | RF-010: sem região/serviço/régua retorna lista completa de pendências', () => {
  const c = cenarioBasico();
  const novo = novoPrestador();
  contas.aprovarPrestador({ adminId: c.adminId, prestadorId: novo.id });
  assert.deepEqual(contas.pendenciasDoPrestador(novo.id), {
    completo: false,
    faltando: ['regiao de atendimento', 'ao menos um servico', 'uma regua de desconto com faixas'],
  });
  assert.throws(() => contas.assegurarPodePublicar(novo.id),
    (e) => e instanceof ErroDeRegra && e.regra === 'RN-08' && e.detalhes.faltando.length === 3);
});

test('T-SPEC009-06 | RF-010: prestador completo e ativo pode publicar', () => {
  const c = cenarioBasico();
  const novo = novoPrestador();
  contas.aprovarPrestador({ adminId: c.adminId, prestadorId: novo.id });
  completar(c, novo.id);
  assert.deepEqual(contas.pendenciasDoPrestador(novo.id), { completo: true, faltando: [] });
  assert.equal(contas.assegurarPodePublicar(novo.id).estado_conta, 'ATIVO');
});

test('T-SPEC009-07 | RF-010: prestador pendente não publica, embora possa configurar catálogo', () => {
  const c = cenarioBasico();
  const novo = novoPrestador();
  completar(c, novo.id);
  assert.equal(contas.pendenciasDoPrestador(novo.id).completo, true);
  assert.equal(catalogo.servicosDoPrestador(novo.id).length, 1);
  assert.throws(() => contas.assegurarPodePublicar(novo.id), (e) => e.regra === 'RN-28');
});

test('T-SPEC009-08 | RF-010: conta em revisão não publica e informa o motivo', () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  usuarios.atualizarEstadoConta(c.prestador.id, 'EM_REVISAO');
  assert.throws(() => contas.assegurarPodePublicar(c.prestador.id),
    (e) => e.regra === 'RN-21' && /revisão/.test(e.message));
  // O agendamento já confirmado continua valendo (§5, item 6).
  assert.equal(agRepo.porId(ag.id).estado, 'CONFIRMADO');
});

test('T-SPEC009-09 | RF-010: suspenso/reprovado não publica, independentemente da completude', () => {
  const c = cenarioBasico();
  assert.equal(contas.pendenciasDoPrestador(c.prestador.id).completo, true);
  for (const estado of ['SUSPENSO', 'REPROVADO']) {
    usuarios.atualizarEstadoConta(c.prestador.id, estado);
    assert.throws(() => contas.assegurarPodePublicar(c.prestador.id),
      (e) => e instanceof ErroDeRegra && e.regra === 'RN-08' && e.message.includes(estado.toLowerCase()));
  }
  assert.throws(() => horarios.publicar({
    prestadorId: c.prestador.id, servicoId: c.servico.id, reguaId: c.regua.id, data: '2026-12-01', hora: '10:00',
  }), (e) => e instanceof ErroDeRegra);
});
