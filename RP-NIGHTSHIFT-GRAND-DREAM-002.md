# RP-NIGHTSHIFT-GRAND-DREAM-002

Date:

`2026-09-06`

Status:

`PARTIAL / SUBSTANTIVE MULTI-AI COUNCIL RECOVERED`

Authority:

`HUMAN-AUTHORIZED PAID DELIBERATION / AI OUTPUT REMAINS INTERPRETATION`

Canonical baseline used by the recovered run:

`f500c4f5c214ba2c77d4e07f25ef512531f56241`

PR #155 observed during the run:

`OPEN / DRAFT / NON-CANONICAL / HEAD adee60b36bc11330e53a28b196135a31ff464412`

## Criterion

Run a bounded multi-model deliberation about the Grand Dream and current
strategic direction while preserving:

- Human authority;
- epistemic class boundaries;
- no canonical promotion;
- no Remote Supabase write;
- no deployment;
- a total paid-provider ceiling of `USD 5.00`.

The intended council composition was:

`Gemini/Antigravity → Kimi historian → Kimi product/community → Kimi capacity/economics → Kimi polycentric future → Claude adversarial critic → Kimi response → GPT integrator`

## Observed result

### Safety / promotion boundary

- Git working tree mutation by the nightshift: `NO`;
- Remote Supabase writes: `0`;
- deployment: `NO`;
- canonical promotion: `NO`;
- provider recalls during final recovery: `0`.

### Recovered substantive turns

- Gemini / Antigravity: `VISIBLE SUBSTANTIVE OUTPUT / RECOVERED`;
- Kimi #1: `PASS / finishReason=stop / 16,588 chars`;
- Kimi #2: `PASS / finishReason=stop / 14,178 chars`;
- Kimi #3: `PASS / finishReason=stop / 18,463 chars`;
- Kimi #4: `PASS / finishReason=stop / 18,595 chars`;
- Claude: `PARTIAL / finishReason=length / 9,761 chars`;
- Kimi #5: `PARTIAL / finishReason=length / 18,293 chars`;
- GPT final integrator: `SUBSTANTIVE PASS / finishReason=stop / 21,570 chars`.

The final harness contract still returned `FAIL` because the GPT output omitted
the exact literal footer:

`HUMAN DIRECTION = NOT CREATED`

The substantive report itself was preserved. No provider call was repeated to
repair that deterministic formatting omission.

Preserve:

`CONTENT FAILURE ≠ FORMAT CONTRACT FAILURE`

## Resource result

Human-authorized ceiling:

`USD 5.00`

Final conservative accounted total:

`USD 1.09346444`

Family accounting:

- Kimi: `USD 0.64089644`;
- Claude: `USD 0.241546`;
- GPT: `USD 0.2110220`.

The accounted total includes a conservative `USD 0.25` reserve introduced for
an earlier call whose exact cost metadata could not be reconstructed.

Therefore:

`ACCOUNTED TOTAL ≠ EXACT PROVIDER INVOICE`

and:

`USD 1.09346444 < USD 5.00 AUTHORIZED CEILING`

## Incident / repair sequence

### 002 — cost metadata surface mismatch

Observed:

- provider execution occurred;
- the raw REST surface did not expose cost metadata where the harness expected;
- the run stopped.

Falsified assumption:

`raw OpenAI-compatible response metadata = AI SDK providerMetadata contract`

Generalized learning:

Do not infer accounting shape across API surfaces. Verify the exact response
contract before a multi-call execution.

### 002B — transport success without useful attributable output

Observed:

- Kimi and Claude provider calls returned success and cost;
- visible outputs were empty;
- reasoning consumed nearly the full output budget.

Falsified assumption:

`PROVIDER SUCCESS = USEFUL OUTPUT`

Generalized learning:

When attributable content is expected, transport/provider success is not task
success. Validate the expected visible or structured output before advancing.

### 002C — generic low reasoning did not disable Kimi thinking

Observed:

- Kimi consumed `5,999 / 6,000` output tokens as reasoning;
- visible text remained empty.

Falsified assumption:

`generic reasoning=low = provider-native Kimi Instant Mode`

Generalized learning:

Provider/model-specific execution semantics must be verified rather than inferred
from generic SDK controls.

### 002D — direct output with a one-token reasoning sentinel

Observed:

- the exact preflight marker was returned;
- `finishReason=stop`;
- visible output existed;
- metadata still reported `reasoningTokens=1`.

Falsified assumption:

`successful direct-output behavior requires reported reasoningTokens exactly 0`

Generalized learning:

Validate the consequential behavior. A metric/accounting quirk is not itself a
behavioral failure.

### 002E — final council execution

Observed:

- cheap preflights passed before expensive contexts;
- Kimi direct-output mode produced substantive visible turns;
- Claude and GPT direct-output preflights passed;
- the multi-AI deliberation was recovered;
- final exact-format validation failed only on one missing literal footer.

Generalized learning:

`configuration uncertainty → smallest cheap probe → full-context call only after PASS`

and:

`SUBSTANTIVE OUTPUT ≠ FORMAT CONTRACT`

Prefer deterministic formatting repair where no semantic inference is required.

## Council interpretation — not Human Direction

The council converged partially on a question rather than a legitimate decision:

> What consequential property of Célula Zero survives comparison with the
> simplest ordinary alternative?

Important disagreements remained:

- research laboratory versus usable product was disputed as a false or incomplete
  dichotomy;
- present founder authority was distinguished from permanent architectural
  sovereignty, but future transfer remains unproven;
- Capacity First was preserved as a hypothesis while material unblocking remains
  empirically unproven;
- the Protocol of Protocols remained a horizon, not a present implementation
  requirement;
- the necessity of CZ's combined provenance/authority machinery over ordinary
  tools remains untested.

No model consensus creates legitimacy.

## Durable local evidence anchors

Recovered ZIP SHA-256:

`58fae6c12cc4c415c471ec380d36644388779de610560c8caeacebb005e46068`

Recovered final raw report / TURN-7 SHA-256:

`3f6e0ae6540f3cbb9c7c6724e0e3a3627f21efc13bb46c92e6743a7a6d0301df`

Recovered transcript SHA-256:

`3fdfa4f9226ed6d2d6f6ee29234565c38e511031bf3d6c89e6d64a5cff9ff478`

The raw recovered bundle is intentionally not proposed for canonical promotion.
The hashes preserve a reference to the local Original Records without making a
large transient execution bundle part of the public operational repository.

## Result classification

`MULTI-AI SUBSTANTIVE DELIBERATION = OBSERVED`

`EXACT FINAL FORMAT CONTRACT = FAIL`

`OVERALL NIGHTSHIFT RESULT = PARTIAL`

`OPERATIONAL LEARNING = OBSERVED / REQUIRES DURABLE PROMOTION`

`EXTERNAL UTILITY = NOT TESTED BY THIS NIGHTSHIFT`

`ADOPTION / PMF / SCALE = NOT DEMONSTRATED`
