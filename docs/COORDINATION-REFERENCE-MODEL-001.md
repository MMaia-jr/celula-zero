# COORDINATION-REFERENCE-MODEL-001

Status: `PREPARED / REFERENCE MODEL / NOT EXECUTED`
Date: 2026-08-24
Related decision: `decisions/D008-coordination-graph-social-projection.md`
Gate: `G-C1 — COORDINATION REFERENCE MODEL`

## 1. Purpose

This document tests a narrow architectural question before implementation:

> What is the smallest model needed to represent cooperation among people, software agents and organizations while adopting or mapping existing standards wherever possible?

It also tests a product question:

> Can the same underlying cooperation be projected as a social, human-readable experience for someone who is only observing, without exposing the full private/source record or collapsing visibility into reputation?

This is a reference model, not an implementation specification, database schema, chosen stack, protocol proposal or proof of external utility.

## 2. Required distinctions

Preserve throughout:

`Original Record ≠ Interpretation ≠ Claim ≠ Evidence ≠ Verification ≠ Decision ≠ Reputation`

`activity ≠ contribution ≠ result ≠ evidence ≠ evaluation ≠ reputation`

`Proposal ≠ Commitment`

`Commitment ≠ Agreement`

`Verification ≠ Decision ≠ Outcome`

`identity ≠ authentication ≠ authorization ≠ capability ≠ trust`

`provenance ≠ truth`

`attestation ≠ verification`

`smart contract ≠ DeFi`.

## 3. Standards discipline

For every required property ask:

> Can this property already be preserved by a standard, process or existing infrastructure?

Classify:

`ADOPT / MAP / EXTEND / MISSING`

For `EXTEND` or `MISSING`, state:

> What concrete property is lost if Célula Zero does not add anything?

Technology names below are candidates for mapping. Mentioning a candidate is not a production selection and does not establish its current maturity or adoption without separate verification.

## 4. W3C PROV baseline

W3C PROV is the first provenance baseline to adopt/map rather than replace.

Relevant PROV-DM concepts include:

- `Entity` — physical, digital, conceptual or other thing with fixed aspects;
- `Activity` — something occurring over time that uses or generates entities;
- `Agent` — something bearing responsibility for an activity, entity or another agent's activity;
- `Person`, `Organization`, `SoftwareAgent` — standard agent types;
- `wasGeneratedBy`, `used`, `wasDerivedFrom`, `wasAttributedTo`, `wasAssociatedWith`;
- `actedOnBehalfOf` — delegation for a specific activity while the responsible agent retains some responsibility;
- `Plan` — an entity representing actions/steps intended to achieve goals;
- `Bundle` — a named provenance set that is itself an entity, enabling provenance of provenance;
- extension through `prov:type`, `prov:role`, application-specific attributes and namespaces.

Reference: W3C PROV-DM Recommendation, 30 April 2013 — https://www.w3.org/TR/prov-dm/

### Implication

Célula Zero should not create its own replacement for generic provenance, agent responsibility or delegation without demonstrating a lost property.

PROV does **not** by itself define the domain semantics of `Need`, `Opportunity`, `Proposal`, `Commitment`, `Evidence`, `Verification`, `Outcome`, economic agreement or contextual trust. Those mappings/extensions are the subject of this reference model.

## 5. Working object/relationship inventory

The inventory below is intentionally broader than the expected final core. Items may collapse into mappings or derived views after analysis.

### Responsible actors / authority

- Person
- SoftwareAgent
- Organization
- Role
- Authority/Delegation

### Coordination contexts / collective objects

- Community
- Project

A Community or Project is not assumed to possess authority merely because it is represented. Actions and decisions attributed to a collective/context require an identifiable governance rule, authorized representative or responsible agent when applicable.

### Motivation/coordination

- Intent
- Need
- Capability
- Opportunity
- Conditions
- Proposal
- Commitment
- Agreement
- Decision

### Execution/provenance

- Activity/Work
- Contribution
- Artifact
- Claim
- Evidence
- Verification/Evaluation
- Outcome
- Dispute

### Economy

- Budget
- Funding/Escrow
- Payment/Reward
- Bond/Stake when contextually justified

### Social/contextual views

- Contextual History
- Contextual Trust Judgment
- Follow/Observe relation
- Social Projection/Event

None of these are automatically database tables or protocol primitives.

## 6. Reference Case A — Economic coordination

### Scenario

Célula Zero needs a bounded frontend implementation.

Reference-only assumptions:

- budget ceiling: USD 4,000 equivalent;
- four independent candidate providers;
- different prices, delivery plans, conditions and evidence of prior capability;
- at least one explicit verification step before final acceptance;
- payment mechanism is intentionally undecided.

This is not authorization to spend money or solicit providers.

### Required sequence

```text
Need
→ Opportunity
→ 4 Proposals
→ Comparison
→ Selection Decision
→ Agreement
→ Commitment(s)
→ Funding
→ Delegation/Authorization
→ Execution
→ Milestones
→ Artifact
→ Claim/Evidence
→ Verification
→ Acceptance Decision or Dispute
→ Payment/Refund
→ Outcome
→ Contextual History
→ Future Opportunity
```

### Case A semantic requirements

| Stage | Minimum property to preserve | Candidate mapping/infrastructure | Initial disposition | Open gap/question |
|---|---|---|---|---|
| Need | who needs what, in which context | CZ domain semantics; existing issue/project systems | `EXTEND/MAP` | PROV can preserve provenance of a Need record but does not define Need semantics |
| Opportunity | bounded reason for another actor to act | CZ current Operating Loop; marketplace/job systems | `EXTEND/MAP` | opportunity must not be collapsed into a post/job listing |
| Proposal | attributed offer + delivery + conditions | CZ current semantics; job/bidding systems | `EXTEND/MAP` | proposal must remain distinct from commitment |
| Comparison | criteria and attributable analysis | ordinary application logic / decision-support | `ADOPT/MAP` | AI ranking must not become legitimate selection automatically |
| Selection Decision | authorized decision choosing a proposal | Decision record + provenance | `EXTEND/MAP` | authority for the decision must be explicit |
| Agreement | prospective terms governing the relation and one or more commitments | legal/e-sign/job-contract systems + provenance | `EXTEND/MAP` | conditions, versioning, consent and governing terms need explicit semantics |
| Commitment | explicit undertaking by an authorized actor under stated conditions | CZ current semantics; workflow/job systems | `EXTEND/MAP` | must remain distinct from proposal and need not be identical to the broader Agreement |
| Funding | capital/resource actually committed | conventional escrow, PIX/payment provider, smart-contract escrow candidates | `MAP` | choose only from jurisdiction, risk and required property |
| Delegation | who may act for whom, for what activity/scope | PROV `actedOnBehalfOf`; role/permission systems | `ADOPT/MAP` | PROV records delegation provenance; enforceable permission may require separate infrastructure |
| Execution | activity performed by identified actors/agents | PROV `Activity` + `wasAssociatedWith` + `Plan` | `ADOPT` | execution semantics may remain in native system |
| Milestone | bounded state/output within an agreement | project/job systems + PROV entities/activities | `MAP` | milestone acceptance semantics are domain-specific |
| Artifact | observable produced thing | PROV `Entity` + `wasGeneratedBy`; Git/files/etc. | `ADOPT` | artifact is not automatically evidence |
| Claim | attributed contestable statement | CZ domain entity + provenance | `EXTEND` | PROV can preserve provenance, not CZ claim semantics by itself |
| Evidence | contextual use of a source in relation to a Claim | CZ extension over PROV entities/usage/derivation | `EXTEND` | must not convert source/provenance into truth |
| Verification | attributed evaluation under criteria/method | PROV Activity producing Verification Record; attestation/validation systems as candidates | `EXTEND/MAP` | verification semantics, criteria and contestability remain domain-specific |
| Decision | authorized choice based on available records, criteria and authority | decision record + provenance + local governance | `EXTEND/MAP` | verification may inform a decision but cannot silently become the decision |
| Acceptance Decision | authorized contractual/operational decision to accept, reject or continue | Decision/agreement system | `EXTEND/MAP` | Verification ≠ Decision; Decision ≠ Outcome |
| Dispute | disagreement over facts/criteria/acceptance | contractual/legal/arbitration mechanisms; technical candidates | `MAP` | subjective quality and appeal rules are unresolved |
| Payment/refund | settlement according to agreement/outcome | fiat/PIX/payment provider/stablecoin/job escrow candidates | `ADOPT/MAP` | blockchain not required by default |
| Outcome | real consequence of the cooperation | contextual record + evidence/measurement | `EXTEND` | verification of deliverable does not prove external outcome |
| Contextual History | reconstructible episode with provenance | PROV Bundle + CZ domain links/views | `EXTEND/MAP` | history must remain queryable without becoming universal reputation |
| Future Opportunity | later action enabled by prior context/history | CZ domain semantics | `EXTEND` | causality should not be inferred automatically |

### What economic primitives do not solve

Even a perfect escrow does not by itself establish:

- provider capability;
- quality of the work;
- legitimacy of the evaluator;
- correctness of subjective criteria;
- compensation for lost time/opportunity;
- contextual meaning of the completed episode;
- trustworthiness for a different future context.

Those properties must remain separate.

## 7. Reference Case B — Non-economic coordination

### Scenario

A project or community has a real bounded need. A person and one or more software agents cooperate to produce a useful contribution. No payment or economic right is assumed.

This case is reference-only unless linked to a separately authorized real context.

### Required sequence

```text
Need
→ Conditions
→ Proposal
→ Commitment/Acceptance
→ Delegation where needed
→ Contribution
→ Artifact/Result
→ Claim/Evidence
→ Verification/Evaluation
→ Decision where required
→ Outcome
→ Contextual History
→ New Relation or Opportunity
```

### Case B semantic requirements

| Stage | Minimum property | Candidate mapping | Initial disposition | Open gap/question |
|---|---|---|---|---|
| Need | real problem/context | native channel + CZ interpretation/confirmation | `MAP/EXTEND` | natural-language source must remain separate from interpretation |
| Conditions | scope, consent, rights, constraints | agreement/policy records | `EXTEND/MAP` | conditions may be social/legal, not technical |
| Proposal | attributed offer under stated conditions | CZ current Operating Loop | `EXTEND/MAP` | preserve Proposal ≠ Commitment |
| Commitment/Acceptance | explicit undertaking or acceptance by an authorized actor | CZ current semantics + agreement/policy records | `EXTEND/MAP` | commitment is not assumed to be identical to a broader Agreement |
| Delegation | AI/human authority for bounded work | PROV delegation/association | `ADOPT/MAP` | enforcement separate from provenance |
| Contribution | actual work/resource provided | activity + attributed domain classification | `EXTEND/MAP` | Activity ≠ Contribution; contribution is a contextual classification |
| Artifact/Result | produced output and observed result | PROV Entity/Activity + native artifact system | `ADOPT/MAP` | Artifact ≠ Result |
| Claim/Evidence | contestable statement + supporting source relationship | CZ semantics over provenance | `EXTEND` | core candidate for domain layer |
| Verification/Evaluation | review under explicit criteria | verification activity + record | `EXTEND/MAP` | reviewer authority/competence is contextual |
| Decision | authorized choice when the context requires one | decision record + provenance + local governance | `EXTEND/MAP` | verification may inform but does not replace legitimate decision authority |
| Outcome | consequence in real context | contextual record | `EXTEND` | do not infer from verification or decision alone |
| Contextual History | reconstructible episode | PROV Bundle + CZ links/view | `EXTEND/MAP` | privacy/selective disclosure required |
| New Relation/Opportunity | later cooperation enabled | CZ domain semantics | `EXTEND` | should be observed, not manufactured |

### Falsifier for the broader coordination thesis

If this case can be represented and operated satisfactorily using ordinary channels + existing standards without any CZ-specific semantic or product layer that adds concrete value, the result should be recorded as:

`COMPOSITION SUFFICIENT`.

Do not invent a missing layer to preserve the project thesis.

## 8. PROV mapping in more detail

### Direct or strong mappings

| CZ concern | PROV concept | Fit |
|---|---|---|
| person actor | `prov:Person` | strong |
| organization actor | `prov:Organization` | strong |
| running software actor | `prov:SoftwareAgent` | strong |
| work/execution | `prov:Activity` | strong |
| artifact/source/record | `prov:Entity` | strong |
| artifact generation | `wasGeneratedBy` | strong |
| source/input used by work/review | `used` | strong |
| derived artifact/view | `wasDerivedFrom` | strong |
| authorship/responsibility for entity | `wasAttributedTo` | strong |
| actor role in activity | `wasAssociatedWith` + `prov:role` | strong |
| plan followed in activity | `prov:Plan` via Association | strong |
| AI acting for human/org in bounded activity | `actedOnBehalfOf` | strong provenance mapping |
| provenance-of-provenance | `prov:Bundle` | strong |
| domain specialization | `prov:type`, `prov:role`, custom namespaces | strong extension mechanism |

### Partial mappings requiring CZ/domain semantics

| CZ concern | Why PROV alone is insufficient |
|---|---|
| Intent | PROV can preserve an Intent record and its provenance but does not define intent/consent semantics |
| Need | domain meaning is outside generic provenance |
| Capability | can be asserted/attributed, but demonstrated capability requires domain evidence/history semantics |
| Opportunity | not a generic provenance relation |
| Conditions | may be represented as entities/plan/policy, but agreement meaning is domain-specific |
| Proposal | can be an entity with provenance; proposal status/semantics are domain-specific |
| Commitment | requires legitimate undertaking/acceptance and authority semantics beyond provenance |
| Agreement | requires governing terms, consent/versioning and relation semantics beyond provenance |
| Decision | can be preserved as a record with provenance, but legitimacy/authority and decision semantics are domain/governance concerns |
| Contribution | classification of activity/resource as contribution is contextual |
| Claim | can be an entity/statement but contestability and claim-evidence relation are domain semantics |
| Evidence | provenance supports traceability, not the epistemic relation `source used as evidence for claim` by itself |
| Verification | can be modeled as activity + record, but criteria/status/authority are domain semantics |
| Outcome | consequence is not identical to generated artifact or verification |
| Contextual Trust | judgment based on history is outside PROV and must not become provenance=trust |
| Social Projection | PROV can preserve derivation of a view, but visibility/privacy/feed policy is outside PROV |

## 9. Candidate external mappings to verify

The next targeted standards review should verify only mappings that matter to unresolved rows. Candidate families include:

- agent interoperability/discovery: A2A and capability-schema efforts such as OASF/AGNTCY;
- tool/data access: MCP;
- agent identity/validation: relevant current standards/registries, including ERC-8004 if appropriate;
- job/escrow/evaluator: ERC-8183 and conventional marketplace/escrow models;
- authority/treasury: Safe/Hats/Zodiac or conventional authorization systems;
- attestations: EAS and W3C Verifiable Credentials where they preserve a concrete property;
- social/federation: AT Protocol, ActivityPub or other open social infrastructure;
- dispute: contractual/legal arbitration and technical mechanisms such as Kleros/UMA only where appropriate;
- payments: PIX, payment providers, stablecoins/x402 or other rails according to actual conditions.

This list is a research queue, not an architecture decision.

## 10. Social Projection model

### Principle

`underlying coordination reality ≠ public social projection`.

A projection is a derived representation subject to privacy, consent, rights and disclosure policy.

### Example — Case A

Underlying private/contextual records may contain:

- exact budget strategy;
- sealed proposals;
- negotiation messages;
- legal identity/contact details;
- source repository access;
- reviewer notes;
- security findings;
- payment details.

A permitted public projection could contain:

```text
Célula Zero opened a frontend need.
4 proposals were received.
A proposal was selected under published criteria.
Milestone 1 was submitted.
Independent review: PASS under criteria V1.
Milestone 1 accepted.
Next need: accessibility review.
```

Each projection event must preserve provenance to its source/context without requiring those source records to be public.

### Example — Case B

Underlying records may include private messages, drafts and reviewer notes.

A permitted projection could contain:

```text
Project X requested a bounded review.
Célula Zero accepted a scoped contribution.
A human operator delegated research to software agents.
A review artifact was delivered.
The maintainer evaluated the result.
Outcome: one issue confirmed; one claim remained inconclusive.
A follow-up opportunity was opened.
```

### What the feed must not imply

A feed event must not silently mean:

- `verified = true forever`;
- `person is trustworthy universally`;
- `visibility = contribution`;
- `contribution = economic right`;
- `many events = high reputation`;
- `AI-generated summary = human Original Record`.

## 11. Observer mode

A future social surface may allow a person to receive value without immediate contribution by following:

- a person;
- a software agent;
- an organization/community;
- a project;
- a need/opportunity;
- a capability/topic;
- a trajectory or bounded context.

Potential observer value hypotheses:

- learn how real cooperation unfolds;
- see which capabilities are requested;
- discover projects/problems before committing;
- understand how proposals and verification work;
- observe both successes and failures;
- recognize one's own latent capability when an appropriate opportunity appears.

These are hypotheses. `view`, `follow`, `read` or `like` do not prove contribution, outcome, utility or adoption.

## 12. Candidate CZ-specific properties

The following remain candidates, not conclusions:

### A. Coordination-domain semantics

Possible lost property:

> Generic provenance and transport standards can reconstruct that activities/entities/agents relate, but do not necessarily preserve the social/legal transition from Need → Proposal → Commitment → Contribution → Verification → Outcome with the distinctions required by Célula Zero.

Status: `EXTEND candidate`.

### B. Contextual history/trust projection

Possible lost property:

> Existing systems may expose scores, isolated attestations or platform-local reviews without preserving a human-readable contextual basis for a future trust judgment.

Status: `EXTEND/MISSING candidate`.

Do not store a universal trust score as the solution.

### C. Social Projection

Possible lost property:

> Existing social feeds may display posts/transactions/activity but not a privacy-aware, provenance-linked projection of cooperation events that remains distinct from their source records and from reputation.

Status: `EXTEND/MISSING candidate`.

### D. Cross-protocol semantic mapping

Possible lost property:

> Different systems can expose similar actions using incompatible domain concepts, making end-to-end cooperation history difficult to interpret without a bounded mapping layer.

Status: `MAP/EXTEND candidate`.

A new universal protocol is not justified unless mapping existing standards fails concretely.

## 13. G-C1 decision table

At the end of the targeted mapping work, produce a table like:

| Property | Existing standard/process | Fit | CZ addition | Concrete loss without CZ addition | Result |
|---|---|---|---|---|---|
| provenance | W3C PROV | high | none/minimal mapping | none | `ADOPT` |
| bounded delegation provenance | PROV `actedOnBehalfOf` | high | domain scope reference if needed | TBD | `ADOPT/MAP` |
| Need semantics | TBD | TBD | TBD | TBD | unresolved |
| Proposal→Commitment | TBD | TBD | TBD | TBD | unresolved |
| Commitment↔Agreement | TBD | TBD | TBD | TBD | unresolved |
| Claim→Evidence | TBD | TBD | TBD | TBD | unresolved |
| Verification semantics | TBD | TBD | TBD | TBD | unresolved |
| Decision semantics/authority | TBD | TBD | TBD | TBD | unresolved |
| Contextual History | TBD | TBD | TBD | TBD | unresolved |
| Social Projection | TBD | TBD | TBD | TBD | unresolved |

The purpose is to reduce `TBD`, not to maximize `MISSING`.

## 14. Stop gates

Stop or narrow architecture work if any of the following occurs:

1. an existing standard/process preserves the target property adequately — classify `ADOPT/MAP` and do not build it;
2. a proposed CZ primitive has no concrete property loss statement;
3. the model starts depending on a specific blockchain, token, graph database, protocol or vendor without demonstrated necessity;
4. Social Projection requires publishing private/sensitive Original Records rather than derived bounded views;
5. the reference model collapses Verification into Outcome, provenance into truth, or history into universal reputation;
6. the economic case becomes the only coherent case — reclassify the product hypothesis as marketplace-oriented rather than pretending broader coordination has been demonstrated.

## 15. Expected output of G-C1

G-C1 should end with exactly one of:

### `COMPOSITION SUFFICIENT`

Existing standards/processes can preserve the required properties; no new CZ technical primitive is justified. CZ may still add product/UX/integration value.

### `EXTENSION JUSTIFIED`

Existing standards cover the substrate, but a bounded CZ domain extension is required and the concrete lost property is stated.

### `MISSING PROPERTY IDENTIFIED`

A required property is not adequately represented by available standards/processes and is defined precisely enough to justify a Working Spec.

### `INCONCLUSIVE`

The relevant standards or property boundaries remain insufficiently understood; perform targeted investigation only.

None of these outcomes proves external utility, adoption, PMF or scale.

## 16. What this document does not authorize

This reference model does not authorize:

- implementation;
- database/schema changes;
- deployment;
- smart contracts;
- payments or funds;
- wallets;
- token/NFT/DAO creation;
- processing of new participant personal data;
- external outreach;
- pull request or merge.

END OF COORDINATION-REFERENCE-MODEL-001
