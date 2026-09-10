# ADR-002 — Modelo de dados: SQLite relacional, dinheiro em centavos, tempo em UTC

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data | 2026-08-21 |
| Decisores | Equipe |
| Relacionado | [ADR-001](ADR-001-stack-tecnica.md) · spec §9 (modelo de domínio), §9.8 (invariantes) |

## Contexto

O domínio do Encaixe é transacional e cheio de invariantes que **não podem** ser violadas nem por bug
de aplicação (spec §9.8): um horário nunca tem dois agendamentos ativos, comissão só existe para
agendamento concluído, `bruto = comissão + líquido`, reputação sempre em [0, 100].

Três decisões de representação apareceram cedo e afetam tudo:

1. **Como guardar dinheiro.** Ponto flutuante não representa 0,10 exatamente. Com comissão percentual
   sobre valor descontado (`RN-14`), erros de arredondamento apareceriam no extrato.
2. **Como guardar tempo.** Metade das regras depende de "quanto falta para o horário"
   (`RN-01`, `RN-10`, `RN-18`, `RN-20`). Fuso errado quebra todas de uma vez.
3. **Onde defender as invariantes.** Só na aplicação, ou também no banco?

## Decisão

### Banco relacional SQLite, esquema explícito em SQL

Um único arquivo `.sql` (`src/infra/db/schema.sql`) descreve as 18 tabelas, derivado diretamente da
§9.2 da spec. Sem ORM: as consultas são SQL escrito à mão em `src/infra/repositorios/`, o que mantém
o mapeamento entre spec e banco visível linha a linha.

### Dinheiro em centavos (INTEGER)

Todo valor monetário é inteiro de centavos. `R$ 80,50` é `8050`. A conversão de/para texto vive em
`src/dominio/dinheiro.js`. O arredondamento da comissão é "meio para cima" via `Math.round`, e o valor
líquido é sempre calculado por subtração (`bruto - comissão`), nunca por segunda multiplicação — é
o que garante `INV-06` por construção.

### Tempo em ISO-8601 UTC, apresentado em America/Sao_Paulo

Persistência sempre em `TEXT` no formato `2026-08-21T17:00:00.000Z`. Isso dá ordenação lexicográfica
correta de graça e elimina ambiguidade. A conversão para o fuso do usuário acontece só na borda de
apresentação (`src/dominio/tempo.js`), usando `Intl` — inclusive para converter a data/hora digitada
no formulário em UTC.

O relógio é **injetável** (`definirRelogio`). Sem isso, as regras temporais seriam intestáveis.

### As invariantes são defendidas nas duas pontas

O domínio valida, e o banco também:

| Invariante | Defesa no banco |
|---|---|
| INV-01 — um agendamento ativo por horário | `CREATE UNIQUE INDEX ... ON agendamento(horario_id) WHERE estado IN ('PENDENTE_CONFIRMACAO','CONFIRMADO','EM_DISPUTA')` |
| INV-05 — comissão só para concluído | `UNIQUE` em `lancamento_comissao.agendamento_id` + criação apenas na conclusão |
| INV-06 — bruto = comissão + líquido | `CHECK (valor_comissao + valor_liquido = valor_bruto)` |
| INV-07 — reputação em [0, 100] | `CHECK (reputacao BETWEEN 0 AND 100)` |
| INV-09 — uma avaliação por (agendamento, autor) | `UNIQUE (agendamento_id, autor_id)` |
| Estados válidos | `CHECK (estado IN (...))` em agendamento, horário, conta e disputa |
| Comissão na faixa 8–15% | `CHECK (percentual_comissao BETWEEN 8 AND 15)` |

O índice único parcial de `INV-01` é o que resolve a concorrência de `RF-041`: duas reservas
simultâneas do mesmo horário — uma passa, a outra recebe violação de constraint, que a aplicação
traduz em `ErroDeConcorrencia`.

### Snapshots contra efeito colateral de edição

`horario_vago` guarda `preco_base_snapshot` e `preco_minimo_snapshot`; `agendamento` guarda
`valor_travado`. Editar o serviço depois não altera horários já publicados, nem agendamentos já
feitos (`RN-04`, `RN-05`).

### Reputação como livro-razão

`usuario.reputacao` é **cache**. A verdade é a tabela `evento_reputacao`: cada delta com tipo, origem
rastreável e marca de reversão. A reputação é recalculada somando os eventos não revertidos dentro da
janela móvel. É isso que permite a disputa reverter uma penalidade sem inventar aritmética (`RN-27`),
e é isso que `INV-08` testa.

## Consequências

### Positivas

- **Erros de estado ficam impossíveis, não apenas improváveis.** Mesmo um bug de aplicação esbarra no
  `CHECK` ou no índice único.
- **Aritmética financeira fecha sempre.** Testado exaustivamente em `T-COMISSAO-02`, que varre
  combinações de valores e percentuais verificando `INV-06`.
- **Regras temporais testáveis.** Com relógio injetável, "faltam 90 minutos" vira um dado do teste.
- **Auditoria completa.** `log_auditoria` grava toda transição com estado anterior, novo, ator e
  correlação de requisição.

### Negativas

- **SQL à mão é mais verboso** que um ORM e não tem checagem de tipo em tempo de compilação.
- **Duplicação de regra deliberada:** faixa de comissão está no domínio *e* no `CHECK`. Se mudar, muda
  nos dois lugares — o custo é assumido em troca da garantia.
- **Centavos exigem disciplina:** todo ponto de entrada precisa converter, e toda exibição precisa
  formatar. Concentrado em `dinheiro.js` para limitar o espalhamento.
- **Sem migrations versionadas:** o esquema evolui por recriação (`npm run db:reset`).

### Limites conhecidos

- `Intl` com fuso fixo `America/Sao_Paulo`: o sistema é monorregional por decisão de escopo.
- A janela móvel de reputação (`P-20`) faz a pontuação "melhorar sozinha" com o tempo. É intencional
  (permite recuperação), mas significa que a reputação não é um histórico permanente.
