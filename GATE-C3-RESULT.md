# GATE-C3-RESULT — REAL-EPISODE BACKMAPPING

Class: `RESULT PACKAGE / G-C3`
Date: 2026-08-24
Input gate: `GATE-C2-RESULT.md`
Canonical base reviewed: `d81154087d5f0598769808fdc2551723bf9b1736`

## Result

`G-C3 — REAL-EPISODE BACKMAPPING / COMPLETE`

`RESULT: PASS WITH HISTORICAL LOSS`

`REAL EPISODES: N=2`

`FIT: 0`

`FIT WITH LOSS: 2`

`FAIL: 0`

`FIFTH CLASS JUSTIFIED: NO`

`CZ SEMANTIC MINIMUM: 4 CLASSES RETAINED / NOT IMPLEMENTED`

`IMPLEMENTATION AUTHORITY: NO`

The four-class profile survives contact with two already-observed episodes, but
the historical records do not preserve every distinction with full fidelity.
Those losses are recorded rather than repaired retrospectively.

This gate does not modify the evidence status of either episode.

## Rule used

G-C3 does not ask whether a plausible story can be told after the fact.

It asks:

> Can the already-existing records be mapped to the minimized profile without
> inventing events, silently merging distinct concepts, or claiming access to
> records that are not available?

Allowed results per episode:

- `FIT`
- `FIT WITH LOSS`
- `FAIL`

A historical loss is not automatically a failure of the semantic profile. It may
instead demonstrate why a retained distinction should be captured explicitly in
future episodes.

## Profile under test

Only four CZ-specific classes remain candidates:

```text
cz:Need
cz:Claim
cz:Verification
cz:Decision
```

Everything else must remain an adopted/mapped standard concept, contextual role,
profile pattern, value, or derived view unless a concrete lost property forces an
extension.

---

# Episode 1 — OPERATING-LOOP-MVP

## Canonical/public evidence used

Primary references:

- `MMaia-jr/celula-zero#70`
  - defines the intended real internal vertical slice;
  - requires Proposal, explicit acceptance/Commitment, Contribution, Artifact,
    Claim/Evidence, Verification and reconstructible trajectory.
- `MMaia-jr/celula-zero#71`
  - merged;
  - merge commit `7619e52841593b366a3fb166b3b417456b1f2f3e`;
  - records a real internal end-to-end dogfood through
    `VERIFICATION_ISSUED: PASS`;
  - preserves explicit human acceptance and the distinctions
    `Contribution ≠ Evidence`, `Evidence ≠ Verification`,
    `Verification ≠ Outcome`.
- canonical `STATE.md`
  - classifies the episode as
    `OPERATING-LOOP-MVP / CANONICAL / PASS N=1 INTERNAL`.

No external utility is inferred from this episode.

## Backmapping

| Historical record/property | G-C3 mapping | Status |
|---|---|---|
| project/opportunity context | `prov:Bundle` / native context | `FIT` |
| Opportunity | ActivityStreams Offer/profile pattern | `FIT` |
| attributed Proposal | ActivityStreams Offer + Plan/profile pattern | `FIT` |
| explicit human acceptance | ActivityStreams Accept / Commitment pattern | `FIT` |
| steward authority/control | PROV association/role + native authorization evidence | `FIT` |
| Contribution | contextual Claim over work/activity when needed | `FIT` |
| Artifact | `prov:Entity` | `FIT` |
| Claim | `cz:Claim` | `FIT` |
| source used as Evidence | PROV qualified Usage/role | `FIT` |
| Verification request/activity/result | review Activity + `cz:Verification` | `FIT` |
| verification classification | bounded value `PASS/FAIL/PARTIAL/INCONCLUSIVE` | `FIT` |
| authorized state-changing choices | decision/acceptance activity; `cz:Decision` where independently required | `FIT` |
| Outcome | deliberately absent; Verification did not create Outcome | `FIT` |
| Need distinct from Opportunity | no independent historical Need object demonstrated | `LOSS` |

## Historical loss

The canonical Operating Loop begins at:

```text
Opportunity
→ Proposal
→ Commitment
→ Contribution
→ Artifact
→ Claim/Evidence
→ Verification
```

The real motivation/problem is carried by project/opportunity context, but the
historical episode does not demonstrate an independently identifiable Need
record with its own attribution/version boundary.

Creating one retrospectively from the Opportunity statement would be a new
interpretation. G-C3 does not count that as evidence that the original episode
preserved:

```text
Need ≠ Opportunity
```

This is therefore a real historical information-model loss.

It is also evidence **for retaining `cz:Need`** in the candidate minimum: the
absence of the distinction in an actual episode makes the reason for the class
concrete.

## Episode 1 classification

`OPERATING-LOOP-MVP: FIT WITH LOSS`

Lost property:

`independently reconstructible Need ≠ Opportunity`

No fifth class is justified.

---

# Episode 2 — EDGELOOM EXTERNAL UTILITY N=1

## Canonical/public evidence used

Primary references:

- `edgeloom-oss/edgeloom#31`
  - explicitly requests an outside security review;
  - Question 3 asks whether the patch path can escape the intended driver
    directory.
- maintainer comment `edgeloom-oss/edgeloom#31#issuecomment-5395953510`
  - attributes the report to Marcos Maia Jr.;
  - states that the issue reproduces;
  - records two reproducing variants;
  - states that the finding was under-reported rather than over-reported;
  - records that private vulnerability reporting was unexpectedly disabled and
    was then enabled;
  - identifies the fix as PR #39 / commit `dfdeb44`.
- `edgeloom-oss/edgeloom#39`
  - merged;
  - independently documents reproduction, remediation and tests;
  - merge commit `dfdeb44e5ede43319e968e5098bebd11db3bbe5b`.
- canonical Célula Zero `STATE.md`
  - records
    `EXTERNAL UTILITY: OBSERVED N=1 IN BOUNDED EDGELOOM REVIEW TRACK`;
  - records finding validation and observed remediation.

The separate EdgeLoom Question 2 package-level test remains a different bounded
result and is not used to inflate this N=1 external-utility classification.

## Backmapping

| Historical record/property | G-C3 mapping | Status |
|---|---|---|
| outside-review request / security question | `cz:Need` derived from explicit public request | `FIT` |
| Issue #31 as participation surface | ActivityStreams Offer/opportunity profile | `FIT` |
| outside security work | `prov:Activity` attributed to reporter | `FIT` |
| reported vulnerability statement | `cz:Claim` | `FIT WITH SOURCE BOUNDARY` |
| reproduction inputs/results | source entities used with evidence role | `FIT` |
| maintainer reproduction/evaluation | review Activity + `cz:Verification` | `FIT` |
| maintainer conclusion that issue reproduces | bounded verification result / findings | `FIT` |
| merge/fix authorization | authorized project decision activity + `cz:Decision` when projected | `FIT` |
| PR #39 fix | work Activity + generated code/artifacts | `FIT` |
| remediation observed | `cz:Claim kind=outcome` grounded in merged fix/public project state | `FIT` |
| public maintainer response | derived/public social projection with provenance | `FIT` |
| exact Original Record of private disclosure | not publicly/canonically available for inspection | `LOSS` |

## Historical loss

The public records prove that a private report occurred, who made it, what the
maintainer understood, that reproduction succeeded, and what remediation was
merged.

They do **not** expose the exact private Original Record of the disclosure.

G-C3 must therefore not reconstruct its exact wording, exact evidence bundle, or
exact private chronology from the maintainer's public summary.

This preserves the invariant:

```text
Original Record ≠ Interpretation ≠ Claim ≠ Evidence ≠ Verification
```

The loss is one of public/canonical reconstructibility, not a reason to make
private security reports public.

The minimized profile already has a way to preserve this boundary through PROV
and private/public projection policy. No fifth CZ class is required.

## Episode 2 classification

`EDGELOOM EXTERNAL UTILITY N=1: FIT WITH LOSS`

Lost property:

`exact private Original Record / full private claim-evidence lineage is not
available in the public canonical record`

No fifth class is justified.

---

# Cross-episode result

## What survived

Across one internal operational episode and one externally useful episode, the
following distinctions remain representable with the four classes plus mapped
standards/profile patterns:

```text
Need ≠ Opportunity
Proposal ≠ Commitment
Activity ≠ Contribution
source ≠ evidence
Claim ≠ source
Evidence ≠ Verification
Verification ≠ Decision
Decision ≠ Outcome
private/source record ≠ public social projection
provenance ≠ truth
visibility ≠ reputation
```

## What the real episodes added

The synthetic cases in G-C2 showed that the model can be represented.

The real episodes add two concrete lessons:

1. **Need deserves an explicit boundary.**
   The internal Operating Loop's historical records do not independently
   preserve Need before Opportunity.

2. **Private Original Records must be allowed to remain private while their
   existence and downstream verification/remediation remain reconstructible.**
   EdgeLoom demonstrates why Social Projection must be derived rather than a
   mirror of source records.

Neither lesson requires a fifth CZ semantic class.

## Fifth-class falsification after real episodes

Candidates reconsidered under real evidence:

| Candidate | Real-episode pressure | New class required? |
|---|---|---:|
| Opportunity | exists historically; maps as profile pattern | no |
| Proposal | exists historically; maps as Offer/Plan pattern | no |
| Commitment | explicit acceptance pattern is sufficient | no |
| Contribution | contextual classification over Activity/Artifact | no |
| Evidence | contextual role/source relationship | no |
| Original Record | generic entity/provenance + privacy boundary | no |
| Interpretation | Activity/generated Entity pattern | no |
| Outcome | contextual Claim | no |
| Authority | association/role/governance basis | no |
| Social Projection | derived view + provenance | no |
| Contextual Trust | contextual Claim/Judgment | no |

`FIFTH CLASS JUSTIFIED: NO`

## Gate interpretation

The current four-class profile is not proven universal.

What is now supported is narrower:

```text
G-C1:
standards mapping + semantic minimization

G-C2:
N=2 synthetic reference cases representable

G-C3:
N=2 observed episodes backmappable with explicit historical losses
```

This is enough to bound the architecture investigation for now.

## Track B evidence boundary

Continuing to invent additional architecture without new field pressure would
risk turning a bounded semantic finding into premature technology.

Therefore G-C3 does **not** create an automatic G-C4.

Track B moves to:

`PROFILE CANDIDATE BOUNDED / HOLD FOR FIELD PRESSURE`

Resume Track B only when one of these triggers occurs:

1. a real episode cannot preserve a required property with the four-class
   profile + mapped standards;
2. Track A reaches a point where capturing one of these distinctions materially
   changes participant experience, safety, privacy or a real decision;
3. two independent systems must exchange the profile and a concrete
   interoperability property is lost;
4. implementation is separately authorized because a real requirement cannot be
   met by existing process/infrastructure.

## Track A remains independent and current

This gate does not advance or alter:

`G1 — EXTERNAL ENTRY + VOLUNTARY ACTION / CURRENT TRACK A`

It does not turn EdgeLoom into HABITABLE-ALPHA and does not infer recurrence,
community, adoption, PMF or scale.

## Gate closure

`G-C3 — COMPLETE / PASS WITH HISTORICAL LOSS`

`REAL-EPISODE BACKMAPPING — N=2 / FIT WITH LOSS N=2`

`FIFTH CLASS JUSTIFIED — NO`

`CZ SEMANTIC MINIMUM — 4 CLASSES / RETAINED / NOT IMPLEMENTED`

`TRACK B — PROFILE CANDIDATE BOUNDED / HOLD FOR FIELD PRESSURE`

`TRACK A — G1 EXTERNAL ENTRY + VOLUNTARY ACTION / CURRENT`

`IMPLEMENTATION AUTHORITY — NO`
