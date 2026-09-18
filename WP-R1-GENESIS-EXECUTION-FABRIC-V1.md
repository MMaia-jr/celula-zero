# WORK PACKET — R1 GENESIS EXECUTION FABRIC V1

Status: HUMAN-AUTHORIZED LOCAL IMPLEMENTATION / NOT CANONICAL

## Objective

Create the smallest Célula Zero-local execution seam justified by the already
observed property loss:

`Human as integration bus → excessive founder plumbing`

The V1 seam must make a bounded Codex execution reconstructible and testable
without creating a generic orchestrator, new agent protocol, database schema,
MCP/A2A layer, daemon, deployment system, or new authority primitive.

## Canonical base

`8216ebf348b88d67d9f93bf16d64c19c4aa9660a`

The implementation workspace MUST remain on this exact detached HEAD.
No commit, branch promotion, push, PR, merge, deploy or remote write is allowed.

## Existing capabilities to compose, not replace

Read-only references:
- `package.json`
- `scripts/cz-single-flight.py`
- `scripts/cz-founder.py`
- `scripts/cz-room.mjs`
- `scripts/move2-vs1-worker.mjs`
- `docs/OPERATIONS.md`
- `PROTOCOL.md`

Preserve:
- Human authority is explicit and contextual.
- AI output is not Human Direction, Evidence, Verification or Decision merely
  because an executor produced it.
- `PREPARED != EXECUTED != VERIFIED != COMMITTED != PUSHED != MERGED != CANONICAL`.
- Existing Move2 remains a hosted/provider AI job plane; do not convert it into
  a generic local coding-agent runner.

## Exact implementation scope

The ONLY repository paths that may change are:

1. `tools/cz-execution-fabric.mjs` — NEW
2. `tools/cz-execution-fabric.test.mjs` — NEW
3. `package.json` — modify only to add discoverable npm aliases

No dependency or lockfile changes.
No migration.
No app/frontend change.
No documentation change.
No existing script modification.

If implementation requires any fourth path, STOP and report why.

## Required V1 behavior

Implement a dependency-free Node.js CLI for a bounded Codex execution packet.

The CLI must:

1. accept an explicit JSON Work Packet via `--packet <path>`;
2. validate a small versioned schema, including:
   - `schema = "cz.execution-work-packet.v1"`
   - exact `canonical_base`
   - `executor = "CODEX_CLI"`
   - non-empty `task`
   - exact list of `allowed_paths`
   - deterministic validation commands represented as argv arrays, not shell text;
3. fail closed if:
   - current git HEAD differs from the packet base;
   - the checkout is dirty before execution;
   - the packet asks for a path outside its declared scope;
   - the packet requests an unsupported executor;
4. invoke Codex without a shell, using `codex exec` with `workspace-write`;
5. not request `danger-full-access`, `--yolo`, network enablement or Git promotion;
6. after execution:
   - prove HEAD did not move;
   - enumerate changed + untracked paths;
   - compare them to the exact allowed-path set;
   - mark any extra path as `SCOPE_VIOLATION`;
7. execute only the packet's validation argv arrays, without a shell;
8. emit one machine-readable result envelope:
   `schema = "cz.execution-result.v1"`
   with at least:
   - executor
   - canonical base
   - start/end timestamps
   - executor exit code
   - changed paths
   - validation results
   - scope status
   - final classification
   - stdout/stderr SHA-256 digests
   - explicit `git_promotion_performed = false` when HEAD is unchanged;
9. use classifications no stronger than:
   - `COMPLETED`
   - `FAILED`
   - `BLOCKED`
   - `SCOPE_VIOLATION`
   and never call its own output VERIFIED/CANONICAL;
10. keep stdout result usable by another process and diagnostics on stderr where
    practical.

Design for testability. External process execution should be injectable or
otherwise mockable so the focused unit tests do NOT invoke a real Codex call.

## Package aliases

Add:
- `exec:fabric`
- `test:exec:fabric`

Do NOT add the new test to the repository-wide `check` command in this tranche.

## Required tests

Focused tests must establish at least:
- valid packet accepted;
- wrong schema rejected;
- wrong base rejected;
- unsupported executor rejected;
- dirty checkout precondition rejected;
- out-of-scope path detected;
- HEAD movement detected;
- argv validation runs without shell interpolation;
- result envelope distinguishes executor completion from verification/canonicality.

## STOP gates

STOP rather than broaden scope if any of the following is needed:
- database/schema change;
- new dependency;
- modification outside the exact three paths;
- network access for implementation;
- MCP/A2A;
- daemon/background service;
- credentials;
- Git commit/push/PR/merge;
- Remote Supabase;
- deployment;
- external contact;
- funds.

## Expected local result

A minimal, tested, local `CODEX_CLI` execution seam that can later be exercised
as part of Genesis habitation.

This Work Packet does NOT authorize promotion and does NOT claim the seam is
production-ready or externally useful.
