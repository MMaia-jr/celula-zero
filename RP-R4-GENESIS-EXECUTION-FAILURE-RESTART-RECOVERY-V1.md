# RP-R4 — Genesis Execution Failure / Restart / Recovery V1

Status:

`PASS N=1 / LOCAL / BOUNDED / HUMAN REVIEW ACCEPTED`

Clean rebuild status:

`PASS N=1 / LOCAL / BOUNDED / HUMAN REVIEW ACCEPTED`

Canonical execution base:

`797d0292359d6ebf1ff0034ceecdf76b0200134a`

Human Review:

`D041 / HUMAN ACCEPTS R4 RECOVERY AND CLEAN REBUILD RESULTS`

Current strategic envelope:

`D037 / GENESIS READINESS BEFORE EXTERNAL TRANSFER`

## Property tested

Primary R4 property:

a real bounded Execution Fabric episode can end in a controlled failure, leave a
partial candidate, terminate the original process, and then be reconstructed by
a new process from durable material without automatic retry or promotion.

Observed chain:

`CONTROLLED FAILED EXECUTION → ORIGINAL PROCESS ENDS → NEW PROCESS → DETERMINISTIC RECONSTRUCTION → HUMAN DISPOSITION`

Human disposition:

`REBUILD_FROM_CLEAN_BASE`

Follow-up clean rebuild chain:

`NEW CLEAN WORK PACKET → FRESH CLEAN EXECUTION → SAME REVIEWED TARGET BYTES`

## Stage 0 — READBACK / MAP

Canonical main:

`797d0292359d6ebf1ff0034ceecdf76b0200134a`

Existing components were sufficient to compose the first experiment:

`canonical Git + Human authorization + external Work Packet + isolated worktree + Execution Fabric result + Git diff/hash readback + Human disposition`

No new recovery subsystem was built.

Observed static limits preserved:

- result envelope stores hashes of executor/validator diagnostics, not full
  diagnostic content;
- a hard interruption may leave no completed result envelope;
- current V1 intentionally rejects dirty checkout before execution.

## Stage 1 — controlled failed execution

Human execution authorization Original Record:

`autorizado`

Preserved Human authorization file SHA-256:

`8551f10dedb33be2fb1bcb7aa65cd312b466ba68ee1af3ad4933d199373ed5cd`

Authorization-context record SHA-256:

`78a3c2d4f6119e22cb1fa0565f22b5f9759794dd627171c0794e10c353d278c7`

READBACK/MAP record SHA-256:

`d3a349d2dd2e65f5d003a00e137f696c37276c59f999b9aea0e08c132c4c9d59`

Effective Work Packet SHA-256:

`674e42dac5ec39a1e23d8e7a2e2081182422b894baeaac451b67a34bd5de3f75`

Execution route:

`CANONICAL EXECUTION FABRIC → CODEX_CLI`

Repository content path:

`docs/OPERATIONS.md`

Execution Fabric process exit:

`0`

Structured result:

`FAILED / WITHIN_SCOPE`

Observed:

- executor exit:
  `0`;
- first three substantive validations:
  `PASS`;
- controlled final validator:
  `exit 77`;
- changed paths:
  exactly `docs/OPERATIONS.md`;
- HEAD unchanged:
  `YES`;
- extra paths:
  `[]`;
- `git_promotion_performed=false`;
- `verified=false`;
- `canonical=false`.

This demonstrated:

`PROCESS EXIT 0 ≠ EXECUTION COMPLETED`

Structured result JSON SHA-256:

`0fa1291a5a3a49b251b175377e1c726742d0dc9b111fc5e7bd287dc30238b9a8`

Partial patch SHA-256:

`b1b2f9ad0754e39f71a69d77c70487af16195b3b872280bdf251c64fe0ea548b`

Partial candidate `docs/OPERATIONS.md` SHA-256:

`8bc137d8ca3a75826f8798fd520c2624d460b00f6338d4751e42bf767faa1c24`

Documentation delta:

`22 additions / 0 deletions`

No Git promotion occurred.

## Stage 2 — fresh-process recovery

The original execution process ended.

A new process was invoked with only the durable R4 runroot as explicit input.

Recovery model/Codex calls:

`0`

Repository content writes:

`0`

Recovered:

- current remote canonical main;
- original canonical base;
- Human Original Record;
- authorization interpretation class;
- Work Packet;
- result envelope;
- preserved worktree;
- preserved HEAD;
- changed paths;
- patch;
- target bytes;
- no-promotion state.

Observed:

`WORK_PACKET_READBACK=PASS`

`RESULT_ENVELOPE_READBACK=PASS`

`RESULT_CLASSIFICATION=FAILED`

`RESULT_SCOPE_STATUS=WITHIN_SCOPE`

`RESULT_CHANGED_PATHS_MATCH_ACTUAL=PASS`

`ACTUAL_CHANGED_PATHS_WITHIN_PACKET_ALLOWLIST=PASS`

`PARTIAL_PATCH_DRIFT=NO`

`PARTIAL_CANDIDATE_DRIFT=NO`

Recovery classification:

`RECOVERED_FAILED_EXECUTION / PARTIAL_CANDIDATE_PRESERVED`

Automatic retry:

`NO`

Cleanup/discard:

`NO`

Git promotion:

`NO`

## Human disposition

Human Review accepted the recovery episode as:

`PASS N=1 / LOCAL / BOUNDED`

and selected:

`REBUILD_FROM_CLEAN_BASE`

The exact partial patch received Human readback before the disposition was
enacted.

Preserve:

`FAILED EXECUTION REMAINS FAILED`

`RECOVERY PASS ≠ ORIGINAL EXECUTION PASS`

## Stage 3 — clean rebuild

A new Work Packet candidate was prepared after the disposition.

Human execution authorization Original Record:

`vamos`

Effective rebuild Work Packet SHA-256:

`15b291a1b3791f238244242e96592c641af82649def9a3bf8de24774ef57b336`

The old failed dirty worktree was not reused.

A deterministic oracle was first constructed from a fresh clean base plus the
already-reviewed patch.

Oracle target SHA-256:

`8bc137d8ca3a75826f8798fd520c2624d460b00f6338d4751e42bf767faa1c24`

Then a second fresh clean worktree executed the rebuild through the canonical
Execution Fabric.

Structured result:

`COMPLETED / WITHIN_SCOPE`

Observed:

- process exit:
  `0`;
- executor exit:
  `0`;
- validations:
  `3/3 PASS`;
- changed paths:
  exactly `docs/OPERATIONS.md`;
- HEAD unchanged:
  `YES`;
- extra paths:
  `[]`;
- exact target SHA-256:
  `8bc137d8ca3a75826f8798fd520c2624d460b00f6338d4751e42bf767faa1c24`;
- exact patch SHA-256:
  `b1b2f9ad0754e39f71a69d77c70487af16195b3b872280bdf251c64fe0ea548b`;
- exact target byte parity:
  `PASS`;
- exact patch parity:
  `PASS`;
- `git_promotion_performed=false`;
- `verified=false`;
- `canonical=false`.

Rebuild structured result SHA-256:

`04cf5fe3bb982bbccff5eaa28c1b433ff2f443eff261c1118b5b9103787e6094`

## Stage 4 — fresh clean readback

A third fresh clean worktree at the same base applied the rebuild patch.

Observed:

- patch apply:
  `PASS`;
- target SHA:
  exact reviewed target;
- byte parity:
  `PASS`;
- `git diff --check`:
  `PASS`;
- Execution Fabric regression:
  `19/19 PASS`;
- HEAD unchanged:
  `YES`.

## Human Review

Marcos accepted:

`R4 — Rebuild From Clean Base V1 = PASS N=1 / LOCAL / BOUNDED`

This acceptance does not rewrite the failed Stage 1 result.

Preserve:

`REBUILD PASS ≠ ORIGINAL FAILED EXECUTION BECOMES PASS`

## What R4 demonstrates

At most:

one controlled local bounded instance of:

`FAILED EXECUTION → NEW PROCESS → DETERMINISTIC RECOVERY → HUMAN DISPOSITION → CLEAN REBUILD`

with exact reviewed target-byte reproduction.

## What R4 does not demonstrate

- hard-crash recovery;
- arbitrary interruption recovery;
- general recovery;
- production recovery;
- cross-machine recovery;
- provider-independent recovery;
- complete founder-light autonomy;
- external utility;
- adoption;
- PMF;
- scale.

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

`HUMAN DECISION / SELECT NEXT GENESIS READINESS PROPERTY`

No R5 or next-gate execution is authorized by R4 acceptance or package
preparation.

END
