# RP-OPERATIONAL-LEARNING-RETENTION-001-PROMOTION

Date:

`2026-09-06`

Status:

`PASS / INCIDENT PRESERVED / PROMOTION COMPLETED`

Class:

`RESULT PACKAGE / OPERATIONAL LEARNING`

Authority:

`HUMAN / MARCOS`

## Human authorization

Exact Human authorization for this preservation step:

> Autorizo preservar o incidente de promoção Bash 3.2 em um Result Package e na menor atualização necessária do PROTOCOL.md, com commit, push, PR e merge se o escopo permanecer nesses dois arquivos e as verificações passarem.

## Context

PR #156 promoted Operational Learning Retention and the next preparedness gate:

`CLEAN HABITABLE INTERNAL N=1 → SIMPLE BASELINE N=1`

Canonical merge:

`PR #156 / MERGED / CANONICAL`

Canonical main after that promotion:

`965c24d0db92ff43fd3226be997408c1b7836588`

The promotion itself exposed a new operational-learning incident in the
human-facing terminal executor.

## Incident sequence

### Attempt 1 — unsupported Bash feature

Observed runtime:

`Bash 3.2.57(1)-release / macOS`

Observed failure:

`mapfile: command not found`

Failure point:

`VERIFY EXACT SCOPE`

Consequences:

- no commit;
- no push;
- no PR;
- no merge;
- canonical `main` unchanged;
- temporary worktree cleanup ran;
- local promotion branch remained as recoverable residue.

Falsified assumption:

`executor that is valid in a newer Bash environment is necessarily compatible with the founder's actual macOS Bash runtime`

### Attempt 2 — incomplete correction

The replacement executor was presented as macOS Bash 3.2 compatible and safely
recovered the residual local branch from Attempt 1.

It then failed again at:

`VERIFY EXACT SCOPE`

with:

`mapfile: command not found`

Observed cause:

a second executable `mapfile` occurrence remained in the delivered artifact.

Falsified assumption:

`a locally prepared correction is verified merely because the intended fix was made somewhere in the source`

Preserve:

`CORRECTION PREPARED ≠ CORRECTION VERIFIED`

### Attempt 3 — class-wide check plus lived runtime execution

Before delivery, the V2 executor was statically checked for the known
incompatibility class:

- executable `mapfile`: `0`;
- executable `readarray`: `0`;
- selected Bash 4+ constructs: `0`;
- syntax check: `PASS`.

Lived execution then ran under:

`Bash 3.2.57(1)-release`

Observed result:

- exact two-stage leftover-branch recovery logic: `PASS`;
- exact four-file scope for PR #156: `PASS`;
- document invariants: `PASS`;
- secret scan: `PASS`;
- source worktree preservation: `PASS`;
- commit: `6d38926beb11fb541cf164328df5ea518b07b147`;
- push: `PASS`;
- PR: `#156`;
- remote scope: `PASS`;
- remote head: `PASS`;
- mergeability: `MERGEABLE / CLEAN`;
- merge: `PASS`;
- merge SHA:
  `965c24d0db92ff43fd3226be997408c1b7836588`;
- canonical `main`:
  `965c24d0db92ff43fd3226be997408c1b7836588`;
- paid calls: `0`;
- Remote Supabase writes: `0`;
- deploy: `NO`;
- PR #155 mutation: `NO`.

## Diagnosis confidence

Attempt 1:

`CONFIRMED`

Attempt 2:

`CONFIRMED`

Attempt 3 correction:

`VERIFIED BY STATIC CHECK + LIVED EXECUTION ON ACTUAL OPERATOR RUNTIME N=1`

This is not evidence of portability to every shell or operating system.

## Generalized learning

For a human-facing executor whose operator runtime is known:

1. runtime assumptions should be explicit;
2. compatibility should be checked against that runtime or an intentionally
   stricter compatible target before delivery when feasible;
3. if a runtime incompatibility is discovered, the corrected artifact should be
   checked across the relevant incompatibility class, not only at the first
   observed occurrence;
4. a prepared fix is not a verified fix;
5. lived success on one runtime remains `N=1`, not universal portability.

Preserve:

`executor valid in developer environment ≠ executor compatible with operator runtime`

`CORRECTION PREPARED ≠ CORRECTION VERIFIED`

## Scope / boundaries

This Result Package does not assert:

- universal shell portability;
- production readiness;
- external utility;
- adoption;
- PMF;
- scale.

No new runtime abstraction, shell framework, CI platform or executor subsystem
is justified by this incident alone.

The smallest sufficient response is:

`Result Package + reusable PROTOCOL rule`

## Result

`INCIDENT = DOCUMENTED`

`FALSIFIED ASSUMPTIONS = REPRESENTED`

`GENERALIZED RULE = PREPARED FOR CANONICAL PROMOTION`

`REGRESSION / PREFLIGHT PRACTICE = OBSERVED N=1`

`NEW MEMORY INFRASTRUCTURE = NOT JUSTIFIED`
