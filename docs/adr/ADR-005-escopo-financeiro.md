# ADR-005 — Escopo financeiro: comissão apurada, pagamento registrado, sem gateway

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data | 2026-08-21 |
| Decisores | Equipe |
| Relacionado | spec §2.2 (não-objetivos), RN-14 a RN-17, RN-33, QA-05, QA-06 |

## Contexto

O modelo de negócio do Encaixe **é** a comissão: a plataforma retém um percentual de cada agendamento
concluído. Ignorar isso descaracterizaria o produto e violaria a exigência de regras de negócio
explícitas.

Por outro lado, o enunciado §5.2 rejeita projetos que dependem de "dados externos indisponíveis, pagos
ou inviáveis de obter durante o semestre". Um gateway de pagamento real significa: conta de comerciante,
credenciais, ambiente de sandbox, webhooks acessíveis pela internet, conciliação e tratamento de
estorno. É um projeto inteiro dentro do projeto — e nenhuma dessas partes ensina modelagem de software.

A tensão: **como manter o modelo de negócio no centro do sistema sem depender de infraestrutura de
pagamento?**

## Decisão

**Separar a apuração da liquidação.** O sistema apura a comissão com rigor total; a movimentação de
dinheiro fica fora do MVP.

### O que o sistema faz

- Calcula a comissão sobre o **valor final travado na reserva** (`RN-14`), com o percentual vigente da
  categoria no momento da conclusão (`RN-15`), arredondando meio para cima.
- Cria um `lancamento_comissao` com bruto, percentual, comissão e líquido — e o banco garante
  `bruto = comissão + líquido` (`INV-06`).
- Só gera lançamento para agendamento `CONCLUIDO` (`RN-16`, `INV-05`).
- Retém o lançamento (`RETIDO`) enquanto houver disputa aberta e o estorna ou libera conforme o
  desfecho (`RN-17`, `RN-27`).
- Mantém extrato por prestador (bruto, comissão, líquido, retidos) e painel de comissão acumulada,
  ticket médio e taxa de cancelamento/no-show para o admin.

### O que o sistema não faz

- Não cobra do cliente.
- Não repassa ao prestador.
- Não integra gateway, PIX, cartão ou boleto.

### Como o pagamento aparece

O pagamento é **presencial entre cliente e prestador**. Na conclusão, o prestador informa o estado de
cobrança: `PAGO_PRESENCIAL` ou `NAO_PAGO` (`RN-33`). Isso é registro declaratório — o sistema não
verifica. Divergência de valor é motivo válido de disputa (`COBRANCA_DIVERGENTE`), o que dá ao admin
um caminho para resolver o conflito sem que a plataforma toque no dinheiro.

### Consequência sobre a política de cancelamento

Como não há cobrança, **a penalidade por cancelamento é exclusivamente de reputação**, não financeira
(QA-06). A escala foi calibrada para isso: −3/−6 para o cliente, −5/−10 para o prestador, −12 no
no-show, com efeitos concretos nas permissões (limite de reservas em `RN-12`, bloqueio de publicação
em `RN-21`). A reputação **é** a moeda de conduta do MVP.

## Consequências

### Positivas

- **O modelo de negócio permanece explícito e testável.** A regra que mais importa comercialmente
  (`comissão sobre o valor descontado, nunca sobre o preço-base`) tem teste dedicado que verifica
  justamente que o cálculo não usa o preço cheio.
- **Zero dependência externa** — coerente com ADR-001 e com a exigência §5.2 do enunciado.
- **A modelagem financeira já está pronta para a liquidação.** Estados `EFETIVADO`/`RETIDO`/`ESTORNADO`
  e competência contábil (`AAAA-MM`) existem; ligar um gateway seria acrescentar um adaptador, não
  redesenhar o domínio.
- **Disputa tem efeito financeiro real** (retenção e estorno), o que torna a fila do admin uma
  funcionalidade com consequência, não uma tela decorativa.

### Negativas

- **O sistema não sabe se o pagamento aconteceu de fato.** `PAGO_PRESENCIAL` é declaração do prestador.
- **Não há penalidade financeira** para quem cancela em cima da hora, o que enfraquece o incentivo em
  relação a um marketplace real.
- **O extrato é informativo**, não um demonstrativo de repasse. O fechamento com o prestador seria
  manual.
- **Risco de bypass não é combatido.** Cliente e prestador podem combinar por fora e a plataforma não
  recebe. Em produção isso exigiria pagamento intermediado — que é exatamente o que ficou fora.

### Limites conhecidos

- Sem impostos, retenções, notas fiscais ou conciliação bancária.
- Sem tratamento de reembolso, porque não há cobrança a reembolsar.

## Revisão

Rever quando o projeto sair do escopo acadêmico. Ligar um gateway implicaria: (a) novo ADR para o
provedor escolhido; (b) estender a máquina de estados de `lancamento_comissao` com `LIQUIDADO`;
(c) reabrir QA-06 para decidir a penalidade financeira de cancelamento; (d) revisar `RN-33` na spec
antes de qualquer código, conforme a regra de ouro do projeto.
