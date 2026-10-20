# T-68 — Complemento de cobertura das regras de negócio (Trilha A)

> Data: 2026-10-16. Issue #70, responsável gostislavs.  
> Os testes nomeados contribuem para RNF-06; **não equivalem, isoladamente, a cobertura integral da especificação**.

## Regras que constavam como sem teste nomeado no documento de passagem

| Regra | Evidência preparada | Limite |
|---|---|---|
| RN-00 | `spec-001-parametros.test.js`: validação, histórico, migração, não retroatividade | Escopo prestador ainda depende de OPEN-103 |
| RN-05 | `trilha-a-cobertura-rnf06.test.js`, T-HORARIO-04: snapshots preservados após edição do serviço com horário reservado | **Parcial:** não testa uma tentativa direta de alterar data/régua do horário reservado; a API de edição de horário não está exposta |
| RN-08 | `trilha-a-perfil-catalogo.test.js`, T-PUBLICAR-01/02/03 | A conferência formal da SPEC-009 continua pendente |
| RN-11 | `trilha-a-cobertura-rnf06.test.js`, T-RECUSA-01: motivo, estado, liberação e reputação | Não substitui a SPEC-015 da Trilha B |
| RN-28 | Cobertura anteriormente acrescentada na SPEC-002 pelo Enzo | Não reivindicar implementação alheia |
| RN-33 | `trilha-a-cobertura-rnf06.test.js`, T-COMISSAO-06: cobrança não paga e lançamento contábil | A SPEC-020 ainda requer aprovação/compatibilização |

## Próximas ações para encerrar T-68

1. Revisar sistematicamente as 34 regras RN-00 a RN-33 contra a suíte atual; verificar **critérios**, não só ocorrência do identificador em nomes de testes.
2. Resolver lacuna de RN-05 (edição direta de horário reservado, RF-017) por teste comportamental real quando houver operação correspondente, sem inventar endpoint.
3. Analisar impacto das OPEN pendentes e incluir testes após decisões da equipe.
4. Obter CI Node 24 verde neste PR e revisão de outro integrante; não fechar #70 até todas as regras estarem comprovadas.

**Branch:** `test/gostislavs-rnf06-regras-20261016`, PR encadeado aos PRs #110, #111 e #112 para respeitar dependências sem tocar `main`.
