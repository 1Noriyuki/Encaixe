/**
 * Renderizacao de HTML por template literal.
 *
 * `html` escapa TUDO que e interpolado, por padrao. Para inserir markup ja
 * montado (um componente, uma lista de <tr>), passe por `cru()` - o que torna
 * a injecao de HTML uma decisao explicita e visivel na revisao de codigo.
 */

const MARCA = Symbol('html-seguro');

/** Marca uma string como HTML ja seguro. */
export function cru(texto) {
  return { [MARCA]: true, texto: String(texto ?? '') };
}

export function escapar(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function resolver(valor) {
  if (valor == null || valor === false) return '';
  if (valor && valor[MARCA]) return valor.texto;
  if (Array.isArray(valor)) return valor.map(resolver).join('');
  return escapar(valor);
}

/** Tag template: html`<p>${textoDoUsuario}</p>` */
export function html(partes, ...valores) {
  let saida = partes[0];
  for (let i = 0; i < valores.length; i += 1) {
    saida += resolver(valores[i]) + partes[i + 1];
  }
  return cru(saida);
}

/** Renderiza para string final (usado pelo servidor ao escrever a resposta). */
export function paraTexto(valor) {
  return resolver(valor);
}

/** Junta pedacos de HTML ja seguros. */
export function juntar(lista, separador = '') {
  return cru(lista.map(resolver).join(separador));
}
