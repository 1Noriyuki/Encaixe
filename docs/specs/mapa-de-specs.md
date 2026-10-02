# Mapa ordenado de Specs — Encaixe

> Etapa 1 do roteiro de Spec-Driven Development (*Prompt de apoio para SDD*): decomposição da baseline
> em Specs implementáveis. **Este documento é só o índice.** O conteúdo completo de cada Spec será gerado
> uma por vez, depois da aprovação humana deste mapa.

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-10-01 |
| Status | **Aprovado** pela equipe em 2026-10-01, na ordem proposta (sem reordenação). OPEN-01 e OPEN-02 ainda sem decisão |
| Specs geradas | [SPEC-001](SPEC-001-fundacao.md) · [SPEC-002](SPEC-002-cadastro-e-autenticacao.md) |
| Registro do processo | [`registro-sdd.md`](registro-sdd.md) |
| Baseline analisada | `docs/spec.md` v0.1.3 · `docs/plan.md` v1.0.0 · ADR-001 a ADR-005 · `.specify/memory/constitution.md` · `docs/tasks.md` · `docs/testes.md` · `docs/seguranca.md` · `docs/review/revisao-multidimensional.md` · `README.md` |

### Convenções de rastreio

| Sigla no roteiro | Equivalente na baseline |
|---|---|
| RF | `RF-001` a `RF-085` (spec §7) |
| RB (regra de negócio) | `RN-00` a `RN-33` (spec §6). A baseline usa o prefixo **RN**, e este mapa mantém os IDs originais (ver OPEN-02) |
| RNF | `RNF-01` a `RNF-14` (spec §8) |
| Caso de uso | `UC-01` a `UC-14` (spec §10) |
| Entidades | Modelo de domínio (spec §9.2) |
| Drivers arquiteturais | Restrições do enunciado listadas na spec §1.5 (`R-6.1` a `R-6.5`) e princípios da constituição (`C-I` a `C-X`). A baseline não tem uma seção formal de drivers (ver OPEN-03) |
| ADR | `ADR-001` a `ADR-005` |

---

## 1. Análise da baseline

### 1.1 Principais comportamentos do sistema

1. Gestão de contas: cadastro, autenticação, autorização por perfil e titularidade, aprovação de prestador.
2. Catálogo do prestador: serviços, régua de desconto e perfil com elegibilidade para publicar.
3. Oferta: publicação de horários vagos e preço vigente que cai conforme o horário se aproxima.
4. Descoberta: busca determinística por filtros e busca por linguagem natural com o LLM só interpretando.
5. Transação: reserva com preço travado, confirmação/recusa e expiração automática.
6. Consequências: cancelamento com penalidade por faixa, no-show e revisão automática de contas.
7. Desfecho financeiro: conclusão, apuração de comissão e extrato.
8. Confiança: reputação como livro-razão e avaliação bilateral com revelação cega.
9. Moderação: disputas com retenção de comissão, revisão de contas, métricas e parâmetros.
10. Transversais: notificações, trilha de auditoria e rotinas temporais.

### 1.2 Dependências entre comportamentos

```
Contas ──► Autorização ──► Aprovação ──► Perfil/Catálogo ──► Publicação ──► Preço ──► Busca
                                                                                       │
Reputação ◄────────────────────────────────────────────────────────────────────► Reserva
   ▲                                                                                   │
   └── Cancelamento / No-show / Avaliação / Disputa ◄── Confirmação ◄── Expiração ◄────┘
                                │
                     Conclusão ──► Comissão ──► Extrato / Métricas
```

- A **reserva** depende da reputação (RN-12 usa o limiar P-10) e do preço vigente (RN-04).
- **Cancelamento, no-show, avaliação e disputa** produzem eventos de reputação, por isso o livro-razão vem antes deles.
- O **extrato** depende da disputa (RF-062 exclui lançamentos `RETIDO`), por isso vem depois dela.
- A **busca por LLM** depende da busca por filtros (RN-29: o sistema reaproveita o mesmo filtro determinístico).

### 1.3 Regras de negócio e invariantes associados

- 34 regras (RN-00 a RN-33) e 14 invariantes (INV-01 a INV-14), todos referenciados no mapa abaixo.
- Os invariantes de maior risco são INV-01 (exclusividade da reserva), INV-06 (bruto = comissão + líquido),
  INV-08 (reputação = soma dos eventos) e INV-13 (toda transição auditada).

### 1.4 Requisitos não funcionais aplicáveis

Nenhum RNF virou Spec independente. Cada um foi associado às Specs em que se aplica:

| RNF | Natureza | Specs em que é verificado |
|---|---|---|
| RNF-01 Persistência | transversal | todas; estabelecido em SPEC-001 |
| RNF-02 Autenticação e sessão | localizado | SPEC-002 |
| RNF-03 Autorização no servidor | transversal | SPEC-003 e toda Spec com operação autenticada |
| RNF-04 Privacidade | localizado | SPEC-015, SPEC-021 |
| RNF-05 Desempenho | localizado | SPEC-013, SPEC-028 |
| RNF-06 Testes automatizados | transversal | todas (Definition of Done) |
| RNF-07 Observabilidade e auditoria | transversal | SPEC-001, SPEC-029 |
| RNF-08 Consistência temporal | transversal | SPEC-001 e toda Spec com regra temporal |
| RNF-09 Concorrência | localizado | SPEC-014 |
| RNF-10 Configurabilidade | transversal | SPEC-001, SPEC-027 |
| RNF-11 Usabilidade (celular e consequência antes da ação) | transversal | SPEC-010, SPEC-013, SPEC-014, SPEC-017 |
| RNF-12 Portabilidade do LLM | localizado | SPEC-028 |
| RNF-13 Custo de IA | localizado | SPEC-028 |
| RNF-14 Documentação viva | transversal | todas (Definition of Done) |

### 1.5 Restrições e decisões arquiteturais já tomadas

| Decisão | Fonte |
|---|---|
| Node.js 24 sem dependências de runtime; SDK da Anthropic opcional | ADR-001 |
| SQLite relacional, dinheiro em centavos, tempo em UTC, invariantes no domínio **e** no banco | ADR-002, C-VI |
| LLM só produz filtros validados por esquema; provedor simulado como padrão | ADR-003, C-VII |
| Sessão opaca em cookie, `scrypt`, autorização declarativa na rota e titularidade no caso de uso | ADR-004 |
| Comissão apurada sem gateway, pagamento só registrado | ADR-005 |
| Monólito em camadas (`interface → aplicacao → dominio`, `infra → dominio`), domínio sem I/O | plan §2, C-II |
| Rotinas temporais em dupla estratégia (agendador mais disparo sob demanda) | plan §5.2 (responde QA-08) |
| Parâmetros como dados, sem retroagir | RN-00, C-III |

### 1.6 Decisões que permanecem em aberto

Na própria spec (§13): **QA-01** (política de expiração, validar com o professor), **QA-06** (multa
financeira, fora do MVP), **QA-07** (régua por serviço ou por prestador) e **QA-09** (anexo real em
evidência). As demais estão listadas na seção 3 como `OPEN-XX`.

### 1.7 Inconsistências, lacunas e ambiguidades

Todas estão registradas na **seção 3**. Nenhuma foi resolvida silenciosamente neste mapa.

---

## 2. Mapa de Specs

> Ordem de implementação: cada Spec só exige comportamento estabelecido por Specs anteriores.

### SPEC-001 — Fundação: parâmetros, máquinas de estado e trilha de auditoria

- **Objetivo:** estabelecer a base estrutural que todas as capacidades usam. Parâmetros do domínio lidos como dados, transições de estado declaradas e validadas, e toda transição registrada na auditoria.
- **Valor:** garante desde o início que nenhum número de regra fica solto no código e que nenhuma transição acontece sem registro.
- **RF:** RF-084 (registro da transição)
- **RB:** RN-00
- **RNF:** RNF-01, RNF-07, RNF-08, RNF-10
- **UC/fluxo:** transversal (máquinas de estado da spec §9.4 a §9.7)
- **Entidades:** `ParametroSistema`, `LogAuditoria`
- **Invariantes:** INV-13
- **Drivers:** R-6.2, R-6.4, C-III, C-VI, C-IX
- **ADRs:** ADR-001, ADR-002
- **Dependências:** nenhuma
- **Justificativa da posição:** Spec técnica exigida pelos artefatos de arquitetura (plan §5.1, §5.4 e §6; ADR-002). Sem ela, todas as Specs seguintes teriam de inventar a própria forma de ler parâmetros e de auditar transições.

### SPEC-002 — Cadastro e autenticação

- **Objetivo:** permitir que visitantes criem conta de cliente ou prestador e que usuários autentiquem e encerrem a sessão.
- **Valor:** é a porta de entrada dos três perfis.
- **RF:** RF-001, RF-002, RF-003 (estado inicial), RF-004, RF-005
- **RB:** RN-28 (estado `PENDENTE_APROVACAO`)
- **RNF:** RNF-02, RNF-03
- **UC/fluxo:** UC-01 (passos 1–2, exceção 1a)
- **Entidades:** `Usuario`, `PerfilCliente`, `PerfilPrestador`
- **Drivers:** R-6.1
- **ADRs:** ADR-004
- **Dependências:** SPEC-001
- **Justificativa da posição:** toda capacidade posterior exige um usuário autenticado.

### SPEC-003 — Autorização por perfil e titularidade

- **Objetivo:** negar no servidor toda operação fora da matriz de permissões (spec §4.5) ou sobre recurso de outro titular, e registrar a tentativa.
- **Valor:** separação real entre os perfis, verificável e auditável.
- **RF:** RF-006, RF-007
- **RB:** nenhuma específica (a matriz §4.5 é a fonte)
- **RNF:** RNF-03, RNF-07
- **UC/fluxo:** transversal
- **Entidades:** `Usuario`, `LogAuditoria`
- **Drivers:** R-6.1, C-IX
- **ADRs:** ADR-004
- **Dependências:** SPEC-001, SPEC-002
- **Justificativa da posição:** precisa existir antes de qualquer operação de negócio protegida. É uma capacidade observável (403 mais registro), não um detalhe técnico.

### SPEC-004 — Notificações por evento e central do usuário

- **Objetivo:** gerar notificações nas transições que afetam o usuário e oferecer a central com marcação de lida.
- **Valor:** as partes ficam sabendo do que aconteceu sem depender de canal externo.
- **RF:** RF-082, RF-083
- **RB:** nenhuma específica
- **RNF:** RNF-11
- **UC/fluxo:** transversal
- **Entidades:** `Notificacao`
- **Drivers:** R-6.3
- **ADRs:** nenhum
- **Dependências:** SPEC-002
- **Justificativa da posição:** quase todo UC termina com "notifica a parte". A capacidade precisa existir antes do primeiro UC que notifica (SPEC-005).

### SPEC-005 — Aprovação e reprovação de prestador

- **Objetivo:** admin aprova ou reprova cadastros de prestador, com justificativa obrigatória na reprovação.
- **Valor:** só prestadores legítimos chegam ao marketplace.
- **RF:** RF-003 (fila de moderação), RF-008, RF-009
- **RB:** RN-28 (aprovação)
- **RNF:** RNF-03
- **UC/fluxo:** UC-01 (passos 3–5, alternativo 4a)
- **Entidades:** `Usuario`, `PerfilPrestador`
- **Drivers:** R-6.1, R-6.2
- **ADRs:** ADR-004
- **Dependências:** SPEC-002, SPEC-003, SPEC-004
- **Justificativa da posição:** prestador não aprovado não publica (RN-08). Precisa vir antes do catálogo.

### SPEC-006 — Reputação como livro-razão e classificação automática da conta

- **Objetivo:** reputação derivada exclusivamente de eventos dentro da janela P-20, limitada a [0, 100], com classificação automática da conta (`RESTRITO`, `EM_REVISAO`) e notificação.
- **Valor:** cria a "moeda de conduta" da qual dependem reserva, cancelamento, no-show, avaliação e disputa.
- **RF:** RF-057, RF-069
- **RB:** RN-22, RN-23 (cálculo e janela; os eventos concretos chegam nas Specs que os geram)
- **RNF:** RNF-01, RNF-08
- **UC/fluxo:** UC-13 (gatilho por reputação)
- **Entidades:** `Usuario`, `EventoReputacao`
- **Invariantes:** INV-07, INV-08
- **Drivers:** R-6.2, R-6.4
- **ADRs:** ADR-002 (livro-razão)
- **Dependências:** SPEC-001, SPEC-002, SPEC-004
- **Justificativa da posição:** a reserva (SPEC-014) já precisa do estado `RESTRITO` para aplicar RN-12. Por isso o livro-razão vem antes de qualquer Spec que gere ou leia eventos de reputação.

### SPEC-007 — Catálogo de serviços do prestador

- **Objetivo:** o prestador cadastra serviços com categoria, duração, preço-base e preço mínimo validados.
- **Valor:** o que o prestador vende passa a existir no sistema.
- **RF:** RF-012, RF-013
- **RB:** RN-03 (preço mínimo como piso declarado)
- **RNF:** RNF-03
- **UC/fluxo:** UC-02 (pré-condição "serviço cadastrado")
- **Entidades:** `Servico`, `CategoriaServico`
- **Drivers:** R-6.4
- **ADRs:** ADR-002 (centavos)
- **Dependências:** SPEC-005
- **Justificativa da posição:** perfil completo (RN-08) e publicação (RF-014) exigem serviço.

### SPEC-008 — Régua de desconto e simulador

- **Objetivo:** o prestador define e valida a régua (faixas distintas, teto P-05, monotonicidade) e simula o preço em cada faixa sem persistir.
- **Valor:** o prestador controla quanto desconto aceita dar, sem desvalorizar o preço.
- **RF:** RF-018, RF-019, RF-020, RF-027
- **RB:** RN-02
- **RNF:** RNF-11
- **UC/fluxo:** UC-02 (passos 5–6, alternativo 5a)
- **Entidades:** `ReguaDesconto`, `FaixaDesconto`
- **Drivers:** R-6.4
- **ADRs:** nenhum
- **Dependências:** SPEC-005, SPEC-007 (o simulador usa o preço de um serviço)
- **Justificativa da posição:** perfil completo exige régua válida. A régua precisa existir antes da publicação.

### SPEC-009 — Perfil do prestador e elegibilidade para publicar

- **Objetivo:** o prestador completa o perfil (nome de exibição, descrição, região, categorias, janela P-01, política P-02), e o sistema lista o que falta para poder publicar.
- **Valor:** o prestador sabe exatamente por que ainda não pode publicar.
- **RF:** RF-010, RF-011
- **RB:** RN-08, RN-10 (configuração de P-01/P-02 pelo prestador)
- **RNF:** RNF-11
- **UC/fluxo:** UC-01 (passo 6)
- **Entidades:** `PerfilPrestador`, `Regiao`
- **Drivers:** R-6.4, C-VIII
- **ADRs:** nenhum
- **Dependências:** SPEC-005, SPEC-007, SPEC-008
- **Justificativa da posição:** a lista de pendências de RF-011 verifica serviço e régua, que precisam existir antes.

### SPEC-010 — Publicação de horário vago

- **Objetivo:** prestador elegível publica um horário com antecedência mínima P-03, sem sobreposição, herdando duração e preço e congelando os snapshots.
- **Valor:** o buraco na agenda vira oferta.
- **RF:** RF-014, RF-015, RF-016
- **RB:** RN-06, RN-07 (publicação), RN-08, RN-21 (bloqueio por `EM_REVISAO`, só a leitura do estado)
- **RNF:** RNF-08, RNF-11
- **UC/fluxo:** UC-02 (passos 1–4 e 7, exceções 3a, 4a, 1a)
- **Entidades:** `HorarioVago`, `Servico`, `ReguaDesconto`
- **Invariantes:** INV-02
- **Drivers:** R-6.2, R-6.3
- **ADRs:** ADR-002 (snapshots)
- **Dependências:** SPEC-009
- **Justificativa da posição:** é a primeira oferta concreta. Preço vigente e busca dependem dela.

### SPEC-011 — Preço dinâmico do horário

- **Objetivo:** calcular o preço vigente pela faixa aplicável e pelo piso (o mais restritivo entre o preço mínimo e o teto P-05) e exibir economia e próximo degrau.
- **Valor:** o diferencial do produto: o cliente vê o preço cair conforme o horário se aproxima.
- **RF:** RF-021, RF-024, RF-025, RF-026
- **RB:** RN-01, RN-03
- **RNF:** RNF-08
- **UC/fluxo:** UC-02 (passo 8), UC-03 (passos 3 e 5)
- **Entidades:** `HorarioVago`, `FaixaDesconto`, `Servico`
- **Drivers:** R-6.4, C-II
- **ADRs:** ADR-002
- **Dependências:** SPEC-008, SPEC-010
- **Justificativa da posição:** busca (SPEC-013) e reserva (SPEC-014) usam o mesmo cálculo (plan §5.5). Ele precisa estar estabelecido antes delas.

### SPEC-012 — Manutenção da agenda: cancelar horário livre e publicar em lote

- **Objetivo:** o prestador retira um horário `PUBLICADO` sem penalidade e publica vários horários de uma vez, com falha reportada item a item.
- **Valor:** agilidade para o prestador (persona: publicar em menos de 1 minuto).
- **RF:** RF-022, RF-023
- **RB:** RN-06, RN-07 (reaplicadas a cada item do lote)
- **RNF:** RNF-11
- **UC/fluxo:** UC-02 (alternativo 2a)
- **Entidades:** `HorarioVago`
- **Drivers:** R-6.2
- **ADRs:** nenhum
- **Dependências:** SPEC-010
- **Justificativa da posição:** estende a publicação. Prioridade S/C no backlog (US-11, US-12), então não bloqueia o fluxo principal.

### SPEC-013 — Busca de horários por filtros

- **Objetivo:** busca pública por categoria, região e janela, só com horários elegíveis e ordenação determinística com desempate pelo identificador.
- **Valor:** o cliente encontra o encaixe.
- **RF:** RF-028, RF-029, RF-030, RF-031
- **RB:** RN-07 (reserva), RN-28 (prestador não `ATIVO` fica fora)
- **RNF:** RNF-05 (busca em até 2 s), RNF-11
- **UC/fluxo:** UC-03
- **Entidades:** `HorarioVago`, `CategoriaServico`, `Regiao`, `Usuario`
- **Drivers:** R-6.3
- **ADRs:** nenhum
- **Dependências:** SPEC-006 (ordenar por reputação), SPEC-011
- **Justificativa da posição:** é o ponto de entrada da reserva e a base reaproveitada pela busca com LLM (SPEC-028).

### SPEC-014 — Reserva com preço travado e exclusividade

- **Objetivo:** o cliente elegível reserva um horário, trava o preço e bloqueia o horário de forma atômica, respeitando o limite de reservas simultâneas por reputação. Também barra a edição de horário reservado.
- **Valor:** o núcleo transacional do marketplace.
- **RF:** RF-017, RF-039, RF-040, RF-041, RF-047
- **RB:** RN-04, RN-05, RN-07, RN-09, RN-12, RN-13
- **RNF:** RNF-09, RNF-11
- **UC/fluxo:** UC-05
- **Entidades:** `Agendamento`, `HorarioVago`, `Usuario`
- **Invariantes:** INV-01, INV-03, INV-04
- **Drivers:** R-6.2, R-6.3
- **ADRs:** ADR-002 (índice único parcial)
- **Dependências:** SPEC-004, SPEC-006, SPEC-011, SPEC-013
- **Justificativa da posição:** cria o `Agendamento`, entidade central (spec §9.1) da qual todas as Specs seguintes dependem.

### SPEC-015 — Confirmação e recusa da reserva

- **Objetivo:** o prestador confirma (horário `OCUPADO`, contatos liberados) ou recusa com motivo (horário devolvido conforme P-04).
- **Valor:** o prestador mantém controle sobre quem atende.
- **RF:** RF-042, RF-043, RF-044
- **RB:** RN-11
- **RNF:** RNF-04
- **UC/fluxo:** UC-06
- **Entidades:** `Agendamento`, `HorarioVago`
- **Drivers:** R-6.3
- **ADRs:** ADR-004 (titularidade e visibilidade de contato)
- **Dependências:** SPEC-014
- **Justificativa da posição:** só depois do `CONFIRMADO` existem cancelamento com penalidade, no-show e conclusão.

### SPEC-016 — Expiração automática da reserva

- **Objetivo:** esgotado P-01 sem resposta, aplicar a política P-02 do prestador (`LIBERAR` ou `AUTOCONFIRMAR`), sem penalizar o cliente. As rotinas temporais rodam no processo e sob demanda.
- **Valor:** o horário não fica preso por um prestador que não responde.
- **RF:** RF-044, RF-045, RF-046
- **RB:** RN-10
- **RNF:** RNF-08
- **UC/fluxo:** UC-07
- **Entidades:** `Agendamento`, `HorarioVago`, `PerfilPrestador`
- **Drivers:** R-6.3
- **ADRs:** nenhum (estratégia de disparo em plan §5.2)
- **Dependências:** SPEC-015
- **Justificativa da posição:** é a primeira regra temporal sem ator humano. Estabelece o mecanismo de rotinas que SPEC-020 e SPEC-021 reaproveitam.

### SPEC-017 — Cancelamento de agendamento com penalidade progressiva

- **Objetivo:** cliente ou prestador cancela antes do início, vê a consequência exata antes de confirmar e recebe o delta da faixa. O horário tem tratamento assimétrico conforme quem cancelou.
- **Valor:** contém o comportamento oportunista (persona 4.3) sem surpresa para ninguém.
- **RF:** RF-048, RF-049, RF-050, RF-051
- **RB:** RN-18, RN-19, RN-23 (deltas de cancelamento)
- **RNF:** RNF-11 (consequência antes da confirmação)
- **UC/fluxo:** UC-08
- **Entidades:** `Agendamento`, `HorarioVago`, `EventoReputacao`
- **Drivers:** R-6.3, R-6.4, C-VIII
- **ADRs:** ADR-005 (penalidade só de reputação)
- **Dependências:** SPEC-006, SPEC-015
- **Justificativa da posição:** primeira fonte de ocorrências negativas, das quais SPEC-018 depende.

### SPEC-018 — Revisão automática por ocorrências do prestador

- **Objetivo:** com P-12 ocorrências negativas em 30 dias, a conta do prestador vai para `EM_REVISAO`, perde o direito de publicar e entra na fila do admin. Agendamentos confirmados são preservados.
- **Valor:** a plataforma detecta sozinha o prestador que está queimando clientes.
- **RF:** RF-056
- **RB:** RN-21
- **RNF:** RNF-07
- **UC/fluxo:** UC-08 (alternativo 7a), UC-13 (gatilho)
- **Entidades:** `Usuario`, `EventoReputacao`
- **Drivers:** R-6.4
- **ADRs:** nenhum
- **Dependências:** SPEC-017
- **Justificativa da posição:** pode ser validada só com cancelamentos. O no-show (SPEC-019) acrescenta outra fonte de ocorrências sem mudar a regra.

### SPEC-019 — Registro de no-show

- **Objetivo:** dentro da janela P-16, uma parte reporta a ausência da outra em agendamento `CONFIRMADO`. A parte ausente é penalizada, não há comissão e a contestação fica aberta até P-15.
- **Valor:** dá consequência à ausência, a maior quebra de confiança do marketplace.
- **RF:** RF-052, RF-053, RF-054
- **RB:** RN-16 (sem comissão), RN-20, RN-21 (ocorrência do prestador), RN-23
- **RNF:** RNF-08
- **UC/fluxo:** UC-11 (sem o alternativo 1a, que fica em SPEC-022, ver OPEN-07)
- **Entidades:** `Agendamento`, `EventoReputacao`
- **Drivers:** R-6.3
- **ADRs:** nenhum
- **Dependências:** SPEC-015, SPEC-018
- **Justificativa da posição:** a conclusão automática (SPEC-020) depende de "sem reporte de no-show", então o no-show vem antes.

### SPEC-020 — Conclusão do atendimento e apuração de comissão

- **Objetivo:** o prestador conclui após o fim do horário informando o estado de cobrança, ou o sistema conclui sozinho depois de P-17. Em ambos os casos é criado o lançamento com o percentual vigente e +1 de reputação para as partes.
- **Valor:** o fato gerador da receita da plataforma.
- **RF:** RF-058, RF-059, RF-060
- **RB:** RN-14, RN-15, RN-16, RN-23 (+1 por conclusão), RN-33
- **RNF:** RNF-01
- **UC/fluxo:** UC-09
- **Entidades:** `Agendamento`, `LancamentoComissao`, `CategoriaServico`
- **Invariantes:** INV-05, INV-06
- **Drivers:** R-6.3, R-6.4
- **ADRs:** ADR-002 (centavos), ADR-005
- **Dependências:** SPEC-016 (rotinas), SPEC-019
- **Justificativa da posição:** `CONCLUIDO` libera avaliação e disputa, que vêm em seguida.

### SPEC-021 — Avaliação bilateral, revelação cega e perfil público

- **Objetivo:** cada parte avalia a outra uma vez dentro de P-14. As notas ficam ocultas até as duas avaliarem ou a janela fechar. O perfil público mostra reputação e histórico agregado.
- **Valor:** a reputação passa a refletir a percepção das partes, sem avaliação por retaliação.
- **RF:** RF-065, RF-066, RF-067, RF-068, RF-070
- **RB:** RN-23 (deltas de avaliação), RN-24, RN-25
- **RNF:** RNF-04
- **UC/fluxo:** UC-10
- **Entidades:** `Avaliacao`, `EventoReputacao`, `Usuario`
- **Invariantes:** INV-09, INV-10
- **Drivers:** R-6.4
- **ADRs:** nenhum
- **Dependências:** SPEC-016 (rotina de revelação), SPEC-020
- **Justificativa da posição:** exige `CONCLUIDO`. RF-070 entra aqui porque mostra atendimentos concluídos e taxa de no-show, ambos já estabelecidos neste ponto.

### SPEC-022 — Abertura de disputa

- **Objetivo:** uma parte abre disputa com motivo de lista fechada e ao menos uma evidência, dentro de P-15. A comissão fica `RETIDA` e os efeitos reversíveis de reputação ficam suspensos. A acusação mútua de no-show também leva a `EM_DISPUTA`.
- **Valor:** canal formal de contestação, com efeito financeiro real.
- **RF:** RF-055, RF-071, RF-072, RF-073
- **RB:** RN-17, RN-20 (acusação mútua), RN-26
- **RNF:** RNF-07
- **UC/fluxo:** UC-11 (alternativo 1a), UC-12 (passos 1–4)
- **Entidades:** `Disputa`, `Evidencia`, `Agendamento`, `LancamentoComissao`
- **Invariantes:** INV-11, INV-12
- **Drivers:** R-6.2, R-6.3
- **ADRs:** ADR-005
- **Dependências:** SPEC-019, SPEC-020
- **Justificativa da posição:** exige `CONCLUIDO` ou `NO_SHOW_*`. Precisa existir antes da resolução e do extrato.

### SPEC-023 — Fila e resolução de disputas

- **Objetivo:** o admin vê a fila ordenada por SLA e valor, com as disputas fora do SLA destacadas, e resolve com `MANTIDO`, `REVERTIDO`, `PARCIAL` ou `ARQUIVADO` mais justificativa. O desfecho ajusta estado, reputação e comissão.
- **Valor:** o critério de decisão fica consistente e as consequências fecham.
- **RF:** RF-074, RF-075, RF-076, RF-077
- **RB:** RN-17, RN-23 (−8 e reversão), RN-27
- **RNF:** RNF-07
- **UC/fluxo:** UC-12 (passos 5–8, alternativos 6a e 6b, exceção 5a)
- **Entidades:** `Disputa`, `Agendamento`, `EventoReputacao`, `LancamentoComissao`
- **Drivers:** R-6.1, R-6.3
- **ADRs:** ADR-002 (reversão no livro-razão), ADR-005
- **Dependências:** SPEC-022
- **Justificativa da posição:** fecha o ciclo da disputa. Depende de decisões ainda abertas (OPEN-06).

### SPEC-024 — Extrato do prestador

- **Objetivo:** extrato por período com bruto, comissão e líquido, com os lançamentos `RETIDO` fora do total e mostrados à parte.
- **Valor:** o prestador enxerga o que recebeu e o que deve.
- **RF:** RF-061, RF-062
- **RB:** RN-17, RN-33
- **RNF:** RNF-03
- **UC/fluxo:** US-33 (sem UC próprio)
- **Entidades:** `LancamentoComissao`
- **Drivers:** R-6.4
- **ADRs:** ADR-005
- **Dependências:** SPEC-020, SPEC-023
- **Justificativa da posição:** RF-062 depende de `RETIDO` e `ESTORNADO`, estabelecidos pelas Specs de disputa.

### SPEC-025 — Revisão administrativa e suspensão de contas

- **Objetivo:** o admin vê a fila de contas `EM_REVISAO` com motivo, reputação e histórico, e decide reativar ou suspender com justificativa. A suspensão retira os horários publicados da busca.
- **Valor:** contas problemáticas aparecem sozinhas e têm desfecho registrado.
- **RF:** RF-078, RF-079
- **RB:** RN-21, RN-22, RN-28 (suspensão)
- **RNF:** RNF-03, RNF-07
- **UC/fluxo:** UC-13
- **Entidades:** `Usuario`, `EventoReputacao`, `HorarioVago`
- **Drivers:** R-6.1, R-6.2
- **ADRs:** ADR-004 (suspensão encerra o acesso)
- **Dependências:** SPEC-006, SPEC-018, SPEC-019
- **Justificativa da posição:** os dois gatilhos de revisão (reputação e ocorrências) já estão estabelecidos neste ponto.

### SPEC-026 — Métricas de comissão e percentual por categoria

- **Objetivo:** painel do admin com comissão acumulada, concluídos, ticket médio e taxas de cancelamento e no-show, com recorte por categoria ou prestador. Inclui a alteração do percentual por categoria com vigência futura.
- **Valor:** o admin acompanha a receita e ajusta a comissão sem reescrever a história.
- **RF:** RF-063, RF-064, RF-080, RF-081
- **RB:** RN-00 (não retroage), RN-14, RN-15
- **RNF:** RNF-10
- **UC/fluxo:** UC-14
- **Entidades:** `LancamentoComissao`, `CategoriaServico`, `Agendamento`
- **Drivers:** R-6.4
- **ADRs:** ADR-005
- **Dependências:** SPEC-017, SPEC-019, SPEC-020, SPEC-023
- **Justificativa da posição:** as métricas leem cancelamento, no-show e comissão, todos já estabelecidos.

### SPEC-027 — Administração dos parâmetros do domínio

- **Objetivo:** o admin altera os parâmetros globais da spec §6.1 dentro da faixa validada, sem deploy, com vigência só para fatos futuros.
- **Valor:** as regras são ajustáveis sem programador.
- **RF:** nenhum RF próprio (ver OPEN-09)
- **RB:** RN-00
- **RNF:** RNF-10
- **UC/fluxo:** UC-14 (extensão), nenhum UC dedicado
- **Entidades:** `ParametroSistema`
- **Drivers:** R-6.4, C-III
- **ADRs:** nenhum
- **Dependências:** SPEC-001, SPEC-003
- **Justificativa da posição:** depende só da fundação e da autorização. Fica no fim porque o sistema funciona com os valores padrão, mas pode ser antecipada se a equipe preferir.

### SPEC-028 — Busca por linguagem natural com LLM

- **Objetivo:** o texto livre vira um objeto estruturado validado por esquema. Com confiança baixa ou categoria inválida, o sistema pede confirmação. A busca em si é a mesma de SPEC-013. A falha do provedor degrada para o formulário, e toda interpretação é persistida.
- **Valor:** o cliente descreve o que precisa no próprio idioma, e o sistema continua decidindo.
- **RF:** RF-032, RF-033, RF-034, RF-035, RF-036, RF-037, RF-038
- **RB:** RN-29, RN-30, RN-31, RN-32
- **RNF:** RNF-05, RNF-12, RNF-13
- **UC/fluxo:** UC-04
- **Entidades:** `InterpretacaoBusca`, `CategoriaServico`, `Regiao`
- **Invariantes:** INV-14
- **Drivers:** R-6.5, C-VII
- **ADRs:** ADR-003
- **Dependências:** SPEC-013
- **Justificativa da posição:** a spec §5.3 a coloca deliberadamente depois do núcleo determinístico (se o cronograma apertar, o MVP continua completo sem ela).

### SPEC-029 — Trilha de auditoria consultável pelo admin

- **Objetivo:** registrar as ações administrativas e as interpretações do LLM e permitir que o admin reconstrua por que um resultado foi exibido ou uma decisão foi tomada.
- **Valor:** reconstrução ponta a ponta de qualquer desfecho (C-IX).
- **RF:** RF-084 (consulta), RF-085
- **RB:** RN-32
- **RNF:** RNF-07
- **UC/fluxo:** US-45 (sem UC próprio)
- **Entidades:** `LogAuditoria`, `InterpretacaoBusca`
- **Invariantes:** INV-13
- **Drivers:** C-IX
- **ADRs:** ADR-003
- **Dependências:** SPEC-001, SPEC-023, SPEC-025, SPEC-028
- **Justificativa da posição:** consolida registros produzidos por todas as Specs anteriores, então só pode ser validada por inteiro no fim.

---

## 3. Inconsistências, lacunas e decisões em aberto

Nenhum item abaixo foi resolvido neste mapa. Para cada um, a decisão pertence à equipe.

| ID | Tipo | Descrição | Afeta |
|---|---|---|---|
| OPEN-01 | Processo | **A implementação já existe** (`src/`, `tests/`, 141 testes) e `docs/tasks.md` marca as 76 tarefas como concluídas. O roteiro manda produzir as Specs **antes** da implementação. Decisão necessária: (a) tratar o código existente como candidato a ser verificado contra cada Spec aprovada, registrando divergências conforme a "Regra fundamental"; ou (b) descartar o código e implementar Spec por Spec | todas |
| OPEN-02 | Nomenclatura | O roteiro usa **RB** para regra de negócio e **INV-001** para invariantes por Spec. A baseline usa **RN-xx** e **INV-xx** globais (spec §9.8). Decisão necessária: manter os IDs da baseline (como neste mapa) ou renumerar | todas |
| OPEN-03 | Lacuna | A baseline não tem uma lista formal de **drivers arquiteturais**. Este mapa usou as restrições do enunciado (spec §1.5) e os princípios da constituição. Decisão necessária: aceitar essa leitura ou formalizar os drivers num artefato próprio | todas |
| OPEN-04 | Inconsistência spec × ADR · **resolvida na spec v0.1.4** (QA-02 a 05 e QA-08 marcadas como resolvidas; QA-10 continua aberta, ver OPEN-20) | A spec §13 ainda lista como abertas QA-02 a QA-05 (respondidas pelos ADR-001 a 005), QA-08 (respondida no plan §5.2) e QA-10 (o ADR-003 já cita `limite_interpretacoes_dia`). A §15 descreve passos já executados. Spec com status "em validação" | baseline |
| OPEN-05 | Inconsistência interna | A spec §6 afirma que "todo valor numérico é parâmetro", mas os **deltas de reputação** (RN-18, 19, 20, 23: −3, −6, −1, −5, −10, −12, −8, +1, +3…) e a **janela de 30 dias** de RN-21 não aparecem na tabela §6.1 | SPEC-006, 017, 018, 019, 021, 023 |
| OPEN-06 | Ambiguidade | Na máquina de estados do `Agendamento` (§9.4), `EM_DISPUTA → CONCLUIDO` vale para "MANTIDO **ou** REVERTIDO", e `REVERTIDO` também leva a `NO_SHOW_*`. O destino de `PARCIAL` não aparece, nem o efeito de cada desfecho numa disputa originada por acusação mútua | SPEC-023 |
| OPEN-07 | Lacuna | A acusação mútua de no-show (RF-055) leva a `EM_DISPUTA`, mas RN-26 e INV-11 exigem uma `Disputa` com motivo e ao menos uma evidência. Decisão necessária: quem abre essa disputa, com qual motivo e qual evidência | SPEC-019, SPEC-022 |
| OPEN-08 | Inconsistência interna | Na máquina de estados de `Usuario` (§9.6) faltam `ATIVO → SUSPENSO` e `RESTRITO → SUSPENSO`, previstos em RN-28 ("o admin pode suspender qualquer conta"). `ATIVO → RESTRITO` não diz que vale só para cliente, embora RN-22 diga, e a revisão A-01 tenha corrigido o código sem atualizar o diagrama | SPEC-006, SPEC-025 |
| OPEN-09 | Lacuna | A matriz §4.5 dá ao admin o poder de cancelar qualquer agendamento com justificativa e ao prestador o de "editar horário vago", mas não há RF nem UC para nenhum dos dois, nem penalidade definida para o cancelamento do admin. A edição de parâmetros pelo admin (RN-00, RNF-10) também não tem RF | SPEC-012, 017, 027 |
| OPEN-10 | Inconsistência interna | A §9.2 diz que `ReguaDesconto` tem "uma ativa por serviço". A QA-07 diz "régua por prestador, selecionável por horário" | SPEC-008, SPEC-010 |
| OPEN-11 | Lacuna | Nenhum RF define quem cria e mantém o catálogo de **categorias de serviço** e a lista controlada de **regiões** | SPEC-007, 009, 013 |
| OPEN-12 | Inconsistência RNF × ADR | RNF-02 exige "expiração por inatividade". O ADR-004 define `Max-Age` fixo de 12 h (expiração absoluta) | SPEC-002 |
| OPEN-13 | Lacuna | RNF-06 exige que a suíte rode em **integração contínua a cada pull request**. O repositório não tem CI configurado | todas (DoD) |
| OPEN-14 | Inconsistência interna | A exceção 3a de UC-09 ("existe disputa aberta: o lançamento nasce `RETIDO`") é impossível, porque RN-26 só permite disputa depois de `CONCLUIDO`. RF-073 manda reter o lançamento, mas disputa sobre `NO_SHOW_*` não tem lançamento | SPEC-020, SPEC-022 |
| OPEN-15 | Ambiguidade | O estado `RASCUNHO` de `HorarioVago` (§9.5) não tem RF que o crie. RF-014 cria o horário direto em `PUBLICADO` | SPEC-010 |
| OPEN-16 | Inconsistência interna | RF-010 persiste "categorias atendidas", atributo que não existe em `PerfilPrestador` (§9.2). RN-08 e RF-011 definem "perfil completo" com listas diferentes | SPEC-009 |
| OPEN-17 | Ambiguidade | RN-26 e RF-073 mandam "suspender os efeitos de reputação **ainda reversíveis**", sem definir quais são | SPEC-022 |
| OPEN-18 | Lacuna | RN-18 (faixa total): "o prestador pode converter em no-show se já estava a caminho". Não há RF nem UC para isso | SPEC-017, SPEC-019 |
| OPEN-19 | Lacuna | UC-07: "repetidas expirações contam como sinal de baixa responsividade, exibido ao admin em UC-13", sem métrica nem limiar definidos | SPEC-016, SPEC-025 |
| OPEN-20 | Divergência código × spec | Faixas de parâmetros em `src/dominio/parametros.js` diferentes da spec §6.1: P-07 mínimo de 1 h (spec: 0,5 h); P-12 dividido em P-12a/P-12b com janela de 7 a 90 dias (spec: fixa em 30); P-16 dividido em P-16a (5–60 min) e P-16b (6–72 h) (spec: sem faixa); limite do RNF-13 de 20/dia (1–200), ainda não definido na spec | SPEC-001, 018, 019, 028 |
| OPEN-21 | Ambiguidade | O prefixo `T-` designa tanto **tarefas** (`T-01`..`T-87` em `tasks.md`) quanto **testes** (`T-PRECO-01`, `T-CANCEL-04i`) | rastreabilidade |

---

## 4. Próximo passo

**Parada obrigatória.** Conforme o roteiro, este mapa não traz o conteúdo das Specs, código, banco de
dados nem endpoints, e não escolhe tecnologia.

Aguarda-se:

1. Aprovação (ou ajuste) da ordem e do recorte das 29 Specs.
2. Decisão sobre **OPEN-01** (o que fazer com a implementação existente), que muda o significado de
   todas as Specs seguintes.
3. Decisão sobre **OPEN-02** (nomenclatura), antes de gerar a primeira Spec.

Depois disso, o pedido seguinte será **"Gerar SPEC-001"**, uma Spec por vez.
