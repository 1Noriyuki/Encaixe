/**
 * Roteador minimo sobre node:http.
 *
 * Suporta padroes com parametro: '/agendamentos/:id/cancelar'.
 * Existe para manter o projeto sem dependencias (ADR-001) sem que as rotas
 * virem uma cadeia de `if (url.startsWith(...))`.
 */

export function criarRoteador() {
  const rotas = [];

  /**
   * Compila o padrao segmento a segmento. Foi assim que ficou apos um bug:
   * escapar a string inteira de uma vez destruia o ':param', e toda rota com
   * parametro respondia 404.
   */
  function compilar(padrao) {
    const chaves = [];
    const segmentos = padrao.replace(/\/+$/, '').split('/').map((segmento) => {
      if (segmento.startsWith(':')) {
        chaves.push(segmento.slice(1));
        return '([^/]+)';
      }
      return segmento.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });

    return { regex: new RegExp(`^${segmentos.join('/')}/?$`), chaves };
  }

  function registrar(metodo, padrao, manipulador, opcoes = {}) {
    const { regex, chaves } = compilar(padrao);
    rotas.push({ metodo, padrao, regex, chaves, manipulador, opcoes });
  }

  return {
    get: (padrao, manipulador, opcoes) => registrar('GET', padrao, manipulador, opcoes),
    post: (padrao, manipulador, opcoes) => registrar('POST', padrao, manipulador, opcoes),

    resolver(metodo, caminho) {
      const limpo = caminho.replace(/\/+$/, '') || '/';

      for (const rota of rotas) {
        if (rota.metodo !== metodo) continue;
        const casou = rota.regex.exec(limpo);
        if (!casou) continue;

        const params = {};
        rota.chaves.forEach((chave, i) => { params[chave] = decodeURIComponent(casou[i + 1]); });
        return { ...rota, params };
      }
      return null;
    },

    /** Para diagnostico: existe a rota em outro metodo? */
    existeEmOutroMetodo(metodo, caminho) {
      const limpo = caminho.replace(/\/+$/, '') || '/';
      return rotas.some((r) => r.metodo !== metodo && r.regex.test(limpo));
    },

    listar: () => rotas.map((r) => `${r.metodo} ${r.padrao}`),
  };
}
