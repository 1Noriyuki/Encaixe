/**
 * Rotinas temporais - o "relogio" do sistema.
 * Cobre RF-045, RF-046, RF-060 e a manutencao de estados de horario. [QA-08]
 *
 * Decisao de projeto: as rotinas rodam num intervalo curto no processo do
 * servidor E tambem sao disparadas antes de qualquer leitura sensivel a tempo
 * (busca, painel). Assim o sistema fica correto mesmo se o intervalo falhar,
 * e os testes podem chamar `executar()` diretamente com o relogio controlado.
 */

import * as agendamentosRepo from '../infra/repositorios/agendamentos.js';
import * as horariosRepo from '../infra/repositorios/horarios.js';
import * as social from '../infra/repositorios/social.js';
import * as auditoria from '../infra/auditoria.js';
import { assegurarTransicao } from '../dominio/estados.js';
import { prazoAutoConclusao, prazoAvaliacao } from '../dominio/prazos.js';
import { agoraIso, antesDe } from '../dominio/tempo.js';
import { params } from './parametros.js';
import * as agendamentos from './agendamentos.js';
import * as avaliacoes from './avaliacoes.js';

/** Executa todas as rotinas e devolve o que foi feito (util para log e testes). */
export function executar() {
  const p = params();
  const agora = agoraIso();

  const resumo = {
    reservasExpiradas: 0,
    reservasAutoconfirmadas: 0,
    concluidosAutomaticamente: 0,
    horariosExpirados: 0,
    horariosEncerrados: 0,
    avaliacoesReveladas: 0,
  };

  // RF-045 / RF-046 - janela de confirmacao vencida.
  for (const ag of agendamentosRepo.pendentesVencidas(agora)) {
    const r = seguro(() => agendamentos.resolverExpiracao(ag), 'expiracao', ag.id);
    if (r?.desfecho === 'EXPIRADO') resumo.reservasExpiradas += 1;
    if (r?.desfecho === 'CONFIRMADO') resumo.reservasAutoconfirmadas += 1;
  }

  // RF-060 - conclusao automatica sem contestacao.
  for (const ag of agendamentosRepo.confirmadosComAtendimentoEncerrado(agora)) {
    if (antesDe(agora, prazoAutoConclusao(ag.inicio, ag.duracao_min, p))) continue;
    const r = seguro(() => agendamentos.concluirAutomaticamente(ag), 'autoconclusao', ag.id);
    if (r) resumo.concluidosAutomaticamente += 1;
  }

  // Horario publicado cujo inicio passou sem ninguem reservar.
  for (const horario of horariosRepo.publicadosVencidos(agora)) {
    seguro(() => {
      assegurarTransicao('horario', horario.estado, 'EXPIRADO');
      horariosRepo.atualizarEstado(horario.id, 'EXPIRADO');
      auditoria.registrar({
        atorId: null, acao: 'HORARIO_EXPIRADO', entidade: 'horario', entidadeId: horario.id,
        de: horario.estado, para: 'EXPIRADO',
      });
      resumo.horariosExpirados += 1;
    }, 'expiracao-horario', horario.id);
  }

  // Horario ocupado cujo agendamento ja chegou a estado terminal.
  for (const horario of horariosRepo.ocupadosEncerraveis()) {
    seguro(() => {
      horariosRepo.atualizarEstado(horario.id, 'ENCERRADO');
      auditoria.registrar({
        atorId: null, acao: 'HORARIO_ENCERRADO', entidade: 'horario', entidadeId: horario.id,
        de: 'OCUPADO', para: 'ENCERRADO',
      });
      resumo.horariosEncerrados += 1;
    }, 'encerramento-horario', horario.id);
  }

  // RN-25 - janela de avaliacao encerrada: revela o que estava oculto.
  for (const ag of agendamentosRepo.comAvaliacaoOculta()) {
    if (!ag.encerrado_em) continue;
    if (antesDe(agora, prazoAvaliacao(ag.encerrado_em, p))) continue;
    seguro(() => {
      avaliacoes.revelar(ag.id);
      resumo.avaliacoesReveladas += 1;
    }, 'revelacao-avaliacao', ag.id);
  }

  return resumo;
}

/**
 * Uma rotina que quebra em um registro nao pode impedir o processamento dos
 * demais - o erro e registrado e a varredura continua.
 */
function seguro(fn, rotina, entidadeId) {
  try {
    return fn();
  } catch (erro) {
    auditoria.registrar({
      atorId: null,
      acao: 'ROTINA_FALHOU',
      entidade: 'rotina',
      entidadeId,
      detalhe: { rotina, erro: erro?.message ?? String(erro) },
    });
    return null;
  }
}

/** Agendador em processo. Devolve uma funcao para parar. */
export function iniciarAgendador({ intervaloMs = 60_000, aoExecutar = null } = {}) {
  const tick = () => {
    const resumo = executar();
    if (aoExecutar) aoExecutar(resumo);
  };

  tick();
  const timer = setInterval(tick, intervaloMs);
  timer.unref?.();

  return () => clearInterval(timer);
}
