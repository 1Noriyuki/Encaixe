# Evidências preliminares — T-47, T-56 e T-57 (Trilha A)

**Data:** 2026-10-16. **Responsável:** gostislavs.  
**Estado:** testes de regressão sobre as funcionalidades existentes. Não altera comportamentos financeiros nem aprova as futuras SPEC-024/026.

## Matriz de aceite e cobertura

| Issue | Escopo | Testes propostos |
|---|---|---|
| #49 — T-47 | RF-061/RF-062, extrato com lançamentos RETIDO separados de EFETIVADO | T-EXTRATO-01/02/03 |
| #58 — T-56 | RF-063/RF-064, recortes por categoria/prestador e totais corretos | T-METRICAS-01/02 |
| #59 — T-57 | RF-080/RF-081, limites de percentual, trilha e vigência futura | T-CATEGORIA-01/02/03/04 |

## Pontos de atenção da modelagem

- Os testes T-CATEGORIA-03/04 distinguem atualização da comissão de **lançamento antigo** e nova conclusão. Eles verificam o comportamento atual, mas a especificação da vigência do percentual por categoria deve ser aprovada formalmente na SPEC-026.
- A tabela `categoria_servico` possui `percentual_comissao` e `vigente_desde`, mas ainda não um histórico completo de alterações por categoria. **Não afirmar que a vigência histórica de P-13 está plenamente implementada** sem decisão da OPEN-103 e análise da SPEC-026.
- A separação de RETIDO é verificada no extrato e nos totais. A transição financeira completa de disputa continua sob as Specs correspondentes dos demais responsáveis.
- Não encerrar #49, #58 ou #59 antes da conferência formal das Specs, CI verde e revisão de outro integrante.
- Este PR é encadeado ao PR de T-15/16/17 e ao PR #110. Depois dos merges, atualizar a base para `main`.

**Resultado a preencher:** conferir `npm test` do GitHub Actions Node 24 neste PR. Não presumir aprovação antes de ver o relatório.
