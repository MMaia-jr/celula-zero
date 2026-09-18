# RP-R2 — Genesis Experience V1

Status:

`PASS N=1 / LOCAL / BOUNDED / HUMAN REVIEW ACCEPTED`

Canonical execution base:

`14136021f8a7f9fa14f48cd3cc892208606f4cb3`

Human Review:

`D039 / HUMAN ACCEPTS R2 GENESIS EXPERIENCE V1 RESULT`

Current direction:

`D037 / GENESIS READINESS BEFORE EXTERNAL TRANSFER`

## Property tested

One real current Genesis maintenance need can move through:

`Human authorization → bounded Work Packet → Execution Fabric → Codex → real repository work → deterministic result envelope → Human Review`

without granting the executor Git-promotion authority.

This episode tested the Execution Fabric by using it, rather than treating the
fabric itself as the entire task.

## Stage 0 — current-base preflight

The canonical R1 fabric was tested from a clean detached worktree at:

`14136021f8a7f9fa14f48cd3cc892208606f4cb3`

Observed:

`EXPECTED RED = OBSERVED`

Error:

`wrong canonical base: 14136021f8a7f9fa14f48cd3cc892208606f4cb3`

Result:

`BLOCKED / NOT_ASSESSED`

Executor ran:

`NO`

Model calls:

`0`

Repository content writes:

`0`

HEAD moved:

`NO`

The result envelope also reported the historical embedded R1 base rather than
the legitimate current base requested by the parsed packet.

Observed property loss:

`HISTORICAL BASE PIN + BLOCKED BASE PROVENANCE LOSS`

## Stage 1 — bounded Codex repair

Codex:

`codex-cli 0.150.0`

Changed repository paths:

1. `tools/cz-execution-fabric.mjs`
2. `tools/cz-execution-fabric.test.mjs`

No third Stage 1 path changed.

Final hashes:

`tools/cz-execution-fabric.mjs`
`bcdb517a218f536c5d378b39e4a5492f5641be18b8821ea928f7721d7594f3f5`

`tools/cz-execution-fabric.test.mjs`
`ca0e8a363972a670c0f04a4cff9ee241a229b5f5f6ca25b27ad748dfbea7c5ca`

Node runtime:

`v24.19.0`

Focused tests:

`19/19 PASS`

Observed repaired properties include:

- arbitrary legitimate full-SHA packet bases are no longer rejected merely
  because they differ from the historical R1 base;
- actual local HEAD must equal the packet base;
- malformed/non-full-SHA bases fail closed;
- historical R1 base has no privileged status;
- dirty checkout still blocks before Codex;
- unsupported executor still blocks;
- out-of-scope changes and HEAD movement remain scope violations;
- validation execution remains argv-based with `shell=false`;
- validation executable allowlist remains enforced;
- a legitimate parsed requested base can be preserved in a blocked envelope;
- no legitimate base means no invented base;
- `verified=false` and `canonical=false` ceilings remain preserved.

## Stage 2 — real STATE task through repaired fabric

A fresh clean detached worktree at the same canonical base was used.

The repaired Execution Fabric itself invoked Codex.

Real task:

reconcile the stale `STATE.md` wording that still said current sequencing was
governed by D033.

Execution Fabric result:

- schema: `cz.execution-result.v1`;
- executor: `CODEX_CLI`;
- canonical base:
  `14136021f8a7f9fa14f48cd3cc892208606f4cb3`;
- executor exit code: `0`;
- changed paths: exactly `STATE.md`;
- validation commands: `2`;
- both validation exits: `0`;
- scope status: `WITHIN_SCOPE`;
- head moved: `false`;
- extra paths: `[]`;
- final classification: `COMPLETED`;
- Git promotion performed: `false`;
- verified: `false`;
- canonical: `false`.

Final `STATE.md` hash from the Human-reviewed integrated candidate:

`0b505f8f2cc16c74d0ddc30a0e089c684e7b03257b957d2bde048d51a05efdaa`

## Oracle STOP and recovery

The first post-execution harness required byte-for-byte equality with a
deterministically prepared `STATE.md` oracle.

It stopped because Codex inserted one harmless line break:

`representation/layout difference only`

The STOP was preserved rather than ignored.

No Codex rerun was performed.

The follow-up deterministic resume established:

- Stage 1 candidate hashes unchanged;
- Stage 1 tests again `19/19 PASS`;
- Stage 2 result contract `PASS`;
- Stage 2 changed path exactly `STATE.md`;
- stale D033-current sentence absent;
- D037-current / D033-preserved wording present;
- normalized semantic parity with deterministic oracle: `PASS`;
- only one localized STATE diff hunk;
- `git diff --check`: `PASS`.

Preserve:

`BYTE DIFFERENCE ≠ SEMANTIC DIFFERENCE`

`HARNESS STOP ≠ EXECUTION FAILURE`

`CORRECTING THE ACCEPTANCE CRITERION ≠ REWRITING THE OBSERVED RESULT`

## Integrated candidate

Exact repository paths:

1. `STATE.md`
2. `tools/cz-execution-fabric.mjs`
3. `tools/cz-execution-fabric.test.mjs`

Integrated Node 24 validation:

`PASS`

Integrated STATE semantic parity:

`PASS`

R2 implementation candidate patch SHA-256:

`a5b9af9a1639c92809e620631b90fb471bd18e2032ea8e0d67b173cfa1da81f7`

## Model/review boundary

Stage 1 used one bounded Codex execution.

Stage 2 used one Codex execution through the repaired Execution Fabric.

Kimi calls:

`0`

Paid-model review:

`NO`

No claim is made here about a separate monetary cost for the local Codex
invocations.

The deterministic resume after the oracle STOP used:

`0 model calls`

## Human Review

Marcos adopted:

`R2 — Genesis Experience V1 = PASS N=1 / LOCAL / BOUNDED`

This Human Review acceptance does not itself authorize Git promotion.

## What this result demonstrates

At most:

one local bounded episode in which current Human authorization was transformed
into a constrained Work Packet, executed through the Execution Fabric on real
repository work, returned a structured non-canonical result, survived a
fail-closed evaluation STOP, and returned to Human Review.

## What this result does not demonstrate

- complete Genesis Experience;
- complete founder-light operation;
- repeated operation;
- failure/restart recovery of the repaired fabric;
- economic consequence;
- external utility;
- adoption;
- PMF;
- scale;
- production readiness.

Preserve:

`R2 PASS N=1 ≠ COMPLETE GENESIS EXPERIENCE`

`EXECUTION FABRIC COMPLETED ≠ VERIFIED ≠ CANONICAL`

`HUMAN REVIEW ACCEPTED ≠ GIT PROMOTION AUTHORIZED`

## Promotion state at canonical-package preparation

`COMMIT = NO`

`PUSH = NO`

`PR = NO`

`MERGE = NO`

`REMOTE SUPABASE = NO`

`DEPLOY = NO`

`FUNDS = NO`

`OUTREACH = NO`

`CANONICAL = NO`

## Next gate

The next Genesis Readiness property is not selected by this Result Package.

Current next gate:

`HUMAN DECISION / SELECT NEXT GENESIS READINESS PROPERTY`

No next-gate execution is authorized by R2 acceptance or by local package
preparation.

END
