/**
 * Configuracoes da conta e paginas de ajuda - SPEC-030 (RF-087 a RF-096).
 *
 * Toda acao age sobre a conta da sessao: nenhum formulario daqui leva id de
 * usuario, entao nao ha como apontar para a conta de outra pessoa (RF-006).
 */

import * as conta from '../../../aplicacao/conta.js';
import * as catalogo from '../../../aplicacao/catalogo.js';
import { contatoDeSuporte } from '../../../aplicacao/contas.js';
import { params } from '../../../aplicacao/parametros.js';
import {
  html, cru, juntar, campoCsrf, selo, notaDeRegra, avatar, reputacao, metrica, vazio, plural,
} from '../views/layout.js';
import { TEMAS, MOVIMENTOS, cookieDeAparencia } from '../aparencia.js';
import { formatarDataHora, partesLocais, agoraIso } from '../../../dominio/tempo.js';
import { TIPO_EVENTO } from '../../../dominio/reputacao.js';

const LOGADO = { autenticado: true };

export function registrar(r) {
  r.get('/conta', telaPerfil, LOGADO);
  r.post('/conta/dados', salvarDados, LOGADO);
  // O teto do multipart e o da foto mais folga para os campos (ADR-007).
  r.post('/conta/foto', salvarFoto, { ...LOGADO, arquivo: conta.FOTO_MAX_BYTES });
  r.post('/conta/foto/remover', removerFoto, LOGADO);

  // Aparencia vale para visitante tambem: e cookie, nao conta (RF-093). Sem
  // sessao nao ha token CSRF; o pior que um site alheio consegue aqui e trocar
  // a cor do Encaixe de alguem, entao a rota dispensa o token de proposito.
  r.get('/conta/aparencia', telaAparencia);
  r.post('/conta/aparencia', salvarAparencia, { semCsrf: true });

  r.get('/conta/seguranca', telaSeguranca, LOGADO);
  r.post('/conta/senha', trocarSenha, LOGADO);
  r.post('/conta/sessoes/encerrar', encerrarOutrasSessoes, LOGADO);

  r.get('/conta/privacidade', telaPrivacidade, LOGADO);
  r.post('/conta/privacidade/exportar', exportarDados, LOGADO);

  r.get('/conta/reputacao', telaReputacao, { perfil: ['CLIENTE', 'PRESTADOR'] });

  r.get('/sobre', telaSobre);
  r.get('/ajuda', telaAjuda);
  r.get('/privacidade', telaPoliticaDePrivacidade);
}

// ------------------------------------------------------------ moldura

function secoesDa(usuario) {
  const secoes = [
    ['/conta', 'Perfil'],
    ['/conta/aparencia', 'Aparência'],
    ['/conta/seguranca', 'Segurança'],
    ['/conta/privacidade', 'Privacidade e LGPD'],
  ];
  if (usuario.perfil !== 'ADMIN') secoes.push(['/conta/reputacao', 'Reputação']);
  return secoes;
}

/** Menu lateral no desktop, trilha de abas no celular - sem JS, como a navegacao principal. */
function moldura(ctx, conteudo, { titulo, descricao }) {
  const atual = ctx.url.pathname;
  const menu = juntar(secoesDa(ctx.usuario).map(([href, texto]) => html`
    <a href="${href}"${href === atual ? cru(' aria-current="page"') : cru('')}>${texto}</a>`));

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <span class="olho">Configurações</span>
      <h1>${titulo}</h1>
      <p>${descricao}</p>
    </div>
    <div class="conta-grade">
      <nav class="conta-menu" aria-label="Seções da conta">
        ${menu}
        <span class="conta-menu-separador" aria-hidden="true"></span>
        <a href="/ajuda">Ajuda</a>
        <a href="/sobre">Sobre</a>
      </nav>
      <div class="conta-conteudo">${conteudo}</div>
    </div>
  `, { titulo });
}

// -------------------------------------------------------------- perfil

function telaPerfil(ctx) {
  const eu = conta.minhaConta(ctx.usuario.id);
  const ehCliente = eu.perfil === 'CLIENTE';
  const regioes = ehCliente ? catalogo.listarRegioes() : [];
  const limiteMb = conta.FOTO_MAX_BYTES / (1024 * 1024);

  return moldura(ctx, html`
    <section class="cartao">
      <h2 class="sem-topo">Foto de perfil</h2>
      <div class="foto-linha">
        ${avatar(eu, { tamanho: 'g' })}
        <div class="crescer">
          <form method="post" action="/conta/foto" enctype="multipart/form-data" class="foto-form">
            ${campoCsrf(ctx.csrf)}
            <label for="foto" class="rotulo-campo">Escolher imagem</label>
            <input id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" required>
            <div class="ajuda mini fraco">JPEG, PNG ou WebP, até ${limiteMb} MB.</div>
            <div class="linha acima-3">
              <button class="botao botao-pequeno" type="submit">Enviar foto</button>
            </div>
          </form>
          ${eu.foto ? html`
            <form method="post" action="/conta/foto/remover" class="acima-2">
              ${campoCsrf(ctx.csrf)}
              <button class="botao botao-fantasma botao-pequeno" type="submit">Remover foto e usar as iniciais</button>
            </form>` : cru('')}
        </div>
      </div>
      ${notaDeRegra('RF-089', 'O formato é conferido pelo conteúdo do arquivo, não pela extensão do nome. '
    + (eu.perfil === 'PRESTADOR' ? 'A foto aparece no seu perfil público, ao lado do nome do negócio.'
      : 'A foto aparece para você, no topo de cada página.'))}
    </section>

    <form class="cartao" method="post" action="/conta/dados">
      ${campoCsrf(ctx.csrf)}
      <h2 class="sem-topo">Dados pessoais</h2>
      <div class="grade grade-2 grade-campos">
        <div class="campo">
          <label for="nome">Nome</label>
          <input id="nome" name="nome" value="${eu.nome}" autocomplete="name" required maxlength="80">
        </div>
        <div class="campo">
          <label for="email">E-mail</label>
          <input id="email" value="${eu.email}" disabled>
          <div class="ajuda">É o seu login e não pode ser trocado aqui.</div>
        </div>
        ${ehCliente ? html`
          <div class="campo">
            <label for="telefone">Telefone</label>
            <input id="telefone" name="telefone" value="${eu.telefone ?? ''}" autocomplete="tel"
                   inputmode="tel" maxlength="20" placeholder="11 99999-0000">
            <div class="ajuda">Só o prestador de um agendamento confirmado vê.</div>
          </div>
          <div class="campo">
            <label for="regiaoId">Região preferida</label>
            <select id="regiaoId" name="regiaoId">
              <option value="">Nenhuma</option>
              ${juntar(regioes.map((rg) => html`
                <option value="${rg.id}"${rg.id === eu.regiao_preferida_id ? cru(' selected') : cru('')}>
                  ${rg.bairro} — ${rg.cidade}</option>`))}
            </select>
          </div>` : cru('')}
      </div>
      <div class="linha acima-4">
        <button class="botao" type="submit">Salvar dados</button>
        ${eu.perfil === 'PRESTADOR' ? html`
          <a class="botao botao-secundario" href="/prestador/perfil">Dados do negócio <span class="seta">→</span></a>`
    : cru('')}
      </div>
      ${notaDeRegra('RF-087', 'Trocar o e-mail com segurança exigiria confirmar o endereço novo, e o '
    + 'sistema não envia e-mail. O nome novo vale daqui em diante; registros já gravados ficam como estão.')}
    </form>

    <section class="cartao cartao-calmo">
      <table class="ficha">
        <tbody>
          <tr><th scope="row">Perfil</th><td>${{ CLIENTE: 'Cliente', PRESTADOR: 'Prestador', ADMIN: 'Administrador' }[eu.perfil]}</td></tr>
          <tr><th scope="row">Estado da conta</th><td>${selo(eu.estado_conta)}</td></tr>
          <tr><th scope="row">Na plataforma desde</th><td>${formatarDataHora(eu.criado_em)}</td></tr>
        </tbody>
      </table>
    </section>
  `, { titulo: 'Minha conta', descricao: 'Foto, nome e dados de contato.' });
}

function salvarDados(ctx) {
  conta.salvarDadosPessoais({
    usuarioId: ctx.usuario.id,
    nome: ctx.corpo.nome,
    telefone: ctx.corpo.telefone,
    regiaoId: ctx.corpo.regiaoId,
  });
  return ctx.redirecionar('/conta', { tipo: 'sucesso', texto: 'Dados salvos.' });
}

function salvarFoto(ctx) {
  conta.salvarFoto({
    usuarioId: ctx.usuario.id,
    conteudo: Buffer.isBuffer(ctx.corpo.foto) ? ctx.corpo.foto : null,
    excedeuLimite: Boolean(ctx.corpo._excedeuLimite),
  });
  return ctx.redirecionar('/conta', { tipo: 'sucesso', texto: 'Foto atualizada.' });
}

function removerFoto(ctx) {
  conta.removerFoto({ usuarioId: ctx.usuario.id });
  return ctx.redirecionar('/conta', { tipo: 'sucesso', texto: 'Foto removida. Voltamos às iniciais.' });
}

// ----------------------------------------------------------- aparencia

/** Amostra de cada tema desenhada so com CSS: o radio continua sendo o controle. */
function opcaoDeTema(valor, rotulo, atual) {
  return html`
    <label class="opcao-tema">
      <input type="radio" name="tema" value="${valor}"${valor === atual ? cru(' checked') : cru('')}>
      <span class="amostra amostra-${valor}" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="opcao-rotulo">${rotulo}</span>
    </label>`;
}

function telaAparencia(ctx) {
  const { tema, movimento } = ctx.aparencia;
  const formulario = html`
    <form class="cartao" method="post" action="/conta/aparencia">
      <fieldset class="sem-borda">
        <legend class="rotulo-campo">Tema</legend>
        <div class="grade grade-4 temas">
          ${juntar(Object.entries(TEMAS).map(([valor, rotulo]) => opcaoDeTema(valor, rotulo, tema)))}
        </div>
      </fieldset>
      <fieldset class="sem-borda acima-5">
        <legend class="rotulo-campo">Movimento</legend>
        ${juntar(Object.entries(MOVIMENTOS).map(([valor, rotulo]) => html`
          <label class="opcao-linha">
            <input type="radio" name="movimento" value="${valor}"${valor === movimento ? cru(' checked') : cru('')}>
            <span>${rotulo}${valor === 'reduzido'
    ? html` <span class="mini fraco">— desliga revelações e brilhos animados; ajuda em computador mais lento</span>`
    : cru('')}</span>
          </label>`))}
      </fieldset>
      <div class="linha acima-4"><button class="botao" type="submit">Salvar aparência</button></div>
      ${notaDeRegra('RF-093', 'A preferência fica guardada neste navegador e vale mesmo sem entrar na conta. '
    + 'Em outro aparelho, escolha de novo.')}
    </form>`;

  if (!ctx.usuario) {
    return ctx.render(html`
      <div class="cabecalho-pagina">
        <span class="olho">Configurações</span>
        <h1>Aparência</h1>
        <p>Tema e animações do site neste navegador.</p>
      </div>
      ${formulario}`, { titulo: 'Aparência', estreita: true });
  }
  return moldura(ctx, formulario, {
    titulo: 'Aparência', descricao: 'Tema e animações do site neste navegador.',
  });
}

function salvarAparencia(ctx) {
  ctx.definirCookie(cookieDeAparencia({ tema: ctx.corpo.tema, movimento: ctx.corpo.movimento }));
  return ctx.redirecionar('/conta/aparencia', { tipo: 'sucesso', texto: 'Aparência salva neste navegador.' });
}

// ----------------------------------------------------------- seguranca

function telaSeguranca(ctx) {
  const eu = conta.minhaConta(ctx.usuario.id);

  return moldura(ctx, html`
    <form class="cartao" method="post" action="/conta/senha">
      ${campoCsrf(ctx.csrf)}
      <h2 class="sem-topo">Trocar senha</h2>
      <div class="campo">
        <label for="senhaAtual">Senha atual</label>
        <input id="senhaAtual" name="senhaAtual" type="password" autocomplete="current-password" required>
      </div>
      <div class="grade grade-2 grade-campos">
        <div class="campo">
          <label for="novaSenha">Nova senha</label>
          <input id="novaSenha" name="novaSenha" type="password" autocomplete="new-password" required minlength="8">
          <div class="ajuda">Ao menos 8 caracteres, com letras e números.</div>
        </div>
        <div class="campo">
          <label for="confirmacao">Repita a nova senha</label>
          <input id="confirmacao" name="confirmacao" type="password" autocomplete="new-password" required minlength="8">
        </div>
      </div>
      <div class="linha acima-4"><button class="botao" type="submit">Trocar senha</button></div>
      ${notaDeRegra('RF-091', 'Trocar a senha encerra as sessões abertas em outros aparelhos. Esta continua.')}
    </form>

    <section class="cartao">
      <h2 class="sem-topo">Aparelhos conectados</h2>
      <p class="fraco">${eu.outrasSessoes === 0
    ? 'Sua conta está aberta só neste navegador.'
    : `Além deste navegador, há ${plural(eu.outrasSessoes, 'outra sessão aberta', 'outras sessões abertas')}.`}</p>
      <form method="post" action="/conta/sessoes/encerrar">
        ${campoCsrf(ctx.csrf)}
        <button class="botao botao-secundario" type="submit"${eu.outrasSessoes === 0 ? cru(' disabled') : cru('')}>
          Sair de todos os outros aparelhos
        </button>
      </form>
      ${notaDeRegra('RNF-02', 'Toda sessão expira sozinha após 2 h sem uso e, mesmo em uso, 12 h depois do login.')}
    </section>
  `, { titulo: 'Segurança', descricao: 'Senha e sessões abertas.' });
}

function trocarSenha(ctx) {
  conta.trocarSenha({
    usuarioId: ctx.usuario.id,
    sessaoAtualId: ctx.sessao.id,
    senhaAtual: ctx.corpo.senhaAtual,
    novaSenha: ctx.corpo.novaSenha,
    confirmacao: ctx.corpo.confirmacao,
  });
  return ctx.redirecionar('/conta/seguranca', {
    tipo: 'sucesso', texto: 'Senha trocada. As sessões em outros aparelhos foram encerradas.',
  });
}

function encerrarOutrasSessoes(ctx) {
  const encerradas = conta.sairDosOutrosAparelhos({ usuarioId: ctx.usuario.id, sessaoAtualId: ctx.sessao.id });
  return ctx.redirecionar('/conta/seguranca', {
    tipo: 'sucesso',
    texto: encerradas
      ? `${plural(encerradas, 'sessão encerrada', 'sessões encerradas')}. Só este navegador continua conectado.`
      : 'Não havia outras sessões abertas.',
  });
}

// --------------------------------------------------------- privacidade

/** O que o sistema guarda, para que e quem ve - a mesma tabela da politica publica. */
function tabelaDeDados() {
  return html`
    <div class="tabela-rolagem">
      <table>
        <thead><tr><th>Dado</th><th>Para quê</th><th>Quem vê</th></tr></thead>
        <tbody>
          <tr><td>Nome e e-mail</td><td>Login e identificação nos agendamentos</td>
            <td>Você; o nome, também a outra parte de cada agendamento</td></tr>
          <tr><td>Telefone (cliente)</td><td>Contato no dia do atendimento</td>
            <td>Só o prestador de um agendamento confirmado</td></tr>
          <tr><td>Região</td><td>Filtrar horários perto de você</td>
            <td>Você; a do prestador aparece no perfil público</td></tr>
          <tr><td>Foto de perfil</td><td>Identificação visual</td>
            <td>Você; a do prestador aparece no perfil público</td></tr>
          <tr><td>Agendamentos, avaliações e reputação</td><td>Funcionamento das regras de reserva,
            cancelamento e reputação</td><td>Você e a outra parte; o agregado é público</td></tr>
          <tr><td>Texto da busca com IA</td><td>Interpretar o pedido em filtros</td>
            <td>Ninguém na interface; fica na trilha de auditoria</td></tr>
        </tbody>
      </table>
    </div>`;
}

function telaPrivacidade(ctx) {
  const contato = contatoDeSuporte();
  return moldura(ctx, html`
    <section class="cartao">
      <h2 class="sem-topo">O que guardamos sobre você</h2>
      ${tabelaDeDados()}
      <p class="pequeno fraco acima-3">A senha é guardada só como hash e nunca sai do sistema, nem na
      cópia dos seus dados. <a href="/privacidade">Ler a política completa</a>.</p>
    </section>

    <form class="cartao" method="post" action="/conta/privacidade/exportar">
      ${campoCsrf(ctx.csrf)}
      <h2 class="sem-topo">Baixar meus dados</h2>
      <p class="fraco medida">Um arquivo JSON com sua conta, seu perfil, seus agendamentos, as avaliações
      que você fez e recebeu, o histórico da sua reputação e seus avisos. Da outra parte de cada
      agendamento vai só o nome.</p>
      <button class="botao" type="submit">Baixar arquivo</button>
      ${notaDeRegra('RF-094', 'Direito de acesso e portabilidade (LGPD, art. 18). O pedido fica registrado '
    + 'na trilha de auditoria.')}
    </form>

    <section class="cartao cartao-calmo">
      <h2 class="sem-topo">Excluir minha conta</h2>
      <p class="fraco medida">A exclusão pelo próprio site ainda não está disponível: ela vai apagar seus
      dados pessoais e manter só o que a apuração financeira e a auditoria exigem, sem identificar você.
      Até lá, peça pelo e-mail <a href="mailto:${contato}">${contato}</a>.</p>
      <span class="selo selo-neutro">SPEC-030 · fase 2</span>
    </section>
  `, { titulo: 'Privacidade e LGPD', descricao: 'Seus dados, quem vê e como levar uma cópia.' });
}

function exportarDados(ctx) {
  const dados = conta.exportarDados(ctx.usuario.id);
  const { data } = partesLocais(agoraIso());
  ctx.res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="encaixe-meus-dados-${data}.json"`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  ctx.res.end(JSON.stringify(dados, null, 2));
}

// ----------------------------------------------------------- reputacao

const ROTULO_EVENTO = {
  [TIPO_EVENTO.CONCLUSAO]: 'Atendimento concluído sem incidente',
  [TIPO_EVENTO.AVALIACAO]: 'Avaliação recebida',
  [TIPO_EVENTO.CANCELAMENTO_LIVRE]: 'Cancelamento sem penalidade',
  [TIPO_EVENTO.CANCELAMENTO_PARCIAL]: 'Cancelamento com penalidade parcial',
  [TIPO_EVENTO.CANCELAMENTO_TOTAL]: 'Cancelamento com penalidade total',
  [TIPO_EVENTO.NO_SHOW]: 'Ausência no atendimento',
  [TIPO_EVENTO.DISPUTA_CONTRA]: 'Disputa decidida contra você',
  [TIPO_EVENTO.AJUSTE_ADMIN]: 'Ajuste da administração',
};

function telaReputacao(ctx) {
  const historico = conta.historicoDeReputacao(ctx.usuario.id);

  return moldura(ctx, html`
    <div class="grade grade-2">
      ${metrica('Reputação atual', historico.atual, 'de 0 a 100')}
      ${metrica('Ponto de partida', historico.inicial ?? '—', 'com que a conta nasceu')}
    </div>
    <section class="cartao acima-4">
      ${reputacao(historico.atual, { rotuloTexto: 'Reputação atual' })}
    </section>

    <h2>${plural(historico.eventos.length, 'evento', 'eventos')}</h2>
    ${historico.eventos.length === 0
    ? vazio('Nada mexeu na sua reputação ainda. Atendimentos concluídos e avaliações recebidas aparecem aqui.',
      { titulo: 'Sem eventos', acoes: [['/buscar', 'Buscar horários']] })
    : html`<div class="cartao"><ul class="lista-limpa">
        ${juntar(historico.eventos.map((e) => html`
          <li class="linha entre${e.revertido_em ? ' lida' : ''}">
            <div class="crescer">
              <div class="forte">${ROTULO_EVENTO[e.tipo] ?? e.tipo}</div>
              <div class="mini fraco">${formatarDataHora(e.criado_em)}${e.revertido_em
    ? ` · desfeito em ${formatarDataHora(e.revertido_em)}` : ''}</div>
            </div>
            <span class="forte num ${e.delta >= 0 ? 'delta-mais' : 'delta-menos'}">
              ${e.delta > 0 ? '+' : ''}${e.delta}</span>
          </li>`))}
      </ul></div>`}
    ${notaDeRegra('RN-23', 'Cada ponto sai de um fato rastreável. Ninguém edita o número à mão; um evento '
    + 'desfeito (disputa revista, por exemplo) continua na lista, riscado do cálculo.')}
  `, { titulo: 'Reputação', descricao: 'Os fatos que formaram a sua nota.' });
}

// ------------------------------------------------- paginas publicas

function telaSobre(ctx) {
  const p = params();
  return ctx.render(html`
    <div class="cabecalho-pagina">
      <span class="olho">Sobre</span>
      <h1>O Encaixe</h1>
      <p>Um mercado para o horário que ia ficar vazio.</p>
    </div>
    <section class="cartao">
      <p class="medida">Salões, barbearias, clínicas, oficinas e assistências técnicas publicam os
      buracos da agenda. O preço de cada horário cai conforme ele se aproxima, seguindo a régua de
      desconto que o próprio prestador definiu, até o teto de ${p.desconto_maximo_pct}% da plataforma.
      Quem reserva trava o preço daquele instante.</p>
      <p class="medida">O prestador só paga comissão sobre atendimento concluído. Reserva expirada,
      recusada ou cancelada pelo cliente não gera cobrança para ele.</p>
      <p class="medida sem-fundo">A busca aceita texto livre: um modelo de linguagem transforma o pedido
      em filtros, e quem escolhe, ordena e precifica os horários é sempre código determinístico. O site
      inteiro funciona com o modelo fora do ar.</p>
    </section>
    <section class="cartao cartao-calmo">
      <h2 class="sem-topo">Projeto acadêmico</h2>
      <p class="medida sem-fundo">Projeto final de Modelagem de Software (2026-2, turma 04I). A
      especificação em <code>docs/spec.md</code> é a fonte de verdade, e os códigos <code>RN</code>,
      <code>RF</code> e <code>INV</code> que aparecem nas telas apontam a regra que decidiu cada
      comportamento.</p>
    </section>
  `, { titulo: 'Sobre', estreita: true });
}

function telaAjuda(ctx) {
  const p = params();
  const perguntas = [
    ['Por que o preço deste horário caiu?',
      html`Cada horário segue a régua de desconto do prestador: quanto menos falta para começar, maior o
      desconto, sem passar do piso dele nem do teto de ${p.desconto_maximo_pct}% da plataforma.`, 'RN-01'],
    ['O preço pode mudar depois que eu reservo?',
      html`Não. O valor é travado no instante da reserva, mesmo que o prestador edite a régua depois.`, 'RN-04'],
    ['Quanto tempo o prestador tem para confirmar?',
      html`A janela que ele configurou, em geral ${p.janela_confirmacao_min} min. Sem resposta, o horário
      volta para a busca ou é confirmado sozinho, conforme a política dele; você não é penalizado.`, 'RN-10'],
    ['E se eu precisar cancelar?',
      html`Antes de confirmar o cancelamento, a tela mostra a faixa aplicável e o efeito exato na sua
      reputação. Quanto mais perto do horário, maior a penalidade.`, 'RN-18'],
    ['Por que não consigo reservar?',
      html`Conta com reputação baixa fica restrita e reserva menos horários ao mesmo tempo. O aviso na tela
      traz a regra que barrou.`, 'RN-12'],
    ['Como a minha reputação é calculada?',
      html`Por eventos: atendimento concluído, avaliação recebida, cancelamento, ausência. Você vê cada um
      em <a href="/conta/reputacao">Minha conta › Reputação</a>.`, 'RN-23'],
    ['A IA escolhe os horários que aparecem para mim?',
      html`Não. Ela só transforma o seu texto em filtros. Quem seleciona e ordena é o sistema, com as
      mesmas regras da busca por filtros.`, 'RN-29'],
    ['Como levo uma cópia dos meus dados?',
      html`Em <a href="/conta/privacidade">Minha conta › Privacidade e LGPD</a>, botão "Baixar arquivo".`,
      'RF-094'],
  ];

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <span class="olho">Ajuda</span>
      <h1>Perguntas frequentes</h1>
      <p>Cada resposta cita a regra da especificação que decide aquele comportamento.</p>
    </div>
    <div class="cartao faq">
      ${juntar(perguntas.map(([pergunta, resposta, regra]) => html`
        <details>
          <summary>${pergunta}</summary>
          <p>${resposta} <span class="selo selo-regra">${regra}</span></p>
        </details>`))}
    </div>
    <p class="pequeno fraco acima-4">Não achou? Escreva para
      <a href="mailto:${contatoDeSuporte()}">${contatoDeSuporte()}</a>.</p>
  `, { titulo: 'Ajuda', estreita: true });
}

function telaPoliticaDePrivacidade(ctx) {
  const contato = contatoDeSuporte();
  return ctx.render(html`
    <div class="cabecalho-pagina">
      <span class="olho">Privacidade e LGPD</span>
      <h1>Política de privacidade</h1>
      <p>O que o Encaixe guarda, por quê, quem vê e como você exerce seus direitos.</p>
    </div>
    <section class="cartao">
      <h2 class="sem-topo">Dados que guardamos</h2>
      ${tabelaDeDados()}
    </section>
    <section class="cartao">
      <h2 class="sem-topo">O que não fazemos</h2>
      <ul class="medida">
        <li>Não vendemos nem compartilhamos dados com terceiros.</li>
        <li>Não mostramos telefone nem e-mail no perfil público: só nome de exibição, região, foto do
        prestador, reputação e histórico agregado.</li>
        <li>Não guardamos dado pessoal no log da aplicação. A senha existe só como hash.</li>
        <li>Não usamos cookie de rastreamento. São dois cookies: o da sessão (quando você entra) e o da
        aparência (tema e animações).</li>
      </ul>
    </section>
    <section class="cartao">
      <h2 class="sem-topo">Seus direitos</h2>
      <ul class="medida sem-fundo">
        <li><strong>Acesso e portabilidade:</strong> baixe seus dados em
        <a href="/conta/privacidade">Minha conta › Privacidade e LGPD</a>.</li>
        <li><strong>Correção:</strong> nome, telefone, região e foto em <a href="/conta">Minha conta</a>.</li>
        <li><strong>Exclusão:</strong> pelo e-mail <a href="mailto:${contato}">${contato}</a>, enquanto a
        exclusão pelo próprio site não fica pronta.</li>
      </ul>
    </section>
    ${notaDeRegra('RNF-04', 'Dados de contato só ficam visíveis entre as partes de um agendamento confirmado.')}
  `, { titulo: 'Privacidade', estreita: true });
}
