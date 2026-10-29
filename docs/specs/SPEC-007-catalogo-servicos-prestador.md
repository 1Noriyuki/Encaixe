# SPEC-007 — Catálogo de serviços do prestador

| Campo | Valor |
|---|---|
| Versão | 0.2.0 |
| Data | 2026-10-29 |
| Status | **Aprovada** em 2026-10-29 (etapa 32). Definition of Done **pendente**: 0 de 8 testes da §12 existem com o identificador proposto |
| Origem | `docs/specs/mapa-de-specs.md` SPEC-007; `docs/spec.md` v0.1.8 |
| Trilha | A — gostislavs |
| Dependências | SPEC-005 |

## 1. Identificação
A SPEC-007 estabelece catálogo de serviços do prestador, mantendo o modelo do Encaixe e a implementação existente como candidata à verificação de aderência.

## 2. Rastreabilidade
- Requisitos funcionais: **RF-012, RF-013**.
- Regras de negócio: **RN-03**.
- Entidades: Servico, CategoriaServico, Usuario.
- Histórias/caso de uso: UC-01/UC-02 conforme entrada correspondente do mapa aprovado.
- NFR: RNF-03 (titularidade/autorização), RNF-08 quando houver datas, RNF-11 (usabilidade) e RNF-06 (testes).
- Premissas arquiteturais: domínio independente de HTTP/banco, SQLite com integridade, preço em centavos (ADR-002).

## 3. Escopo
Cadastro, alteração, listagem e desativação lógica de serviços por prestador, com categoria válida, nome não vazio, duração positiva em múltiplos de 5 minutos e preços monetários inteiros em centavos. O piso declarado não excede o preço-base. Preservam-se serviços e snapshots históricos após alteração ou desativação.

### Fora de escopo
Administração do catálogo de categorias e regiões (OPEN-11); publicação de horários (SPEC-010); precificação dinâmica (SPEC-011); cancelamento e comissão.

## 4. Dependências
SPEC-005. Os casos de uso das Specs posteriores são consumidores destes contratos, não justificam antecipar regras.

## 5. Comportamento esperado
1. Prestador autenticado cria um serviço em categoria existente; sistema normaliza os preços em centavos, valida campos e persiste registro ativo.
2. O proprietário edita nome, duração, categoria e valores, sem modificar snapshots de horários anteriores.
3. O proprietário desativa um serviço: o registro permanece armazenado, mas fica inelegível para novas publicações.
4. Acesso para modificar serviço de outro prestador ou categoria inexistente é recusado, sem alteração persistida.

### Tratamento de exceções
Erros de campo devem indicar a entrada inválida; violações de titularidade não revelam dados do outro prestador. Tentativas inválidas não persistem parcialmente.

## 6. Regras e invariantes
- **INV-001:** nenhuma alteração rejeitada persiste efeitos parciais.
- **INV-002:** o prestador só pode alterar registros sob sua titularidade.
- **INV-003:** contratos de regras e limites vêm da baseline, sem constantes comerciais inventadas.
- **INV-004:** mudanças de valores não reescrevem snapshots e fatos anteriores (RN-00).
- **INV-005:** atos operacionais ficam auditáveis conforme RF-084 quando previstos.
- **INV-006:** a integridade relacional e de domínio deve ser preservada por camada de aplicação e banco.

## 7. Modelo de domínio
Servico, CategoriaServico, Usuario. A infraestrutura é proprietária de persistência e transações; serviços de aplicação coordenam operações e auditoria; domínio contém validações puras sempre que possível.

## 8. Impacto arquitetural
Módulos candidatos à conferência: `src/aplicacao/catalogo.js`, `src/aplicacao/contas.js`, `src/infra/repositorios/catalogo.js`, `src/infra/repositorios/usuarios.js`, `src/dominio/precificacao.js`, `src/infra/db/schema.sql`, apenas na extensão necessária a esta Spec. Não alterar outros módulos sem rastreio.

## 9. Contratos necessários
salvarServico({prestadorId,servicoId?,nome,categoriaId,duracaoMin,precoBase,precoMinimo}) → Servico; desativarServico({prestadorId,servicoId}); servicosDoPrestador(prestadorId). Erros de validação identificam o campo; falta de titularidade gera ErroDeAutorizacao.

## 10. Requisitos não funcionais
Persistência (RNF-01), autorização/titularidade (RNF-03), testes automatizados com regras nos IDs (RNF-06), observabilidade de mudanças (RNF-07), apresentação compreensível em celular (RNF-11). Utilizar transação para operações compostas.

## 11. Critérios de aceitação
**CA-01** — Dado o cenário de catálogo de serviços do prestador, quando criar serviço com categoria existente, nome válido, duração múltiplo de 5 e base/piso em centavos., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-02** — Dado o cenário de catálogo de serviços do prestador, quando rejeitar nome vazio, duração zero, fracionária ou não múltipla de cinco., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-03** — Dado o cenário de catálogo de serviços do prestador, quando rejeitar preço-base não positivo e preço mínimo acima da base sem gravar., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-04** — Dado o cenário de catálogo de serviços do prestador, quando editar serviço mantém seu identificador e só altera seus dados atuais., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-05** — Dado o cenário de catálogo de serviços do prestador, quando desativação marca ativo=0 sem excluir nem reescrever históricos., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-06** — Dado o cenário de catálogo de serviços do prestador, quando prestador A não edita/desativa serviço de B., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-07** — Dado o cenário de catálogo de serviços do prestador, quando categoria não cadastrada é recusada., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-08** — Dado o cenário de catálogo de serviços do prestador, quando operações bem-sucedidas são auditadas e atomicamente persistidas., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

## 12. Casos de teste derivados
| Teste | Critério |
|---|---|
| `T-SPEC007-01 \| RF-012: criar serviço com categoria existente, nome válido, duração múltiplo de 5 e base/piso em centavos` | CA-01 |
| `T-SPEC007-02 \| RF-012: rejeitar nome vazio, duração zero, fracionária ou não múltipla de cinco` | CA-02 |
| `T-SPEC007-03 \| RF-012: rejeitar preço-base não positivo e preço mínimo acima da base sem gravar` | CA-03 |
| `T-SPEC007-04 \| RF-012: editar serviço mantém seu identificador e só altera seus dados atuais` | CA-04 |
| `T-SPEC007-05 \| RF-012: desativação marca ativo=0 sem excluir nem reescrever históricos` | CA-05 |
| `T-SPEC007-06 \| RF-012: prestador a não edita/desativa serviço de b` | CA-06 |
| `T-SPEC007-07 \| RF-012: categoria não cadastrada é recusada` | CA-07 |
| `T-SPEC007-08 \| RF-012: operações bem-sucedidas são auditadas e atomicamente persistidas` | CA-08 |

A suíte existente de `tests/integracao/trilha-a-perfil-catalogo.test.js` e/ou as suítes de preço e regras de negócio devem ser mapeadas individualmente antes de encerrar a issue. IDs acima são identificadores **propostos** para lacunas, não prova de que testes novos tenham sido executados.

## 13. Questões decididas

1. **OPEN-11:** Decidida em 2026-10-29 (etapa 32): no MVP, categorias e regiões são listas carregadas pela implantação; o admin edita só o percentual de comissão da categoria. Spec v0.1.10, §9.2.
2. **Troca de categoria com horários publicados:** Decidida em 2026-10-29 (etapa 32): é permitida. A busca passa a mostrar esses horários na categoria nova; reservas e snapshots de preço não mudam.
3. **Preço mínimo vazio:** Decidida em 2026-10-29 (etapa 32): vale 0, isto é, o serviço não tem piso próprio; o teto P-05 continua protegendo (RN-03).

As decisões foram aprovadas pela equipe e registradas em `registro-sdd.md`, etapa 32.

## 14. Definition of Done
1. Cada CA tem evidência identificada e resultado automatizado quando aplicável.
2. Regras do código são confrontadas com a baseline e divergências são registradas.
3. Testes passam no Node.js >=24 e migração é verificada quando pertinente.
4. Não ficam alterações silenciosas em regras de negócio nem fatos retroativos.
5. A issue correspondente registra a evidência de atendimento integral.
