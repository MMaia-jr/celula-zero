# CZ Genesis Habitat Campaign — checkpoint de preservação

**Data:** 2026-10-03
**Branch de checkpoint:** `checkpoint/genesis-habitat-campaign-20261003`
**Commit de origem:** `50b4917593b0979d5c218c725038bf89afb1134f`
**Canonical main observado:** o mesmo commit `50b4917593b0979d5c218c725038bf89afb1134f` no início deste checkpoint.

> **CURRENT HUMAN DIRECTION / LOCAL / NOT CANONICAL AT SOURCE**
> **THIS CHECKPOINT PRESERVES WIP; IT DOES NOT HUMAN-ACCEPT THE HABITAT**

Este documento acompanha um snapshot de trabalho. Ele não altera `STATE.md`, não transforma a direção local em direção canônica e não promove decisões ou código.

## Direção humana e objetivo

A direção humana ativa é continuar cumulativamente a Genesis Habitat Campaign, sem micro-review, preservando identidade Essenthius, autoridade humana e semântica institucional. A projeção operacional completa está no arquivo local `apps/cz-web/.data/current-human-direction.json`; esse arquivo é ignorado pelo Git e foi copiado byte a byte para o backup externo. Este resumo sanitizado é não canônico.

O objetivo é aproximar a experiência normal de Célula Zero de um Habitat integrado: reconhecer a Person e a Cell, devolver contexto, conversar com Essenthius, compor capacidades, permitir ações naturais sob confirmação humana, tornar consequências visíveis e continuar após retorno.

## Implementação acumulada preservada

O worktree contém implementação candidata local para identidade/presença e autoridade CZ sobre armazenamento local; experiência V2 com Home, Conversas, Células, Descobrir, Reuniões, Atividade e Você; conversas persistentes e distintas de Original Records; assistência de perfil e rascunhos de Experience com confirmação; Meetings textuais; metabolismo de Project/Opportunity/Proposal/Commitment/Agreement, Work, Contribution, Claim, Evidence, Verification, Decision e learning; Action Gateway; Execution Fabric/Codex delimitado; exportação e recuperação local; seleção de modelo por conversa; e limites de provider, autoridade e proveniência.

Essas capacidades são implementação/projeção local e não representam adoção de plataforma ou aceitação humana.

## Turno real de Essenthius observado

Marcos observou resposta na interface CZ normal. O readback durável associou a mensagem humana a uma `ConversationMessage` e a saída a uma `Interpretation`:

- Provider `CODEX_CLI_CHATGPT`, modelo `codex-cli-default`, preferência `AUTO`.
- 17.761 tokens de entrada, 751 de saída, duração 34,383 s.
- O turno localizou dois Works abertos e apresentou um deep link válido.
- Nenhum `OriginalRecord` ou `Decision` foi criado automaticamente pelo turno.
- Essa resposta real não demonstra habitabilidade nem aceitação do Habitat.

## Direção ativa, capacidades e custo de contexto

A projeção local de Active Direction distingue a campanha atual do `STATE.md` canônico, dos trechos Git e dos Works antigos. Direção atual local não é inferida de recência de Work e não é promovida automaticamente.

O catálogo atual separa capacidades do produto de `profileCapabilityCandidates`, explicita estado de disponibilidade, pré-condições, confirmação humana, autoridade, classe de uso e ponto de entrada. A superfície V2 de Descobrir apresenta opções acionáveis em linguagem humana e mantém condições adicionais em detalhes progressivos. Capacidades ausentes continuam ausentes; referências históricas não são apresentadas como integrações disponíveis.

Uma chamada direta e read-only ao adapter Codex, usando a projeção compactada e sem gravar mensagem ou estado Foundation, mediu 14.929 tokens de entrada, 600 de saída e 28,776 s, com payload de contexto de 8.458 caracteres. Comparada ao turno humano anterior, a medição foi aproximadamente 16% menor em tokens e latência; as chamadas não usaram rota/prompt idênticos e não constituem benchmark equivalente. Há métricas de uso/quota, mas custo monetário permanece `UNKNOWN`; não se afirma computação gratuita nem ausência de custo.

## Estado durável e validação

Banco local preservado fora de `/private/tmp` no backup humano:

- Person `Marcos`; Cell `Célula Zero`.
- 14 ConversationMessages; 15 IntelligenceTurns; 19 records; 7 OriginalRecords; 0 Decisions; 2 Works; 1 credential ativa.
- Integrity check `ok`.
- SHA-256 da origem e cópia SQLite: `d15e4856ac7e62bd9a338a44e83d9444d6d8e64438ca349f9eecea15abfc647c`.
- Cópia byte a byte verificada; direção local e snapshot de recuperação também foram preservados no backup. O snapshot não contém sessões nem secrets.

Validação observada no checkpoint: `npm run check` passou (68 testes, 2 ignorados); Experience V2 E2E desktop/mobile passou (2/2); regressão legada passou (8/8); `git diff --check` passou. São verificações automatizadas do estado local, não aceitação humana.

## Lacunas abertas

- A rota normal não foi revalidada por Marcos após a compactação mais recente do contexto.
- A experiência do XII Fórum de Agroecologia ainda aguarda o fluxo humano final; nenhuma Experience foi criada neste checkpoint.
- Dream → Plan → Do → Celebrate ainda não foi demonstrado como episódio completo.
- O Codex software operator não foi executado por uma nova autorização de software elegível.
- Kimi não está configurado; nenhuma chamada paga foi feita.
- O Habitat não foi aceito pelo Human.

## Próximo gate

Continuar a campanha no mesmo worktree, preservar o estado e avançar os fluxos não dependentes de nova autoridade. O próximo review humano será substancial, após validar a rota normal atualizada e integrar uma ação/resultado/continuidade coerentes. Este checkpoint, por si só, não solicita um teste humano isolado.

## Limites de inferência

`DRAFT_PR ≠ CANONICAL`
`AUTOMATED_PASS ≠ HUMAN_ACCEPTANCE`
`REAL_MODEL_RESPONSE ≠ HABITABLE`
`CURRENT_HUMAN_DIRECTION ≠ CURRENT_CANONICAL_STATE`

Este checkpoint não afirma utilidade externa, adoção, PMF, escala, Human acceptance, custo monetário zero, execução Codex autorizada, integração Kimi ou que conteúdo Git seja automaticamente verdade institucional. Merge não foi autorizado.
