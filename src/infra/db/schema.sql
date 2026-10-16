-- =====================================================================
-- Encaixe - esquema fisico
-- Deriva de docs/spec.md secao 9 (modelo de dominio).
-- Convencoes:
--   * dinheiro em CENTAVOS (INTEGER) - nunca ponto flutuante  [ADR-002]
--   * instantes em TEXT ISO-8601 UTC ('2026-08-21T17:00:00.000Z')  [RNF-08]
--   * enums protegidos por CHECK - o banco tambem defende o dominio
-- =====================================================================

-- --------------------------------------------------------------- infra
CREATE TABLE IF NOT EXISTS parametro (
  chave           TEXT NOT NULL,
  escopo          TEXT NOT NULL DEFAULT 'GLOBAL' CHECK (escopo IN ('GLOBAL','PRESTADOR','SERVICO')),
  -- alvo_id = 0 para escopo GLOBAL: NULL em chave primaria nao colide no SQLite,
  -- o que quebraria o ON CONFLICT do upsert de parametros.
  alvo_id         INTEGER NOT NULL DEFAULT 0,
  valor           TEXT NOT NULL,
  vigente_desde   TEXT NOT NULL,
  atualizado_por  INTEGER,
  PRIMARY KEY (chave, escopo, alvo_id)
);

CREATE TABLE IF NOT EXISTS regiao (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  cidade  TEXT NOT NULL,
  bairro  TEXT NOT NULL,
  UNIQUE (cidade, bairro)
);

-- ------------------------------------------------------- contas/perfis
CREATE TABLE IF NOT EXISTS usuario (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,
  perfil        TEXT NOT NULL CHECK (perfil IN ('CLIENTE','PRESTADOR','ADMIN')),
  estado_conta  TEXT NOT NULL CHECK (estado_conta IN
                  ('PENDENTE_APROVACAO','ATIVO','RESTRITO','EM_REVISAO','SUSPENSO','REPROVADO')),
  reputacao     INTEGER NOT NULL DEFAULT 70 CHECK (reputacao BETWEEN 0 AND 100),
  criado_em     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS perfil_prestador (
  usuario_id             INTEGER PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
  nome_exibicao          TEXT NOT NULL,
  descricao              TEXT NOT NULL DEFAULT '',
  regiao_id              INTEGER REFERENCES regiao(id),
  plano                  TEXT NOT NULL DEFAULT 'BASICO' CHECK (plano IN ('BASICO','PREMIUM')),
  janela_confirmacao_min INTEGER NOT NULL DEFAULT 15 CHECK (janela_confirmacao_min BETWEEN 5 AND 60),
  politica_expiracao     TEXT NOT NULL DEFAULT 'LIBERAR' CHECK (politica_expiracao IN ('LIBERAR','AUTOCONFIRMAR')),
  aprovado_em            TEXT,
  aprovado_por           INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS perfil_cliente (
  usuario_id          INTEGER PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
  telefone            TEXT NOT NULL DEFAULT '',
  regiao_preferida_id INTEGER REFERENCES regiao(id)
);

CREATE TABLE IF NOT EXISTS sessao (
  id         TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  csrf       TEXT NOT NULL,
  criada_em  TEXT NOT NULL,
  expira_em  TEXT NOT NULL
);

-- ------------------------------------------------------ catalogo/oferta
CREATE TABLE IF NOT EXISTS categoria_servico (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  nome                 TEXT NOT NULL UNIQUE,
  percentual_comissao  INTEGER NOT NULL CHECK (percentual_comissao BETWEEN 8 AND 15),
  vigente_desde        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS servico (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  prestador_id  INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  categoria_id  INTEGER NOT NULL REFERENCES categoria_servico(id),
  nome          TEXT NOT NULL,
  duracao_min   INTEGER NOT NULL CHECK (duracao_min > 0 AND duracao_min % 5 = 0),
  preco_base    INTEGER NOT NULL CHECK (preco_base > 0),
  preco_minimo  INTEGER NOT NULL CHECK (preco_minimo >= 0),
  ativo         INTEGER NOT NULL DEFAULT 1,
  CHECK (preco_minimo <= preco_base)
);

CREATE TABLE IF NOT EXISTS regua_desconto (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  prestador_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  ativa        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS faixa_desconto (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  regua_id            INTEGER NOT NULL REFERENCES regua_desconto(id) ON DELETE CASCADE,
  antecedencia_min    INTEGER NOT NULL CHECK (antecedencia_min > 0),
  percentual_desconto INTEGER NOT NULL CHECK (percentual_desconto BETWEEN 0 AND 100),
  UNIQUE (regua_id, antecedencia_min)
);

CREATE TABLE IF NOT EXISTS horario_vago (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  prestador_id        INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  servico_id          INTEGER NOT NULL REFERENCES servico(id),
  regua_id            INTEGER NOT NULL REFERENCES regua_desconto(id),
  inicio              TEXT NOT NULL,
  duracao_min         INTEGER NOT NULL CHECK (duracao_min > 0),
  preco_base_snapshot INTEGER NOT NULL CHECK (preco_base_snapshot > 0),
  preco_minimo_snapshot INTEGER NOT NULL DEFAULT 0,
  estado              TEXT NOT NULL CHECK (estado IN
                        ('RASCUNHO','PUBLICADO','BLOQUEADO','OCUPADO','ENCERRADO','CANCELADO','EXPIRADO')),
  criado_em           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_horario_busca   ON horario_vago (estado, inicio);
CREATE INDEX IF NOT EXISTS ix_horario_agenda  ON horario_vago (prestador_id, inicio);

-- ----------------------------------------------------------- transacao
CREATE TABLE IF NOT EXISTS agendamento (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  horario_id                  INTEGER NOT NULL REFERENCES horario_vago(id),
  cliente_id                  INTEGER NOT NULL REFERENCES usuario(id),
  prestador_id                INTEGER NOT NULL REFERENCES usuario(id),
  estado                      TEXT NOT NULL CHECK (estado IN
                                ('PENDENTE_CONFIRMACAO','CONFIRMADO','RECUSADO','EXPIRADO',
                                 'CANCELADO_CLIENTE','CANCELADO_PRESTADOR','NO_SHOW_CLIENTE',
                                 'NO_SHOW_PRESTADOR','EM_DISPUTA','CONCLUIDO','ARQUIVADO')),
  valor_travado               INTEGER NOT NULL CHECK (valor_travado > 0),
  percentual_desconto_aplicado INTEGER NOT NULL DEFAULT 0,
  prazo_confirmacao_em        TEXT NOT NULL,
  criado_em                   TEXT NOT NULL,
  confirmado_em               TEXT,
  encerrado_em                TEXT,
  estado_cobranca             TEXT NOT NULL DEFAULT 'PENDENTE'
                                CHECK (estado_cobranca IN ('PENDENTE','PAGO_PRESENCIAL','NAO_PAGO')),
  motivo_encerramento         TEXT,
  observacao                  TEXT NOT NULL DEFAULT '',
  estado_antes_disputa        TEXT
);

-- INV-01: um horario nunca tem dois agendamentos em estado nao terminal.
CREATE UNIQUE INDEX IF NOT EXISTS ux_agendamento_ativo
  ON agendamento (horario_id)
  WHERE estado IN ('PENDENTE_CONFIRMACAO','CONFIRMADO','EM_DISPUTA');

CREATE INDEX IF NOT EXISTS ix_agendamento_cliente   ON agendamento (cliente_id, estado);
CREATE INDEX IF NOT EXISTS ix_agendamento_prestador ON agendamento (prestador_id, estado);

-- INV-05 / INV-06: comissao existe apenas para agendamento concluido, e bruto = comissao + liquido.
CREATE TABLE IF NOT EXISTS lancamento_comissao (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  agendamento_id     INTEGER NOT NULL UNIQUE REFERENCES agendamento(id) ON DELETE CASCADE,
  valor_bruto        INTEGER NOT NULL CHECK (valor_bruto > 0),
  percentual_aplicado INTEGER NOT NULL CHECK (percentual_aplicado BETWEEN 8 AND 15),
  valor_comissao     INTEGER NOT NULL CHECK (valor_comissao >= 0),
  valor_liquido      INTEGER NOT NULL CHECK (valor_liquido >= 0),
  estado             TEXT NOT NULL CHECK (estado IN ('EFETIVADO','RETIDO','ESTORNADO')),
  competencia        TEXT NOT NULL,
  criado_em          TEXT NOT NULL,
  CHECK (valor_comissao + valor_liquido = valor_bruto)
);

-- INV-09: no maximo uma avaliacao por (agendamento, autor).
CREATE TABLE IF NOT EXISTS avaliacao (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  agendamento_id INTEGER NOT NULL REFERENCES agendamento(id) ON DELETE CASCADE,
  autor_id       INTEGER NOT NULL REFERENCES usuario(id),
  alvo_id        INTEGER NOT NULL REFERENCES usuario(id),
  nota           INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario     TEXT NOT NULL DEFAULT '',
  criada_em      TEXT NOT NULL,
  visivel        INTEGER NOT NULL DEFAULT 0,
  UNIQUE (agendamento_id, autor_id)
);

CREATE TABLE IF NOT EXISTS evento_reputacao (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id   INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL,
  delta        INTEGER NOT NULL,
  origem_tipo  TEXT NOT NULL,
  origem_id    INTEGER,
  revertido_em TEXT,
  criado_em    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_reputacao_usuario ON evento_reputacao (usuario_id, criado_em);

CREATE TABLE IF NOT EXISTS disputa (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  agendamento_id      INTEGER NOT NULL UNIQUE REFERENCES agendamento(id) ON DELETE CASCADE,
  aberta_por_id       INTEGER NOT NULL REFERENCES usuario(id),
  motivo              TEXT NOT NULL CHECK (motivo IN
                        ('SERVICO_NAO_REALIZADO','SERVICO_DIFERENTE','AUSENCIA_CONTESTADA',
                         'COBRANCA_DIVERGENTE','OUTRO')),
  relato              TEXT NOT NULL DEFAULT '',
  estado              TEXT NOT NULL CHECK (estado IN ('ABERTA','EM_ANALISE','RESOLVIDA')),
  desfecho            TEXT CHECK (desfecho IN ('MANTIDO','REVERTIDO','PARCIAL','ARQUIVADO')),
  justificativa_admin TEXT,
  admin_id            INTEGER REFERENCES usuario(id),
  aberta_em           TEXT NOT NULL,
  prazo_sla_em        TEXT NOT NULL,
  resolvida_em        TEXT
);

-- INV-11: toda disputa tem ao menos uma evidencia (garantido pela transacao de abertura).
CREATE TABLE IF NOT EXISTS evidencia (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  disputa_id  INTEGER NOT NULL REFERENCES disputa(id) ON DELETE CASCADE,
  autor_id    INTEGER NOT NULL REFERENCES usuario(id),
  tipo        TEXT NOT NULL CHECK (tipo IN ('TEXTO','URL')),
  descricao   TEXT NOT NULL,
  arquivo_ref TEXT,
  criada_em   TEXT NOT NULL
);

-- --------------------------------------------------------------- apoio
CREATE TABLE IF NOT EXISTS interpretacao_busca (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id          INTEGER REFERENCES usuario(id),
  texto_original      TEXT NOT NULL,
  categoria_id        INTEGER REFERENCES categoria_servico(id),
  categoria_sugerida  TEXT,
  duracao_estimada_min INTEGER,
  urgencia            TEXT CHECK (urgencia IN ('ALTA','MEDIA','BAIXA')),
  janela_inicio       TEXT,
  janela_fim          TEXT,
  regiao_id           INTEGER REFERENCES regiao(id),
  confianca           REAL,
  modelo              TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('SUCESSO','BAIXA_CONFIANCA','FALHA')),
  desfecho            TEXT NOT NULL DEFAULT 'ACEITA' CHECK (desfecho IN ('ACEITA','CORRIGIDA','DESCARTADA')),
  criada_em           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notificacao (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id     INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL,
  agendamento_id INTEGER REFERENCES agendamento(id) ON DELETE CASCADE,
  titulo         TEXT NOT NULL,
  mensagem       TEXT NOT NULL,
  criada_em      TEXT NOT NULL,
  lida_em        TEXT
);
CREATE INDEX IF NOT EXISTS ix_notificacao_usuario ON notificacao (usuario_id, criada_em);

-- INV-13: toda transicao de estado deixa rastro aqui.
CREATE TABLE IF NOT EXISTS log_auditoria (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ator_id        INTEGER,
  acao           TEXT NOT NULL,
  entidade_tipo  TEXT NOT NULL,
  entidade_id    INTEGER,
  estado_anterior TEXT,
  estado_novo    TEXT,
  detalhe        TEXT,
  correlacao_id  TEXT,
  criado_em      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_auditoria_entidade ON log_auditoria (entidade_tipo, entidade_id);
