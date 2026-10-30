# Requisitos funcionais

> Este arquivo organiza os requisitos funcionais por capacidade. A redação normativa EARS, os rastros completos e os critérios de aceite estão em [`spec.md`](spec.md), seção 7.

## Convenções

- **Evento:** `QUANDO` algo acontecer, o sistema deve responder.
- **Estado:** `ENQUANTO` uma condição existir, o sistema deve manter um comportamento.
- **Indesejado:** `SE` uma condição inválida ocorrer, o sistema deve recusá-la.
- **Ubíquo:** comportamento obrigatório em todo o sistema.
- **Opcional:** comportamento disponível quando a funcionalidade estiver habilitada.

## RF-001 a RF-011 — Contas, autenticação e autorização

- Criar contas de cliente e prestador com e-mail único e senha válida.
- Criar prestador em `PENDENTE_APROVACAO` e colocá-lo na fila do admin.
- Autenticar contas não suspensas com sessão vinculada ao perfil.
- Recusar credenciais inválidas com mensagem genérica.
- Autorizar cada operação por perfil e titularidade, no servidor.
- Registrar tentativas de acesso negado na auditoria.
- Permitir aprovação ou reprovação de prestador; reprovação exige justificativa.
- Persistir perfil, região e categorias atendidas.
- Bloquear publicação enquanto perfil, serviço ou régua estiver incompleto.

## RF-012 a RF-023 — Serviços, régua e horários

- Cadastrar serviço com nome, categoria, duração, preço-base e preço mínimo.
- Validar duração múltipla de cinco minutos e relação entre preços.
- Publicar horário de prestador ativo com antecedência mínima.
- Recusar sobreposição com outro horário ativo.
- Impedir alteração de dados de horário já reservado ou confirmado.
- Salvar régua com faixas distintas, percentuais válidos e monotonicidade.
- Cancelar horário ainda livre sem penalidade.
- Permitir publicação em lote com resultado individual por entrada.

## RF-024 a RF-027 — Preço dinâmico

- Calcular o preço vigente usando a faixa aplicável à antecedência atual.
- Aplicar o piso do serviço e o teto global de desconto.
- Exibir preço-base, preço vigente, percentual e próximo degrau.
- Oferecer simulador sem persistir alterações.

## RF-028 a RF-038 — Busca e descoberta

- Buscar por categoria, região e janela de horário.
- Exibir somente horários publicados, futuros e de prestadores ativos.
- Ordenar por preço, proximidade ou reputação com desempate determinístico.
- Interpretar descrição em linguagem natural em objeto estruturado.
- Usar a saída do LLM apenas como filtros de entrada.
- Persistir texto, saída, confiança, modelo e desfecho da interpretação.
- Pedir confirmação quando a confiança for baixa ou a categoria for inválida.
- Degradar para busca por filtros em erro, timeout ou formato inválido do LLM.

## RF-039 a RF-047 — Reserva e confirmação

- Permitir reserva somente a cliente elegível, dentro da antecedência e do limite de reputação.
- Criar agendamento `PENDENTE_CONFIRMACAO`, bloquear o horário e travar o preço.
- Garantir que apenas uma reserva concorrente seja aceita.
- Permitir confirmação ou recusa do prestador; recusa exige motivo.
- Expirar reserva conforme a política `LIBERAR` ou `AUTOCONFIRMAR`.
- Liberar ou ocupar o horário conforme o desfecho e a antecedência restante.
- Informar o limite vigente ao cliente restrito.

## RF-048 a RF-057 — Cancelamento, no-show e revisão

- Exibir a faixa e o efeito da penalidade antes do cancelamento.
- Aplicar políticas diferentes para cancelamento do cliente e do prestador.
- Validar janela de no-show e aplicar penalidade à parte ausente.
- Encaminhar acusação mútua diretamente para disputa sem penalidade automática.
- Mover prestador com ocorrências repetidas ou conta com baixa reputação para revisão.

## RF-058 a RF-070 — Conclusão, comissão, avaliação e reputação

- Concluir atendimento somente após seu fim e registrar estado de cobrança.
- Criar comissão sobre o valor travado usando percentual vigente na conclusão.
- Concluir automaticamente após o prazo configurado.
- Exibir extrato com valores brutos, comissão, líquido e retidos separados.
- Exibir métricas por período, categoria e prestador.
- Permitir avaliação bilateral única dentro da janela configurada.
- Ocultar avaliações até ambas avaliarem ou a janela terminar.
- Registrar eventos de reputação e exibir reputação agregada sem dados de contato.

## RF-071 a RF-085 — Disputas, administração e rastreabilidade

- Abrir disputa dentro do prazo, com motivo fechado e evidência obrigatória.
- Reter comissão e suspender efeitos reversíveis enquanto a disputa estiver aberta.
- Ordenar fila por SLA e destacar disputas vencidas.
- Resolver disputa com `MANTIDO`, `REVERTIDO`, `PARCIAL` ou `ARQUIVADO`.
- Revisar contas sinalizadas e decidir `ATIVO` ou `SUSPENSO` com justificativa.
- Alterar comissão com vigência futura, sem retroatividade.
- Notificar transições relevantes e manter central de notificações.
- Auditar transições, ações administrativas e interpretações de busca.

## Matriz de referência

| Capacidade | Requisitos | Casos de uso |
|---|---|---|
| Contas e acesso | RF-001 a RF-011 | UC-01 |
| Catálogo e publicação | RF-012 a RF-023 | UC-02 |
| Preço e busca | RF-024 a RF-038 | UC-03, UC-04 |
| Reserva | RF-039 a RF-047 | UC-05, UC-06, UC-07 |
| Consequências | RF-048 a RF-057 | UC-08, UC-11, UC-13 |
| Conclusão e reputação | RF-058 a RF-070 | UC-09, UC-10 |
| Administração | RF-071 a RF-085 | UC-12, UC-13, UC-14 |
