# WP-C011-ANC001 — ATTRIBUTABLE AI RUN

Class: `WORK PACKET / LOCAL IMPLEMENTATION`
Cycle: `CYCLE 011 — ECONOMIA DE CAPACIDADES`
Plan: `AI-NATIVE COMPANY CORE`
Slice: `ANC-001 — ATTRIBUTABLE AI RUN`

## 1. Authority and promotion boundary

Human Direction authorizes LOCAL implementation and deterministic validation of
this bounded slice.

This Work Packet does NOT authorize:

- commit;
- push;
- pull request;
- merge;
- deploy;
- mutation of hosted Supabase;
- paid model/API execution;
- publication;
- secrets in source, artifacts, logs or database.

Preserve:

`PREPARED ≠ EXECUTED ≠ VERIFIED ≠ COMMITTED ≠ PUSHED ≠ MERGED ≠ CANONICAL`

## 2. Exact base

Canonical base:

`015a8660eff4971abbce6cb5223ff66d8199c3dc`

Expected workspace:

`~/projects/celula-zero-c011`

Expected local branch:

`cycle011/anc001-ai-run`

## 3. Property being tested

Implement the smallest infrastructure by which:

> one human can authorize an attributable AI activity inside exactly one Project
> and one DragonCycle; the AI receives deterministic bounded context; provider
> and model remain runtime properties rather than organizational identity;
> input, output, provenance and economic usage can be reconstructed; the AI
> output may become an attributed CycleRecord but does not acquire human
> authority.

This slice does NOT test external utility, adoption, PMF, scale or investor
readiness.

## 4. Existing capabilities to ADOPT

Reuse, do not redesign:

- `actors` including `PERSON` and `AI_AGENT`;
- `projects`;
- Gate B1 authority / capabilities / delegations;
- DragonCycle / CycleParticipation / CycleRecord;
- T3 bounded agent semantics where applicable;
- append-only event / decision infrastructure;
- existing SHA-256 provenance patterns.

Relevant canonical files include:

- `supabase/migrations/20260822120000_gate_b1_authority_coordination.sql`
- `supabase/migrations/20260826020000_integrated_alpha_t3_agent_authority.sql`
- `supabase/migrations/20260826023000_integrated_alpha_t3_agent_execution.sql`
- `supabase/migrations/20260826030000_integrated_alpha_t3_agent_evidence_path.sql`
- `supabase/migrations/20260827160000_ddr_be001_human_ai_dreaming_core.sql`
- `supabase/migrations/20260827170000_ddr_be002_plan_do_celebrate_bridge.sql`
- `tools/t3_bounded_local_agent.py`

The T3 runner is a useful implementation precedent for:

- repository-relative safe paths;
- deterministic SHA-256 input/output digests;
- preservation of raw provider response separately from normalized result;
- bounded output;
- explicit failure instead of fabricated success.

Do NOT broaden or reinterpret T3 semantics merely to implement ANC-001.

## 5. Semantic boundaries

Preserve explicitly:

`AI_RUN ≠ AGENT_TASK`

`AI_RUN ≠ AGENT_EXECUTION`

`AI_RUN ≠ CYCLE_RECORD`

`AI_RUN ≠ CLAIM`

`AI_RUN ≠ EVIDENCE`

`AI_RUN ≠ VERIFICATION`

`AI_RUN ≠ DECISION`

`provider/model ≠ Actor identity`

`AI output ≠ HUMAN DIRECTION`

`token usage ≠ economic value`

`cost ≠ value`

## 6. Minimal implementation

Implement only what is necessary for the following vertical slice:

`Human → Project → DragonCycle → bounded Context Manifest → AI Run → provider
result → attributed CycleRecord`

### 6.1 AI Run persistence

Add one additive migration defining a minimal `ai_runs` material record.

The exact schema may be adjusted when existing constraints require it, but the
record must preserve at least:

- `id`
- `cell_id`
- `project_id`
- `cycle_id`
- `agent_actor_id`
- `requested_by_actor_id`
- `purpose`
- `provider`
- `model`
- `context_manifest`
- `context_digest`
- `input_digest`
- `state`
- `output_uri`
- `output_digest`
- `output_size_bytes`
- `input_tokens`
- `output_tokens`
- `total_tokens`
- `cost_usd`
- `cost_source`
- `failure_code`
- `started_at`
- `completed_at`
- `failed_at`
- `created_at`

Suggested state vocabulary:

`PREPARED | RUNNING | COMPLETED | FAILED`

Economic observability MUST preserve uncertainty.

Suggested `cost_source`:

`PROVIDER_REPORTED | CALCULATED | UNKNOWN`

`UNKNOWN` must be valid. Never manufacture a cost.

### 6.2 Context Manifest

Implement deterministic manifest construction with a version identifier such as:

`cz.ai-context.v1`

Minimum semantic content:

- project id;
- cycle id;
- AI Actor id;
- purpose;
- task;
- selected CycleRecord ids/classes/content digests;
- explicitly authorized repository-relative file paths + digests, if any;
- authority / mandate;
- prohibited inferences;
- manifest version.

Manifest digest must be calculated from a deterministic canonical
serialization.

Do NOT build:

- RAG;
- embeddings;
- vector database;
- semantic memory search;
- universal context service.

### 6.3 Runner

Implement the smallest runner capable of:

1. reading an explicit bounded run request;
2. validating project/cycle/agent/context identifiers;
3. constructing deterministic model input;
4. preserving its digest;
5. invoking a provider adapter;
6. preserving raw response bytes when an actual provider is later used;
7. normalizing output;
8. preserving output digest;
9. exposing token/cost observations without inventing unavailable values.

Prefer existing runtime capabilities and standard library over adding a new
framework.

A provider transport abstraction may exist, but keep it minimal.

For deterministic validation in this Work Packet, use a local MOCK provider.

Actual external/paid model invocation is NOT authorized by this packet.

A future gateway adapter may be implemented only if it can remain dormant in
tests and requires an explicit environment secret + explicit execution flag.

No secret may be committed or persisted.

### 6.4 CycleRecord materialization

A COMPLETED AI Run may produce exactly one attributed CycleRecord in the same
DragonCycle.

For ANC-001, AI output may materialize only as:

- `INTERPRETATION`; or
- `SYNTHESIS`.

It may NOT materialize:

- Human Direction;
- Decision;
- Verification;
- Evidence;
- Claim merely by inference.

The CycleRecord author must be the exact `AI_AGENT` associated with the run.

## 7. Authorization constraints

For the minimum slice:

- requester must be a `PERSON`;
- requester must have existing legitimate project/cycle authority;
- target AI must already be an `AI_AGENT`;
- AI must be an active participant in the same DragonCycle;
- Project A context cannot be attached to a run belonging to Project B;
- Cycle A cannot be silently crossed with Cycle B;
- creating an AI Run grants no new role or capability;
- completing an AI Run grants no new role or capability.

Do not introduce universal autonomous authority.

## 8. File scope

Executor may create or modify only the minimum necessary subset of:

- `supabase/migrations/*cycle011*anc001*ai_run*.sql`
- `supabase/tests/database/*cycle011*anc001*ai_run*.test.sql`
- `tools/anc001_ai_run.mjs`
- `tools/anc001_ai_run.test.mjs`
- `package.json` ONLY if a deterministic test command genuinely requires it.

Do not modify existing historical migrations.

Do not modify:

- README;
- STATE;
- PROTOCOL;
- CONTRIBUTING;
- frontend;
- deployment configuration;
- Supabase hosted configuration.

If implementation requires another source file outside this scope:

`STOP / REPORT PROPERTY`

Do not expand scope silently.

## 9. Acceptance criteria

### AC-01 — exact context
An AI Run belongs to exactly one Project and one DragonCycle belonging to that
Project.

### AC-02 — attributable AI
The run references an existing `AI_AGENT`.

### AC-03 — legitimate requester
A human without required project/cycle authority cannot create the run.

### AC-04 — active participation
The AI Actor must participate in that exact DragonCycle.

### AC-05 — deterministic manifest
Equivalent material context produces the same context digest.

### AC-06 — material change detection
A material context change produces a different digest.

### AC-07 — cross-project denial
Project A context cannot create or complete a Project B run.

### AC-08 — provider is runtime metadata
Changing provider/model does not change Actor identity.

### AC-09 — output provenance
Completed result has a deterministic output digest and bounded size.

### AC-10 — epistemic boundary
Completing a run does not create Claim, Evidence, Verification or Decision.

### AC-11 — human authority
AI output cannot become Human Direction.

### AC-12 — attributed CycleRecord
Materialized AI result is authored by the exact AI Actor and classed only as
INTERPRETATION or SYNTHESIS.

### AC-13 — no authority amplification
AI Run creation/completion does not grant role, capability or delegation.

### AC-14 — economic observability
Observed token usage is preserved when available; unavailable usage remains
unknown/null rather than fabricated.

### AC-15 — cost uncertainty
Unavailable provider cost is recorded as UNKNOWN/null, not estimated silently.

### AC-16 — failure preservation
Provider failure produces FAILED state and does not fabricate an output or
CycleRecord.

### AC-17 — secrets
No API key/token appears in Git diff, database fixtures, test output or produced
artifacts.

### AC-18 — deterministic local validation
All new database tests and runner tests pass without external network or paid
model execution.

## 10. Required validation

At minimum:

- syntax/compile of runner;
- deterministic runner tests;
- Supabase local reset;
- all cumulative pgTAP tests;
- new ANC-001 pgTAP cases;
- existing repository checks if implementation touches shared runtime;
- `git diff --check`;
- final changed-file scope audit.

Do not repeat expensive unrelated tests if a cheaper deterministic check already
answers the question, unless regression risk justifies them.

## 11. STOP gates

STOP immediately and report rather than extending architecture if implementation
appears to require:

- alteration of T3 semantics;
- hosted Supabase mutation;
- service-role credential in client/runtime artifacts;
- new identity system;
- RAG;
- vector database;
- MCP;
- A2A;
- graph database;
- wallet;
- blockchain;
- token;
- payment system;
- public deployment;
- frontend redesign;
- broad autonomous AI authority;
- source changes outside the authorized scope.

## 12. Expected Result Package

After implementation and deterministic validation, report only what actually
occurred:

- exact base;
- branch;
- changed files;
- tests actually executed;
- pass/fail counts;
- properties demonstrated;
- properties not demonstrated;
- model calls: expected `0`;
- external cost: expected `$0`;
- git status;
- whether commit/push/PR/merge occurred — expected `NO`.

Do not claim:

- external utility;
- economic sustainability;
- PMF;
- adoption;
- scale;
- investment readiness;
- provider substitutability until at least two providers are actually tested;
- successful external AI execution before one actually occurs.

## 13. Executor instruction

Implement this Work Packet using the smallest safe vertical slice.

First read only the canonical files necessary to understand the reused
semantics.

Prefer reuse over new abstractions.

Do not ask the human to choose incidental implementation details that can be
resolved deterministically inside this scope.

If a STOP gate is encountered, stop without expanding the architecture.

At completion, do NOT commit.

Return a Result Package to the human for review.
