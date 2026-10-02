/**
 * Area do prestador: UC-02 (publicar), UC-06 (confirmar) e extrato (RF-061).
 *
 * A tela do prestador e uma ferramenta de gestao de ociosidade, nao um
 * relatorio: o que exige acao aparece antes do que e so historico.
 */

import * as contas from '../../../aplicacao/contas.js';
import * as catalogo from '../../../aplicacao/catalogo.js';
import * as horariosApp from '../../../aplicacao/horarios.js';
import * as agendamentos from '../../../aplicacao/agendamentos.js';
import * as usuariosRepo from '../../../infra/repositorios/usuarios.js';
import * as financeiroRepo from '../../../infra/repositorios/financeiro.js';
import {
  html, cru, juntar, campoCsrf, selo, vazio, notaDeRegra, blocoDePreco, reputacao, metrica,
  reguaDeDesconto, plural, seloRegra,
} from '../views/layout.js';
import { formatarBRL, centavosParaCampo } from '../../../dominio/dinheiro.js';
import {
  formatarDataHora, formatarHora, formatarDiaLongo, partesLocais, agoraIso, humanizarMinutos,
} from '../../../dominio/tempo.js';
import { params } from '../../../aplicacao/parametros.js';

const SO_PRESTADOR = { perfil: 'PRESTADOR' };

export function registrar(r) {
  r.get('/prestador', painel, SO_PRESTADOR);
  r.get('/prestador/horarios', telaHorarios, SO_PRESTADOR);
  r.post('/prestador/horarios', publicarHorario, SO_PRESTADOR);
  r.post('/prestador/horarios/:id/cancelar', cancelarHorario, SO_PRESTADOR);
  r.get('/prestador/catalogo', telaCatalogo, SO_PRESTADOR);
  r.post('/prestador/servicos', salvarServico, SO_PRESTADOR);
  r.post('/prestador/regua', salvarRegua, SO_PRESTADOR);
  r.get('/prestador/agendamentos', telaAgendamentos, SO_PRESTADOR);
  r.get('/prestador/extrato', telaExtrato, SO_PRESTADOR);
  r.get('/prestador/perfil', telaPerfil, SO_PRESTADOR);
  r.post('/prestador/perfil', salvarPerfil, SO_PRESTADOR);
}

// ---------------------------------------------------------------- painel

function painel(ctx) {
  const p = params();
  const prestador = usuariosRepo.prestador(ctx.usuario.id);
  const pendencias = contas.pendenciasDoPrestador(ctx.usuario.id);
  const lista = agendamentos.doPrestador(ctx.usuario.id);
  const aguardando = lista.filter((a) => a.estado === 'PENDENTE_CONFIRMACAO');
  const confirmados = lista.filter((a) => a.estado === 'CONFIRMADO');
  const aConcluir = lista.filter((a) => a.podeConcluir);
  const totais = financeiroRepo.totaisPrestador(ctx.usuario.id);
  const publicados = horariosApp.agendaDoPrestador(ctx.usuario.id, { estados: ['PUBLICADO'] });

  const pendencia = aguardando.length + aConcluir.length;

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Olá, ${prestador.nome_exibicao}</h1>
      <p>
        ${prestador.bairro ? `${prestador.bairro} — ${prestador.cidade}` : 'Região não definida'}
        · janela de confirmação de ${prestador.janela_confirmacao_min} min
        · ao expirar, ${prestador.politica_expiracao === 'AUTOCONFIRMAR' ? 'confirma sozinho' : 'libera o horário'}
      </p>
    </div>

    ${avisoDeEstado(ctx.usuario, pendencias)}

    <div class="grade grade-4">
      ${metrica('Aguardando sua resposta', aguardando.length,
    aguardando.length ? 'o relógio está correndo' : 'nada pendente agora')}
      ${metrica('Confirmados', confirmados.length, 'já são compromisso')}
      ${metrica('Horários na vitrine', publicados.length, 'visíveis para clientes')}
      ${metrica('Recebido (líquido)', formatarBRL(totais.liquido),
    `comissão de ${formatarBRL(totais.comissao)} até agora`)}
    </div>

    ${pendencia === 0 && publicados.length === 0 && pendencias.completo ? html`
      <div class="acima-5">
        ${vazio(
    html`Sua agenda não tem nenhum horário publicado. Um buraco de amanhã só vira receita
    se estiver na vitrine hoje.`,
    { titulo: 'Nada na vitrine', acoes: [['/prestador/horarios', 'Publicar um horário']] },
  )}
      </div>` : cru('')}

    ${aguardando.length ? html`
      <div class="secao-titulo">
        <div>
          <span class="olho">Agora</span>
          <h2>${plural(aguardando.length, 'reserva precisa', 'reservas precisam')} de resposta</h2>
        </div>
      </div>
      <ul class="lista-cartoes">
        ${juntar(aguardando.map((a) => html`
          <li class="cartao cartao-vivo">
            <div class="linha entre linha-topo">
              <div class="crescer">
                <div class="forte">
                  <a href="/agendamentos/${a.id}">${a.servico_nome}</a> · ${a.cliente_nome}
                </div>
                <div class="pequeno fraco">
                  ${formatarDataHora(a.inicio)} · ${formatarBRL(a.valor_travado)}
                </div>
                <div class="mini fraco acima-1">
                  Responda até ${formatarDataHora(a.prazo_confirmacao_em)} ${seloRegra('RN-10')}
                </div>
              </div>
              <div class="linha">
                <a class="botao botao-secundario botao-pequeno" href="/agendamentos/${a.id}">Analisar</a>
                <form method="post" action="/agendamentos/${a.id}/confirmar">
                  ${campoCsrf(ctx.csrf)}
                  <button class="botao botao-pequeno" type="submit">Confirmar</button>
                </form>
              </div>
            </div>
          </li>`))}
      </ul>` : cru('')}

    ${aConcluir.length ? html`
      <div class="secao-titulo">
        <div>
          <span class="olho">Já aconteceram</span>
          <h2>${plural(aConcluir.length, 'atendimento a fechar', 'atendimentos a fechar')}</h2>
          <p>Fechar o atendimento apura a comissão e libera a avaliação das duas partes.</p>
        </div>
      </div>
      <ul class="lista-cartoes">
        ${juntar(aConcluir.map((a) => html`
          <li class="cartao cartao-vivo">
            <div class="linha entre linha-topo">
              <div class="crescer">
                <div class="forte">
                  <a href="/agendamentos/${a.id}">${a.servico_nome}</a> · ${a.cliente_nome}
                </div>
                <div class="pequeno fraco">
                  ${formatarDataHora(a.inicio)} · ${formatarBRL(a.valor_travado)}
                </div>
              </div>
              <form method="post" action="/agendamentos/${a.id}/concluir">
                ${campoCsrf(ctx.csrf)}
                <input type="hidden" name="estadoCobranca" value="PAGO_PRESENCIAL">
                <button class="botao botao-pequeno" type="submit">Cliente pagou, concluir</button>
              </form>
            </div>
          </li>`))}
      </ul>
      ${notaDeRegra('RF-060', `Sem conclusão e sem contestação em ${p.autoconclusao_h} h após o fim, `
    + 'o sistema conclui sozinho e apura a comissão.')}
      ` : cru('')}

    <div class="secao-titulo">
      <div>
        <span class="olho">Sua conta</span>
        <h2>Reputação</h2>
      </div>
      <a class="botao botao-secundario botao-pequeno" href="/prestador/perfil">
        Ajustar minha política <span class="seta">→</span>
      </a>
    </div>
    <div class="cartao">
      ${reputacao(ctx.usuario.reputacao, { rotuloTexto: 'Reputação atual' })}
      ${notaDeRegra('RN-21', `Cancelamento com penalidade e ausência contam como ocorrência negativa. `
    + `${p.ocorrencias_consecutivas_max} delas em ${p.janela_ocorrencias_dias} dias levam a conta à `
    + 'revisão do administrador, e a publicação de novos horários fica suspensa até a decisão.')}
    </div>
  `, { titulo: 'Painel do prestador' });
}

function avisoDeEstado(usuario, pendencias) {
  if (usuario.estado_conta === 'PENDENTE_APROVACAO') {
    return html`<div class="aviso aviso-atencao">
      <div class="aviso-corpo">
        <strong>Cadastro aguardando aprovação</strong>
        Você já pode montar serviços e a régua de desconto, mas só publica horários depois que o
        administrador aprovar o cadastro.
        <span class="selo selo-regra">RN-28</span>
      </div></div>`;
  }
  if (usuario.estado_conta === 'EM_REVISAO') {
    return html`<div class="aviso aviso-erro">
      <div class="aviso-corpo">
        <strong>Conta em revisão</strong>
        A publicação de novos horários está suspensa até a decisão do administrador.
        Os agendamentos já confirmados seguem valendo e devem ser honrados.
        <span class="selo selo-regra">RN-21</span>
      </div></div>`;
  }
  if (!pendencias.completo) {
    return html`<div class="aviso aviso-info">
      <div class="aviso-corpo">
        <strong>Falta pouco para publicar</strong>
        Ainda falta: ${pendencias.faltando.join(', ')}.
        <a href="/prestador/catalogo">Completar agora</a>
        <span class="selo selo-regra">RN-08</span>
      </div></div>`;
  }
  return cru('');
}

// -------------------------------------------------------------- horarios

/** Agrupa a agenda por dia local, preservando a ordem cronologica. */
function porDia(agenda) {
  const dias = new Map();
  for (const h of agenda) {
    const chave = partesLocais(h.inicio).data;
    if (!dias.has(chave)) dias.set(chave, []);
    dias.get(chave).push(h);
  }
  return [...dias.entries()];
}

function telaHorarios(ctx) {
  const p = params();
  const servicos = catalogo.servicosDoPrestador(ctx.usuario.id, true);
  const reguas = catalogo.reguasDoPrestador(ctx.usuario.id);
  const agenda = horariosApp.agendaDoPrestador(ctx.usuario.id, { desde: agoraIso() });
  const { data } = partesLocais(agoraIso());
  const dias = porDia(agenda);

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Agenda</h1>
      <p>Publique um buraco da agenda. É preciso ao menos
        ${humanizarMinutos(p.antecedencia_min_publicacao_min)} de antecedência — um horário que você
        não conseguiria cumprir não entra na busca.</p>
    </div>

    ${servicos.length === 0 || reguas.length === 0 ? html`
      <div class="aviso aviso-info">
        <div class="aviso-corpo">
          <strong>Antes de publicar</strong>
          Cadastre ao menos um serviço e uma régua de desconto.
          <a href="/prestador/catalogo">Ir para serviços e régua</a>
        </div>
      </div>` : html`
      <form class="cartao" method="post" action="/prestador/horarios">
        ${campoCsrf(ctx.csrf)}
        <h2 class="sem-topo">Publicar horário</h2>
        <div class="grade grade-4">
          <div class="campo">
            <label for="servicoId">Serviço</label>
            <select id="servicoId" name="servicoId" required>
              ${juntar(servicos.map((s) => html`
                <option value="${s.id}">${s.nome} — ${s.duracao_min} min, ${formatarBRL(s.preco_base)}</option>`))}
            </select>
          </div>
          <div class="campo">
            <label for="reguaId">Régua de desconto</label>
            <select id="reguaId" name="reguaId" required>
              ${juntar(reguas.map((rg) => html`<option value="${rg.id}">${rg.nome}</option>`))}
            </select>
          </div>
          <div class="campo">
            <label for="data">Data</label>
            <input id="data" name="data" type="date" value="${data}" required>
          </div>
          <div class="campo">
            <label for="horas">Horários</label>
            <input id="horas" name="horas" placeholder="14:00, 15:30" required>
            <div class="ajuda">Separe por vírgula para publicar em lote.</div>
          </div>
        </div>
        <button class="botao" type="submit">Publicar horário</button>
        ${notaDeRegra('RF-023', 'Na publicação em lote cada horário é validado sozinho: os válidos entram, '
    + 'e os recusados voltam com o motivo individual.')}
      </form>`}

    <div class="secao-titulo">
      <div>
        <h2>Próximos horários</h2>
        <p>${plural(agenda.length, 'horário na agenda', 'horários na agenda')},
        contando publicados, reservados e confirmados.</p>
      </div>
    </div>

    ${agenda.length === 0
    ? vazio(
      html`Nenhum horário futuro na agenda. Publique acima o primeiro buraco da semana —
      quanto mais cedo ele entra na vitrine, mais tempo o preço tem para atrair alguém.`,
      { titulo: 'Agenda vazia daqui para a frente' },
    )
    : juntar(dias.map(([, horarios]) => html`
      <section class="agenda-dia">
        <div class="agenda-cabeca">
          <h3>${formatarDiaLongo(horarios[0].inicio)}</h3>
          <span class="resumo">${plural(horarios.length, 'horário', 'horários')}</span>
        </div>
        <ul class="agenda-lista">
          ${juntar(horarios.map((h) => html`
            <li class="cartao">
              <div class="vaga">
                <div class="vaga-quando">
                  <span class="hora">${formatarHora(h.inicio)}</span>
                  <span class="duracao">${h.duracao_min} min</span>
                </div>
                <div class="vaga-corpo">
                  <div class="vaga-titulo">${h.servico_nome}</div>
                  <p class="vaga-meta sem-fundo">
                    <span>${h.categoria_nome}</span>
                    <span class="ponto">·</span>
                    <span>começa em ${humanizarMinutos(h.preco.antecedenciaMin)}</span>
                  </p>
                  <div class="vaga-sinais">${selo(h.estado)}</div>
                </div>
                <div class="vaga-lado">
                  ${blocoDePreco(h.preco)}
                  ${h.estado === 'PUBLICADO' ? html`
                    <form method="post" action="/prestador/horarios/${h.id}/cancelar">
                      ${campoCsrf(ctx.csrf)}
                      <button class="botao botao-secundario botao-pequeno botao-largo" type="submit">
                        Retirar da busca
                      </button>
                    </form>` : cru('')}
                </div>
              </div>
            </li>`))}
        </ul>
      </section>`))}

    ${notaDeRegra('RN-06', 'Dois horários ativos do mesmo prestador nunca se sobrepõem: o sistema recusa a '
    + 'publicação e aponta qual horário conflita.')}
  `, { titulo: 'Agenda' });
}

function publicarHorario(ctx) {
  const horas = String(ctx.corpo.horas ?? '')
    .split(',').map((h) => h.trim()).filter(Boolean);

  if (horas.length === 0) {
    return ctx.voltar({ tipo: 'erro', texto: 'Informe ao menos um horário.' });
  }

  const resultados = horariosApp.publicarLote({
    prestadorId: ctx.usuario.id,
    servicoId: Number(ctx.corpo.servicoId),
    reguaId: Number(ctx.corpo.reguaId),
    data: ctx.corpo.data,
    horas,
  });

  const ok = resultados.filter((r) => r.ok);
  const falhas = resultados.filter((r) => !r.ok);

  if (ok.length === 0) {
    const primeira = falhas[0];
    return ctx.voltar({
      tipo: 'erro',
      titulo: 'Nenhum horário publicado',
      texto: falhas.map((f) => `${f.hora}: ${f.erro}`).join(' | '),
      regra: primeira?.regra ?? null,
    });
  }

  return ctx.redirecionar('/prestador/horarios', {
    tipo: falhas.length ? 'atencao' : 'sucesso',
    titulo: `${plural(ok.length, 'horário publicado', 'horários publicados')}`,
    texto: falhas.length
      ? `Não publicados: ${falhas.map((f) => `${f.hora} (${f.erro})`).join('; ')}`
      : 'Já estão visíveis na busca, com o preço vigente calculado pela sua régua.',
  });
}

function cancelarHorario(ctx) {
  horariosApp.cancelarHorarioLivre({
    prestadorId: ctx.usuario.id, horarioId: Number(ctx.params.id),
  });
  return ctx.redirecionar('/prestador/horarios', {
    tipo: 'info',
    texto: 'Horário retirado da busca. Sem penalidade, porque não havia reserva sobre ele.',
    regra: 'RF-022',
  });
}

// -------------------------------------------------------------- catalogo

function telaCatalogo(ctx) {
  const p = params();
  const categorias = catalogo.listarCategorias();
  const servicos = catalogo.servicosDoPrestador(ctx.usuario.id);
  const reguas = catalogo.reguasDoPrestador(ctx.usuario.id);
  const regua = reguas[0] ?? null;
  const faixas = regua?.faixas ?? [
    { antecedencia_min: 240, percentual_desconto: 15 },
    { antecedencia_min: 120, percentual_desconto: 25 },
    { antecedencia_min: 60, percentual_desconto: 35 },
  ];

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Serviços e régua de desconto</h1>
      <p>O preço-base é o teto; a régua diz o quanto você aceita ceder conforme o horário chega.
        Nenhum desconto passa do piso que você marcar no serviço.</p>
    </div>

    <div class="grade grade-2">
      <div>
        <h2 class="sem-topo">Novo serviço</h2>
        <form class="cartao" method="post" action="/prestador/servicos">
          ${campoCsrf(ctx.csrf)}
          <div class="campo">
            <label for="nome">Nome</label>
            <input id="nome" name="nome" required placeholder="Ex.: Corte masculino simples">
          </div>
          <div class="campo">
            <label for="categoriaId">Categoria</label>
            <select id="categoriaId" name="categoriaId" required>
              ${juntar(categorias.map((c) => html`
                <option value="${c.id}">${c.nome} — comissão ${c.percentual_comissao}%</option>`))}
            </select>
          </div>
          <div class="grade grade-3">
            <div class="campo">
              <label for="duracaoMin">Duração (min)</label>
              <input id="duracaoMin" name="duracaoMin" type="number" step="5" min="5" value="30" required>
              <div class="ajuda">Múltiplo de 5.</div>
            </div>
            <div class="campo">
              <label for="precoBase">Preço-base</label>
              <input id="precoBase" name="precoBase" placeholder="50,00" required>
              <div class="ajuda">Seu preço cheio.</div>
            </div>
            <div class="campo">
              <label for="precoMinimo">Preço mínimo</label>
              <input id="precoMinimo" name="precoMinimo" placeholder="32,00">
              <div class="ajuda">Piso: nenhum desconto passa disso.</div>
            </div>
          </div>
          <button class="botao" type="submit">Cadastrar serviço</button>
        </form>

        <h2>${plural(servicos.length, 'serviço cadastrado', 'serviços cadastrados')}</h2>
        ${servicos.length === 0
    ? vazio('Um serviço define duração, preço-base e piso. Sem ele não há o que publicar.',
      { titulo: 'Nenhum serviço ainda' })
    : html`
          <div class="cartao"><ul class="lista-limpa">
            ${juntar(servicos.map((s) => html`
              <li>
                <div class="linha entre linha-topo">
                  <div class="crescer">
                    <div class="forte">${s.nome}</div>
                    <div class="pequeno fraco">${s.categoria_nome} · ${s.duracao_min} min</div>
                  </div>
                  <div class="direita">
                    <div class="forte num">${formatarBRL(s.preco_base)}</div>
                    <div class="mini fraco">piso ${formatarBRL(s.preco_minimo)}</div>
                  </div>
                </div>
              </li>`))}
          </ul></div>`}
      </div>

      <div>
        <h2 class="sem-topo">Régua de desconto</h2>
        <form class="cartao" method="post" action="/prestador/regua">
          ${campoCsrf(ctx.csrf)}
          ${regua ? html`<input type="hidden" name="reguaId" value="${regua.id}">` : cru('')}
          <div class="campo">
            <label for="nomeRegua">Nome da régua</label>
            <input id="nomeRegua" name="nome" value="${regua?.nome ?? 'Encaixe padrão'}" required>
          </div>

          <table>
            <thead>
              <tr><th scope="col">A partir de (min antes)</th><th scope="col">Desconto (%)</th></tr>
            </thead>
            <tbody>
              ${juntar([0, 1, 2, 3].map((i) => html`
                <tr>
                  <td><input name="antecedencia_min" type="number" min="1"
                        aria-label="Antecedência da faixa ${i + 1}, em minutos"
                        value="${faixas[i]?.antecedencia_min ?? ''}" placeholder="ex.: 240"></td>
                  <td><input name="percentual_desconto" type="number" min="0" max="${p.desconto_maximo_pct}"
                        aria-label="Desconto da faixa ${i + 1}, em porcento"
                        value="${faixas[i]?.percentual_desconto ?? ''}" placeholder="ex.: 20"></td>
                </tr>`))}
            </tbody>
          </table>

          <p class="ajuda acima-3">
            Leia cada linha como “a partir de X minutos antes do horário, Y% de desconto”.
            Deixe linhas em branco se usar menos faixas. Teto da plataforma: ${p.desconto_maximo_pct}%.
          </p>
          <button class="botao acima-3" type="submit">Salvar régua</button>
        </form>

        ${notaDeRegra('RN-02', 'A régua é recusada se o desconto aumentar conforme a antecedência aumenta — '
    + 'esperar mais não pode sair mais barato, senão ninguém reservaria cedo.')}

        ${regua && servicos.length ? simulacao(regua, servicos[0], p) : cru('')}
      </div>
    </div>
  `, { titulo: 'Serviços e régua' });
}

/** RF-027 - simulacao da regua sobre o primeiro servico, sem persistir nada. */
function simulacao(regua, servico, p) {
  let linhas;
  try {
    linhas = catalogo.simularRegua({
      precoBase: centavosParaCampo(servico.preco_base),
      precoMinimo: centavosParaCampo(servico.preco_minimo),
      faixas: regua.faixas,
    });
  } catch {
    // Regua salva invalida nao existe (RN-02 barra na gravacao), mas se a
    // simulacao falhar por qualquer motivo a tela nao pode cair junto.
    return cru('');
  }

  return html`
  <h3>Como fica o preço de “${servico.nome}”</h3>
  <div class="cartao">
    ${reguaDeDesconto(linhas)}
    ${notaDeRegra('RF-027', 'Simulação: nada aqui é gravado. É a mesma projeção que o cliente vê '
    + 'na página do horário.')}
  </div>`;
}

function salvarServico(ctx) {
  catalogo.salvarServico({
    prestadorId: ctx.usuario.id,
    nome: ctx.corpo.nome,
    categoriaId: ctx.corpo.categoriaId,
    duracaoMin: ctx.corpo.duracaoMin,
    precoBase: ctx.corpo.precoBase,
    precoMinimo: ctx.corpo.precoMinimo,
  });
  return ctx.redirecionar('/prestador/catalogo', { tipo: 'sucesso', texto: 'Serviço salvo.' });
}

function salvarRegua(ctx) {
  const antecedencias = [].concat(ctx.corpo.antecedencia_min ?? []);
  const percentuais = [].concat(ctx.corpo.percentual_desconto ?? []);

  const faixas = antecedencias
    .map((a, i) => ({ antecedencia_min: a, percentual_desconto: percentuais[i] }))
    .filter((f) => String(f.antecedencia_min).trim() !== '' || String(f.percentual_desconto).trim() !== '');

  catalogo.salvarRegua({
    prestadorId: ctx.usuario.id,
    reguaId: ctx.corpo.reguaId ? Number(ctx.corpo.reguaId) : null,
    nome: ctx.corpo.nome,
    faixas,
  });

  return ctx.redirecionar('/prestador/catalogo', {
    tipo: 'sucesso',
    texto: 'Régua salva e validada. Ela passa a valer para os horários publicados a partir de agora.',
    regra: 'RN-02',
  });
}

// ----------------------------------------------------------- agendamentos

function telaAgendamentos(ctx) {
  const lista = agendamentos.doPrestador(ctx.usuario.id);
  const abertos = lista.filter((a) => ['PENDENTE_CONFIRMACAO', 'CONFIRMADO'].includes(a.estado));
  const encerrados = lista.filter((a) => !['PENDENTE_CONFIRMACAO', 'CONFIRMADO'].includes(a.estado));

  const tabela = (linhas) => html`
    <div class="cartao tabela-rolagem">
      <table>
        <thead>
          <tr>
            <th scope="col">Quando</th><th scope="col">Serviço</th><th scope="col">Cliente</th>
            <th scope="col">Valor</th><th scope="col">Estado</th><th scope="col"><span class="so-leitor">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          ${juntar(linhas.map((a) => html`
            <tr>
              <td>${formatarDataHora(a.inicio)}</td>
              <td>${a.servico_nome}</td>
              <td>${a.cliente_nome} <span class="mini fraco">(reputação ${a.cliente_reputacao})</span></td>
              <td class="num">${formatarBRL(a.valor_travado)}</td>
              <td>${selo(a.estado)}</td>
              <td class="direita"><a class="pequeno" href="/agendamentos/${a.id}">abrir</a></td>
            </tr>`))}
        </tbody>
      </table>
    </div>`;

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Agendamentos</h1>
      <p>Tudo o que já virou compromisso, em aberto ou encerrado.</p>
    </div>

    ${lista.length === 0
    ? vazio(
      html`Assim que um cliente reservar um dos seus horários, o agendamento aparece aqui e você
      recebe um aviso para confirmar.`,
      { titulo: 'Nenhum agendamento ainda', acoes: [['/prestador/horarios', 'Publicar um horário']] },
    )
    : html`
      <h2 class="sem-topo">Em aberto (${abertos.length})</h2>
      ${abertos.length ? tabela(abertos) : vazio('Nada aguardando resposta ou atendimento.')}

      <h2>Histórico (${encerrados.length})</h2>
      ${encerrados.length ? tabela(encerrados) : vazio('Ainda sem agendamentos encerrados.')}`}
  `, { titulo: 'Agendamentos' });
}

// --------------------------------------------------------------- extrato

function telaExtrato(ctx) {
  const linhas = financeiroRepo.extratoPrestador(ctx.usuario.id);
  const totais = financeiroRepo.totaisPrestador(ctx.usuario.id);
  const efetivados = linhas.filter((l) => l.estado === 'EFETIVADO');
  const retidos = linhas.filter((l) => l.estado === 'RETIDO');

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Extrato</h1>
      <p>A comissão incide sobre o valor final travado na reserva, nunca sobre o preço-base —
        e só existe quando o atendimento é concluído.</p>
    </div>

    <div class="grade grade-4">
      ${metrica('Atendimentos', totais.qtd, 'concluídos no total')}
      ${metrica('Bruto', formatarBRL(totais.bruto), 'soma dos valores travados')}
      ${metrica('Comissão da plataforma', formatarBRL(totais.comissao))}
      ${metrica('Líquido para você', formatarBRL(totais.liquido))}
    </div>

    ${retidos.length ? html`
      <div class="aviso aviso-atencao acima-4">
        <div class="aviso-corpo">
          <strong>${plural(retidos.length, 'lançamento retido', 'lançamentos retidos')} por disputa</strong>
          ${formatarBRL(totais.retido_liquido)} ficam fora do extrato até a decisão do administrador.
          <span class="selo selo-regra">RN-17</span>
        </div>
      </div>` : cru('')}

    <h2>Lançamentos</h2>
    ${linhas.length === 0
    ? vazio(
      html`A comissão só existe em atendimento concluído. Reserva expirada, recusada ou cancelada
      não gera cobrança nenhuma para você.`,
      { titulo: 'Nenhum lançamento ainda' },
    )
    : html`
      <div class="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th scope="col">Data</th><th scope="col">Serviço</th><th scope="col">Cliente</th>
              <th scope="col" class="direita">Bruto</th>
              <th scope="col" class="direita">Comissão</th>
              <th scope="col" class="direita">Líquido</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${juntar(linhas.map((l) => html`
              <tr>
                <td class="mini">${formatarDataHora(l.criado_em)}</td>
                <td>${l.servico_nome}</td>
                <td>${l.cliente_nome}</td>
                <td class="direita num">${formatarBRL(l.valor_bruto)}</td>
                <td class="direita num">${formatarBRL(l.valor_comissao)}
                  <span class="mini fraco">${l.percentual_aplicado}%</span></td>
                <td class="direita forte num">${formatarBRL(l.valor_liquido)}</td>
                <td>${selo(l.estado)}</td>
              </tr>`))}
          </tbody>
        </table>
      </div>`}

    ${notaDeRegra('INV-06', `Em todo lançamento, comissão mais líquido fecha exatamente o bruto. `
    + `${plural(efetivados.length, 'lançamento efetivado', 'lançamentos efetivados')} até agora.`)}
  `, { titulo: 'Extrato' });
}

// ---------------------------------------------------------------- perfil

function telaPerfil(ctx) {
  const prestador = usuariosRepo.prestador(ctx.usuario.id);
  const regioes = catalogo.listarRegioes();

  return ctx.render(html`
    <div class="cabecalho-pagina">
      <h1>Perfil do prestador</h1>
      <p>Aqui ficam os dois parâmetros que são seus: a janela de confirmação e o que acontece
        quando ela vence.</p>
    </div>

    <form class="cartao" method="post" action="/prestador/perfil">
      ${campoCsrf(ctx.csrf)}
      <div class="campo">
        <label for="nomeExibicao">Nome do negócio</label>
        <input id="nomeExibicao" name="nomeExibicao" value="${prestador.nome_exibicao}" required>
        <div class="ajuda">É este nome que o cliente vê na busca.</div>
      </div>
      <div class="campo">
        <label for="descricao">Descrição</label>
        <textarea id="descricao" name="descricao"
          placeholder="Duas linhas sobre o lugar, o atendimento e o que você faz melhor.">${prestador.descricao}</textarea>
      </div>
      <div class="campo">
        <label for="regiaoId">Região de atendimento</label>
        <select id="regiaoId" name="regiaoId" required>
          <option value="">Escolha...</option>
          ${juntar(regioes.map((rg) => html`
            <option value="${rg.id}" ${prestador.regiao_id === rg.id ? 'selected' : ''}>${rg.bairro} — ${rg.cidade}</option>`))}
        </select>
      </div>

      <fieldset>
        <legend>Confirmação de reservas</legend>
        <div class="grade grade-2">
          <div class="campo">
            <label for="janelaConfirmacaoMin">Janela de confirmação (min)</label>
            <input id="janelaConfirmacaoMin" name="janelaConfirmacaoMin" type="number" min="5" max="60"
                   value="${prestador.janela_confirmacao_min}" required>
            <div class="ajuda">Entre 5 e 60 min. Nunca ultrapassa o início do próprio horário.</div>
          </div>
          <div class="campo">
            <label for="politicaExpiracao">Se eu não responder no prazo</label>
            <select id="politicaExpiracao" name="politicaExpiracao">
              <option value="LIBERAR" ${prestador.politica_expiracao === 'LIBERAR' ? 'selected' : ''}>
                Liberar o horário de volta para a busca
              </option>
              <option value="AUTOCONFIRMAR" ${prestador.politica_expiracao === 'AUTOCONFIRMAR' ? 'selected' : ''}>
                Confirmar automaticamente a reserva
              </option>
            </select>
            <div class="ajuda">
              <strong>Liberar</strong> é mais conservador: o horário volta para a vitrine e ninguém é
              penalizado. <strong>Autoconfirmar</strong> fecha o compromisso sozinho — bom se você
              costuma aceitar tudo, arriscado se sua agenda muda fora do sistema.
            </div>
          </div>
        </div>
      </fieldset>

      <button class="botao" type="submit">Salvar perfil</button>
    </form>

    ${notaDeRegra('RN-10', 'Esta é a decisão registrada como QA-01 na spec: o enunciado admitia as duas '
    + 'leituras, então a escolha virou parâmetro do prestador, com LIBERAR como padrão.')}
  `, { titulo: 'Perfil do prestador', estreita: true });
}

function salvarPerfil(ctx) {
  contas.salvarPerfilPrestador({
    prestadorId: ctx.usuario.id,
    nomeExibicao: ctx.corpo.nomeExibicao,
    descricao: ctx.corpo.descricao,
    regiaoId: ctx.corpo.regiaoId || null,
    janelaConfirmacaoMin: ctx.corpo.janelaConfirmacaoMin,
    politicaExpiracao: ctx.corpo.politicaExpiracao,
  });
  return ctx.redirecionar('/prestador/perfil', { tipo: 'sucesso', texto: 'Perfil atualizado.' });
}
