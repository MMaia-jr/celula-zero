# RP-GI1-D1 — Operational Discoverability N=1

Status:

`VERIFIED_FRESH_OPERATOR N=1 / PROMOTION AUTHORIZED`

Canonical base under test:

`fd0e57bba2c8db6fc8a0aa6c13567cd4c02482af`

Human Direction preserved:

`D021 / INTERNAL OPERABILITY BEFORE EXTERNAL DOING / HUMAN DIRECTION`

## Property tested

A technically competent fresh operator, without prior chat/project history, can
start from the canonical `README.md` front door and discover the supported
operational capabilities, preconditions, authority boundaries, entrypoints,
expected STOP/results, verification mechanisms, and known unresolved gaps
without arbitrary repository exploration.

Preserve:

`documented command ≠ authorization`

`discoverability PASS ≠ every capability executable by a fresh operator`

`PASS N=1 ≠ universal operability ≠ production readiness ≠ external utility ≠ adoption ≠ scale`

## Prepared repair

Exactly three documentation paths were prepared locally:

- `README.md`
- `docs/DEVELOPMENT.md`
- `docs/OPERATIONS.md`

`docs/OPERATIONS.md` provides an operational index and quick operator map from
operator intent to existing capability.

No product/runtime implementation was added by GI1-D1.

## Validation history

### Fresh Operator V1

Classification:

`INCONCLUSIVE`

Observed:

- evaluator started from the wrong working directory;
- target worktree `README.md` was therefore never read;
- no arbitrary repository search was used;
- the evaluator stopped fail-closed.

Interpretation:

`test harness failure ≠ discoverability failure`

### Fresh Operator V2

Classification:

`PARTIAL`

Observed:

- test harness: `PASS`;
- README-only start: `YES`;
- questions answered from reachable documentation: `9/9`;
- arbitrary implementation/repository exploration: `NO`;
- false/unsupported operational claims: `0`;
- authority-boundary errors: `0`;
- STOP-boundary errors: `0`;
- documented precondition gaps correctly preserved: `2`.

Material learning:

- Company Core fresh Human authentication/access-token bootstrap remained a
  precondition/bootstrap gap;
- Project Room legitimate acquisition of all five required IDs remained a
  precondition/bootstrap gap;
- Move2 deterministic reconciliation disposition remained a substantive
  property gap;
- Room continuity per-path documentation needed greater precision;
- the initial operations index was usable but longer/repetitive.

### GI1-D1-R1 refinement

The operations index was refined from `661` to `472` lines.

Refinement added:

- a quick operator intent map;
- clearer Room export/handoff/composed/capture outputs and boundaries;
- explicit limits on deterministic test coverage;
- preserved separation between discoverability, precondition/bootstrap, and
  substantive property gaps.

A first deterministic validator stopped on a line-wrap-sensitive assertion
after the refined document had already been written.

Recovery classification:

`VALIDATOR BUG / DOCUMENT NOT REWRITTEN`

Corrected read-only validation then observed:

- exact three-file local scope: `PASS`;
- `README` operations link: `PASS`;
- `DEVELOPMENT` operations link: `PASS`;
- quick map: `PASS`;
- entrypoint references: `PASS`;
- Room continuity per-path boundaries: `PASS`;
- test coverage not overclaimed: `PASS`;
- gap classes preserved: `PASS`;
- Markdown validation: `PASS`;
- `git diff --check`: `PASS`;
- recovery file writes: `0`.

Refined `docs/OPERATIONS.md` SHA-256:

`4409279710c91c12a2811c8cf42ee08da503a4c977b35e04c2a0146d4a94ad03`

### Fresh Operator V3

Classification:

`PASS`

Evaluator:

`OpenAI Codex / GPT-5.6 Sol`

Important accounting boundary:

`evaluator model inference occurred ≠ implemented Célula Zero system model call`

Observed:

- test harness: `PASS`;
- README at workspace root: `YES`;
- README-only start: `YES`;
- `OPERATIONS.md` reached from README: `YES`;
- quick operator map found: `YES`;
- quick operator map useful: `YES`;
- undocumented repository search: `NO`;
- arbitrary implementation exploration: `NO`;
- operational commands executed: `0`;
- file writes: `0`;
- Git writes: `0`;
- DB writes: `0`;
- implemented-system model calls: `0`;
- implemented-system paid calls: `0`;
- intents total: `11`;
- intents discovered correctly: `11`;
- false/unsupported operational claims: `0`;
- authority-boundary errors: `0`;
- STOP-boundary errors: `0`;
- test-coverage overclaims: `0`;
- gap-classification errors: `0`.

The evaluator reported two discoverability-break markers while still
classifying the overall test `PASS`; those markers corresponded to legitimate
unresolved prerequisite/ergonomic boundaries that the documentation surfaced
rather than hid.

## Demonstrated consequence

For this N=1 fresh-operator test:

`README → OPERATIONS → existing operational capability map = PASS`

A fresh technically competent evaluator reconstructed all eleven requested
operator intents without arbitrary repository exploration and without
collapsing entrypoint discovery into authority.

## Gaps preserved after PASS

### Discoverability / ergonomics

- composed Room + Git-canonical handoff has no npm alias;
- paid predecessor fail-closed validator has no package alias.

These capabilities remain discoverable through `docs/OPERATIONS.md`.

### Fresh-operator precondition / bootstrap

- Company Core: supported fresh Human authentication/access-token bootstrap is
  not yet demonstrated as a one-command path;
- Project Room: legitimate fresh-operator acquisition of all five required Room
  IDs is not yet demonstrated.

### Substantive property

- Move2 deterministic disposition after `NEEDS_RECONCILIATION` remains
  unresolved.

Preserve:

`ambiguity detected ≠ ambiguity disposition resolved`

## What this result does not demonstrate

GI1-D1 does not demonstrate:

- that every operational capability can be executed by a fresh operator;
- universal internal operability;
- production readiness;
- production deployment;
- external utility;
- adoption;
- PMF;
- scale.

## Promotion authority

Human authorization:

Promote exactly:

1. `README.md`
2. `docs/DEVELOPMENT.md`
3. `docs/OPERATIONS.md`
4. `RP-GI1-D1-OPERATIONAL-DISCOVERABILITY-N1.md`
5. `STATE.md`

with commit, push, PR and merge only if prechecks/tests pass, `main` remains at
the reviewed base before merge, and no other file is touched.

Preserve D021 and:

`GI1-003 / HUMAN REVIEW / AUTHORIZE SMALLEST MOVE2 RECONCILIATION REPAIR IF PROPERTY LOSS REMAINS`
