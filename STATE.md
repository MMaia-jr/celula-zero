# Estado operacional atual

Última atualização: 2026-08-24

Repositório canônico: `MMaia-jr/celula-zero`

Esta é a Working Spec curta. História detalhada permanece em decisões, issues,
commits, PRs, testes e artefatos vinculados. O HEAD atual de `main` deve ser
consultado dinamicamente quando necessário.

## Porta de entrada pública — ENTRY-POINT-ALPHA-001

`MERGED / CANONICAL` via PR `#98`, merge
`141e76dd88ff984e5299a9323c5263f57443c0dc`.

Teste cego: `STRANGER-COMPREHENSION-001 / PASS N=3 ACCESSIBLE AGENTS`;
`AGENT-REPOSITORY-ACCESS-001 / PARTIAL N=4`.

Limite: demonstra reconstrução substancial por agentes que acessaram o repo;
não demonstra compreensão humana, utilidade externa, serviço público, adoção,
PMF ou escala.

## Superfície de contribuição e organização do repositório

`CONTRIBUTOR-FRONT-DOOR-001 / MERGED / CANONICAL` via PR `#100`, merge
`bca807398d45f166516de54b444d05e76d8849d4`.

`ROOT-NORMALIZATION / PR-B1 / MERGED / CANONICAL` via PR `#101`, merge
`ade2d3dccf05837d1d0284c050643f288d8af65a`.

Essas mudanças melhoram entrada e organização do repositório; não demonstram
ainda uso bem-sucedido por contribuidor externo independente.

`REPO-HABITABILITY / NOT YET TESTED WITH EXTERNAL CONTRIBUTOR`.

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
A direção ampla de D006 permanece preservada.

D008 estabelece dois caminhos estratégicos distintos e complementares:

- `TRACK A — REAL-WORLD HABITABILITY`: mantém G1/HABITABLE-ALPHA e outros contextos reais como trilha de entrada, utilidade e consequência observada;
- `TRACK B — COORDINATION ARCHITECTURE`: ativa `G-C1 — COORDINATION REFERENCE MODEL` para investigar deliberadamente o menor modelo interoperável de coordenação e sua possível projeção social.

D008 não torna financiamento, smart contracts, marketplace, native messaging ou qualquer stack específica requisitos do produto. Essas capacidades continuam dependentes de `ADOPT / MAP / EXTEND / MISSING` e de uma propriedade concreta que justifique sua adoção ou construção.

## Roadmap operacional — ROADMAP-002

`docs/ROADMAP-002-HABITABLE-ALPHA-TO-ADOPTION.md` organiza a progressão por
gates de evidência, não por calendário de features.

Gate atual do Track A:

`G1 — EXTERNAL ENTRY + VOLUNTARY ACTION / CURRENT TRACK A`.

`ROADMAP-002` continua organizando a progressão de evidência do Track A. Ele não esgota o caminho estratégico inteiro após D008.

Regra de seleção:

> Qual gate deste track este trabalho desbloqueia?

O roadmap não substitui D007/D008 nem autoriza gates futuros.

## Track B — COORDINATION ARCHITECTURE

`G-C1 — COORDINATION REFERENCE MODEL / COMPLETE / EXTENSION JUSTIFIED`.

O resultado canônico está em `GATE-C1-RESULT.md`.

A minimização preservou os dois casos de referência e reduziu a extensão
CZ-specific candidata a quatro classes semânticas:

`Need / Claim / Verification / Decision`.

O restante do modelo deve ser primeiro composto como standards/profile patterns,
incluindo PROV para proveniência, ActivityStreams para eventos sociais/offer-
accept, ODRL para terms/agreement quando aplicável e A2A quando execução por
software agents realmente exigir task/artifact interoperability.

`CZ SEMANTIC MINIMUM CANDIDATE / 4 CLASSES / NOT IMPLEMENTED`.

Gate atual do Track B:

`G-C2 — DUAL-CASE PROFILE REPRESENTATION / CURRENT TRACK B`.

G-C2 deve representar mecanicamente os dois casos usando os standards mapeados
e no máximo as quatro classes CZ candidatas. Ele é teste de representação, não
produção, e não autoriza código de aplicação, schema de banco, deploy, smart
contract, wallet, fundos ou nova divulgação externa.

## Marco ativo — HABITABLE-ALPHA-001

Estado:

`PREPARED / OUTREACH INITIATED / ENTRY NOT YET OBSERVED`

O contato externo foi iniciado, mas o run ainda não foi executado: não há ação
do participante externo observada. Utilidade externa do `HABITABLE-ALPHA-001`
ainda não foi demonstrada.

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

## Contextos externos ativos

### REAL-DEMAND-001 — EdgeLoom

`edgeloom-oss/edgeloom#31`

Finding reproduzido, disclosure privado enviado e resposta do maintainer
recebida. Um Original Record privado da resposta permanece fora do repositório.

Verificação pública em `edgeloom-oss/edgeloom#31` e no `CHANGELOG.md` do
EdgeLoom confirma reprodução, correção, impacto em `0.1.0`, correção do canal de
private vulnerability reporting e crédito público em `0.1.1`.

`DISCLOSURE: RESPONDED / FINDING VALIDATED BY MAINTAINER / REMEDIATION OBSERVED`

`EXTERNAL UTILITY: OBSERVED N=1 IN BOUNDED EDGELOOM REVIEW TRACK`

Em 2026-08-24, a Question 2 de `edgeloom-oss/edgeloom#31` recebeu um teste
empírico com uma conta SmartThings independente. Um driver EdgeLoom patchado
contendo referências ao namespace `adminmusic34435.*` foi aceito por
`smartthings edge:drivers:package` e permaneceu legível como driver pertencente
à conta independente.

`EDGELOOM Q2 / PACKAGE-LEVEL FOREIGN NAMESPACE: VERIFIED N=1`

`EDGELOOM Q2 / PUBLIC REPORT: POSTED / COMMENT #5400160128`

`EDGELOOM Q2 / MAINTAINER EVALUATION: PENDING`

`EDGELOOM Q2 / HUB INSTALL: NOT TESTED`

`EDGELOOM Q2 / RUNTIME: NOT TESTED`

Limite: o teste demonstra somente que ownership do namespace ou criação prévia
de capabilities substitutas não foi necessária no estágio de package/upload
neste N=1. O conteúdo dos Device Integration Profiles não foi relido pela API
genérica (`HTTP 403`).

A conta de teste não possui SmartThings Hub. Não criar Hub, channel ou
enrollment apenas para completar o teste; instalação só volta ao gate se surgir
um contexto real e a propriedade restante for material para uma decisão externa.

Isso não demonstra segunda utilidade externa confirmada, `HABITABLE-ALPHA-001`,
replicação, recorrência, comunidade, adoção, PMF ou escala.

### Candidato HA-001 — ResoVerse Commons

`tombudd/ResoVerse-Commons#4`

Necessidade real e participante candidato identificados; outreach design-first
publicado com proveniência da Célula Zero.

`OUTREACH: PUBLISHED / ENTRY: NOT YET OBSERVED / PARTICIPANT ACTION: NOT YET OBSERVED`

`IMPLEMENTATION: NOT STARTED`

Não implementar antes de resposta/narrowing do maintainer.

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

## Próximos gates paralelos

### Track A

`G1 — EXTERNAL ENTRY + VOLUNTARY ACTION`.

No ResoVerse, observar `ENTRY` e `ACTION` sem inferência. Outreach publicado não
conta como `ENTRY`; mensagem enviada não conta como ação do participante.

A cadeia completa permanece:

`ENTRY → ACTION → RELATION → SECOND PERSON → REAL-WORLD CONSEQUENCE → RETURN`.

EdgeLoom já fornece `EXTERNAL UTILITY N=1` em trilha delimitada separada; isso
não avança automaticamente o HA-001.

No EdgeLoom Q2, o package-level foreign namespace está `VERIFIED N=1` e o
resultado público aguarda avaliação do maintainer. Não fabricar Hub,
channel/enrollment ou runtime apenas para avançar atividade; testar instalação
somente se um contexto real existir e a propriedade restante for material para
a decisão externa.

Trabalho paralelo continua permitido sob a direção humana atual, sem fabricar
participante/utilidade, antecipar implementação ResoVerse ou criar tecnologia
sem propriedade concreta demonstrada.

### Track B

`G-C1 — COORDINATION REFERENCE MODEL / COMPLETE / EXTENSION JUSTIFIED`.

`G-C2 — DUAL-CASE PROFILE REPRESENTATION / CURRENT`.

Próximo trabalho válido: representar os casos econômico e não econômico de
`GATE-C1-RESULT.md` com PROV + ActivityStreams + ODRL/A2A somente quando
aplicáveis, sem introduzir uma quinta classe CZ sem uma propriedade concreta
perdida.

Nenhum Work Packet existente autoriza por si só código de aplicação, schema de
banco, deploy, smart contract, movimentação de fundos ou nova divulgação externa.

## Estado resumido

`OPERATING-LOOP-MVP / CANONICAL / PASS N=1 INTERNAL`

`AGENT-EXECUTION-CONTINUITY / MVP ACCEPTED`

`D007 / CANONICAL`

`D008 / CANONICAL / TRACK A + TRACK B`

`G-C1 COORDINATION REFERENCE MODEL / COMPLETE / EXTENSION JUSTIFIED`

`CZ SEMANTIC MINIMUM CANDIDATE / 4 CLASSES / NOT IMPLEMENTED`

`G-C2 DUAL-CASE PROFILE REPRESENTATION / CURRENT TRACK B`

`ENTRY-POINT-ALPHA-001 / MERGED / CANONICAL`

`CONTRIBUTOR-FRONT-DOOR-001 / MERGED / CANONICAL`

`ROOT-NORMALIZATION / PR-B1 / MERGED / CANONICAL`

`ROADMAP-002 / G1 EXTERNAL ENTRY + VOLUNTARY ACTION / CURRENT TRACK A`

`REPO-HABITABILITY / NOT YET TESTED WITH EXTERNAL CONTRIBUTOR`

`EDGELOOM EXTERNAL UTILITY / OBSERVED N=1 / BOUNDED REVIEW TRACK`

`EDGELOOM Q2 PACKAGE-LEVEL FOREIGN NAMESPACE / VERIFIED N=1`

`EDGELOOM Q2 PUBLIC REPORT / POSTED / MAINTAINER EVALUATION PENDING`

`EDGELOOM Q2 HUB INSTALL + RUNTIME / NOT TESTED`

`HABITABLE-ALPHA-001 / PREPARED / OUTREACH INITIATED / ENTRY NOT YET OBSERVED`

`HABITABLE-ALPHA EXTERNAL UTILITY / NOT YET DEMONSTRATED`

`RESOVERSE #4 / CONTACT PUBLISHED / IMPLEMENTATION NOT STARTED`

`PR #95 / PARKED / NOT REQUIRED FOR HA-001 YET`

`ADOPTION / NOT TESTED`

`HYPOTHESIS-WEB3-001 / NOT TESTED`
