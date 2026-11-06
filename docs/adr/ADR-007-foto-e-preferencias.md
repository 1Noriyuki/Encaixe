# ADR-007 — Foto de perfil em disco e aparência em cookie

| Campo | Valor |
|---|---|
| Status | **Aceito** em 2026-11-06 (Enzo, decisões D1 e D2 da SPEC-030, etapa 66) |
| Contexto da decisão | SPEC-030 — configurações da conta |
| Relacionados | ADR-001 (sem dependências), ADR-002 (modelo de dados), ADR-004 (sessão), `docs/seguranca.md` |

## Contexto

A SPEC-030 traz duas coisas que o sistema ainda não tinha: **arquivo enviado pelo usuário** (a foto de
perfil) e **preferência de exibição** (tema e animações). As duas esbarram em decisões já registradas:
o ADR-001 proíbe dependência de runtime, então não há biblioteca de upload nem de imagem; e o ADR-002
mantém o banco só com estado de negócio.

## Decisão

### 1. Foto de perfil

- **Leitura do envio:** o servidor lê `multipart/form-data` por conta própria, e **só** nas rotas que
  declaram um teto de arquivo (`opcoes.arquivo`). As outras continuam com o teto de 128 KB e só aceitam
  formulário comum.
- **Teto:** 2 MB por foto (`FOTO_MAX_BYTES` em `aplicacao/conta.js`). É limite técnico de upload, como o
  teto do corpo de formulário, e não número de regra de negócio; por isso não entra na tabela
  `parametro` (RN-00). Passado o teto, o servidor lê e descarta o resto do envio, e o caso de uso
  responde com a RF-089 em vez de derrubar a conexão.
- **Formato:** JPEG, PNG ou WebP, reconhecido pela **assinatura dos primeiros bytes**. O nome do arquivo
  e o tipo declarado pelo navegador são ignorados. SVG fica de fora de propósito: é texto e pode levar
  script.
- **Onde fica:** em disco, em `dados/fotos/` (ao lado do banco; `FOTOS_DIR` muda o lugar), com nome
  aleatório de 32 dígitos hexadecimais gerado pelo sistema. O banco guarda só esse nome em
  `usuario.foto`, e um `CHECK` recusa qualquer valor fora do formato, para que um nome capaz de sair da
  pasta não seja nem gravado.
- **Como sai:** pela rota `GET /fotos/<nome>`, que só aceita nomes no formato gerado e responde com
  `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox` e o tipo
  certo. Mesmo um arquivo poliglota (imagem válida com HTML dentro) não roda como página.
- **Sem reprocessar a imagem:** sem dependência, não há como redimensionar nem remover metadados
  (EXIF, que pode ter localização). Risco aceito e registrado em `seguranca.md`.

### 2. Aparência

- **Cookie `encaixe_aparencia`** (`tema.movimento`, por exemplo `preto.reduzido`), válido por um ano,
  `SameSite=Lax`. Não fica no banco: vale também para visitante, não muda o modelo de dados e funciona
  sem JavaScript, porque é um formulário comum.
- **A rota que grava o cookie dispensa o token CSRF.** Visitante não tem sessão, então não tem token; o
  pior que um site de fora consegue é trocar a cor do Encaixe de alguém.
- **Valor desconhecido vira o padrão** (seguir o sistema, animações completas). O cookie é controlado
  pelo cliente e nunca chega cru ao HTML.
- **Temas:** "seguir o sistema" (padrão), branco, azul-escuro e preto. O azul-escuro é o tema escuro que
  o site já tinha, levemente mais azulado, e é ele que o "seguir o sistema" usa quando o sistema está
  escuro. O preto troca só superfícies e bordas, para tela OLED.

## Consequências

- Backup do sistema passa a ser o banco **e** a pasta `dados/fotos/`. A pasta fica fora do git.
- Trocar a foto apaga a anterior; como o nome muda, nenhum cache serve a foto errada.
- A exclusão de conta (fase 2 da SPEC-030) terá de apagar o arquivo da foto junto com os dados.
