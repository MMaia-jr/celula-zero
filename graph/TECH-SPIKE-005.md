# TECH-SPIKE-005 — Pré-registro do teste de desambiguação semântica

Status: DESENHO PRÉ-REGISTRADO — nenhum tratamento implementado; não constitui aprovação de vocabulário, schema, ontologia, arquitetura ou protocolo.

Data de registro: 2026-08-15

## Research question

Can a very small explicit semantic intervention reduce the material interpretation ambiguities observed in external consumers without changing the Genesis cycle data and without causing new unsupported inferences?

## Hypothesis

A minimal candidate vocabulary containing explicit definitions for a small set of already-used terms can reduce observed semantic interpretation errors while preserving epistemic uncertainty for facts not represented in the fixture.

## Why this experiment exists

TECH-SPIKE-003 and TECH-SPIKE-004 showed that the essential Genesis cycle is semantically recoverable across `N = 2` external consumers.

However, consumers still showed ambiguity or interpretation errors around boundary semantics.

Therefore TECH-SPIKE-005 does not ask whether the core cycle is reconstructible again.

It asks whether explicit definitions improve interpretation of already-observed ambiguous terms.

## Experimental principle

The canonical data remains unchanged.

Control:

the existing `graph/fixtures/GENESIS-CYCLE-000.jsonld` without supplemental semantic definitions.

Treatment:

the same unchanged `graph/fixtures/GENESIS-CYCLE-000.jsonld` plus a future minimal candidate semantic artifact.

Candidate future path:

`graph/vocab/CZV-MIN-001.jsonld`

This path is only proposed in the preregistration. It is not created in this phase.

The treatment must define semantics, not rewrite historical facts.

## Scope — exactly four semantic targets

### Target 1 — `czv:assertedRepositoryChange`

Observed issue:

`czv:assertedRepositoryChange: false` can be read as either:

- explicit assertion that no repository change occurred; or
- absence/falsity of an assertion concerning repository change.

Intended treatment semantics to test:

The property records the contributor's assertion about whether they changed the repository.

For this property, `false` means the contributor explicitly asserted that they did not change the repository.

The historical fixture must not be changed in this experiment.

### Target 2 — canonicity / `storedIn`

Observed issue:

Mistral interpreted absence of `gitPath`/`storedIn` as explicit non-canonicity.

Intended treatment semantics to test:

- explicit `storedIn` `CanonicalGitStore` supports an explicit canonical-storage assertion;
- explicit `isCanonicalIntent: false` supports explicit non-canonicity for that intent object;
- absence of a canonical marker or `storedIn` relation does not entail non-canonicity.

`not represented ≠ false`

This is an open-world interpretation constraint for this experiment.

### Target 3 — `czv:doesNotApproveTemplate`

Observed issue:

a consumer suggested it could mean either rejection or lack of standard approval.

Intended treatment semantics to test:

`czv:doesNotApproveTemplate: true` means:

the referenced verification/commitment does not establish the candidate template as an approved standard.

It does not by itself mean that the candidate was rejected, invalidated, prohibited or failed.

### Target 4 — `czv:orderedMember`

Observed issue:

order is represented but the nature of that order is not explicit.

Intended treatment semantics to test:

`czv:orderedMember` expresses the declared process/logical ordering of members in the represented cycle.

By itself it does not establish:

- exact timestamps;
- duration;
- strict physical chronology;
- causality beyond separately represented provenance relations.

## Out of scope

This experiment does not attempt to solve:

- authorship of `INTENT-000`;
- missing full original `OFFER`;
- missing details of `VerificationAttempt-A`;
- missing filling instructions for `VerificationAttempt-B`;
- general ontology design;
- global canonicity model;
- universal temporal semantics;
- schema validation;
- protocol behavior.

These are deliberately excluded so that the intervention remains minimal.

## Pre-registered discriminating questions

The future control/treatment evaluation must ask at least these exact semantic questions.

### Q1

Given:

`czv:assertedRepositoryChange: false`

Does this, under the treatment definition, mean that Kimi explicitly asserted that no repository change occurred?

Expected treatment answer:

`YES`.

Expected control status:

ambiguous / definition not explicit.

### Q2

If an object lacks `gitPath` and `storedIn`, does that alone prove that the object is non-canonical?

Expected answer:

`NO`.

Required explanation:

absence of an explicit canonical assertion does not entail explicit non-canonicity.

### Q3

Does:

`czv:doesNotApproveTemplate: true`

mean that the template was rejected?

Expected answer:

`NO`.

Required interpretation:

it means the verification/commitment does not establish the candidate as an approved standard.

### Q4

Does `czv:orderedMember` by itself prove exact chronological timestamps or causality?

Expected answer:

`NO`.

Required interpretation:

declared process/logical order only, unless separate relations provide stronger claims.

## Negative controls

The treatment must not increase certainty about facts that remain unrepresented.

### N1

Who is the explicit `prov:wasAttributedTo` author of `INTENT-000`?

Expected:

`NOT REPRESENTED / CANNOT KNOW` from the fixture.

### N2

What exactly was the incorrect input in `VerificationAttempt-A`?

Expected:

`NOT REPRESENTED`.

### N3

What was the full original text of Kimi's `OFFER-001`?

Expected:

`NOT REPRESENTED`; only a structured synthesis plus provenance limitation is available.

### N4

Was A2A historically used in the Genesis cycle?

Expected:

`CANNOT KNOW` from these artifacts unless independently represented.

A treatment that causes confident unsupported answers to these negative controls is a failure even if it improves the four target questions.

## Experimental comparison

Use the same unchanged fixture in both conditions.

Preferred comparison for the first treatment test:

Baseline:

the already-observed Mistral blind response in `graph/TECH-SPIKE-004-MISTRAL-RESPONSE.md` may serve as an observed baseline for the ambiguities it actually exhibited.

Treatment:

a fresh Mistral Vibe conversation receives:

1. the unchanged fixture;
2. the candidate minimal semantic vocabulary;
3. the preregistered discriminating and negative-control questions.

Reason:

using the same model family reduces cross-model variation for the first intervention test.

Explicit limitation:

fresh sessions remain stochastic and this is not a controlled laboratory experiment.

The existing Mistral conversation must not be reused for treatment because that would introduce conversational carryover.

## Success criteria

The first treatment trial is considered provisionally successful only if all are true:

1. All four target questions are answered according to the preregistered expected semantics.
2. No negative control receives a materially unsupported confident answer.
3. The consumer does not infer `not represented = false`.
4. No new material ambiguity is introduced by the candidate definitions.
5. The candidate vocabulary remains small and directly tied to observed failures.
6. No infrastructure, reasoner or ontology engine is required.

## Stronger evidence criterion

Do not claim general semantic improvement from one treatment session.

A successful first treatment supports only:

> the candidate definitions improved interpretation in this tested consumer/session.

Cross-model improvement would require later replication.

## Rejection criteria

Reject, reduce or redesign the treatment if any of the following occurs:

- definitions require extensive ontology machinery;
- more than the four target concepts must be defined merely to answer the discriminating questions;
- the treatment produces new false certainty;
- negative controls degrade;
- the definitions merely restate labels without changing observed interpretation;
- the treatment requires modifying canonical historical records;
- the consumer still makes material errors on two or more target questions;
- ambiguity is moved rather than reduced.

## Minimality constraint for future `CZV-MIN-001`

If implementation is later authorized, the candidate artifact must:

- be separate from canonical Genesis records;
- be explicitly experimental;
- define only semantics needed for the four targets;
- contain no cycle-specific outcome claims;
- not declare itself an official ontology;
- not require OWL reasoning;
- not require SHACL;
- not require a database;
- not require new infrastructure;
- remain human-readable.

Possible lightweight standards such as RDFS/SKOS may be evaluated later, but this preregistration does not approve a serialization choice.

## Interpretation discipline

`semantic reconstruction ≠ evidentiary re-audit`

`absence of assertion ≠ assertion of absence`

`interpretation ≠ participant quote`

## What a successful TECH-SPIKE-005 would NOT prove

It would not prove:

- vocabulary completeness;
- ontology correctness;
- universal interoperability;
- production readiness;
- correctness across all models;
- complete provenance;
- general solution to open-world reasoning;
- necessity of proprietary infrastructure.

## Decision gate

This preregistration does not authorize implementation.

After this file is reviewed and merged, the Council must make a separate explicit decision before creating:

`graph/vocab/CZV-MIN-001.jsonld`

Current phase:

`PREREGISTERED DESIGN ONLY`

Treatment implemented:

`NO`

Canonical fixture modified:

`NO`

Vocabulary approved:

`NO`

Next decision:

whether to authorize implementation of the minimal candidate treatment.
