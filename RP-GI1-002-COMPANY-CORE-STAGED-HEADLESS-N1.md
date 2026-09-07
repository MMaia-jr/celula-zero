# RP-GI1-002 — Company Core staged headless N=1

Class:

`RESULT PACKAGE`

Authority:

`OBSERVED EXECUTION / HUMAN REVIEW`

Governing Human Direction:

`decisions/D021-internal-operability-before-external-doing.md`

Canonical base observed before execution and promotion:

`5e64383cfbcdf4ac86412672e9f28b8da9ee628d`

Date:

`2026-09-07`

## Purpose

Test the smallest safe headless Company Core path:

`authenticated Human → controlled PERSON Actor → PRIVATE Project → Need → Agreement → AGREEMENT_DEFINED → STOP`

without crossing into work authorization, AI execution, provider calls,
frontend execution or Remote Supabase.

## Epistemic boundary

This Result Package records what occurred.

Preserve:

`implementation ≠ verification`

`mock PASS ≠ real local N=1`

`VERIFIED_LOCAL N=1 ≠ production readiness`

`internal operability ≠ external utility`

`N=1 ≠ adoption ≠ PMF ≠ scale`

## Existing capability map

Confirmed existing domain primitives:

- authenticated Profile;
- controlled `PERSON` Actor;
- `create_project_atomic()`;
- `company_core_create_cycle()`;
- `company_core_define_agreement()`;
- durable Company Core state machine.

Pre-existing safe staged headless surface:

`NO`

Classification before repair:

`EXTEND`

No new database primitive, migration, frontend or domain object was required.

## Implementation

Files:

- `tools/company_core_stage_headless.mjs`
- `tools/company_core_stage_headless.test.mjs`

SHA-256 observed before promotion:

`ed9c0c805e1cb42f40cd821143018f115b48b09ef3d51450f9a410622a07f3e6  tools/company_core_stage_headless.mjs`

`d5a17da7186d3e3a16294b68e054a1220c67aaa4be7e1206b173e4ff7510158d  tools/company_core_stage_headless.test.mjs`

Mutating RPC allowlist:

- `create_project_atomic`
- `company_core_create_cycle`
- `company_core_define_agreement`

The operating path contains no transition to:

- `company_core_authorize_work`;
- AI Agent registration;
- ANC prepare/start;
- AI Gateway;
- Move2 execution.

The stop after Agreement is structural.

## Input provenance

The Project `original_intent` preserved this Human Original Record:

> Autorizo GI1-002: implementar localmente a menor superfície Company Core staged headless até `AGREEMENT_DEFINED → STOP`, com testes locais; sem provider/model calls, sem Remote Supabase, sem frontend e sem commit/push/PR/merge. Scope expansion = STOP.

The remaining Project / Need / Agreement fields were proposed as an operational
representation and then explicitly approved by the Human.

Preserve:

`Human-approved representation ≠ verbatim Human Original Record`

## Human-approved N=1 semantic payload

```json
{
  "project": {
    "title": "Célula Zero — GI1-002 Headless N1",
    "summary": "Teste local real da operação Company Core por terminal até Agreement, sem frontend ou execução de IA.",
    "original_intent": "Autorizo GI1-002: implementar localmente a menor superfície Company Core staged headless até `AGREEMENT_DEFINED → STOP`, com testes locais; sem provider/model calls, sem Remote Supabase, sem frontend e sem commit/push/PR/merge. Scope expansion = STOP.",
    "current_interpretation": "Verificar em runtime local se um humano autenticado consegue atravessar Profile → PERSON controlado → projeto privado → Need → Agreement e parar estruturalmente em AGREEMENT_DEFINED.",
    "intended_result": "Um ciclo Company Core real local persiste em AGREEMENT_DEFINED com nenhum AI Run, Result, Evaluation ou Consequence.",
    "rules_and_limits": "Somente Supabase local. Sem frontend, provider, modelo, autorização de trabalho, AI Agent, ANC, Move2 ou promoção Git.",
    "needs": [
      "Verificar a superfície staged headless em runtime local"
    ],
    "economic_regime": "VOLUNTARY",
    "stage": "DRAFT"
  },
  "need": {
    "title": "Verificar Company Core staged headless",
    "problem": "Os primitives existem, mas a composição operacional headless segura ainda não foi verificada em runtime local.",
    "desired_result": "Executar a composição real local e obter readback durável em AGREEMENT_DEFINED sem atravessar para trabalho ou IA.",
    "context": "GI1-002 / internal operability / local N=1.",
    "priority": "HIGH",
    "constraints": "Local only; no frontend; no provider/model; no Remote Supabase; no Git promotion.",
    "confidentiality": "PRIVATE local operation."
  },
  "agreement": {
    "expected_result": "Readback real local confirma AGREEMENT_DEFINED e campos downstream nulos.",
    "scope": "Autenticação local, Project PRIVATE, Need, Agreement e readback.",
    "exclusions": "Work authorization, AI Agent, ANC, Gateway, provider/model, Move2, frontend e Git promotion.",
    "dependencies": "Supabase local canônico em execução e credencial humana local autenticada.",
    "evaluation_criterion": "PASS somente se Project=PRIVATE, state=AGREEMENT_DEFINED e ai_run_id/result_content/evaluation_verdict/consequence_type permanecerem NULL.",
    "budget_boundary": "Zero chamadas pagas e zero chamadas de modelo pelo sistema.",
    "authority": "Autoridade limitada a criar o Project/Need/Agreement local e parar em AGREEMENT_DEFINED.",
    "deadline": null
  }
}
```

## Deterministic validation

Observed:

- Node syntax: `PASS`;
- focused Node tests: `7/7 PASS`;
- `git diff --check`: `PASS`;
- remote/non-loopback Supabase rejection: `PASS`;
- authenticated-profile verification: `PASS`;
- operator-supplied Actor / Project IDs rejected: `PASS`;
- project creation forced to `p_publish=false`: `PASS`;
- RPC allowlist bounded to three RPCs: `PASS`;
- unexpected state fails closed: `PASS`.

## Pre-N1 authentication discovery

Several authentication harness attempts stopped before the staged tool.
They are not additional N1 executions.

Observed sequence:

1. local stack discovery found the canonical local Supabase stack;
2. an early OTP attempt used `create_user=false` and returned HTTP `422`;
3. read-only SQL then established `AUTH_USER_COUNT=0` and one `ACTIVE` pilot invite;
4. an SDK-only harness gate stopped because local `@supabase/supabase-js` was not installed/resolvable;
5. a later harness stopped because the Kong container did not expose the anon key through the assumed environment variable;
6. the previously observed local anon key was reused and validated against the pinned local Data API with HTTP `200`;
7. canonical first-login Auth HTTP semantics were then used with `create_user=true`.

For all pre-N1 stopped attempts:

`N1_EXECUTION_COUNT = 0`

No Project / Need / Agreement mutation was produced by those stopped attempts.

## Executor boundary deviation during discovery

During an earlier read-only environment probe, `npx supabase status` fetched a Supabase CLI copy into the external npm cache because the CLI was not already present.

Observed consequence:

`REPOSITORY EFFECT = NONE`

`PACKAGE FILE EFFECT = NONE`

`DATABASE EFFECT = NONE`

No remediation was required.

## Authentication result

Pinned local Supabase:

`http://127.0.0.1:54321`

Human email:

`pilot@celulazero.local`

Observed first-login result:

- previous local anon key validation: `HTTP 200`;
- OTP request count: `1`;
- `create_user`: `true`;
- Auth result: `PASS`;
- post-auth users: `1`;
- Profiles: `1`;
- PERSON Actors: `1`;
- OWNER memberships: `1`;
- pilot invite: `USED`;
- pilot membership: `ACTIVE`.

Security record:

`ACCESS TOKEN EXPOSED = NO OBSERVED`

`SERVICE ROLE EXPOSED = NO OBSERVED`

`LOCAL ANON KEY = PRESENT IN EXECUTOR TRANSCRIPT`

The local anon key is a local public-client credential; its appearance in the executor transcript does not convert it into Human authority or service-role authority.

## Real local N=1

Real staged invocation count:

`1`

Result:

`PASS`

Observed identifiers:

- Profile: `c52fee92-d422-46ec-abd6-06c7bce8d82e`
- Actor: `b2f183b1-648b-4401-a211-9ae51ae0ca6d`
- Project: `e82de6e6-45e6-46d2-8540-61352262c92b`
- Project slug: `celula-zero-gi1-002-headless-n1`
- Company Core cycle: `cca5451b-3300-404e-8f48-61fa0326e0ea`
- Dragon cycle: `3cb7ade3-900d-4a7f-ba1a-1d1874f16d59`
- Need: `74246273-d8f5-4a2d-98a3-db0748f53203`

Observed state:

`PROJECT VISIBILITY = PRIVATE`

`COMPANY CORE STATE = AGREEMENT_DEFINED`

`STOP BOUNDARY = AGREEMENT_DEFINED`

Downstream fields:

`ai_run_id = NULL`

`result_content = NULL`

`evaluation_verdict = NULL`

`consequence_type = NULL`

## Independent database readback

Independent read-only SQL: `PASS`

Verified:

- exact Project ID: `PASS`;
- Project visibility `PRIVATE`: `PASS`;
- `created_by_profile_id` matches authenticated Profile: `PASS`;
- `steward_actor_id` matches returned Actor: `PASS`;
- Actor kind `PERSON`: `PASS`;
- authenticated Profile controls exact Actor: `PASS`;
- Company Core Project linkage: `PASS`;
- Company Core owner Actor: `PASS`;
- Dragon cycle linkage: `PASS`;
- Need linkage: `PASS`;
- state `AGREEMENT_DEFINED`: `PASS`;
- all downstream fields remain NULL: `PASS`;
- `COMPANY_CORE_WORK_AUTHORIZED` event count for this cycle: `0`.

## Boundaries observed

`IMPLEMENTED-SYSTEM MODEL CALLS = 0`

`IMPLEMENTED-SYSTEM PAID CALLS = 0`

`REMOTE SUPABASE WRITES = 0`

`FRONTEND EXECUTION = 0`

`AI AGENT CREATION CALLS = 0`

`WORK AUTHORIZATION CALLS = 0`

`AI RUN PREPARE CALLS = 0`

`AI RUN START CALLS = 0`

The real local N1 records were preserved.

## Result

`PROPERTY REAL LOCAL RUNTIME VERIFIED = YES`

`FINAL CLASSIFICATION = PASS / VERIFIED_LOCAL N=1`

The demonstrated property is bounded to:

`authenticated Human → controlled PERSON → PRIVATE Project → Need → Agreement → AGREEMENT_DEFINED → STOP`

Not demonstrated:

- production deployment;
- Remote Supabase operation;
- production authentication;
- multi-user concurrency;
- generalized recovery;
- external participant utility;
- adoption;
- PMF;
- scale.

## Next consequence under D021

GI1-002 closes the current Company Core staged-headless property at `VERIFIED_LOCAL N=1`.

The next preserved material gap is:

`MOVE2 AMBIGUOUS-JOB RECONCILIATION DISPOSITION`

Next move:

`MAP EXISTING → FALSIFY PROPERTY LOSS`

If a concrete loss remains:

`STOP → HUMAN REVIEW → authorize or reject the smallest repair`
