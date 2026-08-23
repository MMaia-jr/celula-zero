# Estado operacional atual

Última atualização: 2026-08-22

Repositório canônico: `MMaia-jr/celula-zero`

Marco canônico usado como base desta atualização:

- PR `#73` — merged;
- merge commit de referência:
  `d094a5fd1f5a597186422a3be4c452dc769d8542`.

Esse SHA é a proveniência desta edição do `STATE.md`, não uma declaração de que
ele permanecerá sendo o HEAD atual de `main`. Quando o HEAD atual for necessário,
ele deve ser lido dinamicamente do Git/GitHub.

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

### WP-001 — concluído

`WP-001-STATE-SYNC` foi executado, verificado e promovido ao GitHub canônico.

Resultado:

- execução local via shell/git worktree: `PASS`;
- `STATE.md` foi o único arquivo alterado pelo packet;
- alterações locais não relacionadas foram preservadas;
- commit e push foram rastreados separadamente;
- PR `#73` foi merged;
- classificação final: `PASS / CANONICAL`.

Aprendizagem observada:

> registrar um SHA de `main` como se fosse o HEAD permanentemente atual cria
> autorreferência impossível, porque o merge da própria atualização avança
> `main`.

Correção adotada:

> `STATE.md` pode registrar o baseline/proveniência de uma edição, mas o HEAD
> atual deve ser consultado dinamicamente quando necessário.

### WP-002 — ativo

`WP-002-STATE-PORTABILITY` testa o mesmo contrato de Work Packet por um segundo
caminho de execução:

`ChatGPT → GitHub branch → GitHub contents API → commit`

Objetivo restrito:

- corrigir a autorreferência acima;
- provar execução de uma tarefa real sem o fundador operar o Terminal;
- não criar nova infraestrutura.

Esse teste pode demonstrar portabilidade entre caminhos de execução. Não prova,
sozinho, independência universal entre agentes.

## Classificação arquitetural atual para continuidade

- `STATE.md`: `ADOPT`.
- GitHub Issue/PR/branch: `ADOPT`.
- Linear: `ADOPT`.
- padrão `CONTEXT-PACKET-*` / Work Packet Markdown: `MAP`.
- GitHub contents API como segundo caminho: `ADOPT`.
- JSON adicional para Work Packet: `NOT NEEDED YET`.
- CLI local `cz ...`: `NOT NEEDED YET`.
- novo protocolo/MCP/RAG: `NOT NEEDED`.

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

- escrita somente em workspace/branch explicitamente autorizados;
- branch Git para mudanças;
- secrets fora do repositório;
- least privilege;
- push/PR/merge somente com autorização;
- dados essenciais exportáveis;
- nenhum SaaS deve conter a única cópia de dados essenciais;
- segurança, LGPD e legislação brasileira aplicável permanecem requisitos;
- Discord não é opção arquitetural atual.

## Próximo gate

Concluir `WP-002-STATE-PORTABILITY` e comparar os dois caminhos observados:

1. `WP-001`: shell + git worktree;
2. `WP-002`: ChatGPT + GitHub branch/contents API.

PASS do teste de portabilidade somente se:

1. a mesma estrutura de contrato foi preservada;
2. o segundo caminho respeita base, escopo, autoridade e STOP gates;
3. somente `STATE.md` é alterado;
4. o resultado volta como Result Package estruturado;
5. o fundador não precisa executar comandos no Terminal para a fase autorizada;
6. não é criada nova infraestrutura;
7. qualquer PR/merge posterior permanece um estado separado e exige autoridade
   própria.

Depois disso, decidir se MAI-27 já possui evidência suficiente ou se ainda há
uma propriedade concreta de continuidade não preservada.

## Estado resumido

`OPERATING-LOOP-MVP / CANONICAL / PASS N=1 INTERNAL`

`WP-001 / CANONICAL / PASS`

`WP-002 / EXECUTION-PATH PORTABILITY / IN PROGRESS`

`AGENT-EXECUTION-CONTINUITY / IN PROGRESS`

`EXTERNAL UTILITY / NOT TESTED`

`ADOPTION / NOT TESTED`

`HYPOTHESIS-WEB3-001 / NOT TESTED`
