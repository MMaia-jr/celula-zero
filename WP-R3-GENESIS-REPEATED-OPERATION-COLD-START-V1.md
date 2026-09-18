# WORK PACKET — R3 GENESIS REPEATED OPERATION / COLD-START DISCOVERABILITY V1

Status:

`HUMAN-AUTHORIZED LOCAL EXECUTION / EXECUTED / NOT CANONICAL AT PREPARATION`

Canonical execution base:

`e09972a4fb7693066d68451f36e63d25fa8a7800`

Current Human Direction:

`D037 / GENESIS READINESS BEFORE EXTERNAL TRANSFER`

Working principle:

`FAZER PARA TESTAR, NÃO TESTAR PARA FAZER`

## Provenance of this Work Packet record

A pre-execution Work Packet candidate was prepared outside the repository.

Marcos then explicitly:

1. adopted R3 as the next Genesis Readiness gate;
2. accepted the Stage 0 diagnostic;
3. authorized local execution against the exact canonical base;
4. authorized Codex only through the canonical Execution Fabric;
5. restricted repository content change to exactly `docs/OPERATIONS.md`;
6. prohibited code changes, package changes, a second repository path, Git
   promotion, Kimi/paid review, Remote Supabase, deploy, funds, outreach and R4.

Therefore this canonical Work Packet records the effective authorized packet as:

`PRE-EXECUTION CANDIDATE + EXPLICIT HUMAN EXECUTION AUTHORIZATION`

Preserve:

`EFFECTIVE AUTHORIZED WORK PACKET ≠ ORIGINAL HUMAN AUTHORIZATION`

The Human authorization remains the authority-bearing Original Record.

## Objective

Test repeated operation after cold canonical restart on a second distinct real
Genesis need.

The real need:

the canonical Execution Fabric existed and had npm aliases, while the canonical
operator index `docs/OPERATIONS.md` did not expose the capability.

Classification:

`DISCOVERABILITY GAP / MAP EXISTING CAPABILITY`

not:

`BUILD NEW EXECUTION SYSTEM`

## Stage 0 — cold-start diagnostic

Use a fresh detached checkout at the exact canonical base.

Run:

`npm run cz -- --check`

Required readback:

- local HEAD equals remote canonical main;
- current Human Direction comes from canonical Git;
- no model call;
- no paid spend;
- no repository content write.

Then establish deterministically:

- `tools/cz-execution-fabric.mjs` exists;
- `tools/cz-execution-fabric.test.mjs` exists;
- `package.json` exposes:
  `exec:fabric`;
- `package.json` exposes:
  `test:exec:fabric`;
- `README.md` points to `docs/OPERATIONS.md`;
- `docs/OPERATIONS.md` does not expose Execution Fabric / `exec:fabric`.

If the gap is absent:

`STOP`

## Stage 1 — real task through canonical Execution Fabric

Only after Stage 0 confirms the property loss.

Execution route:

`npm run exec:fabric -- --packet <R3 packet outside repository>`

Supported executor:

`CODEX_CLI`

Allowed repository path:

`docs/OPERATIONS.md`

No second repository path is authorized.

Task:

map/document the already-existing bounded Execution Fabric in the canonical
operator index.

Required operator-facing content:

- one Quick operator map row;
- entrypoint:
  `npm run exec:fabric -- --packet /path/to/work-packet.json`;
- exact full 40-character lowercase hexadecimal Git SHA `canonical_base`;
- local `HEAD == canonical_base`;
- clean checkout before execution;
- exact `allowed_paths`;
- V1 executor:
  `CODEX_CLI`;
- validations as argv arrays without shell interpolation;
- classification ceiling:
  `COMPLETED / FAILED / BLOCKED / SCOPE_VIOLATION`;
- boundary:
  `COMPLETED ≠ VERIFIED ≠ CANONICAL`;
- `git_promotion_performed=false` does not grant Git-promotion authority;
- documented command / Work Packet does not itself authorize execution or Git
  promotion;
- verification:
  `npm run test:exec:fabric`.

Do not redesign or modify the Execution Fabric.

## Stage 1 deterministic validations

Required:

- `git diff --check`;
- changed path exactly `docs/OPERATIONS.md`;
- required operator-map / entrypoint / authority / classification markers;
- `npm run test:exec:fabric`;
- Node 24;
- unchanged Git HEAD;
- documentation delta remains bounded.

Expected successful result ceiling:

`COMPLETED / WITHIN_SCOPE / verified=false / canonical=false`

## Stage 2 — fresh-operator candidate readback

From another fresh detached canonical worktree:

1. apply only the R3 operations patch;
2. read through:
   `README.md → docs/OPERATIONS.md`;
3. confirm Execution Fabric, entrypoint, authority boundary and verification
   command are discoverable;
4. rerun:
   `npm run test:exec:fabric`;
5. prove candidate bytes match the Stage 1 candidate.

This is local candidate readback.

It is not canonicality.

## Exact implementation scope

Repository content change during R3 execution:

1. `docs/OPERATIONS.md`

Generated packet/result/log/patch artifacts remain outside the repository.

## Explicitly out of scope

- Execution Fabric source modification;
- Execution Fabric test modification;
- `package.json`;
- dependency/lockfile changes;
- database/schema/migrations;
- frontend;
- Room;
- Huly;
- new agent protocol;
- MCP/A2A;
- generic orchestrator;
- Kimi;
- paid-model review;
- Remote Supabase;
- deploy;
- funds;
- outreach;
- commit;
- push;
- PR;
- merge;
- R4.

## STOP gates

STOP if:

- canonical main changes;
- the Stage 0 gap is absent;
- a second repository path is required;
- code or package change is required;
- a dependency or credential is required;
- scope must expand.

## Result boundary

A PASS can demonstrate at most:

one second distinct real repository task after cold canonical restart, executed
through the already-canonical Execution Fabric, plus candidate readback that the
capability became discoverable through the canonical operations front door.

Preserve:

`SECOND DISTINCT EPISODE OBSERVED ≠ GENERAL RECURRENCE PROVEN`

`DISCOVERABLE ≠ HABITABLE`

`DOCUMENTED ≠ EXECUTED`

`COMPLETED ≠ VERIFIED ≠ CANONICAL`

`R3 PASS ≠ EXTERNAL UTILITY ≠ ADOPTION ≠ PMF ≠ SCALE`

END
