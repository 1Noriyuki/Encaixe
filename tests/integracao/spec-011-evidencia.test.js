/**
 * SPEC-011: evidência dos critérios de aceitação do preço dinâmico (CA-01 a CA-08).
 * Os IDs T-SPEC011-01 a 03 já identificam testes de precisão do degrau
 * (spec-011-precisao-degrau.test.js); por isso os critérios usam T-SPEC011-CAnn.
 *
 * Cenário padrão: base R$ 100, mínimo R$ 40, faixas (240 min, 20%) e (60 min, 35%).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepararBanco, encerrar, cenarioBasico, viajarPara, agoraDoTeste, publicarDaquiA } from '../apoio/cenario.js';
import { adicionarMinutos, adicionarHoras } from '../../src/dominio/tempo.js';
import * as horarios from '../../src/aplicacao/horarios.js';
import * as busca from '../../src/aplicacao/busca.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as agendamentos from '../../src/aplicacao/agendamentos.js';
import * as agRepo from '../../src/infra/repositorios/agendamentos.js';
import { salvarGlobal } from '../../src/aplicacao/parametros.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

const precoDe = (horarioId) => horarios.detalhe(horarioId).preco;
const minutosAntes = (c, minutos) => viajarPara(adicionarMinutos(c.horario.inicio, -minutos));

test('T-SPEC011-CA01 | RN-01: a oferta sem faixa aplicável apresenta preço-base íntegro', () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  const d = precoDe(c.horario.id);
  assert.equal(d.precoVigente, 10000);
  assert.equal(d.percentualTabela, 0);
  assert.equal(d.economia, 0);
  assert.equal(d.faixa, null);
  assert.equal(d.pisoAtingido, false);
});

test('T-SPEC011-CA02 | RN-01: ao cruzar antecedência de uma faixa, preço muda no instante esperado', () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  viajarPara(adicionarMinutos(c.horario.inicio, -240 - 1 / 60_000));
  assert.equal(precoDe(c.horario.id).precoVigente, 10000);
  minutosAntes(c, 240);
  assert.equal(precoDe(c.horario.id).precoVigente, 8000);
  minutosAntes(c, 60);
  assert.equal(precoDe(c.horario.id).precoVigente, 6500);
});

test('T-SPEC011-CA03 | RN-01: preço não fica abaixo do piso mínimo do prestador', () => {
  const c = cenarioBasico({ horasAteHorario: 5, precoMinimo: '70,00' });
  minutosAntes(c, 30);
  const d = precoDe(c.horario.id);
  assert.equal(d.percentualTabela, 35);
  assert.equal(d.precoVigente, 7000);
  assert.equal(d.piso, 7000);
  assert.equal(d.pisoAtingido, true);
});

test('T-SPEC011-CA04 | RN-01: teto p-05 limita o desconto efetivo', () => {
  const c = cenarioBasico({ horasAteHorario: 5, precoMinimo: '' });
  const regua = catalogo.salvarRegua({
    prestadorId: c.prestador.id, nome: 'Agressiva', faixas: [{ antecedencia_min: 60, percentual_desconto: 50 }],
  });
  const h = publicarDaquiA(c.prestador.id, c.servico.id, regua.id, 8);
  // Decisão da etapa 32 (RN-03): o teto vigente vale para horário sem reserva.
  salvarGlobal('desconto_maximo_pct', 30, null);
  viajarPara(adicionarMinutos(h.inicio, -30));
  const d = precoDe(h.id);
  assert.equal(d.percentualTabela, 50);
  assert.equal(d.precoVigente, 7000);
  assert.equal(d.percentualEfetivo, 30);
  assert.equal(d.pisoAtingido, true);
});

test('T-SPEC011-CA05 | RN-01: economia e percentual efetivo correspondem ao preço em centavos', () => {
  const c = cenarioBasico({ horasAteHorario: 5, precoBase: '99,99', precoMinimo: '' });
  minutosAntes(c, 30);
  const d = precoDe(c.horario.id);
  // 35% de 9999 = 3499,65 → 3500 (meio para cima, RN-14).
  assert.equal(d.precoVigente, 6499);
  assert.equal(d.economia, 3500);
  assert.equal(d.economia, d.precoBase - d.precoVigente);
  assert.equal(d.percentualEfetivo, 35);
  for (const v of [d.precoVigente, d.economia, d.percentualEfetivo]) assert.ok(Number.isInteger(v));
});

test('T-SPEC011-CA06 | RN-01: próximo degrau informa antecedência e instante corretamente', () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  let d = precoDe(c.horario.id);
  assert.equal(d.proximoDegrau.percentual, 20);
  assert.equal(d.proximoDegrau.faixa.antecedencia_min, 240);
  assert.equal(d.proximoDegrau.em, adicionarMinutos(c.horario.inicio, -240));
  minutosAntes(c, 100);
  d = precoDe(c.horario.id);
  assert.equal(d.proximoDegrau.percentual, 35);
  assert.equal(d.proximoDegrau.emMinutos, 40);
  assert.equal(d.proximoDegrau.em, adicionarMinutos(agoraDoTeste(), 40));
  minutosAntes(c, 59);
  assert.equal(precoDe(c.horario.id).proximoDegrau, null);
});

test('T-SPEC011-CA07 | RN-01: busca, detalhe e reserva usam a mesma regra de cálculo', () => {
  const c = cenarioBasico({ horasAteHorario: 5, precoBase: '87,30' });
  minutosAntes(c, 150);
  const naBusca = busca.buscarPorFiltros({}).find((h) => h.id === c.horario.id);
  const noDetalhe = precoDe(c.horario.id);
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  assert.equal(noDetalhe.precoVigente, 6984);
  assert.equal(naBusca.preco.precoVigente, noDetalhe.precoVigente);
  assert.equal(ag.valor_travado, noDetalhe.precoVigente);
  assert.equal(ag.percentual_desconto_aplicado, noDetalhe.percentualEfetivo);
});

test('T-SPEC011-CA08 | RN-01: preço travado de reserva anterior não muda quando o relógio avança', () => {
  const c = cenarioBasico({ horasAteHorario: 5 });
  minutosAntes(c, 150);
  const ag = agendamentos.reservar({ clienteId: c.cliente.id, horarioId: c.horario.id });
  assert.equal(ag.valor_travado, 8000);
  viajarPara(adicionarHoras(agoraDoTeste(), 2));
  assert.equal(precoDe(c.horario.id).percentualTabela, 35);
  assert.equal(agRepo.porId(ag.id).valor_travado, 8000);
});
