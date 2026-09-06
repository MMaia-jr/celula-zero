# RP — Dream Round 003 and Repair Passes 001–003

Class:

`RESULT PACKAGE / LOCAL EXPERIMENT EVIDENCE`

Canonical reference base:

`59627f582530a147eed04794d23c3d6d3ff8e4d0`


## Human review and promotion authorization — 2026-09-06

Exact Human authorization:

> Autorizo aplicar os artefatos de aprendizagem e o Work Packet ao repositório, commit, push, abrir PR e merge se os prechecks/diff passarem sem mudança de escopo; e autorizo até US$2 para executar o AI Dragon Circle v2 em Dreaming, parando antes de Planning.

This authorization permits promotion of this learning record and the bounded
Work Packet without changing their scope.

It does not turn candidate generalized learning into a Protocol rule
automatically.

## Scope

This Result Package records only what was observed in the local multi-AI
Dreaming experiments. It does not promote an architecture or Human Direction.

Preserve:

`execution event ≠ generalized rule`

`AI synthesis ≠ Human Direction`

## Dream Round 003

Observed:

- model: `moonshotai/kimi-k2.6`;
- model calls: `5`;
- observed recorded spend: `USD 0.11645690`;
- raw turns preserved with hashes;
- final Dream Map created;
- Planning not executed;
- Git promotion: no;
- Remote Supabase: no.

Material failure:

- all five visible model outputs exhausted the configured `3500 completion_tokens`;
- outputs ended incomplete/truncated;
- incomplete contributions were nevertheless accepted by the first harness;
- Shared Context was persisted but was not the actual memory injection path;
- prior raw turns were prefix-bounded, penalizing later speakers;
- Facilitator spoke only at the end;
- speaker sequence was hard-coded.

Classification:

`PARTIAL`

## Repair Pass 001

Objective:

Repair completion detection, active facilitation and actual Shared Context use.

Observed valid sequence:

1. Facilitator bootstrap;
2. Canonical Auditor;
3. Facilitator update;
4. Project Archaeologist;
5. Facilitator update;
6. External Landscape Scout;
7. Facilitator update;
8. Adversarial Critic.

Recorded spend through the eight valid calls:

`USD 0.08447003`

Observed:

- specialist completion validation: worked;
- `finish_reason=stop` + completion marker required;
- Shared Context became the actual prior-round memory for specialists;
- raw prior turns were not injected into later specialists;
- Facilitator operated between specialist turns;
- next speaker was selected through the Facilitator within the allowed unheard set.

Failure:

- the following Facilitator full-context rewrite returned
  `finish_reason=length`;
- harness failed closed and did not synthesize downstream.

Accounting limitation discovered:

- the failed provider call occurred before the post-call credit measurement;
- therefore recorded spend is not the exact total spend of the pass.

Classification:

`PARTIAL / SAFE STOP`

## Repair Pass 002

Objective:

Avoid rewriting the complete Shared Context every turn.

Tested pattern:

`stable prior context + semantic delta + deterministic composition`

Observed:

- 8 valid prior turns reused;
- specialist calls repeated: `0`;
- Facilitator Delta: `COMPLETE`;
- recorded Facilitator Delta cost: `USD 0.00816575`;
- deterministic composition: `PASS`;
- composed context size: `14595 bytes`.

Failure:

- final Facilitator returned `finish_reason=length`;
- harness failed closed.

Accounting limitation repeated:

- failed provider call was not cost-accounted because validation occurred before
  the post-call credit measurement.

Classification:

`PARTIAL / SAFE STOP`

## Repair Pass 003

Objective:

Test a compact final synthesis contract without repeating specialists or delta.

Observed:

- prior delta reused;
- composed context reused;
- single final Kimi call;
- conservative pre-call upper bound: `USD 0.02694615`;
- provider response progressed beyond finish-reason and completion-marker checks;
- deterministic validator then rejected the response because several sections
  exceeded an arbitrary `max 3 bullets` constraint.

Interpretation:

The material failure was not demonstrated to be budget exhaustion.
The validator rejected a substantively returned response because of an
over-tight presentation contract.

Accounting limitation repeated:

- post-call spend was not captured before deterministic rejection.

Classification:

`FORMAT-CONTRACT FAILURE / SUBSTANTIVE OUTPUT NOT ADJUDICATED`

## Falsified assumptions

Observed incidents falsified these assumptions:

1. `provider returned output → complete contribution`
2. `stored Shared Context → Shared Context actually used`
3. `fixed speaker sequence → active facilitation`
4. `full Shared Context rewritten every turn → sustainable bounded memory`
5. `small max_tokens → meaningful cost control`
6. `strict presentation validator → task quality protection`
7. `validate before accounting → complete resource evidence`

## Candidate generalized learning

These are candidate reusable rules pending Human Review:

### L1 — Completion

`RETURNED ≠ COMPLETE`

A model turn expected to produce an attributable contribution should not advance
the process unless completion is materially established.

Provider `finish_reason`, explicit semantic end marker, and task-specific checks
may be used, but presentation formatting must not be confused with substantive
completion.

### L2 — Memory path

`STORED ≠ RETRIEVED ≠ SELECTED ≠ INJECTED ≠ UNDERSTOOD`

The operational memory path must be observable separately from persistence.

### L3 — Raw record and shared memory

Preserve:

`RAW TURN ≠ SELF-SUMMARY ≠ FACILITATOR GIST ≠ SHARED WORKING CONTEXT`

Raw contributions remain provenance.
The shared working context should contain bounded operational meaning, not
unbounded transcript replay.

### L4 — Budget and generation envelope

`HARD MONETARY BUDGET ≠ MAX OUTPUT TOKENS`

A generous generation ceiling does not itself spend the ceiling.
Provider usage should be bounded by a phase-level monetary governor and measured
from actual usage/cost.

Avoid repeated paid retries caused only by artificially narrow output envelopes.

### L5 — Accounting order

For paid provider calls:

`provider return → cost/usage capture → semantic/format validation`

Resource evidence must survive a later task/format failure.

### L6 — Facilitation

`FACILITATION ≠ AUTHORITY`

A Facilitator may protect process, manage turn order, request clarification,
request compression, enforce phase boundaries and manage resource envelopes.

It must not convert AI convergence into Human Direction.

### L7 — Conversation

A multi-agent conversation requires more than sequential generation.

Candidate relation types:

`ASKS / RESPONDS_TO / RESTATES / CHALLENGES / CORRECTS / CONFIRMS / REQUESTS_EVIDENCE / PASSES`

Questions between agents should be first-class process objects rather than lost
inside long prose.

### L8 — Semantic turns

Prefer:

`one bounded semantic contribution → gist/turn card → next talking piece`

over:

`one agent → long dissertation → transcript replay into next agent`

Equality of participation means equivalent opportunity to contribute, question,
correct and pass — not identical token counts.

### L9 — Process interruption

A Facilitator may interrupt/cancel a generation for process reasons such as:

- material repetition;
- phase violation;
- runaway cost/context growth;
- answer drifting from the current question;
- unsupported psychological attribution;
- need to request concise restatement.

It should not interrupt merely because it disagrees substantively.

Streaming/cancellable execution is a candidate mechanism, not yet a demonstrated
requirement.

## Do not infer

This work does NOT demonstrate:

- a general memory architecture;
- need for RAG/vector DB/graph DB;
- need for a generic orchestrator platform;
- correctness of streaming/cancellation as implementation;
- external utility;
- adoption;
- PMF;
- scale.
