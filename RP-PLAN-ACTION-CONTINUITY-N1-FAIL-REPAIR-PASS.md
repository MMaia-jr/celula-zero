# RP-PLAN-ACTION-CONTINUITY-N1-FAIL-REPAIR-PASS

Class:

`RESULT PACKAGE / INTERNAL CONTINUITY EXPERIMENT / PREPARED FOR CANONICAL REVIEW`

Canonical base under test:

`4edfff98e16d2ed53e7239b09376f934236a7f8c`

Date:

`2026-09-06`

## Question tested

Can a genuinely fresh AI, given only the canonical entry surface, reconstruct the
current state and identify the correct transition from adopted plan to current
action without requiring Marcos to reconstruct the history?

Property under test:

`canonical state → fresh reconstruction → correct current action`

This is an internal continuity/readiness property.

Preserve:

`internal continuity PASS ≠ external utility ≠ adoption ≠ PMF ≠ scale`

## First run — canonical STATE

Provider route:

`Vercel AI Gateway`

Model:

`moonshotai/kimi-k2.6`

Input surface:

- `README.md`;
- `STATE.md`;
- `PROTOCOL.md`;
- `CONTRIBUTING.md`;

all captured from canonical main:

`4edfff98e16d2ed53e7239b09376f934236a7f8c`

Isolation:

`PRIOR_CHAT_CONTEXT = NO`

`EXPECTED_ANSWER_EMBEDDED = NO`

Observed execution:

`MODEL_CALLS = 1`

`OBSERVED_ACCOUNT_DELTA_USD = 0.02667395`

`FINISH_REASON = stop`

`GIT_PROMOTION = NO`

`REMOTE_SUPABASE = NO`

`DOING = NO`

### First-run result

The fresh model correctly reconstructed substantial canonical state, including:

- D018 Dream adoption;
- D019 Goal/Objectives adoption;
- D020 Karabirrdt adoption;
- the adopted Karabirrdt map;
- `PLANNING = CANONICALLY RECONCILED`;
- `DOING = NOT AUTHORIZED`;
- Human Authority boundaries.

However, when asked for the next legitimate action, it selected:

`HUMAN REVIEW / AUTHORIZE FIRST BOUNDED DOING`

and treated D016's:

`CLEAN HABITABLE INTERNAL N=1 → SIMPLE BASELINE N=1`

as the current immediate criterion.

It did not identify the pre-G1 action surface:

`K3 → K4`

as the current next operational continuity.

Human/assistant adjudication of the tested property:

`PLAN → ACTION CONTINUITY = FAIL N=1`

Preserve:

`high-fidelity historical reconstruction ≠ correct current action`

## Observed documentary conflict

The canonical `STATE.md` simultaneously contained:

- a newer D020 section stating that D020 refines current sequencing and that
  internal N=1/baseline are supporting readiness/calibration rather than absolute
  blockers; and
- a later section titled `## Current next gate` presenting D016 and
  `CLEAN HABITABLE INTERNAL N=1 → SIMPLE BASELINE N=1` as current.

Observed falsified assumption:

`adding a newer current section is sufficient even if older CURRENT markers remain`

Generalized learning:

`one operational STATE should expose one unambiguous immediate sequencing surface`

This does not require new memory infrastructure.

Classification:

`MAP / SMALL EXTEND OF EXISTING DOCUMENTATION`

Not justified by this result:

- RAG;
- vector database;
- graph database;
- generic orchestrator;
- new memory platform;
- MCP/A2A layer.

## Candidate repair 001

A local, non-canonical candidate repair was prepared without repository writes.

It:

1. updated the reconciliation date to `2026-09-06`;
2. made the pre-G1 action surface explicit:
   `K3 SELECT REAL OPPORTUNITY → K4 MAP / ADAPT EXISTING EXTERNAL-RUN CAPABILITY`;
3. preserved `G1` as the Human Gate before `K5`;
4. reclassified the stale D016 `Current next gate` section as historical/preserved
   and refined by D020;
5. reclassified clean-internal/baseline tasks as supporting readiness/calibration
   when material.

No new Human Direction was created.

`D016 = PRESERVED`

`D020 = GOVERNS CURRENT SEQUENCING`

## Fresh retest — candidate STATE

The retest used:

- the same canonical base `4edfff98e16d2ed53e7239b09376f934236a7f8c`;
- canonical README/PROTOCOL/CONTRIBUTING;
- candidate non-canonical STATE;
- a fresh stateless Kimi K2.6 request.

Isolation:

`PRIOR_CHAT_CONTEXT = NO`

`PRIOR_KIMI_RESPONSE = NO`

`EXPECTED_ANSWER_EMBEDDED = NO`

Observed execution:

`MODEL_CALLS = 1`

`OBSERVED_ACCOUNT_DELTA_USD = 0.0241016`

`FINISH_REASON = stop`

`REPO_WRITE = NO`

`GIT_PROMOTION = NO`

`REMOTE_SUPABASE = NO`

`DOING = NO`

### Retest result

The fresh model now identified:

`K3 SELECT REAL OPPORTUNITY → K4 MAP / ADAPT EXISTING EXTERNAL-RUN CAPABILITY`

as the next legitimate action and correctly placed:

`G1 / HUMAN REVIEW / AUTHORIZE FIRST BOUNDED DOING`

before K5.

It did not regress to D016 as the current immediate next gate.

Adjudication of the primary tested property:

`PLAN → ACTION CONTINUITY REPAIR = PASS N=1`

Preserve:

`repair PASS N=1 ≠ general cross-model continuity ≠ permanent robustness`

## Residual ambiguity found by retest

The retest still identified two CURRENT-like surfaces that can obscure precedence:

1. `## Current Human Direction — Future Readiness` appears as if it alone governs
   immediate sequencing, even though D020 is the newer decision for immediate
   sequencing.
2. `## Current Dream / next gate` still labels `DREAM30D = ACTIVE / DOING / OPEN`,
   while the D020 section says `DOING = NOT AUTHORIZED` for the current Karabirrdt
   path.

Interpretation:

- Future Readiness remains the umbrella Human Direction.
- D020 governs current immediate sequencing.
- Dream30D remains preserved/open history or track state where applicable, but
  its `DOING / OPEN` status does not authorize K5 or override D020.
- `track-local/open status ≠ current global execution authority`.

Other retest questions about files not included in the four-file bootstrap
(`WP-HA-001`, detailed G1 criteria, PR #155 detail, T### contract) are not, by
themselves, failures of this continuity property. A fresh agent may follow
canonical references when the next task requires those details.

## Final minimal reconciliation candidate

The final local candidate therefore adds only two extra clarifications beyond
repair 001:

- Future Readiness is labeled `umbrella Human Direction`; D020 governs immediate
  sequencing.
- Dream30D is labeled as a preserved open track, not the current immediate
  sequencing surface, and its local `DOING / OPEN` status is explicitly separated
  from D020/K5 authorization.

No paid retest is justified for these wording-only precedence clarifications
unless Human Review identifies a new uncertainty.

## Resource result

First run:

`USD 0.02667395`

Retest:

`USD 0.0241016`

Observed combined account delta:

`USD 0.05077555`

This is an observed AI Gateway account-delta measure, not a provider invoice
claim.

## Result classification

First canonical-state test:

`FAIL N=1`

Candidate repair retest:

`PASS N=1`

Residual state clarity:

`PARTIAL → FINAL WORDING RECONCILIATION PREPARED`

New infrastructure justified:

`NO`

New Human Direction required:

`NO`

Canonical promotion:

`NOT AUTHORIZED BY THIS RESULT PACKAGE`

Next gate:

`HUMAN REVIEW OF FINAL TWO-FILE DIFF → EXPLICIT PROMOTION AUTHORITY IF ACCEPTED`
