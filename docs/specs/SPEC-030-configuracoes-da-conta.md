# SPEC-030 — Configurações da conta

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Data | 2026-11-06 |
| Status | **Aprovada** por Enzo em 2026-11-06 (decisões D1 a D5, registro etapa 66). **Fase 1 concluída** na mesma etapa: tabela da §12 conferida por `grep`, 17 testes passando. **Fase 2 (exclusão de conta) não iniciada** |
| Mapa de origem | [`mapa-de-specs.md`](mapa-de-specs.md), posição 30 (acrescentada depois do mapa original de 29) |
| Baseline | `docs/spec.md` v0.1.12 · ADR-004 · ADR-007 · `docs/seguranca.md` §6 |

---

## 1. Identificação

- **ID:** SPEC-030
- **Nome:** Configurações da conta
- **Objetivo:** dar a cada usuário autenticado uma página própria (`/conta`) para editar seus dados e sua
  foto, escolher a aparência do site, cuidar da senha e das sessões, levar uma cópia dos seus dados e
  ver o histórico da sua reputação; e publicar as páginas de ajuda, sobre e privacidade.
- **Valor entregue:**
  - **Ao usuário:** controle sobre a própria conta, que até aqui não existia: o cliente não tinha tela
    de perfil e ninguém conseguia trocar a senha.
  - **Ao projeto:** fecha a lacuna de LGPD declarada em `seguranca.md` §6 (acesso e portabilidade) e
    torna a RN-23 visível ao titular.

## 2. Rastreabilidade

| Tipo | Itens | Onde na baseline |
|---|---|---|
| RF | RF-087 a RF-096 (novos) | spec §7.10 |
| RB | RN-23 (a reputação vem de eventos; aqui só é exibida) | spec §6.7 |
| RNF | RNF-02, RNF-03, RNF-04 (alterado: a foto do prestador é pública), RNF-11 | spec §8 |
| Matriz de permissões | linhas "Editar os próprios dados" e "Baixar os próprios dados" | spec §4.5 |
| Entidades | `Usuario` (atributo `foto`), `PerfilCliente`, `EventoReputacao` (leitura) | spec §9.2 |
| ADRs | ADR-007 (foto em disco, aparência em cookie), ADR-001, ADR-004 | `docs/adr/` |
| Outros documentos | `docs/seguranca.md` §6 | |

## 3. Escopo

**Fase 1 (esta entrega):**

- Perfil: foto (envio e remoção), nome; no cliente, telefone e região preferida. O prestador tem um
  atalho para os dados do negócio (`/prestador/perfil`, SPEC-009).
- Aparência: tema (seguir o sistema, branco, azul-escuro, preto) e reduzir animações.
- Segurança: trocar senha e sair dos outros aparelhos.
- Privacidade e LGPD: o que é coletado e quem vê, e "baixar meus dados" em JSON.
- Reputação: os eventos que formaram a nota (cliente e prestador).
- Páginas públicas `/sobre`, `/ajuda` e `/privacidade`.

**Fase 2 (fora desta entrega, D5):** exclusão de conta por anonimização, com estado novo `EXCLUIDO` e
bloqueio enquanto houver agendamento em aberto, disputa ou comissão a pagar (D4). Exige alterar a
§9.6 da spec.

**Fora do escopo:** trocar o e-mail (D3), preferências de notificação (o sistema só tem aviso interno),
recorte ou redimensionamento da foto (ADR-007).

## 4. Dependências

SPEC-002 (sessão e política de senha), SPEC-003 (autorização), SPEC-006 (eventos de reputação),
SPEC-009 (perfil do prestador).

## 5. Comportamento esperado

| Ação | Quem | Resultado |
|---|---|---|
| Salvar dados pessoais | qualquer perfil autenticado | nome atualizado; cliente também telefone e região. Auditoria `DADOS_PESSOAIS_ATUALIZADOS` só com o nome dos campos |
| Enviar foto | qualquer perfil autenticado | foto trocada, a anterior apagada do disco. Auditoria `FOTO_ATUALIZADA` |
| Remover foto | qualquer perfil autenticado | volta às iniciais, arquivo apagado. Auditoria `FOTO_REMOVIDA` |
| Trocar senha | qualquer perfil autenticado | exige a senha atual; encerra as outras sessões. Auditoria `SENHA_ALTERADA` |
| Sair dos outros aparelhos | qualquer perfil autenticado | encerra as outras sessões. Auditoria `OUTRAS_SESSOES_ENCERRADAS` |
| Escolher aparência | qualquer pessoa, com ou sem conta | cookie `encaixe_aparencia`; o `<html>` ganha `data-tema` e `data-movimento` |
| Baixar meus dados | qualquer perfil autenticado | arquivo JSON para download. Auditoria `DADOS_EXPORTADOS` |
| Ver reputação | cliente e prestador | eventos em ordem decrescente; evento desfeito aparece marcado |

## 6. Regras e invariantes

- **INV-001:** `usuario.foto` é nulo ou um nome de 32 dígitos hexadecimais seguido de `.jpg`, `.png` ou
  `.webp`. Barrado no código (`infra/fotos.js`) e no banco (`CHECK`).
- **INV-002:** nenhuma ação desta Spec recebe id de usuário do formulário; o alvo é sempre a conta da
  sessão (RF-006).
- **INV-003:** a cópia de dados nunca leva o hash da senha nem o e-mail ou telefone de outra pessoa.

## 7. Modelo de domínio envolvido

Só um atributo novo: `Usuario.foto` (texto, opcional). Bancos antigos o recebem em `migrar()`; não há
valor a preencher. As preferências de aparência não são dado de domínio (ADR-007).

## 8. Impacto arquitetural

- `aplicacao/conta.js`: os casos de uso desta Spec.
- `infra/fotos.js`: assinatura do arquivo, gravação e leitura.
- `interface/http/aparencia.js`: leitura e gravação do cookie.
- `interface/http/servidor.js`: `multipart/form-data` só em rota com `opcoes.arquivo`; `GET /fotos/*`.
- `interface/http/rotas/conta.js`: telas e ações.
- `interface/http/estilo.js`: os temas viram blocos de tokens reaproveitados (`TOKENS_AZUL`,
  `TOKENS_PRETO`) e o corte de movimento serve tanto ao sistema quanto à preferência.

## 9. Contratos necessários (conceituais)

| Rota | Método | Acesso |
|---|---|---|
| `/conta` | GET | autenticado |
| `/conta/dados` | POST | autenticado |
| `/conta/foto`, `/conta/foto/remover` | POST | autenticado |
| `/conta/aparencia` | GET, POST | público (POST sem CSRF, ADR-007) |
| `/conta/seguranca` | GET | autenticado |
| `/conta/senha`, `/conta/sessoes/encerrar` | POST | autenticado |
| `/conta/privacidade` | GET | autenticado |
| `/conta/privacidade/exportar` | POST | autenticado |
| `/conta/reputacao` | GET | cliente e prestador |
| `/fotos/<nome>` | GET | público |
| `/sobre`, `/ajuda`, `/privacidade` | GET | público |

## 10. Requisitos não funcionais aplicáveis

- **RNF-11:** todas as telas funcionam em 320 px e sem JavaScript (o menu da conta vira trilha de abas;
  as perguntas da ajuda usam `<details>`).
- **RNF-04:** a foto só é pública para o prestador, no perfil público. A do cliente aparece só para ele.

## 11. Critérios de aceitação

- **CA-01:** salvar nome, telefone e região muda a conta; um `email` enviado junto é ignorado.
- **CA-02:** nome vazio é recusado e nada muda.
- **CA-03:** uma foto PNG válida é aceita e servida com o tipo certo, `nosniff` e `sandbox`.
- **CA-04:** HTML com nome `.png` é recusado pela RF-089 e a foto anterior continua.
- **CA-05:** arquivo acima de 2 MB é recusado pela RF-089, sem erro interno.
- **CA-06:** remover a foto apaga o arquivo e a interface volta às iniciais.
- **CA-07:** senha atual errada recusa a troca.
- **CA-08:** a troca de senha encerra as outras sessões e mantém a atual; a senha nova autentica.
- **CA-09:** "sair dos outros aparelhos" deixa só a sessão atual.
- **CA-10:** a aparência escolhida vale sem login; valor forjado no cookie cai no padrão.
- **CA-11:** a cópia de dados é um anexo JSON com os dados do titular, sem hash de senha nem contato da
  contraparte, e fica na auditoria.
- **CA-12:** o titular vê os eventos de reputação; o admin não tem a seção (403).
- **CA-13:** `/sobre`, `/ajuda`, `/privacidade` e `/conta/aparencia` abrem sem conta.
- **CA-14:** as seções da conta exigem sessão.
- **CA-15:** nome de foto fora do formato gerado não lê o disco.

## 12. Casos de teste derivados

Todos em `tests/integracao/spec-030-conta.test.js`. Títulos conferidos por `grep` em 2026-11-06.

| CA / INV | Teste |
|---|---|
| CA-01 | `T-SPEC030-CA01 \| RF-087: o titular salva nome, telefone e região; o e-mail não muda` |
| CA-02 | `T-SPEC030-CA02 \| RF-087: nome vazio é recusado e nada muda` |
| CA-03 | `T-SPEC030-CA03 \| RF-088: foto PNG é aceita e servida só como imagem` |
| CA-04 | `T-SPEC030-CA04 \| RF-089: HTML com nome .png é recusado pelo conteúdo e a foto anterior fica` |
| CA-05 | `T-SPEC030-CA05 \| RF-089: arquivo acima do teto é recusado com a regra, sem erro interno` |
| CA-06 | `T-SPEC030-CA06 \| RF-090: remover a foto apaga o arquivo e volta às iniciais` |
| CA-07 | `T-SPEC030-CA07 \| RF-091: senha atual errada recusa a troca e nada muda` |
| CA-08 | `T-SPEC030-CA08 \| RF-091: trocar a senha derruba as outras sessões e mantém a atual` |
| CA-09 | `T-SPEC030-CA09 \| RF-092: sair dos outros aparelhos encerra as demais sessões` |
| CA-10 | `T-SPEC030-CA10 \| RF-093: o tema escolhido vale sem login e valor desconhecido cai no padrão` |
| CA-11, INV-003 | `T-SPEC030-CA11 \| RF-094: o titular baixa os próprios dados sem senha nem contato alheio` |
| CA-12 | `T-SPEC030-CA12 \| RF-095: o titular vê os eventos da reputação; o admin não tem a seção` |
| CA-13 | `T-SPEC030-CA13 \| RF-096: sobre, ajuda e privacidade abrem sem conta` |
| CA-14, INV-002 | `T-SPEC030-CA14 \| RF-006: as seções da conta exigem sessão` |
| CA-15, INV-001 | `T-SPEC030-CA15 \| RF-088: nome de foto fora do formato gerado não lê o disco` |
| INV-001 (banco) | `T-SPEC030-INV01 \| RF-088: o banco recusa nome de foto fora do formato` |
| RF-089 (unidade) | `T-SPEC030-UN01 \| RF-089: o formato sai da assinatura do arquivo, não do nome` |

## 13. Questões em aberto

Decididas por Enzo em 2026-11-06, todas pela recomendação:

| ID | Decisão |
|---|---|
| D1 | Foto real: JPEG, PNG ou WebP até 2 MB, tipo pelos primeiros bytes, nome aleatório, servida com cabeçalhos restritivos; sem foto, iniciais (ADR-007) |
| D2 | Aparência em cookie, não no banco; preto de verdade e azul-escuro como o escuro atual levemente mais azulado (ADR-007) |
| D3 | Editáveis: nome, telefone, região e foto. E-mail não, porque o sistema não envia e-mail de confirmação |
| D4 | Exclusão por anonimização, estado novo `EXCLUIDO`, bloqueada com a regra na tela enquanto houver agendamento em aberto, disputa aberta ou comissão a pagar |
| D5 | Duas fases: a fase 1 agora; a exclusão (D4) na fase 2 |

**Premissas do agente (registradas na etapa 66, não decididas explicitamente):**

- A foto é pública só para o prestador, no perfil público, ao lado do nome do negócio; a do cliente
  aparece só para ele. A RNF-04 foi ajustada nesse sentido.
- A "Reputação" foi a seção extra proposta pelo agente e aceita no "aprovo".
- Enquanto a fase 2 não existe, a página de privacidade indica o e-mail de suporte para pedir a
  exclusão.

## 14. Definition of Done

- [x] Spec aprovada e decisões registradas.
- [x] `docs/spec.md` v0.1.12 com os RF-087 a RF-096, a §4.5 e a RNF-04 ajustadas.
- [x] ADR-007 aceito.
- [x] Testes da §12 existem e passam; suíte completa verde.
- [x] Telas conferidas no navegador em 1366 e 390 px, nos temas branco, azul-escuro e preto.
- [ ] Fase 2 (exclusão de conta).
