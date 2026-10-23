/** SPEC-007/009: consistência entre gravação e auditoria. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, encerrar, cenarioBasico } from '../apoio/cenario.js';
import { executar } from '../../src/infra/db/conexao.js';
import * as catalogo from '../../src/aplicacao/catalogo.js';
import * as contas from '../../src/aplicacao/contas.js';
import * as usuarios from '../../src/infra/repositorios/usuarios.js';
import * as auditoria from '../../src/infra/auditoria.js';
import { NaoEncontrado } from '../../src/dominio/erros.js';

test.beforeEach(prepararBanco);
test.after(encerrar);

test('T-SPEC007-ATOMIC01 | RF-013: auditoria falha impede desativacao persistida do servico', () => {
  const c = cenarioBasico();
  const antes = auditoria.historicoDe('servico', c.servico.id).length;
  executar(`CREATE TRIGGER impedir_auditoria_de_servico
    BEFORE INSERT ON log_auditoria WHEN NEW.acao = 'SERVICO_DESATIVADO'
    BEGIN SELECT RAISE(ABORT, 'auditoria do serviço indisponível'); END`);
  assert.throws(() => catalogo.desativarServico({
    prestadorId: c.prestador.id, servicoId: c.servico.id,
  }), /auditoria do serviço indisponível/);
  assert.equal(catalogo.servicoPorId(c.servico.id).ativo, 1);
  assert.equal(auditoria.historicoDe('servico', c.servico.id).length, antes);
});

test('T-SPEC009-ATOMIC01 | RF-010: auditoria falha reverte atualizacao do perfil', () => {
  const c = cenarioBasico();
  const anterior = usuarios.prestador(c.prestador.id);
  const antes = auditoria.historicoDe('conta', c.prestador.id).length;
  executar(`CREATE TRIGGER impedir_auditoria_de_perfil
    BEFORE INSERT ON log_auditoria WHEN NEW.acao = 'PERFIL_PRESTADOR_ATUALIZADO'
    BEGIN SELECT RAISE(ABORT, 'auditoria do perfil indisponível'); END`);
  assert.throws(() => contas.salvarPerfilPrestador({
    prestadorId: c.prestador.id, nomeExibicao: 'Nome alterado',
    descricao: 'Alteração de teste', regiaoId: c.regiao.id,
    janelaConfirmacaoMin: 40, politicaExpiracao: 'AUTOCONFIRMAR',
  }), /auditoria do perfil indisponível/);
  const atual = usuarios.prestador(c.prestador.id);
  assert.equal(atual.nome_exibicao, anterior.nome_exibicao);
  assert.equal(atual.janela_confirmacao_min, anterior.janela_confirmacao_min);
  assert.equal(atual.politica_expiracao, anterior.politica_expiracao);
  assert.equal(auditoria.historicoDe('conta', c.prestador.id).length, antes);
});

test('T-SPEC009-ATOMIC02 | RF-010: nao registra sucesso para perfil inexistente', () => {
  const c = cenarioBasico();
  assert.throws(() => contas.salvarPerfilPrestador({
    prestadorId: c.cliente.id, nomeExibicao: 'Perfil inexistente',
    descricao: '', regiaoId: c.regiao.id,
    janelaConfirmacaoMin: 30, politicaExpiracao: 'LIBERAR',
  }), e => e instanceof NaoEncontrado);
  assert.equal(auditoria.historicoDe('conta', c.cliente.id)
    .filter(e => e.acao === 'PERFIL_PRESTADOR_ATUALIZADO').length, 0);
});
