# GATE-C1-RESULT — COORDINATION SEMANTIC MINIMUM

Class: `RESULT PACKAGE / G-C1`
Date: 2026-08-24
Related decision: `decisions/D008-coordination-graph-social-projection.md`
Input model: `docs/COORDINATION-REFERENCE-MODEL-001.md`

## Result

`G-C1 — COORDINATION REFERENCE MODEL / COMPLETE`

`RESULT: EXTENSION JUSTIFIED`

`IMPLEMENTATION: NOT STARTED`

`EXTERNAL UTILITY: NOT INFERRED`

The extension justified by this gate is **not** a new transport protocol, blockchain,
agent runtime, provenance system, capability ontology, social federation, escrow
system, token, DAO or universal reputation score.

The smallest justified CZ-specific layer is currently a **bounded semantic
coordination profile** composed over existing standards.

## Question tested

> What is the smallest model that preserves the Célula Zero distinctions across
> cooperation among people, software agents and organizations while adopting or
> mapping existing standards wherever possible?

The semantic minimization also tested:

> Can the economic and non-economic reference cases still be represented if CZ
> removes every candidate primitive for which an existing standard or a profile
> pattern is sufficient?

## Evidence basis

This result uses the following primary/current standards as mapping baselines:

- W3C PROV-DM / PROV-O — agents, activities, entities, plans, attribution,
  association, delegation, derivation, bundles, qualified usage and roles:
  - https://www.w3.org/TR/prov-dm/
  - https://www.w3.org/TR/prov-o/
- W3C ODRL Information Model 2.2 — `Offer`, `Agreement`, `Permission`,
  `Prohibition`, `Duty`, `Constraint`, `Party`, `Asset`, and profile extension:
  - https://www.w3.org/TR/odrl-model/
- W3C ActivityStreams 2.0 Core/Vocabulary — identifiable Activities/Objects,
  `actor`, `object`, `target`, `result`, `context`, and social activities
  including `Offer`, `Accept`, `Reject`, `Follow`, `Create`, `Announce`:
  - https://www.w3.org/TR/activitystreams-core/
  - https://www.w3.org/TR/activitystreams-vocabulary/
- Agent2Agent (A2A) — software-agent `Task`, `Message`, `Artifact`,
  `contextId`, Agent Cards and task lifecycle:
  - https://a2a-protocol.org/latest/specification
  - https://a2a-protocol.org/latest/topics/key-concepts/

These standards are not treated as proof that every CZ requirement is solved.
They are used only for the properties they explicitly preserve.

## Starting inventory

The canonical reference model intentionally began broader than the expected
minimum. It included concepts such as:

`Intent / Need / Capability / Opportunity / Proposal / Commitment / Agreement /
Contribution / Claim / Evidence / Verification / Decision / Outcome /
Contextual History / Contextual Trust / Social Projection`

plus actors, activities, artifacts, authority, economy and social relations.

The minimization rule was:

> If the property can be preserved as an existing standard term, qualified
> relation, or explicit profile pattern without losing the required distinction,
> do not create a new CZ class for it.

## Adopted substrate

### PROV — `ADOPT`

Use PROV for generic provenance and responsibility:

- `prov:Agent`, `prov:Person`, `prov:Organization`, `prov:SoftwareAgent`;
- `prov:Activity`;
- `prov:Entity`;
- `prov:Plan`;
- `prov:wasGeneratedBy`, `prov:used`, `prov:wasDerivedFrom`,
  `prov:wasAttributedTo`, `prov:wasAssociatedWith`;
- `prov:actedOnBehalfOf`;
- `prov:Bundle`;
- qualified Usage/Association and `prov:hadRole`.

Important consequence:

An Entity does **not** become Evidence merely because it exists or has
provenance. A source can be used by an interpretation/review activity with a
qualified role such as `evidence`; that preserves:

`source ≠ evidence ≠ verification`.

### ActivityStreams — `ADOPT/MAP`

Use ActivityStreams for social/event projection and generic offer/accept/reject
interactions.

A2S `Activity` is identifiable and can carry `actor`, `object`, `target`,
`result` and `context`. The vocabulary already includes `Offer`, `Accept`,
`Reject`, `Follow`, `Create`, `Announce`, `Question` and other common social
activities.

Important consequence:

CZ does not need a custom feed event envelope or a custom `Follow` primitive.

### ODRL — `ADOPT/MAP WHEN TERMS REQUIRE IT`

Use ODRL when explicit policies, permissions, prohibitions, duties, constraints
or bilateral terms need machine-readable representation.

Important consequence:

`Agreement` does not need to be a CZ primitive.

ODRL also demonstrates why:

`Commitment ≠ Agreement`.

The Agreement can preserve governing terms; the occurrence of an actor
undertaking or accepting bounded work remains a separate event/pattern.

### A2A — `ADOPT/MAP WHEN SOFTWARE AGENT EXECUTION IS PRESENT`

Use A2A for agent-facing task/message/artifact lifecycle when that substrate is
actually required.

Important consequence:

CZ does not need a new agent transport or task protocol in G-C1.

## Minimal CZ vocabulary candidate

After minimization, only **four CZ-specific semantic classes** remain justified
for the next representation test.

### 1. `cz:Need`

Base: `prov:Entity`

Meaning:

An attributed record of a desired state, missing capability, problem or
requirement in a bounded context that can motivate coordination.

Concrete property lost without it:

Generic provenance, social posts and policies do not preserve the operational
distinction between a need and the opportunity/proposal/work that may later
address it.

### 2. `cz:Claim`

Base: `prov:Entity`

Meaning:

An attributable, contestable statement about something in context.

A Claim may concern:

- an artifact;
- a capability;
- a contribution;
- an outcome;
- a person/agent/organization;
- a trust judgment;
- another claim.

Concrete property lost without it:

A source, generated artifact, activity or attestation could be silently treated
as a factual conclusion. CZ requires the contestable statement itself to remain
distinct from the material used to support it.

### 3. `cz:Verification`

Base: `prov:Entity`

Meaning:

A verification record generated by a review/evaluation `prov:Activity` under
explicit criteria/method, with one of the preserved result statuses where
applicable:

`PASS / FAIL / PARTIAL / INCONCLUSIVE`.

The review activity may use:

- a `cz:Claim` with qualified role `subject`;
- source/entities with qualified role `evidence`;
- a Plan/criteria entity with qualified role `criteria`.

Concrete property lost without it:

A review activity, source provenance, attestation or decision could be mistaken
for verification. The result and its criteria/context would not remain
independently reconstructible.

### 4. `cz:Decision`

Base: `prov:Entity`

Meaning:

An attributable record of a legitimate choice made under some authority or
governance context.

A Decision is generated by a decision activity associated with the responsible
agent/authorized representative.

Concrete property lost without it:

A verification, AI recommendation, social reaction or automated event could
silently become an authorized state-changing choice.

Preserve:

`Verification ≠ Decision`.

## Concepts retained as profile patterns, not new classes

The following concepts remain important in the product language but do **not**
currently justify additional CZ classes.

### Opportunity — profile pattern

An Opportunity can be represented as an identifiable ActivityStreams `Offer`
(or another explicitly justified social activity) that opens participation
around a `cz:Need`, references a Plan/conditions, and targets an audience or
eligible actors.

One Need may produce multiple Opportunities with different:

- scopes;
- conditions;
- audiences;
- rewards;
- time windows.

The Activity itself has an identifier and can therefore be referenced, followed,
projected or targeted by later events.

Disposition: `MAP`.

### Proposal — profile pattern

Represent a Proposal as an attributed ActivityStreams `Offer` from a candidate,
targeted at an Opportunity, with an object such as:

- `prov:Plan`;
- delivery description;
- optional ODRL `Offer`;
- conditions;
- expected reward/price where relevant.

Disposition: `MAP`.

Preserve:

`Proposal ≠ Commitment`.

### Commitment — profile pattern

Represent a Commitment as explicit attributed acceptance/undertaking of a scoped
Proposal/Plan/terms.

Candidate composition:

- ActivityStreams `Accept` or another explicit acceptance event;
- reference to the exact Proposal/terms version;
- responsible/authorized actor;
- optional ODRL `Agreement`/`Duty` where formal machine-readable obligations are
  useful.

ActivityStreams `Accept` by itself is **not** interpreted as legal obligation.
The CZ profile only treats an acceptance event as Commitment when scope,
authority and referenced terms are explicit enough for the context.

Disposition: `MAP/PROFILE`.

Preserve:

`Commitment ≠ Agreement`.

### Contribution — contextual classification pattern

Do not equate a generic `prov:Activity` with Contribution.

Work/execution remains a PROV Activity, with its actor, Plan, inputs and generated
artifacts.

Whether that work **counts as contribution to a Need/Commitment/context** is an
attributable contextual statement and, when acceptance matters, may be confirmed
or rejected by a `cz:Decision`.

A contribution assertion can therefore be represented as a `cz:Claim` about the
Activity/Artifact in context.

Disposition: `MAP THROUGH CLAIM/DECISION`.

Preserve:

`activity ≠ contribution`.

### Evidence — qualified-use pattern

Do not create an `Evidence` class.

The underlying source remains a `prov:Entity`.

Its role as evidence is contextual and can be represented through qualified PROV
Usage in an interpretation/review activity, for example:

- source entity → `prov:hadRole` = evidence;
- Claim → `prov:hadRole` = subject;
- criteria Plan → `prov:hadRole` = criteria.

Disposition: `ADOPT/MAP`.

Preserve:

`Original Record/source ≠ Evidence`.

### Outcome — Claim pattern

Do not create an Outcome class yet.

Represent an observed real-world consequence as a `cz:Claim` whose role/kind is
`outcome`, about a bounded cooperation episode or context.

The Outcome Claim may itself be:

- evidenced;
- verified;
- disputed;
- left inconclusive.

Disposition: `MAP THROUGH CLAIM`.

Preserve:

`Verification ≠ Outcome`.

### Capability — Claim + external description pattern

A capability description may be discovered or declared through external agent
schemas/metadata where appropriate.

Demonstrated capability is represented as a contextual `cz:Claim` supported by
relevant history/evidence/verification.

Disposition: `MAP THROUGH CLAIM + EXISTING DISCOVERY SCHEMAS`.

No universal capability score is introduced.

### Contextual Trust — Claim/Judgment pattern

Represent:

> Confio em X para Y com base em Z.

as an attributable contextual Claim/Judgment with explicit:

- subject;
- capability/context;
- basis/history/evidence;
- author of the judgment.

Disposition: `MAP THROUGH CLAIM`.

Do not create a universal reputation score.

### Contextual History — PROV Bundle pattern

Use `prov:Bundle` plus linked domain records to reconstruct an episode.

Disposition: `ADOPT/MAP`.

No separate history database primitive is justified by this gate.

### Social Projection — derived AS2 view pattern

A Social Projection is not a new source record and not a new reputation object.

Represent it as a derived ActivityStreams Object/Activity whose provenance points
back to the permitted underlying records.

The projection activity must apply privacy/consent/disclosure rules before
publication. Sensitive Original Records remain private rather than relying on
social federation privacy as the security boundary.

Disposition: `ADOPT/MAP`.

## Minimum result

The working semantic surface is therefore:

### CZ-specific classes

```text
cz:Need
cz:Claim
cz:Verification
cz:Decision
```

### Bounded CZ profile vocabulary

A small controlled set of roles/status values is still expected, for example:

```text
subject
evidence
criteria
outcome

PASS
FAIL
PARTIAL
INCONCLUSIVE
```

These values are not a justification for a new transport protocol or storage
system.

## Reference Case A — economic coordination

The economic reference case remains representable with the minimized profile:

```text
cz:Need
→ OpportunityPattern(as:Offer)
→ ProposalPattern(as:Offer + prov:Plan / optional odrl:Offer)
→ cz:Decision(selection)
→ CommitmentPattern(as:Accept + optional odrl:Agreement)
→ funding/escrow mapping when needed
→ A2A Task and/or prov:Activity
→ prov:Entity Artifact
→ cz:Claim(deliverable/result assertion)
→ review prov:Activity using subject/evidence/criteria roles
→ cz:Verification
→ cz:Decision(accept/reject/continue)
→ settlement mapping
→ cz:Claim(kind=outcome)
→ prov:Bundle contextual history
→ derived ActivityStreams Social Projection
```

No CZ escrow, payment, agent transport or Agreement primitive is required by
this representation.

## Reference Case B — non-economic coordination

The non-economic reference case also remains representable:

```text
cz:Need
→ OpportunityPattern
→ ProposalPattern
→ CommitmentPattern
→ prov:Activity / delegated agent work
→ prov:Entity Artifact
→ cz:Claim(contribution assertion)
→ review/evaluation Activity
→ cz:Verification when verification is actually performed
→ cz:Decision when legitimate choice/acceptance is required
→ cz:Claim(kind=outcome)
→ prov:Bundle contextual history
→ new OpportunityPattern / relation
→ derived ActivityStreams Social Projection
```

No payment or economic right is required for the model to remain coherent.

## ADOPT / MAP / EXTEND result

| Property | Existing basis | Result | CZ-specific class required now? |
|---|---|---|---|
| actors / responsibility | PROV | `ADOPT` | no |
| provenance / derivation | PROV | `ADOPT` | no |
| delegation provenance | PROV | `ADOPT/MAP` | no |
| work / execution | PROV + A2A when relevant | `ADOPT/MAP` | no |
| artifact | PROV + A2A when relevant | `ADOPT` | no |
| plans | PROV Plan | `ADOPT` | no |
| social activity / follow | ActivityStreams | `ADOPT/MAP` | no |
| Opportunity | ActivityStreams profile pattern | `MAP` | no |
| Proposal | ActivityStreams Offer + Plan/terms | `MAP` | no |
| Agreement / duties / constraints | ODRL when applicable | `ADOPT/MAP` | no |
| Commitment | acceptance + exact terms/authority profile | `MAP/PROFILE` | no |
| Contribution | Claim/Decision over work in context | `MAP` | no |
| source as evidence | PROV qualified Usage/Role | `ADOPT/MAP` | no |
| contextual history | PROV Bundle | `ADOPT/MAP` | no |
| social projection | PROV derivation + ActivityStreams | `ADOPT/MAP` | no |
| contextual trust judgment | Claim pattern | `MAP` | no |
| outcome | Claim pattern | `MAP` | no |
| Need | no adequate generic domain semantics identified | `EXTEND` | **yes** |
| Claim | no adequate generic epistemic semantics in adopted substrate | `EXTEND` | **yes** |
| Verification | criteria/result/contestability distinct from source and decision | `EXTEND` | **yes** |
| Decision | legitimate authority/state-change distinct from verification | `EXTEND` | **yes** |

## Concrete extension justified

The concrete property that would be lost without a CZ semantic extension is:

> Existing standards can preserve provenance, generic social events, policies,
> task execution and artifacts, but they do not by themselves preserve the
> Célula Zero epistemic/authority distinctions around a bounded Need and the
> transition from contestable Claim → criteria-bound Verification → legitimate
> Decision, while allowing outcomes, contributions, trust judgments and social
> views to remain contextual rather than collapsing into truth or universal
> reputation.

The justified extension is therefore intentionally small.

## What G-C1 rejects

G-C1 does not justify building:

- a new agent transport;
- a new provenance system;
- a new generic Agreement/policy language;
- a new generic social federation;
- a custom escrow/payment rail;
- a graph database merely because the conceptual model is graph-shaped;
- a blockchain requirement;
- token/NFT/DAO machinery;
- a universal reputation score;
- a new platform implementation before the minimized representation is tested.

## Falsifier preserved

The four-class minimum is still a **candidate** until represented mechanically.

If the next representation test shows that one or more of the four classes can
also be eliminated without losing a required property, remove them.

If the test requires an additional CZ class, it may be added only with:

1. the exact failed representation;
2. the concrete property lost;
3. why PROV / ActivityStreams / ODRL / A2A or a profile pattern cannot preserve it.

## Next gate

`G-C2 — DUAL-CASE PROFILE REPRESENTATION`

Purpose:

Represent both reference cases in a small machine-readable, reconstructible
form using:

- PROV;
- ActivityStreams;
- ODRL only where terms require it;
- A2A only where agent execution requires it;
- no more than the four CZ-specific semantic classes above.

### PASS criteria

1. both cases are represented end-to-end;
2. the representation preserves:
   - `Proposal ≠ Commitment`;
   - `Commitment ≠ Agreement`;
   - `activity ≠ contribution`;
   - `source ≠ evidence`;
   - `Verification ≠ Decision ≠ Outcome`;
3. each actor/decision has reconstructible responsibility/authority context;
4. the same episode can yield a bounded Social Projection without publishing
   private Original Records;
5. no custom transport, database, blockchain or runtime is required;
6. no fifth CZ class is introduced without an explicit lost-property statement.

Legitimate outcomes:

`PASS / FAIL / PARTIAL / INCONCLUSIVE`.

G-C2 is a representation test, not production implementation.

## Final state

`G-C1 / COMPLETE / EXTENSION JUSTIFIED`

`CZ SEMANTIC MINIMUM CANDIDATE / 4 CLASSES / NOT IMPLEMENTED`

`G-C2 / PREPARED AS NEXT TRACK-B GATE`

This result does not demonstrate external utility, adoption, PMF or scale.

END OF GATE-C1-RESULT
