# INTEGRATED-ALPHA-ROADMAP

Class: `WORKING ROADMAP / PRODUCT + ARCHITECTURE`
Status: `ACTIVE ROADMAP`
Canonical repository: `MMaia-jr/celula-zero`
Canonical base reviewed: `14ea3b6bb6797102248f09029fd9dd44b466de37`
Program: `INTEGRATED-ALPHA-001`

---

## 0. Purpose

This document exists to keep Célula Zero moving toward a complete, inhabitable experience without falling into either of two failure modes:

1. isolated micro-patches with no visible path to the intended system;
2. large architectural expansion that adds complexity before a concrete property requires it.

It is not a substitute for `STATE.md`.

- `STATE.md` = short operational state.
- this roadmap = intended trajectory toward the Integrated Alpha.
- Work Packets = authorized execution scope.
- Result Packages = what actually occurred.
- Gate documents = bounded tests and their conclusions.

This roadmap is falsifiable and may be revised by explicit human direction or by evidence produced during execution.

---

## 1. North Star

Célula Zero seeks to make human and human–AI capability socially legible through real action and contextual evidence, allowing people, agents, projects and organizations to discover each other, coordinate, produce observable results and form contextual trust without requiring a single universal platform, governance system, reputation score or technology stack.

Operational transformation:

`intention / need / informal knowledge / attention`
→ `learning`
→ `production`
→ `evidence`
→ `evaluation`
→ `capability`
→ `contextual trust`
→ `opportunity`

The Integrated Alpha is not intended to prove PMF, adoption or scale. It is intended to make the Célula Zero proposition inhabitable enough to execute and observe a complete episode.

---

## 2. Non-negotiable epistemic boundaries

The product, data model, adapters and UI must preserve:

`Original Record ≠ Interpretation`

`Interpretation ≠ Claim`

`Claim ≠ Evidence`

`Evidence ≠ Verification`

`Verification ≠ Decision`

`Decision ≠ Outcome`

`Activity ≠ Contribution`

`Execution ≠ Legitimacy`

`Attestation ≠ Truth`

`Provenance ≠ Truth`

`Visibility ≠ Reputation`

`Proposal ≠ Commitment`

`Commitment ≠ Agreement`

`Social Projection ≠ source/private record`

A human or AI-generated recommendation does not become a legitimate decision merely because it was generated, signed or executed.

---

## 3. Product principle

The Integrated Alpha should become a place a person can inhabit, not merely a collection of administrative forms.

The experience should progressively make visible:

- people;
- software agents;
- projects;
- needs;
- opportunities;
- proposals;
- commitments;
- contributions;
- artifacts;
- claims;
- evidence;
- verifications;
- decisions;
- outcomes;
- trajectories;
- relationships and social activity derived from those events.

The participant should not need GitHub, SQL, terminal, PROV, ActivityStreams, A2A, MCP or any other infrastructure concept in order to obtain value.

---

## 4. Architecture direction

```text
CZ EXPERIENCE
      ↓
CZ DOMAIN CORE
      ↓
DOMAIN EVENTS
      ↓
PROJECTIONS / ADAPTERS
```

### 4.1 CZ Experience

Human-facing interaction and navigation:

- identity / profile;
- discovery;
- people and agents;
- projects;
- needs;
- opportunities;
- proposals and commitments;
- work and delivery;
- evidence and verification;
- decisions and outcomes;
- contextual history;
- social feed / projection.

### 4.2 CZ Domain Core

CZ preserves the coordination semantics and legitimacy boundaries that are not delegated to external infrastructure.

Primary current domain concepts include:

- Actor;
- Project;
- Need;
- Opportunity;
- Proposal;
- Commitment;
- Contribution;
- Artifact;
- Claim;
- Evidence;
- Verification;
- Decision;
- Outcome;
- authority / role / delegation / conditions.

The minimized CZ-specific semantic classes from the coordination research remain bounded to:

- `cz:Need`
- `cz:Claim`
- `cz:Verification`
- `cz:Decision`

unless a concrete lost property later justifies an additional extension.

### 4.3 Domain Events

`domain_events` is treated as the current event spine, not as a complete event platform.

Its role is to preserve reconstructible events with attribution, authority, visibility, causation/correlation and stable ordering/digests.

It still requires materialized product projections and adapter consumers before it can be considered a full social/event system.

### 4.4 Projections / Adapters

External standards and technologies should be used as projections or boundaries where possible rather than becoming the source of truth of the CZ domain.

---

## 5. Technology adoption rule

For every capability, prefer this order:

`Standard`
→ `Official SDK/API`
→ `Official self-host distribution`
→ `Fork exact component`
→ `Build CZ-specific`

Before any custom technology, ask:

> Can this property already be preserved by an existing standard, process or infrastructure?

Classify:

- `ADOPT`
- `MAP`
- `EXTEND`
- `MISSING`

For `EXTEND` or `MISSING`, require an explicit answer to:

> What concrete property is lost if we do not create this?

Without a concrete lost property, do not build.

---

## 6. Current technology positions

| Technology / standard | Current position | Integrated Alpha role |
|---|---|---|
| W3C PROV | `ADOPT` | provenance projection/export; agents, activities, entities, attribution, association, delegation, derivation, bundles |
| ActivityStreams 2.0 | `ADOPT / MAP` | social projection; Offer/Accept/Follow and activity envelope where appropriate |
| A2A | `PLANNED T3 / ADOPT WHEN AGENT BOUNDARY EXISTS` | software-agent discovery/task/message/artifact interoperability |
| MCP | `CONDITIONAL T3+` | only when a real software agent needs external tools/context |
| ODRL | `CONDITIONAL` | machine-readable duties/permissions/constraints/agreements when real terms require it |
| AT Protocol | `HOLD` | future social/network interoperability; not on Alpha critical path |
| Safe | `HOLD` | only if a concrete economic authority/escrow property appears |
| EAS | `HOLD` | optional attestation vehicle; never equivalent to CZ Verification |
| Supabase Auth | `KEEP` | existing authentication unless a concrete lost property justifies change |
| Passkeys / new identity stack | `NOT NOW` | no demonstrated lost property |

---

## 7. Program: INTEGRATED-ALPHA-001

The Integrated Alpha is one cumulative program implemented through large, sequential, inhabitable tranches.

It is not a set of disposable prototypes.

Each tranche remains part of the growing product.

```text
T1
↓
T1 + T2
↓
T1 + T2 + T3
↓
T1 + T2 + T3 + optional T4
```

The final Integrated Alpha gate is larger than any single tranche gate.

---

# T1 — SOCIAL COORDINATION WORLD

## Objective

Make Célula Zero exist as a coherent social coordination environment rather than a disconnected collection of routes/forms.

## Required experience

A participant can:

- know that they are authenticated;
- understand who they are in the system;
- have a Profile distinct from Login, Actor and Reputation;
- navigate from Profile to their attributable actions/projects;
- discover people / agents / projects / needs;
- create or express a Need;
- create a Project where appropriate;
- understand stewardship / contextual responsibility;
- create an Opportunity from a Need or Project context;
- submit a Proposal from another identity;
- receive and evaluate that Proposal;
- form an explicit Commitment;
- follow relevant people/projects/topics where the product model supports it;
- observe a semantic activity feed derived from coordination events;
- navigate from feed events to the underlying attributable context.

## Social Projection

T1 should introduce a public/authorized projection policy over `domain_events`.

Examples:

- Person X created Project Y.
- Project Y expressed Need Z.
- Opportunity A opened.
- Proposal B was submitted.
- Proposal B was accepted.

The projection must never silently expose private Original Records, private proposals, evidence or other restricted material.

## Interoperability in T1

- ActivityStreams: `ADOPT / MAP` for the Social Projection representation.
- PROV: architecture-compatible, but full provenance projection may land in T2.
- AT Protocol: `HOLD`.
- A2A/MCP: out of T1 path.

## T1 Gate

Candidate PASS condition:

> A non-technical participant can enter, understand who and what exists, discover a real need/opportunity, and form a comprehensible commitment with another identity without learning the underlying infrastructure.

T1 PASS does not prove external utility, retention, market demand or adoption.

---

# T2 — WORK → EVIDENCE → DECISION

## Objective

Make a real coordination episode reconstructible from Need through execution, evaluation and authorized decision.

## Required experience

Extend the T1 episode through:

`Commitment`
→ `Contribution`
→ `Artifact`
→ `Claim`
→ `Evidence`
→ `Verification`
→ `Decision`
→ `Outcome`

The UI should help a participant answer:

- Why did this work exist?
- Who agreed to what?
- What actually happened?
- What was produced?
- What is being claimed?
- What supports the claim?
- Who checked it and against which criteria?
- Who had authority to decide?
- What consequence was later observed?

## Required invariants

T2 must preserve in product behavior, not only documentation:

- Artifact ≠ Evidence.
- Executor checks ≠ independent Verification.
- Verification ≠ Decision.
- Decision ≠ Outcome.
- Outcome remains a Claim until appropriately evidenced/verified.
- Result Package ≠ verified execution truth.

## Interoperability in T2

- ActivityStreams: social projection continues.
- PROV: introduce a concrete export/projection from native CZ records/events.
- ODRL: only if real terms require machine-readable policy semantics.
- EAS: HOLD.
- Safe: HOLD.

## T2 Gate

Candidate PASS condition:

> One real episode can be reconstructed from Need to authorized Decision, with the system preserving the distinction between source records, claims, evidence, verification, decision and outcome.

If the real-world consequence is not yet observable, the result may legitimately be `INCONCLUSIVE` at Outcome.

---

# T3 — HUMAN ↔ AI COORDINATION

## Objective

Introduce a real SoftwareAgent as a participant under bounded human authority without collapsing execution into legitimacy.

## Required experience

At least one real episode follows a path equivalent to:

`Human / authority-bearing Actor`
→ `bounded delegation`
→ `SoftwareAgent`
→ `task execution`
→ `Artifact / Result Package`
→ `Human Assurance`
→ `Verification`
→ `Human Decision`

## A2A

Use A2A when a real agent-to-agent / system-to-agent task/message/artifact boundary is present.

Map, where appropriate:

- CZ `AI_AGENT` ↔ A2A Agent Card;
- delegated/executed work ↔ A2A Task;
- produced deliverable ↔ A2A Artifact.

A2A transport does not establish truth, legitimacy or approval.

## MCP

MCP is not required merely because a SoftwareAgent exists.

Adopt MCP only if the chosen real task requires access to external tools/context and MCP preserves that boundary better than a smaller existing mechanism.

Any MCP use must follow least privilege, explicit scope, minimized secrets and network access, and safe execution defaults.

## T3 Gate

Candidate PASS condition:

> A SoftwareAgent performs useful real work under bounded, reconstructible authority and returns a result that can be separately assessed, verified and decided upon without the agent acquiring implicit legitimacy or unlimited authority.

---

# T4 — ECONOMY / EXTERNAL INTEROPERABILITY

Status: `OPTIONAL FOR FIRST INTEGRATED ALPHA / HOLD UNTIL PROPERTY EXISTS`

T4 is not automatically required to close the first Integrated Alpha.

Possible future triggers include:

- real payment between parties;
- escrow / conditional settlement;
- cross-party enforceability;
- machine-readable obligations;
- cryptographically portable attestations;
- external social/network interoperability;
- portable identity or credentials when a concrete property requires them.

Candidate technologies must be selected only after comparing conventional and decentralized alternatives.

Potential tools include:

- PIX / conventional payment rails;
- Stripe or equivalent;
- Safe;
- ODRL;
- EAS;
- AT Protocol;
- smart contracts when a concrete economic property cannot be preserved more simply.

`smart contract ≠ DeFi`

`attestation ≠ verification`

`payment ≠ contribution`

`economic right ≠ sponsorship`

---

## 8. Capability maturity vocabulary

A capability should never be called simply "implemented" without qualification.

Use, where applicable:

1. `PLANNED`
2. `REPRESENTED`
3. `IMPLEMENTED`
4. `INTEGRATED`
5. `HABITABLE`
6. `OBSERVED IN REAL EPISODE`
7. `USEFUL TO EXTERNAL USER`
8. `REPEATED`
9. `ADOPTED`
10. `SCALABLE`

A migration, route, RPC or unit test is not sufficient by itself to classify a human-facing capability as `HABITABLE`.

---

## 9. Current capability snapshot

Initial working assessment at canonical base `14ea3b6b...`:

| Capability | Current working assessment |
|---|---|
| Profile | `IMPLEMENTED / PARTIALLY INTEGRATED / HABITABILITY NOT ESTABLISHED` |
| Actor attribution | `IMPLEMENTED BACKEND / WEAKLY USER-OBSERVABLE` |
| Project | `IMPLEMENTED / USER-OBSERVABLE` |
| Project ↔ Steward ↔ Profile | `PARTIAL / INTEGRATION GAP OBSERVED` |
| Need | `SEMANTICALLY RETAINED / PRODUCT INTEGRATION INCOMPLETE` |
| Opportunity | `IMPLEMENTED BACKEND + ROUTE / HABITABILITY GAP OBSERVED` |
| Proposal | `IMPLEMENTED PARTIALLY / END-TO-END HABITABILITY NOT ESTABLISHED` |
| Commitment | `IMPLEMENTED BACKEND / PUBLIC EXPERIENCE INCOMPLETE` |
| Contribution | `IMPLEMENTED BACKEND / WORKBENCH-HEAVY` |
| Artifact | `IMPLEMENTED BACKEND / WORKBENCH-HEAVY` |
| Claim / Evidence | `IMPLEMENTED BACKEND / NOT HABITABLE` |
| Verification | `IMPLEMENTED BACKEND / INTERNAL LOOP / NOT HABITABLE` |
| Decision | `PARTIAL IMPLEMENTATION / NOT SOCIAL-PRODUCT COHERENT` |
| Outcome | `SEMANTICALLY REPRESENTABLE / PRODUCT EXPERIENCE INCOMPLETE` |
| Social Projection | `PARTIAL CONCEPT + EVENT SPINE / MATERIALIZED FEED MISSING` |
| PROV projection | `NOT IMPLEMENTED AS PRODUCTION ADAPTER` |
| ActivityStreams projection | `NOT IMPLEMENTED` |
| A2A agent boundary | `NOT IMPLEMENTED IN PRODUCT` |
| MCP tool boundary | `NOT REQUIRED YET` |
| AT Protocol | `HOLD` |
| Safe / EAS | `HOLD` |

This table is a working interpretation and must be updated by actual implementation/results rather than optimistic inference.

---

## 10. NOT NOW

The following are not on the current critical path unless new evidence demonstrates a lost property:

- token;
- NFT / airdrop;
- DAO;
- universal reputation score;
- own blockchain;
- own agent protocol;
- own general-purpose social protocol;
- full Bluesky/AT clone;
- AT Protocol as Alpha dependency;
- Safe without a real economic case;
- EAS without an attestation requirement;
- new identity stack / Passkeys without lost property;
- graph database merely for conceptual elegance;
- global-scale infrastructure;
- PMF/adoption claims from Alpha behavior.

`NOT NOW ≠ NEVER`.

---

## 11. What would change this roadmap?

This roadmap must change when evidence or human direction invalidates its assumptions.

Examples:

- If T1 participants do not derive value from observing coordination activity, revisit the social/world hypothesis.
- If Need is useful semantically but harmful as a separate UI object, simplify presentation without destroying the underlying distinction.
- If a real agent task requires tool access, promote MCP from conditional to active for that use case.
- If real money requires independent conditional settlement, reopen Safe / escrow / conventional alternatives.
- If an external network must consume CZ social records, reopen AT Protocol or other social interoperability options.
- If a standard fails to preserve a concrete property, classify the gap `EXTEND` or `MISSING` and evaluate the smallest CZ-specific addition.
- If a tranche reveals that the current domain model imposes substantial user friction without preserving a real property, simplify it.

History must be preserved when direction changes.

---

## 12. Integrated Alpha final gate

The program is not complete merely because T1, T2 or T3 has code merged.

Candidate final question:

> Can a person enter Célula Zero and live a complete human–human or human–AI cooperation episode from a real Need to an evaluable consequence while the system preserves identity, authority, contribution, evidence, verification, decision and history in a way that is understandable without privileged knowledge of the infrastructure?

Allowed result:

- `PASS`
- `FAIL`
- `PARTIAL`
- `INCONCLUSIVE`

A PASS remains bounded and does not demonstrate PMF, adoption or scale.

---

## 13. Horizon beyond Integrated Alpha

```text
INTEGRATED ALPHA
      ↓
REAL EPISODE N=1
      ↓
REPEATED USE
      ↓
MULTIPLE PARTICIPANTS
      ↓
HABITABLE COMMUNITY
      ↓
EXTERNAL INTEROPERABILITY
      ↓
NETWORK OF NETWORKS
```

Do not collapse the ladder:

`Alpha ≠ PMF`

`Repeated use ≠ adoption`

`Community ≠ network effect`

`Interoperability ≠ Protocol of Protocols achieved`

`Network ≠ global scale`

---

## 14. Current gate

```text
CURRENT PROGRAM:
INTEGRATED-ALPHA-001

CURRENT TRANCHE:
T1 — SOCIAL COORDINATION WORLD

CANONICAL BASE REVIEWED:
14ea3b6bb6797102248f09029fd9dd44b466de37

ROADMAP STATUS:
PREPARED / NOT CANONICAL

IMPLEMENTATION STATUS:
NOT STARTED UNDER THIS ROADMAP

NEXT MATERIAL ACTION:
prepare a bounded T1 Work Packet against the current codebase

NEXT MATERIAL GATE:
T1 integrated + inhabitable enough for a coherent end-to-end coordination episode

DO NOT INFER:
T1 code merged = T1 habitable
T1 pass = external utility
Integrated Alpha = PMF
agent execution = legitimate decision
provenance = truth
visibility = reputation
```

---

## 15. Promotion rule

This document remains non-canonical until explicit human authorization promotes it through the repository workflow.

Preparation does not imply:

`COMMITTED`

`PUSHED`

`PR OPENED`

`MERGED`

`CANONICAL`
