# tasks.md — Tarefas atômicas do Encaixe

> Derivado de [`spec.md`](spec.md) e [`plan.md`](plan.md).
> Cada linha é pequena o suficiente para virar **uma issue** no GitHub e ser fechada por **um PR**.
>
> Formato do título de issue sugerido: `[T-XX] descrição curta`
> Todo PR referencia a issue (`Closes #N`) e traz evidência de teste.

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-08-21 |
| Legenda de estado | ✅ concluída · 🔄 em andamento · ⬜ a fazer |

## Definição de pronto (vale para toda tarefa)

1. Issue vinculada e branch própria (`feat/T-12-preco-dinamico`).
2. Teste automatizado cobrindo a regra, com o identificador da regra no nome do teste.
3. `npm test` verde.
4. Spec atualizada **no mesmo PR** se a regra mudou.
5. Revisão de outro integrante antes do merge.

---

## Marco M0 — Fundação

| ID | Tarefa | Rastreio | Aceite | Estado |
|---|---|---|---|:--:|
| T-01 | Criar repositório, estrutura `/docs /src /tests /.specify` e README inicial | §9.1 enunciado | Estrutura existe e README aponta para `docs/` | ✅ |
| T-02 | Escrever `spec.md` (personas, backlog, EARS, domínio, casos de uso) | spec inteira | 85 RF, 34 RN, 14 UC, sem referência pendurada | ✅ |
| T-03 | ADR-001 (stack) e ADR-002 (modelo de dados) | QA-02 | Contexto, decisão e consequências em cada um | ✅ |
| T-04 | Esqueleto do projeto: `package.json`, scripts, `.gitignore` | ADR-001 | `npm start` e `npm test` respondem | ✅ |
| T-05 | Módulos base do domínio: `tempo`, `dinheiro`, `erros` | RNF-08, ADR-002 | Relógio injetável; centavos; `ErroDeRegra` carrega o ID da regra | ✅ |
| T-06 | Esquema físico `schema.sql` + conexão + transações | §9.2, ADR-002 | 18 tabelas; `npm run db:migrar` idempotente | ✅ |
| T-07 | Parâmetros do domínio como dados | RN-00 | Tabela `parametro` + metadados; nenhum número solto no código | ✅ |
| T-08 | Máquinas de estado com `assegurarTransicao` | §9.4–9.7, INV-13 | Transição não declarada lança erro | ✅ |

## Marco M1 — Núcleo transacional

### Contas e acesso

| ID | Tarefa | Rastreio | Aceite | Estado |
|---|---|---|---|:--:|
| T-09 | Cadastro de cliente e prestador | RF-001 a RF-003 | Prestador nasce `PENDENTE_APROVACAO`; e-mail duplicado não vaza dado | ✅ |
| T-10 | Hash de senha com `scrypt` e política mínima | RNF-02 | Nenhuma senha em texto puro; comparação em tempo constante | ✅ |
| T-11 | Login, sessão em cookie e logout | RF-004, RF-005 | Cookie `HttpOnly`+`SameSite`; mensagem de erro genérica | ✅ |
| T-12 | Autorização por perfil nas rotas + auditoria de acesso negado | RF-006, RF-007 | 403 e registro `ACESSO_NEGADO` | ✅ |
| T-13 | Proteção CSRF em todo POST autenticado | RNF-03 | Token por sessão; POST sem token → 403 | ✅ |
| T-14 | Aprovação e reprovação de prestador pelo admin | RF-008, RF-009 | Reprovação exige justificativa; titular notificado | ✅ |
| T-15 | Perfil do prestador com janela e política de expiração | RF-010, RN-10 | Janela entre 5 e 60 min; política `LIBERAR`/`AUTOCONFIRMAR` | ✅ |
| T-16 | Barreira "pode publicar" com lista do que falta | RF-011, RN-08 | Perfil incompleto lista pendências | ✅ |

### Catálogo e agenda

| ID | Tarefa | Rastreio | Aceite | Estado |
|---|---|---|---|:--:|
| T-17 | CRUD de serviços com validação | RF-012, RF-013 | Duração múltiplo de 5; piso ≤ preço-base | ✅ |
| T-18 | Régua de desconto com validação de monotonicidade | RF-018 a RF-020, RN-02 | Régua não monotônica é recusada com mensagem clara | ✅ |
| T-19 | Publicação de horário com antecedência mínima | RF-014, RF-015, RN-07 | Abaixo de P-03 é recusado | ✅ |
| T-20 | Bloqueio de sobreposição na agenda | RF-016, RN-06 | Conflito recusado apontando o horário conflitante | ✅ |
| T-21 | Snapshots de preço no horário | RN-05, ADR-002 | Editar o serviço não altera horário publicado | ✅ |
| T-22 | Publicação em lote | RF-023 | Falha parcial reportada item a item | ✅ |
| T-23 | Cancelar horário ainda livre | RF-022 | Horário com reserva não pode ser retirado por essa via | ✅ |

### Preço dinâmico

| ID | Tarefa | Rastreio | Aceite | Estado |
|---|---|---|---|:--:|
| T-24 | Cálculo do preço vigente por faixa | RF-024, RN-01 | Faixa aplicável é a de menor antecedência que cobre o instante | ✅ |
| T-25 | Piso de preço (prestador + teto da plataforma) | RF-021, RF-025, RN-03 | Preço nunca fura o piso; sinaliza desconto máximo | ✅ |
| T-26 | Exibir economia e próximo degrau | RF-026 | Mostra percentual, valor economizado e quando cai de novo | ✅ |
| T-27 | Simulador da régua | RF-027 | Projeta preço por faixa sem persistir | ✅ |

### Busca e reserva

| ID | Tarefa | Rastreio | Aceite | Estado |
|---|---|---|---|:--:|
| T-28 | Busca por categoria, região e janela | RF-028 a RF-030 | Só `PUBLICADO`, futuro e de prestador `ATIVO` | ✅ |
| T-29 | Ordenação com desempate determinístico | RF-031 | Ordem estável entre execuções | ✅ |
| T-30 | Reserva com preço travado e bloqueio do horário | RF-039, RF-040, RN-04 | Valor travado não muda depois | ✅ |
| T-31 | Exclusividade sob concorrência | RF-041, INV-01 | Segunda reserva simultânea é recusada | ✅ |
| T-32 | Limite de reservas simultâneas por reputação | RF-047, RN-12 | Cliente restrito é barrado na segunda reserva | ✅ |
| T-33 | Confirmação e recusa pelo prestador | RF-042 a RF-044 | Recusa exige motivo e libera o horário | ✅ |
| T-34 | Expiração automática com as duas políticas | RF-045, RF-046, RN-10 | `LIBERAR` devolve à busca; `AUTOCONFIRMAR` confirma | ✅ |
| T-35 | ADR-004 (autenticação) | QA-04 | Registrado com limites conhecidos | ✅ |

## Marco M2 — Regras de consequência

| ID | Tarefa | Rastreio | Aceite | Estado |
|---|---|---|---|:--:|
| T-36 | Prévia de cancelamento antes da confirmação | RF-048, RNF-11 | Tela mostra faixa e delta exatos que serão aplicados | ✅ |
| T-37 | Cancelamento do cliente por faixa | RF-049, RN-18 | Três faixas com deltas 0/−3/−6 | ✅ |
| T-38 | Cancelamento do prestador com penalidade agravada | RF-050, RN-19 | Deltas −1/−5/−10; horário vai a `CANCELADO` | ✅ |
| T-39 | Registro de no-show com janela válida | RF-052 a RF-054, RN-20 | Fora da janela é recusado com o prazo explicado | ✅ |
| T-40 | Acusação mútua vai para disputa sem penalidade | RF-055 | Nenhum lado perde ponto; disputa criada | ✅ |
| T-41 | Reputação como livro-razão de eventos | RF-069, RN-23, INV-08 | Reputação = soma dos eventos na janela, limitada a [0,100] | ✅ |
| T-42 | Revisão automática por reputação | RF-057, RN-22 | Abaixo de P-09 → `EM_REVISAO`; abaixo de P-10 → `RESTRITO` | ✅ |
| T-43 | Revisão por ocorrências repetidas do prestador | RF-056, RN-21 | P-12 ocorrências em 30 dias bloqueiam publicação | ✅ |
| T-44 | Conclusão do atendimento com estado de cobrança | RF-058, RN-33 | Só após o fim do horário | ✅ |
| T-45 | Apuração de comissão sobre o valor final | RF-059, RN-14, RN-15 | `bruto = comissão + líquido`; base é o valor travado | ✅ |
| T-46 | Conclusão automática após o prazo | RF-060 | Sem contestação em P-17 → conclui e apura | ✅ |
| T-47 | Extrato do prestador com retidos separados | RF-061, RF-062 | Itens `RETIDO` fora do total | ✅ |
| T-48 | Avaliação bilateral com janela e unicidade | RF-065 a RF-067, RN-24 | Uma avaliação por parte, dentro de P-14 | ✅ |
| T-49 | Revelação cega das avaliações | RF-068, RN-25 | Notas só aparecem com ambas ou com a janela encerrada | ✅ |
| T-50 | ADR-005 (escopo financeiro) | QA-05 | Registrado com limites conhecidos | ✅ |

## Marco M3 — Administração e IA

| ID | Tarefa | Rastreio | Aceite | Estado |
|---|---|---|---|:--:|
| T-51 | Abertura de disputa com evidência obrigatória | RF-071 a RF-073, RN-26 | Sem evidência ou fora do prazo é recusada | ✅ |
| T-52 | Retenção de comissão e suspensão de penalidades | RN-17, INV-12 | Lançamento vira `RETIDO` ao abrir disputa | ✅ |
| T-53 | Fila de disputas ordenada por SLA | RF-074, RF-075 | Fora do SLA fica destacado | ✅ |
| T-54 | Resolução com os quatro desfechos | RF-076, RF-077, RN-27 | `MANTIDO`/`REVERTIDO`/`PARCIAL`/`ARQUIVADO` com efeitos distintos | ✅ |
| T-55 | Fila de revisão de contas e decisão do admin | RF-078, RF-079 | Decisão exige justificativa e notifica o titular | ✅ |
| T-56 | Painel de métricas com recorte | RF-063, RF-064 | Comissão, ticket médio, taxas de cancelamento e no-show | ✅ |
| T-57 | Configuração de comissão por categoria | RF-080, RF-081 | Vale só para conclusões futuras | ✅ |
| T-58 | Tela de parâmetros do domínio | RN-00 | Alterável sem deploy, com faixa validada | ✅ |
| T-59 | Contrato do provedor de LLM + validação de saída | RN-29, RNF-12 | Saída fora do formato vira `FALHA`, não exceção | ✅ |
| T-60 | Provedor simulado determinístico | ADR-003 | Sistema funciona sem chave e sem rede | ✅ |
| T-61 | Provedor Anthropic com JSON Schema | ADR-003 | `claude-opus-5`, `output_config.format`, timeout configurável | ✅ |
| T-62 | Limiar de confiança e confirmação de filtros | RF-035, RF-036, RN-30 | Confiança baixa ou categoria inválida pedem confirmação | ✅ |
| T-63 | Degradação segura na falha do LLM | RF-037, RF-038, RN-31 | Busca por filtros continua funcionando | ✅ |
| T-64 | Persistência e telemetria das interpretações | RF-034, RN-32 | Painel mostra taxa de sucesso e de correção | ✅ |
| T-65 | ADR-003 (uso de LLM) | QA-03 | Registrado com fronteira e limites | ✅ |
| T-66 | Notificações por evento e central do usuário | RF-082, RF-083 | Toda transição relevante gera aviso | ✅ |
| T-67 | Trilha de auditoria e tela do admin | RF-084, RF-085, INV-13 | Toda transição registrada com ator e correlação | ✅ |

## Marco M4 — Fechamento

| ID | Tarefa | Rastreio | Aceite | Estado |
|---|---|---|---|:--:|
| T-68 | Suíte de testes de domínio | RNF-06 | Toda regra da §6 com teste nomeado pela regra | ✅ |
| T-69 | Testes de integração dos fluxos completos | AC-03 a AC-12 | UC-03 → UC-12 ponta a ponta | ✅ |
| T-70 | Testes da camada HTTP | AC-01, RF-006, RF-007 | Autorização, CSRF e escape de saída | ✅ |
| T-71 | `plan.md` e `tasks.md` | §7 enunciado | Derivados da spec, com rastreabilidade | ✅ |
| T-72 | Documento de segurança e SSDLC | §7 enunciado | Ameaças, controles e pendências assumidas | ✅ |
| T-73 | Documento de estratégia de testes e evidências | §7 enunciado | Níveis, cobertura por regra, como reproduzir | ✅ |
| T-74 | Revisão multidimensional em `docs/review` | §7 enunciado | Arquitetura, performance, segurança, observabilidade + ações | ✅ |
| T-75 | README com visão geral e instruções | §9.1 enunciado | `git clone && npm start` funciona | ✅ |
| T-76 | Dados de demonstração pelos serviços de aplicação | AC-01 a AC-14 | Seed passa pelas mesmas regras da interface | ✅ |

---

## Backlog não priorizado (fora do MVP)

| ID | Tarefa | Motivo de estar fora | Rastreio |
|---|---|---|---|
| T-80 | Rate limiting no login | Sem exposição pública no MVP | `docs/seguranca.md` |
| T-81 | CSRF em login e cadastro (sessão anônima) | Risco residual aceito | ADR-004 |
| T-82 | Recuperação de senha por e-mail | Depende de serviço de e-mail | §2.2 |
| T-83 | Upload real de arquivo em evidência de disputa | QA-09 decidiu texto + URL | QA-09 |
| T-84 | Plano premium com destaque na busca | Receita secundária | §1.3 |
| T-85 | Migrations versionadas | Esquema ainda evolui por recriação | ADR-001 |
| T-86 | Conjunto de referência para medir a extração do LLM | Telemetria de desfecho basta no MVP | ADR-003 |
| T-87 | Recorrência de agenda semanal | Escopo | §2.2 |

---

## Distribuição sugerida por integrante

Para a avaliação de participação individual (§9.2 do enunciado), as trilhas abaixo têm interfaces
claras entre si e podem ser tocadas em paralelo:

| Trilha | Tarefas | Interface com as outras |
|---|---|---|
| **A — Domínio e financeiro** | T-05, T-07, T-08, T-24 a T-27, T-41, T-44 a T-47, T-57 | Exporta funções puras; não conhece banco |
| **B — Transação e consequência** | T-19 a T-23, T-30 a T-34, T-36 a T-40, T-48, T-49 | Consome o domínio da trilha A |
| **C — Acesso, admin e IA** | T-09 a T-16, T-51 a T-67 | Consome os casos de uso das trilhas A e B |

Documentação (T-71 a T-75) e testes (T-68 a T-70) são responsabilidade compartilhada: quem escreve a
regra escreve o teste dela.
