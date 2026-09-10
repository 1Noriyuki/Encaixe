#!/usr/bin/env node
/**
 * Dados de demonstracao.
 *
 * Tudo aqui passa pelos MESMOS servicos de aplicacao que a interface usa - o
 * seed nao escreve no banco por baixo das regras. Se uma regra quebrar, o seed
 * quebra junto, e isso e proposital.
 *
 *   npm run db:seed
 *
 * Senha de todas as contas: senha1234
 */

import { abrir, migrar, fechar, bd } from '../src/infra/db/conexao.js';
import * as catalogoRepo from '../src/infra/repositorios/catalogo.js';
import * as usuariosRepo from '../src/infra/repositorios/usuarios.js';
import * as contas from '../src/aplicacao/contas.js';
import * as catalogo from '../src/aplicacao/catalogo.js';
import * as horarios from '../src/aplicacao/horarios.js';
import * as reputacao from '../src/aplicacao/reputacao.js';
import { TIPO_EVENTO } from '../src/dominio/reputacao.js';
import { gerarHash } from '../src/infra/senha.js';
import { agoraIso, adicionarHoras, partesLocais } from '../src/dominio/tempo.js';

const SENHA = 'senha1234';

abrir();
migrar();

const jaTem = bd().prepare('SELECT COUNT(*) AS total FROM usuario').get().total;
if (jaTem > 0 && !process.argv.includes('--forcar')) {
  console.log(`Banco já tem ${jaTem} usuários. Use "npm run db:reset" para recomeçar do zero.`);
  fechar();
  process.exit(0);
}

console.log('Semeando dados de demonstração...\n');

// --------------------------------------------------------------- regioes
const REGIOES = [
  ['São Paulo', 'Pinheiros'],
  ['São Paulo', 'Vila Madalena'],
  ['São Paulo', 'Butantã'],
  ['São Paulo', 'Perdizes'],
  ['São Paulo', 'Itaim Bibi'],
];
for (const [cidade, bairro] of REGIOES) catalogoRepo.criarRegiao(cidade, bairro);
const regioes = catalogoRepo.listarRegioes();
const regiao = (bairro) => regioes.find((r) => r.bairro === bairro).id;
console.log(`  ${regioes.length} regiões`);

// ------------------------------------------------------------- categorias
const CATEGORIAS = [
  ['Cabelo e Barba', 12],
  ['Estética', 12],
  ['Saúde e Bem-estar', 10],
  ['Treino e Esporte', 10],
  ['Automotivo', 15],
  ['Assistência Técnica', 15],
];
for (const [nome, pct] of CATEGORIAS) catalogoRepo.criarCategoria(nome, pct);
const categorias = catalogoRepo.listarCategorias();
const categoria = (nome) => categorias.find((c) => c.nome === nome).id;
console.log(`  ${categorias.length} categorias`);

// ------------------------------------------------------------------ admin
const adminId = usuariosRepo.criar({
  nome: 'Paulo (admin)',
  email: 'admin@encaixe.dev',
  senha_hash: gerarHash(SENHA),
  perfil: 'ADMIN',
  estado_conta: 'ATIVO',
  reputacao: 100,
  criado_em: agoraIso(),
});
console.log('  admin@encaixe.dev');

// ------------------------------------------------------------- prestadores
const renata = contas.cadastrar({
  nome: 'Renata Alves', email: 'renata@salao.dev', senha: SENHA, perfil: 'PRESTADOR',
  nomeExibicao: 'Salão da Renata', regiaoId: regiao('Pinheiros'),
});
contas.aprovarPrestador({ adminId, prestadorId: renata.id });
contas.salvarPerfilPrestador({
  prestadorId: renata.id,
  nomeExibicao: 'Salão da Renata',
  descricao: 'Salão de bairro com três cadeiras, aberto há doze anos. Corte, coloração e escova.',
  regiaoId: regiao('Pinheiros'),
  janelaConfirmacaoMin: 15,
  politicaExpiracao: 'LIBERAR',
});

const marcos = contas.cadastrar({
  nome: 'Marcos Dias', email: 'marcos@barbearia.dev', senha: SENHA, perfil: 'PRESTADOR',
  nomeExibicao: 'Barbearia do Marcos', regiaoId: regiao('Vila Madalena'),
});
contas.aprovarPrestador({ adminId, prestadorId: marcos.id });
contas.salvarPerfilPrestador({
  prestadorId: marcos.id,
  nomeExibicao: 'Barbearia do Marcos',
  descricao: 'Barbearia clássica de esquina. Corte, barba e navalha, sem hora marcada na porta.',
  regiaoId: regiao('Vila Madalena'),
  janelaConfirmacaoMin: 10,
  // Demonstra a outra ponta de QA-01/RN-10.
  politicaExpiracao: 'AUTOCONFIRMAR',
});

// Fica pendente de proposito: alimenta a fila de aprovacao do admin (UC-01).
contas.cadastrar({
  nome: 'Clínica Bem Estar', email: 'clinica@estetica.dev', senha: SENHA, perfil: 'PRESTADOR',
  nomeExibicao: 'Clínica Bem Estar', regiaoId: regiao('Perdizes'),
});
console.log('  3 prestadores (2 aprovados, 1 aguardando aprovação)');

// ---------------------------------------------------------------- clientes
const diego = contas.cadastrar({
  nome: 'Diego Moraes', email: 'diego@cliente.dev', senha: SENHA, perfil: 'CLIENTE',
  telefone: '11 99999-1111', regiaoId: regiao('Pinheiros'),
});
const bruna = contas.cadastrar({
  nome: 'Bruna Souza', email: 'bruna@cliente.dev', senha: SENHA, perfil: 'CLIENTE',
  telefone: '11 99999-2222', regiaoId: regiao('Butantã'),
});

// Bruna comeca com reputacao baixa para demonstrar RN-12/RN-22 (conta RESTRITA).
reputacao.aplicarEvento({
  usuarioId: bruna.id,
  tipo: TIPO_EVENTO.CANCELAMENTO_TOTAL,
  delta: -12,
  origemTipo: 'seed',
  origemId: null,
});
reputacao.aplicarEvento({
  usuarioId: bruna.id,
  tipo: TIPO_EVENTO.CANCELAMENTO_TOTAL,
  delta: -12,
  origemTipo: 'seed',
  origemId: null,
});
console.log('  2 clientes (Bruna entra restrita, para demonstrar RN-12)');

// ---------------------------------------------------------------- servicos
const servicos = {
  corteFeminino: catalogo.salvarServico({
    prestadorId: renata.id, nome: 'Corte feminino', categoriaId: categoria('Cabelo e Barba'),
    duracaoMin: 60, precoBase: '120,00', precoMinimo: '70,00',
  }),
  escova: catalogo.salvarServico({
    prestadorId: renata.id, nome: 'Escova modelada', categoriaId: categoria('Cabelo e Barba'),
    duracaoMin: 45, precoBase: '80,00', precoMinimo: '48,00',
  }),
  limpeza: catalogo.salvarServico({
    prestadorId: renata.id, nome: 'Limpeza de pele', categoriaId: categoria('Estética'),
    duracaoMin: 60, precoBase: '150,00', precoMinimo: '90,00',
  }),
  corteMasculino: catalogo.salvarServico({
    prestadorId: marcos.id, nome: 'Corte masculino simples', categoriaId: categoria('Cabelo e Barba'),
    duracaoMin: 30, precoBase: '50,00', precoMinimo: '32,00',
  }),
  corteBarba: catalogo.salvarServico({
    prestadorId: marcos.id, nome: 'Corte + barba', categoriaId: categoria('Cabelo e Barba'),
    duracaoMin: 45, precoBase: '75,00', precoMinimo: '48,00',
  }),
};

// ------------------------------------------------------------------ reguas
const reguaRenata = catalogo.salvarRegua({
  prestadorId: renata.id,
  nome: 'Encaixe padrão',
  faixas: [
    { antecedencia_min: 240, percentual_desconto: 15 },
    { antecedencia_min: 120, percentual_desconto: 25 },
    { antecedencia_min: 60, percentual_desconto: 35 },
  ],
});
const reguaMarcos = catalogo.salvarRegua({
  prestadorId: marcos.id,
  nome: 'Última hora agressiva',
  faixas: [
    { antecedencia_min: 180, percentual_desconto: 20 },
    { antecedencia_min: 60, percentual_desconto: 40 },
  ],
});
console.log('  5 serviços e 2 réguas de desconto');

// ----------------------------------------------------------------- horarios
const agora = agoraIso();
const publicados = [];

const plano = [
  // [prestador, servico, regua, horas a frente]
  [renata.id, servicos.corteFeminino.id, reguaRenata.id, 2],
  [renata.id, servicos.escova.id, reguaRenata.id, 4],
  [renata.id, servicos.limpeza.id, reguaRenata.id, 7],
  [renata.id, servicos.corteFeminino.id, reguaRenata.id, 26],
  [renata.id, servicos.escova.id, reguaRenata.id, 28],
  [marcos.id, servicos.corteMasculino.id, reguaMarcos.id, 1.5],
  [marcos.id, servicos.corteBarba.id, reguaMarcos.id, 3],
  [marcos.id, servicos.corteMasculino.id, reguaMarcos.id, 5],
  [marcos.id, servicos.corteMasculino.id, reguaMarcos.id, 27],
  [marcos.id, servicos.corteBarba.id, reguaMarcos.id, 30],
];

for (const [prestadorId, servicoId, reguaId, horas] of plano) {
  const alvo = adicionarHoras(agora, horas);
  const { data, hora } = partesLocais(alvo);
  // Arredonda para o multiplo de 15 min mais proximo, para a agenda ficar legivel.
  const [h, m] = hora.split(':').map(Number);
  const minutoRedondo = String(Math.floor(m / 15) * 15).padStart(2, '0');

  try {
    const horario = horarios.publicar({
      prestadorId, servicoId, reguaId, data, hora: `${String(h).padStart(2, '0')}:${minutoRedondo}`,
    });
    publicados.push(horario);
  } catch (erro) {
    console.log(`    (horário de +${horas}h não publicado: ${erro.message})`);
  }
}
console.log(`  ${publicados.length} horários publicados`);

// ---------------------------------------------------------------- resumo
console.log(`
Pronto. Contas de demonstração (senha: ${SENHA})

  ADMIN      admin@encaixe.dev
  PRESTADOR  renata@salao.dev        (política LIBERAR, janela 15 min)
  PRESTADOR  marcos@barbearia.dev    (política AUTOCONFIRMAR, janela 10 min)
  PRESTADOR  clinica@estetica.dev    (aguardando aprovação do admin)
  CLIENTE    diego@cliente.dev       (reputação normal)
  CLIENTE    bruna@cliente.dev       (reputação baixa: conta restrita)

Rode "npm start" e abra http://localhost:3000
`);

fechar();
