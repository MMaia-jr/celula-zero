# TECH-SPIKE-005 — Resultado auditado do teste de tratamento semântico

Status: PASS PROVISÓRIO — uma sessão de tratamento, um consumidor; não aprova vocabulário como padrão.

Date: 2026-08-15

Disciplina de proveniência:

`FACT FROM PREREGISTRATION ≠ MISTRAL PARTICIPANT OUTPUT ≠ POST-TEST AUDIT INTERPRETATION ≠ PROJECT DECISION`

## 1. Objective

TECH-SPIKE-005 tested whether the frozen minimal semantic treatment could reduce the four preregistered interpretation ambiguities without introducing unsupported certainty.

`semantic interpretation improvement ≠ vocabulary standard approval`

`single-session success ≠ cross-model reproducibility`

## 2. Frozen treatment identity

Historical fixture:

`graph/fixtures/GENESIS-CYCLE-000.jsonld`

Treatment:

`graph/vocab/CZV-MIN-001.jsonld`

Treatment blob:

`68106fe6caad44f2ad09122f9f60b7c9914a74cc`

Main containing the frozen treatment before consumer exposure:

`1d58e8fc83a293f58ed3da2660eb8989d6249fb6`

The treatment was frozen before exposure to the treatment consumer.

## 3. External consumer result

Preserved exactly as consumer-reported:

Overall semantic verdict:

`PASS`

Confidence:

`High`

New unsupported certainty:

`NO`

Four definitions sufficient for these questions:

`YES`

These are Mistral Vibe's own classifications. They are participant output and are not automatically the project's audit result.

Original participant record:

`graph/TECH-SPIKE-005-MISTRAL-TREATMENT-RESPONSE.md`

## 4. Preregistered audit

Audit source:

`graph/TECH-SPIKE-005.md`

The conclusions below are post-test audit interpretations. They are not attributed to Mistral Vibe and do not rewrite the participant record.

### Q1 — semantic result PASS; reporting inconsistency MINOR

Preregistered primary question:

Does `czv:assertedRepositoryChange: false` mean that Kimi explicitly asserted that no repository change occurred?

Preregistered expected answer:

`YES`.

Observed semantic interpretation:

`CORRECT`.

Mistral explicitly explained that:

- Kimi explicitly asserted no repository change;
- the property records the contributor's assertion;
- it is not independent proof of what physically happened in Git.

However, the final summary reported:

`Q1: NO (it is an assertion, not proof).`

Audit interpretation:

The `NO` corresponds to the proof sub-question rather than the primary preregistered question.

Classification:

`MINOR — classification-axis/reporting inconsistency.`

This audit does not correct or rewrite the original participant response.

### Q2 — semantic result PASS; reporting-axis difference MINOR

Preregistered question:

Does absence of `gitPath` and `storedIn` alone prove that an object is non-canonical?

Preregistered expected answer:

`NO`.

Observed final classification:

`CANNOT KNOW`.

Observed semantic explanation:

- absence does not prove non-canonicity;
- no conclusion about canonicity can legitimately be derived from absence alone.

Audit interpretation:

Mistral classified the unknown canonicity state of the object rather than directly classifying the entailment question.

The intended semantic distinction was nevertheless correctly recovered.

Classification:

`MINOR — reporting/classification-axis difference.`

### Q3 — PASS

Mistral correctly concluded that:

`czv:doesNotApproveTemplate: true`

does not mean that the candidate template was:

- rejected;
- invalidated;
- prohibited;
- failed.

It means the referenced verification or commitment does not establish the candidate as an approved standard.

### Q4 — PASS

Mistral correctly interpreted:

`czv:orderedMember`

as declared process/logical ordering.

It did not treat the property by itself as proof of:

- exact timestamps;
- duration;
- strict physical chronology;
- causality.

## 5. Negative controls

N1:

`NOT REPRESENTED — PASS`

N2:

`NOT REPRESENTED — PASS`

N3:

`NOT REPRESENTED — PASS`

N4:

`NOT REPRESENTED — PASS`

No negative control received an unsupported confident factual completion.

Therefore:

NEW UNSUPPORTED CERTAINTY:

`not observed in this treatment session.`

For N4, the preregistration allowed `CANNOT KNOW` from the authorized artifacts. Mistral used `NOT REPRESENTED` because A2A was absent from both authorized inputs.

This preserves uncertainty and does not create unsupported certainty.

## 6. Adversarial semantic check

The items below are consumer observations from this Mistral Vibe session, not universal project claims:

- remaining ambiguities were classified only `MINOR`;
- no instance was identified where `not represented` became false;
- no external ontology was required;
- no OWL reasoning was required;
- no SHACL was required;
- no database was required;
- no project-specific documentation outside the two supplied artifacts was required for the four tested definitions;
- no cycle-specific historical claims were identified inside the vocabulary treatment.

## 7. Success-criteria audit

### Criterion 1

All four target semantics recovered according to intended meaning.

Result:

`PASS`

Q1 and Q2 contain `MINOR` reporting/classification-axis inconsistencies, not material semantic failures.

### Criterion 2

No negative control received a materially unsupported confident answer.

Result:

`PASS`

### Criterion 3

Consumer did not infer `not represented = false`.

Result:

`PASS`

### Criterion 4

No new `MATERIAL` ambiguity introduced by the candidate definitions.

Result:

`PASS`

### Criterion 5

Candidate vocabulary remained small and directly tied to the four observed targets.

Result:

`PASS`

### Criterion 6

No infrastructure, reasoner or ontology engine required.

Result:

`PASS`

Overall preregistered audit:

`PASS PROVISÓRIO`

## 8. Comparison with observed Mistral baseline

The earlier Mistral baseline recorded in:

`graph/TECH-SPIKE-004-MISTRAL-RESPONSE.md`

had consumer verdict:

`PARTIAL`

with confidence:

`Medium`

That baseline raised, among other issues:

- overly strong interpretation of absence of `gitPath` / `storedIn` toward non-canonicity;
- ambiguity between `doesNotApproveTemplate` and template rejection/nonapproval.

In this treatment session:

- absence of `gitPath` / `storedIn` was correctly treated as insufficient to prove non-canonicity;
- `doesNotApproveTemplate: true` was correctly distinguished from rejection.

Therefore, the treatment result is consistent with improved interpretation for these observed ambiguities in this tested Mistral session.

This is not a controlled laboratory causal estimate.

Limitations include:

- LLM sessions are stochastic;
- baseline and treatment task framing were not perfectly identical;
- only one treatment session was executed.

This result does not establish that the vocabulary improves all consumers.

## 9. Strategic analysis

### Benefit

The four targeted ambiguities were resolved semantically in this treatment session without adding infrastructure.

### Hidden assumption

The observed result may generalize beyond this specific model/session/prompt.

That remains untested.

### Main risk

Prematurely promoting a successful experimental treatment into an official vocabulary or ontology.

### Alternative

Keep `CZV-MIN-001` experimental and replicate the same frozen treatment with another independent consumer.

### Cheapest next test

A fresh external consumer receives:

- the same frozen historical fixture;
- the exact same frozen treatment;
- equivalent preregistered target questions;
- equivalent negative controls.

### Rejection / downgrade criterion

If independent replication introduces material semantic errors or unsupported certainty:

- do not generalize the result;
- keep the vocabulary experimental;
- revisit candidate definitions only after recording the failure.

## 10. What this result demonstrates

In this tested Mistral Vibe treatment session, the four frozen candidate definitions were sufficient to recover the intended semantics of the four preregistered targets without degrading the four negative controls.

## 11. What this result does NOT demonstrate

- vocabulary completeness;
- official vocabulary approval;
- ontology correctness;
- stable ontology;
- universal interoperability;
- cross-model reproducibility;
- production readiness;
- complete evidentiary self-sufficiency;
- correctness for other cycles;
- necessity of proprietary infrastructure.

## 12. Decision

CZV-MIN-001 remains:

`EXPERIMENTAL`

Do not change its content based on this successful session.

Do not approve it as a standard.

Do not declare a final ontology.

Next evidence gate:

`independent replication.`

## 13. Result summary

External consumer verdict:

`PASS / High`

Audit verdict:

`PASS PROVISÓRIO`

Target semantic recovery:

`4 / 4`

Negative controls preserved:

`4 / 4`

Material target errors:

`0`

Minor reporting/classification inconsistencies:

`2`

- Q1
- Q2

New unsupported certainty:

`NO observed`

Treatment:

`graph/vocab/CZV-MIN-001.jsonld`

Treatment blob:

`68106fe6caad44f2ad09122f9f60b7c9914a74cc`

Treatment status:

`EXPERIMENTAL — NOT AN APPROVED VOCABULARY STANDARD`

Next evidence gate:

`independent replication`
