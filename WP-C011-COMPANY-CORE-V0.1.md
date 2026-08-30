# WP-C011 — COMPANY CORE v0.1

Status: `EXECUTED / LOCAL VALIDATION PASS / DOGFOOD PASS / PROMOTION CANDIDATE`

Dream:

`CYCLE 011 — ECONOMIA DE CAPACIDADES`

Plan:

`AI-NATIVE COMPANY CORE`

## Objective

Implement the first usable operating instance of the approved company model
inside the existing Célula Zero application.

Then use Célula Zero itself as the first real company user.

This Do is not a request for another architecture essay or another isolated
technical experiment.

## Product property

The founder can operate one complete company cycle through the product:

`NEED → AGREEMENT → WORK → AI/HUMAN CONTRIBUTIONS → RESULT → EVALUATION → ECONOMIC CONSEQUENCE`

and reconstruct afterward:

- the Need;
- authority;
- conditions/agreement;
- Project/Cycle linkage;
- AI Actor;
- gateway/provider/model runtime metadata;
- context/input provenance;
- output;
- contribution;
- result/artifact;
- evaluation;
- consequence;
- founder time and AI cost when observable.

## First user

Célula Zero itself.

The first Need must be a real current need of the company, not a synthetic
fixture created only to pass the implementation.

Internal dogfooding may establish only bounded internal operating utility.

It does NOT establish:

- external utility;
- customer demand;
- willingness to pay;
- PMF;
- adoption;
- scale.

## Existing architecture to reuse

Before adding anything, inspect and map current canonical capabilities.

Expected existing stack:

- Node 24;
- Next.js / React / TypeScript;
- Supabase / PostgreSQL / Auth;
- Zod;
- Tailwind;
- Vitest;
- Playwright;
- Project / DragonCycle / CycleRecord;
- T1/T2/T3 capabilities;
- DDR;
- ANC attributable AI Run.

External AI runtime:

- ADOPT `Vercel AI Gateway`;
- preferred model when sufficient: `moonshotai/kimi-k2.6`;
- credentials remain server-side;
- provider/model remain distinct from AI Actor identity.

## Product surface

Implement the smallest coherent founder-facing product surface that allows:

### 1. Need

Create and inspect a company Need.

Minimum fields:

- title;
- need/problem;
- desired result;
- relevant context;
- priority;
- constraints;
- confidentiality/publication boundary.

### 2. Agreement / Work Definition

Convert the Need into bounded work.

Minimum:

- expected result;
- scope;
- exclusions;
- dependencies;
- evaluation criterion;
- budget/cost boundary;
- authority;
- deadline when material.

### 3. Work / AI Execution

Authorize an attributable AI-assisted work execution.

The product must support Vercel AI Gateway and Kimi as the cost-preferred
external capability.

Preserve when observable:

- AI Actor;
- gateway;
- returned model;
- provider/runtime metadata if available;
- context/input;
- hashes/digests where current ANC semantics require them;
- output;
- token usage;
- provider-reported cost, or `UNKNOWN`;
- timestamps.

AI output remains an AI contribution, not Human Direction.

A second AI is optional and must only be used for a concrete quality/decision
hypothesis.

### 4. Result

Founder can review AI contribution(s) and record the resulting deliverable or
decision artifact.

Preserve:

`AI output ≠ Result automatically`

`Result ≠ Evidence automatically`

### 5. Evaluation

Founder evaluates whether the Need was actually addressed.

Minimum:

`USEFUL | PARTIAL | NOT_USEFUL | INCONCLUSIVE`

plus short rationale.

### 6. Economic / Operational Consequence

Record what actually changed.

Examples:

- founder time saved;
- AI cost;
- decision enabled;
- task completed;
- avoided work/cost;
- new capability;
- opportunity created;
- money spent/earned if actually applicable.

Preserve:

`expected consequence ≠ observed consequence`

`internal utility ≠ external utility`

## UX requirement

This must be usable as a product, not only through SQL or terminal.

The founder must be able to traverse the core flow through the existing web app.

CLI/scripts may support engineering and validation but do not satisfy the
product property by themselves.

## Architecture discipline

For every proposed new primitive or package:

classify:

`ADOPT / MAP / EXTEND / MISSING`

For `EXTEND` or `MISSING`, state:

> What concrete property is lost if this is not built?

Without property loss, do not build.

## Explicitly out of scope

Unless implementation uncovers a concrete blocking property:

- marketplace;
- public customer onboarding;
- payment integration;
- Room;
- RAG/vector DB;
- MCP/A2A;
- graph DB;
- generic Model Bridge;
- generic swarm/orchestration;
- blockchain;
- token;
- DAO;
- universal reputation;
- autonomous AI governance.

## Implementation authority boundary

This Work Packet by itself does not authorize:

- deployment;
- hosted Supabase mutation;
- external outreach;
- spending beyond already accepted inference cost;
- disclosure of confidential data;
- commit;
- push;
- PR;
- merge.

## Engineering execution

Use the existing isolated branch/worktree.

The coding executor should:

1. read canonical `README.md → STATE.md → PROTOCOL.md → CONTRIBUTING.md`;
2. inspect current web routes, domain models, migrations and canonical
   capabilities;
3. produce an `ADOPT / MAP / EXTEND / MISSING` map;
4. implement the complete vertical slice;
5. add only schema/API/UI changes actually required;
6. integrate Vercel AI Gateway server-side;
7. add deterministic tests protecting the product property;
8. run relevant Supabase tests;
9. run `npm run check`;
10. run E2E for the core founder flow;
11. produce local demo instructions;
12. produce a Result Package describing only what happened.

Do not stop after implementing one technical layer if the complete vertical
slice remains within authorized scope.

## Definition of Done

Locally, the founder can:

1. open the application;
2. create a real Célula Zero Need;
3. establish bounded work conditions;
4. authorize work;
5. execute at least one real Kimi inference through Vercel AI Gateway;
6. inspect provenance and output;
7. record a Result;
8. evaluate it;
9. record an observed consequence;
10. reconstruct the complete cycle afterward.

Required validation:

- relevant unit/integration tests PASS;
- relevant DB tests PASS;
- `npm run check` PASS;
- core E2E PASS;
- no secrets committed;
- no unauthorized hosted mutation;
- no epistemic authority amplification.

## Result classes

`PASS`

Complete product flow works locally and one real internal Need traverses the
cycle through observed consequence.

`PARTIAL`

Product flow is materially implemented but one bounded property prevents full
end-to-end use.

`FAIL`

The implementation cannot preserve the required company operating property.

`INCONCLUSIVE`

Execution is invalidated by an external/precondition issue that prevents a
meaningful evaluation.

## Celebrate trigger

After the first real internal cycle:

record:

- what became possible;
- what founder time/cost changed;
- what architecture was actually necessary;
- what was unnecessary;
- what remains missing;
- what the result does not prove.

This can close Cycle 011 if Human Authority judges the Dream/Plan/Do/Celebrate
cycle complete.

END OF WP-C011-COMPANY-CORE-V0.1
