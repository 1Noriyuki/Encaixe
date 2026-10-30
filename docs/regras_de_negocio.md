# Regras de negocio

> Resumo das regras RN-00 a RN-33. A definição normativa, os parâmetros, justificativas e rastros completos estão em [`spec.md`](spec.md), seção 6.

## Parâmetros e preço

- **RN-00 — Parâmetros são dados:** os parâmetros vivem na configuração, têm faixa validada e só valem para fatos posteriores.
- **RN-01 — Preço por faixa:** aplica-se a faixa de menor antecedência que cobre o instante atual; sem faixa aplicável, o desconto é zero.
- **RN-02 — Régua válida:** exige ao menos uma faixa, antecedências distintas e desconto não crescente conforme a antecedência aumenta.
- **RN-03 — Piso de preço:** o valor nunca fica abaixo do preço mínimo do serviço nem abaixo do preço-base menos o teto global.
- **RN-04 — Preço travado:** o valor do agendamento é o preço vigente no instante da reserva e não muda depois.
- **RN-05 — Horário reservado:** data, hora, duração, preço-base e régua não podem ser editados enquanto houver reserva pendente ou confirmada.

## Publicação e reserva

- **RN-06 — Não sobreposição:** horários ativos do mesmo prestador não podem ocupar intervalos sobrepostos.
- **RN-07 — Antecedência:** publicação exige P-03 e reserva exige P-04; depois do início não há reserva.
- **RN-08 — Elegibilidade para publicar:** somente prestador ativo, aprovado, com perfil completo, serviço e régua válida publica.
- **RN-09 — Exclusividade:** reserva pendente ou confirmada bloqueia o horário para os demais clientes.
- **RN-10 — Expiração:** após P-01, `LIBERAR` devolve o horário à busca e `AUTOCONFIRMAR` confirma; o cliente não é penalizado.
- **RN-11 — Recusa:** exige motivo, encerra o agendamento, devolve o horário quando possível e não penaliza o cliente.
- **RN-12 — Limite por reputação:** cliente abaixo de P-10 mantém no máximo o limite restrito; os demais usam o limite normal.
- **RN-13 — Elegibilidade do cliente:** contas suspensas ou em revisão não reservam; contas restritas obedecem ao limite.

## Comissão

- **RN-14 — Base:** comissão incide sobre o valor final travado, com arredondamento de meio para cima.
- **RN-15 — Percentual vigente:** usa o percentual da categoria no momento da conclusão, dentro da faixa de P-13.
- **RN-16 — Fato gerador:** somente agendamento `CONCLUIDO` gera comissão.
- **RN-17 — Disputa:** comissão de agendamento disputado fica `RETIDO` até resolução.

## Cancelamento e reputação

- **RN-18 — Cancelamento do cliente:** faixas livre, parcial e total aplicam respectivamente 0, -3 e -6 de reputação.
- **RN-19 — Cancelamento do prestador:** as mesmas faixas aplicam -1, -5 e -10; o evento conta para revisão.
- **RN-20 — No-show:** só ocorre na janela P-16, em agendamento confirmado; aplica -12, não gera comissão e permite contestação.
- **RN-21 — Ocorrências do prestador:** P-12 ocorrências em 30 dias levam a conta para `EM_REVISAO` e bloqueiam novas publicações.
- **RN-22 — Revisão por reputação:** abaixo de P-09 entra em revisão; cliente entre P-09 e P-10 fica restrito.
- **RN-23 — Cálculo da reputação:** soma eventos dos últimos P-20 dias, começa em P-08 e fica limitada a [0, 100].
- **RN-24 — Avaliação:** só após conclusão, dentro de P-14, uma vez por parte, com nota de 1 a 5.
- **RN-25 — Revelação cega:** avaliações aparecem quando ambas forem registradas ou quando a janela terminar.

## Disputas, moderação e IA

- **RN-26 — Abertura de disputa:** exige estado elegível, prazo P-15, motivo fechado e ao menos uma evidência.
- **RN-27 — Resolução:** somente admin decide entre `MANTIDO`, `REVERTIDO`, `PARCIAL` e `ARQUIVADO`, sempre com justificativa.
- **RN-28 — Contas:** prestador novo aguarda aprovação; admin pode suspender conta com justificativa e preserva agendamentos confirmados.
- **RN-29 — LLM interpreta, sistema decide:** o modelo produz filtros estruturados; não escolhe prestador, preço, desconto ou estado.
- **RN-30 — Confiança:** confiança abaixo de P-19 ou categoria inválida exige confirmação ou correção do cliente.
- **RN-31 — Degradação segura:** falha, timeout ou formato inválido do LLM leva à busca por filtros e é registrado.
- **RN-32 — Rastreabilidade:** cada interpretação guarda texto, saída, confiança, modelo e desfecho.
- **RN-33 — Pagamento registrado:** o MVP registra cobrança presencial e comissão devida, mas não processa dinheiro.

## Invariantes associadas

As regras são reforçadas por invariantes no domínio e no banco: exclusividade de reserva, estados válidos, unicidade de avaliações, consistência de valores, auditoria de transições e retenção de comissão em disputa. A lista formal está em [`spec.md`](spec.md), seção 9.8.
