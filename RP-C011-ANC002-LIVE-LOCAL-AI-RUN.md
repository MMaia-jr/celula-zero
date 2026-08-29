# RP-C011-ANC002 — LIVE LOCAL AI RUN / OLLAMA ADAPTER

Class: RESULT PACKAGE
Cycle: CYCLE 011 — ECONOMIA DE CAPACIDADES
Plan: AI-NATIVE COMPANY CORE
Slice: ANC-002 — LIVE LOCAL AI RUN / OLLAMA ADAPTER

## Result

PASS N=1 / LOCAL / REAL MODEL / BOUNDED

A real installed local Ollama model executed one bounded ANC context and the
result crossed the existing ANC-001 database lifecycle into canonical DDR
CycleRecord semantics.

## Runtime

Provider: OLLAMA_LOCAL

Model: qwen2.5-coder:3b

Target-model external network: NO

Target-model paid API: NO

Hosted Supabase mutation: NO

## Executor accounting

One Codex executor session was used to create the two ANC-002 source files.

Executor: OpenAI Codex / gpt-5.6-sol

Executor model calls: 1

Executor cost: UNKNOWN — DO NOT INFER ZERO

ANC implementation-runtime external-provider calls: 0

These are distinct from the target-model run, which used local Ollama.

## Deterministic validation

node:test grouped cases: 7 PASS / 0 FAIL

Required behavioral properties: 9 / 9 covered

The previous attempts stopped on harness/environment defects:
- Codex sandbox denied loopback listen;
- the first outer harness required >=9 test() cases;
- the second outer harness parsed Node's default spec reporter as TAP.

No source defect was established by those stops.

Work Packet SHA-256: 4c0166b911b75df8c93588e8ff62eef9ab48434159183e44a964456e346d7e38

Adapter SHA-256: 0019ba1ec53e083857db282b316366423a92b587e57d1c31e9aa41cc6bbe13be

Adapter test SHA-256: d1e24b3cf340822d5c6dfe2c39250517d6c1a1ebe437e4a2d9667ab803c2dfc2

## Live Original Records

Request SHA-256: b994019f89de38582b01cb4c9e8b80ff0a5c891fd6db17394eb496cc93bf40c7

Normalized result SHA-256: 5ef896c511097e23150b930f06ef4efed26861b2e2998422e4d8477d9da3c887

Exact raw Ollama response SHA-256: dd5ea5ecee311baf94fc8bf3137ee66aa556b337daa839b2a827e77e978577ad

The exact live request, normalized result and raw Ollama response are preserved
locally outside Git. Their hashes are preserved here.

## Runtime provenance

Context digest: 94850c78ea959e33f87f315fe64fb77bc2cfdeccbe05295d3038432b07562335

Input digest: 3db43aaf73b364751482d29f1bb5c4ae38510e35e8fd3cb71d6b355208d4590a

Output digest: 76b103cc143131a637b57e769df1a6723429255c516b0ee9f9af9ae69ff82218

Observed input tokens: 504

Observed output tokens: 22

Observed total tokens: 526

Economic cost: UNKNOWN / null

## AI Run / DDR integration

AI Run: 30e87f95-8e8c-4a0b-94e1-36861a74237e

CycleRecord: ac7afd16-0a6b-4418-8100-c2267d92ca23

Observed:
- exact runtime provider/model persisted: PASS;
- context/input/output provenance: PASS;
- AI Run COMPLETED: PASS;
- exact AI_AGENT CycleRecord authorship: PASS;
- content class SYNTHESIS: PASS;
- DDR material_version advanced: PASS;
- CYCLE_RECORD_CREATED: PASS;
- AI_RUN_COMPLETED remained distinct: PASS;
- Human Direction inferred: NO;
- Claim inferred: NO;
- Evidence inferred: NO;
- Verification inferred: NO;
- Decision inferred: NO;
- role amplification: NO;
- delegation amplification: NO.

## What this does not establish

This PASS does not establish:
- external-provider substitutability;
- multi-provider execution;
- two or more AIs operating on the same company problem;
- external utility;
- PMF;
- adoption;
- economic sustainability;
- scale;
- autonomous AI legitimacy.
