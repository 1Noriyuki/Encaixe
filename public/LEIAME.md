# public/

Arquivos estáticos servidos direto pelo servidor em `/estatico/<nome>`
(só as extensões listadas em `src/interface/http/servidor.js`).

| Arquivo | Onde aparece | Formato |
|---|---|---|
| `foto-salao.jpg`, `foto-barbearia.jpg`, `foto-treino.jpg`, `foto-oficina.jpg` | atalhos de categoria e bloco do prestador na home | ~720x900, ~100 KB cada, geradas por IA |
| `og.jpg` | prévia do link em redes sociais (`og:image`) | 1200x630, ~90 KB |
| `bricolage-grotesque.woff2` | fonte do site inteiro (`--fonte` em `estilo.js`) | variável 400-800, subconjunto latino, ~77 KB, licença OFL ([ADR-006](../docs/adr/ADR-006-fonte-da-marca.md)) |

O hero da home não usa foto desde a etapa 67: o fundo é a grade de agenda
desenhada em SVG (`FUNDO_DE_AGENDA` em `src/interface/http/rotas/publicas.js`)
e a coluna principal é a "Agenda aberta agora", com horários reais.

## Fotos de categoria

- São **geradas por IA** a partir de prompts. Foto de acervo aberto (Wikimedia
  e afins) foi recusada por decisão do Enzo.
- Ilustram uma categoria do catálogo; nenhuma é apresentada como um prestador.
- **Sem o arquivo, a home continua funcionando**: `existeEmPublic()` confere o
  arquivo antes de emitir a `<img>`, então nenhuma imagem quebrada aparece.
- Ao trocar uma foto, atualize o `alt` na lista de categorias de `publicas.js`:
  ele descreve a cena, não a categoria.

## og.jpg

Não é foto: é um cartão da marca (logo, a frase da home e três linhas da
agenda) renderizado em 1200x630 com a própria Bricolage, a partir de um HTML
fora do projeto, e capturado como JPEG (etapa 68). Para refazer, monte o HTML
com `MARCA_SVG` e `PALAVRA_SVG` de `views/layout.js` e capture com o Playwright
do `playwright-cli` global (ver "Capturas de tela" no `CLAUDE.md`). Se mudar o
conteúdo, atualize o `og:image:alt` no layout.
