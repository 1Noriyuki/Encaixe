# Estratégia de testes e evidências de qualidade — Encaixe

> Atende [`spec.md`](spec.md) §RNF-06: *toda regra de negócio da §6 tem teste automatizado
> correspondente, escrito junto com a implementação; nenhuma tarefa é considerada concluída sem teste.*

---

## 1. Princípio

**O nome do teste carrega o identificador da regra que ele protege.**

```
T-PRECO-04 | RN-01: mais perto do horario vence a faixa de menor antecedencia
T-CANCEL-04i | RN-19: o prestador cancelando na mesma faixa perde mais
T-LLM-05 | INV-14: a busca com os filtros do modelo e identica a busca manual
```

Isso torna a rastreabilidade spec → código → teste verificável por `grep`, e faz a saída do
`npm test` funcionar como uma leitura das regras do sistema. Quando um teste quebra, a mensagem já
diz qual regra de negócio foi violada — não apenas qual função falhou.

---

## 2. Níveis

| Nível | Onde | Isolamento | O que garante |
|---|---|---|---|
| **Unidade** | `tests/unidade/` | Nenhum I/O. Funções puras recebem `antecedenciaMin`, não datas | Cada regra da §6 isolada, com valores de fronteira |
| **Integração** | `tests/integracao/` | Banco SQLite **em memória**, recriado por teste; relógio controlado | Fluxos completos UC-03 → UC-12, incluindo efeitos colaterais |
| **HTTP** | `tests/integracao/http.test.js` | Servidor real em porta efêmera | Autenticação, autorização por perfil, CSRF, escape de saída |

### As duas ferramentas que tornam isso possível

1. **Relógio injetável** (`definirRelogio`). Metade das regras depende de "quanto falta para o
   horário". Sem controlar o tempo, `RN-01`, `RN-10`, `RN-18` e `RN-20` seriam intestáveis — restaria
   testar só o caminho feliz. Com ele, `viajarPara(inicio - 1h)` é uma linha.

2. **Provedor de LLM injetável** (`definirProvedor`). Permite testar o que importa de verdade em uma
   integração com IA: confiança baixa, categoria inválida, timeout, exceção e formato quebrado.

```js
// tests/apoio/cenario.js
viajarPara(adicionarHoras(c.horario.inicio, -1));   // faltando 1h → faixa TOTAL
const { penalidade } = agendamentos.cancelar({ usuarioId: c.cliente.id, agendamentoId: ag.id });
assert.equal(penalidade.delta, -6);
```

---

## 3. Evidência de execução

```
$ npm test

ℹ tests 141
ℹ pass 141
ℹ fail 0
ℹ duration_ms ~3000
```

| Arquivo | Testes | Cobre |
|---|:--:|---|
| `unidade/precificacao.test.js` | 16 | RN-01, RN-02, RN-03, RF-026, RF-027 |
| `unidade/prazos-estados.test.js` | 12 | RN-16, RN-20, RN-24, RN-26, INV-13, máquinas de estado |
| `unidade/reserva.test.js` | 11 | RN-06, RN-07, RN-09, RN-10, RN-12, RN-13 |
| `unidade/roteador.test.js` | 9 | Camada HTTP própria (regressão de bug real) |
| `unidade/cancelamento.test.js` | 8 | RN-18, RN-19, RN-21, RF-048 |
| `unidade/reputacao.test.js` | 9 | RN-22, RN-23, INV-07, INV-08 |
| `unidade/comissao.test.js` | 7 | RN-14, RN-15, RN-16, INV-06 |
| `unidade/tempo.test.js` | 5 | RNF-08: fuso, virada do dia e rótulos de agenda |
| `integracao/fluxo-principal.test.js` | 16 | UC-03, UC-05 a UC-10; RN-04, RF-045/046/060 |
| `integracao/http.test.js` | 11 | RF-004 a RF-007, RNF-03, escape de saída |
| `integracao/penalidades.test.js` | 11 | RN-18 a RN-22, RF-055 |
| `integracao/busca-llm.test.js` | 9 | RN-29 a RN-32, INV-14, RNF-13 |
| `integracao/disputas.test.js` | 9 | RN-17, RN-26, RN-27 (quatro desfechos) |
| `integracao/vitrine.test.js` | 8 | RF-026, RF-027, RF-029, RN-07, RN-10, RN-29 na tela do horário |

Reprodução: `npm test` (suíte completa) ou `node --test tests/integracao/disputas.test.js` (arquivo).

---

## 4. Cobertura por regra de negócio

| Regra | Teste principal | Fronteiras testadas |
|---|---|---|
| RN-01 | `T-PRECO-01..04` | Fora de faixa, borda exata, faixa mais próxima, monotonicidade do desconto ao longo do tempo |
| RN-02 | `T-REGUA-01..05` | Régua vazia, antecedências repetidas, não monotônica, acima do teto |
| RN-03 | `T-PRECO-05/06` | Piso do prestador e teto da plataforma, com o mais restritivo vencendo |
| RN-04 | `T-RESERVA-03` | Desconto sobe depois da reserva: valor travado não muda |
| RN-06 | `T-HORARIO-02` | Bordas que se tocam (permitido), invasão de 1 min, contido, englobante |
| RN-07 | `T-HORARIO-01` | Bordas de P-03 e P-04, e a relação entre elas |
| RN-09 | `T-RESERVA-04` | Reserva concorrente do mesmo horário |
| RN-10 | `T-EXPIRA-01..04` | Prazo limitado pelo início; `LIBERAR`; `AUTOCONFIRMAR`; sem antecedência para revenda |
| RN-12 | `T-RESERVA-05` | Limiar exato de reputação; limite atingido em cada faixa |
| RN-14 | `T-COMISSAO-01/03` | Base é o valor descontado, não o preço-base; arredondamento meio para cima |
| RN-15 | `T-COMISSAO-04` | 8 e 15 aceitos; 7, 16, 0, negativo e fracionário recusados |
| RN-16 | `T-COMISSAO-05` | Todos os estados que **não** geram comissão |
| RN-17 | `T-DISPUTA-01` | Lançamento vai a `RETIDO` na abertura |
| RN-18/19 | `T-CANCEL-01..05` | Três faixas × dois papéis + após o início |
| RN-20 | `T-NOSHOW-01..04` | Cedo demais, tarde demais, cada lado, acusação mútua |
| RN-21 | `T-REVISAO-01` | Terceira ocorrência bloqueia publicação |
| RN-22 | `T-REVISAO-02` | Limiares de restrição e de revisão |
| RN-23 | `T-REPUT-01..06` | Cada delta, janela móvel, reversão, limites [0,100] |
| RN-24/25 | `T-AVAL-01..04` | Unicidade, janela, revelação cega e revelação por prazo |
| RN-26 | `T-DISPUTA-02` | Sem evidência, fora do prazo, disputa duplicada |
| RN-27 | `T-DISPUTA-03..06` | Os quatro desfechos, com efeito em reputação **e** comissão |
| RN-29 | `T-LLM-01/05` | Busca via IA idêntica à busca manual (INV-14) |
| RN-30 | `T-LLM-02/03` | Confiança baixa; categoria fora do catálogo |
| RN-31 | `T-LLM-04/04b` | Falha reportada e exceção lançada pelo provedor |
| RN-32 | `T-LLM-06` | Interpretação persistida com modelo, confiança e desfecho |

### Invariantes (spec §9.8)

| Invariante | Como é testada |
|---|---|
| INV-01 | `T-RESERVA-04` + índice único parcial no banco |
| INV-05 | `T-COMISSAO-05i`: cancelado não gera lançamento |
| INV-06 | `T-COMISSAO-02` varre 7 valores × 4 percentuais verificando `bruto = comissão + líquido` |
| INV-07/08 | `T-REPUT-03/06`: soma dos eventos, truncada em [0,100] |
| INV-12 | `T-DISPUTA-01`: nenhum lançamento `EFETIVADO` sob disputa |
| INV-13 | `assegurarTransicao` recusa transições fora da máquina |
| INV-14 | `T-LLM-05`: resultados idênticos com e sem IA |

---

## 5. Bugs encontrados pelos testes

Registro honesto do que a suíte pegou durante a construção — é a evidência mais forte de que os testes
estão fazendo trabalho real.

| # | Bug | Como apareceu | Correção |
|---|---|---|---|
| 1 | **RN-01 estava escrita ao contrário na spec.** A faixa aplicável seria "a maior antecedência menor ou igual à atual", o que inverte a régua: esperar mais sairia mais barato | Percebido ao escrever o cálculo e conferir contra o exemplo da própria spec | **Spec corrigida primeiro** (v0.1.1), depois o código. `T-PRECO-04b` trava a monotonicidade |
| 2 | **Máquina de estados do horário incompleta.** Faltava `OCUPADO → PUBLICADO`: quando o cliente cancelava um agendamento confirmado, o horário não tinha para onde ir | `T-COMISSAO-05i` falhou com *"Transicao invalida: Confirmado nao pode virar Publicado"* | Spec §9.5 atualizada (v0.1.3) com a assimetria explicada, depois `estados.js` |
| 3 | **Duplo escape de HTML.** A página inteira era servida como texto escapado | Verificação manual do HTML servido; hoje coberto por `a pagina inicial nao vaza HTML escapado por engano` | `pagina()` passou a devolver HTML já marcado como seguro |
| 4 | **Rotas com parâmetro respondiam 404.** O escape de regex destruía o `:id`, então nenhuma rota `/agendamentos/:id/...` funcionava | Fluxo manual via `curl` | Roteador reescrito segmento a segmento + `tests/unidade/roteador.test.js` inteiro como regressão |
| 5 | **Login com senha errada redirecionava sem mensagem.** O aviso pós-redirect depende de sessão, que ainda não existe no login | `RF-005 \| credencial invalida devolve mensagem generica` recebeu corpo vazio | Erro em POST sem sessão passou a ser renderizado na hora |

Os bugs 1 e 2 são os mais relevantes para a disciplina: **os dois foram corrigidos primeiro na spec e
só depois no código**, que é exatamente o fluxo que o projeto exige.

---

## 6. O que não é testado

| Lacuna | Motivo | Risco residual |
|---|---|---|
| Provedor real de LLM (chamada de rede) | Exigiria chave e rede na CI; o contrato é testado com dublê | Erro só no adaptador Anthropic |
| Concorrência real com múltiplos processos | SQLite serializa escritas; MVP roda em um processo | Baixo no escopo |
| Renderização visual (CSS, responsividade) | Sem ferramenta de teste visual | Estético |
| Carga e desempenho sob volume | Volume esperado é de centenas de registros | Baixo no escopo |
| Acessibilidade (WCAG) | Fora do escopo do MVP | Médio para produção |

---

## 7. Como a qualidade é mantida

1. **Regra nova exige teste no mesmo PR.** Sem teste, a tarefa não está pronta (`tasks.md`).
2. **Bug corrigido vira teste de regressão** — os cinco da §5 seguem essa política.
3. **Divergência entre spec e código é bug de projeto.** Quando o código expõe erro na spec, a spec é
   corrigida primeiro e ganha entrada no histórico de versões.
4. **O banco é a segunda linha de defesa.** `CHECK`, `UNIQUE` e índice parcial rejeitam estado inválido
   mesmo se um teste faltar.
