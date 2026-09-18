# WORK PACKET — R2 GENESIS EXPERIENCE V1

Status:

`HUMAN-AUTHORIZED LOCAL EXECUTION / EXECUTED / NOT CANONICAL AT PREPARATION`

Canonical execution base:

`14136021f8a7f9fa14f48cd3cc892208606f4cb3`

Current Human Direction:

`D037 / GENESIS READINESS BEFORE EXTERNAL TRANSFER`

Working principle:

`FAZER PARA TESTAR, NÃO TESTAR PARA FAZER`

## Provenance of this Work Packet record

A pre-execution candidate Work Packet was prepared before R2.

After the deterministic Stage 0 preflight, the Human authorization explicitly
refined the effective R2 scope to include both:

1. current-base portability of the Execution Fabric; and
2. correct provenance of a `BLOCKED` result envelope.

Execution then proceeded under that explicit Human authorization.

Therefore this canonical Work Packet is the reconstruction of the **effective
authorized packet** from:

`PRE-EXECUTION CANDIDATE + EXPLICIT HUMAN EXECUTION AUTHORIZATION`

It must not be misrepresented as a byte-for-byte Original Record of one single
finalized pre-execution file.

Preserve:

`EFFECTIVE AUTHORIZED WORK PACKET ≠ SINGLE BYTE-PRESERVED PRE-EXECUTION FILE`

The Human authorization itself remains the authority-bearing Original Record.

## Human execution authorization

Marcos authorized R2 locally against the exact canonical base above.

Authorized sequence:

`Stage 0 observed RED → Stage 1 bounded fabric repair → Stage 2 real STATE task through repaired fabric → deterministic readback → Human Review`

Authorized Codex scope:

Stage 1 only:

1. `tools/cz-execution-fabric.mjs`
2. `tools/cz-execution-fabric.test.mjs`

Stage 2 only:

3. `STATE.md`

No fourth repository path was authorized.

## Stage 0 — deterministic preflight

Purpose:

test whether canonical R1 Execution Fabric could accept a Work Packet anchored
to the then-current canonical main.

Required:

- clean detached worktree at exact base;
- packet outside repository;
- `canonical_base` equal exact current base;
- `executor = CODEX_CLI`;
- only `STATE.md` declared as allowed path;
- zero model calls if packet validation blocks;
- preserve stdout/stderr and result envelope.

Expected RED:

`BLOCKED / wrong canonical base`

No implementation was authorized unless Stage 0 reproduced that property loss.

## Stage 1 — smallest portability + provenance repair

Only after Stage 0 reproduced the RED.

Observed properties to repair:

1. the fabric privileged the historical R1 base and rejected a legitimate
   current canonical base;
2. a pre-execution `BLOCKED` envelope could report the historical embedded base
   instead of the legitimate base requested by a parsed Work Packet.

Required minimal behavior:

- keep `cz.execution-work-packet.v1`;
- require `canonical_base`;
- require it to be a full lowercase 40-character hexadecimal Git SHA;
- do not privilege a hard-coded historical/current SHA;
- compare local `HEAD` exactly with `packet.canonical_base`;
- different actual HEAD fails closed before Codex;
- preserve dirty-checkout refusal;
- preserve `CODEX_CLI` as the only V1 executor;
- preserve exact `allowed_paths`;
- preserve post-validation scope readback;
- preserve argv-based validations;
- preserve bare validation executable policy and `git/node/npm` allowlist;
- preserve `shell=false`;
- preserve 30-minute Codex timeout;
- preserve classification ceiling:
  `COMPLETED / FAILED / BLOCKED / SCOPE_VIOLATION`;
- preserve `verified=false`;
- preserve `canonical=false`;
- preserve `git_promotion_performed=false` only when unchanged HEAD was
  actually assessed, otherwise `null`;
- when a parsed Work Packet supplies a legitimate full-SHA base and execution
  blocks before execution, preserve that requested base in the result envelope;
- when no legitimate base is available, do not invent one.

## Stage 1 required deterministic coverage

Retain R1 safety coverage and establish:

- arbitrary full-SHA packet base accepted when mocked HEAD equals it;
- actual HEAD different from packet base blocks before Codex;
- malformed/non-full-SHA base rejected;
- historical R1 base has no privileged status;
- dirty checkout blocks before Codex;
- unsupported executor blocks;
- out-of-scope changes become `SCOPE_VIOLATION`;
- HEAD movement becomes `SCOPE_VIOLATION`;
- validations remain argv arrays with `shell=false`;
- executable allowlist remains enforced;
- unassessed result does not invent Git-promotion state;
- blocked result preserves only a legitimate requested full-SHA base;
- CLI blocked path preserves parsed legitimate base without running Codex.

Runtime:

`Node 24`

## Stage 2 — real Genesis task through repaired fabric

After Stage 1 deterministic tests pass, use the repaired Execution Fabric
itself to execute exactly one real repository maintenance task:

> In `STATE.md`, replace the stale statement saying current sequencing is
> governed by D033 with wording that says current sequencing is governed by D037
> and D033 remains preserved direction and lineage. Preserve all other semantic
> content and formatting as closely as possible.

Allowed Stage 2 repository path:

`STATE.md`

Required result envelope:

`cz.execution-result.v1`

Expected successful ceiling:

`COMPLETED / WITHIN_SCOPE / verified=false / canonical=false`

not:

`VERIFIED`

and not:

`CANONICAL`.

## Authorized local validation

- Node 24 focused tests;
- `git diff --check`;
- exact changed-path readback;
- HEAD immutability;
- deterministic semantic readback of the STATE transformation;
- local patch/hash reconstruction.

## Explicitly not authorized

- Kimi or paid model review;
- dependencies or lockfile change;
- database/schema/migrations;
- frontend;
- Room/Huly changes;
- generic orchestrator;
- MCP/A2A;
- Remote Supabase;
- deploy;
- movement of funds;
- external outreach;
- commit;
- push;
- pull request;
- merge;
- R3 or any next-gate execution.

## STOP gates

STOP if:

- canonical main changes;
- Stage 0 stops matching the observed RED;
- a fourth repository path is required;
- a dependency is required;
- credentials are required;
- scope must expand;
- any prohibited promotion/external action is required.

## Result boundary

A PASS can demonstrate at most one local bounded episode in which the current
Human Direction becomes a bounded Work Packet, the Execution Fabric invokes
Codex on real repository work, deterministic checks constrain the result, and
the result returns to Human Review.

Preserve:

`R2 PASS N=1 ≠ COMPLETE GENESIS EXPERIENCE`

`R2 PASS N=1 ≠ FOUNDER-LIGHT AUTONOMY`

`R2 PASS N=1 ≠ EXTERNAL UTILITY ≠ ADOPTION ≠ PMF ≠ SCALE`

END
