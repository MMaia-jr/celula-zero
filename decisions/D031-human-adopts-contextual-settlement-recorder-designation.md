# D031 — Explicit contextual settlement-recorder designation

Class:

`DECISION / HUMAN DIRECTION`

Authority:

`HUMAN / MARCOS`

Date:

`2026-09-10`

## 1. Human Original Record

> Settlement recording é autoridade contextual própria. Não decorre de
> participação, membership, autoria, benefício econômico nem da simples
> existência de um Project. Para o primeiro episódio habitável, a pessoa
> responsável pelo Project deve poder designar explicitamente um PERSON como
> settlement recorder para aquele Project, sem que isso conceda autoridade para
> criar a EconomicInstruction ou decidir a Reconciliation.

Preserve:

`ORIGINAL RECORD ≠ INTERPRETATION ≠ IMPLEMENTATION ≠ VERIFICATION`

## 2. Execution-confirmed property loss

The PRE-T19 combined canonical-path observation reached:

`Verification → Domain Decision → EconomicInstruction = PASS`

It then observed:

`SettlementAttempt = DENY / 42501 / CZ403:CAPABILITY_DENIED`

Capability snapshot:

`founder settlement.record = false`

`participant settlement.record = false`

`reviewer settlement.record = false`

Therefore:

`T17 SETTLEMENT-RECORD AUTHORITY PROPERTY LOSS = CONFIRMED`

No payment rail or real funds were involved.

## 3. First-slice semantic boundary

Settlement recording is a separate contextual authority:

`ECONOMIC INSTRUCTION ≠ SETTLEMENT RECORDING ≠ RECONCILIATION`

It is not inferred from:

`PARTICIPATION`

`MEMBERSHIP`

`AUTHORSHIP`

`BENEFICIARY STATUS`

`PROJECT EXISTENCE`

For the first habitable episode, the responsible PERSON for the Project may
explicitly designate a PERSON to record provider-neutral settlement attempts and
receipts for that exact Project.

Designation does not grant:

`economic.instruct`

`settlement.reconcile`

`delegation.manage`

Cell membership or Project stewardship.

## 4. Smallest implementation interpretation

Reuse the canonical role/capability system.

Materialize only when a designation is made:

`SETTLEMENT_RECORDER`

with exactly:

`settlement.record`

The assignment is:

`scope_type = PROJECT`

`scope_id = exact Project`

`policy_version_id = current Cell policy`

For this first slice, "responsible PERSON for the Project" maps to the current
`projects.steward_actor_id`, controlled by the authenticated profile and still
recognized by the canonical `can_manage_project()` path.

Preserve:

`DESIGNATION OF CONTEXTUAL RESPONSIBILITY ≠ DELEGATION OF HELD AUTHORITY`

This distinction is necessary because canonical B1 delegation correctly refuses
to delegate a capability the delegator does not hold.

The designation command may create no Cell-scoped assignment.

Revocation must remove effective `settlement.record` authority for that exact
Project.

## 5. Required proof

The regression must show:

- pre-designation recorder:
  `settlement.record = NO`;
- explicit designation by responsible Project PERSON:
  `PASS`;
- designated Actor kind:
  `PERSON`;
- assignment:
  `PROJECT-scoped / exact Project`;
- Cell membership created:
  `NO`;
- designated recorder:
  `settlement.record = YES`;
- designated recorder:
  `economic.instruct = NO`;
- designated recorder:
  `settlement.reconcile = NO`;
- designated recorder:
  `delegation.manage = NO`;
- SettlementAttempt:
  `PASS`;
- SettlementReceipt:
  `PASS`;
- Reconciliation by Project steward:
  `PASS`;
- Reconciliation by recorder:
  `DENY`;
- revocation:
  `PASS`;
- post-revocation settlement.record:
  `NO`.

Preserve:

`PROVIDER-NEUTRAL RECORD CHAIN PASS ≠ REAL PAYMENT`

`SYNTHETIC PERSON ≠ REAL HUMAN EVIDENCE`

`D031 GREEN ≠ T19 PASS`

## 6. Explicit non-scope

D031 does not:

- execute money movement;
- integrate a payment provider;
- create treasury authority;
- grant economic rights;
- choose pricing;
- require a single recorder per Project;
- grant Cell membership;
- grant Project stewardship;
- infer recorder authority from beneficiary status;
- modify `private.b1_has_capability()`;
- alter the meaning of `economic.instruct` or `settlement.reconcile`.

## 7. Current joint execution/promotion authorization

Human authorization on 2026-09-10:

> Autorizo implementar e validar localmente D029 + D031 conforme as regras
> adotadas e, se focused/full tests e review passarem sem scope drift, promover
> com commit, push, PR, CI e merge e reconciliar STATE.md; STOP em qualquer nova
> decisão normativa, sem Supabase remoto, deploy, outreach, fundos, chain ou
> paid models.

This authority is bounded to the D029 + D031 pipeline and is consumed by its
completion or STOP.
