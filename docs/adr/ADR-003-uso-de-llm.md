# ADR-003 — Uso de LLM: o modelo interpreta, o sistema decide

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data | 2026-08-21 |
| Decisores | Equipe |
| Relacionado | [ADR-001](ADR-001-stack-tecnica.md) · spec §6.9 (RN-29 a RN-32), §10.5 (UC-04), INV-14 |

## Contexto

O cliente sabe descrever o que precisa em português corrido — *"preciso cortar cabelo hoje à tarde,
corte masculino simples"* — mas o sistema só sabe buscar por categoria, região e janela de horário.
Existe uma lacuna de tradução entre a linguagem do usuário e os filtros do banco.

O enunciado do projeto (§6.5) é preciso sobre o padrão exigido: *"a saída gerada produz dados
estruturados consumidos pelo sistema, e não só texto exibido ao usuário"*, e *"a decisão final é do
sistema, não do modelo"*.

O risco a evitar é o mais comum em projetos com IA: o modelo virar a regra de negócio. Se o LLM
escolhesse quais horários mostrar, o sistema deixaria de ser auditável — não haveria como explicar
por que um prestador apareceu e outro não, nem como testar a busca de forma determinística.

Um segundo risco é operacional: uma funcionalidade central que depende de serviço externo pago,
com latência variável e disponibilidade fora do nosso controle, no meio de uma demonstração.

## Decisão

**O LLM ocupa exatamente um ponto da arquitetura: transformar texto livre em um objeto estruturado
de filtros. Nada além disso.**

### Contrato

A saída é obrigada por JSON Schema (`output_config.format` na Messages API), restrita ao catálogo real:

```json
{
  "categoria_servico": "Cabelo e Barba",   // enum das categorias existentes no banco
  "duracao_estimada_min": 30,
  "urgencia": "ALTA",                       // ALTA | MEDIA | BAIXA
  "janela_inicio": "2026-08-21T18:00:00Z",
  "janela_fim":    "2026-08-21T21:00:00Z",
  "regiao": "Pinheiros",
  "confianca": 0.9
}
```

Esse objeto entra em `busca.buscarPorFiltros()` — a **mesma** função que o formulário de filtros usa.
A partir daí, seleção, filtro, precificação e ordenação são 100% determinísticos.

### O que o modelo nunca faz

- Não escolhe prestador.
- Não calcula preço nem desconto (isso é `RN-01`/`RN-03`, código puro em `src/dominio/precificacao.js`).
- Não altera estado de agendamento.
- Não decide a ordem dos resultados.

Isso está travado como invariante testável (**INV-14**) e verificado em `T-LLM-05`, que compara o
resultado da busca via IA com o resultado da busca manual usando os mesmos filtros: precisam ser idênticos.

### Modelo e parâmetros

| Item | Valor |
|---|---|
| Provedor padrão | `simulado` (nenhuma rede, nenhuma chave) |
| Provedor real | `anthropic`, via SDK oficial `@anthropic-ai/sdk` |
| Modelo | `claude-opus-5` |
| Esforço | `low` — extração curta e objetiva |
| Saída | `output_config.format` com JSON Schema (`type: "json_schema"`) |
| Timeout | `LLM_TIMEOUT_MS`, padrão 15 s |

### Três defesas obrigatórias

1. **Validação de formato** (`src/infra/llm/contrato.js`): nada entra no sistema sem passar por
   `validarSaida()`. Formato inesperado vira `FALHA`, não exceção.
2. **Limiar de confiança** (`RN-30`): abaixo de `P-19` (padrão 0,60), ou com categoria fora do
   catálogo, o sistema **mostra os filtros interpretados e pede confirmação antes de buscar**.
3. **Degradação segura** (`RN-31`): erro, timeout, recusa do modelo ou JSON quebrado derrubam a
   *interpretação*, nunca a busca. O usuário cai no formulário de filtros com um aviso.

### Rastreabilidade

Toda interpretação é persistida (`interpretacao_busca`): texto original, saída estruturada, confiança,
modelo usado e desfecho (`ACEITA`, `CORRIGIDA`, `DESCARTADA`). O painel do admin mostra a taxa de
sucesso, de baixa confiança e de correção pelo usuário — é assim que se mede se a extração está boa
(`RN-32`, `RF-085`).

### Provedor simulado como padrão

`LLM_PROVIDER=simulado` (padrão) usa um extrator determinístico por palavras-chave e expressões de
tempo em português. Ele existe por três motivos:

- o sistema roda e é demonstrado **sem chave de API e sem rede**;
- os testes exercitam o fluxo completo de forma determinística;
- ele devolve confiança baixa quando o texto é vago, o que exercita a `RN-30` de verdade.

Ele não é "a IA do projeto" — é um dublê que respeita o mesmo contrato. A troca é por variável de
ambiente, sem mudança de código (`RNF-12`).

## Consequências

### Positivas

- **Auditabilidade.** Sempre dá para responder "por que este horário apareceu?": os filtros estão
  gravados e a busca é código.
- **Testabilidade.** A busca é determinística; o provedor é injetável (`definirProvedor`). Nove testes
  cobrem sucesso, baixa confiança, categoria inválida, falha, exceção, limite de custo e rastreabilidade.
- **Custo controlado.** `RNF-13` limita interpretações por usuário por dia (`P: limite_interpretacoes_dia`).
- **A funcionalidade é opcional por construção.** Se o cronograma apertasse, o MVP continuaria completo
  sem ela — por isso ela foi posicionada no marco M3 do plano.

### Negativas

- **Duas implementações do mesmo contrato** (simulado e Anthropic) precisam ser mantidas em sincronia.
  Mitigado por `validarSaida()` ser compartilhada.
- **O provedor simulado é limitado**: entende bem os casos que exercitamos, e mal os que não. Isso é
  aceitável para dublê, mas não pode ser confundido com qualidade do provedor real.
- **A extração pode acertar o formato e errar o conteúdo** (categoria plausível mas errada). A defesa
  é `RN-30` — o cliente vê e corrige os filtros antes de buscar.
- **Custo e latência** existem no provedor real. Um `effort: low` e o timeout limitam o dano, mas a
  chamada continua sendo a operação mais lenta do sistema.

### Limites conhecidos

- Não há avaliação automatizada de qualidade da extração (nada de *golden set*). O que existe é a
  telemetria de desfecho no painel do admin — suficiente para o MVP, insuficiente para produção.
- O provedor real não foi exercitado sob carga; a trava de custo é por contagem, não por orçamento.

## Revisão

Rever se: (a) a taxa de `CORRIGIDA` no painel passar de ~30%, sinal de que o *prompt* ou o esquema
precisam de ajuste; (b) o custo por busca se tornar relevante; (c) surgir necessidade de o LLM atuar
em outro ponto do fluxo — nesse caso este ADR precisa ser substituído, não estendido.
