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

// Um prestador por categoria restante: sem eles, os atalhos da home levavam a
// buscas vazias (so "Cabelo e Barba" tinha horario).
const OUTROS = [
  {
    nome: 'Carla Nunes', email: 'carla@studio.dev', nomeExibicao: 'Studio Movimento', bairro: 'Perdizes',
    descricao: 'Estúdio de treino funcional com dois personais. Aula individual e avaliação física.',
  },
  {
    nome: 'Júlia Prado', email: 'julia@respira.dev', nomeExibicao: 'Espaço Respira', bairro: 'Itaim Bibi',
    descricao: 'Massoterapia e relaxamento em sala silenciosa, a duas quadras do metrô.',
  },
  {
    nome: 'Antônio Lima', email: 'toninho@oficina.dev', nomeExibicao: 'Oficina do Toninho', bairro: 'Butantã',
    descricao: 'Oficina mecânica de família. Troca de óleo, revisão rápida e lavagem completa.',
  },
  {
    nome: 'Rafael Costa', email: 'rafael@conserta.dev', nomeExibicao: 'Conserta Já', bairro: 'Pinheiros',
    descricao: 'Assistência técnica de celular e notebook com orçamento na hora.',
  },
];
const [carla, julia, toninho, rafael] = OUTROS.map((o) => {
  const conta = contas.cadastrar({
    nome: o.nome, email: o.email, senha: SENHA, perfil: 'PRESTADOR',
    nomeExibicao: o.nomeExibicao, regiaoId: regiao(o.bairro),
  });
  contas.aprovarPrestador({ adminId, prestadorId: conta.id });
  contas.salvarPerfilPrestador({
    prestadorId: conta.id, nomeExibicao: o.nomeExibicao, descricao: o.descricao,
    regiaoId: regiao(o.bairro), janelaConfirmacaoMin: 15, politicaExpiracao: 'LIBERAR',
  });
  return conta;
});

// Fica pendente de proposito: alimenta a fila de aprovacao do admin (UC-01).
contas.cadastrar({
  nome: 'Clínica Bem Estar', email: 'clinica@estetica.dev', senha: SENHA, perfil: 'PRESTADOR',
  nomeExibicao: 'Clínica Bem Estar', regiaoId: regiao('Perdizes'),
});
console.log('  7 prestadores (6 aprovados, 1 aguardando aprovação)');

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
  personal: catalogo.salvarServico({
    prestadorId: carla.id, nome: 'Aula com personal', categoriaId: categoria('Treino e Esporte'),
    duracaoMin: 60, precoBase: '90,00', precoMinimo: '55,00',
  }),
  avaliacao: catalogo.salvarServico({
    prestadorId: carla.id, nome: 'Avaliação física', categoriaId: categoria('Treino e Esporte'),
    duracaoMin: 45, precoBase: '70,00', precoMinimo: '42,00',
  }),
  massagem: catalogo.salvarServico({
    prestadorId: julia.id, nome: 'Massagem relaxante', categoriaId: categoria('Saúde e Bem-estar'),
    duracaoMin: 60, precoBase: '140,00', precoMinimo: '85,00',
  }),
  quick: catalogo.salvarServico({
    prestadorId: julia.id, nome: 'Quick massage', categoriaId: categoria('Saúde e Bem-estar'),
    duracaoMin: 30, precoBase: '60,00', precoMinimo: '38,00',
  }),
  oleo: catalogo.salvarServico({
    prestadorId: toninho.id, nome: 'Troca de óleo e filtro', categoriaId: categoria('Automotivo'),
    duracaoMin: 45, precoBase: '160,00', precoMinimo: '110,00',
  }),
  lavagem: catalogo.salvarServico({
    prestadorId: toninho.id, nome: 'Lavagem completa', categoriaId: categoria('Automotivo'),
    duracaoMin: 60, precoBase: '90,00', precoMinimo: '55,00',
  }),
  tela: catalogo.salvarServico({
    prestadorId: rafael.id, nome: 'Troca de tela de celular', categoriaId: categoria('Assistência Técnica'),
    duracaoMin: 60, precoBase: '280,00', precoMinimo: '190,00',
  }),
  notebook: catalogo.salvarServico({
    prestadorId: rafael.id, nome: 'Limpeza e formatação de notebook', categoriaId: categoria('Assistência Técnica'),
    duracaoMin: 90, precoBase: '150,00', precoMinimo: '95,00',
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
// Os quatro prestadores novos usam a mesma regua moderada: o que varia entre
// eles e o servico, nao a demonstracao do preco dinamico.
const reguaPadrao = Object.fromEntries([carla, julia, toninho, rafael].map((conta) => [
  conta.id,
  catalogo.salvarRegua({
    prestadorId: conta.id,
    nome: 'Encaixe do dia',
    faixas: [
      { antecedencia_min: 360, percentual_desconto: 10 },
      { antecedencia_min: 120, percentual_desconto: 20 },
      { antecedencia_min: 60, percentual_desconto: 30 },
    ],
  }).id,
]));
console.log(`  ${Object.keys(servicos).length} serviços e 6 réguas de desconto`);

// ----------------------------------------------------------------- horarios
const agora = agoraIso();
const publicados = [];

const plano = [
  // [prestador, servico, regua, horas a frente]
  // Toda categoria tem horario dentro das 24 h que a home mostra.
  [renata.id, servicos.corteFeminino.id, reguaRenata.id, 2],
  [renata.id, servicos.escova.id, reguaRenata.id, 4],
  [renata.id, servicos.limpeza.id, reguaRenata.id, 7],
  [renata.id, servicos.limpeza.id, reguaRenata.id, 22],
  [renata.id, servicos.corteFeminino.id, reguaRenata.id, 26],
  [marcos.id, servicos.corteMasculino.id, reguaMarcos.id, 1.5],
  [marcos.id, servicos.corteBarba.id, reguaMarcos.id, 3],
  [marcos.id, servicos.corteMasculino.id, reguaMarcos.id, 27],
  [carla.id, servicos.personal.id, reguaPadrao[carla.id], 2.5],
  [carla.id, servicos.avaliacao.id, reguaPadrao[carla.id], 6],
  [carla.id, servicos.personal.id, reguaPadrao[carla.id], 25],
  [julia.id, servicos.massagem.id, reguaPadrao[julia.id], 3.5],
  [julia.id, servicos.quick.id, reguaPadrao[julia.id], 5.5],
  [julia.id, servicos.massagem.id, reguaPadrao[julia.id], 29],
  [toninho.id, servicos.oleo.id, reguaPadrao[toninho.id], 4.5],
  [toninho.id, servicos.lavagem.id, reguaPadrao[toninho.id], 8],
  [toninho.id, servicos.lavagem.id, reguaPadrao[toninho.id], 28],
  [rafael.id, servicos.tela.id, reguaPadrao[rafael.id], 5],
  [rafael.id, servicos.notebook.id, reguaPadrao[rafael.id], 9],
  [rafael.id, servicos.tela.id, reguaPadrao[rafael.id], 30],
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
  PRESTADOR  carla@studio.dev, julia@respira.dev, toninho@oficina.dev, rafael@conserta.dev
             (treino, bem-estar, automotivo e assistência técnica)
  PRESTADOR  clinica@estetica.dev    (aguardando aprovação do admin)
  CLIENTE    diego@cliente.dev       (reputação normal)
  CLIENTE    bruna@cliente.dev       (reputação baixa: conta restrita)

Rode "npm start" e abra http://localhost:3000
`);

fechar();
