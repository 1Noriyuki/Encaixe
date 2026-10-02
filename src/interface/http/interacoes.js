/**
 * Script de interface, servido em /estatico/interacoes.js.
 *
 * Regra desta camada: e so acabamento visual. Nenhuma funcionalidade do
 * sistema pode depender dele - com o JS bloqueado, o site continua inteiro
 * (o script do <head> marca `.sem-js` e desliga os estados iniciais).
 * Fica em JS-dentro-de-JS pelo mesmo motivo do CSS: nao ha etapa de build
 * no projeto (ADR-001).
 */

export const JS = `
(function () {
  'use strict';

  // Avisa o layout de que o script rodou (desarma a rede de seguranca do <head>).
  document.documentElement.dataset.animado = '1';

  var pouparMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------- revelar ao rolar
  var alvos = document.querySelectorAll('[data-revelar]');

  if (pouparMovimento || !('IntersectionObserver' in window)) {
    alvos.forEach(function (el) { el.classList.add('visivel'); });
  } else {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('visivel');
        observador.unobserve(entrada.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    alvos.forEach(function (el, i) {
      // Escalona apenas irmaos proximos: cascata longa demais parece lenta.
      if (!el.style.getPropertyValue('--atraso')) {
        el.style.setProperty('--atraso', (i % 4) * 80 + 'ms');
      }
      observador.observe(el);
    });
  }

  // ------------------------------------- cabecalho e barra de progresso
  var topo = document.querySelector('.topo');
  var progresso = document.querySelector('.progresso');
  var agendado = false;

  function aoRolar() {
    agendado = false;
    var y = window.scrollY || document.documentElement.scrollTop;

    if (topo) topo.classList.toggle('rolado', y > 8);

    if (progresso) {
      var total = document.documentElement.scrollHeight - window.innerHeight;
      var pct = total > 0 ? Math.min(100, (y / total) * 100) : 0;
      progresso.style.setProperty('--avanco', pct.toFixed(2) + '%');
    }
  }

  window.addEventListener('scroll', function () {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(aoRolar);
  }, { passive: true });
  aoRolar();

  // ---------------------------------- aba atual visivel no celular
  // No celular a navegacao e uma trilha rolavel; se a aba atual nasce fora
  // da area visivel, o usuario nao descobre onde esta.
  var abaAtual = document.querySelector('.nav a[aria-current="page"]');
  if (abaAtual && abaAtual.parentElement.scrollWidth > abaAtual.parentElement.clientWidth) {
    abaAtual.parentElement.scrollLeft = Math.max(
      0, abaAtual.offsetLeft - abaAtual.parentElement.clientWidth / 2 + abaAtual.offsetWidth / 2
    );
  }

  // ---------------------------------------------- numeros que sobem
  // O valor final ja esta no HTML (data-ate); a animacao so o alcanca.
  var numeros = document.querySelectorAll('[data-ate]');

  function animarNumero(el) {
    var ate = parseFloat(el.getAttribute('data-ate'));
    var sufixo = el.getAttribute('data-sufixo') || '';
    var prefixo = el.getAttribute('data-prefixo') || '';
    if (!isFinite(ate)) return;

    var inicio = null;
    var duracao = 900;

    function passo(agora) {
      if (inicio === null) inicio = agora;
      var t = Math.min(1, (agora - inicio) / duracao);
      var suave = 1 - Math.pow(1 - t, 3);
      el.textContent = prefixo + Math.round(ate * suave) + sufixo;
      if (t < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  if (!pouparMovimento && 'IntersectionObserver' in window) {
    var contador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        animarNumero(entrada.target);
        contador.unobserve(entrada.target);
      });
    }, { threshold: 0.6 });
    numeros.forEach(function (el) { contador.observe(el); });
  }

  // ------------------------------- clique duplo nao vira acao dupla
  // Reservar, confirmar e cancelar mudam estado. O servidor ja barra a
  // segunda tentativa (a transicao deixa de ser valida), mas travar o botao
  // evita o susto de ver a mesma acao sair duas vezes. O bloqueio acontece
  // DEPOIS do envio, para nunca cancelar o submit de quem esta sem JS.
  document.querySelectorAll('form[method="post"]').forEach(function (form) {
    form.addEventListener('submit', function () {
      var botao = form.querySelector('button[type="submit"], button:not([type])');
      if (!botao || botao.disabled) return;
      setTimeout(function () {
        botao.disabled = true;
        botao.dataset.rotuloOriginal = botao.textContent;
        botao.textContent = 'Enviando...';
      }, 0);
    });
  });

  // Voltar pelo historico reaproveita a pagina do cache: o botao precisa
  // acordar destravado, senao o formulario fica morto.
  window.addEventListener('pageshow', function (evento) {
    if (!evento.persisted) return;
    document.querySelectorAll('button[data-rotulo-original]').forEach(function (botao) {
      botao.disabled = false;
      botao.textContent = botao.dataset.rotuloOriginal;
      delete botao.dataset.rotuloOriginal;
    });
  });

  // -------------------------------- imagem do hero ausente nao quebra
  // Sem o arquivo em public/, o gradiente da moldura fica no lugar dela.
  var arte = document.querySelector('.heroi-moldura img');
  if (arte) {
    arte.addEventListener('error', function () { arte.remove(); });
  }
})();
`;
