# public/

Arquivos estaticos servidos direto pelo servidor em `/estatico/<nome>`
(so as extensoes listadas em `src/interface/http/servidor.js`).

| Arquivo | Onde aparece | Formato |
|---|---|---|
| `hero.jpg` | moldura do hero na home | 900x1125 (4:5), ~130 KB |
| `og.jpg` | previa do link em redes sociais (`og:image`) | 1200x630, ~85 KB |
| `bricolage-grotesque.woff2` | fonte do site inteiro (`--fonte` em `estilo.js`) | variavel 400-800, subconjunto latino, ~77 KB, licenca OFL ([ADR-006](../docs/adr/ADR-006-fonte-da-marca.md)) |

Ambos sao recortes da mesma foto, gerada a partir do briefing em
[`docs/imagem-hero.md`](../docs/imagem-hero.md).

**Sem `hero.jpg` a home continua funcionando**: a moldura fica com o gradiente
de fundo e nenhuma `<img>` quebrada e emitida (`imagemDoHero()` em
`src/interface/http/rotas/publicas.js`).

## Ao trocar a foto

1. Recorte o hero em 4:5 mantendo o **terco esquerdo limpo** - e onde o cartao
   de preco branco pousa - e salve como `hero.jpg` (alvo: abaixo de 250 KB).
2. Gere o `og.jpg` em 1200x630 a partir da mesma foto, com o rosto no terco
   direito (o Facebook e o WhatsApp cortam as bordas em telas estreitas).
3. Atualize o `alt` em `imagemDoHero()` e o `og:image:alt` no layout - os dois
   descrevem a cena atual, nao a categoria da imagem.
