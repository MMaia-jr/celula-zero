# RP-K3-DUALITE-PAID-CALL-FAIL-CLOSED-001

Class:

`RESULT PACKAGE / MATERIAL EXECUTION INCIDENT / PREPARED FOR HUMAN REVIEW`

Canonical base at preparation time:

`03dbacdb13b32e6160f57c913a308768e597e8a1`

Date:

`2026-09-06`

Canonical authority:

`NO — PREPARED / NOT COMMITTED / NOT PUSHED / NOT MERGED`

## Human Original Record

Marcos:

> eu nao quero que isto se repita, precisamos aprender com os proprios erros, isto custou caro

Follow-up:

> ok

Interpretation boundary:

This Result Package records the incident and proposes the smallest durable learning.
It does not treat the short follow-up as authorization for paid retry, outreach,
commit, push, PR or merge.

## Incident

Target:

`K3 / DUALITE PROBLEM UNDERSTANDING CIRCLE 001`

Execution class:

`LOCAL / PAID PROVIDER / NON-CANONICAL`

Model:

`moonshotai/kimi-k2.6`

Observed provider calls:

`12`

Observed provider-reported spend:

`USD 0.11535593`

Authorized hard ceiling:

`USD 2.00`

Soft operating target:

`USD 0.50`

Boundaries observed:

- outreach: `NO`;
- Git writes: `NO`;
- Remote Supabase writes: `NO`;
- security testing: `NO`;
- implementation: `NO`;
- Human Direction created by AI: `NO`.

## Transport evidence

All 12 raw provider envelopes show the same material pattern:

- `finish_reason = length`;
- `completion_tokens = 1800`;
- `completion_tokens_details.reasoning_tokens = 1799`;
- visible `message.content = ""`.

First call exact observed transport/accounting facts:

- provider response id:
  `gen_01M1WGC0QFH5V1YVQW2QADADMM`;
- prompt tokens: `2612`;
- completion tokens: `1800`;
- reasoning tokens: `1799`;
- provider-reported cost: `USD 0.0096814`;
- finish reason: `length`;
- expected visible content: empty.

Observed downstream result:

- structured cards accepted: `0 / 11`;
- question queue count: `0`;
- AI→AI routed questions: `0`;
- final `DUALITE-BRAZIL-PROBLEM-MAP.md`: `0 bytes`.

Preserve:

`provider returned ≠ role completed`

`paid execution occurred ≠ valid multi-AI circle occurred`

`reasoning existed ≠ contractual role output existed`

## Material failure

The critical failure was not merely that the first model call exhausted its
output envelope.

The orchestrator had enough evidence after call 1 to know that the expected role
contract had not been produced, but it admitted calls 2–12 anyway.

Observed invalid transition:

`provider response → no accepted role output → next paid call admitted`

The phase hard budget prevented an absolute overspend but did not prevent
continued spending after the semantic dependency had failed.

Preserve:

`budget remaining ≠ next paid call justified`

## Falsified assumptions

1. A successful provider/HTTP response is sufficient to advance the workflow.
2. Remaining phase budget is sufficient justification for the next paid call.
3. A small output envelope can be treated as the desired visible-answer size for
   a reasoning model.
4. A parse/contract failure may safely degrade into empty Shared Context.
5. A multi-call plan may fan out before the provider/model/configuration contract
   has passed one representative call.

## Generalized rule candidate — PAID-CALL FAIL-CLOSED

When a later paid call depends on the result of an earlier paid call, the later
call is not admitted until the predecessor result is explicitly accepted.

Minimum acceptance when attributable output is expected:

1. raw provider envelope captured;
2. accounting captured;
3. finish state accepted for the task;
4. required visible/structured content is present;
5. response contract validates when applicable.

Failure of any required property:

`STOP`

and therefore:

- no automatic next paid call;
- no fan-out;
- no automatic retry merely because budget remains;
- no invalid output admitted to Shared Context;
- no downstream synthesis that depends on missing contributions.

Preserve:

`PROVIDER_SUCCESS ≠ CONTRACT_SUCCESS`

`CONTRACT_FAILURE → STOP BEFORE NEXT PAID DEPENDENT CALL`

## Probe-before-fan-out rule candidate

When provider/model/configuration/response-contract behavior is new or materially
changed:

`ONE REPRESENTATIVE PAID CALL → VALIDATE → ONLY THEN FAN OUT`

This does not itself authorize the paid probe. Paid execution remains subject to
the applicable Human/budget authority.

## Deterministic regression

Executed locally on `2026-09-06` against canonical base:

`03dbacdb13b32e6160f57c913a308768e597e8a1`

Observed:

`RESULT = PASS N=1`

`MODEL_CALLS = 0`

`NETWORK_CALLS = 0`

`PAID_SPEND_USD = 0`

Regression implementation:

`scripts/cz-paid-call-fail-closed.py --self-test`

It uses no network and no model calls.

Required cases:

1. real incident-shaped fixture:
   `finish_reason=length + content="" + reasoning_tokens=1799/1800`
   → `REJECT / STOP`;
2. `finish_reason=stop + content=""`
   → `REJECT / STOP`;
3. non-empty but invalid required JSON
   → `REJECT / STOP`;
4. syntactically valid JSON missing required contract keys
   → `REJECT / STOP`;
5. valid `finish_reason=stop + non-empty JSON + required contract keys`
   → `ACCEPT`;
6. substantial budget remaining after a failed predecessor
   → next dependent paid call remains `NOT ADMITTED`.

Regression PASS does not prove provider configuration is repaired.
It proves only that this class of failed predecessor can no longer justify
continuation inside a runner that uses the gate.

## Root-cause classification

`TRANSPORT / RESPONSE-CONTRACT ADMISSION FAILURE`

Provider/model behavior observed:

`reasoning consumed 1799 / 1800 completion tokens → finish_reason=length → no visible contractual content`

System failure observed:

`invalid predecessor result did not stop dependent paid continuation`

The second property is the durable Célula Zero learning.

## Current consequence

`PAID-CALL FAIL-CLOSED REGRESSION = PASS LOCAL N=1`

`DUALITE MULTI-CALL RETRY = BLOCKED`

Next possible paid step:

`ONE REPRESENTATIVE TRANSPORT / CONTRACT PROBE`

Status:

`NOT AUTHORIZED`

A future one-call provider/configuration probe still requires explicit applicable
Human authority and must PASS before any multi-call fan-out is considered.

Preserve:

`REGRESSION PASS ≠ PAID PROBE AUTHORIZED`

`PROBE PASS ≠ MULTI-CALL EXECUTION AUTOMATICALLY AUTHORIZED`

## Non-inferences

This incident does not prove:

- Kimi K2.6 is unsuitable;
- Vercel AI Gateway is unsuitable;
- multi-AI investigation is useless;
- Dualite lacks a Brazil problem;
- Pix, compliance, security or Chorume hypotheses are correct;
- a larger output limit alone repairs the workflow;
- deterministic regression PASS proves a successful paid rerun.

## Promotion boundary

`PREPARED = YES`

`DETERMINISTIC REGRESSION = EXECUTED LOCAL / PASS N=1`

`COMMIT = NOT AUTHORIZED`

`PUSH = NOT AUTHORIZED`

`PR = NOT AUTHORIZED`

`MERGE = NOT AUTHORIZED`

`PAID RETRY = NOT AUTHORIZED`

### Subsequent Human promotion authorization — 2026-09-06

Exact Human authorization:

> Autorizo commit, push, abertura de PR e merge destes 4 arquivos se os prechecks, diff, regressão e verificações continuarem passando sem mudança de escopo.

Authority for this exact four-file promotion:

`COMMIT = AUTHORIZED`

`PUSH = AUTHORIZED`

`PR = AUTHORIZED`

`MERGE = AUTHORIZED IF PRECHECKS + DIFF + REGRESSION + VERIFICATIONS PASS WITHOUT SCOPE CHANGE`

This authorization does not authorize:

- paid provider/model calls;
- a Dualite transport probe;
- multi-call retry;
- outreach;
- Remote Supabase writes;
- security testing;
- implementation outside this four-file promotion.

Preserve:

`PROMOTION AUTHORITY ≠ PAID EXECUTION AUTHORITY`

## Secondary incident — workspace identity during repair

During preparation of the deterministic learning repair, the first local
executor assumed:

`repository path = $HOME/celula-zero`

Observed:

`PATH NOT FOUND → SAFE STOP`

A subsequent discovery attempt searched for repositories with the expected
GitHub origin and found multiple candidates.

Candidate A:

- path:
  `Downloads/celula-zero-state-reconcile-S2a0ni`;
- branch:
  `reconcile/state-pr148-restart-20260905`;
- HEAD:
  `7a061cb5180c8028032516d86887005726ff901f`;
- locally known `origin/main`:
  `f500c4f5c214ba2c77d4e07f25ef512531f56241`;
- current canonical object:
  `NOT PRESENT`.

Candidate B:

- path under historical incident package:
  `CZ-INCIDENT-NIGHTSHIFT-20260905-100411/clean-pr148`;
- detached HEAD:
  `3e8f717184dd4b7050fe6e6a6dbb5bf124d3aef3`;
- locally known `origin/main`:
  `42995ea5b361b69580701c28b098c8237cb3d85a`;
- local modifications/untracked files:
  `YES`;
- current canonical object:
  `NOT PRESENT`.

Because more than one repository matched the GitHub-origin criterion, the
discovery executor stopped instead of choosing one silently.

A fresh isolated clone was then created from canonical `main`.

Observed fresh-workspace preflight:

- expected origin:
  `PASS`;
- exact canonical HEAD:
  `03dbacdb13b32e6160f57c913a308768e597e8a1`;
- `origin/main` exact match:
  `PASS`;
- clean workspace:
  `PASS`.

### Falsified assumptions

1. Repository identity implies a known filesystem location.
2. Matching GitHub origin is sufficient to identify the operational workspace.
3. Any clone of the canonical repository is safe to use for current writes.
4. Automatic discovery may choose arbitrarily when multiple matching clones
   exist.

Preserve:

`same origin ≠ same operational workspace`

`repository identity ≠ repository filesystem location`

`clone exists ≠ clone is current`

`historical/recovery clone ≠ authorized operational workspace`

### Generalized workspace rule

Before a human-facing executor performs writes to a repository workspace:

1. the workspace must be explicit or deterministically resolved;
2. repository identity/origin must be verified;
3. the expected canonical base must be verified when the operation depends on
   a specific base;
4. relevant local state must be inspected before writes;
5. multiple plausible matching workspaces must fail closed rather than be
   selected arbitrarily.

When existing clones are stale, ambiguous, detached, dirty, historical or
recovery-oriented, creating a fresh isolated canonical workspace is a valid
safe fallback when the operation does not require preserving local unpublished
work.

Preserve:

`workspace discovered ≠ workspace authorized`

`fresh canonical workspace N=1 ≠ universal workspace resolver`

### Classification

`MAP / PROCESS EXTEND`

No new repository manager, daemon, database, agent or workspace registry is
justified by this incident.

### Promotion authority consequence

The earlier Human promotion authorization applied to the previously reviewed
semantic scope and required no scope change.

This secondary durable learning changes the candidate semantic scope.

Therefore:

`PREVIOUS PROMOTION AUTHORITY ≠ AUTOMATIC AUTHORITY FOR REVISED SCOPE`

A new Human promotion authorization is required after review.

### Revised Human promotion authorization — 2026-09-06

Exact Human authorization:

> Autorizo promover o candidato revisado, incluindo os aprendizados de paid-call fail-closed e workspace identity, com commit, push, PR e merge destes mesmos 4 arquivos, se os prechecks, diff, regressão, scope e verificações continuarem passando sem nova mudança de escopo.

Reviewed semantic scope:

1. paid-call fail-closed operational learning;
2. workspace identity / clone-selection operational learning;
3. deterministic paid-call regression;
4. short current consequence in `STATE.md`.

Authority for this exact four-file promotion:

`COMMIT = AUTHORIZED`

`PUSH = AUTHORIZED`

`PR = AUTHORIZED`

`MERGE = AUTHORIZED IF PRECHECKS + DIFF + REGRESSION + SCOPE + VERIFICATIONS PASS WITHOUT NEW SCOPE CHANGE`

Not authorized by this promotion:

- paid provider/model calls;
- Dualite transport probe;
- Dualite multi-call retry;
- outreach;
- Remote Supabase writes;
- security testing;
- unrelated implementation;
- branch deletion.

Preserve:

`PROMOTION AUTHORITY ≠ PAID EXECUTION AUTHORITY`
