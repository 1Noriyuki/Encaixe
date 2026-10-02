/**
 * Erros de dominio.
 *
 * Toda violacao de regra de negocio da secao 6 da spec sobe como ErroDeRegra,
 * carregando o identificador da regra violada (ex.: 'RN-12'). Isso e o que
 * permite a camada HTTP explicar ao usuario *qual* regra o barrou, e permite
 * aos testes afirmarem sobre a regra e nao sobre a mensagem.
 */

export class ErroDeRegra extends Error {
  /**
   * @param {string} regra   identificador da regra violada, ex.: 'RN-18'
   * @param {string} mensagem texto para o usuario final
   * @param {object} [detalhes] dados auxiliares (limites, prazos, faixas)
   */
  constructor(regra, mensagem, detalhes = {}) {
    super(mensagem);
    this.name = 'ErroDeRegra';
    this.regra = regra;
    this.detalhes = detalhes;
    this.status = 422;
  }
}

export class ErroDeValidacao extends Error {
  constructor(mensagem, campo = null) {
    super(mensagem);
    this.name = 'ErroDeValidacao';
    this.campo = campo;
    this.status = 400;
  }
}

export class ErroDeAutorizacao extends Error {
  constructor(mensagem = 'Você não tem permissão para esta operação.') {
    super(mensagem);
    this.name = 'ErroDeAutorizacao';
    this.status = 403;
  }
}

export class ErroDeAutenticacao extends Error {
  constructor(mensagem = 'É necessário entrar para continuar.') {
    super(mensagem);
    this.name = 'ErroDeAutenticacao';
    this.status = 401;
  }
}

export class NaoEncontrado extends Error {
  constructor(mensagem = 'Recurso não encontrado.') {
    super(mensagem);
    this.name = 'NaoEncontrado';
    this.status = 404;
  }
}

export class ErroDeConcorrencia extends ErroDeRegra {
  constructor(mensagem = 'Este horário acabou de ser reservado por outra pessoa.') {
    super('RN-09', mensagem);
    this.name = 'ErroDeConcorrencia';
    this.status = 409;
  }
}
