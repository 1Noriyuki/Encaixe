# Evidências preliminares — T-15, T-16 e T-17 (Trilha A)

**Responsável:** gostislavs. **Data:** 2026-10-16.  
**Status:** testes de regressão para comportamentos da baseline existentes; **as Specs posteriores continuam dependendo da aprovação e conferência na ordem do mapa SDD.**

## Tarefas cobertas

| Issue | Requisito | Novos testes no arquivo `tests/integracao/trilha-a-perfil-catalogo.test.js` |
|---|---|---|
| #17 — T-15 | RF-010, RN-10: perfil, janela de 5–60 min, política de expiração | T-PERFIL-01/02/03: gravação válida, limites inválidos, política não reconhecida |
| #18 — T-16 | RF-011, RN-08: elegibilidade com lista de pendências | T-PUBLICAR-01/02/03: incompleto, completo, bloqueado por estado de conta |
| #19 — T-17 | RF-012/RF-013: criar, editar e desativar serviços | T-SERVICO-01/02/03/04: centavos, múltiplos de cinco, piso, propriedade do registro |

## Limites

- As validações acima descrevem o **código já existente**, sem alteração de regras nem de endpoints.
- A SPEC-007 (catálogo) e a SPEC-009 (perfil/elegibilidade) ainda **não foram geradas/aprovadas** na ordem SDD; isso não é motivo para fechá-las.
- A implementação pode precisar de mudanças quando as respectivas Specs forem aprovadas e confrontadas com critérios de aceitação.
- Os testes não substituem revisão humana. **T-15/16/17 continuam abertas** até documentação completa, CI verde no PR e revisão do Enzo.
- Este trabalho parte do PR #110 porque o workflow Node 24 ainda está nessa branch; após merge de #110, o PR de testes poderá apontar para `main`.
