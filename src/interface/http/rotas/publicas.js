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
  blocoDePreco, reguaDeDesconto, estrelas, chip, plural, avatar, icone,
} from '../views/layout.js';
import {
  formatarDataHora, formatarHora, formatarDiaSemana, formatarDiaLongo, humanizarMinutos,
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

/**
 * Fotos de categoria (geradas por IA a partir do briefing em
 * docs/imagem-hero.md). Ilustram o tipo de atendimento, nunca um prestador
 * real: a legenda e o nome da categoria, nao o de um negocio. A chave casa
 * com o nome da categoria sem acento; categoria sem foto vai para a lista.
 */
const FOTOS_DE_CATEGORIA = [
  { chave: 'cabelo', arquivo: 'foto-salao.jpg', alt: 'Cabeleireira secando o cabelo de uma cliente num salão claro' },
  { chave: 'treino', arquivo: 'foto-treino.jpg', alt: 'Personal acompanhando uma aluna num agachamento com kettlebell' },
  { chave: 'automotivo', arquivo: 'foto-oficina.jpg', alt: 'Mecânica mostrando ao cliente o motor de um carro na oficina' },
];

const semAcento = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function existeEmPublic(arquivo) {
  return existsSync(fileURLToPath(new URL(`../../../../public/${arquivo}`, import.meta.url)));
}

function home(ctx) {
  if (ctx.usuario?.perfil === 'PRESTADOR') return ctx.redirecionar('/prestador');
  if (ctx.usuario?.perfil === 'ADMIN') return ctx.redirecionar('/admin');

  const p = params();
  // A home inteira sai do banco: horarios, contagens e a regua de exemplo sao
  // os do instante da visita. Nenhum numero de vitrine e texto fixo.
  const proximos = busca.buscarPorFiltros({ ordenar: 'proximidade' });
  const porDesconto = busca.buscarPorFiltros({ ordenar: 'desconto' });

  const abertosPorCategoria = new Map();
  for (const v of proximos) {
    abertosPorCategoria.set(v.categoria_id, (abertosPorCategoria.get(v.categoria_id) ?? 0) + 1);
  }
  const categorias = catalogo.listarCategorias()
    .map((c) => ({ ...c, abertos: abertosPorCategoria.get(c.id) ?? 0 }));

  return ctx.render(html`
    ${secaoDeCategorias(categorias)}
    ${porDesconto[0] ? secaoDoPreco(porDesconto[0], p) : cru('')}
    ${secaoComoFunciona(p)}
    ${secaoDoPrestador(p)}
    ${secaoDeRegras()}
    ${secaoDePerguntas()}

    <section class="secao campo-marca" aria-label="Por onde começar" data-revelar>
      <div class="chamada-final">
        <div>
          <h2>Procurando horário?</h2>
          <p>Buscar não pede conta. Você só entra na hora de reservar.</p>
          <a class="botao botao-grande" href="/buscar">Encontrar horários <span class="seta">→</span></a>
        </div>
        <div>
          <h2>Tem horário vago?</h2>
          <p>Cadastre o negócio, monte sua régua de desconto e publique assim que a conta for aprovada.</p>
          <a class="botao botao-grande botao-secundario" href="/cadastrar?perfil=PRESTADOR">Cadastrar meu negócio</a>
        </div>
      </div>
    </section>
  `, {
    titulo: 'Horários vagos perto de você, com desconto',
    descricao: 'Encontre horários vagos de prestadores do seu bairro. O desconto cresce conforme o '
      + 'horário se aproxima, dentro da régua de cada prestador, e o preço fica travado na reserva.',
    hero: heroDaHome({ proximos, categorias }),
  });
}

/**
 * Fundo do hero: uma grade de agenda desenhada, sete colunas de dias com
 * blocos de horario. A maioria e so contorno (agenda livre), alguns estao
 * ocupados e uns poucos levam a peca laranja encaixada na ponta, como no logo.
 * E decorativo e nao representa horario nenhum, por isso nao tem texto nem
 * numero. As cores sao classes do CSS, para seguir o tema escolhido.
 * Gerado uma vez na carga do modulo, com sequencia fixa: a mesma em toda visita.
 */
const FUNDO_DE_AGENDA = (() => {
  let semente = 7;
  const sortear = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
  const COLUNAS = 7, LINHAS = 11, LARG = 196, ALT = 64, VAO = 14;
  const blocos = [];
  for (let c = 0; c < COLUNAS; c++) {
    for (let l = 0; l < LINHAS; l++) {
      const x = c * (LARG + VAO), y = l * (ALT + VAO);
      const r = sortear();
      if (r < 0.1) {
        // Horario vago: faixa da marca com a peca laranja na ponta.
        blocos.push(`<rect class="af-vago" x="${x}" y="${y}" width="${LARG}" height="${ALT}" rx="14"/>`
          + `<rect class="af-peca" x="${x + LARG - 52}" y="${y + 10}" width="42" height="${ALT - 20}" rx="9"/>`);
      } else if (r < 0.38) {
        blocos.push(`<rect class="af-ocupado" x="${x}" y="${y}" width="${LARG}" height="${ALT}" rx="14"/>`);
      } else {
        blocos.push(`<rect class="af-livre" x="${x + 1}" y="${y + 1}" width="${LARG - 2}" height="${ALT - 2}" rx="13"/>`);
      }
    }
  }
  const w = COLUNAS * (LARG + VAO) - VAO, h = LINHAS * (ALT + VAO) - VAO;
  return `<div class="heroi-fundo" aria-hidden="true"><svg viewBox="0 0 ${w} ${h}" `
    + `preserveAspectRatio="xMidYMid slice" focusable="false">${blocos.join('')}</svg></div>`;
})();

/**
 * Hero da home: o titulo de um lado e, do outro, a agenda aberta - os
 * proximos horarios publicados de verdade, cada um com o preco vigente que o
 * dominio calculou para este instante. E a ideia do produto na primeira tela:
 * um horario que vagou na agenda de alguem, perto e por menos.
 */
function heroDaHome({ proximos, categorias }) {
  const atalhos = categorias.filter((c) => c.abertos > 0).sort((a, b) => b.abertos - a.abertos).slice(0, 4);

  return html`
  <section class="heroi">
    ${cru(FUNDO_DE_AGENDA)}
    <div class="heroi-interno">
      <div class="heroi-texto" data-revelar>
        <h1>Horário vago perto de você, por menos.</h1>
        <p class="heroi-chamada">
          Prestadores do bairro publicam os horários que ficaram livres na agenda. Quanto mais perto da
          hora, maior o desconto, até o limite que cada um define.
        </p>

        <form class="heroi-busca" method="get" action="/buscar" role="search">
          <label class="so-leitor" for="busca-hero">O que você precisa?</label>
          <div class="busca-principal">
            <input id="busca-hero" name="descricao" class="crescer"
                   placeholder="Ex.: corte hoje depois das 18h">
            <button class="botao" type="submit">Encontrar horários</button>
          </div>
        </form>

        ${atalhos.length ? html`
          <div class="heroi-atalhos">
            <span class="rotulo-atalhos">ou vá direto:</span>
            ${juntar(atalhos.map((c) => chip(c.nome, { href: `/buscar?categoriaId=${c.id}`, neutro: true, remover: false })))}
          </div>` : cru('')}

        <p class="heroi-prestador">
          Atende clientes? <a href="#para-prestadores">Veja como publicar seus horários vagos</a>.
        </p>
      </div>

      ${agendaAberta(proximos)}
    </div>
  </section>`;
}

/** Os proximos horarios abertos, agrupados por dia, como uma coluna de agenda. */
function agendaAberta(proximos) {
  const LIMITE = 6;
  if (!proximos.length) {
    return html`
      <section class="agenda-aberta" aria-labelledby="agenda-aberta-titulo" data-revelar style="--atraso:120ms">
        <div class="agenda-aberta-cabeca"><h2 id="agenda-aberta-titulo">Agenda aberta</h2></div>
        ${vazio('Assim que um prestador publicar um horário vago, ele aparece aqui com o preço do momento.', {
    titulo: `Nenhum horário aberto nas próximas ${busca.JANELA_PADRAO_H} h`,
    acoes: [['/buscar?janela=72', 'Buscar nos próximos 3 dias']],
  })}
      </section>`;
  }

  let diaAnterior = null;
  const linhas = proximos.slice(0, LIMITE).map((v) => {
    const dia = formatarDiaLongo(v.inicio);
    const cabecaDoDia = dia !== diaAnterior
      ? html`<li class="agenda-aberta-dia" aria-hidden="true">${dia[0].toUpperCase() + dia.slice(1)}</li>` : cru('');
    diaAnterior = dia;
    const comDesconto = v.preco.percentualEfetivo > 0;
    return html`
      ${cabecaDoDia}
      <li>
        <a class="agenda-aberta-link" href="/horarios/${v.id}">
          <span class="agenda-aberta-hora"><span class="so-leitor">${dia}, às </span>${formatarHora(v.inicio)}</span>
          <span class="agenda-aberta-faixa">
            <span class="agenda-aberta-servico">${v.servico_nome}</span>
            <span class="agenda-aberta-onde">${v.nome_exibicao ?? v.prestador_nome}${v.bairro ? ` · ${v.bairro}` : ''}</span>
          </span>
          <span class="agenda-aberta-preco${comDesconto ? '' : ' cheio'}">
            <strong>${formatarBRL(v.preco.precoVigente)}</strong>
            <span>${comDesconto ? `−${v.preco.percentualEfetivo}%` : 'preço cheio'}</span>
          </span>
        </a>
      </li>`;
  });

  return html`
    <section class="agenda-aberta" aria-labelledby="agenda-aberta-titulo" data-revelar style="--atraso:120ms">
      <div class="agenda-aberta-cabeca">
        <h2 id="agenda-aberta-titulo">Agenda aberta agora</h2>
        <p>${plural(proximos.length, 'horário', 'horários')} nas próximas ${busca.JANELA_PADRAO_H}&nbsp;h</p>
      </div>
      <ol class="agenda-aberta-lista">${juntar(linhas)}</ol>
      <div class="agenda-aberta-rodape">
        <span>Preço deste instante. Ele trava quando você reserva.</span>
        <a href="/buscar">${proximos.length > LIMITE ? `Ver os ${proximos.length} horários` : 'Abrir a busca'} <span class="seta">→</span></a>
      </div>
    </section>`;
}

function secaoDeCategorias(categorias) {
  if (!categorias.length) return cru('');
  const comFoto = [];
  const semFoto = [];
  for (const c of categorias) {
    const foto = FOTOS_DE_CATEGORIA.find((f) => semAcento(c.nome).includes(f.chave));
    if (foto && existeEmPublic(foto.arquivo) && !comFoto.some((x) => x.foto === foto)) comFoto.push({ ...c, foto });
    else semFoto.push(c);
  }
  const contagem = (c) => (c.abertos ? plural(c.abertos, 'horário aberto', 'horários abertos') : 'Nenhum horário agora');

  return html`
    <section class="secao secao-primeira" aria-labelledby="titulo-categorias">
      <div class="secao-cabeca" data-revelar>
        <div>
          <h2 id="titulo-categorias">O que vagou por aqui</h2>
          <p>As contagens são dos horários abertos agora, nas próximas ${busca.JANELA_PADRAO_H} h.</p>
        </div>
      </div>
      <div class="categorias">
        ${juntar(comFoto.map((c, i) => html`
          <a class="categoria-foto" href="/buscar?categoriaId=${c.id}" data-revelar style="--atraso:${i * 80}ms">
            <figure><img src="/estatico/${c.foto.arquivo}" alt="${c.foto.alt}" width="720" height="900"
              loading="lazy" decoding="async"></figure>
            <span class="categoria-nome">${c.nome}</span>
            <span class="categoria-conta">${contagem(c)}</span>
          </a>`))}
        ${semFoto.length ? html`
          <div class="categorias-outras" data-revelar style="--atraso:${comFoto.length * 80}ms">
            <h3>${comFoto.length ? 'Outras categorias' : 'Categorias'}</h3>
            <ul>
              ${juntar(semFoto.map((c) => html`
                <li><a href="/buscar?categoriaId=${c.id}">${c.nome} <span class="num">${c.abertos || '—'}</span></a></li>`))}
            </ul>
          </div>` : cru('')}
      </div>
    </section>`;
}

/**
 * Por que existe desconto, com um horario real da vitrine. Cada degrau vem de
 * `projetarRegua` no dominio (RF-027) - a pagina desenha, nao calcula.
 */
function secaoDoPreco(vitrine, p) {
  const detalhe = horariosApp.detalhe(vitrine.id);
  if (!detalhe.regua.length) return cru('');

  return html`
    <section class="secao par" id="preco" aria-labelledby="titulo-preco">
      <div class="secao-texto" data-revelar>
        <h2 id="titulo-preco">O desconto vem do relógio.</h2>
        <p>O serviço é o mesmo do preço cheio. O que muda é quanto falta para começar: um horário vago não
        pode ser guardado para depois.</p>
        <p>Cada prestador decide a partir de quando o desconto começa e até onde ele vai. A plataforma
        nunca passa de ${p.desconto_maximo_pct}%.</p>
        <dl class="termos">
          <div><dt>Preço-base</dt><dd>o preço cheio do serviço, definido pelo prestador.</dd></div>
          <div><dt>Faixa</dt><dd>quanto tempo antes do horário cada desconto entra em vigor.</dd></div>
          <div><dt>Preço vigente</dt><dd>o preço deste instante. Pode baixar até a hora, nunca subir.</dd></div>
          <div><dt>Preço travado</dt><dd>o vigente no momento da reserva. Daí em diante, não muda.</dd></div>
        </dl>
      </div>

      <div class="cartao" data-revelar style="--atraso:120ms">
        <div class="linha entre linha-topo abaixo-3">
          <div class="crescer">
            <h3 class="sem-topo sem-fundo">${detalhe.servico_nome}</h3>
            <p class="pequeno fraco sem-fundo">${detalhe.nome_exibicao ?? detalhe.prestador_nome},
              ${formatarDiaLongo(detalhe.inicio)} às ${formatarHora(detalhe.inicio)} · exemplo real da vitrine</p>
          </div>
          <a class="botao botao-secundario botao-pequeno" href="/horarios/${detalhe.id}">Abrir este horário</a>
        </div>
        ${reguaDeDesconto(detalhe.regua, { antecedenciaMin: detalhe.preco.antecedenciaMin })}
        ${notaDeRegra('RN-01', 'Vale a faixa de menor antecedência entre as que já entraram em vigor. '
    + `Nenhum desconto passa do teto de ${p.desconto_maximo_pct}% da plataforma nem do piso do prestador.`)}
      </div>
    </section>`;
}

function secaoComoFunciona(p) {
  return html`
    <section class="secao" id="como-funciona" aria-labelledby="titulo-como">
      <div class="secao-cabeca" data-revelar>
        <div>
          <h2 id="titulo-como">Do horário vago ao atendimento</h2>
          <p>Buscar não exige conta. Para reservar, você entra ou cria uma conta de cliente.</p>
        </div>
        <a class="botao botao-secundario" href="/buscar">Encontrar horários <span class="seta">→</span></a>
      </div>
      <ol class="passos passos-linha" data-revelar>
        <li><h3>Busque</h3><p>Por categoria, região e janela de horário, ou escrevendo o que você precisa.</p></li>
        <li><h3>Compare</h3><p>Cada horário mostra o preço cheio, o desconto do momento e a reputação de quem atende.</p></li>
        <li><h3>Reserve</h3><p>O preço trava na hora, e o horário fica bloqueado só para você enquanto o prestador responde.</p></li>
        <li><h3>Espere a confirmação</h3><p>O prestador tem a janela dele, em geral ${p.janela_confirmacao_min} min.
          Sem resposta, vale a política dele: liberar o horário ou confirmar sozinho. Você não é penalizado.</p></li>
        <li><h3>Vá ao atendimento</h3><p>O pagamento é presencial, direto com o prestador. Depois, os dois se avaliam.</p></li>
      </ol>
    </section>`;
}

function secaoDoPrestador(p) {
  const foto = existeEmPublic('foto-barbearia.jpg')
    ? html`<figure data-revelar><img src="/estatico/foto-barbearia.jpg" width="720" height="900" loading="lazy" decoding="async"
        alt="Barbeiro recebendo um cliente na porta da barbearia"></figure>`
    : cru('');

  return html`
    <section class="secao bloco-prestador" id="para-prestadores" aria-labelledby="titulo-prestador">
      ${foto}
      <div class="secao-texto" data-revelar style="--atraso:100ms">
        <h2 id="titulo-prestador">O horário vago vira cliente.</h2>
        <p>As 15h de hoje deixam de existir às 15h01. Publique o horário que ficou livre e deixe a sua régua
        de desconto trabalhar até lá.</p>
        <ol class="passos">
          <li><h3>Crie a conta de prestador</h3><p>Com o nome do negócio, a região e um contato.</p></li>
          <li><h3>Aguarde a aprovação</h3><p>Um administrador analisa o cadastro. Enquanto isso, você já monta
            serviços e régua.</p></li>
          <li><h3>Publique o horário vago</h3><p>Escolha o serviço, a hora e a régua. Publicar pede ao menos
            ${p.antecedencia_min_publicacao_min} min de antecedência.</p></li>
          <li><h3>Responda às reservas</h3><p>Confirme ou recuse, com motivo, dentro da sua janela de confirmação.</p></li>
        </ol>
        <div class="vantagens">
          <div><h3>Você decide quanto cede</h3><p>Onde o desconto começa, quanto cresce e onde para. O preço cheio
            continua valendo para a clientela fixa.</p></div>
          <div><h3>Comissão só no atendimento feito</h3><p>${p.comissao_pct_padrao}% sobre o valor final do agendamento
            concluído. Reserva expirada, recusada ou cancelada pelo cliente não gera cobrança.</p></div>
        </div>
        <div class="linha">
          <a class="botao botao-grande" href="/cadastrar?perfil=PRESTADOR">Cadastrar meu negócio <span class="seta">→</span></a>
          <a class="botao botao-fantasma" href="/entrar">Já tenho conta</a>
        </div>
      </div>
    </section>`;
}

function secaoDeRegras() {
  const regras = [
    ['Você vê a consequência antes de confirmar', 'Cancelar mostra a faixa aplicável e o efeito exato na reputação antes do botão, nunca depois.', 'RN-18'],
    ['O preço que você viu é o preço que vale', 'O valor trava no instante da reserva e não muda depois, nem se o prestador editar a régua.', 'RN-04'],
    ['Reputação vem de fatos', 'Cada ponto sai de um evento rastreável: atendimento concluído, avaliação, cancelamento, ausência. Ninguém edita o número à mão.', 'RN-23'],
    ['Avaliação às cegas', 'As notas só aparecem quando os dois avaliam ou quando o prazo acaba, para ninguém avaliar por retaliação.', 'RN-25'],
    ['Disputa com desfecho definido', 'Depois do atendimento, qualquer parte pode abrir disputa com motivo e evidência. Só o administrador decide, com justificativa escrita.', 'RN-27'],
    ['A IA interpreta, o sistema decide', 'O modelo transforma o seu texto em filtros. Quem seleciona, ordena e precifica é código determinístico, e a busca funciona sem ele.', 'INV-14'],
  ];
  return html`
    <section class="secao" id="regras" aria-labelledby="titulo-regras">
      <div class="secao-cabeca" data-revelar>
        <div>
          <h2 id="titulo-regras">Regras que aparecem antes de você agir</h2>
          <p>Toda decisão do sistema cita a regra que a tomou, e esse código chega até a tela.</p>
        </div>
      </div>
      <ul class="regras-lista">
        ${juntar(regras.map(([titulo, texto, regra], i) => html`
          <li data-revelar style="--atraso:${(i % 2) * 80}ms">
            <h3>${titulo} <span class="selo selo-regra">${regra}</span></h3>
            <p>${texto}</p>
          </li>`))}
      </ul>
    </section>`;
}

function secaoDePerguntas() {
  const perguntas = [
    ['A reserva já garante o horário?', html`Ela bloqueia o horário só para você e trava o preço, mas o atendimento só
      fica confirmado quando o prestador aceita, ou quando a janela dele vence e a política dele é confirmar sozinho.`],
    ['Como eu pago?', html`Presencialmente, direto ao prestador. O Encaixe não cobra o cliente nem processa
      pagamento: só registra o valor travado e a comissão devida pelo prestador.`],
    ['E se eu precisar cancelar?', html`Antes de confirmar, a tela mostra a faixa aplicável e o efeito exato na sua
      reputação. Quanto mais perto do horário, maior a penalidade.`],
    ['Por que um horário aparece com preço cheio?', html`O desconto só começa na faixa de antecedência que o
      prestador definiu. Até lá vale o preço-base; alguns horários nem têm desconto.`],
    ['Reputação e estrelas são a mesma coisa?', html`Não. A estrela é a nota de 1 a 5 de um atendimento. A reputação,
      de 0 a 100, soma eventos: atendimentos, avaliações, cancelamentos e ausências.`],
  ];
  return html`
    <section class="secao par" id="perguntas" aria-labelledby="titulo-perguntas">
      <div class="secao-texto" data-revelar>
        <h2 id="titulo-perguntas">Perguntas frequentes</h2>
        <p>O que costuma ficar em dúvida antes da primeira reserva.</p>
        <p><a href="/ajuda">Todas as perguntas na Ajuda <span class="seta">→</span></a></p>
      </div>
      <div class="cartao faq" data-revelar style="--atraso:100ms">
        ${juntar(perguntas.map(([pergunta, resposta]) => html`
          <details><summary>${pergunta}</summary><p>${resposta}</p></details>`))}
      </div>
    </section>`;
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
    janela: busca.JANELAS_H.includes(Number(ctx.query.janela)) ? Number(ctx.query.janela) : null,
    ordenar: ctx.query.ordenar || 'proximidade',
  };

  let painelIa = cru('');
  // RN-30: com confianca baixa ou categoria fora do catalogo, a busca so roda
  // depois que o cliente confere os filtros.
  let aguardaConfirmacao = null;
  // SPEC-028 §13: a interpretacao em uso viaja no formulario para ser reaproveitada.
  let interpretacaoEmUso = null;
  const descricao = (ctx.query.descricao ?? '').trim();

  // UC-04 - o texto livre vira filtros; a busca em si continua deterministica.
  if (descricao) {
    try {
      const leitura = await busca.interpretar({
        clienteId: ctx.usuario?.id ?? null, texto: descricao, reaproveitarId: ctx.query.interpretacao || null,
      });

      if (leitura.precisaFormulario) {
        ctx.avisar({
          tipo: 'atencao',
          titulo: 'A interpretação automática não está disponível',
          texto: 'Use os filtros abaixo — a busca funciona normalmente sem ela.',
          regra: 'RN-31',
        });
      } else {
        // Na primeira leitura, a IA propoe os filtros. Ao refinar a mesma busca, vale
        // o que o cliente escolheu no formulario: a escolha dele e a mais recente.
        const escolhidos = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v != null && v !== ''));
        filtros = leitura.reaproveitada
          ? { ...filtros, ...leitura.filtros, ...escolhidos }
          : { ...filtros, ...leitura.filtros };
        interpretacaoEmUso = leitura;
        painelIa = painelDeInterpretacao(descricao, leitura, categorias, regioes, filtros);
        if (leitura.precisaConfirmar) {
          aguardaConfirmacao = leitura;
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

  // A janela escolhida no formulario vale mais que a extraida da descricao:
  // e a escolha mais recente e explicita do cliente.
  if (filtros.janela) filtros = { ...filtros, de: null, ate: null };

  // RN-32: buscar depois de conferir registra se o cliente aceitou ou corrigiu.
  if (!descricao && ctx.query.interpretacao) {
    busca.registrarConfirmacao({
      interpretacaoId: ctx.query.interpretacao, clienteId: ctx.usuario?.id ?? null, filtros,
    });
  }

  const resultados = aguardaConfirmacao
    ? []
    : busca.buscarPorFiltros({ ...filtros, janelaHoras: filtros.janela });
  const p = params();

  const categoriaAtiva = categorias.find((c) => String(c.id) === String(filtros.categoriaId));
  const regiaoAtiva = regioes.find((rg) => String(rg.id) === String(filtros.regiaoId));

  // Vale o filtro que veio na URL, nao so o que casou com o catalogo: um id
  // invalido zera os resultados e o usuario precisa ver que ele existe, senao
  // fica olhando uma lista vazia sem explicacao.
  const temFiltro = Boolean(
    filtros.categoriaId || filtros.regiaoId || descricao || filtros.de || filtros.janela,
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
          <input id="descricao" name="descricao" value="${aguardaConfirmacao ? '' : descricao}" class="crescer"
                 placeholder="Ex.: preciso cortar o cabelo hoje à tarde, corte masculino simples">
          <button class="botao" type="submit">Buscar</button>
        </div>
        <div class="ajuda">
          O texto é convertido em filtros estruturados. A escolha dos horários exibidos é do sistema,
          não do modelo (<code>RN-29</code>).
        </div>
      </div>

      <div class="grade grade-campos grade-filtros">
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
          <label for="janela">Quando</label>
          <select id="janela" name="janela">
            <option value="">${filtros.de || filtros.ate ? 'Janela da descrição' : `Próximas ${busca.JANELA_PADRAO_H} h`}</option>
            ${juntar(busca.JANELAS_H
    .filter((h) => filtros.de || filtros.ate || h !== busca.JANELA_PADRAO_H)
    .map((h) => html`
              <option value="${h}" ${filtros.janela === h ? 'selected' : ''}>Próximas ${h} h</option>`))}
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
      ${interpretacaoEmUso
    ? html`<input type="hidden" name="interpretacao" value="${interpretacaoEmUso.id}">` : cru('')}
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
        ${filtros.janela ? chip(`próximas ${filtros.janela} h`, { href: urlDaBusca(filtros, descricao, { janela: '' }) }) : cru('')}
        <a class="botao botao-fantasma botao-pequeno" href="/buscar">Limpar tudo</a>
      </div>` : cru('')}

    ${painelIa}

    ${aguardaConfirmacao ? vazio(
    aguardaConfirmacao.filtros.categoriaId
      ? 'A busca ainda não rodou. Confira os filtros acima: se estiverem certos, busque com eles; '
        + 'se não, corrija no formulário e aplique.'
      : 'A categoria pedida não existe no catálogo, então a busca ainda não rodou. '
        + 'Escolha uma categoria no formulário e aplique os filtros.',
    {
      titulo: 'Confira os filtros antes de buscar',
      acoes: aguardaConfirmacao.filtros.categoriaId
        ? [[urlDaBusca(filtros, '', { descricao: '', interpretacao: aguardaConfirmacao.id }), 'Buscar com estes filtros']]
        : [['#categoriaId', 'Escolher a categoria']],
    },
  ) : html`
    <div class="secao-titulo">
      <h2>${plural(resultados.length, 'horário encontrado', 'horários encontrados')}</h2>
      ${resultados.length ? html`<span class="pequeno fraco">${busca.ORDENACOES[filtros.ordenar]}</span>` : cru('')}
    </div>

    ${resultados.length === 0
    ? vazio(
      html`Nenhum horário compatível com esses filtros ${filtros.de || filtros.ate
    ? 'na janela escolhida' : `nas próximas ${filtros.janela ?? busca.JANELA_PADRAO_H} horas`}.
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
      </div>`}`}
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
          <ul class="vaga-sinais sem-topo">
            <li class="sinal">${icone('relogio')}Começa em ${humanizarMinutos(vaga.preco.antecedenciaMin)}</li>
            <li class="sinal">${icone(vaga.politica_expiracao === 'AUTOCONFIRMAR' ? 'confirmacao' : 'espera')}${politica.titulo}</li>
            <li class="sinal">${icone('reputacao')}Reputação ${vaga.prestador_reputacao}/100</li>
          </ul>
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
    <ol class="passos passos-linha cartao">
      <li>
        <h3>O preço trava</h3>
        <p class="pequeno">O valor vigente vira o valor do agendamento e a comissão passa a ser
        calculada sobre ele, nunca sobre o preço-base.</p>
      </li>
      <li>
        <h3>O prestador responde</h3>
        <p class="pequeno">${nome} tem ${vaga.janela_confirmacao_min} min para confirmar ou
        recusar. Enquanto isso, o horário fica bloqueado só para você.</p>
      </li>
      <li>
        <h3>Você é avisado</h3>
        <p class="pequeno">Confirmação, recusa e expiração geram notificação. Recusa e expiração
        não penalizam o cliente.</p>
      </li>
    </ol>
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
    <div class="cabecalho-pagina perfil-topo">
      ${perfil.foto && perfil.perfil === 'PRESTADOR' ? avatar(perfil, { tamanho: 'g' }) : cru('')}
      <div>
        <h1>${perfil.nome_exibicao ?? perfil.nome}</h1>
        <p>${perfil.bairro ? `${perfil.bairro} — ${perfil.cidade}` : 'Região não informada'}</p>
      </div>
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
