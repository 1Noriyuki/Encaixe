/**
 * Rotas do agendamento - compartilhadas entre cliente e prestador.
 * UC-05 a UC-12.
 *
 * Cada tela daqui responde as mesmas cinco perguntas, nesta ordem: em que pe
 * esta, o que aconteceu, o que da para fazer agora, ate quando, e qual regra
 * governa isso. E o que a constituicao chama de "o usuario ve a regra".
 */

import * as agendamentos from '../../../aplicacao/agendamentos.js';
import * as avaliacoes from '../../../aplicacao/avaliacoes.js';
import * as disputas from '../../../aplicacao/disputas.js';
import * as notificacoes from '../../../infra/notificacoes.js';
import * as auditoria from '../../../infra/auditoria.js';
import {
  html, cru, juntar, campoCsrf, selo, vazio, notaDeRegra, linhaAgendamento,
  estrelas, plural, seloRegra,
} from '../views/layout.js';
import { formatarBRL } from '../../../dominio/dinheiro.js';
import { formatarDataHora, formatarHora, humanizarMinutos } from '../../../dominio/tempo.js';
import { ROTULO_FAIXA } from '../../../dominio/cancelamento.js';

export function registrar(r) {
  r.post('/reservar', reservar, { perfil: 'CLIENTE' });
  r.get('/meus-agendamentos', meusAgendamentos, { perfil: 'CLIENTE' });
  r.get('/agendamentos/:id', detalhe, { autenticado: true });

  r.post('/agendamentos/:id/confirmar', confirmar, { perfil: 'PRESTADOR' });
  r.post('/agendamentos/:id/recusar', recusar, { perfil: 'PRESTADOR' });
  r.post('/agendamentos/:id/concluir', concluir, { perfil: 'PRESTADOR' });

  r.get('/agendamentos/:id/cancelar', telaCancelar, { autenticado: true });
  r.post('/agendamentos/:id/cancelar', cancelar, { autenticado: true });
  r.post('/agendamentos/:id/no-show', noShow, { autenticado: true });
  r.post('/agendamentos/:id/avaliar', avaliar, { autenticado: true });
  r.post('/agendamentos/:id/disputar', abrirDisputa, { autenticado: true });
  r.post('/agendamentos/:id/evidencia', anexarEvidencia, { autenticado: true });

  r.get('/notificacoes', listarNotificacoes, { autenticado: true });
  r.post('/notificacoes/lidas', marcarLidas, { autenticado: true });
}

// ------------------------------------------------------------- reservar

function reservar(ctx) {
  const ag = agendamentos.reservar({
    clienteId: ctx.usuario.id,
    horarioId: Number(ctx.corpo.horarioId),
    observacao: ctx.corpo.observacao ?? '',
  });

  return ctx.redirecionar(`/agendamentos/${ag.id}`, {
    tipo: 'sucesso',
    titulo: 'Reserva feita e preço travado',
    texto: `O horário é seu por enquanto. ${ag.nome_exibicao ?? ag.prestador_nome} tem até `
      + `${formatarDataHora(ag.prazo_confirmacao_em)} para confirmar.`,
    regra: 'RN-04',
  });
}

function meusAgendamentos(ctx) {
  const lista = agendamentos.doCliente(ctx.usuario.id);
  const abertos = lista.filter((a) => ['PENDENTE_CONFIRMACAO', 'CONFIRMADO'].includes(a.estado));
  const encerrados = lista.filter((a) => !['PENDENTE_CONFIRMACAO', 'CONFIRMADO'].includes(a.estado));
  const aAvaliar = encerrados.filter((a) => a.estado === 'CONCLUIDO');

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Meus agendamentos</h1>
      <p>Sua reputação hoje é <strong>${ctx.usuario.reputacao}</strong>/100. Ela define quantas
        reservas você pode manter em aberto ao mesmo tempo.</p>
    </div>

    <div class="secao-titulo">
      <div>
        <h2 class="sem-topo">Em aberto (${abertos.length})</h2>
        <p>Reservas aguardando confirmação e atendimentos já confirmados.</p>
      </div>
      <a class="botao botao-secundario botao-pequeno" href="/buscar">
        Buscar horários <span class="seta">→</span>
      </a>
    </div>

    ${abertos.length === 0
    ? vazio(
      html`Nada em aberto agora. Os horários com maior desconto costumam ser os mais próximos —
      vale olhar a busca antes de decidir o dia.`,
      {
        titulo: 'Nenhuma reserva em aberto',
        acoes: [['/buscar', 'Ver horários disponíveis'], ['/buscar?ordenar=desconto', 'Maiores descontos']],
      },
    )
    : html`<ul class="lista-cartoes">
        ${juntar(abertos.map((a) => linhaAgendamento(a, {
    href: `/agendamentos/${a.id}`,
    extra: a.estado === 'PENDENTE_CONFIRMACAO'
      ? html`<div class="mini fraco acima-1">
          Confirmação até ${formatarDataHora(a.prazo_confirmacao_em)} ${seloRegra('RN-10')}
        </div>`
      : cru(''),
  })))}
      </ul>`}

    <h2>Histórico (${encerrados.length})</h2>
    ${encerrados.length === 0
    ? vazio('Aqui vão aparecer os atendimentos concluídos, cancelados, recusados e expirados.',
      { titulo: 'Sem histórico ainda' })
    : html`<ul class="lista-cartoes">
        ${juntar(encerrados.map((a) => linhaAgendamento(a, { href: `/agendamentos/${a.id}` })))}
      </ul>`}

    ${aAvaliar.length
    ? notaDeRegra('RN-25', 'As notas de um atendimento só ficam visíveis quando as duas partes avaliam, '
      + 'ou quando a janela de avaliação encerra. É o que evita avaliação por retaliação.')
    : notaDeRegra('RN-12', 'Cliente com reputação abaixo do limiar mantém apenas uma reserva em aberto '
      + 'por vez. É a regra que contém o "reservo tudo e escolho depois".')}
  `, { titulo: 'Meus agendamentos' });
}

// -------------------------------------------------------------- detalhe

function detalhe(ctx) {
  const id = Number(ctx.params.id);
  const ehAdmin = ctx.usuario.perfil === 'ADMIN';
  const ag = agendamentos.detalhe({ agendamentoId: id, usuarioId: ctx.usuario.id, ehAdmin });

  const souCliente = ag.cliente_id === ctx.usuario.id;
  const souPrestador = ag.prestador_id === ctx.usuario.id;
  const situacaoAvaliacao = avaliacoes.situacao({ agendamentoId: id, usuarioId: ctx.usuario.id });
  const disputa = disputas.porAgendamento(id);
  const historico = auditoria.historicoDe('agendamento', id);

  const voltarPara = souPrestador ? '/prestador/agendamentos' : '/meus-agendamentos';

  return ctx.render(html`
    <div class="trilha"><a href="${voltarPara}">&larr; Voltar aos agendamentos</a></div>

    <div class="cartao">
      <div class="linha entre linha-topo">
        <div class="crescer">
          <span class="olho">${ag.categoria_nome}</span>
          <h1 class="sem-topo abaixo-3">${ag.servico_nome}</h1>
          <p class="fraco sem-fundo">
            ${formatarDataHora(ag.inicio)} até ${formatarHora(ag.fim)} · ${ag.duracao_min} min
          </p>
        </div>
        <div class="direita">
          <div class="preco-vigente">${formatarBRL(ag.valor_travado)}</div>
          <div class="mini fraco">
            valor travado na reserva${ag.percentual_desconto_aplicado > 0
    ? ` (−${ag.percentual_desconto_aplicado}%)` : ''}
          </div>
          <div class="acima-2">${selo(ag.estado)}</div>
        </div>
      </div>

      <hr class="divisor">

      <div class="grade grade-3">
        <div>
          <span class="mini fraco">Prestador</span>
          <div class="forte">
            <a href="/prestadores/${ag.prestador_id}">${ag.nome_exibicao ?? ag.prestador_nome}</a>
          </div>
          <div class="mini fraco">reputação ${ag.prestador_reputacao}/100</div>
          ${ag.estado === 'CONFIRMADO' && souCliente
    ? html`<div class="mini acima-1">${ag.prestador_email}</div>` : cru('')}
        </div>
        <div>
          <span class="mini fraco">Cliente</span>
          <div class="forte">${ag.cliente_nome}</div>
          <div class="mini fraco">reputação ${ag.cliente_reputacao}/100</div>
          ${ag.estado === 'CONFIRMADO' && souPrestador
    ? html`<div class="mini acima-1">${ag.cliente_telefone || ag.cliente_email}</div>` : cru('')}
        </div>
        <div>
          <span class="mini fraco">Local</span>
          <div class="forte">${ag.bairro ?? '—'}</div>
          <div class="mini fraco">${ag.categoria_nome}</div>
        </div>
      </div>

      ${ag.estado === 'CONFIRMADO'
    ? notaDeRegra('RNF-04', 'Os contatos acima só aparecem entre as partes de um agendamento '
      + 'confirmado. Antes disso, nenhum dos lados vê dado de contato do outro.')
    : cru('')}

      ${ag.observacao ? html`<p class="pequeno acima-3"><strong>Observação:</strong> ${ag.observacao}</p>` : cru('')}
      ${ag.motivo_encerramento ? html`<p class="pequeno acima-3"><strong>Desfecho:</strong> ${ag.motivo_encerramento}</p>` : cru('')}
    </div>

    ${blocoDeAcoes(ctx, ag, { souCliente, souPrestador })}
    ${blocoDeAvaliacao(ctx, ag, situacaoAvaliacao)}
    ${blocoDeDisputa(ctx, ag, disputa)}

    <h2>Linha do tempo deste agendamento</h2>
    <div class="cartao tabela-rolagem">
      <table>
        <thead>
          <tr>
            <th scope="col">Quando</th><th scope="col">Ação</th>
            <th scope="col">De</th><th scope="col">Para</th><th scope="col">Por</th>
          </tr>
        </thead>
        <tbody>
          ${juntar(historico.map((h) => html`
            <tr>
              <td class="mini">${formatarDataHora(h.criado_em)}</td>
              <td class="mono">${h.acao}</td>
              <td class="mini">${h.estado_anterior ?? '—'}</td>
              <td class="mini">${h.estado_novo ?? '—'}</td>
              <td class="mini">${h.ator_nome ?? 'sistema'}</td>
            </tr>`))}
        </tbody>
      </table>
    </div>
    ${notaDeRegra('INV-13', 'Toda transição de estado deixa rastro de auditoria com autor, estados e '
    + 'instante — é o que permite reconstituir o caso inteiro em uma disputa.')}
  `, { titulo: `Agendamento #${ag.id}` });
}

function blocoDeAcoes(ctx, ag, { souCliente, souPrestador }) {
  const acoes = [];

  if (souPrestador && ag.estado === 'PENDENTE_CONFIRMACAO') {
    acoes.push(html`
      <form method="post" action="/agendamentos/${ag.id}/confirmar">
        ${campoCsrf(ctx.csrf)}
        <button class="botao" type="submit">Confirmar reserva</button>
      </form>
      <form method="post" action="/agendamentos/${ag.id}/recusar" class="crescer">
        ${campoCsrf(ctx.csrf)}
        <div class="linha">
          <label class="so-leitor" for="motivo-recusa">Motivo da recusa</label>
          <input id="motivo-recusa" name="motivo" placeholder="Motivo da recusa" required class="crescer">
          <button class="botao botao-secundario" type="submit">Recusar</button>
        </div>
      </form>`);
  }

  if (souPrestador && ag.podeConcluir) {
    acoes.push(html`
      <form method="post" action="/agendamentos/${ag.id}/concluir" class="crescer">
        ${campoCsrf(ctx.csrf)}
        <div class="linha">
          <label class="so-leitor" for="cobranca">Como ficou a cobrança</label>
          <select id="cobranca" name="estadoCobranca" class="campo-estreito">
            <option value="PAGO_PRESENCIAL">Cliente pagou</option>
            <option value="NAO_PAGO">Não pagou</option>
          </select>
          <button class="botao" type="submit">Registrar conclusão</button>
        </div>
      </form>`);
  }

  if ((souCliente || souPrestador) && ag.podeCancelar) {
    acoes.push(html`<a class="botao botao-secundario" href="/agendamentos/${ag.id}/cancelar">
      Cancelar agendamento</a>`);
  }

  if ((souCliente || souPrestador) && ag.podeReportarNoShow) {
    acoes.push(html`
      <form method="post" action="/agendamentos/${ag.id}/no-show" class="crescer">
        ${campoCsrf(ctx.csrf)}
        <div class="linha">
          <label class="so-leitor" for="relato">O que aconteceu</label>
          <input id="relato" name="relato" placeholder="O que aconteceu?" class="crescer">
          <button class="botao botao-perigo" type="submit">
            ${souCliente ? 'O prestador não apareceu' : 'O cliente não apareceu'}
          </button>
        </div>
      </form>`);
  }

  if (acoes.length === 0) {
    // Sem acao disponivel, o usuario ainda precisa saber por que.
    return html`
      <div class="cartao cartao-calmo">
        <h2 class="sem-topo">Nada a fazer agora</h2>
        <p class="pequeno fraco sem-fundo">
          Este agendamento está em <strong>${selo(ag.estado)}</strong> e não aceita mais ações suas.
          O histórico abaixo mostra como ele chegou até aqui.
        </p>
      </div>`;
  }

  return html`
    <div class="cartao cartao-realce">
      <h2 class="sem-topo">O que você pode fazer agora</h2>
      <div class="linha">${juntar(acoes)}</div>
      ${ag.estado === 'PENDENTE_CONFIRMACAO'
    ? notaDeRegra('RN-10', `Sem resposta até ${formatarDataHora(ag.prazo_confirmacao_em)}, a política do `
      + `prestador (${ag.politica_expiracao === 'AUTOCONFIRMAR' ? 'confirmar automaticamente' : 'liberar o horário'}) `
      + 'decide o desfecho sozinha, e o cliente não é penalizado.')
    : cru('')}
      ${ag.podeCancelar
    ? notaDeRegra('RN-18', `Faltam ${humanizarMinutos(ag.antecedenciaMin)} para o horário. A faixa de `
      + `cancelamento aplicável agora é: ${ROTULO_FAIXA[ag.faixaCancelamento]}. A tela de cancelamento `
      + 'mostra o efeito exato antes de você confirmar.')
    : cru('')}
      ${ag.podeReportarNoShow
    ? notaDeRegra('RN-20', 'Registrar ausência aplica penalidade de reputação à outra parte e abre para '
      + 'ela o direito de contestar em disputa. Se as duas partes se acusarem, ninguém é penalizado '
      + 'automaticamente e o caso vai para o administrador.')
    : cru('')}
    </div>`;
}

function blocoDeAvaliacao(ctx, ag, situacao) {
  if (!situacao || ag.estado !== 'CONCLUIDO') return cru('');

  return html`
    <div class="cartao">
      <h2 class="sem-topo">Avaliação</h2>
      ${situacao.podeAvaliar ? html`
        <form method="post" action="/agendamentos/${ag.id}/avaliar">
          ${campoCsrf(ctx.csrf)}
          <div class="linha">
            <label class="so-leitor" for="nota">Nota de 1 a 5</label>
            <select id="nota" name="nota" class="campo-estreito" required>
              <option value="5">★★★★★ excelente</option>
              <option value="4">★★★★ bom</option>
              <option value="3">★★★ regular</option>
              <option value="2">★★ ruim</option>
              <option value="1">★ péssimo</option>
            </select>
            <label class="so-leitor" for="comentario">Comentário (opcional)</label>
            <input id="comentario" name="comentario" placeholder="Comentário (opcional)" class="crescer">
            <button class="botao" type="submit">Enviar avaliação</button>
          </div>
        </form>` : cru('')}

      ${situacao.aguardandoContraparte
    ? notaDeRegra('RN-25', 'Você já avaliou. As notas só ficam visíveis quando a outra parte avaliar, '
      + 'ou quando a janela encerrar — é o que evita avaliação por retaliação.')
    : cru('')}

      ${situacao.visiveis.length ? html`
        <ul class="lista-limpa acima-3">
          ${juntar(situacao.visiveis.map((a) => html`
            <li>
              <div class="linha entre">
                <span>${estrelas(a.nota)} <span class="fraco pequeno">por ${a.autor_nome}</span></span>
                <span class="mini fraco">${formatarDataHora(a.criada_em)}</span>
              </div>
              ${a.comentario ? html`<div class="pequeno acima-1">${a.comentario}</div>` : cru('')}
            </li>`))}
        </ul>` : cru('')}

      ${!situacao.naJanela && !situacao.podeAvaliar && situacao.visiveis.length === 0
    ? html`<p class="pequeno fraco sem-fundo">A janela de avaliação deste atendimento já encerrou.</p>`
    : cru('')}
    </div>`;
}

function blocoDeDisputa(ctx, ag, disputa) {
  if (disputa) {
    const detalheDisputa = disputas.detalhe(disputa.id);
    return html`
      <div class="cartao cartao-alerta">
        <div class="linha entre">
          <h2 class="sem-topo sem-fundo">Disputa #${disputa.id}</h2>
          ${selo(disputa.estado)}
        </div>
        <p class="pequeno acima-2"><strong>Motivo:</strong> ${disputas.MOTIVOS[disputa.motivo]}</p>
        ${disputa.relato ? html`<p class="pequeno">${disputa.relato}</p>` : cru('')}
        ${disputa.desfecho ? html`
          <div class="aviso aviso-info">
            <div class="aviso-corpo">
              <strong>Desfecho: ${disputas.DESFECHOS[disputa.desfecho]}</strong>
              ${disputa.justificativa_admin}
              <span class="selo selo-regra">RN-27</span>
            </div>
          </div>` : cru('')}

        <h3>${plural(detalheDisputa.evidencias.length, 'evidência', 'evidências')}</h4>
        <ul class="lista-limpa pequeno">
          ${juntar(detalheDisputa.evidencias.map((e) => html`
            <li><strong>${e.autor_nome}:</strong> ${e.descricao}</li>`))}
        </ul>

        ${disputa.estado !== 'RESOLVIDA' ? html`
          <form method="post" action="/agendamentos/${ag.id}/evidencia" class="acima-3">
            ${campoCsrf(ctx.csrf)}
            <div class="linha">
              <label class="so-leitor" for="nova-evidencia">Nova evidência</label>
              <input id="nova-evidencia" name="evidencia" class="crescer" required
                     placeholder="Sua versão dos fatos, um link ou uma testemunha">
              <button class="botao botao-secundario" type="submit">Anexar evidência</button>
            </div>
          </form>
          ${notaDeRegra('RN-17', 'Enquanto a disputa estiver aberta, a comissão fica retida e as '
    + 'penalidades de reputação reversíveis ficam suspensas.')}` : cru('')}
      </div>`;
  }

  if (!ag.podeAbrirDisputa) return cru('');

  return html`
    <div class="cartao">
      <h2 class="sem-topo">Discorda do desfecho?</h2>
      <p class="pequeno fraco">Abrir disputa congela a comissão e suspende as penalidades reversíveis
        até um administrador decidir. A outra parte é notificada e pode anexar a versão dela.</p>
      <form method="post" action="/agendamentos/${ag.id}/disputar">
        ${campoCsrf(ctx.csrf)}
        <div class="campo">
          <label for="motivo">Motivo</label>
          <select id="motivo" name="motivo" required>
            ${juntar(Object.entries(disputas.MOTIVOS).map(([valor, texto]) => html`
              <option value="${valor}">${texto}</option>`))}
          </select>
        </div>
        <div class="campo">
          <label for="evidencia">Evidência (obrigatória)</label>
          <textarea id="evidencia" name="evidencia" required
            placeholder="Descreva o que aconteceu, cole um link ou informe uma testemunha."></textarea>
        </div>
        <div class="campo">
          <label for="relato">Relato adicional</label>
          <input id="relato" name="relato" placeholder="Opcional">
        </div>
        <button class="botao botao-perigo" type="submit">Abrir disputa</button>
      </form>
      ${notaDeRegra('RN-26', `A disputa pode ser aberta até ${formatarDataHora(ag.prazoDisputa)} e exige `
    + 'ao menos uma evidência. Sem evidência, a abertura é recusada.')}
    </div>`;
}

// ------------------------------------------------------------ acoes POST

function confirmar(ctx) {
  const ag = agendamentos.confirmar({
    prestadorId: ctx.usuario.id, agendamentoId: Number(ctx.params.id),
  });
  return ctx.redirecionar(`/agendamentos/${ag.id}`, {
    tipo: 'sucesso',
    titulo: 'Reserva confirmada',
    texto: 'O horário está ocupado e os contatos foram liberados entre vocês dois.',
    regra: 'RF-042',
  });
}

function recusar(ctx) {
  const ag = agendamentos.recusar({
    prestadorId: ctx.usuario.id, agendamentoId: Number(ctx.params.id), motivo: ctx.corpo.motivo,
  });
  return ctx.redirecionar(`/agendamentos/${ag.id}`, {
    tipo: 'info',
    titulo: 'Reserva recusada',
    texto: 'O cliente foi notificado com o motivo e não sofreu penalidade. O horário voltou para a '
      + 'busca, se ainda havia antecedência mínima.',
    regra: 'RN-11',
  });
}

function concluir(ctx) {
  const ag = agendamentos.concluir({
    prestadorId: ctx.usuario.id,
    agendamentoId: Number(ctx.params.id),
    estadoCobranca: ctx.corpo.estadoCobranca,
    observacao: ctx.corpo.observacao ?? '',
  });
  return ctx.redirecionar(`/agendamentos/${ag.id}`, {
    tipo: 'sucesso',
    titulo: 'Atendimento concluído',
    texto: 'A comissão foi apurada sobre o valor final travado e a avaliação bilateral está liberada.',
    regra: 'RN-14',
  });
}

/** RF-048 - a consequencia aparece ANTES da confirmacao, nunca depois. */
function telaCancelar(ctx) {
  const previa = agendamentos.previaDeCancelamento({
    usuarioId: ctx.usuario.id, agendamentoId: Number(ctx.params.id),
  });
  const ag = previa.agendamento;
  const semPenalidade = previa.delta === 0;

  return ctx.render(html`
    <div class="trilha"><a href="/agendamentos/${ag.id}">&larr; Voltar ao agendamento</a></div>
    <div class="cabecalho-pagina">
      <h1>Cancelar agendamento</h1>
      <p>${ag.servico_nome} · ${formatarDataHora(ag.inicio)}</p>
    </div>

    <div class="cartao">
      <div class="aviso ${semPenalidade ? 'aviso-sucesso' : 'aviso-atencao'}">
        <div class="aviso-corpo">
          <strong>${previa.rotulo}</strong>
          ${previa.permitido ? previa.descricao : previa.motivo}
        </div>
      </div>

      <table class="ficha">
        <tbody>
          <tr><th scope="row">Falta para o horário</th>
            <td class="num">${humanizarMinutos(previa.antecedenciaMin)}</td></tr>
          <tr><th scope="row">Você está cancelando como</th>
            <td>${previa.papel === 'CLIENTE' ? 'cliente' : 'prestador'}</td></tr>
          <tr><th scope="row">Faixa aplicável</th><td>${previa.rotulo}</td></tr>
          <tr><th scope="row">Efeito na sua reputação</th>
            <td class="num">${semPenalidade ? 'nenhum' : `${previa.delta} pontos`}</td></tr>
          <tr><th scope="row">Conta como ocorrência negativa</th>
            <td>${previa.ocorrenciaNegativa ? 'sim' : 'não'}</td></tr>
          <tr><th scope="row">O que acontece com o horário</th>
            <td>${previa.papel === 'CLIENTE'
    ? 'volta para a busca, se ainda houver antecedência mínima'
    : 'é cancelado: quem não vai atender é você'}</td></tr>
        </tbody>
      </table>

      ${previa.permitido ? html`
        <form method="post" action="/agendamentos/${ag.id}/cancelar" class="acima-4">
          ${campoCsrf(ctx.csrf)}
          <div class="campo">
            <label for="motivo">Motivo (opcional — vai para a outra parte)</label>
            <input id="motivo" name="motivo">
          </div>
          <div class="linha">
            <button class="botao botao-perigo" type="submit">
              ${semPenalidade ? 'Cancelar sem penalidade' : `Cancelar assumindo ${previa.delta} pontos`}
            </button>
            <a class="botao botao-secundario" href="/agendamentos/${ag.id}">Voltar sem cancelar</a>
          </div>
        </form>`
    : html`<p class="acima-4 sem-fundo">
        <a class="botao botao-secundario" href="/agendamentos/${ag.id}">Voltar ao agendamento</a>
      </p>`}
    </div>

    ${notaDeRegra(previa.papel === 'CLIENTE' ? 'RN-18' : 'RN-19',
    'A penalidade cresce conforme o horário se aproxima. O cancelamento do prestador pesa mais na '
    + 'mesma faixa, porque quem publicou assumiu o compromisso e destruiu mais valor ao desfazê-lo.')}
  `, { titulo: 'Cancelar agendamento', estreita: true });
}

function cancelar(ctx) {
  const { agendamento, penalidade } = agendamentos.cancelar({
    usuarioId: ctx.usuario.id,
    agendamentoId: Number(ctx.params.id),
    motivo: ctx.corpo.motivo ?? '',
  });

  return ctx.redirecionar(`/agendamentos/${agendamento.id}`, {
    tipo: penalidade.delta === 0 ? 'info' : 'atencao',
    titulo: `Cancelado — ${penalidade.rotulo}`,
    texto: penalidade.descricao,
    regra: penalidade.papel === 'CLIENTE' ? 'RN-18' : 'RN-19',
  });
}

function noShow(ctx) {
  const resultado = agendamentos.registrarNoShow({
    usuarioId: ctx.usuario.id,
    agendamentoId: Number(ctx.params.id),
    relato: ctx.corpo.relato ?? '',
  });

  return ctx.redirecionar(`/agendamentos/${resultado.agendamento.id}`, resultado.mutua
    ? {
      tipo: 'atencao',
      titulo: 'As duas partes se acusaram',
      texto: 'Nenhuma penalidade automática foi aplicada a ninguém. O caso foi direto para a fila do '
        + 'administrador, que vai decidir com base nas evidências.',
      regra: 'RF-055',
    }
    : {
      tipo: 'info',
      titulo: 'Ausência registrada',
      texto: 'A outra parte foi notificada, perdeu pontos de reputação e tem o direito de contestar '
        + 'em disputa dentro do prazo.',
      regra: 'RN-20',
    });
}

function avaliar(ctx) {
  avaliacoes.avaliar({
    usuarioId: ctx.usuario.id,
    agendamentoId: Number(ctx.params.id),
    nota: Number(ctx.corpo.nota),
    comentario: ctx.corpo.comentario ?? '',
  });

  return ctx.redirecionar(`/agendamentos/${ctx.params.id}`, {
    tipo: 'sucesso',
    texto: 'Avaliação registrada. Ela fica oculta até a outra parte avaliar ou a janela encerrar.',
    regra: 'RN-25',
  });
}

function abrirDisputa(ctx) {
  const disputa = disputas.abrir({
    usuarioId: ctx.usuario.id,
    agendamentoId: Number(ctx.params.id),
    motivo: ctx.corpo.motivo,
    relato: ctx.corpo.relato ?? '',
    evidencia: ctx.corpo.evidencia,
  });

  return ctx.redirecionar(`/agendamentos/${ctx.params.id}`, {
    tipo: 'info',
    titulo: `Disputa #${disputa.id} aberta`,
    texto: 'A comissão ficou retida e as penalidades foram suspensas até a decisão do administrador.',
    regra: 'RN-17',
  });
}

function anexarEvidencia(ctx) {
  const disputa = disputas.porAgendamento(Number(ctx.params.id));
  disputas.adicionarEvidencia({
    usuarioId: ctx.usuario.id, disputaId: disputa.id, evidencia: ctx.corpo.evidencia,
  });
  return ctx.redirecionar(`/agendamentos/${ctx.params.id}`, {
    tipo: 'sucesso', texto: 'Evidência anexada à disputa.',
  });
}

// ---------------------------------------------------------- notificacoes

function listarNotificacoes(ctx) {
  const lista = notificacoes.listar(ctx.usuario.id);
  const naoLidas = lista.filter((n) => !n.lida_em).length;

  return ctx.render(html`
    <div class="secao-titulo">
      <div>
        <h1 class="sem-topo sem-fundo">Avisos</h1>
        <p>Cada mudança de estado que afeta você gera um aviso aqui ${seloRegra('RF-082')}</p>
      </div>
      ${lista.length ? html`
        <form method="post" action="/notificacoes/lidas">
          ${campoCsrf(ctx.csrf)}
          <button class="botao botao-secundario botao-pequeno" type="submit"
                  ${naoLidas === 0 ? cru('disabled') : cru('')}>
            Marcar todas como lidas
          </button>
        </form>` : cru('')}
    </div>

    ${lista.length === 0
    ? vazio(
      html`Reserva, confirmação, recusa, expiração, cancelamento, ausência, conclusão e decisão
      administrativa: tudo o que muda o estado de um agendamento seu aparece aqui.`,
      { titulo: 'Nenhum aviso ainda' },
    )
    : html`<div class="cartao"><ul class="lista-limpa">
        ${juntar(lista.map((n) => html`
          <li${n.lida_em ? cru(' class="lida"') : cru('')}>
            <div class="linha entre linha-topo">
              <div class="crescer">
                <strong>${n.titulo}</strong>
                <div class="pequeno acima-1">${n.mensagem}</div>
                ${n.agendamento_id
    ? html`<a class="mini" href="/agendamentos/${n.agendamento_id}">ver agendamento →</a>`
    : cru('')}
              </div>
              <span class="mini fraco">${formatarDataHora(n.criada_em)}</span>
            </div>
          </li>`))}
      </ul></div>`}
  `, { titulo: 'Avisos' });
}

function marcarLidas(ctx) {
  notificacoes.marcarLidas(ctx.usuario.id);
  return ctx.redirecionar('/notificacoes', { tipo: 'sucesso', texto: 'Avisos marcados como lidos.' });
}
