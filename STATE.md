# Estado operacional atual

Última atualização: 2026-08-22

Repositório canônico: `MMaia-jr/celula-zero`

Baseline canônico observado:

`main = 7619e52841593b366a3fb166b3b417456b1f2f3e`

Este arquivo é a Working Spec curta. História detalhada permanece em decisões,
issues, commits, PRs, testes e artefatos vinculados.

## Identidade atual

Célula Zero é atualmente a primeira comunidade-laboratório humano–IA na qual o
método é aprendido construindo a própria comunidade, o próprio ambiente e
projetos reais.

Não presumir que já seja:

- produto validado;
- plataforma universal;
- DAO operacional;
- protocolo universal;
- intermediária financeira;
- sistema de reputação universal;
- produto com PMF, adoção ou escala demonstrados.

## Missão

Transformar:

`intenção → aprendizagem → produção → evidência → avaliação → capacidade → confiança contextual → oportunidade`

Princípio operacional:

`aprender construindo`

## Fonte de verdade e coordenação

- GitHub é o registro canônico de código e estado técnico versionado.
- `STATE.md` preserva o estado operacional curto; Git preserva a história.
- Linear coordena NOW/NEXT, progresso e bloqueios; não substitui GitHub.
- A aplicação Célula Zero registra o ciclo operacional e seus objetos; não
  substitui o GitHub como registro canônico do código.
- ChatGPT pode coordenar, pesquisar, criticar e especificar.
- Codex ou qualquer outro executor é opcional; continuidade não pode depender
  de um executor específico.
- Decisões centrais permanecem humanas.

## Núcleo canônico implementado

O backend e a aplicação preservam atualmente:

- Gate 1 foundation;
- B1 — authority, Opportunity, Proposal e Commitment;
- B2-A — Contribution e Artifact;
- B2-B1 — Claim e Evidence;
- B2-B2 — Verification;
- workbench autenticado;
- exportação operacional Markdown/JSON;
- AI_AGENT atribuível a operador humano sem remover limites de autoridade.

Ciclo operacional canônico:

`Opportunity → Proposal → Commitment → Contribution → Artifact → Claim/Evidence → Verification`

A aceitação de Proposal permanece decisão explícita. Proposal não cria
Commitment sozinha. Self-acceptance permanece proibida.

## Marco concluído — OPERATING-LOOP-MVP

GitHub:

- Issue `#70` — concluído;
- PR `#71` — merged;
- merge commit:
  `7619e52841593b366a3fb166b3b417456b1f2f3e`.

Foi realizado dogfood interno ponta a ponta usando a própria Célula Zero para
registrar trabalho real da construção do projeto.

Resultado observado:

- ciclo ponta a ponta interno: `PASS N=1`;
- CI do PR #71: `PASS`;
- regressão de autorização/pgTAP: `PASS`;
- web/unit/coverage/typecheck/lint/build: `PASS`;
- jornada autenticada em CI: `PASS`.

Limites:

- `PASS N=1` não demonstra utilidade externa, adoção, PMF ou escala;
- a primeira Verification interna não deve ser interpretada como revisão
  independente quando houver operador comum;
- execução técnica, evidência, verificação e outcome permanecem distintos.

## Marco ativo — AGENT-EXECUTION-CONTINUITY

Vínculos:

- GitHub Issue `#72`;
- Linear `MAI-27`.

Objetivo:

> reduzir progressivamente o fundador como ponte manual entre ChatGPT,
> Terminal, GitHub, Linear e Célula Zero, sem depender de Codex, Ollama ou API
> de IA para continuidade.

Fluxo alvo:

`human direction → work packet → executor intercambiável → result package → verification → GitHub/Linear/Célula Zero`

Prioridade atual:

1. reconstrução de estado a partir de fontes canônicas;
2. Work Packet portátil e autocontido;
3. Result Package estruturado;
4. provar uma tarefa real com menos transferência manual de contexto.

Não construir CLI, protocolo, MCP, RAG ou nova infraestrutura antes de uma
propriedade concreta demonstrar que Git + Markdown + processo são insuficientes.

## Classificação arquitetural atual para continuidade

- `STATE.md`: `ADOPT` — mecanismo adequado; conteúdo anterior ficou obsoleto.
- GitHub Issue/PR: `ADOPT` — vínculo técnico e histórico.
- Linear: `ADOPT` — fila e coordenação.
- padrão histórico `CONTEXT-PACKET-*`: `MAP` — precedente útil para um Work
  Packet autocontido.
- JSON adicional para Work Packet: `NOT NEEDED YET`.
- CLI local `cz ...`: `NOT NEEDED YET`.
- novo protocolo/MCP: `NOT NEEDED`.

## Direção de produto mais ampla

`decisions/D006-mvp-habitavel-30-dias.md` permanece um registro canônico de
direção humana de 2026-08-21.

Entretanto, financiamento não custodial, smart contract/testnet e demais itens
de D006 não pertencem ao marco ativo `AGENT-EXECUTION-CONTINUITY` e não recebem
autorização de execução por este estado. Qualquer retomada exige escopo,
propriedade concreta e autorização explícitos.

Blockchain, token, NFT, DAO ou chain própria não entram no caminho crítico por
padrão.

## Invariantes em vigor

Preservar:

- Original Record ≠ Interpretation ≠ Claim ≠ Evidence ≠ Verification ≠ Decision ≠ Reputation;
- atividade ≠ contribuição ≠ resultado ≠ evidência ≠ avaliação ≠ reputação;
- sponsorship ≠ endorsement ≠ contribution ≠ economic right;
- PREPARED ≠ EXECUTED ≠ VERIFIED ≠ COMMITTED ≠ PUSHED ≠ MERGED ≠ CANONICAL;
- Verification ≠ Outcome.

Confiança deve ser contextual:

`confio em X para Y com base em Z`

e não um score universal.

Nenhum direito econômico retroativo.

## Segurança e resiliência

- escrita somente em workspace explicitamente autorizado;
- branch Git para mudanças;
- secrets fora do repositório;
- least privilege;
- push/PR/merge somente com autorização;
- dados essenciais exportáveis;
- nenhum SaaS deve conter a única cópia de dados essenciais;
- segurança, LGPD e legislação brasileira aplicável permanecem requisitos;
- Discord não é opção arquitetural atual.

## Próximo gate

Executar um primeiro Work Packet real cujo único objetivo seja sincronizar este
`STATE.md`, e observar se um executor consegue realizar a tarefa usando apenas o
packet + repositório canônico, sem depender da memória do chat.

PASS somente se:

1. o executor identifica o baseline canônico correto;
2. altera somente `STATE.md`;
3. preserva alterações locais não relacionadas;
4. produz Result Package distinguindo estados de execução;
5. a mudança é revisável por diff;
6. nenhuma nova infraestrutura é criada;
7. após decisão humana, commit/push/PR/merge podem ser rastreados separadamente.

## Estado resumido

`OPERATING-LOOP-MVP / CANONICAL / PASS N=1 INTERNAL`

`AGENT-EXECUTION-CONTINUITY / IN PROGRESS`

`WORK-PACKET PORTABILITY / TESTING`

`EXTERNAL UTILITY / NOT TESTED`

`ADOPTION / NOT TESTED`

`HYPOTHESIS-WEB3-001 / NOT TESTED`
