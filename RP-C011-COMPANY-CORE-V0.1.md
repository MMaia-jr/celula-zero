# RP-C011 — COMPANY CORE v0.1

Class: `RESULT PACKAGE`

Result: `PASS`

Authority: observed local execution + explicit Human Evaluation.

## Execution history

A first coding-agent tranche produced the Company Core v0.1 implementation and
then the outer executor stopped on its accounting gate.

Observed coding-agent Vercel Gateway account debit:

`USD 1.92684033`

That stop occurred after implementation production and before outer validation,
dogfood, Human Evaluation or Git promotion.

This continuation did **not** invoke the coding agent again.

The first paid Company Core dogfood inference reached Kimi but its response was
not preserved because the local helper called `anc001_complete_ai_run` without
the required `p_content_class`. That output was not recoverable.

A second paid Kimi inference was performed only after explicit Human
authorization. That second inference completed and is the AI contribution
evaluated below.

The successful AI Run was initially persisted by the dogfood helper with
`cost_source=CALCULATED`. Because Company Core v0.1 does not treat locally
estimated model pricing as provider-reported cost, the local material record was
reconciled to `cost_source=UNKNOWN / cost_usd=NULL` before Human Evaluation.
The pre-repair value is preserved in the local recovery artifact; the observed
Vercel account debit remains a separate account-level economic observation.

## Resume corrections

Deterministically repaired before validation:

- restored the Human-approved Plan/Do sections in `STATE.md`;
- preserved provider/gateway cost as reported when present, otherwise
  `UNKNOWN` instead of fabricating heuristic cost;
- aligned ANC-001 RPC arguments with its canonical contract;
- established explicit DDR AI participation before ANC preparation;
- used `moonshotai/kimi-k2.6` as Vercel Gateway model identifier;
- removed JSON-unsafe JavaScript BigInt RPC values;
- corrected helper Actor selection needed for kind inspection;
- mapped Company Core Need creation to canonical `t1_create_need`;
- removed automatic `human_direction=true` claims from human-authored event
  metadata.

## Validation actually executed

- Node 24 / npm 11+ preflight: PASS
- `git diff --check`: PASS
- bounded scope + secret sanity: PASS
- local Supabase reset: PASS
- full pgTAP: PASS
- `npm run check`: PASS
- authenticated E2E including `COMPANY CORE V0.1`: PASS
- live internal Célula Zero dogfood: EXECUTED
- live runtime: `Vercel AI Gateway → moonshotai/kimi-k2.6`

## Real internal dogfood

DOGFOOD_REF=UNKNOWN
NEED_ID=UNKNOWN
PROJECT_ID=UNKNOWN
CYCLE_ID=6197ba54-325b-447a-90a3-5ac6936a51c0
DRAGON_CYCLE_ID=a98d7c87-fb39-4d15-80db-47592f10fded
AI_RUN_ID=fa78ac38-89ee-490f-8917-4552750923ed
RESULT_ID=UNKNOWN
UI_PATH=/company-core/6197ba54-325b-447a-90a3-5ac6936a51c0
USAGE={"completion_tokens": 2375, "prompt_tokens": 577, "total_tokens": 2952}
AI_RUN_REPORTED_COST=UNKNOWN
AI_RUN_COST_SOURCE=UNKNOWN

Gateway account debit observed around the successful, explicitly authorized second dogfood inference:

`USD 0.00959232`

The first dogfood inference's debit remains UNKNOWN. This account-level debit is separate from provider-reported per-run cost; the successful AI Run's per-run cost remains UNKNOWN / NULL.

## Human Evaluation

`USEFUL`

Accepted AI contribution as Result:

`YES`

Rationale:

Useful because it converted the current Company Core capability into a concrete, falsifiable external test. I do not accept the claim that one pre-sale would validate PMF, and I will reduce the proposed outreach scope before treating it as Human Direction.

Decision enabled:

`YES`

Human Direction / decision:

Do not launch a broad pre-sale offensive yet. First define one concrete external user problem and one plausible user profile, then run the smallest real external utility test with 3-5 conversations or demonstrations. A paid pilot may follow if real benefit is observed. One pre-sale or pilot does not establish PMF, adoption or scale.

Founder minutes:

`UNKNOWN`

Observed consequence:

- type: `DECISION_ENABLED`
- description: Company Core v0.1 completed a real internal Need → Agreement → AI Contribution → Result → Human Evaluation path and enabled the decision to move next toward a smaller external utility test rather than more internal architecture.

## Classification boundary

This result may establish only bounded **internal** Company Core operating
utility for Célula Zero itself.

It does not establish:

- external utility;
- customer demand;
- willingness to pay;
- revenue;
- recurrence;
- PMF;
- adoption;
- scale.

Preserve:

`AI output ≠ Human Direction`

`Result ≠ Evidence automatically`

`Evaluation ≠ Reputation`

`internal N=1 ≠ external utility ≠ PMF ≠ adoption ≠ scale`
