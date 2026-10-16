/**
 * Rotas publicas: home, autenticacao, busca (UC-03 e UC-04), detalhe de um
 * horario e perfil publico.
 */

import * as contas from '../../../aplicacao/contas.js';
import * as busca from '../../../aplicacao/busca.js';
import * as catalogo from '../../../aplicacao/catalogo.js';
import * as horariosApp from '../../../aplicacao/horarios.js';
import { criarSessao, cookieDeSessao, cookieDeSaida, encerrarSessao } from '../sessao.js';
import {
  html, cru, juntar, campoCsrf, cartaoDeVaga, vazio, notaDeRegra, reputacao, selo,
  blocoDePreco, reguaDeDesconto, estrelas, chip, plural, seloReputacao,
} from '../views/layout.js';
import {
  formatarDataHora, formatarHora, formatarDiaSemana, humanizarMinutos,
} from '../../../dominio/tempo.js';
import { formatarBRL } from '../../../dominio/dinheiro.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { params } from '../../../aplicacao/parametros.js';

export function registrar(r) {
  r.get('/', home);
  r.get('/entrar', telaEntrar);
  r.post('/entrar', entrar, { semCsrf: true });
  r.get('/cadastrar', telaCadastrar);
  r.post('/cadastrar', cadastrar, { semCsrf: true });
  r.get('/sair', sair);
  r.get('/buscar', buscar);
  r.get('/horarios/:id', detalheDoHorario);
  r.get('/prestadores/:id', perfilPublico);
}

// ---------------------------------------------------------------- home

function home(ctx) {
  if (ctx.usuario?.perfil === 'PRESTADOR') return ctx.redirecionar('/prestador');
  if (ctx.usuario?.perfil === 'ADMIN') return ctx.redirecionar('/admin');

  const p = params();
  const abertos = busca.buscarPorFiltros({ ordenar: 'desconto' });
  const destaques = abertos.slice(0, 3);
  const categorias = catalogo.listarCategorias();

  // Os numeros do hero saem do banco, nao de texto fixo: a home mostra o
  // estado real da plataforma no instante da visita.
  const maiorDesconto = destaques[0]?.preco.percentualEfetivo ?? 0;
  const economiaTotal = abertos.reduce((soma, v) => soma + v.preco.economia, 0);
  const vitrine = destaques[0] ?? null;

  return ctx.render(html`
    ${destaques.length ? html`
      <section class="secao-titulo" data-revelar>
        <div>
          <span class="olho">Abertos agora</span>
          <h2>Horários com o maior desconto vigente</h2>
          <p>Preço já calculado para este instante. Ele muda sozinho conforme o horário chega.</p>
        </div>
        <a class="botao botao-secundario botao-pequeno" href="/buscar">
          Ver todos os ${abertos.length} <span class="seta">→</span>
        </a>
      </section>

      <div class="lista-cartoes">
        ${juntar(destaques.map((v) => cartaoDeVaga(v, {
    href: `/horarios/${v.id}`,
    acao: html`<a class="botao botao-pequeno botao-largo" href="/horarios/${v.id}">
      Ver horário <span class="seta">→</span></a>`,
  })))}
      </div>
    ` : html`
      <section class="secao-titulo" data-revelar>
        <div>
          <span class="olho">Abertos agora</span>
          <h2>Nenhum horário publicado neste momento</h2>
        </div>
      </section>
      ${vazio(
    html`Assim que um prestador publicar um buraco na agenda, ele aparece aqui já com o preço vigente.`,
    { titulo: 'A vitrine está vazia', acoes: [['/cadastrar?perfil=PRESTADOR', 'Publicar meus horários']] },
  )}
    `}

    <section class="secao-titulo" id="como-funciona" data-revelar>
      <div>
        <span class="olho">Como funciona</span>
        <h2>Três passos, sem intermediário escondido</h2>
      </div>
    </section>

    <div class="grade grade-3">
      <div class="cartao cartao-vivo passo" data-passo="01" data-revelar>
        <h3>O prestador publica</h3>
        <p class="pequeno fraco">Escolhe o serviço, o horário vago e a régua de desconto por
        antecedência. Publicar exige ao menos ${p.antecedencia_min_publicacao_min} min de
        antecedência — horário impossível de cumprir não entra na busca.</p>
      </div>
      <div class="cartao cartao-vivo passo" data-passo="02" data-revelar style="--atraso:90ms">
        <h3>O preço cai sozinho</h3>
        <p class="pequeno fraco">Quanto mais perto do horário, maior o desconto — até o piso que o
        prestador definiu, limitado ao teto de ${p.desconto_maximo_pct}% da plataforma. O preço que
        você vê na reserva fica travado.</p>
      </div>
      <div class="cartao cartao-vivo passo" data-passo="03" data-revelar style="--atraso:180ms">
        <h3>Você reserva e ele confirma</h3>
        <p class="pequeno fraco">O horário fica só seu durante os ${p.janela_confirmacao_min} min da
        janela de confirmação. Sem resposta, ele volta para a busca e você não é penalizado.</p>
      </div>
    </div>

    ${vitrine ? secaoDoPreco(vitrine, p) : cru('')}

    <section class="secao-titulo" data-revelar>
      <div>
        <span class="olho">Para quem atende</span>
        <h2>O buraco na agenda não volta amanhã</h2>
        <p>Um horário vago não pode ser estocado: as 15h de hoje deixam de existir às 15h01.</p>
      </div>
    </section>

    <div class="grade grade-2">
      <div class="cartao cartao-vivo" data-revelar>
        <h3 class="sem-topo">Você escolhe o quanto cede</h3>
        <p class="pequeno fraco">A régua de desconto é sua: define a partir de quantos minutos o
        desconto começa, de quanto em quanto ele cresce e onde para. A plataforma nunca desconta
        além do piso que você marcou, e o preço cheio continua valendo para a clientela fixa.</p>
      </div>
      <div class="cartao cartao-vivo" data-revelar style="--atraso:90ms">
        <h3 class="sem-topo">Só paga quando atende</h3>
        <p class="pequeno fraco">A comissão de ${p.comissao_pct_padrao}% incide sobre o
        agendamento concluído, calculada em cima do valor final travado. Reserva expirada, recusada,
        cancelada pelo cliente ou disputa procedente não geram cobrança para você.</p>
      </div>
    </div>

    <section class="secao-titulo" id="regras" data-revelar>
      <div>
        <span class="olho">Confiança</span>
        <h2>As regras aparecem, não ficam escondidas</h2>
        <p>Toda decisão do sistema tem um identificador de regra, e ele chega até a tela.</p>
      </div>
    </section>

    <div class="cartao" data-revelar>
      <ul class="lista-limpa">
        <li>
          <div class="linha entre linha-topo">
            <div class="crescer">
              <div class="forte">Você sabe a consequência antes de confirmar</div>
              <div class="pequeno fraco">Cancelar mostra a faixa aplicável e o efeito exato na
              reputação antes do botão, nunca depois.</div>
            </div>
            <span class="selo selo-regra">RN-18</span>
          </div>
        </li>
        <li>
          <div class="linha entre linha-topo">
            <div class="crescer">
              <div class="forte">O preço que você viu é o preço que vale</div>
              <div class="pequeno fraco">O valor é travado no instante da reserva e não muda depois,
              nem se o prestador editar a régua.</div>
            </div>
            <span class="selo selo-regra">RN-04</span>
          </div>
        </li>
        <li>
          <div class="linha entre linha-topo">
            <div class="crescer">
              <div class="forte">Reputação vem de fatos, não de opinião solta</div>
              <div class="pequeno fraco">Cada ponto sai de um evento rastreável — atendimento
              concluído, avaliação, cancelamento, ausência. Ninguém edita o número à mão.</div>
            </div>
            <span class="selo selo-regra">RN-23</span>
          </div>
        </li>
        <li>
          <div class="linha entre linha-topo">
            <div class="crescer">
              <div class="forte">A busca por texto é interpretada, não decidida, pela IA</div>
              <div class="pequeno fraco">O modelo extrai filtros. Quem seleciona, ordena e precifica
              os horários é código determinístico — e a busca funciona com o modelo fora do ar.</div>
            </div>
            <span class="selo selo-regra">INV-14</span>
          </div>
        </li>
      </ul>
    </div>

    <section class="faixa acima-5" data-revelar>
      <h2>Tem horário vago essa semana?</h2>
      <p>Publique em menos de um minuto, defina sua régua e deixe o preço trabalhar. O cadastro de
      prestador passa por aprovação do administrador antes da primeira publicação.</p>
      <div class="linha">
        <a class="botao" href="/cadastrar?perfil=PRESTADOR">
          Criar conta de prestador <span class="seta">→</span>
        </a>
        <a class="botao botao-secundario" href="/buscar">Explorar horários abertos</a>
      </div>
    </section>
  `, {
    titulo: 'Horários de última hora com desconto',
    descricao: 'Encontre horários vagos de salões, barbearias e clínicas perto de você. '
      + 'O desconto cresce conforme o horário se aproxima, e o preço fica travado na reserva.',
    hero: heroDaHome({
      abertos: abertos.length, maiorDesconto, economiaTotal, vitrine, p, categorias,
    }),
  });
}

/**
 * Demonstracao do preco dinamico com um horario real da vitrine.
 * Cada degrau vem de `projetarRegua` no dominio (RF-027) - a pagina desenha,
 * nao calcula.
 */
function secaoDoPreco(vitrine, p) {
  const detalhe = horariosApp.detalhe(vitrine.id);
  if (!detalhe.regua.length) return cru('');

  return html`
    <section class="secao-titulo" id="preco" data-revelar>
      <div>
        <span class="olho">Preço dinâmico</span>
        <h2>Como o preço caminha até o horário</h2>
        <p>Exemplo real: a régua de "${detalhe.servico_nome}",
        de ${detalhe.nome_exibicao ?? detalhe.prestador_nome},
        às ${formatarHora(detalhe.inicio)}.</p>
      </div>
      <a class="botao botao-secundario botao-pequeno" href="/horarios/${detalhe.id}">
        Abrir este horário <span class="seta">→</span>
      </a>
    </section>

    <div class="cartao" data-revelar>
      ${reguaDeDesconto(detalhe.regua, { antecedenciaMin: detalhe.preco.antecedenciaMin })}
      ${notaDeRegra('RN-01', `A faixa aplicável é a de menor antecedência entre as que já entraram em vigor. `
    + `Nenhum desconto passa do teto de ${p.desconto_maximo_pct}% da plataforma nem do piso do prestador.`)}
    </div>`;
}

/**
 * Hero da home - bloco puramente visual, servido antes do <main>.
 *
 * A arte tem duas camadas: a imagem em `public/hero.jpg` (se existir) e,
 * por baixo, um gradiente que assume o lugar dela quando o arquivo falta.
 * Os cartoes flutuantes usam o horario real de maior desconto no banco.
 */
function heroDaHome({ abertos, maiorDesconto, economiaTotal, vitrine, p, categorias }) {
  const precoDemo = vitrine
    ? html`
      <div class="antes">${formatarBRL(vitrine.preco.precoBase)}</div>
      <div class="agora">${formatarBRL(vitrine.preco.precoVigente)}</div>
      <div class="pequeno fraco">${vitrine.servico_nome} · ${formatarHora(vitrine.inicio)}</div>
      <div class="contagem">−${vitrine.preco.percentualEfetivo}% e caindo</div>`
    : html`
      <div class="antes">R$ 120,00</div>
      <div class="agora">R$ 78,00</div>
      <div class="pequeno fraco">Exemplo de régua de desconto</div>
      <div class="contagem">−35% e caindo</div>`;

  return html`
  <section class="heroi">
    <div class="heroi-fundo" aria-hidden="true">
      <span class="heroi-brilho heroi-brilho-a"></span>
      <span class="heroi-brilho heroi-brilho-b"></span>
      <span class="heroi-grade"></span>
    </div>

    <div class="heroi-interno">
      <div class="heroi-texto" data-revelar>
        <a class="etiqueta" href="/buscar">
          <span class="ponto-vivo" aria-hidden="true"></span>
          <span><b>${abertos}</b> ${abertos === 1 ? 'horário aberto' : 'horários abertos'} nas próximas 72&nbsp;h</span>
        </a>

        <h1>Um horário vago perto de você <em>custa menos</em>.</h1>

        <p class="heroi-chamada">
          Salões, barbearias e clínicas publicam os buracos da agenda. O desconto cresce conforme o
          horário se aproxima, seguindo a régua que o próprio prestador definiu.
        </p>

        <form class="heroi-busca" method="get" action="/buscar" role="search">
          <label class="so-leitor" for="busca-hero">O que você precisa hoje?</label>
          <div class="busca-principal">
            <input id="busca-hero" name="descricao" class="crescer"
                   placeholder="Ex.: cortar o cabelo hoje depois das 18h">
            <button class="botao" type="submit">Buscar <span class="seta">→</span></button>
          </div>
        </form>

        ${categorias.length ? html`
          <div class="heroi-atalhos">
            <span class="rotulo-atalhos">ou vá direto:</span>
            ${juntar(categorias.slice(0, 4).map((c) => chip(c.nome, {
    href: `/buscar?categoriaId=${c.id}`, neutro: true,
  })))}
          </div>` : cru('')}

        <dl class="heroi-numeros">
          <div>
            <dt data-ate="${maiorDesconto}" data-prefixo="−" data-sufixo="%">−${maiorDesconto}%</dt>
            <dd>maior desconto agora</dd>
          </div>
          <div>
            <dt>${formatarBRL(economiaTotal)}</dt>
            <dd>de economia na vitrine</dd>
          </div>
          <div>
            <dt data-ate="${p.janela_confirmacao_min}" data-sufixo=" min">${p.janela_confirmacao_min} min</dt>
            <dd>para o prestador confirmar</dd>
          </div>
        </dl>
      </div>

      <div class="heroi-arte" data-revelar style="--atraso:140ms">
        <figure class="heroi-moldura">${imagemDoHero()}</figure>

        <article class="cartao-flutuante">${precoDemo}</article>

        <article class="cartao-flutuante cartao-flutuante-alto">
          <div class="mini fraco">Política ao expirar</div>
          <div class="forte pequeno">${p.politica_expiracao === 'AUTOCONFIRMAR' ? 'Autoconfirmar' : 'Liberar o horário'}</div>
        </article>
      </div>
    </div>
  </section>`;
}

/**
 * A imagem do hero e opcional: enquanto `public/hero.jpg` nao existir, a
 * moldura fica so com o gradiente - nenhuma <img> quebrada na pagina.
 * `fetchpriority=high` porque ela e o maior elemento visivel da home (LCP);
 * `width`/`height` reservam a caixa e evitam o pulo de layout.
 */
function imagemDoHero() {
  const arquivo = fileURLToPath(new URL('../../../../public/hero.jpg', import.meta.url));
  if (!existsSync(arquivo)) return cru('');
  return html`<img src="/estatico/hero.jpg"
    alt="Cabeleireira penteando uma cliente em um salão de bairro no fim da tarde"
    width="900" height="1125" loading="eager" decoding="async" fetchpriority="high">`;
}

// -------------------------------------------------------------- entrar

function telaEntrar(ctx) {
  const destino = ctx.query.destino ?? '';
  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Entrar</h1>
      <p>Buscar horários não exige conta. Reservar, publicar e administrar, sim.</p>
    </div>

    <form class="cartao" method="post" action="/entrar">
      <input type="hidden" name="destino" value="${destino}">
      <div class="campo">
        <label for="email">E-mail</label>
        <input id="email" name="email" type="email" autocomplete="email" required autofocus>
      </div>
      <div class="campo">
        <label for="senha">Senha</label>
        <input id="senha" name="senha" type="password" autocomplete="current-password" required>
      </div>
      <button class="botao botao-largo botao-grande" type="submit">Entrar</button>
      <p class="pequeno fraco centro sem-fundo acima-3">
        Ainda não tem conta? <a href="/cadastrar">Criar conta</a>
      </p>
    </form>

    <div class="cartao cartao-realce acima-3">
      <h2 class="sem-topo">Contas de demonstração</h2>
      <p class="pequeno fraco">A senha de todas é <code>senha1234</code>.</p>
      <ul class="lista-limpa pequeno">
        <li><div class="linha entre"><code>admin@encaixe.dev</code>
          <span class="mini fraco">administrador da plataforma</span></div></li>
        <li><div class="linha entre"><code>renata@salao.dev</code>
          <span class="mini fraco">prestadora, política LIBERAR</span></div></li>
        <li><div class="linha entre"><code>marcos@barbearia.dev</code>
          <span class="mini fraco">prestador, política AUTOCONFIRMAR</span></div></li>
        <li><div class="linha entre"><code>diego@cliente.dev</code>
          <span class="mini fraco">cliente com reputação normal</span></div></li>
        <li><div class="linha entre"><code>bruna@cliente.dev</code>
          <span class="mini fraco">cliente restrita, demonstra a RN-12</span></div></li>
      </ul>
    </div>
  `, { titulo: 'Entrar', estreita: true });
}

function entrar(ctx) {
  const usuario = contas.autenticar({ email: ctx.corpo.email, senha: ctx.corpo.senha });
  const sessao = criarSessao(usuario.id);

  const destinoPadrao = { CLIENTE: '/buscar', PRESTADOR: '/prestador', ADMIN: '/admin' }[usuario.perfil] ?? '/';
  const destino = ctx.corpo.destino || destinoPadrao;

  ctx.res.setHeader('Set-Cookie', cookieDeSessao(sessao.id));
  return ctx.redirecionar(destino, {
    tipo: 'sucesso', texto: `Bem-vindo(a), ${usuario.nome}.`,
  });
}

function sair(ctx) {
  encerrarSessao(ctx.sessao?.id);
  ctx.res.setHeader('Set-Cookie', cookieDeSaida());
  return ctx.redirecionar('/');
}

// ------------------------------------------------------------ cadastrar

function telaCadastrar(ctx) {
  const perfil = ctx.query.perfil === 'PRESTADOR' ? 'PRESTADOR' : 'CLIENTE';
  const regioes = catalogo.listarRegioes();

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Criar conta</h1>
      <p>Escolha o perfil. Prestadores passam por aprovação do administrador antes de publicar.</p>
    </div>

    <form class="cartao" method="post" action="/cadastrar">
      <div class="campo">
        <label for="perfil">Eu quero</label>
        <select id="perfil" name="perfil">
          <option value="CLIENTE" ${perfil === 'CLIENTE' ? 'selected' : ''}>Encontrar horários com desconto (cliente)</option>
          <option value="PRESTADOR" ${perfil === 'PRESTADOR' ? 'selected' : ''}>Vender meus horários vagos (prestador)</option>
        </select>
      </div>
      <div class="campo">
        <label for="nome">Nome completo</label>
        <input id="nome" name="nome" autocomplete="name" required>
      </div>
      <div class="campo">
        <label for="nomeExibicao">Nome do negócio <span class="fraco">(prestadores)</span></label>
        <input id="nomeExibicao" name="nomeExibicao" placeholder="Ex.: Salão da Renata">
      </div>
      <div class="campo">
        <label for="email">E-mail</label>
        <input id="email" name="email" type="email" autocomplete="email" required>
      </div>
      <div class="campo">
        <label for="senha">Senha</label>
        <input id="senha" name="senha" type="password" autocomplete="new-password" required>
        <div class="ajuda">Mínimo de 8 caracteres, misturando letras e números.</div>
      </div>
      <div class="campo">
        <label for="telefone">Telefone <span class="fraco">(clientes)</span></label>
        <input id="telefone" name="telefone" type="tel" autocomplete="tel" placeholder="11 90000-0000">
      </div>
      <div class="campo">
        <label for="regiaoId">Região</label>
        <select id="regiaoId" name="regiaoId">
          <option value="">Escolha...</option>
          ${juntar(regioes.map((rg) => html`<option value="${rg.id}">${rg.bairro} — ${rg.cidade}</option>`))}
        </select>
      </div>
      <button class="botao botao-largo botao-grande" type="submit">Criar conta</button>
    </form>

    ${notaDeRegra('RN-28', 'A conta de prestador nasce aguardando aprovação do administrador e só publica horários depois de aprovada e com o perfil completo.')}
  `, { titulo: 'Criar conta', estreita: true });
}

function cadastrar(ctx) {
  const usuario = contas.cadastrar({
    nome: ctx.corpo.nome,
    email: ctx.corpo.email,
    senha: ctx.corpo.senha,
    perfil: ctx.corpo.perfil,
    nomeExibicao: ctx.corpo.nomeExibicao,
    telefone: ctx.corpo.telefone,
    regiaoId: ctx.corpo.regiaoId || null,
  });

  const sessao = criarSessao(usuario.id);
  ctx.res.setHeader('Set-Cookie', cookieDeSessao(sessao.id));

  if (usuario.perfil === 'PRESTADOR') {
    return ctx.redirecionar('/prestador', {
      tipo: 'info',
      titulo: 'Conta criada e aguardando aprovação',
      texto: 'Um administrador vai analisar seu cadastro. Enquanto isso, você já pode cadastrar serviços e sua régua de desconto.',
      regra: 'RN-28',
    });
  }

  return ctx.redirecionar('/buscar', {
    tipo: 'sucesso', texto: 'Conta criada. Bons encaixes!',
  });
}

// --------------------------------------------------------------- buscar

/** Monta a URL da busca trocando (ou removendo) um filtro. */
function urlDaBusca(filtros, descricao, mudanca = {}) {
  const atual = { ...filtros, descricao, ...mudanca };
  const qs = new URLSearchParams();
  for (const [chave, valor] of Object.entries(atual)) {
    if (valor != null && valor !== '') qs.set(chave, String(valor));
  }
  const texto = qs.toString();
  return texto ? `/buscar?${texto}` : '/buscar';
}

async function buscar(ctx) {
  const categorias = catalogo.listarCategorias();
  const regioes = catalogo.listarRegioes();

  let filtros = {
    categoriaId: ctx.query.categoriaId || null,
    regiaoId: ctx.query.regiaoId || null,
    de: ctx.query.de || null,
    ate: ctx.query.ate || null,
    ordenar: ctx.query.ordenar || 'proximidade',
  };

  let painelIa = cru('');
  const descricao = (ctx.query.descricao ?? '').trim();

  // UC-04 - o texto livre vira filtros; a busca em si continua deterministica.
  if (descricao) {
    try {
      const leitura = await busca.interpretar({ clienteId: ctx.usuario?.id ?? null, texto: descricao });

      if (leitura.precisaFormulario) {
        ctx.avisar({
          tipo: 'atencao',
          titulo: 'A interpretação automática não está disponível',
          texto: 'Use os filtros abaixo — a busca funciona normalmente sem ela.',
          regra: 'RN-31',
        });
      } else {
        filtros = { ...filtros, ...leitura.filtros };
        painelIa = painelDeInterpretacao(descricao, leitura, categorias, regioes, filtros);
        if (leitura.precisaConfirmar) {
          ctx.avisar({
            tipo: 'atencao',
            titulo: 'Confira os filtros antes de buscar',
            texto: leitura.motivo,
            regra: 'RN-30',
          });
        }
      }
    } catch (erro) {
      ctx.avisar({ tipo: 'atencao', texto: erro.message, regra: erro.regra ?? null });
    }
  }

  const resultados = busca.buscarPorFiltros(filtros);
  const p = params();

  const categoriaAtiva = categorias.find((c) => String(c.id) === String(filtros.categoriaId));
  const regiaoAtiva = regioes.find((rg) => String(rg.id) === String(filtros.regiaoId));

  // Vale o filtro que veio na URL, nao so o que casou com o catalogo: um id
  // invalido zera os resultados e o usuario precisa ver que ele existe, senao
  // fica olhando uma lista vazia sem explicacao.
  const temFiltro = Boolean(
    filtros.categoriaId || filtros.regiaoId || descricao || filtros.de,
  );

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Horários disponíveis</h1>
      <p>Preços já com o desconto vigente para este instante. Horários com menos de
        ${p.antecedencia_min_reserva_min} min de antecedência saem da busca automaticamente.</p>
    </div>

    <form class="cartao" method="get" action="/buscar" role="search">
      <div class="campo">
        <label for="descricao">Descreva o que você precisa</label>
        <div class="busca-principal">
          <input id="descricao" name="descricao" value="${descricao}" class="crescer"
                 placeholder="Ex.: preciso cortar o cabelo hoje à tarde, corte masculino simples">
          <button class="botao" type="submit">Buscar</button>
        </div>
        <div class="ajuda">
          O texto é convertido em filtros estruturados. A escolha dos horários exibidos é do sistema,
          não do modelo (<code>RN-29</code>).
        </div>
      </div>

      <div class="grade grade-4">
        <div class="campo">
          <label for="categoriaId">Categoria</label>
          <select id="categoriaId" name="categoriaId">
            <option value="">Todas</option>
            ${juntar(categorias.map((c) => html`
              <option value="${c.id}" ${String(filtros.categoriaId) === String(c.id) ? 'selected' : ''}>${c.nome}</option>`))}
          </select>
        </div>
        <div class="campo">
          <label for="regiaoId">Região</label>
          <select id="regiaoId" name="regiaoId">
            <option value="">Todas</option>
            ${juntar(regioes.map((rg) => html`
              <option value="${rg.id}" ${String(filtros.regiaoId) === String(rg.id) ? 'selected' : ''}>${rg.bairro}</option>`))}
          </select>
        </div>
        <div class="campo">
          <label for="ordenar">Ordenar por</label>
          <select id="ordenar" name="ordenar">
            ${juntar(Object.entries(busca.ORDENACOES).map(([valor, texto]) => html`
              <option value="${valor}" ${filtros.ordenar === valor ? 'selected' : ''}>${texto}</option>`))}
          </select>
        </div>
        <div class="campo campo-fim">
          <button class="botao botao-secundario botao-largo" type="submit">Aplicar filtros</button>
        </div>
      </div>
      <input type="hidden" name="de" value="${filtros.de ?? ''}">
      <input type="hidden" name="ate" value="${filtros.ate ?? ''}">
    </form>

    ${temFiltro ? html`
      <div class="filtros-ativos">
        <span class="rotulo-filtros">Filtros</span>
        ${descricao ? chip(`"${descricao}"`, { href: urlDaBusca(filtros, '', { descricao: '' }) }) : cru('')}
        ${filtros.categoriaId
    ? chip(categoriaAtiva?.nome ?? 'categoria desconhecida',
      { href: urlDaBusca(filtros, descricao, { categoriaId: '' }) })
    : cru('')}
        ${filtros.regiaoId
    ? chip(regiaoAtiva?.bairro ?? 'região desconhecida',
      { href: urlDaBusca(filtros, descricao, { regiaoId: '' }) })
    : cru('')}
        ${filtros.de ? chip(`a partir de ${formatarDataHora(filtros.de)}`, { href: urlDaBusca(filtros, descricao, { de: '', ate: '' }) }) : cru('')}
        <a class="botao botao-fantasma botao-pequeno" href="/buscar">Limpar tudo</a>
      </div>` : cru('')}

    ${painelIa}

    <div class="secao-titulo">
      <h2>${plural(resultados.length, 'horário encontrado', 'horários encontrados')}</h2>
      ${resultados.length ? html`<span class="pequeno fraco">${busca.ORDENACOES[filtros.ordenar]}</span>` : cru('')}
    </div>

    ${resultados.length === 0
    ? vazio(
      html`Nenhum horário compatível com esses filtros nas próximas 72 horas.
      Ampliar a janela ou trocar de categoria costuma resolver — a oferta muda o dia todo,
      porque cada desistência de última hora vira um horário aqui.`,
      {
        titulo: 'Nenhum encaixe por enquanto',
        acoes: [
          ...(temFiltro ? [['/buscar', 'Ver todos os horários abertos']] : []),
          ...(filtros.categoriaId ? [[urlDaBusca(filtros, descricao, { categoriaId: '' }), 'Buscar em todas as categorias']] : []),
          ...(filtros.regiaoId ? [[urlDaBusca(filtros, descricao, { regiaoId: '' }), 'Buscar em todas as regiões']] : []),
          ['/buscar?ordenar=desconto', 'Ver os maiores descontos'],
        ],
      },
    )
    : html`<div class="lista-cartoes">
        ${juntar(resultados.map((vaga) => cartaoDeVaga(vaga, {
    href: `/horarios/${vaga.id}`,
    acao: acaoDeReserva(ctx, vaga),
  })))}
      </div>`}
  `, {
    titulo: 'Buscar horários',
    descricao: 'Busque horários vagos por categoria, região e janela de horário, '
      + 'ou descreva em uma frase o que você precisa.',
  });
}

function acaoDeReserva(ctx, vaga) {
  if (!ctx.usuario) {
    return html`<a class="botao botao-pequeno botao-largo"
      href="/entrar?destino=${encodeURIComponent(`/horarios/${vaga.id}`)}">Entrar para reservar</a>`;
  }
  if (ctx.usuario.perfil !== 'CLIENTE') {
    return html`<div class="mini fraco">Apenas clientes reservam</div>`;
  }
  return html`
    <form method="post" action="/reservar">
      ${campoCsrf(ctx.csrf)}
      <input type="hidden" name="horarioId" value="${vaga.id}">
      <button class="botao botao-pequeno botao-largo" type="submit">Reservar por ${formatarBRL(vaga.preco.precoVigente)}</button>
    </form>`;
}

/** Mostra o que o modelo extraiu - e deixa o cliente corrigir (RF-035). */
function painelDeInterpretacao(descricao, leitura, categorias, regioes, filtros) {
  const i = leitura.interpretacao;
  const categoria = categorias.find((c) => c.id === leitura.filtros.categoriaId);
  const regiao = regioes.find((rg) => rg.id === leitura.filtros.regiaoId);
  const confianca = Math.round((i.confianca ?? 0) * 100);

  return html`
  <div class="cartao cartao-realce">
    <div class="linha entre">
      <h3 class="sem-topo sem-fundo">O que o sistema entendeu</h3>
      <span class="selo selo-${leitura.precisaConfirmar ? 'aviso' : 'ok'}">confiança ${confianca}%</span>
    </div>
    <p class="pequeno fraco acima-2 abaixo-3">“${descricao}”</p>

    <div class="grade grade-4">
      <div>
        <span class="mini fraco">Categoria</span>
        <div class="forte">${categoria?.nome
    ?? (i.categoriaSugerida ? `${i.categoriaSugerida} (fora do catálogo)` : 'não identificada')}</div>
      </div>
      <div>
        <span class="mini fraco">Urgência</span>
        <div class="forte">${i.urgencia}</div>
      </div>
      <div>
        <span class="mini fraco">Duração estimada</span>
        <div class="forte">${i.duracaoEstimadaMin ? `${i.duracaoEstimadaMin} min` : '—'}</div>
      </div>
      <div>
        <span class="mini fraco">Região</span>
        <div class="forte">${regiao?.bairro ?? 'qualquer'}</div>
      </div>
    </div>

    ${leitura.filtros.de ? html`
      <p class="mini fraco acima-3 sem-fundo">
        Janela considerada: ${formatarDataHora(leitura.filtros.de)} até ${formatarDataHora(leitura.filtros.ate)}
      </p>` : cru('')}

    <div class="linha acima-3">
      <a class="botao botao-secundario botao-pequeno" href="${urlDaBusca(filtros, '', { descricao: '' })}">
        Buscar sem a interpretação
      </a>
      <span class="mini fraco">Modelo: <code>${i.modelo}</code></span>
    </div>

    ${notaDeRegra('INV-14', 'Os filtros acima são editáveis no formulário. O modelo interpreta o texto; '
    + 'quem seleciona, ordena e precifica os horários é o sistema.')}
  </div>`;
}

// ------------------------------------------------- detalhe de um horario

/**
 * UC-03, passo 5: a tela onde o cliente decide. Reune o que a spec manda
 * exibir sobre uma oferta - preco vigente, base, percentual, proximo degrau
 * (RF-026), reputacao do prestador (RF-070) e a politica de confirmacao que
 * vai valer se ele reservar (RN-10).
 */
function detalheDoHorario(ctx) {
  const vaga = horariosApp.detalhe(Number(ctx.params.id));
  const p = params();
  const nome = vaga.nome_exibicao ?? vaga.prestador_nome;
  const disponivel = vaga.estado === 'PUBLICADO' && vaga.preco.reservavel;

  const politica = vaga.politica_expiracao === 'AUTOCONFIRMAR'
    ? {
      titulo: 'Confirmação automática',
      texto: `Se ${nome} não responder em ${vaga.janela_confirmacao_min} min, a reserva é `
        + 'confirmada automaticamente e o horário passa a ser seu.',
    }
    : {
      titulo: 'Liberação do horário',
      texto: `Se ${nome} não responder em ${vaga.janela_confirmacao_min} min, a reserva expira, o `
        + 'horário volta para a busca e você não sofre nenhuma penalidade.',
    };

  return ctx.render(html`
    <div class="trilha"><a href="/buscar">&larr; Voltar para a busca</a></div>

    <div class="cartao">
      <div class="linha entre linha-topo">
        <div class="crescer">
          <span class="olho">${vaga.categoria_nome}</span>
          <h1 class="sem-topo abaixo-3">${vaga.servico_nome}</h1>
          <p class="fraco sem-fundo">
            com <a href="/prestadores/${vaga.prestador_id}">${nome}</a>
            ${vaga.bairro ? html`<span class="ponto"> · </span>${vaga.bairro} — ${vaga.cidade}` : cru('')}
          </p>
        </div>
        <div>${disponivel ? selo('PUBLICADO') : selo(vaga.estado)}</div>
      </div>

      <hr class="divisor">

      <div class="vaga">
        <div class="vaga-quando">
          <span class="dia">${formatarDiaSemana(vaga.inicio)}</span>
          <span class="hora">${formatarHora(vaga.inicio)}</span>
          <span class="duracao">${vaga.duracao_min} min</span>
        </div>
        <div class="vaga-corpo">
          <div class="vaga-sinais sem-topo">
            ${seloReputacao(vaga.prestador_reputacao)}
            <span class="selo selo-neutro">Começa em ${humanizarMinutos(vaga.preco.antecedenciaMin)}</span>
            <span class="selo selo-info">${politica.titulo}</span>
          </div>
          <p class="pequeno fraco acima-3 sem-fundo">${politica.texto}</p>
        </div>
        <div class="vaga-lado">
          ${blocoDePreco(vaga.preco)}
          ${disponivel
    ? acaoDeReserva(ctx, vaga)
    : html`<div class="mini fraco">Este horário não está mais disponível para reserva.</div>`}
        </div>
      </div>

      ${disponivel
    ? notaDeRegra('RN-04', 'O preço mostrado acima é travado no instante da reserva e não muda até o '
      + 'desfecho — nem se o desconto aumentar, nem se o prestador editar a régua.')
    : notaDeRegra('RN-07', `Um horário sai da busca quando falta menos de ${p.antecedencia_min_reserva_min} min `
      + 'para o início, ou quando já foi reservado por outra pessoa.')}
    </div>

    ${vaga.regua.length ? html`
      <h2>A régua deste horário</h2>
      <div class="cartao">
        ${reguaDeDesconto(vaga.regua, { antecedenciaMin: vaga.preco.antecedenciaMin })}
        ${notaDeRegra('RN-03', 'O desconto nunca passa do piso definido pelo prestador para este serviço, '
    + `nem do teto de ${p.desconto_maximo_pct}% da plataforma. Vence o mais restritivo dos dois.`)}
      </div>` : cru('')}

    <h2>O que acontece depois de reservar</h2>
    <div class="grade grade-3">
      <div class="cartao passo" data-passo="01">
        <h3>O preço trava</h3>
        <p class="pequeno fraco">O valor vigente vira o valor do agendamento e a comissão passa a ser
        calculada sobre ele, nunca sobre o preço-base.</p>
      </div>
      <div class="cartao passo" data-passo="02">
        <h3>O prestador responde</h3>
        <p class="pequeno fraco">${nome} tem ${vaga.janela_confirmacao_min} min para confirmar ou
        recusar. Enquanto isso, o horário fica bloqueado só para você.</p>
      </div>
      <div class="cartao passo" data-passo="03">
        <h3>Você é avisado</h3>
        <p class="pequeno fraco">Confirmação, recusa e expiração geram notificação. Recusa e expiração
        não penalizam o cliente.</p>
      </div>
    </div>
    ${notaDeRegra('RN-09', 'Enquanto a reserva estiver em aberto, nenhum outro cliente consegue reservar '
    + 'este horário: um horário nunca tem dois agendamentos ativos.')}
  `, {
    titulo: `${vaga.servico_nome} às ${formatarHora(vaga.inicio)}`,
    descricao: `${vaga.servico_nome} com ${nome}${vaga.bairro ? ` em ${vaga.bairro}` : ''}, `
      + `às ${formatarHora(vaga.inicio)}, por ${formatarBRL(vaga.preco.precoVigente)}.`,
  });
}

// -------------------------------------------------------- perfil publico

/**
 * Destino do "voltar" do perfil publico. A tela e alcancavel pela busca, pelo
 * detalhe de um horario e pela pagina de um agendamento: o Referer devolve o
 * usuario para onde ele estava, e /buscar cobre o caso de Referer ausente
 * (link direto, favorito, aba nova). So caminho interno e aceito - Referer e
 * cabecalho controlado pelo cliente.
 */
function destinoDeVolta(ctx) {
  const referer = ctx.req.headers.referer;
  if (referer) {
    try {
      const origem = new URL(referer, ctx.url.origin);
      if (origem.origin !== ctx.url.origin) return { href: '/buscar', texto: 'Voltar para a busca' };
      if (origem.pathname.startsWith('/agendamentos/')) {
        return { href: origem.pathname, texto: 'Voltar ao agendamento' };
      }
      if (origem.pathname.startsWith('/horarios/')) {
        return { href: origem.pathname, texto: 'Voltar ao horário' };
      }
    } catch { /* Referer malformado cai no padrao. */ }
  }
  return { href: '/buscar', texto: 'Voltar para a busca' };
}

function perfilPublico(ctx) {
  const perfil = contas.perfilPublico(Number(ctx.params.id));
  const voltar = destinoDeVolta(ctx);

  return ctx.render(html`
    <div class="trilha"><a href="${voltar.href}">&larr; ${voltar.texto}</a></div>
    <div class="cabecalho-pagina">
      <h1>${perfil.nome_exibicao ?? perfil.nome}</h1>
      <p>${perfil.bairro ? `${perfil.bairro} — ${perfil.cidade}` : 'Região não informada'}</p>
    </div>

    <div class="cartao">
      ${perfil.descricao ? html`<p class="medida">${perfil.descricao}</p><hr class="divisor">` : cru('')}
      <div class="grade grade-4">
        <div>${reputacao(perfil.reputacao)}</div>
        <div>
          <span class="mini fraco">Atendimentos concluídos</span>
          <div class="forte num">${perfil.concluidos}</div>
        </div>
        <div>
          <span class="mini fraco">Taxa de ausência</span>
          <div class="forte num">${perfil.taxa_noshow}%</div>
        </div>
        <div>
          <span class="mini fraco">Na plataforma desde</span>
          <div class="forte">${formatarDataHora(perfil.criado_em)}</div>
        </div>
      </div>
    </div>

    <h2>${plural(perfil.avaliacoes.length, 'avaliação recebida', 'avaliações recebidas')}</h2>
    ${perfil.avaliacoes.length === 0
    ? vazio(
      'As notas só ficam visíveis quando as duas partes avaliam, ou quando a janela de avaliação encerra.',
      { titulo: 'Ainda sem avaliações visíveis' },
    )
    : html`<div class="cartao"><ul class="lista-limpa">
        ${juntar(perfil.avaliacoes.map((a) => html`
          <li>
            <div class="linha entre">
              ${estrelas(a.nota)}
              <span class="mini fraco">${formatarDataHora(a.criada_em)}</span>
            </div>
            ${a.comentario ? html`<div class="pequeno acima-1">${a.comentario}</div>` : cru('')}
          </li>`))}
      </ul></div>`}

    ${notaDeRegra('RNF-04', 'O perfil público mostra reputação e histórico agregado. Dados de contato só aparecem entre as partes de um agendamento confirmado.')}
  `, {
    titulo: perfil.nome_exibicao ?? perfil.nome,
    descricao: `Perfil público de ${perfil.nome_exibicao ?? perfil.nome} no Encaixe: `
      + `reputação ${perfil.reputacao}/100 e ${perfil.concluidos} atendimentos concluídos.`,
  });
}
