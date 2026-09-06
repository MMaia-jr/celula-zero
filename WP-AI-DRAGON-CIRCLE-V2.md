# Work Packet — AI Dragon Circle v2 / Dreaming

Class:

`WORK PACKET / HUMAN AUTHORIZED`

Status:

`HUMAN AUTHORIZED / NOT EXECUTED / D017`

## Human purpose

Continue the same Dreaming investigation without losing the learned process
logic inside a transient chat.

The experiment should feel like a facilitated circle, not a batch of independent
essays.

## Question

Can a bounded multi-AI Dream Circle preserve:

- equal opportunity to speak;
- questions between agents;
- raw provenance;
- bounded shared context;
- process facilitation;
- cost control;
- Human authority;

without transcript explosion or repeated truncation/format retries?

## Concrete property under test

> A fresh speaking agent can participate in the current circle using bounded
> shared state, ask/respond to other agents, and leave a reconstructible
> contribution without Marcos manually relaying every turn.

## Phase

`DREAMING ONLY`

No transition to Planning without Human Review.

## Participants

Human Steward:

`Marcos`

AI roles:

- Canonical Auditor;
- Project Archaeologist;
- External Researcher/Scout;
- Adversarial Critic;
- Facilitator/Orchestrator.

Initial model choice:

`moonshotai/kimi-k2.6`

Using one model keeps model variance controlled.
This does not establish a permanent single-model architecture.

## Circle mechanics

### Talking piece

Default order is fair round-robin among participating roles.

Each agent receives one semantic turn.

A turn may end by:

- `CONTRIBUTION_COMPLETE`;
- `PASS`;
- response to an explicit question;
- Facilitator process interruption;
- hard resource boundary.

When every specialist passes in the same completed round, the Facilitator may
propose Dream closure.

Dream closure remains subject to Human Review.

### Question queue

An agent may emit structured process actions such as:

- `ASK`
- `CHALLENGE`
- `REQUEST_EVIDENCE`
- `REQUEST_CLARIFICATION`
- `CORRECT`
- `PASS`

Each queued item records:

- source role;
- target role;
- question/challenge;
- reason;
- status;
- related turn IDs.

The Facilitator selects when queued questions re-enter the circle.

It must not use the queue to suppress an unheard participant.

### Turn Card

Each completed AI turn produces:

1. raw turn — preserved unchanged;
2. self-summary/Turn Card;
3. Facilitator gist/verification of representation when needed.

Candidate Turn Card fields:

- `POINT`
- `WHY_IT_MATTERS`
- `NEW_EVIDENCE`
- `QUESTION_TO`
- `QUESTION`
- `UNCERTAINTY`
- `PASS_OR_MORE`
- `DERIVED_FROM_TURN`

The Shared Working Context uses bounded Turn Cards/gists, not full raw transcript
replay by default.

### Facilitator process authority

Allowed:

- maintain talking piece;
- enforce Dreaming boundary;
- request RESTATE;
- request shorter self-summary;
- route a question;
- detect repetition;
- pause/cancel runaway generation if the runtime supports it safely;
- manage context pressure;
- manage phase budget;
- preserve unresolved conflicts;
- propose circle close.

Not allowed:

- declare Human Direction;
- decide architecture;
- resolve normative conflicts by AI majority;
- promote artifacts;
- authorize spend beyond Human phase authority;
- move to Planning without Human Gate.

## Resource governor

Human-authorized execution envelope:

`DREAMING HARD BUDGET = USD 2.00`

Status:

`HUMAN AUTHORIZED / D017 / 2026-09-06`

Exact Human authorization:

> Autorizo aplicar os artefatos de aprendizagem e o Work Packet ao repositório, commit, push, abrir PR e merge se os prechecks/diff passarem sem mudança de escopo; e autorizo até US$2 para executar o AI Dragon Circle v2 em Dreaming, parando antes de Planning.

Soft operating target:

`USD 0.50–1.00`

Reserve:

Keep at least `25%` of remaining authorized budget available for closing
facilitation/synthesis unless Human Direction changes it.

Do NOT use tiny per-turn monetary caps by default.

Use generous model output ceilings as safety envelopes and charge/account actual
usage.

Before every paid call:

- estimate worst-case spend under current provider pricing;
- verify it fits remaining phase budget;
- otherwise STOP for Human Gate.

After every provider response, before task validation:

- record input tokens;
- record output tokens;
- record model;
- record provider response ID;
- record attributable cost/account delta when available;
- record finish reason.

## Adaptive orchestration

The Orchestrator may automatically:

- allocate larger output ceilings when context/question complexity rises;
- request a concise Turn Card after a long raw contribution;
- use a continuation call after `finish_reason=length` rather than restarting
  the whole role;
- route open questions to the target role;
- compact bounded operational context;
- stop exploratory turns when marginal information yield falls;
- preserve a final-synthesis reserve.

The Orchestrator must STOP if:

- phase hard budget would be exceeded;
- Human authority is required;
- canonical state cannot be reconstructed;
- a required provenance boundary cannot be preserved;
- repeated calls produce no new evidence/distinction/question after a bounded
  low-yield threshold.

## Candidate interruption behavior

Preferred capability:

`STREAM / OBSERVE / CANCEL`

If technically available and cheap enough, the Orchestrator may interrupt a live
generation for process/resource reasons.

Fallback:

If provider/runtime cancellation is not safely available, allow the call to end,
preserve it, then request bounded self-summary/correction.

Streaming/cancellation must be classified:

`ADOPT / MAP / EXTEND / MISSING`

before custom implementation.

## Shared Working Context

Keep:

- Human Original Dream;
- current phase;
- canonical base;
- Human Decisions;
- roles/round state;
- bounded Turn Cards;
- question queue;
- open conflicts;
- candidate domains;
- `DO NOT INFER`;
- resource state.

Do not place full raw transcripts in working context unless a concrete question
requires them.

## Expected Result Package

Record:

- exact turn order;
- questions asked/resolved/open;
- raw turn hashes;
- Turn Cards;
- working-context sizes;
- compactions;
- interruptions/continuations;
- input/output tokens by call;
- actual attributable spend;
- passes;
- final Dream Map;
- Human Review.

## Success criterion

`PASS N=1` requires:

1. every role gets at least one opportunity to contribute;
2. at least one AI→AI question is routed and answered OR the run records that no
   material question arose;
3. no incomplete provider output is silently accepted;
4. raw provenance remains reconstructible;
5. shared context remains bounded and is the actual injection path;
6. resource accounting is captured even when later validation fails;
7. no Human Direction is created by AI;
8. circle reaches all-pass closure or a legitimate bounded STOP;
9. no manual Marcos relay is required between ordinary AI turns.

## Non-inferences

`PASS N=1 ≠ general multi-agent architecture`

`PASS N=1 ≠ memory solved`

`PASS N=1 ≠ autonomous company`

`PASS N=1 ≠ external utility/adoption/scale`
