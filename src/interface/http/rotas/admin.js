/**
 * Area do administrador: UC-01 (aprovacao), UC-12 (disputas), UC-13 (revisao),
 * UC-14 (metricas) e os parametros do dominio (RN-00).
 *
 * A densidade aqui e maior que na area publica de proposito - quem opera a
 * plataforma precisa comparar. Mas continua sendo o mesmo produto: mesmos
 * tokens, mesmos componentes, mesma forma de mostrar a regra.
 */

import * as adminApp from '../../../aplicacao/admin.js';
import * as contas from '../../../aplicacao/contas.js';
import * as disputas from '../../../aplicacao/disputas.js';
import * as usuariosRepo from '../../../infra/repositorios/usuarios.js';
import {
  html, cru, juntar, campoCsrf, selo, vazio, notaDeRegra, metrica, reputacao, plural, seloRegra,
} from '../views/layout.js';
import { formatarBRL } from '../../../dominio/dinheiro.js';
import { formatarDataHora } from '../../../dominio/tempo.js';
import { PARAMETROS } from '../../../dominio/parametros.js';

const SO_ADMIN = { perfil: 'ADMIN' };

export function registrar(r) {
  r.get('/admin', painel, SO_ADMIN);
  r.get('/admin/disputas', filaDisputas, SO_ADMIN);
  r.get('/admin/disputas/:id', detalheDisputa, SO_ADMIN);
  r.post('/admin/disputas/:id/resolver', resolverDisputa, SO_ADMIN);
  r.get('/admin/contas', telaContas, SO_ADMIN);
  r.get('/admin/contas/:id', dossie, SO_ADMIN);
  r.post('/admin/contas/:id/aprovar', aprovar, SO_ADMIN);
  r.post('/admin/contas/:id/reprovar', reprovar, SO_ADMIN);
  r.post('/admin/contas/:id/decidir', decidir, SO_ADMIN);
  r.get('/admin/parametros', telaParametros, SO_ADMIN);
  r.post('/admin/parametros', salvarParametro, SO_ADMIN);
  r.post('/admin/comissao', salvarComissao, SO_ADMIN);
  r.get('/admin/auditoria', telaAuditoria, SO_ADMIN);
}

// ---------------------------------------------------------------- painel

const PERIODOS = [[7, '7 dias'], [30, '30 dias'], [90, '90 dias']];

function painel(ctx) {
  const dias = Number(ctx.query.dias ?? 30);
  const dados = adminApp.painel({ dias });
  const m = dados.metricas;
  const foraDoSla = dados.disputas.filter((d) => d.foraDoSla).length;
  const pendencias = dados.prestadoresPendentes.length + dados.disputas.length
    + dados.contasEmRevisao.length;

  return ctx.render(html`
    <div class="secao-titulo">
      <div>
        <h1 class="sem-topo sem-fundo">Painel da plataforma</h1>
        <p>${pendencias === 0
    ? 'Nenhuma fila aberta no momento.'
    : `${plural(pendencias, 'item aguarda', 'itens aguardam')} sua decisão.`}</p>
      </div>
      <div class="linha">
        ${juntar(PERIODOS.map(([d, texto]) => html`
          <a class="chip${dias === d ? '' : ' chip-neutro'}"
             href="/admin?dias=${d}"${dias === d ? cru(' aria-current="true"') : cru('')}>${texto}</a>`))}
      </div>
    </div>

    ${foraDoSla ? html`
      <div class="aviso aviso-erro">
        <div class="aviso-corpo">
          <strong>${plural(foraDoSla, 'disputa fora do SLA', 'disputas fora do SLA')}</strong>
          O prazo de resposta venceu. <a href="/admin/disputas">Abrir a fila</a>.
          <span class="selo selo-regra">RF-075</span>
        </div>
      </div>` : cru('')}

    <div class="grade grade-4">
      ${metrica('Comissão acumulada', formatarBRL(m.comissao),
    `sobre ${formatarBRL(m.bruto)} transacionados`)}
      ${metrica('Atendimentos concluídos', m.concluidos,
    `ticket médio de ${formatarBRL(m.ticket_medio)}`)}
      ${metrica('Taxa de cancelamento', `${m.taxa_cancelamento}%`,
    `${m.cancelados} de ${m.total_agendamentos} agendamentos`)}
      ${metrica('Taxa de ausência', `${m.taxa_noshow}%`,
    `${plural(m.noshows, 'ocorrência', 'ocorrências')} no período`)}
    </div>

    <div class="grade grade-3 acima-4">
      ${metrica('Disputas abertas', dados.disputas.length,
    foraDoSla ? `${foraDoSla} fora do SLA` : 'todas dentro do prazo')}
      ${metrica('Prestadores aguardando', dados.prestadoresPendentes.length, 'não publicam até aprovar')}
      ${metrica('Contas em revisão', dados.contasEmRevisao.length, 'entraram por RN-21 ou RN-22')}
    </div>

    ${dados.prestadoresPendentes.length ? html`
      <div class="secao-titulo">
        <div>
          <span class="olho">Fila de moderação</span>
          <h2>Aguardando aprovação</h2>
        </div>
      </div>
      <div class="cartao"><ul class="lista-limpa">
        ${juntar(dados.prestadoresPendentes.map((p) => html`
          <li>
            <div class="linha entre linha-topo">
              <div class="crescer">
                <div class="forte">${p.nome_exibicao ?? p.nome}</div>
                <div class="pequeno fraco">
                  ${p.email} · ${p.bairro ?? 'sem região'} · cadastro em ${formatarDataHora(p.criado_em)}
                </div>
              </div>
              <div class="linha">
                <a class="botao botao-secundario botao-pequeno" href="/admin/contas/${p.id}">Analisar</a>
                <form method="post" action="/admin/contas/${p.id}/aprovar">
                  ${campoCsrf(ctx.csrf)}
                  <button class="botao botao-pequeno" type="submit">Aprovar</button>
                </form>
              </div>
            </div>
          </li>`))}
      </ul></div>` : cru('')}

    ${dados.disputas.length ? html`
      <div class="secao-titulo">
        <div>
          <span class="olho">Fila de disputas</span>
          <h2>Casos abertos</h2>
        </div>
        <a class="botao botao-secundario botao-pequeno" href="/admin/disputas">
          Ver a fila inteira <span class="seta">→</span>
        </a>
      </div>
      <div class="cartao"><ul class="lista-limpa">
        ${juntar(dados.disputas.slice(0, 5).map((d) => html`
          <li>
            <div class="linha entre linha-topo">
              <div class="crescer">
                <div class="forte">
                  <a href="/admin/disputas/${d.id}">#${d.id} — ${disputas.MOTIVOS[d.motivo]}</a>
                </div>
                <div class="pequeno fraco">
                  ${d.servico_nome} · ${formatarBRL(d.valor_travado)}
                  · SLA até ${formatarDataHora(d.prazo_sla_em)}
                </div>
              </div>
              ${d.foraDoSla ? html`<span class="selo selo-perigo">fora do SLA</span>` : selo(d.estado)}
            </div>
          </li>`))}
      </ul></div>` : cru('')}

    <h2>Comissão por categoria</h2>
    ${dados.porCategoria.length === 0
    ? vazio('A comissão só nasce em atendimento concluído. Sem conclusões no período, não há o que apurar.',
      { titulo: 'Sem lançamentos no período' })
    : html`
      <div class="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th scope="col">Categoria</th><th scope="col">Percentual</th>
              <th scope="col" class="direita">Atendimentos</th>
              <th scope="col" class="direita">Bruto</th>
              <th scope="col" class="direita">Comissão</th>
            </tr>
          </thead>
          <tbody>
            ${juntar(dados.porCategoria.map((c) => html`
              <tr>
                <td>${c.nome}</td>
                <td class="num">${c.percentual_comissao}%</td>
                <td class="direita num">${c.qtd}</td>
                <td class="direita num">${formatarBRL(c.bruto)}</td>
                <td class="direita forte num">${formatarBRL(c.comissao)}</td>
              </tr>`))}
          </tbody>
        </table>
      </div>`}

    <h2>Qualidade da interpretação por LLM</h2>
    <div class="cartao">
      <div class="grade grade-4">
        ${metrica('Interpretações', dados.interpretacoes?.total ?? 0)}
        ${metrica('Sucesso', dados.interpretacoes?.sucesso ?? 0, 'confiança acima do limiar')}
        ${metrica('Baixa confiança', dados.interpretacoes?.baixa_confianca ?? 0, 'pediram confirmação')}
        ${metrica('Falhas', dados.interpretacoes?.falha ?? 0, 'caíram no formulário')}
      </div>
      ${notaDeRegra('RN-32', 'Cada interpretação fica registrada com texto original, saída estruturada, '
    + 'confiança e desfecho. Falha do modelo nunca impede a busca: ela cai no formulário de filtros.')}
    </div>
  `, { titulo: 'Painel do admin' });
}

// -------------------------------------------------------------- disputas

function filaDisputas(ctx) {
  const todas = ctx.query.todas === '1';
  const lista = disputas.fila({ apenasAbertas: !todas });

  return ctx.render(html`
    <div class="secao-titulo">
      <div>
        <h1 class="sem-topo sem-fundo">Fila de disputas</h1>
        <p>Ordenada por prazo de SLA e, no empate, por valor do agendamento ${seloRegra('RF-074')}</p>
      </div>
      <a class="botao botao-secundario botao-pequeno" href="/admin/disputas${todas ? '' : '?todas=1'}">
        ${todas ? 'Ver só as abertas' : 'Ver todas, inclusive resolvidas'}
      </a>
    </div>

    ${lista.length === 0
    ? vazio(
      todas
        ? 'Nenhuma disputa foi aberta nesta plataforma até agora.'
        : 'Nenhuma disputa aberta. Quando alguém contestar um desfecho, o caso aparece aqui com o SLA correndo.',
      {
        titulo: 'Fila vazia',
        acoes: todas ? [] : [['/admin/disputas?todas=1', 'Ver disputas já resolvidas']],
      },
    )
    : html`
      <div class="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th scope="col">#</th><th scope="col">Motivo</th><th scope="col">Atendimento</th>
              <th scope="col" class="direita">Valor</th><th scope="col">SLA</th>
              <th scope="col">Estado</th><th scope="col"><span class="so-leitor">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            ${juntar(lista.map((d) => html`
              <tr>
                <td class="num">${d.id}</td>
                <td>${disputas.MOTIVOS[d.motivo]}</td>
                <td>${d.servico_nome}
                  <div class="mini fraco">${d.cliente_nome} × ${d.prestador_nome}</div></td>
                <td class="direita num">${formatarBRL(d.valor_travado)}</td>
                <td>${d.foraDoSla
    ? html`<span class="selo selo-perigo">vencido</span>`
    : html`<span class="mini">${formatarDataHora(d.prazo_sla_em)}</span>`}</td>
                <td>${selo(d.estado)}${d.desfecho
    ? html`<div class="mini fraco">${disputas.DESFECHOS[d.desfecho]}</div>` : cru('')}</td>
                <td class="direita"><a class="pequeno" href="/admin/disputas/${d.id}">analisar</a></td>
              </tr>`))}
          </tbody>
        </table>
      </div>`}
  `, { titulo: 'Disputas' });
}

function detalheDisputa(ctx) {
  const id = Number(ctx.params.id);
  if (ctx.query.assumir === '1') disputas.assumir({ adminId: ctx.usuario.id, disputaId: id });

  const d = disputas.detalhe(id);

  return ctx.render(html`
    <div class="trilha"><a href="/admin/disputas">&larr; Fila de disputas</a></div>
    <div class="cabecalho-pagina">
      <h1>Disputa #${d.id}</h1>
      <p>${disputas.MOTIVOS[d.motivo]} · aberta por ${d.aberta_por_nome}
        em ${formatarDataHora(d.aberta_em)}</p>
    </div>

    ${d.foraDoSla ? html`
      <div class="aviso aviso-erro">
        <div class="aviso-corpo">
          <strong>Fora do SLA</strong>
          O prazo de resposta venceu em ${formatarDataHora(d.prazo_sla_em)}. O sistema sinaliza,
          mas nunca resolve sozinho: a decisão é sempre de um administrador.
          <span class="selo selo-regra">RF-075</span>
        </div>
      </div>` : cru('')}

    <div class="cartao">
      <div class="grade grade-4">
        <div>
          <span class="mini fraco">Atendimento</span>
          <div class="forte">${d.servico_nome}</div>
          <div class="mini fraco">${formatarDataHora(d.inicio)}</div>
        </div>
        <div>
          <span class="mini fraco">Valor em jogo</span>
          <div class="forte num">${formatarBRL(d.valor_travado)}</div>
          <div class="mini fraco">comissão retida</div>
        </div>
        <div>
          <span class="mini fraco">Estado antes da disputa</span>
          <div>${d.estado_antes_disputa ? selo(d.estado_antes_disputa) : '—'}</div>
        </div>
        <div>
          <span class="mini fraco">Estado atual</span>
          <div>${selo(d.agendamento_estado)}</div>
        </div>
      </div>
      <hr class="divisor">
      <div class="grade grade-2">
        <div>
          <span class="mini fraco">Cliente</span>
          <div class="forte"><a href="/admin/contas/${d.cliente_id}">${d.cliente_nome}</a></div>
        </div>
        <div>
          <span class="mini fraco">Prestador</span>
          <div class="forte"><a href="/admin/contas/${d.prestador_id}">${d.prestador_nome}</a></div>
        </div>
      </div>
      ${d.relato ? html`<p class="pequeno acima-3"><strong>Relato:</strong> ${d.relato}</p>` : cru('')}
      <p class="pequeno acima-3 sem-fundo">
        <a href="/agendamentos/${d.agendamento_id}">Ver a linha do tempo completa do agendamento →</a>
      </p>
    </div>

    <h2>${plural(d.evidencias.length, 'evidência', 'evidências')}</h2>
    ${d.evidencias.length === 0
    ? vazio('Nenhuma evidência anexada.')
    : html`<div class="cartao"><ul class="lista-limpa">
      ${juntar(d.evidencias.map((e) => html`
        <li>
          <div class="linha entre">
            <strong>${e.autor_nome}</strong>
            <span class="mini fraco">${formatarDataHora(e.criada_em)} · ${e.tipo}</span>
          </div>
          <div class="pequeno acima-1">${e.descricao}</div>
        </li>`))}
    </ul></div>`}

    ${d.estado === 'RESOLVIDA' ? html`
      <div class="aviso aviso-info acima-4">
        <div class="aviso-corpo">
          <strong>Resolvida: ${disputas.DESFECHOS[d.desfecho]}</strong>
          ${d.justificativa_admin}
          <span class="selo selo-regra">RN-27</span>
        </div>
      </div>` : html`
      <h2>Decisão</h2>
      <form class="cartao" method="post" action="/admin/disputas/${d.id}/resolver">
        ${campoCsrf(ctx.csrf)}
        <div class="campo">
          <label for="desfecho">Desfecho</label>
          <select id="desfecho" name="desfecho" required>
            ${juntar(Object.entries(disputas.DESFECHOS).map(([valor, texto]) => html`
              <option value="${valor}">${valor} — ${texto}</option>`))}
          </select>
        </div>
        <div class="campo">
          <label for="justificativa">Justificativa (vai para as duas partes)</label>
          <textarea id="justificativa" name="justificativa" required minlength="15"
            placeholder="O que as evidências mostram e por que o desfecho é este."></textarea>
          <div class="ajuda">Mínimo de 15 caracteres. Fica registrada na auditoria.</div>
        </div>
        <button class="botao" type="submit">Registrar decisão</button>
      </form>

      ${notaDeRegra('RN-27', 'MANTIDO confirma o desfecho original e penaliza quem abriu sem razão. '
    + 'REVERTIDO inverte o desfecho. PARCIAL mantém o desfecho mas remove a penalidade de reputação. '
    + 'ARQUIVADO estorna a comissão e não penaliza ninguém. A decisão é definitiva no MVP.')}`}
  `, { titulo: `Disputa #${d.id}` });
}

function resolverDisputa(ctx) {
  const d = disputas.resolver({
    adminId: ctx.usuario.id,
    disputaId: Number(ctx.params.id),
    desfecho: ctx.corpo.desfecho,
    justificativa: ctx.corpo.justificativa,
  });

  return ctx.redirecionar(`/admin/disputas/${d.id}`, {
    tipo: 'sucesso',
    titulo: `Disputa resolvida: ${disputas.DESFECHOS[d.desfecho]}`,
    texto: 'Reputação e comissão foram ajustadas conforme o desfecho, e as duas partes foram notificadas.',
    regra: 'RN-27',
  });
}

// ---------------------------------------------------------------- contas

function tabelaDeContas(lista) {
  return html`
    <div class="cartao tabela-rolagem">
      <table>
        <thead>
          <tr>
            <th scope="col">Nome</th><th scope="col">E-mail</th>
            <th scope="col" class="direita">Reputação</th><th scope="col">Estado</th>
            <th scope="col"><span class="so-leitor">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          ${juntar(lista.map((u) => html`
            <tr>
              <td>${u.nome_exibicao ?? u.nome}</td>
              <td class="mini">${u.email}</td>
              <td class="direita num">${u.reputacao ?? '—'}</td>
              <td>${selo(u.estado_conta)}</td>
              <td class="direita"><a class="pequeno" href="/admin/contas/${u.id}">abrir</a></td>
            </tr>`))}
        </tbody>
      </table>
    </div>`;
}

function telaContas(ctx) {
  const pendentes = usuariosRepo.prestadoresPendentes();
  const revisao = usuariosRepo.contasEmRevisao();
  const prestadores = usuariosRepo.listarPorPerfil('PRESTADOR');
  const clientes = usuariosRepo.listarPorPerfil('CLIENTE');

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Contas</h1>
      <p>Contas caem em revisão sozinhas, por reputação abaixo do limiar (RN-22) ou por ocorrências
        negativas repetidas (RN-21). Sair da revisão exige decisão sua, com justificativa.</p>
    </div>

    ${revisao.length
    ? html`<h2 class="sem-topo">Em revisão ou suspensas (${revisao.length})</h2>${tabelaDeContas(revisao)}`
    : cru('')}
    ${pendentes.length
    ? html`<h2>Aguardando aprovação (${pendentes.length})</h2>${tabelaDeContas(pendentes)}`
    : cru('')}
    <h2>Prestadores (${prestadores.length})</h2>${tabelaDeContas(prestadores)}
    <h2>Clientes (${clientes.length})</h2>${tabelaDeContas(clientes)}
  `, { titulo: 'Contas' });
}

function dossie(ctx) {
  const id = Number(ctx.params.id);
  const d = adminApp.dossieDaConta(id);
  if (!d) {
    return ctx.render(vazio('Conta não encontrada.', { titulo: 'Nada aqui' }), { titulo: 'Conta' });
  }

  const usuario = usuariosRepo.porId(id);

  return ctx.render(html`
    <div class="trilha"><a href="/admin/contas">&larr; Contas</a></div>
    <div class="cabecalho-pagina">
      <h1>${d.nome_exibicao ?? d.nome}</h1>
      <p>${usuario.email} · ${usuario.perfil.toLowerCase()}
        · na plataforma desde ${formatarDataHora(d.criado_em)}</p>
    </div>

    <div class="cartao">
      <div class="grade grade-4">
        <div>${reputacao(d.reputacao)}</div>
        ${metrica('Concluídos', d.concluidos)}
        ${metrica('Ausências', d.noshows, `${d.taxa_noshow}% dos encerrados`)}
        ${metrica('Cancelamentos', d.cancelamentos)}
      </div>
      <hr class="divisor">
      <div class="linha entre">
        <div class="linha">Estado atual: ${selo(usuario.estado_conta)}</div>
        ${usuario.estado_conta === 'PENDENTE_APROVACAO' ? html`
          <form method="post" action="/admin/contas/${id}/aprovar">
            ${campoCsrf(ctx.csrf)}
            <button class="botao botao-pequeno" type="submit">Aprovar cadastro</button>
          </form>` : cru('')}
      </div>
    </div>

    ${usuario.estado_conta === 'PENDENTE_APROVACAO' ? html`
      <h2>Reprovar cadastro</h2>
      <form class="cartao" method="post" action="/admin/contas/${id}/reprovar">
        ${campoCsrf(ctx.csrf)}
        <div class="campo">
          <label for="justificativa">Justificativa</label>
          <textarea id="justificativa" name="justificativa" required minlength="10"></textarea>
          <div class="ajuda">Mínimo de 10 caracteres. O prestador recebe este texto na notificação.</div>
        </div>
        <button class="botao botao-perigo" type="submit">Reprovar cadastro</button>
      </form>` : html`
      <h2>Decisão sobre a conta</h2>
      <form class="cartao" method="post" action="/admin/contas/${id}/decidir">
        ${campoCsrf(ctx.csrf)}
        <div class="campo">
          <label for="decisao">Decisão</label>
          <select id="decisao" name="decisao" required>
            <option value="ATIVO">Reativar a conta</option>
            <option value="SUSPENSO">Suspender a conta</option>
          </select>
        </div>
        <div class="campo">
          <label for="justificativa">Justificativa</label>
          <textarea id="justificativa" name="justificativa" required minlength="10"></textarea>
          <div class="ajuda">Mínimo de 10 caracteres. O titular é notificado com este texto.</div>
        </div>
        <button class="botao" type="submit">Registrar decisão</button>
      </form>
      ${notaDeRegra('RF-079', 'Sair de EM_REVISAO ou de SUSPENSO exige decisão do admin com justificativa: '
    + 'a reputação sozinha nunca reabilita uma conta bloqueada.')}`}

    <h2>Eventos de reputação</h2>
    ${d.eventos.length === 0
    ? vazio('Nenhum evento de reputação registrado para esta conta.')
    : html`
      <div class="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th scope="col">Quando</th><th scope="col">Tipo</th>
              <th scope="col" class="direita">Delta</th>
              <th scope="col">Origem</th><th scope="col">Revertido</th>
            </tr>
          </thead>
          <tbody>
            ${juntar(d.eventos.map((e) => html`
              <tr>
                <td class="mini">${formatarDataHora(e.criado_em)}</td>
                <td class="mono">${e.tipo}</td>
                <td class="direita forte num ${e.delta < 0 ? 'delta-menos' : 'delta-mais'}">
                  ${e.delta > 0 ? '+' : ''}${e.delta}
                </td>
                <td class="mini">${e.origem_tipo}${e.origem_id ? ` #${e.origem_id}` : ''}</td>
                <td class="mini">${e.revertido_em ? formatarDataHora(e.revertido_em) : '—'}</td>
              </tr>`))}
          </tbody>
        </table>
      </div>
      ${notaDeRegra('INV-08', 'A reputação é a soma destes eventos dentro da janela móvel, truncada ao '
      + 'intervalo de 0 a 100 — nunca um campo editado à mão.')}`}
  `, { titulo: d.nome_exibicao ?? d.nome });
}

function aprovar(ctx) {
  contas.aprovarPrestador({ adminId: ctx.usuario.id, prestadorId: Number(ctx.params.id) });
  return ctx.voltar({
    tipo: 'sucesso',
    texto: 'Prestador aprovado e notificado. A conta já pode publicar horários assim que o perfil estiver completo.',
    regra: 'RF-008',
  });
}

function reprovar(ctx) {
  contas.reprovarPrestador({
    adminId: ctx.usuario.id, prestadorId: Number(ctx.params.id), justificativa: ctx.corpo.justificativa,
  });
  return ctx.redirecionar('/admin/contas', {
    tipo: 'info', texto: 'Cadastro reprovado. O prestador foi notificado com a justificativa.', regra: 'RF-009',
  });
}

function decidir(ctx) {
  contas.decidirSobreConta({
    adminId: ctx.usuario.id,
    usuarioId: Number(ctx.params.id),
    decisao: ctx.corpo.decisao,
    justificativa: ctx.corpo.justificativa,
  });
  return ctx.voltar({
    tipo: 'sucesso', texto: 'Decisão registrada, auditada e notificada ao titular.', regra: 'RF-079',
  });
}

// ------------------------------------------------------------ parametros

/**
 * RN-00 - cada parametro e um cartao com o valor, a faixa valida e a regra
 * que ele governa. Um input solto sem esse contexto esconderia que mexer aqui
 * muda o comportamento do sistema inteiro.
 */
function telaParametros(ctx) {
  const { valores } = adminApp.parametrosAtuais();
  const { categorias } = adminApp.metricas({ dias: 30 });
  const globais = Object.entries(PARAMETROS).filter(([, meta]) => meta.escopo !== 'PRESTADOR');
  const doPrestador = Object.entries(PARAMETROS).filter(([, meta]) => meta.escopo === 'PRESTADOR');

  const cartao = ([chave, meta]) => html`
    <div class="cartao">
      <div class="linha entre linha-topo">
        <div class="crescer">
          <div class="forte">${meta.rotulo}</div>
          ${meta.ajuda ? html`<div class="mini fraco acima-1">${meta.ajuda}</div>` : cru('')}
        </div>
        <span class="selo selo-regra">${meta.id}</span>
      </div>

      <form method="post" action="/admin/parametros" class="linha acima-3">
        ${campoCsrf(ctx.csrf)}
        <input type="hidden" name="chave" value="${chave}">
        <label class="so-leitor" for="p-${chave}">${meta.rotulo}</label>
        ${meta.opcoes
    ? html`<select id="p-${chave}" name="valor" class="campo-estreito">
            ${juntar(meta.opcoes.map((o) => html`
              <option value="${o}" ${valores[chave] === o ? 'selected' : ''}>${o}</option>`))}
          </select>`
    : html`<input id="p-${chave}" name="valor" type="number" class="campo-curto"
             value="${valores[chave]}" min="${meta.min}" max="${meta.max}"
             ${meta.decimal ? cru('step="0.05"') : cru('')}>`}
        <button class="botao botao-secundario botao-pequeno" type="submit">Salvar</button>
      </form>

      <div class="mini fraco acima-2">
        ${meta.opcoes
    ? html`Valores aceitos: ${meta.opcoes.join(' ou ')}`
    : html`Faixa válida: <strong>${meta.min}</strong> a <strong>${meta.max}</strong> ${meta.unidade ?? ''}
        · padrão ${meta.padrao}`}
      </div>
    </div>`;

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Parâmetros do domínio</h1>
      <p>Os números das regras são dados, não código. Alterar um valor aqui muda o comportamento do
        sistema a partir de agora — e <strong>nunca</strong> retroage a fatos já ocorridos.</p>
    </div>

    ${notaDeRegra('RN-00', 'Nenhum valor desta tela está escrito no meio de uma regra: todos são lidos '
    + 'da base de configuração a cada operação, e toda alteração fica na trilha de auditoria.')}

    <h2>Globais</h2>
    <div class="grade grade-2">${juntar(globais.map(cartao))}</div>

    ${doPrestador.length ? html`
      <div class="secao-titulo">
        <div>
          <h2 class="sem-topo">Padrões por prestador</h2>
          <p>Cada prestador pode sobrescrever estes dois no próprio perfil. O valor abaixo é o
          usado por quem nunca mexeu.</p>
        </div>
      </div>
      <div class="grade grade-2">${juntar(doPrestador.map(cartao))}</div>` : cru('')}

    <div class="secao-titulo">
      <div>
        <h2 class="sem-topo">Comissão por categoria</h2>
        <p>Faixa operacional de 8% a 15%. O percentual aplicado é o vigente no momento da conclusão
        do agendamento.</p>
      </div>
    </div>

    <div class="cartao tabela-rolagem">
      <table>
        <thead>
          <tr>
            <th scope="col">Categoria</th><th scope="col">Percentual vigente</th>
            <th scope="col">Vigente desde</th>
          </tr>
        </thead>
        <tbody>
          ${juntar(categorias.map((c) => html`
            <tr>
              <td>${c.nome}</td>
              <td>
                <form method="post" action="/admin/comissao" class="linha">
                  ${campoCsrf(ctx.csrf)}
                  <input type="hidden" name="categoriaId" value="${c.id}">
                  <label class="so-leitor" for="c-${c.id}">Percentual de comissão de ${c.nome}</label>
                  <input id="c-${c.id}" name="percentual" type="number" min="8" max="15"
                         value="${c.percentual_comissao}" class="campo-micro">
                  <button class="botao botao-secundario botao-pequeno" type="submit">Salvar</button>
                </form>
              </td>
              <td class="mini fraco">${formatarDataHora(c.vigente_desde)}</td>
            </tr>`))}
        </tbody>
      </table>
    </div>
    ${notaDeRegra('RF-081', 'A alteração de percentual vale só para agendamentos concluídos depois da '
    + 'vigência. Lançamentos anteriores não mudam — reescrever história financeira não é opção.')}
  `, { titulo: 'Parâmetros' });
}

function salvarParametro(ctx) {
  const valor = adminApp.ajustarParametro({
    adminId: ctx.usuario.id, chave: ctx.corpo.chave, valor: ctx.corpo.valor,
  });
  return ctx.redirecionar('/admin/parametros', {
    tipo: 'sucesso',
    texto: `Parâmetro atualizado para ${valor}. Vale para fatos a partir de agora.`,
    regra: 'RN-00',
  });
}

function salvarComissao(ctx) {
  const categoria = adminApp.ajustarComissao({
    adminId: ctx.usuario.id, categoriaId: ctx.corpo.categoriaId, percentual: ctx.corpo.percentual,
  });
  return ctx.redirecionar('/admin/parametros', {
    tipo: 'sucesso',
    texto: `A comissão de ${categoria.nome} passa a ser ${categoria.percentual_comissao}% para `
      + 'agendamentos concluídos daqui em diante.',
    regra: 'RN-15',
  });
}

// ------------------------------------------------------------- auditoria

function telaAuditoria(ctx) {
  const dados = adminApp.rastreabilidade({ limite: 120 });

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Auditoria e rastreabilidade</h1>
      <p>Toda transição de estado e toda ação administrativa deixam rastro com autor, instante e
        estados envolvidos. É o que permite reconstruir por que um agendamento terminou como
        terminou ${seloRegra('RF-084')} ${seloRegra('RF-085')}</p>
    </div>

    <h2>Interpretações por LLM recentes</h2>
    ${dados.interpretacoes.length === 0
    ? vazio('Ninguém buscou por descrição em texto livre ainda. A busca por filtros não passa por aqui.',
      { titulo: 'Nenhuma interpretação registrada' })
    : html`
      <div class="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th scope="col">Quando</th><th scope="col">Texto original</th>
              <th scope="col">Categoria</th><th scope="col">Confiança</th>
              <th scope="col">Status</th><th scope="col">Desfecho</th><th scope="col">Modelo</th>
            </tr>
          </thead>
          <tbody>
            ${juntar(dados.interpretacoes.map((i) => html`
              <tr>
                <td class="mini">${formatarDataHora(i.criada_em)}</td>
                <td class="pequeno">${i.texto_original}</td>
                <td class="mini">${i.categoria_nome ?? i.categoria_sugerida ?? '—'}</td>
                <td class="mini num">${i.confianca != null ? `${Math.round(i.confianca * 100)}%` : '—'}</td>
                <td><span class="selo selo-${i.status === 'SUCESSO' ? 'ok' : (i.status === 'FALHA' ? 'perigo' : 'aviso')}">
                  ${i.status}</span></td>
                <td class="mini">${i.desfecho}</td>
                <td class="mini mono">${i.modelo}</td>
              </tr>`))}
          </tbody>
        </table>
      </div>
      ${notaDeRegra('INV-14', 'Nenhuma decisão de exibição de horário depende diretamente da saída do '
      + 'modelo: o que está registrado aqui são os filtros propostos, não os resultados escolhidos.')}`}

    <h2>Trilha de auditoria</h2>
    <div class="cartao tabela-rolagem">
      <table>
        <thead>
          <tr>
            <th scope="col">Quando</th><th scope="col">Ação</th><th scope="col">Entidade</th>
            <th scope="col">De</th><th scope="col">Para</th><th scope="col">Ator</th>
          </tr>
        </thead>
        <tbody>
          ${juntar(dados.auditoria.map((l) => html`
            <tr>
              <td class="mini">${formatarDataHora(l.criado_em)}</td>
              <td class="mono">${l.acao}</td>
              <td class="mini">${l.entidade_tipo}${l.entidade_id ? ` #${l.entidade_id}` : ''}</td>
              <td class="mini">${l.estado_anterior ?? '—'}</td>
              <td class="mini">${l.estado_novo ?? '—'}</td>
              <td class="mini">${l.ator_nome ?? 'sistema'}</td>
            </tr>`))}
        </tbody>
      </table>
    </div>
  `, { titulo: 'Auditoria' });
}
