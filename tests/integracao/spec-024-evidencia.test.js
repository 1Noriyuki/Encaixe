/**
 * SPEC-024: evidência dos critérios de aceitação do extrato do prestador (CA-01 a CA-08).
 *
 * Cenário padrão: base R$ 100, régua (240 min, 20%) e (60 min, 35%), comissão 12%.
 * Reserva a 3 h do horário → R$ 80, comissão R$ 9,60, líquido R$ 70,40.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara, publicarDaquiA } from '../apoio/cenario.js';
import { adicionarHoras, adicionarDias, agoraIso } from '../../src/dominio/tempo.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import * as financeiro from '../../src/infra/repositorios/financeiro.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';

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

function concluir(c, { horario = c.horario, clienteId = c.cliente.id, prestadorId = c.prestador.id, cobranca } = {}) {
  const ag = agendamentos.reservar({ clienteId, horarioId: horario.id });
  agendamentos.confirmar({ prestadorId, agendamentoId: ag.id });
  viajarPara(adicionarHoras(horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId, agendamentoId: ag.id, estadoCobranca: cobranca });
  return ag;
}

function contestar(c, ag) {
  return disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'SERVICO_NAO_REALIZADO',
    relato: 'Não fui atendido.', evidencia: 'Mensagem do prestador cancelando no dia.',
  });
}

/** Segundo prestador completo e aprovado, com um horário a 3 h. */
function outroPrestador(c) {
  const p = contas.cadastrar({
    nome: 'Barbearia B', email: 'b@prestador.dev', senha: 'senha1234', perfil: 'PRESTADOR',
  });
  contas.aprovarPrestador({ adminId: c.adminId, prestadorId: p.id });
  contas.salvarPerfilPrestador({
    prestadorId: p.id, nomeExibicao: 'Barbearia B', regiaoId: c.regiao.id,
    janelaConfirmacaoMin: 15, politicaExpiracao: 'LIBERAR',
  });
  const servico = catalogo.salvarServico({
    prestadorId: p.id, nome: 'Barba', categoriaId: c.categoria.id, duracaoMin: 30, precoBase: '50,00', precoMinimo: '',
  });
  const regua = catalogo.salvarRegua({
    prestadorId: p.id, nome: 'B', faixas: [{ antecedencia_min: 240, percentual_desconto: 10 }],
  });
  return { prestador: p, horario: publicarDaquiA(p.id, servico.id, regua.id, 3) };
}

test('T-SPEC024-01 | RF-061: o extrato lista apenas lançamentos do prestador autenticado', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const b = outroPrestador(c);
  const agB = agendamentos.reservar({ clienteId: c.cliente2.id, horarioId: b.horario.id });
  agendamentos.confirmar({ prestadorId: b.prestador.id, agendamentoId: agB.id });
  const agA = concluir(c);
  agendamentos.concluir({ prestadorId: b.prestador.id, agendamentoId: agB.id });
  assert.deepEqual(financeiro.extratoPrestador(c.prestador.id).map((l) => l.agendamento_id), [agA.id]);
  assert.deepEqual(financeiro.extratoPrestador(b.prestador.id).map((l) => l.agendamento_id), [agB.id]);
  assert.equal(financeiro.totaisPrestador(c.prestador.id).bruto, 8000);
});

test('T-SPEC024-02 | RF-061: valores em centavos preservam identidade bruto = comissão + líquido', () => {
  const c = cenarioBasico({ horasAteHorario: 3, precoBase: '87,35' });
  concluir(c);
  const [l] = financeiro.extratoPrestador(c.prestador.id);
  for (const v of [l.valor_bruto, l.valor_comissao, l.valor_liquido]) assert.ok(Number.isInteger(v));
  assert.equal(l.valor_bruto, l.valor_comissao + l.valor_liquido);
  const t = financeiro.totaisPrestador(c.prestador.id);
  assert.equal(t.bruto, t.comissao + t.liquido);
});

test('T-SPEC024-03 | RF-062: comissão retida aparece como categoria separada', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  contestar(c, concluir(c));
  const [l] = financeiro.extratoPrestador(c.prestador.id);
  assert.equal(l.estado, 'RETIDO');
  const t = financeiro.totaisPrestador(c.prestador.id);
  assert.equal(t.qtd, 0);
  assert.equal(t.liquido, 0);
  assert.equal(t.retido_qtd, 1);
  assert.equal(t.retido_liquido, 7040);
});

test('T-SPEC024-04 | RF-062: lançamento estornado permanece histórico sem somar disponível', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const ag = concluir(c);
  const d = contestar(c, ag);
  disputas.resolver({
    adminId: c.adminId, disputaId: d.id, desfecho: 'REVERTIDO', justificativa: 'Evidência conclusiva do cliente.',
  });
  const linhas = financeiro.extratoPrestador(c.prestador.id);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].estado, 'ESTORNADO');
  assert.equal(linhas[0].valor_bruto, 8000);
  const t = financeiro.totaisPrestador(c.prestador.id);
  assert.equal(t.liquido, 0);
  assert.equal(t.retido_liquido, 0);
});

test('T-SPEC024-05 | RF-061: filtro de período exclui lançamentos fora da janela', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  concluir(c);
  const primeiro = agoraIso();
  viajarPara(adicionarDias(primeiro, 10));
  const segundo = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 3);
  contestar(c, concluir(c, { horario: segundo }));

  const janela = { de: adicionarDias(primeiro, 5), ate: agoraIso() };
  assert.equal(financeiro.extratoPrestador(c.prestador.id).length, 2);
  assert.deepEqual(financeiro.extratoPrestador(c.prestador.id, janela).map((l) => l.estado), ['RETIDO']);
  const t = financeiro.totaisPrestador(c.prestador.id, janela);
  assert.equal(t.qtd, 0);
  assert.equal(t.retido_qtd, 1);
  const antes = financeiro.totaisPrestador(c.prestador.id, { ate: adicionarDias(primeiro, 5) });
  assert.equal(antes.qtd, 1);
  assert.equal(antes.retido_qtd, 0);
});

test('T-SPEC024-06 | RF-061: total zero usa estrutura válida sem nan ou divisão inválida', () => {
  const c = cenarioBasico();
  assert.deepEqual(financeiro.extratoPrestador(c.prestador.id), []);
  const t = financeiro.totaisPrestador(c.prestador.id);
  for (const chave of ['qtd', 'bruto', 'comissao', 'liquido', 'retido_qtd', 'retido_liquido']) {
    assert.equal(t[chave], 0, chave);
  }
});

test('T-SPEC024-07 | RN-33: estados de cobrança e comissão são apresentados separadamente', () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  concluir(c, { cobranca: 'NAO_PAGO' });
  const [l] = financeiro.extratoPrestador(c.prestador.id);
  // Não pago na cobrança não muda o lançamento: a comissão segue efetivada.
  assert.equal(l.estado_cobranca, 'NAO_PAGO');
  assert.equal(l.estado, 'EFETIVADO');
  assert.equal(financeiro.totaisPrestador(c.prestador.id).liquido, 7040);
});

test('T-SPEC024-08 | RNF-03: acesso a extrato de outro prestador é recusado', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const b = outroPrestador(c);
  concluir(c);
  const entrar = async (email) => {
    const r = await fetch(`${base}/entrar`, {
      method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, senha: 'senha1234' }),
    });
    return r.headers.getSetCookie()[0].split(';')[0];
  };
  const pegar = (caminho, cookie) => fetch(`${base}${caminho}`, { headers: { Cookie: cookie }, redirect: 'manual' });

  const deA = await (await pegar('/prestador/extrato', await entrar('prestador@teste.dev'))).text();
  assert.match(deA, /70,40/);
  // O extrato não recebe identificador: B só vê o próprio, mesmo tentando apontar para A.
  const cookieB = await entrar('b@prestador.dev');
  const deB = await (await pegar(`/prestador/extrato?prestadorId=${c.prestador.id}`, cookieB)).text();
  assert.doesNotMatch(deB, /70,40|Cliente Teste/);
  // Cliente não acessa a área do prestador.
  const doCliente = await pegar('/prestador/extrato', await entrar('cliente@teste.dev'));
  assert.equal(doCliente.status, 403);
});
