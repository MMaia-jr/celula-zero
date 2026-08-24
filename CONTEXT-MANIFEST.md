# Context Manifest

Context version: `CZ-CONTEXT-002`

Canonical repository:

`https://github.com/MMaia-jr/celula-zero`

## Purpose

This manifest defines the minimum method for reconstructing the **current** Célula Zero without requiring private chat history.

The repository contains both operational present and preserved history. Reading many files does not by itself prove correct context reconstruction.

## Dynamic source rule

Do not freeze a `main` SHA as the permanent current state.

When reconstructing current context:

1. resolve the current `main` HEAD dynamically;
2. record the commit SHA actually read;
3. read the minimum current-context files from that ref;
4. follow the active references in `STATE.md` only as needed;
5. report access failures and uncertainty explicitly.

A historical SHA may be cited as provenance for a past transition, but it is not the permanent current HEAD.

## Minimum current-context reading set

Read in this order:

1. `README.md`
2. `STATE.md`
3. `PROTOCOL.md`
4. `CONTRIBUTING.md`

Then, only when required by the task:

5. active human decision(s) referenced by `STATE.md`;
6. active Work Packet / test referenced by `STATE.md`;
7. implementation, Result Package, Claim, Evidence or Verification required for the specific question.

For the longer-term interoperability direction, use `genesis/INTENT-000.md`.

Do not hard-code an old experiment list as the permanent required reading set.

## Authority rule

Use:

`STATE.md` → current operational state and next gate.

Explicit human decision files → authority/provenance for the decisions they record.

`PROTOCOL.md` → durable operating and epistemic rules.

Active Work Packets/tests → bounded scope and criteria for an experiment.

Result Packages and material records → what actually happened.

Claims/Evidence/Verification → attributed assertions, supporting/challenging relationships and bounded evaluation.

Do **not** infer current direction directly from:

- old rounds;
- old issues;
- closed or superseded PRs;
- historical branches;
- old context manifests;
- superseded decisions;
- exploratory research.

Those materials may remain valid history without being current direction.

## Reconstruction boundaries

Preserve:

`Original Record ≠ Interpretation ≠ Claim ≠ Evidence ≠ Verification ≠ Decision ≠ Reputation`

Also preserve:

`PREPARED ≠ EXECUTED ≠ VERIFIED ≠ COMMITTED ≠ PUSHED ≠ MERGED ≠ CANONICAL`

If a source documents intention, do not report execution.
If a result is local, do not report external availability.
If a PASS is internal N=1, do not report external utility, adoption or scale.
If an issue proposes work, do not report it as the current roadmap against `STATE.md`.

## Stranger-comprehension check

A reconstruction is useful only if the reader can answer, without private explanation:

1. What is Célula Zero now?
2. What real problem is it trying to solve?
3. What stage is it in?
4. What has actually been demonstrated?
5. What has not been demonstrated?
6. What can an outsider do now?
7. How can an outsider contribute?
8. What environment is publicly available versus local-only?
9. What continues to work if the founder is offline, and what human authority gates remain?
10. What is the current next gate?

## Failure conditions

Treat reconstruction as `PARTIAL` or `FAIL` if the reader:

- describes a historical Célula Zero as the current one;
- treats an old issue as current direction against `STATE.md`;
- reports local infrastructure as a public hosted service;
- turns a hypothesis into an implementation claim;
- confuses Artifact, Evidence and Verification;
- assumes AI consensus replaces human authority;
- invents access to files that were not actually read.

## Required reconstruction report for agents

An external agent should state:

- current `main` commit SHA read;
- files actually accessed;
- files it could not access;
- which statements are source-derived versus interpretation;
- material uncertainty caused by incomplete access.

A human newcomer is not required to produce this report merely to read or participate.

## Current limitation

This manifest improves context portability; it does not make Célula Zero fully decentralized or always-on.

The public GitHub repository remains available independently of the founder's laptop.

The currently demonstrated application/backend environment is local-development infrastructure unless a later canonical `STATE.md` documents public deployment.

A readable repository is not the same as an externally operable service.

Human authority gates remain intentional where vision, consent, sensitive disclosure or promotion require explicit authorization.
