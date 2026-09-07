# RP-GI1-003 — Move2 Reconciliation Disposition N=1

Status:

`VERIFIED_LOCAL N=1 / PROMOTION AUTHORIZED`

Canonical execution base:

`ac6f289f8674948fc445af733981b4ca8a9ad38b`

Human Direction preserved:

`D021 / INTERNAL OPERABILITY BEFORE EXTERNAL DOING / HUMAN DIRECTION`

## Property tested

An already ambiguous Move2 Job can receive an explicit, legitimate and auditable
Human reconciliation disposition that terminates the Job / sponsored budget
hold coherently without implicit redispatch, provider/model execution, direct
state editing, or retroactive rewriting of provider-time AI Run facts.

Preserve:

`ambiguity detected ≠ ambiguity resolved`

`safe hold ≠ permanent resolution`

`provider-time Original Record ≠ later Human reconciliation observation`

`VERIFIED_LOCAL N=1 ≠ REMOTE_APPLIED ≠ PRODUCTION_READY ≠ EXTERNAL_UTILITY ≠ ADOPTION ≠ SCALE`

## Minimal repair

Repository implementation scope:

1. `supabase/migrations/20260907193000_move2_reconciliation_disposition.sql`
2. `supabase/tests/database/move2_reconciliation_disposition.test.sql`

The migration adds one authenticated Human-facing RPC:

`public.move2_dispose_reconciliation(...)`

It reuses existing:

- `cycle.manage` project-scoped authority;
- Actor control;
- requester ownership of the exact AI Job;
- command idempotency;
- sponsored hard-budget locking/accounting;
- append-only domain events.

It adds no worker daemon, retry loop, provider adapter, frontend, Remote Supabase
deployment, token, queue-redelivery mechanism or new authority subsystem.

## Explicit dispositions

The verified surface distinguishes:

- `NO_CHARGE_OBSERVED`
- `CHARGE_OBSERVED_NO_OUTPUT`
- `COMPLETED_OUTPUT_COST_OBSERVED`

against the already-existing reconciliation causes:

- `DISPATCH_OUTCOME_UNKNOWN`
- `WORKER_LOST_AFTER_DISPATCH`
- `ACTUAL_COST_UNKNOWN`
- `ACTUAL_COST_EXCEEDS_RESERVATION`

A disposition is rejected when its facts do not match the stored reconciliation
cause / AI Run state.

## Safety properties

Observed and deterministically tested:

- only an authenticated profile controlling the exact requester Actor with
  `cycle.manage` authority can disposition the Job;
- the Move2 worker itself cannot execute the disposition RPC;
- exact idempotent replay returns the same completed result;
- conflicting idempotency facts fail closed;
- no ambiguous Job is redispatched;
- no PGMQ delivery is created by reconciliation;
- a running AI Run with no recovered output is failed rather than fabricated;
- Company Core state follows the existing `AI_RUNNING → AI_FAILED` boundary for
  no-output dispositions;
- an already-completed AI Run keeps its attributable output and CycleRecord;
- provider-time cost metadata is not rewritten when later Human reconciliation
  supplies an observed cost;
- the reservation leaves `HELD_FOR_RECONCILIATION` atomically as `RELEASED` or
  `SETTLED`;
- reconciled settlement rechecks the same hard sponsored-budget pool;
- a reconciled actual cost that would exceed the hard limit fails closed and
  leaves the reconciliation hold intact;
- reconciliation event payload explicitly preserves
  `redispatched=false`, `human_direction=false`, `evidence=false`,
  `verification=false`.

## Out of scope

Late provider-output recovery / import after an ambiguous dispatch is not
implemented by GI1-003.

GI1-003 does not fabricate or import a late output, create a CycleRecord from
one, or silently redispatch the original Job.

That adjacent property is:

`PRESERVED / NOT SELECTED AS CURRENT WORK`

## Execution history

### Initial preparation

Prepared locally against canonical base `ac6f289f8674948fc445af733981b4ca8a9ad38b` with exactly two repository
files.

The first preparation executor stopped on a static validator false-negative:
the validator required one `redispatched=false` representation verbatim in both
migration and pgTAP even though the test asserted the same property through a
different expression.

Classification:

`VALIDATOR DEFECT / REPAIR NOT FALSIFIED`

### Static-validator recovery

The existing worktree and exact two-file scope were preserved.

Observed:

- base: `PASS`;
- canonical origin: `PASS`;
- live main: `PASS`;
- migration SHA-256:
  `9feb7fcd46b1aa8fa5e3470a9885b7cf2e496d0a0f97aacda7531d7337e2ba6a`;
- original pgTAP SHA-256 before SQL qualification repair:
  `01ec159a4c0f32b4cd481d19baef7d1d3c96470f09f288d029167a8f11dd4076`;
- no dispatch surface in repair: `PASS`;
- migration rewrite during recovery: `NO`.

### First targeted pgTAP execution

The migration applied successfully during local DB reset.

The pgTAP executed six assertions successfully, then PostgreSQL rejected an
unqualified `state` column selected across a JOIN where both tables exposed a
`state` column.

Classification:

`TEST SQL DEFECT / REPAIR BEHAVIOR NOT YET FULLY VERIFIED`

### pgTAP SQL qualification recovery

Only the existing targeted pgTAP file was changed.

The migration remained byte-identical.

Final pgTAP SHA-256:

`77386fc7f6325b50ca595ad3485ef7fa17249f91e58d21f6fedd817d26dd5316`

## Final deterministic verification

Local Supabase CLI:

`2.115.0`

Observed:

- clean local DB reset with GI1-003 migration: `PASS`;
- targeted GI1-003 pgTAP:
  `70/70 PASS`;
- Move2 worker regression:
  `18/18 PASS`;
- full local database regression:
  `31 files / 911 tests PASS`;
- changed repository files during implementation verification:
  `2`;
- ambiguous Job redispatch:
  `NO`;
- provider/model-call paths executed:
  `0`;
- Remote Supabase writes:
  `0`;
- frontend execution:
  `0`;
- commit:
  `NO`;
- push:
  `NO`;
- PR:
  `NO`;
- merge:
  `NO`.

Result:

`GI1-003 / MOVE2 RECONCILIATION DISPOSITION = VERIFIED_LOCAL N=1`

## What this result does not demonstrate

GI1-003 does not demonstrate:

- Remote Supabase application;
- production deployment;
- production worker credential delivery;
- production uptime;
- correctness for reconciliation causes not represented by the tested existing
  Move2 state machine;
- late-output recovery/import after dispatch ambiguity;
- external utility;
- adoption;
- PMF;
- scale.

## Promotion scope

Human-authorized canonical promotion scope is exactly six files:

1. `supabase/migrations/20260907193000_move2_reconciliation_disposition.sql`
2. `supabase/tests/database/move2_reconciliation_disposition.test.sql`
3. `docs/OPERATIONS.md`
4. `RP-GI1-003-MOVE2-RECONCILIATION-DISPOSITION-N1.md`
5. `STATE.md`
6. `scripts/cz-founder-resume.test.py`

The sixth file changes only the canonical Founder regression expectation from
the completed GI1-003 Human gate to:

`GI1-004 / HUMAN REVIEW / SELECT NEXT MATERIAL INTERNAL OPERABILITY PROPERTY`

No next material property is selected by this promotion.
