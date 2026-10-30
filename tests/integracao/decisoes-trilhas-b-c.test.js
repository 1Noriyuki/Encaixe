/**
 * Etapa 63: as decisões da §13 das Specs das Trilhas B e C que mudaram código.
 * O ID diz a Spec e a questão: T-SPEC025-Q3 é a questão 3 da §13 da SPEC-025.
 *
 * Cenário padrão: base R$ 100, régua (240 min, 20%) e (60 min, 35%), atendimento de 60 min.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara, agoraDoTeste, publicarDaquiA } from '../apoio/cenario.js';
import { adicionarHoras, adicionarMinutos } from '../../src/dominio/tempo.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as reputacao from '../../src/aplicacao/reputacao.js';
import * as rotinas from '../../src/aplicacao/rotinas.js';
import * as busca from '../../src/aplicacao/busca.js';
import * as agRepo from '../../src/infra/repositorios/agendamentos.js';
import * as usuarios from '../../src/infra/repositorios/usuarios.js';
import * as interpretacoesRepo from '../../src/infra/repositorios/interpretacoes.js';
import * as social from '../../src/infra/repositorios/social.js';
import * as auditoria from '../../src/infra/auditoria.js';
import { salvarGlobal } from '../../src/aplicacao/parametros.js';
import { definirProvedor, restaurarProvedor } from '../../src/infra/llm/index.js';
import { STATUS } from '../../src/infra/llm/contrato.js';
import { executar } from '../../src/infra/db/conexao.js';
import { TIPO_EVENTO } from '../../src/dominio/reputacao.js';
import { ErroDeRegra } from '../../src/dominio/erros.js';
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
test.afterEach(restaurarProvedor);
test.after(() => {
  servidor?.close();
  encerrar();
});

const suspender = (c, usuarioId) => contas.decidirSobreConta({
  adminId: c.adminId, usuarioId, decisao: 'SUSPENSO', justificativa: 'Conduta em análise pela moderação.',
});

// ------------------------------------------------------------- SPEC-025

test('T-SPEC025-Q3 | RN-28: a suspensão expira as reservas pendentes do prestador sem penalizar o cliente', () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  const segundo = publicarDaquiA(c.prestador.id, c.servico.id, c.regua.id, 8);
  const confirmado = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: confirmado.id });
  const pendente = agendamentos.reservar({ clienteId: c.cliente2.id, horarioId: segundo.id });
  const reputacaoAntes = usuarios.porId(c.cliente2.id).reputacao;

  suspender(c, c.prestador.id);

  assert.equal(agRepo.porId(confirmado.id).estado, 'CONFIRMADO', 'a RN-28 preserva os confirmados');
  const expirada = agRepo.porId(pendente.id);
  assert.equal(expirada.estado, 'EXPIRADO');
  assert.equal(usuarios.porId(c.cliente2.id).reputacao, reputacaoAntes);
  const log = auditoria.historicoDe('agendamento', pendente.id).find((l) => l.acao === 'RESERVA_EXPIRADA');
  assert.equal(log.ator_id, c.adminId);
  assert.equal(log.detalhe.regra, 'RN-28');
  const aviso = social.notificacoesDoUsuario(c.cliente2.id).find((n) => n.tipo === 'RESERVA_EXPIRADA');
  assert.match(aviso.mensagem, /suspensa.*não foi penalizado/s);
  // O horário liberado não volta para a busca enquanto a conta estiver suspensa.
  assert.equal(busca.buscarPorFiltros({ janelaHoras: 72 }).some((h) => h.id === segundo.id), false);
});

test('T-SPEC025-Q3b | RN-10: conta que não está ATIVO não autoconfirma ao vencer a janela', () => {
  const c = cenarioBasico({ horasAteHorario: 5, politicaExpiracao: 'AUTOCONFIRMAR' });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  usuarios.atualizarEstadoConta(c.prestador.id, 'EM_REVISAO');
  viajarPara(adicionarMinutos(agRepo.porId(ag.id).prazo_confirmacao_em, 1));
  rotinas.executar();
  assert.equal(agRepo.porId(ag.id).estado, 'EXPIRADO');
});

test('T-SPEC025-Q2 | RN-28: o admin não suspende a própria conta, mas suspende outro admin', () => {
  const c = cenarioBasico();
  assert.throws(() => suspender(c, c.adminId), (e) => e instanceof ErroDeRegra && e.regra === 'RN-28');
  assert.equal(usuarios.porId(c.adminId).estado_conta, 'ATIVO');

  const outroAdmin = usuarios.criar({
    nome: 'Outro Admin', email: 'admin2@teste.dev', senha_hash: 'x', perfil: 'ADMIN',
    estado_conta: 'ATIVO', reputacao: 100, criado_em: agoraDoTeste(),
  });
  suspender(c, outroAdmin);
  assert.equal(usuarios.porId(outroAdmin).estado_conta, 'SUSPENSO');
});

// ------------------------------------------------------------- SPEC-013

test('T-SPEC013-Q1 | RF-031: "menor preço" ordena a janela inteira antes de cortar os 200 exibidos', () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  // 205 horários de 5 min, em sequência, a partir de 6 h daqui; o último é o mais barato.
  executar('UPDATE servico SET duracao_min = 5 WHERE id = ?', c.servico.id);
  const inicio0 = adicionarHoras(agoraDoTeste(), 6);
  let ultimo = null;
  for (let i = 0; i < 205; i += 1) {
    const preco = i === 204 ? 5000 : 10000;
    executar(
      `INSERT INTO horario_vago (prestador_id, servico_id, regua_id, inicio, duracao_min,
         preco_base_snapshot, preco_minimo_snapshot, estado, criado_em)
       VALUES (?, ?, ?, ?, 5, ?, 0, 'PUBLICADO', ?)`,
      c.prestador.id, c.servico.id, c.regua.id, adicionarMinutos(inicio0, i * 5), preco, agoraDoTeste(),
    );
    if (i === 204) ultimo = adicionarMinutos(inicio0, i * 5);
  }
  const lista = busca.buscarPorFiltros({ ordenar: 'preco', janelaHoras: 72 });
  assert.equal(lista.length, busca.LIMITE_EXIBIDOS);
  assert.equal(lista[0].inicio, ultimo);
  assert.equal(lista[0].preco.precoBase, 5000);
});

// ------------------------------------------------------------- SPEC-019

test('T-SPEC019-Q1 | RF-060: com P-17 menor que P-16b, a conclusão automática espera a janela de no-show', () => {
  salvarGlobal('autoconclusao_h', 12, null);
  salvarGlobal('noshow_prazo_pos_fim_h', 48, null);
  const c = cenarioBasico({ horasAteHorario: 5 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  const fim = adicionarMinutos(c.horario.inicio, 60);
  assert.equal(agRepo.porId(ag.id).autoconclusao_prazo_em, adicionarHoras(fim, 48));

  viajarPara(adicionarHoras(fim, 13));
  rotinas.executar();
  assert.equal(agRepo.porId(ag.id).estado, 'CONFIRMADO');
  agendamentos.registrarNoShow({ usuarioId: c.prestador.id, agendamentoId: ag.id });
  assert.equal(agRepo.porId(ag.id).estado, 'NO_SHOW_CLIENTE');
});

// ------------------------------------------------------------- SPEC-018

test('T-SPEC018-Q2 | RN-21: a reativação pelo admin zera a contagem de ocorrências', () => {
  const c = cenarioBasico();
  const ocorrencia = () => {
    reputacao.aplicarEvento({
      usuarioId: c.prestador.id, tipo: TIPO_EVENTO.CANCELAMENTO_PARCIAL, delta: -1, origemTipo: 'teste', origemId: null,
    });
    return reputacao.verificarOcorrenciasDoPrestador(c.prestador.id);
  };
  ocorrencia();
  ocorrencia();
  assert.equal(ocorrencia().emRevisao, true);
  assert.equal(usuarios.porId(c.prestador.id).estado_conta, 'EM_REVISAO');

  viajarPara(adicionarHoras(agoraDoTeste(), 1));
  contas.decidirSobreConta({
    adminId: c.adminId, usuarioId: c.prestador.id, decisao: 'ATIVO', justificativa: 'Ocorrências justificadas.',
  });
  viajarPara(adicionarHoras(agoraDoTeste(), 1));
  const depois = ocorrencia();
  assert.equal(depois.total, 1);
  assert.equal(usuarios.porId(c.prestador.id).estado_conta, 'ATIVO');
});

// ------------------------------------------------------------- SPEC-003

test('T-SPEC003-Q2 | RF-006: a tentativa sobre recurso alheio entra na trilha de auditoria', async () => {
  const c = cenarioBasico({ horasAteHorario: 4 });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  const r = await fetch(`${base}/entrar`, {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'cliente2@teste.dev', senha: 'senha1234' }),
  });
  const cookie = r.headers.getSetCookie()[0].split(';')[0];
  const resposta = await fetch(`${base}/agendamentos/${ag.id}`, { headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(resposta.status, 403);
  const negado = auditoria.recentes(20).filter((l) => l.acao === 'ACESSO_NEGADO');
  assert.equal(negado.length, 1);
  assert.equal(negado[0].ator_id, c.cliente2.id);
  const detalhe = JSON.parse(negado[0].detalhe);
  assert.equal(detalhe.motivo, 'titularidade');
  assert.equal(detalhe.caminho, `/agendamentos/${ag.id}`);
});

// ------------------------------------------------------------- SPEC-028

function provedorContando(saida) {
  const dub = { nome: 'dublê/teste', chamadas: 0, async interpretar() { dub.chamadas += 1; return saida; } };
  return dub;
}

const saidaDe = (c, confianca) => ({
  status: STATUS.SUCESSO, modelo: 'dublê/teste', categoria_servico: c.categoria.nome,
  categoria_sugerida: c.categoria.nome, duracao_estimada_min: 30, urgencia: 'BAIXA',
  janela_inicio: null, janela_fim: null, regiao: null, confianca,
});

test('T-SPEC028-Q1 | RN-32: a interpretação que pede confirmação nasce DESCARTADA e muda ao buscar', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  definirProvedor(provedorContando(saidaDe(c, 0.2)));
  const leitura = await busca.interpretar({ clienteId: c.cliente.id, texto: 'algo para o cabelo' });
  assert.equal(leitura.precisaConfirmar, true);
  assert.equal(interpretacoesRepo.porId(leitura.id).desfecho, 'DESCARTADA');
  busca.registrarConfirmacao({
    interpretacaoId: leitura.id, clienteId: c.cliente.id, filtros: { categoriaId: c.categoria.id, regiaoId: null },
  });
  assert.equal(interpretacoesRepo.porId(leitura.id).desfecho, 'ACEITA');
});

test('T-SPEC028-Q2 | RNF-13: refinar a busca com o mesmo texto reaproveita a interpretação', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  const provedor = provedorContando(saidaDe(c, 0.9));
  definirProvedor(provedor);
  const primeira = await busca.interpretar({ clienteId: c.cliente.id, texto: 'corte de cabelo' });
  const reusada = await busca.interpretar({
    clienteId: c.cliente.id, texto: 'corte de cabelo', reaproveitarId: primeira.id,
  });
  assert.equal(reusada.id, primeira.id);
  assert.equal(reusada.reaproveitada, true);
  assert.deepEqual(reusada.filtros, primeira.filtros);
  assert.equal(provedor.chamadas, 1);
  assert.equal(interpretacoesRepo.contarDesde(c.cliente.id, adicionarHoras(agoraDoTeste(), -1)), 1);

  // Texto diferente, ou interpretação de outro cliente, não reaproveita.
  await busca.interpretar({ clienteId: c.cliente.id, texto: 'corte curto', reaproveitarId: primeira.id });
  await busca.interpretar({ clienteId: c.cliente2.id, texto: 'corte de cabelo', reaproveitarId: primeira.id });
  assert.equal(provedor.chamadas, 3);
});
