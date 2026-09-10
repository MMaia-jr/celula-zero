# D029 — Preserve Evidence audience across derived relations and projections

Class:

`DECISION / HUMAN DIRECTION`

Authority:

`HUMAN / MARCOS`

Date:

`2026-09-10`

## 1. Human Original Record

> Adoto D029 conforme a regra acima e autorizo o pipeline condicionado completo:
> verificar localmente a write-path reachability; somente se confirmada, registrar
> D029, implementar e validar a menor correção de Evidence em
> `verification_evidence_items` + integrated episode readback; se focused/full
> tests e review passarem sem scope drift, promover com commit/push/PR/CI/merge e
> reconciliar `STATE.md`, com STOP em qualquer falha ou nova decisão normativa,
> sem Supabase remoto, deploy, outreach, fundos, chain ou paid models.

The adopted rule immediately above that Original Record was:

> Uma relação ou projeção derivada não pode revelar o identificador ou a
> associação de um Evidence que o caller não possa ler diretamente. Para este
> slice, nem `verification_evidence_items` nem o integrated episode readback
> podem ampliar a audiência do Evidence; visibilidade de Claim ou Verification
> não implica visibilidade do Evidence relacionado.

Preserve:

`ORIGINAL RECORD ≠ INTERPRETATION ≠ IMPLEMENTATION ≠ VERIFICATION`

## 2. Execution-confirmed reachability

The later PRE-T19 combined canonical-path observation reached the previously
missing write precondition through explicit existing authority composition:

`PROJECT_STEWARD delegation.manage`
`→ participant delegation.manage`
`→ participant-held evidence.register`
`→ founder evidence.register`
`→ founder-custodied PRIVATE Evidence`
`→ Verification referencing that Evidence`

Observed from the Claim-author / external-participant profile:

`Evidence direct READ = DENY`

`evidence_links direct READ = DENY`

`Verification direct READ = ALLOW`

`verification_evidence_items READ = ALLOW`

Therefore:

`D029 RELATION PROPERTY LOSS = CONFIRMED / CANONICAL WRITE PATH REACHABLE`

The same observation produced:

`integrated episode getter = DENY / 42501 / CZ403:METABOLISM_EPISODE_READ_DENIED`

Therefore the integrated getter already preserved the D029 rule on the tested
external-participant path.

Preserve:

`RELATION LEAK ≠ GETTER LEAK`

`WRITE-PATH REACHABILITY ≠ EXTERNAL UTILITY`

## 3. Smallest implementation selected

For this slice, change only the read policy of:

`public.verification_evidence_items`

A relation row is readable only when both referenced materials are directly
readable under their existing RLS:

`READABLE VERIFICATION ∧ READABLE EVIDENCE → RELATION READ`

If either material is not directly readable:

`RELATION READ = DENY`

The policy composes the existing `verifications` and `evidence_items` RLS rather
than re-encoding their authority formulas.

No integrated episode getter change is required by this execution result.

## 4. Boundaries

Preserve:

`READABLE VERIFICATION ≠ READABLE EVIDENCE`

`READABLE CLAIM ≠ READABLE EVIDENCE`

`RELATION / PROJECTION ≠ NEW READ AUTHORITY`

`EVIDENCE RLS ≠ VERIFICATION RLS`

`D029 RELATION GREEN ≠ T12 FULL PRIVACY COMPLETE`

D029 does not define:

- retention/deletion;
- sensitivity semantics;
- publication;
- AI-provider disclosure;
- cross-Cell disclosure;
- never-public / never-chain classes;
- new Evidence ontology;
- new ACL or membership model.

## 5. Current joint execution/promotion authorization

Human authorization on 2026-09-10:

> Autorizo implementar e validar localmente D029 + D031 conforme as regras
> adotadas e, se focused/full tests e review passarem sem scope drift, promover
> com commit, push, PR, CI e merge e reconciliar STATE.md; STOP em qualquer nova
> decisão normativa, sem Supabase remoto, deploy, outreach, fundos, chain ou
> paid models.

This authority is bounded to the D029 + D031 pipeline and is consumed by its
completion or STOP.
