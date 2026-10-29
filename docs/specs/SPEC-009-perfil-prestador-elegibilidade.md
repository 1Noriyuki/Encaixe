# SPEC-009 — Perfil do prestador e elegibilidade para publicar

| Campo | Valor |
|---|---|
| Versão | 0.2.0 |
| Data | 2026-10-29 |
| Status | **Aprovada** em 2026-10-29 (etapa 32). Definition of Done **pendente**: 0 de 9 testes da §12 existem com o identificador proposto |
| Origem | `docs/specs/mapa-de-specs.md` SPEC-009; `docs/spec.md` v0.1.8 |
| Trilha | A — gostislavs |
| Dependências | SPEC-005, SPEC-007 e SPEC-008 |

## 1. Identificação
A SPEC-009 estabelece perfil do prestador e elegibilidade para publicar, mantendo o modelo do Encaixe e a implementação existente como candidata à verificação de aderência.

## 2. Rastreabilidade
- Requisitos funcionais: **RF-010, RF-011**.
- Regras de negócio: **RN-08, RN-10, RN-21, RN-28**.
- Entidades: PerfilPrestador, Usuario, Servico, ReguaDesconto, Regiao.
- Histórias/caso de uso: UC-01/UC-02 conforme entrada correspondente do mapa aprovado.
- NFR: RNF-03 (titularidade/autorização), RNF-08 quando houver datas, RNF-11 (usabilidade) e RNF-06 (testes).
- Premissas arquiteturais: domínio independente de HTTP/banco, SQLite com integridade, preço em centavos (ADR-002).

## 3. Escopo
Prestador cadastra e atualiza nome de exibição, descrição, região e parâmetros P-01/P-02 próprios. Novos perfis recebem os valores globais vigentes ao cadastro (OPEN-103 aprovada). A barreira de publicação verifica estado ATIVO e lista faltas: nome, região, serviço ativo e régua com faixas.

### Fora de escopo
Aprovação administrativa (SPEC-005), criação de horários (SPEC-010), políticas de suspensão detalhadas (SPEC-025) e catálogo de regiões/categorias (OPEN-11).

## 4. Dependências
SPEC-005, SPEC-007 e SPEC-008. Os casos de uso das Specs posteriores são consumidores destes contratos, não justificam antecipar regras.

## 5. Comportamento esperado
1. Cadastro de prestador nasce PENDENTE_APROVACAO, mas pode preparar nome, região, serviços e régua antes da aprovação (OPEN-210).
2. P-01 deve ser inteiro entre 5–60 minutos e P-02 deve ser LIBERAR ou AUTOCONFIRMAR; a única fonte operacional é o perfil do prestador.
3. Prestador em ATIVO com nome, região, serviço ativo e régua válida pode publicar.
4. Se há pendências, o sistema retorna lista estruturada de itens faltantes; publicação é impedida.
5. PENDENTE_APROVACAO, EM_REVISAO, REPROVADO ou SUSPENSO não publicam, mesmo com perfil completo.
6. Agendamentos existentes seguem válidos quando conta entra em revisão por RN-21, conforme baseline.

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
PerfilPrestador, Usuario, Servico, ReguaDesconto, Regiao. A infraestrutura é proprietária de persistência e transações; serviços de aplicação coordenam operações e auditoria; domínio contém validações puras sempre que possível.

## 8. Impacto arquitetural
Módulos candidatos à conferência: `src/aplicacao/catalogo.js`, `src/aplicacao/contas.js`, `src/infra/repositorios/catalogo.js`, `src/infra/repositorios/usuarios.js`, `src/dominio/precificacao.js`, `src/infra/db/schema.sql`, apenas na extensão necessária a esta Spec. Não alterar outros módulos sem rastreio.

## 9. Contratos necessários
salvarPerfilPrestador({prestadorId,nomeExibicao,descricao,regiaoId,janelaConfirmacaoMin,politicaExpiracao}) → PerfilPrestador; pendenciasDoPrestador(prestadorId) → {completo:boolean,faltando:string[]}; assegurarPodePublicar(prestadorId) → Usuario ou ErroDeRegra com faltando.

## 10. Requisitos não funcionais
Persistência (RNF-01), autorização/titularidade (RNF-03), testes automatizados com regras nos IDs (RNF-06), observabilidade de mudanças (RNF-07), apresentação compreensível em celular (RNF-11). Utilizar transação para operações compostas.

## 11. Critérios de aceitação
**CA-01** — Dado o cenário de perfil do prestador e elegibilidade para publicar, quando novo perfil herda P-01/P-02 globais do momento do cadastro., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-02** — Dado o cenário de perfil do prestador e elegibilidade para publicar, quando mudanças posteriores nos padrões globais não alteram o perfil já criado., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-03** — Dado o cenário de perfil do prestador e elegibilidade para publicar, quando perfil aceita valores P-01 5 e 60 e apenas políticas permitidas., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-04** — Dado o cenário de perfil do prestador e elegibilidade para publicar, quando perfil rejeita nome vazio, valor de janela fora da faixa e política inválida., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-05** — Dado o cenário de perfil do prestador e elegibilidade para publicar, quando sem região/serviço/régua retorna lista completa de pendências., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-06** — Dado o cenário de perfil do prestador e elegibilidade para publicar, quando prestador completo e ATIVO pode publicar., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-07** — Dado o cenário de perfil do prestador e elegibilidade para publicar, quando prestador pendente não publica, embora possa configurar catálogo., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-08** — Dado o cenário de perfil do prestador e elegibilidade para publicar, quando conta em revisão não publica e informa o motivo., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

**CA-09** — Dado o cenário de perfil do prestador e elegibilidade para publicar, quando suspenso/reprovado não publica, independentemente da completude., então o resultado deve satisfazer os invariantes de domínio, ser verificável em banco e não causar efeitos colaterais não previstos.

## 12. Casos de teste derivados
| Teste | Critério |
|---|---|
| `T-SPEC009-01 \| RF-010: novo perfil herda p-01/p-02 globais do momento do cadastro` | CA-01 |
| `T-SPEC009-02 \| RF-010: mudanças posteriores nos padrões globais não alteram o perfil já criado` | CA-02 |
| `T-SPEC009-03 \| RF-010: perfil aceita valores p-01 5 e 60 e apenas políticas permitidas` | CA-03 |
| `T-SPEC009-04 \| RF-010: perfil rejeita nome vazio, valor de janela fora da faixa e política inválida` | CA-04 |
| `T-SPEC009-05 \| RF-010: sem região/serviço/régua retorna lista completa de pendências` | CA-05 |
| `T-SPEC009-06 \| RF-010: prestador completo e ativo pode publicar` | CA-06 |
| `T-SPEC009-07 \| RF-010: prestador pendente não publica, embora possa configurar catálogo` | CA-07 |
| `T-SPEC009-08 \| RF-010: conta em revisão não publica e informa o motivo` | CA-08 |
| `T-SPEC009-09 \| RF-010: suspenso/reprovado não publica, independentemente da completude` | CA-09 |

A suíte existente de `tests/integracao/trilha-a-perfil-catalogo.test.js` e/ou as suítes de preço e regras de negócio devem ser mapeadas individualmente antes de encerrar a issue. IDs acima são identificadores **propostos** para lacunas, não prova de que testes novos tenham sido executados.

## 13. Questões decididas

1. **OPEN-16:** Decidida em 2026-10-29 (etapa 32): as categorias atendidas derivam dos serviços ativos, sem atributo no perfil; RF-011 passa a citar a lista da RN-08. Spec v0.1.10.
2. **OPEN-11:** Decidida em 2026-10-29 (etapa 32): ver SPEC-007 §13, item 1.
3. **Nome ou região inválidos com horários publicados:** Decidida em 2026-10-29 (etapa 32): a validação vale sempre e recusa o dado inválido. Alteração válida aparece nos horários, que leem esses dados do perfil; nenhum horário é reescrito.

As decisões foram aprovadas pela equipe e registradas em `registro-sdd.md`, etapa 32.

## 14. Definition of Done
1. Cada CA tem evidência identificada e resultado automatizado quando aplicável.
2. Regras do código são confrontadas com a baseline e divergências são registradas.
3. Testes passam no Node.js >=24 e migração é verificada quando pertinente.
4. Não ficam alterações silenciosas em regras de negócio nem fatos retroativos.
5. A issue correspondente registra a evidência de atendimento integral.
