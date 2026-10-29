# SPEC-008 — Régua de desconto e simulador

| Campo | Valor |
|---|---|
| Versão | 0.2.0 |
| Data | 2026-10-29 |
| Status | **Aprovada** em 2026-10-29 (etapa 32). Evidência completa na etapa 33: todos os critérios da §11 têm teste e passam. Falta a revisão do PR por outro integrante |
| Origem | `docs/specs/mapa-de-specs.md` SPEC-008; `docs/spec.md` v0.1.8 |
| Trilha | A — gostislavs |
| Dependências | SPEC-005 e SPEC-007 |

## 1. Identificação
A SPEC-008 estabelece régua de desconto e simulador, mantendo o modelo do Encaixe e a implementação existente como candidata à verificação de aderência.

## 2. Rastreabilidade
- Requisitos funcionais: **RF-018, RF-019, RF-020, RF-027**.
- Regras de negócio: **RN-02, RN-03**.
- Entidades: ReguaDesconto, FaixaDesconto, Servico.
- Histórias/caso de uso: UC-01/UC-02 conforme entrada correspondente do mapa aprovado.
- NFR: RNF-03 (titularidade/autorização), RNF-08 quando houver datas, RNF-11 (usabilidade) e RNF-06 (testes).
- Premissas arquiteturais: domínio independente de HTTP/banco, SQLite com integridade, preço em centavos (ADR-002).

## 3. Escopo
Prestador cria e edita suas réguas com antecedências únicas positivas e descontos inteiros de 0% até o teto global P-05. À medida que a antecedência diminui, o desconto não pode diminuir. Simulador retorna a projeção de preço por faixa, respeitando preço mínimo do serviço e teto global, sem gravar alterações.

### Fora de escopo
Publicar um horário ou escolher régua durante publicação (SPEC-010); persistência de preço do horário a cada acesso (SPEC-011); políticas comerciais automáticas não aprovadas.

## 4. Dependências
SPEC-005 e SPEC-007. Os casos de uso das Specs posteriores são consumidores destes contratos, não justificam antecipar regras.

## 5. Comportamento esperado
1. O prestador informa título e faixas; o sistema normaliza, valida unicidade, teto e monotonicidade antes de inserir.
2. Ao editar, valida titularidade e substitui o conjunto de faixas atomicamente, mantendo o identificador da régua.
3. Régua inválida não altera nenhuma das faixas já existentes.
4. Simulação calcula preço por faixa e uma linha de preço cheio, sem inserir ou atualizar registros.
5. Piso do preço vence o percentual maior: utiliza-se o valor monetário mais alto entre piso do prestador e piso imposto pelo teto P-05.

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
ReguaDesconto, FaixaDesconto, Servico. A infraestrutura é proprietária de persistência e transações; serviços de aplicação coordenam operações e auditoria; domínio contém validações puras sempre que possível.

## 8. Impacto arquitetural
Módulos candidatos à conferência: `src/aplicacao/catalogo.js`, `src/aplicacao/contas.js`, `src/infra/repositorios/catalogo.js`, `src/infra/repositorios/usuarios.js`, `src/dominio/precificacao.js`, `src/infra/db/schema.sql`, apenas na extensão necessária a esta Spec. Não alterar outros módulos sem rastreio.

## 9. Contratos necessários
salvarRegua({prestadorId,reguaId?,nome,faixas}) → ReguaDesconto; simularRegua({precoBase,precoMinimo,faixas}) → Array<Projecao>; validarRegua(faixas,tetoPct) puro, sem DB/relógio.

## 10. Requisitos não funcionais
Persistência (RNF-01), autorização/titularidade (RNF-03), testes automatizados com regras nos IDs (RNF-06), observabilidade de mudanças (RNF-07), apresentação compreensível em celular (RNF-11). Utilizar transação para operações compostas.

## 11. Critérios de aceitação
**CA-01** — Dado o cenário de régua de desconto e simulador, quando criar régua com faixas válidas e titularidade do prestador., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-02** — Dado o cenário de régua de desconto e simulador, quando não admitir ausência de faixas, antecedência zero, percentual negativo nem acima do teto., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-03** — Dado o cenário de régua de desconto e simulador, quando não admitir antecedências duplicadas., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-04** — Dado o cenário de régua de desconto e simulador, quando impedir desconto menor conforme o horário se aproxima., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-05** — Dado o cenário de régua de desconto e simulador, quando atualização válida substitui faixas sem duplicidade e é auditada., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-06** — Dado o cenário de régua de desconto e simulador, quando atualização inválida preserva todas as faixas anteriores., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-07** — Dado o cenário de régua de desconto e simulador, quando simulador retorna preço sem ultrapassar o desconto teto ou o piso do prestador., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-08** — Dado o cenário de régua de desconto e simulador, quando simulação não altera contadores do banco., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-09** — Dado o cenário de régua de desconto e simulador, quando prestador A não altera régua de B., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

## 12. Casos de teste derivados

Os IDs `T-SPEC008-01` a `05` já identificam testes de leitura de números da régua (`spec-008-validacao-regua.test.js`), que seguem como cobertura complementar. Os critérios usam `T-SPEC008-CAnn`, em `tests/integracao/spec-008-evidencia.test.js`.

| Teste | Cobre |
|---|---|
| `T-SPEC008-CA01 \| RF-018: criar régua com faixas válidas e titularidade do prestador` | CA-01 |
| `T-SPEC008-CA02 \| RF-018: não admitir ausência de faixas, antecedência zero, percentual negativo nem acima do teto`<br>`T-SPEC008-04 \| RNF-01: regua invalida nao cria faixas nem modifica banco` | CA-02, INV-001 |
| `T-SPEC008-CA03 \| RF-018: não admitir antecedências duplicadas` | CA-03 |
| `T-SPEC008-CA04 \| RF-018: impedir desconto menor conforme o horário se aproxima` | CA-04 |
| `T-SPEC008-CA05 \| RF-018: atualização válida substitui faixas sem duplicidade e é auditada` | CA-05, INV-005 |
| `T-SPEC008-CA06 \| RF-018: atualização inválida preserva todas as faixas anteriores` | CA-06, INV-001 |
| `T-SPEC008-CA07 \| RF-018: simulador retorna preço sem ultrapassar o desconto teto ou o piso do prestador` | CA-07 |
| `T-SPEC008-CA08 \| RF-018: simulação não altera contadores do banco` | CA-08 |
| `T-SPEC008-CA09 \| RF-018: prestador a não altera régua de b` | CA-09, INV-002 |
| `T-SPEC011-CA08 \| RN-01: preço travado de reserva anterior não muda quando o relógio avança`<br>`T-HORARIO-04 \| RN-05: servico alterado nao modifica snapshots de horario reservado` | INV-004 (a régua editada não muda o preço já travado) |

**Evidência (etapa 33, 2026-10-29).** Todos os testes acima existem e passam em `npm test` no Node 24.

**INV-003 e INV-006** são conferência de código: o teto vem da P-05 e a faixa de 0 a 100% da RN-02; as faixas dependem da régua por chave estrangeira.

## 13. Questões decididas

1. **OPEN-10:** Decidida em 2026-10-29 (etapa 32): a régua é do prestador e cada horário escolhe uma ao ser publicado. Spec v0.1.10 corrige a §9.2 e fecha a QA-07.
2. **P-05 reduzido abaixo de descontos já configurados:** Decidida em 2026-10-29 (etapa 32): o teto vigente vale no cálculo de horário ainda sem reserva; o agendamento reservado mantém o preço travado (RN-04). Spec v0.1.10, RN-03.
3. **Limite de faixas:** Decidida em 2026-10-29 (etapa 32): sem limite no MVP.

As decisões foram aprovadas pela equipe e registradas em `registro-sdd.md`, etapa 32.

## 14. Definition of Done
1. Cada CA tem evidência identificada e resultado automatizado quando aplicável.
2. Regras do código são confrontadas com a baseline e divergências são registradas.
3. Testes passam no Node.js >=24 e migração é verificada quando pertinente.
4. Não ficam alterações silenciosas em regras de negócio nem fatos retroativos.
5. A issue correspondente registra a evidência de atendimento integral.
