# WORK PACKET — R4 REBUILD FROM CLEAN BASE V1

Status:

`HUMAN-AUTHORIZED LOCAL EXECUTION / EXECUTED / HUMAN REVIEW ACCEPTED`

Canonical execution base:

`797d0292359d6ebf1ff0034ceecdf76b0200134a`

Human disposition preceding this packet:

`REBUILD_FROM_CLEAN_BASE`

## Provenance

After Human Review accepted the controlled R4 recovery and selected
`REBUILD_FROM_CLEAN_BASE`, a new clean Work Packet candidate was prepared
outside the repository.

The candidate explicitly required a separate execution authorization.

Marcos then stated:

> vamos

in direct response to that execution gate.

Therefore this canonical Work Packet records the effective authorized packet as:

`CLEAN REBUILD CANDIDATE + CONTEXTUAL HUMAN AUTHORIZATION`

The old dirty failed worktree was not the execution workspace.

Preserve:

`REBUILD_FROM_CLEAN_BASE ≠ RETRY OLD EXECUTION`

`OLD DIRTY WORKTREE ≠ NEW EXECUTION WORKSPACE`

## Objective

Reproduce only the already Human-reviewed documentation change from the failed
R4 episode, but as a new execution from a fresh clean canonical checkout.

Repository content path:

`docs/OPERATIONS.md`

only.

No semantic redesign was authorized.

## Reviewed target

Reviewed patch SHA-256:

`b1b2f9ad0754e39f71a69d77c70487af16195b3b872280bdf251c64fe0ea548b`

Reviewed target `docs/OPERATIONS.md` SHA-256:

`8bc137d8ca3a75826f8798fd520c2624d460b00f6338d4751e42bf767faa1c24`

Because base/path/target text were unchanged and the exact target had already
received Human readback, byte parity was the acceptance criterion.

Preserve:

`REVIEWED TARGET BYTES ≠ PREVIOUS EXECUTION SUCCESS`

## Execution

Execution workspace:

fresh isolated clean worktree at the exact canonical base.

Execution route:

`CANONICAL EXECUTION FABRIC → CODEX_CLI`

Allowed path:

`docs/OPERATIONS.md`

Packet schema:

`cz.execution-work-packet.v1`

Validations:

1. `git diff --check`;
2. exact SHA-256 target oracle;
3. `npm run test:exec:fabric`.

Expected successful ceiling:

`COMPLETED / WITHIN_SCOPE / verified=false / canonical=false`

## Post-execution deterministic readback

Required:

- actual changed path exactly `docs/OPERATIONS.md`;
- HEAD unchanged;
- no extra path;
- target SHA equals reviewed target SHA;
- patch SHA equals reviewed patch SHA;
- fresh clean worktree patch application;
- target byte parity;
- `19/19` Execution Fabric regression;
- no Git promotion.

If byte parity failed:

`STOP`

No semantic-parity reinterpretation was authorized.

## Explicitly out of scope

- old dirty worktree reuse;
- Execution Fabric source/test changes;
- package/dependency changes;
- database/schema/migrations;
- frontend;
- generic recovery journal/state machine;
- second repository path;
- Kimi/paid review;
- Remote Supabase;
- deploy;
- funds;
- outreach;
- commit/push/PR/merge;
- R5.

## Result boundary

A PASS can demonstrate at most:

`HUMAN DISPOSITION → NEW CLEAN WORK PACKET → FRESH CLEAN EXECUTION → SAME REVIEWED TARGET BYTES`

Preserve:

`REBUILD PASS ≠ ORIGINAL FAILED EXECUTION BECOMES PASS`

`COMPLETED ≠ VERIFIED ≠ CANONICAL`

`HUMAN REVIEW ≠ GIT PROMOTION`

END
