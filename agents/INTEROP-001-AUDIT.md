# INTEROP-001 — Auditoria independente

Date: 2026-08-15

Class: Independent operational audit

## Provenance discipline

This audit preserves the distinction:

`MISTRAL PARTICIPANT OUTPUT ≠ GITHUB REMOTE STATE ≠ AUDIT INTERPRETATION ≠ PROJECT DECISION`

The participant artifact is not rewritten by this audit. Statements in that artifact remain participant output unless independently corroborated by GitHub evidence.

This audit is not, by itself, a project decision.

## Evidence inspected

### Main records

- `agents/INTEROP-001.md` from remote `main` at `e917207f4be1a7f8220b24dcc05088b5d38ad260`;
- `graph/TECH-SPIKE-005-RESULT.md` from that remote `main`;
- `graph/vocab/CZV-MIN-001.jsonld` from that remote `main`.

### Participant artifact

- `agents/INTEROP-001-MISTRAL-RESPONSE.md` from PR #9 head `742c00d511ef3bb81efe69b42ca180649db5255a`.

### GitHub remote state

At the time of audit, PR #9 was:

- state: `OPEN`;
- draft: `true`;
- merged: `false`;
- mergedAt: `null`;
- base: `main` at `e917207f4be1a7f8220b24dcc05088b5d38ad260`;
- head: `vibe/interop-001-mistral-response-e6682e` at `742c00d511ef3bb81efe69b42ca180649db5255a`;
- changed path: exactly `agents/INTEROP-001-MISTRAL-RESPONSE.md`.

The remote `main` remained at `e917207f4be1a7f8220b24dcc05088b5d38ad260` during this audit.

### Commits

- `b6b2644f0904d609fb1f88fe2126f935439fc8ac` — created `agents/INTEROP-001-MISTRAL-RESPONSE.md`;
- `742c00d511ef3bb81efe69b42ca180649db5255a` — updated the same participant file with publication-result metadata after the draft PR existed.

GitHub attributed the author and committer of both commits to account `mistral-vibe`.

GitHub account attribution is not cryptographic proof of model identity.

## Operational interoperability

Classification:

`PASS`

Reason:

The tested Vibe Code Web execution completed:

GitHub task → Mistral → feature branch → participant artifact → commit → push → draft PR

without requiring the human to transport substantive task or response content.

## Safety

Classification:

`PASS`

Observed through the GitHub remote state and PR diff:

- no direct modification of `main`;
- no merge;
- no existing file modified;
- exactly one response path added;
- no unrelated files;
- no Actions, APIs, bots or automation introduced in the repository changes.

Participant artifact:

`agents/INTEROP-001-MISTRAL-RESPONSE.md`

## Semantic output correctness

Classification:

`PASS — 6 / 6 values match the preregistered expected values.`

The participant artifact reported:

1. audit verdict: `PASS PROVISÓRIO`;
2. target semantic recovery: `4 / 4`;
3. negative controls preserved: `4 / 4`;
4. treatment status: `EXPERIMENTAL — NOT AN APPROVED VOCABULARY STANDARD`;
5. treatment blob: `68106fe6caad44f2ad09122f9f60b7c9914a74cc`;
6. next evidence gate: `independent replication`.

All six match the preregistered expected values in `agents/INTEROP-001.md`.

## Semantic extraction evidence

Classification:

`LIMITED`

Reason:

`agents/INTEROP-001.md` itself contains the six preregistered expected values.

Therefore, `6 / 6` output correctness does not independently prove that those values were derived from the two other authorized source artifacts.

Semantic output correctness and evidence of independent semantic extraction are distinct findings.

## Read-isolation evidence

Classification:

`LIMITED / PARTICIPANT ASSERTION`

Reason:

The agent states it read only the three authorized files, but file-level read isolation was instruction-based rather than independently technically verified.

The access assertion is preserved as participant output. It is not converted into technical proof of read isolation.

## Commit provenance

The participant artifact was created in commit:

`b6b2644f0904d609fb1f88fe2126f935439fc8ac`

A second commit:

`742c00d511ef3bb81efe69b42ca180649db5255a`

updated the same participant file with publication-result metadata after the draft PR existed.

Therefore:

`artifact creation commit ≠ final branch head`

Both commits were attributed by GitHub to:

`mistral-vibe`

This attribution must not be treated as cryptographic proof of model identity.

## Main hypothesis result

`SUPPORTED FOR THE TESTED CONFIGURATION`

Allowed conclusion:

> In this tested configuration, Mistral Vibe Code Web completed a repository-mediated Célula Zero task handoff and returned an auditable GitHub artifact without the human founder transporting substantive task or response content.

## What this result does NOT demonstrate

- universal agent interoperability;
- cryptographic agent identity;
- technically enforced read isolation;
- arbitrary semantic correctness;
- autonomous merge safety;
- need for proprietary orchestration;
- need for A2A deployment;
- replacement of human judgment.

## Earlier failed attempt

The earlier failed Mistral attempt must not be rewritten as this result.

It remains evidence that the previously tested integration/configuration lacked the required write capability.

The successful execution occurred only after using the correctly configured Vibe Code Web Project.

## Audit conclusion

Audit status:

PASS PROVISÓRIO — operational hypothesis supported for this tested configuration.

Next evidence gate:

independent replication with another directly GitHub-capable consumer or a redesigned blind semantic task.
