# Imagens da home

> **Histórico.** Até a etapa 66 o hero tinha uma foto (`public/hero.jpg`, 4:5,
> cabeleireira num salão de bairro) com um cartão de preço flutuando sobre ela,
> e o `og.jpg` era um recorte dessa mesma foto. O redesign da etapa 67 trocou a
> foto pela "Agenda aberta agora"; a etapa 68 apagou o `hero.jpg` e refez o
> `og.jpg` como cartão da marca. Este documento descreve o que vale agora.

## Hero

Sem foto. Duas camadas, nenhuma delas imagem:

- **Fundo:** a grade de agenda em SVG (`FUNDO_DE_AGENDA`,
  `src/interface/http/rotas/publicas.js`), com blocos livres, ocupados e vagos e
  a peça laranja do logo. É inclinada e esmaecida por máscara; no celular fica
  mais clara e só no topo.
- **Coluna principal:** os próximos horários publicados de verdade, com o preço
  vigente calculado pelo domínio.

Decisões do Enzo que valem para qualquer imagem nova: **nada de foto de acervo
aberto** (Wikimedia "parece filme de terror") e **nada de foto esmaecida no
hero**, porque no tema escuro ela virava uma mancha.

## Fotos de categoria

`public/foto-salao.jpg`, `foto-barbearia.jpg`, `foto-treino.jpg` e
`foto-oficina.jpg` ilustram os atalhos de categoria e o bloco do prestador. São
geradas por IA a partir de prompts que o Enzo recebe e gera fora do projeto.
Para uma categoria nova, o mesmo padrão:

> Fotografia editorial em retrato 4:5, luz natural de fim de tarde, de um(a)
> profissional de [categoria] atendendo um cliente num estabelecimento pequeno e
> real. Momento espontâneo, ninguém olhando para a câmera. 50 mm, f/2.0,
> profundidade de campo rasa, cores naturais, sombras levemente frias e realces
> quentes. Sem texto, logotipos ou marcas d'água; mãos corretas.

Depois de gerar: redimensione para ~720x900, qualidade ~85 (alvo: ~100 KB),
salve em `public/` e acrescente a entrada com `alt` na lista de categorias de
`publicas.js`.

## og:image

`public/og.jpg`, 1200x630: o logo, a frase "O horário vago de hoje, mais barato
quanto mais perto" e três linhas de agenda com preços ilustrativos, sobre o
fundo areia do tema claro. Como `public/LEIAME.md` explica, é renderizado de
HTML com a fonte da marca, não editado à mão. O `og:image:alt` no layout
descreve exatamente isso.
