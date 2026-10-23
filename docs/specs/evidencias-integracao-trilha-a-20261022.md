# Trilha A — consolidação técnica dos PRs #136–#142

**Data:** 2026-10-22 (São Paulo) · **Responsável:** gostislavs · **Ramo de integração:** `gostislavs-trilha-a-integrada-20261022`
**Referência:** PR #142, https://github.com/1Noriyuki/Encaixe/pull/142

## Resultado técnico efetivamente verificado

A branch de integração reuniu as correções dos PRs #136 a #141. O GitHub Actions executou a **suíte completa no Node.js 24: 261 testes, 261 aprovados, 0 falhas, 0 ignorados**, execução #39884130601 (https://github.com/1Noriyuki/Encaixe/actions/runs/39884130601). Isso prova compatibilidade das alterações em conjunto **na branch verificada**, não instalação/implantação em produção nem aprovação formal das Specs.

| Origem | Specs/área | Mudança integrada | Evidência |
|---|---|---|---|
| PR #136 | SPEC-006 | Recalcular/reverter reputação atomicamente; fronteira P-20 precisa e critérios CA-01–10 documentados | Testes `T-SPEC006-*`, matriz `evidencias-SPEC-006-trilha-a-20261022.md` |
| PR #137 | SPEC-007/009 | Desativar serviço e atualizar perfil sem gravação parcial nem auditoria fictícia | `spec-007-009-atomicidade.test.js` |
| PR #138 | SPEC-008 | Validar campos numéricos de faixas sem `parseInt` truncar textos/decimais | `spec-008-validacao-regua.test.js` |
| PR #139 | SPEC-026 | Histórico versionado de comissão por categoria, migração legada conservadora, transação e recorte por categoria/prestador | `spec-026-comissao-historico.test.js` |
| PR #140 | SPEC-011 | Aplicação de descontos por instante exato, não por minuto arredondado | `spec-011-fronteira-preco.test.js` |
| PR #141 | SPEC-021 | Revelação de avaliações atômica e idempotente, sem notificações duplicadas | `spec-021-revelacao-atomica.test.js` |

### Conflitos resolvidos nesta integração

- `src/aplicacao/catalogo.js`: preserva tanto a transação de desativação de serviço (#137) quanto a validação rigorosa de faixas de desconto (#138).
- `docs/specs/registro-sdd.md`: contém as etapas 29 e 30, sem substituir uma pela outra.

## Estado das issues atribuídas à Trilha A

| Grupo | Issues | Situação factual nesta etapa |
|---|---|---|
| Fundação | #80 (SPEC-001), #9 (T-07) | Fechadas pela etapa 28/PR #134 |
| Reputação | #85 (SPEC-006) | Código e matriz de evidências ampliados; texto ainda rascunho e decisões de mérito abertas |
| Catálogo | #86 (SPEC-007), #19 (T-17) | CRUD já existente, atomicidade corrigida; conferência final da Spec/DoD pendente |
| Descontos | #87 (SPEC-008) | Normalização corrigida; Spec ainda rascunho |
| Perfil e elegibilidade | #88 (SPEC-009), #17 (T-15), #18 (T-16) | Perfil e barreira já implementados; atomicidade corrigida, DoD pendente |
| Preço | #90 (SPEC-011) | Degraus corrigidos, testes adicionais; Spec ainda rascunho |
| Conclusão e comissão | #99 (SPEC-020) | Mecanismo existente, inclusive prazo P-17 congelado; histórico legado com P-17 desconhecido permanece limitador |
| Avaliações | #100 (SPEC-021) | Revelação protegida por transação e idempotência; Spec ainda rascunho |
| Extrato | #103 (SPEC-024), #49 (T-47) | Recorte de retenções corrigido no PR #128 incorporado; DoD pendente |
| Métricas e categoria | #105 (SPEC-026), #58 (T-56), #59 (T-57) | Versão histórica/autor e recortes corrigidos no PR #139 integrado; DoD pendente |
| Testes de domínio | #70 (T-68) | Suíte automatizada integrada passou; não houve demonstração de cobertura de 100% das RN da seção 6 |

**Não alterar status de issues ainda abertas apenas porque houve CI verde.** A Definition of Done exige também decisão/aprovação das Specs e rastreabilidade completa.

## Limitações e decisões de produto que código/testes não resolvem sozinhos

- **SPEC-006:** contrato físico definitivo P-22, política de fila/notificação administrativa, reincidência e OPEN-03.
- **SPEC-007/009:** cadastro de categorias atendidas separadamente ou derivadas do catálogo; governança de regiões/categorias.
- **SPEC-008:** régua associada a serviço ou ao prestador, efeito da redução do teto global em ofertas existentes.
- **SPEC-011:** política comercial para alteração P-05 em horários publicados ainda não reservados.
- **SPEC-020:** agendamentos históricos anteriores ao #124 não guardam prazo P-17. Não há dados para inventar o valor vigente no passado.
- **SPEC-021:** semântica dos comentários e limites de visibilidade definidos pela baseline.
- **SPEC-024/026:** competência financeira, apresentação do percentual atual versus aplicado historicamente, taxa de cancelamento/no-show e denominadores.

## Critério de entrega e incorporação

- PR #142 é o conjunto consolidado para verificação. PRs #136–#141 são os componentes originais e devem ser reconciliados como **substituídos por integração**, caso #142 seja incorporado, evitando duplicar alterações.
- A branch não foi mesclada à `main` neste registro; nenhuma regra pendente foi aprovada ou issue fechada implicitamente.
- Após qualquer alteração no PR #142, executar novamente o CI e atualizar a referência da execução final.
