# Visao do produto — Encaixe

> Documento de orientação do produto. A especificação normativa completa está em [`spec.md`](spec.md).

## Problema

Prestadores de serviço locais perdem receita quando um horário fica vago perto do atendimento. O horário não pode ser armazenado para venda futura: depois que passa, ele deixa de existir.

Ao mesmo tempo, clientes aceitam adaptar a rotina quando encontram um atendimento próximo, confiável e com preço proporcional à urgência. O mercado local não oferece uma forma simples de conectar essas duas necessidades.

## Solução

O Encaixe é um marketplace de dois lados para horários ociosos de prestadores locais. O prestador publica a vaga, define uma régua de desconto e escolhe a política de confirmação. O cliente encontra horários por filtros ou linguagem natural, vê o preço vigente e reserva dentro das regras da plataforma.

O sistema também controla:

- janela de confirmação e expiração automática;
- preço travado no instante da reserva;
- cancelamento e no-show com efeito em reputação;
- conclusão do atendimento e comissão sobre o valor final;
- avaliações bilaterais com revelação cega;
- disputas, moderação, notificações e auditoria.

## Proposta de valor

| Público | Problema | Entrega do Encaixe |
|---|---|---|
| Prestador | Buracos na agenda geram receita zero | Publicação rápida, desconto configurável e acesso a novos clientes |
| Cliente | É difícil encontrar atendimento de última hora | Busca por preço, horário, região e reputação, com reserva clara |
| Plataforma | A receita não pode depender de uma transação que não aconteceu | Comissão somente quando o agendamento é concluído |

## Objetivos do MVP

1. Permitir cadastro, autenticação, aprovação e autorização por perfil.
2. Permitir que prestadores ativos cadastrem serviços e publiquem horários.
3. Calcular preço dinâmico com piso, régua e preço travado.
4. Permitir busca pública por filtros e por descrição em linguagem natural.
5. Controlar reserva exclusiva, confirmação, recusa e expiração.
6. Registrar cancelamento, no-show, reputação, avaliação e disputa.
7. Apurar comissão, extrato, métricas, notificações e trilha de auditoria.

## Perfis

### Cliente

Busca e reserva horários, acompanha agendamentos, cancela dentro das regras, registra no-show, avalia o prestador e participa de disputas.

### Prestador

Mantém o perfil, cadastra serviços, define a régua, publica horários, confirma ou recusa reservas, conclui atendimentos, informa cobrança e avalia clientes.

### Admin

Aprova ou reprova prestadores, revisa contas, resolve disputas, acompanha métricas, configura parâmetros e percentuais de comissão e consulta a auditoria.

## Princípios do produto

- **Preço transparente:** a tela mostra preço-base, preço vigente, desconto e próximo degrau.
- **Consequência antes da ação:** cancelamentos exibem a penalidade antes da confirmação.
- **Decisão determinística:** o LLM interpreta texto; o sistema escolhe e ordena horários.
- **Confiança por rastreabilidade:** reputação é derivada de eventos e transições são auditadas.
- **Degradação segura:** a busca por filtros continua funcionando sem o provedor de LLM.
- **Privacidade por padrão:** contatos só são revelados entre partes de um agendamento confirmado.

## Fora do MVP

Não fazem parte do MVP: gateway de pagamento, aplicativo mobile nativo, chat livre, plano premium, GPS/mapa, repasse financeiro automático e recorrência semanal automática. O pagamento é registrado, mas não processado, conforme [ADR-005](adr/ADR-005-escopo-financeiro.md).

## Rastreabilidade

- Requisitos e regras: [`spec.md`](spec.md).
- Plano técnico: [`plan.md`](plan.md).
- Tarefas e marcos: [`tasks.md`](tasks.md).
- Segurança e pendências: [`seguranca.md`](seguranca.md).
