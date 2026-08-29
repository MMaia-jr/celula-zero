# WP-C011-ANC002 — LIVE LOCAL AI RUN / OLLAMA ADAPTER

Class: WORK PACKET
Cycle: CYCLE 011 — ECONOMIA DE CAPACIDADES
Plan: AI-NATIVE COMPANY CORE
Slice: ANC-002 — LIVE LOCAL AI RUN / OLLAMA ADAPTER

## Human authority

Current Human Direction:

AUTORIZADO ANC-002 END-TO-END

This authorization covers the bounded sequence:

STATE reconciliation → Work Packet → isolated implementation →
deterministic validation → one real local Ollama inference →
AI Run persistence/DDR integration validation →
Result Package → commit → push → PR → merge.

Promotion is allowed only if all gates pass without a new material uncertainty.

No force/admin bypass is authorized.

Not authorized:

- hosted Supabase mutation;
- paid/external model/API execution;
- external provider secret;
- Room;
- RAG;
- MCP;
- A2A;
- new universal Model Bridge;
- new role/delegation;
- autonomous human-equivalent authority;
- unrelated repository changes.

## Canonical base

8a4c8e8f1b1aa2b92cdab1c98e92a88704d2cf2b

## Property

Test the smallest extension by which an existing attributable ANC AI Run can
use one REAL LOCAL Ollama model rather than only the deterministic MOCK,
while preserving:

Human authorization
→ bounded deterministic Context Manifest
→ exact model input
→ local Ollama invocation
→ exact raw provider response bytes
→ normalized output and observed usage
→ ANC AI Run
→ canonical DDR CycleRecord

The model/provider remains runtime metadata and does not become Actor identity.

## Architectural disposition

ADOPT:
- ANC-001 Context Manifest and digest semantics;
- ANC-001 AI Run state machine;
- ANC-001 DDR CycleRecord materialization;
- T3 loopback Ollama precedent;
- raw-response SHA-256 preservation;
- local-only timeout/failure semantics.

MAP:
- Ollama response/metrics into ANC normalized provider envelope.

EXTEND:
- one local Ollama adapter.

NOT NEEDED:
- Room;
- generic Model Bridge;
- RAG;
- vector DB;
- MCP;
- A2A;
- hosted model gateway;
- new database primitive.

## Required boundaries

Preserve:

AI_RUN != CYCLE_RECORD != CLAIM != EVIDENCE != VERIFICATION != DECISION

AI output != HUMAN_DIRECTION

provider/model != Actor identity

operator control != project role

cost != value

token count != economic value

LOCAL MODEL != EXTERNAL PROVIDER

## Implementation scope

Create only:

- tools/anc002_ollama_adapter.mjs
- tools/anc002_ollama_adapter.test.mjs

Do not modify ANC-001 implementation or historical migrations.

The adapter must use Node standard library only.

Production endpoint is fixed to loopback:

127.0.0.1:11434

Tests may override the loopback port only.

No caller-controlled host or arbitrary URL.

## Runtime contract

The adapter must:

1. reuse ANC-001 context construction/model input;
2. POST one bounded non-streaming request to Ollama;
3. preserve exact raw HTTP response body bytes;
4. validate HTTP/JSON/done/output;
5. map prompt_eval_count and eval_count when present;
6. preserve cost as UNKNOWN/null;
7. reject malformed/truncated/invalid responses fail-closed;
8. never print or persist environment secrets;
9. expose enough metadata to verify exact model/provider/context/output later.

## Real-run gate

A PASS requires one actual installed local Ollama model to execute successfully.

A mocked HTTP server is sufficient only for deterministic unit tests.
It is not sufficient for the central live-run property.

## Integration gate

The exact live result must then be passed through existing canonical:

anc001_prepare_ai_run
→ anc001_start_ai_run
→ anc001_complete_ai_run
→ ddr_record_cycle_record

in an isolated local Supabase stack.

PASS requires:

- stored provider = OLLAMA_LOCAL;
- stored model = exact runtime model;
- exact context/input/output digests agree;
- exact AI Actor authors resulting CycleRecord;
- content class remains SYNTHESIS or INTERPRETATION;
- material_version advances through DDR;
- CYCLE_RECORD_CREATED exists;
- AI_RUN_COMPLETED exists separately;
- no new Claim/Evidence/Verification/Decision;
- no Human Direction;
- no role/delegation amplification.

## Promotion gate

Only after deterministic tests + real local inference + DB/DDR integration pass:

commit → push → PR → merge.

A separate final STATE reconciliation may then be promoted under this same
Human Direction.

## Limits

PASS N=1 LOCAL does not establish:

- external provider substitutability;
- multi-provider operation;
- multi-AI deliberation;
- external utility;
- PMF;
- adoption;
- economic sustainability;
- scale.
