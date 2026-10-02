# Constituição do projeto Encaixe

> Princípios que governam o fluxo de Spec-Driven Development neste repositório.
> Valem para qualquer integrante e para o agente de codificação.

---

## I. A especificação é a fonte de verdade

`docs/spec.md` descreve o sistema. O código é a consequência.

- Mudou a decisão ou o requisito? **A spec muda antes do código.**
- Divergência entre spec e código é *spec drift*: falha de projeto, não detalhe menor.
- A spec tem histórico de versões. Toda correção relevante deixa rastro lá.

**Já aconteceu duas vezes neste projeto** — a RN-01 estava escrita ao contrário, e a máquina de
estados do horário estava incompleta. Nos dois casos a spec foi corrigida primeiro, com registro
no histórico de versões, e só então o código.

## II. Regra de negócio não mora em detalhe técnico

A seção 6 da spec contém apenas o *quê* e o *porquê*. Framework, tabela, biblioteca e prompt vivem em
`plan.md` e nos ADRs.

No código, a mesma fronteira: `src/dominio/` não importa banco, rede ou relógio real. Se uma regra
precisa saber que horas são, ela recebe o tempo como parâmetro.

## III. Parâmetro é dado, não código

Nenhum número de regra — janela de confirmação, limiar de reputação, percentual de comissão — pode
aparecer solto no meio de uma função. Todos vivem na tabela `parametro`, com faixa validada, e são
editáveis pelo admin sem deploy.

Alteração de parâmetro **nunca retroage** a fatos já ocorridos.

## IV. Decisão relevante vira ADR

Linguagem, modelo de dados, arquitetura, autenticação, uso de IA. Três partes obrigatórias:
**contexto, decisão, consequências** — incluindo as consequências negativas e os limites conhecidos.

Um ADR que só lista vantagens não foi escrito, foi vendido.

## V. Nenhuma tarefa está pronta sem teste

Toda regra da spec §6 tem teste automatizado, e o nome do teste carrega o identificador da regra:

```
T-CANCEL-04i | RN-19: o prestador cancelando na mesma faixa perde mais
```

Bug corrigido vira teste de regressão. Sem exceção.

## VI. Defesa em profundidade nas invariantes

O que não pode acontecer não pode acontecer **nem por bug**. As invariantes da spec §9.8 são
garantidas no domínio *e* no banco (`CHECK`, `UNIQUE`, índice único parcial).

Duplicação deliberada: o custo de manter a regra em dois lugares é menor que o custo de um estado
corrompido.

## VII. A IA interpreta; o sistema decide

O LLM produz dados estruturados validados por esquema. Seleção, filtro, ordenação, preço e transição
de estado são **sempre** código determinístico.

O sistema precisa funcionar por completo com o provedor indisponível. Se não funcionar, a IA deixou
de ser componente e virou dependência crítica — o que este projeto não aceita.

## VIII. O usuário vê a regra que o barrou

Erro de regra de negócio carrega o identificador da regra e chega à interface com ele. Ninguém recebe
"operação inválida": recebe *por que* foi barrado, e qual regra decidiu isso.

Ação com consequência mostra a consequência **antes** da confirmação.

## IX. Rastreabilidade ponta a ponta

Persona → história → requisito EARS → regra → caso de uso → código → teste. Toda transição de estado
deixa registro de auditoria com ator, estados e correlação de requisição.

Se não dá para reconstruir por que um agendamento terminou como terminou, o sistema está incompleto.

## X. Trabalho registrado é trabalho existente

Issue para todo trabalho relevante. Branch própria. PR com issue vinculada e evidência de teste.
Revisão de outro integrante antes do merge.

---

## Fluxo de trabalho

```
1. spec.md         define o problema, as regras e os critérios de aceite
2. ADR             registra a decisão técnica relevante
3. plan.md         traduz a spec em arquitetura
4. specs/          mapa ordenado de Specs, aprovado pela equipe; depois uma Spec por vez, aprovada
                   antes de ser implementada (roteiro de Spec-Driven Development)
5. tasks.md        quebra em tarefas atômicas → issues
6. branch + teste  implementa a Spec aprovada, com o teste nomeado pela regra
7. PR + revisão    outro integrante revisa
8. review/         revisão multidimensional periódica, com achados e ações
```

Toda etapa desse fluxo fica registrada em `docs/specs/registro-sdd.md`. Conflito entre código, Spec e
modelagem nunca é resolvido em silêncio: registra-se a divergência e decide-se entre corrigir a
implementação ou propor alteração da baseline. A decisão é da equipe.

Quando o código revela um erro na especificação, o fluxo **volta ao passo 1**. Não se corrige o código
para acomodar uma spec errada.
