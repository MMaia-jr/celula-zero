# D008 — COORDINATION GRAPH + SOCIAL PROJECTION

Class: `DECISION / HUMAN PRODUCT DIRECTION`
Date: 2026-08-24
Document state at creation: `PREPARED`
Canonicality: determined by GitHub merge state. This file does not self-declare a permanent repository state.

## Original Record

Human direction preserved from the 2026-08-24 product/architecture discussion:

> "Sinceramente ... muito ruim. estas hipotesis e experimentos nos impedem de avançar significativamente no que queremos ser no futuro. Eu acho que o ponto é exatamente o contrario . devemos ter capacidade de coordenar os agentes em um ambiente/ecossistema . nao gosto"

> "eu continuo acreditando no potencial de fazer disto uma rede social. Onde pessoas podem entrar apenas pra ver o que esta acontecendo... fazer sua primeira contribuiçao somente meses depois.... como criar uma conta no instagram com 0 post ... mas que consome o conteudo enquanto aprende naturalmente a usar a tecnologia."

> "continuo achando que contratos inteligentes, assinaturas e dinheiro como uma forma de trazer responsabilidade é util"

> "acredito que antes disto precisamos investigar/pesquisar se este interesse de longo prazo ja existe tecnologia que o faça ou tente fazer ... se estas sao complementares , competiçao ... etc."

After the research and synthesis round, the founder authorized preparation of this direction and its reference model:

> "perfeito, vamos fazer"

The statements above are preserved as Original Record. The interpretation and decision below are separate derived content.

## Context

At the time of this decision, `STATE.md` records D007 and `G1 — EXTERNAL ENTRY + VOLUNTARY ACTION` as the immediate critical path. D007 preserved D006 as broader product ambition while deferring financing, smart-contract/testnet, marketplace, native messaging and other broad capabilities from the immediate critical path.

The 2026-08-24 research round investigated whether the longer-term interest already has existing technologies, standards, competitors, complements or predecessors. The research outputs are inputs to this decision, not canonical operational truth. They contain claims of different confidence and some factual inconsistencies; any concrete technology choice still requires direct verification against primary/current sources.

The direction below therefore changes priority without silently rewriting D006, D007, `HABITABLE-ALPHA-001`, or previous results.

## Interpretation

The founder does not want the future shape of Célula Zero to be determined exclusively by a sequence of small external-user experiments.

Real-world experiments remain useful for utility, behavior and consequence, but the project should also advance deliberately toward a future capability: an environment/ecosystem in which people, software agents, organizations, communities and projects can coordinate while preserving authority, conditions, contribution, evidence and contextual history.

The social-network hypothesis remains active: a participant may legitimately observe and learn for a long period before contributing. Observation is not automatically treated as failed participation.

Smart contracts, signatures and programmable economic mechanisms are not defaults, but they are no longer excluded merely because they are future-facing. They may be investigated or adopted when they preserve a concrete property better than conventional infrastructure.

## Decision

Establish two distinct but interacting tracks.

### TRACK A — REAL-WORLD HABITABILITY

Continue the existing external reality track, including `HABITABLE-ALPHA-001`, EdgeLoom, ResoVerse and other legitimate real contexts.

Purpose:

- observe external entry and voluntary action;
- test real utility and real-world consequence;
- preserve failures, returns and non-returns honestly;
- provide reality against which architecture can be challenged.

Track A does not automatically define the architecture of the future system.

### TRACK B — COORDINATION ARCHITECTURE

Activate a strategic architecture/product track whose first gate is:

`G-C1 — COORDINATION REFERENCE MODEL`

Its purpose is to determine the smallest interoperable model that can represent cooperation among people, software agents and organizations using existing standards wherever possible, and to determine how the same cooperation could be projected as a habitable social experience.

Track B is an active strategic priority. It does not fabricate external utility, adoption, PMF or scale.

Neither track proves the other.

## Track B central questions

1. What is the smallest cooperation model among people, software agents and organizations that can be composed from existing standards while preserving the properties Célula Zero requires?
2. Which relationships are already adequately preserved by existing standards or infrastructure?
3. Which relationships require mapping, extension or a genuinely missing semantic/property?
4. How can the same underlying cooperation be projected as a social experience that remains useful to an observer who is not yet contributing?
5. How can public projection avoid exposing private Original Records, sensitive material or unnecessary personal data?

## Working architectural hypothesis — not implementation decision

### Coordination Graph

Use `Coordination Graph` as a working name for a reconstructible set of relations involving concepts such as:

`Actor → Intent → Need → Opportunity → Proposal → Commitment → Delegation → Contribution → Artifact → Claim → Evidence → Verification → Outcome`

Actors may include, at minimum when context permits:

- `Person`;
- `SoftwareAgent`;
- `Organization`;
- `Community`;
- `Project`.

This list does not assert that every item is a new primitive. Existing standards must be mapped first.

Preserve:

`Original Record ≠ Interpretation ≠ Claim ≠ Evidence ≠ Verification ≠ Decision ≠ Reputation`

and:

`activity ≠ contribution ≠ result ≠ evidence ≠ evaluation ≠ reputation`.

### Social Projection

The Coordination Graph is not automatically public.

`Social Projection` is the working name for a derived, policy-controlled view of selected coordination events that may be shown in a feed, project view, profile, search result or other public/limited surface.

For example, private reality may contain proposal documents, negotiations, private messages, source artifacts, reviewer reports and personal/company information, while a permitted public projection may state only:

```text
Project X needs a frontend
4 proposals received
Proposal selected
Milestone 1 completed
Independent verification: PASS
New need: accessibility review
```

A public projection is derived information. It does not replace the underlying Original Records or automatically become Evidence, Verification, Decision or Reputation.

## Social participation hypothesis

Célula Zero may support legitimate states or modes such as:

`OBSERVER → FOLLOWER → LEARNER → PARTICIPANT → CONTRIBUTOR → CREATOR → COORDINATOR`

This is not a mandatory funnel and does not imply that all users progress through the sequence.

A person may create an account and spend months observing, following and learning before making a first contribution. This is a product hypothesis to be tested, not demonstrated adoption or retention.

Potential social objects include people, agents, organizations, communities, projects, needs, opportunities, capabilities, trajectories, contributions, verifications and outcomes.

Visibility must not be silently converted into reputation.

## Relationship to the Protocol of Protocols

`genesis/INTENT-000.md` remains longer-term direction under investigation.

The current research weakens the assumption that `Protocol of Protocols` must mean a new universal wire protocol created by Célula Zero.

The working hypothesis becomes:

> A future Protocol of Protocols may emerge as a minimal semantic mapping/composition layer across existing protocols and systems, but only where a concrete property remains lost after adopting or mapping existing standards.

A new CZ primitive or protocol is justified only after `ADOPT / MAP / EXTEND / MISSING` analysis identifies a concrete lost property.

## Initial technology policy

The following are investigation positions, not selected production architecture:

| Property | Initial position |
|---|---|
| agent communication | `ADOPT/MAP` existing agent interoperability standards before building |
| agent → tools/data | `ADOPT/MAP` existing tool/context standards before building |
| capability description/discovery | `ADOPT/MAP` existing schemas/directories before building |
| provenance | `ADOPT/MAP` W3C PROV before inventing provenance primitives |
| social graph/feed infrastructure | `ADOPT/MAP` existing open/social infrastructure before building |
| identity/authentication | `ADOPT/MAP` existing mechanisms before building |
| authority/treasury | `ADOPT/MAP` existing mechanisms when the property is required |
| jobs/escrow | `MAP` existing job/escrow standards and conventional alternatives |
| payments | choose fiat/PIX/stablecoin/other only from concrete conditions |
| dispute | `MAP` existing legal/technical mechanisms before building |
| contextual trust | `EXTEND/MISSING` candidate; must be demonstrated |
| Coordination Graph semantics | `EXTEND/MISSING` candidate; must be demonstrated |
| Social Projection semantics/policy | `EXTEND/MISSING` candidate; must be demonstrated |

No row above authorizes a particular provider, protocol, chain, database or product dependency.

## Smart contracts and DeFi

Preserve:

`smart contract ≠ DeFi`.

Smart contracts may be investigated when they preserve a concrete property such as committed budget, conditional settlement, scoped authority or independent evaluation better than a conventional alternative.

The fact that a mechanism is decentralized, on-chain or programmable is not itself sufficient justification.

DeFi is considered only when a concrete financial property requires liquidity, collateral markets, lending, insurance, exchange or another DeFi-specific primitive.

## Required reference cases

`G-C1` must include at least two reference cases.

### Case A — economic coordination

A Célula Zero frontend need with multiple candidate providers and a bounded budget, modeled through:

`Need → Opportunity → Proposals → Selection → Agreement → Funding → Delegation → Execution → Milestones → Artifact → Verification → Acceptance/Dispute → Payment → Contextual History → Future Opportunity`

### Case B — non-economic coordination

A real or explicitly reference-only context in which people and agents cooperate without payment:

`Need → Conditions → Proposal/Acceptance → Contribution → Artifact/Result → Claim/Evidence → Verification/Evaluation → Outcome → Contextual History → New Relation/Opportunity`

If the model only makes sense when money is present, the project has found a marketplace model rather than the broader coordination model being investigated.

## G-C1 completion conditions

`G-C1 — COORDINATION REFERENCE MODEL` is complete when:

1. both reference cases are represented end-to-end;
2. each required relation is mapped against relevant existing standards/infrastructure;
3. each property receives an explicit `ADOPT / MAP / EXTEND / MISSING` disposition;
4. the analysis states what concrete property would be lost without each proposed extension;
5. the same underlying events can be represented as a bounded Social Projection with privacy/provenance boundaries;
6. the result explicitly compares the model against obvious adjacent categories such as conventional marketplaces, social networks, project-management systems and agent-commerce systems;
7. the output reaches one of these legitimate conclusions:
   - `COMPOSITION SUFFICIENT` — no new CZ technical primitive justified;
   - `EXTENSION JUSTIFIED` — one or more concrete properties require a bounded CZ extension;
   - `MISSING PROPERTY IDENTIFIED` — a genuinely absent property is defined precisely;
   - `INCONCLUSIVE` — more targeted investigation is required.

The gate does not require inventing a missing property in order to pass as an investigation.

## Relationship to D006 and D007

D006 remains preserved as broader product ambition.

D007 remains valid for Track A and its Habitable Alpha sequencing, but D008 supersedes the interpretation that D007's G1 is the project's **only** active strategic path.

The current structure becomes:

```text
TRACK A
G1 — EXTERNAL ENTRY + VOLUNTARY ACTION
(real-world habitability and utility observation)

TRACK B
G-C1 — COORDINATION REFERENCE MODEL
(active strategic architecture/product investigation)
```

This amendment does not retroactively alter any D006/D007 experiment or result.

## Authority boundary

The human authorization `"perfeito, vamos fazer"` authorizes preparation of:

- this D008 document;
- `docs/COORDINATION-REFERENCE-MODEL-001.md`;
- a bounded branch containing those prepared documents.

It does not by itself authorize:

- implementation code;
- database/schema changes;
- deployment;
- smart-contract implementation or deployment;
- wallet creation;
- movement or custody of funds;
- token/NFT issuance;
- processing of new participant personal data;
- new external outreach;
- opening a pull request;
- merging to `main`;
- declaring D008 canonical before human review and merge.

## Canonicality

Until human review and authorized merge:

`D008 / PREPARED / NOT CANONICAL`

`G-C1 / PREPARED / NOT CANONICAL`

END OF D008
