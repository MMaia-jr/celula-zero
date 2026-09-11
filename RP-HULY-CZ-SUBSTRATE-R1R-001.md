# Result Package — HULY-CZ-SUBSTRATE-R1R-001

Date: 2026-09-11

Class: local technical result / bounded verification / promotion record

Human adjudication and promotion authority:

> Adjudico R1-R como PASS N=1 e autorizo preparar, commit, push, PR e, após gates verdes e readback, merge do pacote mínimo de promoção.

## 1. Question

Can a Célula Zero Cell use Huly's existing typed-space, role and permission
mechanisms to preserve the tested authority boundary without a functional Huly
core patch, when the CZ model is composed in a hierarchy-valid order?

This package does not decide that Huly is the Célula Zero architecture.

## 2. Tested Huly base

Pinned upstream:

`hcengineering/platform@63e28dc96483967b2fc21c881b3f1023c1de7718`

The earlier canonical `TECH-SPIKE-HULY-001` remains historical and unchanged.
It used another Huly base and another experimental delta. This package does not
rewrite or supersede that original record.

## 3. Original R1 result

`R1 ORIGINAL = FAIL`

The original authority run did not enforce the intended CZ restrictions.
Forbidden CZ mutations were accepted in that faulty composition.

Subsequent forensic readback established a CZ integration error:

`ROOT CAUSE = CONFIRMED / CZ MODEL ORDERING INTEGRATION BUG`

In the faulty composition, `czModel` was loaded before `coreModel`.
At the relevant model replay point, `CellSpace` did not yet resolve as derived
from `core.class.Space` / `core.class.Doc`. As a consequence, Huly's
`SpacePermissionsMiddleware` did not register the new Cell as a restricted
typed Space at creation time.

This is an interpretation supported by the hierarchy/order forensic and the
corrected run. It is not a claim that every anomaly observed in the original
runtime had the same cause.

## 4. Smallest repair

The repair changes model composition order so that `coreModel` precedes
`czModel`.

The preserved experimental Huly delta is:

- `experiments/HULY-CZ-SUBSTRATE-R1R-001/HULY-DELTA.patch`
- base: `63e28dc96483967b2fc21c881b3f1023c1de7718`
- SHA-256: `2ff75f4ebdfd16007fcb90edb57f291e3f866f898146d8d19c6a113696decc62`
- bytes: `19896`
- changed/new source paths represented: `14`

The patch also contains the CZ experimental model/plugin source and the
mechanical monorepo wiring needed by that tested composition.

Promotion-time source manifest SHA-256:

`aef2a69980d376765232d79d2d88812f18505c9c400b7c13aee9cd01d6136a34`

The tracked Huly delta matched the previously recorded tracked-diff hash before
promotion. The new CZ files under `models/cz/**` and `plugins/cz/**` were
untracked during the experiment and did not have a separate pre-run content
hash. This promotion therefore preserves their current contents from the same
experimental worktree; it does not retroactively claim a pre-run hash that was
never recorded.

The same worktree also contained `22` untracked local
harness/runtime files under `experiments/cz-substrate-microprobes/**` and
`experiments/cz-substrate-runtime/**`. They are explicitly excluded from this
minimal source delta and are left untouched.

Patch promotion gate:

`git apply --check = PASS`

Exact path readback after patch application:

`PASS`

Model ordering readback after application:

`CORE_THEN_CZ = PASS`

## 5. Static repair verification

Before the corrected runtime authority run, the repaired composition was
verified locally:

- `CellSpace -> TypedSpace = YES`;
- `CellSpace -> Space = YES`;
- `CellSpace -> Doc = YES`;
- Cell domain = `space`;
- `OriginalRecord`, `Interpretation`, `HumanDirection` domain = `cz`;
- CZ permissions = `9/9`;
- CZ roles = `3/3`;
- CZ SpaceType present;
- corrected Workspace/Transactor model composition matched the intended order.

Classification:

`STATIC_REPAIR = PASS`

## 6. Corrected R1-R execution

Runtime envelope:

- unique local Docker namespace: `czhuly-r1r001`;
- fresh test workspace: `cz-r1r001-runtime-001`;
- only the six R1-R containers running during the final authority canaries;
- synthetic human, AI and unrelated accounts;
- AI/unrelated normal workspace onboarding through Owner invite + user join;
- no Huly upstream write;
- no remote Supabase write;
- no external contact.

Fresh semantic precondition:

- Cells = `0`;
- OriginalRecords = `0`;
- Interpretations = `0`;
- HumanDirections = `0`.

Created graph:

`Cell -> O1 OriginalRecord -> I1 Interpretation -> H1 HumanDirection`

Observed positive authority:

- Human Steward creates restricted Cell: `PASS`;
- Human Steward creates O1: `PASS`;
- AI Participant creates I1: `PASS`;
- Human Steward creates H1: `PASS`;
- same-Cell member with no CZ role reads O1: `PASS`.

Observed denials:

- Human update/remove O1: `FORBIDDEN`;
- AI update/remove O1: `FORBIDDEN`;
- Human and AI update/remove I1: `FORBIDDEN`;
- AI create HumanDirection: `FORBIDDEN`;
- AI spoof Human `modifiedBy`: `ACCOUNT_MISMATCH`;
- Human and AI update/remove H1: `FORBIDDEN`;
- same-Cell member with no CZ role create OriginalRecord: `FORBIDDEN`;
- same-Cell member with no CZ role create Interpretation: `FORBIDDEN`.

Exact forbidden attempts:

`16`

Expected denial codes:

`15 x platform:status:Forbidden + 1 x platform:status:AccountMismatch`

The structured final canary state is preserved at:

- `experiments/HULY-CZ-SUBSTRATE-R1R-001/R1R-AUTHORITY-STATE.json`

## 7. Journal and current-state verification

Before restart:

- exact forbidden transaction IDs persisted in tx journal: `0`;
- current Cell rows for the test Cell: `1`;
- current CZ graph rows O1/I1/H1: `3`;
- exact graph readback: `PASS`.

A controlled persistence restart was then executed for Cockroach, Account,
Transactor and Workspace while Redpanda/MinIO remained running.

After restart, using new client sessions:

- same Cell: `PASS`;
- same O1: `PASS`;
- same I1: `PASS`;
- same H1: `PASS`;
- unrelated same-Cell member still reads O1: `PASS`;
- denied objects absent: `PASS`;
- exact graph: `PASS`;
- exact forbidden transaction IDs persisted in tx journal: `0`;
- Cell row count: `1`;
- CZ graph row count: `3`.

## 8. Result

`R1R_AUTHORITY_CANARIES = PASS N=1`

`SPACE_PERMISSIONS_RUNTIME = PASS N=1`

`ORIGINAL_RECORD_NORMAL_API_IMMUTABILITY = VERIFIED N=1`

`HULY_CORE_PATCH_REQUIRED = NO EVIDENCE`

`ARCHITECTURAL_FALSIFIER_TRIGGERED = NO`

Bounded interpretation:

For the tested ordinary authenticated client/API actors and tested CZ
classes/roles, Huly's existing permission architecture preserved the intended
boundary after the CZ model-order repair.

## 9. Residuals and non-inferences

The repeated runtime warning

`no document found, failed to apply model transaction, skipping`

remains:

`OBSERVED / REPRODUCED / UNRESOLVED / NON-BLOCKING FOR THIS GATE / CAUSAL RELATION TO CZ NOT ESTABLISHED`.

The earlier disappearance of Cell/I1 is classified:

`NOT REPRODUCED UNDER CORRECTED COMPOSITION`.

Its historical cause remains unresolved. This package does **not** infer that
the model-order bug caused that disappearance.

The tested immutability property is bounded to normal authenticated application
/API actors. It does not demonstrate cryptographic immutability or resistance
to direct database access, operator authority, System account authority,
malicious infrastructure, or altered backup/restore.

This result does not demonstrate production readiness, external utility,
adoption, PMF or scale.

## 10. Licensing / provenance boundary

The preserved delta targets the Huly source tree, whose tested upstream source
is under EPL-2.0. Applicable upstream notices and third-party rights remain
applicable.

The Célula Zero repository has mixed licensing. `experiments/**` and this
root Result Package are outside the Phase-1 MPL software scope unless a
separate explicit grant applies.

`PUBLIC != MPL-COVERED`

`THIRD-PARTY MATERIAL != RELICENSED`

## 11. Final classification

`R1 ORIGINAL = FAIL`

`ROOT CAUSE = CONFIRMED / CZ MODEL ORDERING INTEGRATION BUG`

`STATIC REPAIR = PASS`

`CORRECTED RUNTIME HIERARCHY = PASS`

`R1-R = VERIFIED_LOCAL / PASS N=1`

`HULY CORE PATCH REQUIRED = NO EVIDENCE`

`ARCHITECTURAL FALSIFIER = NOT TRIGGERED`

Promotion of this Result Package records the bounded result. It does not itself
adopt Huly as the universal or final Célula Zero substrate.
