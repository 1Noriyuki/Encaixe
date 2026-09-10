# Briefing da imagem do hero

Destino: `public/hero.jpg` — coluna direita do hero da home, moldura em **4:5
(retrato)**, ~900x1125 px, levemente rotacionada (1,4°) e com um cartao de preco
branco flutuando sobre o canto inferior esquerdo.

Restricoes que a arte precisa respeitar:

- **Canto inferior esquerdo e o rodape precisam ser "calmos"** (parede, tecido,
  fundo desfocado) — e onde o cartao de preco pousa e onde entra um degrade.
- **Nenhum texto, numero, logo ou marca na imagem.** Todo texto e HTML.
- Paleta puxando para **indigo (#3b41c5)** nas sombras e **laranja (#f97316)**
  nas luzes, para casar com o gradiente do site.
- Funciona em tema claro e escuro: contraste medio, sem branco estourado.

---

## Prompt (portugues)

> Fotografia editorial em retrato 4:5 de uma cabeleireira brasileira de uns 35
> anos, em um salao de bairro pequeno e real, terminando um corte em uma cliente
> sentada na cadeira. Fim de tarde: luz quente e baixa entrando por uma vitrine
> fora de quadro pela esquerda, refletindo no espelho ao fundo. As duas estao
> relaxadas, em meio de conversa — nada de sorriso posado para a camera. A
> cliente ocupa o primeiro plano levemente desfocado; a profissional esta em
> foco, de pe, atras dela. Ao fundo, desfocado, bancada com frascos, uma planta
> e a parede do salao — area inferior esquerda do quadro deliberadamente vazia e
> uniforme. Camera na altura dos olhos, 50 mm, f/2.0, profundidade de campo rasa,
> grao fino de filme, cores naturais de pele, dominante indigo fria nas sombras e
> luz quente alaranjada nos realces. Estetica de reportagem, sem estilo de banco
> de imagens, sem HDR, sem vinheta pesada. Sem texto, sem logotipos, sem marcas
> d'agua, sem maos deformadas.

## Prompt (ingles — costuma render melhor)

> Editorial 4:5 portrait photograph of a Brazilian hairstylist in her mid-30s
> inside a small neighborhood salon, finishing a haircut on a seated client.
> Late-afternoon golden light rakes in from a shop window just out of frame on
> the left and catches the mirror behind them. Both women are relaxed, caught
> mid-conversation — candid, not posed, no smiling at the camera. The client sits
> in the soft-focus foreground; the stylist stands behind her, sharply in focus.
> Blurred background: a counter with bottles, a plant, the salon wall. The lower
> left area of the frame is deliberately empty and uncluttered. Eye-level camera,
> 50mm lens, f/2.0, shallow depth of field, fine film grain, natural skin tones,
> cool indigo cast in the shadows and warm orange highlights. Documentary
> reportage aesthetic, not stock-photo, no HDR, no heavy vignette. No text, no
> logos, no watermarks, no distorted hands.

**Negative prompt:** `text, letters, numbers, watermark, logo, signage, extra
fingers, deformed hands, plastic skin, oversaturated, HDR, stock photo pose,
looking at camera, collage, frame, border, 3d render, illustration`

---

## Variantes, se a primeira nao servir

Mesma estrutura de luz e enquadramento, trocando so o cenario:

- **Barbearia** — barbeiro finalizando o acabamento na nuca de um cliente,
  espelho e cadeira antiga ao fundo.
- **Estetica / manicure** — maos em detalhe sobre a mesa, rosto da profissional
  desfocado ao fundo; funciona bem se as demais gerarem maos ruins.
- **Personal trainer** — corrigindo a postura de um aluno em um estudio pequeno
  de fim de tarde.

## Depois de gerar

1. Recorte em 4:5 conferindo que o terço esquerdo continua limpo.
2. Redimensione para 900x1125 e salve em `public/hero.jpg`, qualidade ~90
   (alvo: abaixo de 250 KB). O projeto não tem dependência de imagem: a
   conversão é feita fora dele, por qualquer editor.
3. Gere também `public/og.jpg` em 1200x630 a partir da mesma foto, para a
   prévia do link em redes sociais.
4. Se trocar de cenário, atualize o `alt` em `imagemDoHero()`
   (`src/interface/http/rotas/publicas.js`) e o `og:image:alt` no layout — os
   dois descrevem a cena atual, não a categoria da imagem.

## Recorte no celular

No desktop a moldura e a foto sao ambas 4:5: nao ha corte. Abaixo de 980 px a
moldura vira 4:3 e o `object-fit: cover` corta na vertical, entao o CSS usa
`object-position: 60% 38%` para manter a profissional em quadro e sacrificar o
rodape da foto, que e area calma. Se a foto trocar, confira este recorte antes
de qualquer outra coisa: e o unico lugar onde a imagem perde area.

O cartao de preco deixa de flutuar sobre a foto nessa largura e passa a ser um
bloco abaixo dela, entao o terco inferior esquerdo so precisa estar limpo na
composicao de desktop.

## O que foi usado

A foto em produção seguiu o prompt em inglês acima, cenário salão. Ela cumpre
as três restrições de layout: 4:5, luz quente entrando pela esquerda e terço
esquerdo sem detalhe — parede clara em cima, capa escura da cliente embaixo,
que é exatamente onde o cartão de preço branco pousa.
