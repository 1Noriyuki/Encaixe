/**
 * Apoio aos testes de integracao.
 *
 * Dois recursos que mudam tudo na testabilidade deste sistema:
 *   - banco em memoria, recriado por teste (isolamento total);
 *   - relogio controlado, porque metade das regras depende de "quanto falta".
 */

import { abrir, migrar, fechar } from '../../src/infra/db/conexao.js';
import { definirRelogio, restaurarRelogio, partesLocais, adicionarHoras } from '../../src/dominio/tempo.js';
import * as catalogoRepo from '../../src/infra/repositorios/catalogo.js';
import * as usuariosRepo from '../../src/infra/repositorios/usuarios.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as horarios from '../../src/aplicacao/horarios.js';
import { gerarHash } from '../../src/infra/senha.js';

/** Instante de referencia dos testes: uma quinta-feira, 10h em Sao Paulo. */
export const T0 = '2026-09-10T13:00:00.000Z';

let relogio = T0;

export function agoraDoTeste() {
  return relogio;
}

/** Move o relogio do sistema (todas as regras enxergam este instante). */
export function viajarPara(iso) {
  relogio = iso;
  definirRelogio(() => new Date(relogio));
  return relogio;
}

export function avancarHoras(horas) {
  return viajarPara(adicionarHoras(relogio, horas));
}

/** Banco limpo + relogio em T0. Chame no inicio de cada teste. */
export function prepararBanco() {
  fechar();
  abrir(':memory:');
  migrar();
  viajarPara(T0);
}

export function encerrar() {
  restaurarRelogio();
  fechar();
}

/**
 * Cenario padrao: admin, um prestador aprovado e completo, dois clientes e um
 * horario publicado para daqui a `horasAteHorario`.
 */
export function cenarioBasico({
  horasAteHorario = 5,
  politicaExpiracao = 'LIBERAR',
  janelaConfirmacaoMin = 15,
  precoBase = '100,00',
  precoMinimo = '40,00',
  duracaoMin = 60,
  comissaoPct = 12,
  faixas = [
    { antecedencia_min: 240, percentual_desconto: 20 },
    { antecedencia_min: 60, percentual_desconto: 35 },
  ],
} = {}) {
  catalogoRepo.criarRegiao('Sao Paulo', 'Pinheiros');
  const regiao = catalogoRepo.listarRegioes()[0];

  catalogoRepo.criarCategoria('Cabelo e Barba', comissaoPct);
  const categoria = catalogoRepo.listarCategorias()[0];

  const adminId = usuariosRepo.criar({
    nome: 'Admin', email: 'admin@teste.dev', senha_hash: gerarHash('senha1234'),
    perfil: 'ADMIN', estado_conta: 'ATIVO', reputacao: 100, criado_em: agoraDoTeste(),
  });

  const prestador = contas.cadastrar({
    nome: 'Prestador Teste', email: 'prestador@teste.dev', senha: 'senha1234',
    perfil: 'PRESTADOR', nomeExibicao: 'Salao Teste', regiaoId: regiao.id,
  });
  contas.aprovarPrestador({ adminId, prestadorId: prestador.id });
  contas.salvarPerfilPrestador({
    prestadorId: prestador.id,
    nomeExibicao: 'Salao Teste',
    descricao: 'Cenario de teste',
    regiaoId: regiao.id,
    janelaConfirmacaoMin,
    politicaExpiracao,
  });

  const cliente = contas.cadastrar({
    nome: 'Cliente Teste', email: 'cliente@teste.dev', senha: 'senha1234',
    perfil: 'CLIENTE', telefone: '11 90000-0000', regiaoId: regiao.id,
  });
  const cliente2 = contas.cadastrar({
    nome: 'Outro Cliente', email: 'cliente2@teste.dev', senha: 'senha1234',
    perfil: 'CLIENTE', telefone: '11 90000-0001', regiaoId: regiao.id,
  });

  const servico = catalogo.salvarServico({
    prestadorId: prestador.id, nome: 'Corte', categoriaId: categoria.id,
    duracaoMin, precoBase, precoMinimo,
  });
  const regua = catalogo.salvarRegua({
    prestadorId: prestador.id, nome: 'Regua de teste', faixas,
  });

  const horario = publicarDaquiA(prestador.id, servico.id, regua.id, horasAteHorario);

  return { adminId, prestador, cliente, cliente2, servico, regua, categoria, regiao, horario };
}

/** Publica um horario a N horas do instante atual do teste. */
export function publicarDaquiA(prestadorId, servicoId, reguaId, horas) {
  const alvo = adicionarHoras(agoraDoTeste(), horas);
  const { data, hora } = partesLocais(alvo);
  return horarios.publicar({ prestadorId, servicoId, reguaId, data, hora });
}
