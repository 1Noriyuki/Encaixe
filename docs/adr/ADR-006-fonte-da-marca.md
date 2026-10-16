# ADR-006 — Fonte da marca auto-hospedada no site inteiro

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data | 2026-10-01 |
| Decisores | Equipe |
| Relacionado | [ADR-001](ADR-001-stack-tecnica.md) · [`docs/identidade-visual/`](../identidade-visual/) |

## Contexto

A identidade visual aprovada em 2026-10-01 tem a **Bricolage Grotesque** como fonte da marca. Até aqui o
site usava só a fonte do sistema, por causa do ADR-001: o projeto precisa rodar com `git clone && npm start`,
sem `npm install` e sem depender de rede. A equipe pediu a fonte da marca no site todo, se fosse viável.

Carregar a fonte do Google Fonts resolveria em uma linha, mas quebraria o ADR-001 de dois jeitos: o site
deixaria de funcionar igual sem internet, e cada visita avisaria um terceiro.

## Decisão

**Servir a fonte como arquivo estático do próprio projeto.**

- Arquivo: `public/bricolage-grotesque.woff2`, versão variável (pesos 400 a 800, eixo óptico 12 a 96),
  só o subconjunto latino, que cobre o português acentuado. São 77 KB.
- Servido em `/estatico/bricolage-grotesque.woff2`. A extensão `.woff2` já estava na lista de tipos permitidos
  do servidor.
- Declarado com `@font-face` no topo de `estilo.js` e pré-carregado com `<link rel="preload">` no layout.
- `font-display: swap`: o texto aparece na hora com a fonte do sistema e troca quando o arquivo chega.
- Token `--fonte` passa a ser `"Bricolage Grotesque", system-ui, …`. A pilha antiga continua atrás como reserva.
- A monoespaçada dos identificadores de regra (`--fonte-mono`) não muda.
- Licença: SIL Open Font License 1.1, que permite redistribuir junto com o software. O texto da licença está
  em `docs/identidade-visual/OFL-bricolage-grotesque.txt`.

Isso **não altera o ADR-001**: a fonte é um arquivo de dados, como `hero.jpg`, e não uma dependência.
Nada é instalado, nada roda em build e nada é buscado fora do servidor.

## Consequências

### Positivas

- Marca e produto falam com a mesma voz: o título da página e a logo usam a mesma família.
- Continua funcionando offline e na máquina do avaliador sem nenhum passo extra.
- Sem o arquivo, o site não quebra: cai na fonte do sistema.

### Negativas

- **77 KB a mais** no primeiro carregamento. Depois o navegador guarda o arquivo em cache por uma hora.
- **Troca visível de fonte** no primeiro acesso (efeito do `swap`): a página aparece na fonte do sistema e
  reflui quando a Bricolage chega.
- A Bricolage é um pouco mais larga que as fontes de sistema. Em 320 px isso fez uma etiqueta do hero quebrar
  mal ("72 / h"), corrigido com espaço inseparável. Texto novo precisa ser conferido nessa largura.
- Caracteres fora do subconjunto latino (setas como →, por exemplo) caem na fonte do sistema, misturando
  famílias nesses glifos.

### Verificação feita

- `npm test`: 141/141.
- Emulação de celular a 320 e 390 px em `/`, `/buscar`, `/horarios/:id`, `/entrar`, `/cadastrar` e
  `/prestadores/:id`: nenhuma rolagem horizontal, e a fonte carregada em todas.

## Revisão

Rever se: (a) o tempo de carregamento em rede lenta virar problema, quando dá para cortar o eixo óptico ou
os pesos não usados; (b) o produto passar a precisar de alfabetos fora do latino.
