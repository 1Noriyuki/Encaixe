# Encaixe

**Marketplace de horários ociosos para prestadores de serviço locais.**
Projeto Final de Modelagem de Software — Semestre 2026-2, Turma 04I.

Prestadores locais (salões, barbearias, clínicas de estética, personal trainers, oficinas) convivem com
buracos de última hora na agenda que geram receita zero e não podem ser estocados. O Encaixe publica
esses horários com **preço dinâmico** — o desconto cresce conforme o horário se aproxima, segundo uma
régua definida pelo próprio prestador —, intermedia a reserva com janela de confirmação, aplica
política de cancelamento e no-show com efeito em reputação, e cobra **comissão sobre cada agendamento
efetivamente concluído**.

> A especificação é a fonte de verdade do sistema: **[`docs/spec.md`](docs/spec.md)**.
> Divergência entre spec e código é falha de projeto, não detalhe menor.

---

## Como executar

**Requisito único: Node.js 24 ou superior.** Não há `npm install` obrigatório — o projeto não tem
dependências de runtime ([ADR-001](docs/adr/ADR-001-stack-tecnica.md)).

```bash
node --version      # precisa ser >= v24
npm run db:seed     # cria o banco e popula dados de demonstração
npm start           # http://localhost:3000
```

Para recomeçar do zero a qualquer momento:

```bash
npm run db:reset
```

Para rodar a suíte de testes:

```bash
npm test
```

### Contas de demonstração

Senha de todas: `senha1234`

| E-mail | Perfil | Serve para demonstrar |
|---|---|---|
| `admin@encaixe.dev` | Admin | Aprovação de prestador, fila de disputas, métricas, parâmetros |
| `renata@salao.dev` | Prestador | Política `LIBERAR`: reserva não confirmada volta para a busca |
| `marcos@barbearia.dev` | Prestador | Política `AUTOCONFIRMAR`: reserva não confirmada é aceita sozinha |
| `clinica@estetica.dev` | Prestador | Conta aguardando aprovação (fila do admin) |
| `diego@cliente.dev` | Cliente | Fluxo normal de busca e reserva |
| `bruna@cliente.dev` | Cliente | Conta **restrita** por reputação baixa (regra RN-12) |

---

## Roteiro de demonstração (5 minutos)

1. **Preço que cai sozinho** — abra `/buscar` sem login. Compare o horário mais distante com o mais
   próximo: mesmo serviço, preços diferentes. O cartão mostra o preço-base riscado, o percentual
   aplicado e quando cai o próximo degrau. *(RN-01, RN-03)*
2. **A régua inteira, desenhada** — clique num cartão para abrir a página do horário. A régua mostra
   cada degrau de preço até o início do atendimento, com o degrau vigente destacado, e a página
   explica a política de confirmação que vai valer se você reservar. Cada valor vem do domínio: a
   tela desenha, não calcula. *(RF-026, RF-027, RN-10)*
3. **Busca por linguagem natural** — no campo de descrição, digite
   *"preciso cortar cabelo hoje à tarde, corte masculino simples"*. O painel destacado mostra o que
   foi extraído (categoria, urgência, duração, janela) e a confiança. Os filtros ficam **editáveis**,
   viram etiquetas removíveis acima dos resultados, e dá para descartar a interpretação inteira: quem
   escolhe os horários é o sistema, não o modelo. *(RN-29, INV-14)*
4. **Reserva e trava de preço** — entre como `diego@cliente.dev` e reserve. O agendamento nasce
   `Aguardando confirmação`, com prazo visível. O valor fica travado ali. *(RN-04, RN-10)*
5. **Confirmação** — entre como o prestador dono do horário e confirme. Os contatos só aparecem
   depois disso. *(RNF-04)*
6. **A penalidade antes do clique** — como cliente, vá em *Cancelar agendamento*. A tela mostra a
   faixa, o efeito exato na reputação e se conta como ocorrência — **antes** de confirmar. *(RF-048)*
7. **Limite por reputação** — entre como `bruna@cliente.dev` e tente reservar dois horários. O segundo
   é barrado com a regra explicada. *(RN-12)*
8. **Painel do admin** — entre como `admin@encaixe.dev`: comissão acumulada, fila de disputas com SLA,
   contas em revisão, qualidade da extração por LLM e a trilha de auditoria completa.

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/spec.md`](docs/spec.md) | **Fonte de verdade.** Personas, backlog, 85 requisitos EARS, 34 regras de negócio, modelo de domínio, 14 casos de uso, invariantes e rastreabilidade |
| [`docs/plan.md`](docs/plan.md) | Plano técnico: camadas, ciclo de requisição, decisões de implementação, riscos |
| [`docs/tasks.md`](docs/tasks.md) | Tarefas atômicas prontas para virar issues, com estado e rastreio |
| [`docs/adr/`](docs/adr/) | 6 ADRs: stack, modelo de dados, uso de LLM, autenticação, escopo financeiro, fonte da marca |
| [`docs/identidade-visual/`](docs/identidade-visual/) | Guia de marca (símbolo, versões da logo, cores, tipografia, voz) e os arquivos SVG da logo, já aplicada no cabeçalho, no rodapé e no favicon |
| [`docs/specs/`](docs/specs/) | Spec-Driven Development: mapa ordenado de Specs, Specs individuais aprovadas antes da implementação e registro de cada etapa do processo |
| [`docs/seguranca.md`](docs/seguranca.md) | Modelo de ameaças, controles implementados, SSDLC e pendências assumidas |
| [`docs/testes.md`](docs/testes.md) | Estratégia de testes e evidências de qualidade |
| [`docs/review/`](docs/review/) | Revisão multidimensional: arquitetura, performance, segurança, observabilidade |

---

## O que torna o sistema não trivial

| Restrição do enunciado | Como é atendida |
|---|---|
| Múltiplos perfis | Três perfis com interesses conflitantes e matriz de permissões verificada no servidor |
| Persistência de estado | Quatro máquinas de estado persistidas (agendamento, horário, conta, disputa) |
| Fluxo não trivial | Publicar → precificar dinamicamente → reservar → confirmar/expirar → cancelar com penalidade → concluir → apurar comissão → avaliar → disputar |
| Regras de negócio explícitas | 34 regras numeradas na spec §6, separadas de detalhes técnicos, com 20+ parâmetros configuráveis |
| Uso estruturado de IA | LLM produz JSON validado por schema; a decisão de quais horários exibir é código determinístico |

Alguns detalhes de modelagem que valem a leitura:

- **Reputação é livro-razão, não campo.** A pontuação é a soma de eventos rastreáveis dentro de uma
  janela móvel — é o que permite uma disputa reverter uma penalidade sem inventar aritmética.
- **Penalidade assimétrica de propósito.** Cancelar como prestador dói mais que como cliente, porque
  quem publicou o horário assumiu o compromisso.
- **A consequência aparece antes da ação.** Nenhuma penalidade é surpresa: a tela de cancelamento
  mostra exatamente o delta que será aplicado.
- **A concorrência é resolvida no banco.** Duas reservas simultâneas do mesmo horário: um índice único
  parcial garante que só uma passe.

---

## Arquitetura em uma tela

```
interface/http   →  traduz HTTP, autentica, autoriza, renderiza    (nenhuma regra de negócio)
aplicacao        →  casos de uso UC-01..UC-14, orquestra e transaciona
dominio          →  regras puras RN-00..RN-33 (sem banco, sem rede, sem relógio real)
infra            →  SQLite, repositórios, LLM, auditoria, notificações
```

A camada visual mora junto: `interface/http/estilo.js` (o design system inteiro em tokens) e
`interface/http/interacoes.js` (revelação ao rolar, cabeçalho, contadores e trava de clique duplo)
são servidos como texto em `/estatico/`, sem etapa de build. O JavaScript é só acabamento — com ele
bloqueado o site continua inteiro, inclusive a navegação, que no celular vira uma trilha de abas
rolável em vez de um menu que precisa abrir. Arquivos binários
soltos em `public/` são servidos em `/estatico/<nome>`; as imagens do hero e da prévia de link estão descritas
em [`docs/imagem-hero.md`](docs/imagem-hero.md).

O domínio roda inteiro sem I/O — é por isso que as regras temporais são testáveis: o relógio é
injetável, e "faltam 90 minutos para o horário" vira um dado do teste.

---

## Configuração

| Variável | Padrão | Para que serve |
|---|---|---|
| `PORT` / `HOST` | `3000` / `127.0.0.1` | Endereço do servidor |
| `DB_PATH` | `dados/encaixe.db` | Arquivo do banco SQLite |
| `LLM_PROVIDER` | `simulado` | `simulado` (sem rede) ou `anthropic` |
| `LLM_MODELO` | `claude-opus-5` | Modelo usado pelo provedor real |
| `LLM_TIMEOUT_MS` | `15000` | Timeout da interpretação |
| `ANTHROPIC_API_KEY` | — | Necessária apenas com `LLM_PROVIDER=anthropic` |
| `ROTINAS_INTERVALO_MS` | `60000` | Intervalo do agendador de rotinas temporais |

Para usar o provedor real de LLM:

```bash
npm install @anthropic-ai/sdk     # dependência OPCIONAL
export ANTHROPIC_API_KEY=...
LLM_PROVIDER=anthropic npm start
```

Sem isso, o sistema roda completo com o provedor simulado — inclusive a busca por linguagem natural.

---

## Estado do projeto

MVP funcional. Suíte de testes: **141 testes automatizados**, todos verdes
(`npm test`). Cobertura por regra e evidências em [`docs/testes.md`](docs/testes.md).
