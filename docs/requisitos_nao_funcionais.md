# Requisitos nao funcionais

> Requisitos de qualidade e restrições técnicas do Encaixe. A versão normativa está em [`spec.md`](spec.md), seção 8.

## RNF-01 — Persistência

Todo estado de negócio deve sobreviver entre sessões em banco de dados, com integridade referencial entre contas, horários, agendamentos e lançamentos financeiros.

## RNF-02 — Autenticação e sessão

Usuários devem ser autenticados por sessão com expiração por inatividade. Senhas devem ser armazenadas somente como hash derivado lentamente e com sal individual.

## RNF-03 — Autorização e separação de perfis

Toda rota e operação deve verificar perfil e titularidade no servidor. Esconder um botão na interface não é controle de autorização.

## RNF-04 — Privacidade

O perfil público pode mostrar nome de exibição, região, reputação e histórico agregado. Dados de contato só aparecem entre as partes de um agendamento `CONFIRMADO`.

## RNF-05 — Desempenho

A busca deve responder em até dois segundos no volume esperado do MVP. A chamada ao LLM possui timeout configurável, padrão de 15 segundos, e não pode impedir a busca por filtros.

## RNF-06 — Testes automatizados

Toda regra de negócio deve possuir teste automatizado com seu identificador. A suíte deve rodar em integração contínua a cada pull request; nenhuma tarefa está concluída sem teste.

## RNF-07 — Observabilidade e auditoria

Eventos de negócio e erros devem carregar identificador de correlação. A auditoria deve permitir reconstruir o histórico de um agendamento ponta a ponta.

## RNF-08 — Consistência temporal

Instantes são persistidos em UTC e exibidos em `America/Sao_Paulo`. Regras temporais não podem depender do relógio do cliente.

## RNF-09 — Concorrência

A reserva deve ser atômica mesmo sob requisições simultâneas. A exclusividade é garantida pelo domínio e por restrição no banco.

## RNF-10 — Configurabilidade

Parâmetros de negócio devem ser alteráveis sem modificar código ou realizar novo deploy. Alterações não podem retroagir fatos já registrados.

## RNF-11 — Usabilidade

Busca, reserva e publicação devem funcionar em telas de celular. Toda ação com penalidade deve mostrar sua consequência antes da confirmação.

## RNF-12 — Portabilidade do LLM

A integração com LLM deve estar atrás de uma interface própria, permitindo trocar de provedor e usar uma implementação simulada nos testes.

## RNF-13 — Custo de IA

O sistema deve limitar interpretações por usuário e período, evitando custo descontrolado do provedor externo.

## RNF-14 — Documentação viva

Alterações em regras ou requisitos devem atualizar a especificação no mesmo pull request da mudança de código.

## Restrições técnicas relacionadas

- O domínio não importa banco, rede, HTTP ou relógio real.
- Dinheiro é armazenado em centavos e instantes em UTC.
- Invariantes críticas são protegidas no domínio e no SQLite.
- O site continua utilizável com JavaScript desabilitado.
- A falha do LLM degrada para busca determinística por filtros.

## Evidências

Os testes de autenticação, autorização, CSRF, escape, concorrência, tempo e LLM estão descritos em [`testes.md`](testes.md). Os controles e riscos residuais estão em [`seguranca.md`](seguranca.md).
