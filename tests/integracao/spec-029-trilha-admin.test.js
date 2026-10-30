/**
 * SPEC-029 - trilha de auditoria consultavel pelo admin (RF-084 consulta, RF-085, RN-32).
 * Os IDs seguem a §12 da Spec; T-AUDIT-01 a 08 ja existiam.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara } from '../apoio/cenario.js';
import { criarAplicacao } from '../../src/interface/http/servidor.js';
import * as adminApp from '../../src/aplicacao/admin.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as busca from '../../src/aplicacao/busca.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as disputas from '../../src/aplicacao/disputas.js';
import * as auditoria from '../../src/infra/auditoria.js';
import { definirProvedor, restaurarProvedor } from '../../src/infra/llm/index.js';
import { STATUS } from '../../src/infra/llm/contrato.js';
import { adicionarHoras } from '../../src/dominio/tempo.js';

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

test('T-AUDIT-09 | RF-085: toda acao administrativa deixa registro com o admin como ator', () => {
  const c = cenarioBasico({ horasAteHorario: 2 });
  const pendente = contas.cadastrar({
    nome: 'Prestador Novo', email: 'novo@teste.dev', senha: 'senha1234',
    perfil: 'PRESTADOR', nomeExibicao: 'Espaco Novo', regiaoId: c.regiao.id,
  });
  const outro = contas.cadastrar({
    nome: 'Prestador Recusado', email: 'recusado@teste.dev', senha: 'senha1234',
    perfil: 'PRESTADOR', nomeExibicao: 'Espaco Recusado', regiaoId: c.regiao.id,
  });
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  agendamentos.confirmar({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  viajarPara(adicionarHoras(c.horario.inicio, 1.5));
  agendamentos.concluir({ prestadorId: c.prestador.id, agendamentoId: ag.id });
  const disputa = disputas.abrir({
    usuarioId: c.cliente.id, agendamentoId: ag.id, motivo: 'OUTRO', evidencia: 'Evidencia suficiente para a trilha.',
  });

  const acoesDoAdmin = {
    PRESTADOR_APROVADO: () => contas.aprovarPrestador({ adminId: c.adminId, prestadorId: pendente.id }),
    PRESTADOR_REPROVADO: () => contas.reprovarPrestador({ adminId: c.adminId, prestadorId: outro.id, justificativa: 'Documentacao incompleta.' }),
    CONTA_SUSPENSA: () => contas.decidirSobreConta({ adminId: c.adminId, usuarioId: c.cliente2.id, decisao: 'SUSPENSO', justificativa: 'Fraude confirmada.' }),
    CONTA_REATIVADA: () => contas.decidirSobreConta({ adminId: c.adminId, usuarioId: c.cliente2.id, decisao: 'ATIVO', justificativa: 'Recurso aceito.' }),
    DISPUTA_ASSUMIDA: () => disputas.assumir({ adminId: c.adminId, disputaId: disputa.id }),
    DISPUTA_RESOLVIDA: () => disputas.resolver({ adminId: c.adminId, disputaId: disputa.id, desfecho: 'ARQUIVADO', justificativa: 'Sem elementos para decidir.' }),
    PARAMETRO_ALTERADO: () => adminApp.ajustarParametro({ adminId: c.adminId, chave: 'antecedencia_min_reserva_min', valor: 45 }),
    COMISSAO_CATEGORIA_ALTERADA: () => adminApp.ajustarComissao({ adminId: c.adminId, categoriaId: c.categoria.id, percentual: 10 }),
  };

  for (const [acao, executar] of Object.entries(acoesDoAdmin)) {
    const antes = auditoria.recentes(500).filter((l) => l.acao === acao).length;
    executar();
    const registros = auditoria.recentes(500).filter((l) => l.acao === acao);
    assert.equal(registros.length, antes + 1, `${acao} registrada`);
    assert.equal(registros[0].ator_id, c.adminId, `${acao} com o admin como ator`);
  }
});

test('T-AUDIT-10 | RF-085/RN-32: a interpretacao aparece na tela com o que permite refazer a busca', async () => {
  const c = cenarioBasico({ horasAteHorario: 3 });
  definirProvedor({
    nome: 'dublê/teste',
    async interpretar() {
      return {
        status: STATUS.SUCESSO, modelo: 'dublê/teste', categoria_servico: c.categoria.nome,
        categoria_sugerida: c.categoria.nome, duracao_estimada_min: 30, urgencia: 'ALTA',
        janela_inicio: c.horario.inicio, janela_fim: adicionarHoras(c.horario.inicio, 2), regiao: 'Pinheiros', confianca: 0.92,
      };
    },
  });
  const leitura = await busca.interpretar({ clienteId: c.cliente.id, texto: 'corte hoje a tarde em Pinheiros' });
  const registro = auditoria.recentes(50).find((l) => l.acao === 'INTERPRETACAO_REGISTRADA');
  assert.equal(registro.ator_id, c.cliente.id);
  assert.equal(registro.entidade_id, leitura.id);

  const login = await fetch(`${base}/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'admin@teste.dev', senha: 'senha1234' }),
    redirect: 'manual',
  });
  const cookie = login.headers.getSetCookie()[0].split(';')[0];
  const tela = await (await fetch(`${base}/admin/auditoria`, { headers: { Cookie: cookie } })).text();

  assert.ok(tela.includes('corte hoje a tarde em Pinheiros'), 'texto original');
  assert.ok(tela.includes(c.categoria.nome), 'categoria interpretada');
  assert.match(tela, /<td class="mini">Pinheiros<div>/, 'regiao interpretada');
  assert.match(tela, /92%/, 'confianca');
  assert.ok(tela.includes('dublê/teste'), 'modelo');
  assert.match(tela, /Região e janela/);
});
