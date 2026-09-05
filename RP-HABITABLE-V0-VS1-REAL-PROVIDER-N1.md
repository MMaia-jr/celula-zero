# RP-HABITABLE-V0-VS1-REAL-PROVIDER-N1

Date: 2026-09-05

Status:

`EXECUTED_LOCAL N=1 / PASS`

Authority:

`HUMAN AUTHORIZED`

Promotion status at execution time:

`NOT COMMITTED / NOT PUSHED / NOT MERGED / NOT CANONICAL`

## Criterion

Demonstrate the bounded real execution path:

`Human authorization`
→ `durable Company Core work`
→ `durable AI Job`
→ `initiating Human process exits`
→ `independent single-flight worker`
→ `one real provider request`
→ `durable attributable AI output`
→ `budget settlement`
→ `Company Core AI completion`

while preserving:

`AI output ≠ Human Result`

and without creating Human Direction, Claim, Evidence, Verification or Decision
from the AI output.

## Candidate under test

`HABITABLE-V0-VS1 — COMPANY CORE → DURABLE REAL AI JOB`

Base:

`f500c4f5c214ba2c77d4e07f25ef512531f56241`

Candidate source scope:

`8 files`

No Remote Supabase write or deployment was authorized.

## Prior deterministic verification

Observed before the real provider execution:

- worker tests: `18/18 PASS`;
- targeted HABITABLE pgTAP: `62/62 PASS`;
- full database regression: `30 files / 838 tests PASS`;
- Gate 1 contracts: `PASS`;
- K1 hostile-value real PostgreSQL transport:
  `VERIFIED_LOCAL N=1 / PASS`;
- K2 authorization-order repair:
  `VERIFIED_LOCAL`;
- K3 exact inference-envelope contract:
  `VERIFIED_LOCAL`;
- eight-file candidate boundary:
  `PASS`.

No deterministic suite was repeated after the real N=1 because no candidate
source changed after those observations.

## Human authorization

Explicit authorization:

- one real local HABITABLE-V0-VS1 execution;
- Vercel AI Gateway;
- model `moonshotai/kimi-k2.6`;
- maximum one model-call attempt;
- total spend ceiling `USD 0.10`;
- no automatic retry;
- no Remote Supabase;
- no deploy;
- no commit/push/PR/merge during the execution.

## Durable execution record

Company Core Cycle:

`8df600c0-5dea-422c-8678-e2088b50a116`

Dragon Cycle:

`9b4e7ad3-d48c-4a6c-81c8-7b2126340c98`

AI Job:

`1b25125d-181b-4c6a-960d-c8fa7757c129`

AI Run:

`c0ae6bf1-9837-49f8-be0a-372cda3a2bae`

Sponsored reservation:

`df21491c-94b6-47a8-a2a7-1cce86826f85`

AI output record:

`49366075-0438-442d-8e2b-7459bfa9f278`

## Lived execution sequence

The Human initiator durably created the Company Core work, sponsored
reservation, AI Run, exact private inference envelope, AI Job and PGMQ delivery.

The initiating process then ended before any model execution.

A harness assertion incorrectly expected Company Core `AI_RUNNING` immediately
after enqueue. The observed pre-worker state was instead:

- Company Core: `WORK_AUTHORIZED`;
- Job: `QUEUED`;
- reservation: `ACTIVE`;
- AI Run: `PREPARED`;
- exact queue delivery: present;
- exact envelope digest: present.

The run stopped before a model call.

A later resume precheck preserved the same Job. A separate harness command then
failed while parsing the Vercel `/models` response because the Python invocation
omitted stdin program mode. That failure also occurred before a model call.

The same durable Job was then resumed again without creating a replacement Job,
AI Run or reservation.

The final worker entry was:

`npm run worker:move2`

through the canonical single-flight wrapper.

Observed:

`SINGLE_FLIGHT=ADMITTED`

The dedicated worker login was non-superuser and successfully assumed only the
`move2_vs1_worker` role for execution. The disposable login was removed after
the run.

## Real provider result

Provider:

`moonshotai`

Model:

`moonshotai/kimi-k2.6`

Worker exit:

`RC 0`

Job:

`SUCCEEDED`

AI Run:

`COMPLETED`

Company Core:

`AI_COMPLETED`

Reservation:

`SETTLED`

Queue after execution:

`0 matching messages`

Exactly one Job remained associated with the AI Run.

Provider-reported usage:

- input tokens: `83`;
- output tokens: `1423`;
- total tokens: `1506`.

Provider-reported cost:

`USD 0.00577085`

Observed Vercel account delta across the bounded execution:

`USD 0.00577085`

The observed account delta matched the provider-reported execution cost for this
N=1. This is an execution observation, not a provider-invoice claim.

Authorized ceiling:

`USD 0.10`

Spend result:

`WITHIN_AUTHORIZED_CEILING`

## AI output

Content class:

`SYNTHESIS`

Output digest:

`a71924041afa11b2d6b4b87686cbfc9efbd0a88c5ad2f14f1287540caa69baad`

Observed AI synthesis:

> Within Célula Zero, AI output is distinguished from Human Result to preserve transparent provenance and prevent conflation of machine-generated synthesis with human judgment, accountability, and creative ownership. Maintaining this separation ensures automated contributions remain identifiable as bounded, attributable artifacts rather than obscured substitutions for human reasoning. One practical consequence is that human operators can accurately audit, contextualize, and selectively integrate AI-derived material without automation bias or misplaced confidence in machine conclusions.

This text is an AI contribution, not a Human Result or Human Direction.

## Provenance boundary

The durable AI record preserved:

- `human_direction = false`;
- `claim = false`;
- `evidence = false`;
- `verification = false`;
- `decision = false`;
- `source_type = AI_RUN`;
- provider/model attribution;
- input digest;
- context digest;
- output digest;
- requesting actor attribution.

After execution:

- Human Result remained absent;
- Human Evaluation remained absent;
- no AI output was promoted to Human Direction.

## Result

`PASS N=1`

The candidate demonstrated one bounded local real-provider path with:

- durable authorization and Job state;
- initiator/worker separation;
- restart/resume of the same durable Job after pre-worker STOPs;
- single-flight worker admission;
- one real provider completion;
- attributable durable AI output;
- provider-reported cost settlement;
- epistemic separation between AI output and Human acts.

## Limits

Not demonstrated:

- clean one-command Human experience from Need to completed result;
- production worker credential delivery;
- Remote Supabase application;
- deployment;
- production uptime;
- external-user utility;
- recurrence with external participants;
- adoption;
- PMF;
- scale.

Preserve:

`EXECUTED_LOCAL N=1 ≠ PRODUCTION_READY`

`EXECUTED_LOCAL N=1 ≠ EXTERNAL_UTILITY`

`EXECUTED_LOCAL N=1 ≠ ADOPTION`

`EXECUTED_LOCAL N=1 ≠ PMF`

`EXECUTED_LOCAL N=1 ≠ SCALE`

Also preserve:

`AI OUTPUT ≠ HUMAN RESULT`

`PROVIDER-REPORTED COST ≠ PROVIDER INVOICE`

`ACCOUNT DELTA ≠ PROVIDER INVOICE`
