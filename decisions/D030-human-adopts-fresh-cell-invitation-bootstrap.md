# D030 — Fresh Cell invitation bootstrap without membership/authority conflation

Class:

`DECISION / HUMAN DIRECTION`

Authority:

`HUMAN / MARCOS`

Date:

`2026-09-10`

## 1. Human Original Record

> vamos fazer, quero saber tambem como estamos de acordo com o karrabirdt

Context immediately preceding this Original Record:

- a fresh-Cell capability audit had execution-confirmed raw capability gaps;
- the proposed Human direction was that a newly created Cell must have an
  explicit usable authority path without turning participation into authority
  or stewardship into authorship;
- the proposed execution path was one bounded conditional pipeline through
  local validation, review, Git promotion and STATE reconciliation.

Preserve:

`ORIGINAL RECORD ≠ INTERPRETATION ≠ IMPLEMENTATION ≠ VERIFICATION`

## 2. Adopted direction

A newly created Cell must have an explicit, usable path for the authority
required to inhabit it, while preserving:

`PARTICIPATION ≠ MEMBERSHIP ≠ AUTHORITY`

`PROJECT STEWARDSHIP ≠ AUTHORSHIP`

`ROLE AVAILABLE ≠ ROLE ASSIGNED`

`CAPABILITY AVAILABLE ≠ CAPABILITY GRANTED`

The initial responsible Human may receive only the bounded bootstrap authority
needed to make the Cell inhabitable. That bootstrap must not silently grant
productive, administrative or economic authority to later participants.

## 3. Canonical composition discovered before implementation

Read-only inspection plus the Human-authorized local preflight established:

`RAW COMMAND CAPABILITY GAP ≠ PRODUCT PATH BLOCKER`

The intended productive path already composes existing canonical mechanisms:

- PUBLIC/OPEN Opportunity → Proposal entry for a controlled PERSON without Cell
  membership, role or delegation;
- accepted-Commitment-derived `contribution.submit` and `artifact.attach`;
- accepted-Commitment-derived `claim.record` and `evidence.register`.

The local preflight execution-confirmed:

`PUBLIC Proposal → accepted Commitment → Contribution → Artifact → Claim → Evidence = PASS`

Therefore D030 does not create a parallel `CONTRIBUTOR` bootstrap.

## 4. Execution-confirmed missing property

The same preflight execution-confirmed that the founder of a fresh
participant-boundary Cell cannot call `k002_create_cell_invitation()` because
`participation.invite` is unavailable at CELL scope:

`FRESH CELL INVITATION = DENY / 42501 / CZ403:CAPABILITY_DENIED`

This is the concrete D030 property loss selected for the first slice.

## 5. Rejected local representation — not canonical

An initial local candidate attempted to represent invitation authority through a
second CELL-scoped role assignment named `CELL_INVITER`.

Focused D030 regression:

`26/26 PASS`

Full database regression correctly failed in `participant_boundary.test.sql`:

- each founder had two active CELL-scoped role assignments where the canonical
  participant boundary expected one explicit active CELL membership;
- a scalar query for the automatic Cell membership role became multi-row;
- current `participant_has_active_cell_membership()` intentionally treats an
  active CELL-scoped role assignment as Cell membership.

Therefore:

`CELL_INVITER ROLE CANDIDATE = REJECTED LOCAL / NOT PROMOTED`

`FULL REGRESSION FAILURE ≠ TEST TO SILENCE`

The failure showed that a second CELL-scoped role would conflate the current
membership boundary with a functional invitation role and could keep Cell
membership/read access alive independently of the canonical `CELL_MEMBER`
assignment.

## 6. Revised smallest representation

D030 preserves the adopted Human direction with a smaller composition and no
new role.

Existing role/delegation authorization for `participation.invite` remains valid.
In addition, `k002_create_cell_invitation()` and
`k002_revoke_cell_invitation()` may recognize exactly one derived bootstrap
authority basis:

`PARTICIPANT_BOUNDARY_FOUNDER`

It is valid only when all of the following are true:

1. the authenticated profile controls the acting PERSON Actor;
2. the Cell current policy is a participant-boundary policy;
3. that current policy was created by the acting Actor;
4. the Actor still has an active `CELL_MEMBER` assignment for that exact Cell
   under that exact current policy.

Therefore:

`FOUNDER BOOTSTRAP AUTHORITY ≠ ROLE ASSIGNMENT`

`FOUNDER BOOTSTRAP AUTHORITY ≠ DELEGABLE CAPABILITY`

`ACTIVE CELL_MEMBER LOST → DERIVED INVITATION AUTHORITY LOST`

No change is made to `private.b1_has_capability()` and no new role,
role-capability or role-assignment row is created by D030.

## 7. Required vertical-slice proof

Before promotion, one synthetic local fresh-Cell rehearsal must demonstrate:

`fresh Cell → bounded invitation → consent/participation → bounded participant context`

and independently preserve:

`PUBLIC Opportunity → public Proposal → accepted Commitment → Contribution → Artifact → Claim → Evidence`

The external synthetic PERSON must traverse the productive path without a
Cell-wide productive role assignment.

The founder must lose the derived invitation authority if its active
`CELL_MEMBER` assignment is revoked in the test fixture.

Preserve:

`TWO-ACTOR TECHNICAL REHEARSAL ≠ TWO-HUMAN HABITABILITY`

`LOCAL SYNTHETIC RESULT ≠ EXTERNAL UTILITY`

## 8. Explicit boundaries

D030 does not:

- grant `participation.invite` to `CELL_MEMBER`;
- create `CELL_INVITER` or a general Cell administrator;
- make `PROJECT_STEWARD` CELL-scoped;
- create a parallel contributor authority model;
- modify `private.b1_has_capability()`;
- make founder bootstrap authority delegable through B1 delegation;
- repair `treasury.reference` or `settlement.record`;
- resolve D029 Evidence relation/readback privacy;
- define exit-driven delegation revocation;
- change economic rights;
- change privacy, sensitivity, retention/deletion or publication semantics;
- authorize Remote Supabase writes, deployment, outreach, paid models, funds or
  chain activity.

Preserve:

`D030 INVITATION BOOTSTRAP GREEN ≠ T19 TWO-HUMAN PASS`

`D030 GREEN ≠ T12 FULL PRIVACY COMPLETE`

`D030 GREEN ≠ EXTERNAL UTILITY / ADOPTION / SCALE`
