# Estado operacional atual

Última atualização: 2026-08-23

Repositório canônico: `MMaia-jr/celula-zero`

Esta é a Working Spec curta. História detalhada permanece em decisões, issues,
commits, PRs, testes e artefatos vinculados. O HEAD atual de `main` deve ser
consultado dinamicamente quando necessário.

## Identidade e missão

Célula Zero é atualmente a primeira comunidade-laboratório humano–IA na qual o
método é aprendido construindo a própria comunidade, infraestrutura mínima e
projetos reais.

Missão:

`intenção → aprendizagem → produção → evidência → avaliação → capacidade → confiança contextual → oportunidade`

Princípio:

`aprender construindo`

Não presumir produto validado, plataforma universal, DAO, protocolo universal,
reputação universal, PMF, adoção ou escala.

## Estado demonstrado

### OPERATING-LOOP-MVP

`CANONICAL / PASS N=1 INTERNAL`

O ciclo operacional interno foi demonstrado ponta a ponta:

`Opportunity → Proposal → Commitment → Contribution → Artifact → Claim/Evidence → Verification`

Limite: `PASS N=1 INTERNAL` não demonstra utilidade externa, adoção, PMF ou
escala.

### AGENT-EXECUTION-CONTINUITY

MVP aceito na fronteira:

`um comando humano → executor autocontido e verificável`

Não existe propriedade concreta demonstrada que exija remover também esse
comando do caminho crítico. Codex, Ollama, Aider ou qualquer executor específico
não são dependências obrigatórias.

## Direção de produto atual

PR `#96` foi merged e tornou canônicos:

- `PRODUCT-DISCOVERY-002-SYNTHESIS.md`;
- `tests/HYPOTHESIS-PRODUCT-002-ACTION-HISTORY-CYCLE.md`;
- `decisions/D007-product-discovery-to-habitable-alpha.md`;
- `tests/HABITABLE-ALPHA-001.md`.

Merge commit de proveniência desta transição:

`7e07f70de7cb92744b56026d33550ac92b296b86`

Esse SHA registra a proveniência da transição; não declara o HEAD permanente de
`main`.

D007 supersede D006 apenas quanto ao caminho crítico e sequenciamento imediatos.
A direção ampla de D006 permanece preservada, porém financiamento, smart
contract/testnet, marketplace, native messaging e outras capacidades amplas
estão `DEFERRED / NOT ACTIVE ON CURRENT CRITICAL PATH` até reautorização explícita
ou demonstração de propriedade concreta pelo Habitable Alpha.

## Marco ativo — HABITABLE-ALPHA-001

Estado:

`PREPARED / NOT EXECUTED`

Pergunta central:

> Uma pessoa real que não participou da construção consegue entrar em um
> contexto pequeno e real, encontrar ou expressar uma razão própria para agir,
> envolver outra pessoa, produzir uma consequência no mundo e depois ter uma
> razão concreta para retornar?

Cadeia observável:

`ENTRY → ACTION → RELATION → SECOND PERSON → REAL-WORLD CONSEQUENCE → RETURN`

O primeiro run deve ser `concierge-first`:

- 1 participante externo real;
- 1 contexto real;
- 1 necessidade/projeto/atividade real;
- 1 segunda pessoa real;
- canais existentes quando suficientes, inclusive WhatsApp;
- sem oportunidade fictícia;
- sem incentivo financeiro artificial;
- sem construir tecnologia antes de identificar uma propriedade perdida.

`view / click / signup / like / interest / message sent` não contam sozinhos como
consequência real.

## PR #95 — WORLD-001→007 / DATA-FOUNDATION

Estado operacional:

`VERIFIED LOCAL / NOT CANONICAL / PARKED FOR HA-001`

O PR #95 contém uma fundação candidata relevante, incluindo mapas semânticos,
migrations, testes e uma correção coerente de privacidade para não expor
automaticamente o Registro Original na projeção pública.

Ele não está rejeitado.

Ele também não é requisito do caminho crítico de `HABITABLE-ALPHA-001` enquanto
não houver resposta concreta para:

> Qual propriedade do primeiro run seria perdida se essa fundação não fosse
> promovida agora?

Não promover por antecipação apenas porque o trabalho já existe.

## Invariantes

Preservar:

- Original Record ≠ Interpretation ≠ Claim ≠ Evidence ≠ Verification ≠ Decision ≠ Reputation;
- atividade ≠ contribuição ≠ resultado ≠ evidência ≠ avaliação ≠ reputação;
- sponsorship ≠ endorsement ≠ contribution ≠ economic right;
- PREPARED ≠ EXECUTED ≠ VERIFIED ≠ COMMITTED ≠ PUSHED ≠ MERGED ≠ CANONICAL;
- Verification ≠ Outcome;
- COMMITTED ≠ EXECUTED ≠ VERIFIED.

Confiança permanece contextual:

`confio em X para Y com base em Z`

e não um score universal.

## Arquitetura e construção

Antes de criar tecnologia própria:

> Esta propriedade já pode ser preservada com padrão, processo ou infraestrutura existente?

Classificar:

`ADOPT / MAP / EXTEND / MISSING`

Para `EXTEND` ou `MISSING`, responder:

> Qual propriedade concreta será perdida se não criarmos isso?

Sem resposta clara, não construir.

Não presumir blockchain, DID, VC, IPFS, DAO, token, graph database, novo
protocolo, MCP, RAG, CLI ou plataforma própria.

## Segurança, privacidade e resiliência

- workspace explícito;
- escrita somente no escopo autorizado;
- branch Git para mudanças;
- secrets fora do repositório;
- least privilege;
- promoção somente com autoridade humana;
- LGPD e legislação brasileira aplicável;
- dados essenciais exportáveis;
- nenhum SaaS como única cópia de dados essenciais;
- nenhuma informação pessoal real de participante deve ser adicionada ao
  repositório como fixture ou documentação pública.

## Próximo gate

Executar `WP-HA-001-FIRST-EXTERNAL-RUN.md` somente após decisão humana sobre:

1. qual contexto real será usado;
2. qual pessoa externa será convidada;
3. qual segunda pessoa/necessidade real torna a ação possível;
4. quais dados pessoais mínimos são realmente necessários.

O Work Packet não autoriza implementação de código, schema, deploy ou contato
com participante por si só.

## Estado resumido

`OPERATING-LOOP-MVP / CANONICAL / PASS N=1 INTERNAL`

`AGENT-EXECUTION-CONTINUITY / MVP ACCEPTED`

`PRODUCT-DISCOVERY-002 / CANONICAL`

`D007 / CANONICAL`

`HABITABLE-ALPHA-001 / PREPARED / NOT EXECUTED`

`PR #95 / PARKED / NOT REQUIRED FOR HA-001 YET`

`EXTERNAL UTILITY / NOT TESTED`

`ADOPTION / NOT TESTED`

`HYPOTHESIS-WEB3-001 / NOT TESTED`
