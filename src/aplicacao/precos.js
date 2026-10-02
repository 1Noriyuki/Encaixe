/**
 * Precificacao aplicada a um horario concreto (RN-01, RN-03, RF-026).
 *
 * Ponte fina entre o repositorio (que traz a oferta) e o dominio (que sabe
 * precificar). Existe para que busca, agenda do prestador e reserva usem
 * exatamente o mesmo calculo - se cada tela calculasse do seu jeito, o preco
 * mostrado e o preco travado poderiam divergir.
 */

import { calcularPreco, proximoDegrau } from '../dominio/precificacao.js';
import { minutosEntre, adicionarMinutos } from '../dominio/tempo.js';
import * as horariosRepo from '../infra/repositorios/horarios.js';

/**
 * @param {object} horario linha de horario_vago (com snapshots de preco)
 * @param {Array} faixas faixas da regua vinculada
 * @param {object} p parametros globais
 * @param {string} agoraIso instante de referencia
 */
export function precificar(horario, faixas, p, agoraIso) {
  const antecedencia = minutosEntre(agoraIso, horario.inicio);

  const preco = calcularPreco({
    precoBase: horario.preco_base_snapshot,
    precoMinimo: horario.preco_minimo_snapshot ?? 0,
    faixas,
    antecedenciaMin: antecedencia,
    tetoPct: p.desconto_maximo_pct,
  });

  const degrau = proximoDegrau(faixas, antecedencia);

  return {
    ...preco,
    antecedenciaMin: antecedencia,
    reservavel: antecedencia >= p.antecedencia_min_reserva_min && horario.estado === 'PUBLICADO',
    proximoDegrau: degrau && {
      ...degrau,
      // instante em que o proximo degrau entra em vigor
      em: adicionarMinutos(agoraIso, degrau.emMinutos),
    },
  };
}

/** Precifica uma lista de horarios sem cair em N+1 de consulta de faixas. */
export function precificarLista(horarios, p, agoraIso) {
  const reguaIds = [...new Set(horarios.map((h) => h.regua_id))];
  const faixasPorRegua = horariosRepo.faixasPorRegua(reguaIds);

  return horarios.map((h) => ({
    ...h,
    preco: precificar(h, faixasPorRegua.get(h.regua_id) ?? [], p, agoraIso),
  }));
}

/** Precifica um horario unico, buscando as faixas dele. */
export function precificarUm(horario, p, agoraIso) {
  const faixas = horariosRepo.faixasDoHorario(horario.id);
  return { ...horario, preco: precificar(horario, faixas, p, agoraIso) };
}
