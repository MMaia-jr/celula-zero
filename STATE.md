# Estado operacional atual

Última reconciliação canônica: 2026-09-07

Repositório canônico:

`MMaia-jr/celula-zero`

Este arquivo deve permanecer curto.

História detalhada pertence a Decisions, Work Packets, Result Packages,
testes, Git history e outros registros de proveniência.

Preserve:

`PRESERVED ≠ CURRENT`

`SUPERSEDED ≠ ERASED`

## Current operational core

`AI-NATIVE COMPANY CORE`

`COMPANY CORE v0.1 = PASS / MERGED / CANONICAL / INTERNAL REAL COMPANY USE N=1`

Company Core continua sendo o core operacional atual até uma decisão humana
explícita de substituição.

Preservar o core e sua lineage não congela implementação, schema, modelos,
providers, prompts, runners, storage ou tooling.

Missão preservada:

`intenção → aprendizagem → produção → evidência → avaliação → capacidade → confiança contextual → oportunidade`

## Current umbrella Human Direction — Future Readiness

`FUTURE READINESS / HUMAN DIRECTION / CURRENT UMBRELLA 2026-09-04`

Immediate sequencing is governed by the newer D021 Internal Operability Human Direction below. D020 remains preserved as the external Karabirrdt track and resumes when the current internal operability gate permits.

Célula Zero não deve esperar a chegada de usuários, comunidade, capital ou
trabalho externo para começar a descobrir capacidades previsivelmente
necessárias para servi-los. Deve preparar antecipadamente uma arquitetura
habitável, segura, econômica e extensível para o futuro que pretende criar,
usando cenários explícitos de crescimento como stress tests, sem confundir
preparação com adoção ou escala demonstrada.

Primeiro envelope de preparação:

`Marcos único → 1 usuário externo → 10 → capacidade de absorver 100 sem depender operacionalmente do fundador`

`100-USER-SHOCK-TEST = preparedness stress test ≠ evidence of demand, adoption or scale`

Move 1 — Participant Boundary:

`PARTICIPANT-BOUNDARY-001 = VERIFIED_LOCAL / PR #145 / MERGED / CANONICAL`

Observed:

- reconstructible local DB reset: `PASS`;
- Participant Boundary pgTAP: `31/31 PASS`;
- Gate1 compatibility: `PASS`;
- B2-A and B2-B1 authority canaries: `PASS`;
- full DB regression: `27 suites / 729 tests PASS`;
- automatic Cell membership uses `CELL_MEMBER` with zero operational capabilities;
- Cell membership does not become Cell administration or Project stewardship;
- `PROJECT_STEWARD` remains contextual to the exact Project;
- authenticated callers cannot query arbitrary-profile Cell membership through the internal helper.

Preserve:

`Cell membership ≠ Cell administration ≠ Project stewardship`

`readiness ≠ demonstrated scale`

Not demonstrated:

`100 actual users / load capacity / production uptime / external utility / adoption / PMF / scale`

Move 2 — Durable AI Job Plane + Hard Budget:

`MOVE2-VS1 = VERIFIED_LOCAL N=1 / PR #146 / MERGED / CANONICAL`

Observed:

- durable Job, AI Run, sponsored reservation and PGMQ delivery remain distinct;
- hard sponsored-budget admission: `PASS`;
- real two-session concurrent budget race: exactly one admission and one
  `CZ409:SPONSORED_BUDGET_EXHAUSTED`;
- independent Node worker after initiating Human process exit: `OBSERVED N=1`;
- worker authority remains separate from Human authority;
- successful MOCK execution:
  `Job SUCCEEDED / AI Run COMPLETED / reservation SETTLED`;
- AI output attributed to the AI Agent;
- worker created no Human Direction, Claim, Evidence, Verification or Decision;
- Kimi Code review completed;
- Codex adjudication: `F02 SUPPORTED`; `F01, F03-F09 REJECTED`;
- terminal stale PGMQ delivery repair: `PASS`;
- worker tests: `9/9 PASS`;
- targeted pgTAP after repair: `35/35 PASS`;
- full DB regression after repair: `28 suites / 764 tests PASS`;
- PR #146 Gate 1 CI: `PASS`.

Preserve:

`VERIFIED_LOCAL ≠ PRODUCTION_READY ≠ EXTERNAL_UTILITY ≠ ADOPTION ≠ SCALE`

Not demonstrated:

`production deployment / production worker credential delivery / production uptime /
100 actual users / external utility / adoption / PMF / scale`

Remote Upgrade Compatibility:

`REMOTE-UPGRADE-COMPAT-001 = VERIFIED_LOCAL / PR #148 / MERGED / CANONICAL`

Observed:

- fresh 32-migration schema: `29 database test files / 776 tests PASS`;
- remote-shaped incremental upgrade `12 → 32`: `PASS`;
- critical legacy data preserved;
- legacy effective project authority preserved;
- required zero-capability Cell membership backfilled without creating new
  `PROJECT_STEWARD` authority;
- `CELL_MEMBER` capabilities: `0`;
- hosted S01 simulation: `PASS`;
- anonymous public `SECURITY DEFINER` allowlist: exactly `5`;
- non-allowlisted anonymous public `SECURITY DEFINER` functions: `0`;
- postgres default anon/PUBLIC EXECUTE removed;
- PR #148 Gate 1 CI: `PASS`.

Preserve:

`VERIFIED_LOCAL / MERGED / CANONICAL ≠ REMOTE_APPLIED ≠ DEPLOYED`

Remote Supabase remains unchanged.

Restart / Resume Resilience:

`RESTART-RESUME-001 = VERIFIED_LOCAL N=1 / PR #150 / MERGED / CANONICAL`

Observed:

- live Room DB was unavailable;
- durable portable snapshot restored usable operational context;
- snapshot context remained historical and non-canonical for Human Direction;
- Git-canonical `Future Readiness` remained authoritative;
- unresolved canonical controls fail closed;
- focused tests: `6/6 PASS`;
- lived bootstrap: `PASS N=1`;
- model calls: `0`;
- remote Supabase writes: `0`.

Preserve:

`initial restart FAIL N=1 ≠ current restart/resume capability`

`historical snapshot context ≠ current Human Direction`

`VERIFIED_LOCAL N=1 ≠ general autonomy ≠ production readiness`


## Current immediate Human Direction — Internal Operability

`D021 / INTERNAL OPERABILITY BEFORE EXTERNAL DOING / HUMAN DIRECTION`

Human Direction:

`decisions/D021-internal-operability-before-external-doing.md`

D021 refines immediate sequencing without erasing D020.

Current reason:

`internal capability exists ≠ safely discoverable / composable / resumable operation`

The current priority is to repair only material internal operability properties
already demonstrated before returning to external K3/K4 execution.

Observed canonical result:

`WP-GI1-001 / PR #165 = MERGED / CANONICAL`

Founder canonical bootstrap now:

- verifies canonical repository identity;
- resolves actual remote `main`;
- rejects stale local tracking state;
- reads canonical `STATE.md` by verified SHA;
- parses current Human Direction + next gate;
- fails closed before provider activity when canonical controls are unresolved.

Preserve:

`Founder repair PASS ≠ all internal operability solved`

`internal operability work ≠ external utility`

`preparation ≠ adoption ≠ PMF ≠ scale`

Observed internal-operability result:

`GI1-002 / COMPANY CORE STAGED HEADLESS = VERIFIED_LOCAL N=1`

Result Package:

`RP-GI1-002-COMPANY-CORE-STAGED-HEADLESS-N1.md`

Observed:

- bounded staged surface:
  `tools/company_core_stage_headless.mjs`;
- focused deterministic tests:
  `7/7 PASS`;
- real local first-login authentication:
  `PASS`;
- real staged execution count:
  `1`;
- created Project visibility:
  `PRIVATE`;
- durable Company Core state:
  `AGREEMENT_DEFINED`;
- independent DB readback:
  `PASS`;
- authenticated Profile controls the exact `PERSON` steward Actor:
  `PASS`;
- `ai_run_id / result_content / evaluation_verdict / consequence_type`:
  `NULL`;
- `COMPANY_CORE_WORK_AUTHORIZED` events for the N=1 cycle:
  `0`;
- implemented-system model calls:
  `0`;
- implemented-system paid calls:
  `0`;
- Remote Supabase writes:
  `0`;
- frontend execution:
  `0`.

Preserve:

`VERIFIED_LOCAL N=1 ≠ PRODUCTION_READY ≠ EXTERNAL_UTILITY ≠ ADOPTION ≠ SCALE`

`staged Agreement PASS ≠ work authorization`

`N=1 PASS ≠ universal operability`

Do not repeat GI1-002 without a new material uncertainty.

Observed internal-operability result:

`GI1-D1 / OPERATIONAL DISCOVERABILITY = VERIFIED_FRESH_OPERATOR N=1`

Result Package:

`RP-GI1-D1-OPERATIONAL-DISCOVERABILITY-N1.md`

Observed:

- canonical front door:
  `README.md → docs/OPERATIONS.md = PASS N=1`;
- refined operational index:
  `472 lines / SHA256 4409279710c91c12a2811c8cf42ee08da503a4c977b35e04c2a0146d4a94ad03`;
- Fresh Operator V1:
  `INCONCLUSIVE / TEST HARNESS ERROR`;
- Fresh Operator V2:
  `PARTIAL / 9 of 9 questions answered / authority errors 0 / STOP errors 0`;
- Fresh Operator V3:
  `PASS`;
- V3 operator intents:
  `11/11 discovered correctly`;
- undocumented repository search:
  `0`;
- arbitrary implementation exploration:
  `0`;
- false or unsupported operational claims:
  `0`;
- authority-boundary errors:
  `0`;
- STOP-boundary errors:
  `0`;
- test-coverage overclaims:
  `0`;
- gap-classification errors:
  `0`;
- operational commands executed during V3:
  `0`;
- implemented-system model calls during V3:
  `0`;
- implemented-system paid calls during V3:
  `0`.

Preserve:

`discoverability PASS N=1 ≠ every capability executable by a fresh operator`

`PASS N=1 ≠ universal operability ≠ production readiness ≠ external utility ≠ adoption ≠ scale`

Remaining gaps are explicitly separated:

- discoverability/ergonomics:
  composed handoff alias; paid predecessor validator alias;
- fresh-operator precondition/bootstrap:
  Company Core Human auth/access-token path; Project Room five-ID acquisition;
- substantive property:
  Move2 deterministic `NEEDS_RECONCILIATION` disposition.

Do not repeat GI1-D1 without a new material uncertainty.

Current next material property to falsify:

`MOVE2 AMBIGUOUS-JOB RECONCILIATION DISPOSITION`

Current allowed planning move:

`MAP EXISTING MOVE2 RECONCILIATION / DISPOSITION CAPABILITY → FALSIFY PROPERTY LOSS → STOP FOR HUMAN REVIEW IF EXTEND REMAINS NECESSARY`

Use:

`ADOPT → MAP → EXTEND only on demonstrated property loss`

Generic documentation cleanup remains:

`NOT CURRENT TASK`

Dualite remains:

`PRESERVED / STRONG K3 CANDIDATE / NOT CURRENT IMMEDIATE EXECUTION`

D020 remains:

`PRESERVED / EXTERNAL KARABIRRDT TRACK / REFINED BY D021 FOR CURRENT SEQUENCING`

External Doing remains:

`NOT AUTHORIZED`

Next Human gate before K5:

`GI1-003 / HUMAN REVIEW / AUTHORIZE SMALLEST MOVE2 RECONCILIATION REPAIR IF PROPERTY LOSS REMAINS`

No implementation, paid call, Remote Supabase write, external enrollment,
outreach or Doing is authorized by D021 alone.

## Preserved external planning — Karabirrdt 001 / D020

`KARABIRRDT 001 = EXECUTED_LOCAL / HUMAN REVIEWED / HUMAN ADOPTED / D020`

Human Direction:

`decisions/D020-human-adopts-karabirrdt-001.md`

Dream / Goal basis:

- `decisions/D018-human-adopts-corrected-collective-dream.md`;
- `decisions/D019-human-adopts-planning-goal-objectives.md`.

Human-reviewed result:

`RP-DRAGON-KARABIRRDT-CIRCLE-001-HUMAN-REVIEWED.md`

Observed Karabirrdt Circle 001:

- canonical execution base:
  `5cb4675577a9c2ee2c83b6f940f6453b8fdc78f8`;
- model: `moonshotai/kimi-k2.6`;
- model calls: `12`;
- observed spend: `USD 0.23509832 / USD 2.00 hard ceiling`;
- candidate: `CREATED`;
- AI→AI questions: `0 created / 0 answered / 0 open`;
- raw deterministic diagnostics: `PARTIAL`;
- raw identifier/reference defects:
  `T006a` invalid under `T###` contract and one dependent unknown reference;
- paid retry: `NO`;
- Doing: `NOT EXECUTED`;
- task execution: `NOT EXECUTED`;
- Remote Supabase writes: `NO`.

Human-adopted corrected map:

`G1 Human Gate / K1 minimum readiness / K2 simple baseline / K3 real opportunity selected / K4 map-adapt existing external-run scaffold / K5 real intervention / K6 feedback + Human Review / K7 material learning preserved`

Primary bounded songline:

`K3 → K4 → G1 → K5 → K6 → K7`

K1/K2:

`SUPPORTING / CALIBRATION WHEN MATERIAL ≠ GLOBAL COMPLETION PREREQUISITES`

Existing external-run capability:

`WP-HA-001-FIRST-EXTERNAL-RUN.md = ADOPT / MAP BEFORE NEW ENTRY BUILD`

Raw candidate consequences:

`old T004 = MAP EXISTING / CONDITIONAL EXTEND / NON-BLOCKING`

`old T005 = DEFER / NON-BLOCKING`

`raw T006a idea = PRESERVED AS ZERO-BUILD DISCOVERY ROUTE / INVALID RAW ID NOT PRESERVED`

D016 sequencing:

`D016 ORIGINAL DIRECTION = PRESERVED`

`D020 = PRESERVED / REFINED BY D021 FOR CURRENT IMMEDIATE SEQUENCING`

`internal N=1 + simple baseline = readiness/calibration when material ≠ absolute blocker to external opportunity discovery/selection`

Current bounded phase state:

`DREAM = HUMAN ADOPTED / D018`

`GOAL + OBJECTIVES O1–O7 = HUMAN ADOPTED / D019`

`KARABIRRDT = HUMAN ADOPTED / D020`

`PLANNING = HUMAN ADOPTED / CANONICALLY RECONCILED`

`DOING = NOT AUTHORIZED`

`TASK EXECUTION = NOT AUTHORIZED`

External habitability N=1 requires:

`real need + concrete intervention + observable result + direct participant benefit indication + reconstructibility + Human Review + material learning preserved`

Preserve:

`Human Gate ≠ task`

`Karabirrdt ≠ Doing authorization`

`internal preparation ≠ demonstrated habitability`

`contact ≠ utility`

`PASS N=1 ≠ adoption ≠ PMF ≠ scale`

Preserved D020 external action surface before G1:

`K3 SELECT REAL OPPORTUNITY → K4 MAP / ADAPT EXISTING EXTERNAL-RUN CAPABILITY`

K3/K4 are bounded Planning/Boundary continuity. They do not by themselves
authorize outreach, participant enrollment, intervention, paid model calls,
implementation or Remote Supabase writes.

Preserved D020 external Human gate before K5:

`G1 / HUMAN REVIEW / AUTHORIZE FIRST BOUNDED DOING`

No paid model call, outreach, participant enrollment, implementation, Remote
Supabase write or Doing is authorized by this canonical reconciliation.

Paid-call safety / Dualite K3 consequence:

`PAID-CALL FAIL-CLOSED REGRESSION = VERIFIED_LOCAL N=1 / CANONICAL VIA PR #163`

Post-PR #163 bounded probes:

- Probe 003:
  `moonshotai/kimi-k2.6 / reasoning=minimal / 1 call / FAIL`;
  `6000 completion / 5999 reasoning / finish=length / visible content empty`;
  provider-reported cost:
  `USD 0.02652035`;
  fail-closed:
  `PASS / NO RETRY / NO FAN-OUT`;
- zero-cost routing diagnosis:
  `finalProvider=moonshotai`;
- Probe 004 controlled follow-up:
  `moonshotai/kimi-k2.6 / provider pinned moonshotai / reasoning=none / 1 call`;
  `2139 completion / 1 reasoning / finish=stop / visible content present`;
  response contract:
  `PASS`;
  provider-reported cost:
  `USD 0.00945843`;
  classification:
  `TRANSPORT / CONTRACT PASS N=1`;
- Probe 004 Product/Business Turn Card:
  `SUBSTANTIVE REVIEW = PARTIAL / HIGH-VALUE / ADMIT WITH REVIEW ANNOTATIONS`.

Preserve:

`Moonshot + reasoning=none PASS N=1 ≠ universal Kimi configuration`

`contract PASS ≠ substantive contribution PASS`

`probe PASS ≠ multi-call authorization`

`AI MORE ≠ Human Direction`

Current Dualite status:

`STRONG K3 CANDIDATE / CURRENT NEED + PARTICIPANT ACCEPTANCE NOT YET CONFIRMED`

`DUALITE MULTI-CALL = NOT AUTHORIZED`

`NO FURTHER PAID CALL = AUTHORIZED`

Incident / continuation record:

`RP-K3-DUALITE-PAID-CALL-FAIL-CLOSED-001.md`

## Preserved open Dream30D track — not current immediate sequencing

`DREAM30D = ACTIVE / DOING / OPEN / PRESERVED TRACK`

`CURRENT IMMEDIATE SEQUENCING = D020 / KARABIRRDT 001`

`DREAM30D DOING / OPEN ≠ D020 K5 AUTHORIZATION`

DragonCycle:

`25262d4d-4014-474e-9e71-e485a06f09ba`

Human Direction:

`Collective Dream v0.1 / HUMAN ADOPTED`

Local Human Direction record:

`858937c9-83d2-44d2-ac65-ce18d81c9fd1`

Human Plan:

`PLAN 30D v0.1 / HUMAN ADOPTED`

Local Human Plan record:

`b737fb12-3920-4f71-b39e-be5ca258c8c5`

Gate 1 — self-understanding / canonical continuity:

`PASS N=1 WITH EFFICIENCY WARNING / HUMAN REVIEW ACCEPTED`

Human review record:

`3fd46802-d3bd-49ea-b018-93fad341351d`

Accepted detail:

- fresh external semantic reconstruction: `PASS N=1`;
- authority / temporal fidelity: `PASS N=1`;
- transport / schema harness: `FAIL`;
- evaluator input defect: `CONFIRMED`;
- context efficiency: `PARTIAL`;
- resource scarcity: `OBSERVED`.

Observed Antigravity run:

`gemini-3.1-pro-high / 108045 input tokens / 115844 total tokens / weekly Gemini quota 100% → 80%`

The quota change is an observed provider-surface percentage-point change, not a
USD-cost claim and not a token-to-quota conversion.

Gate 2 — Founder-light continuity / Plus independence:

`PARTIAL / HUMAN REVIEW ACCEPTED`

Observed:

- bounded state reconstruction across sessions/providers: `OBSERVED`;
- exact clean 48h Plus-independence probe: `NOT DEMONSTRATED`;
- founder context / technical plumbing: `TOO HIGH`;
- initial probe contamination was preserved rather than repaired away.

Additional incident evidence — 2026-09-05:

- local autonomous nightshift reached real Codex execution but violated
  single-flight and produced concurrent workers;
- initial restart/resume resilience before repair: `FAIL N=1`;
- single-flight execution: `FAIL`;
- incident contained; contaminated output was not promoted;
- no remote Supabase write, deployment or canonical promotion resulted from
  the nightshift;
- restart recovery required too much founder plumbing.

Bounded preparedness criterion accepted after the incident:

`interruption/restart → one human command → reconstruct canonical + durable local state → identify last valid step → exactly one next execution → durable result → STOP`

This criterion does not by itself justify a daemon, generic orchestrator or new
continuity platform.

Result Package:

`RP-DREAM30D-GATE2-FOUNDER-LIGHT-CONTINUITY-PARTIAL.md`

Gate 3 — bounded self-improvement:

`PASS N=1 / HUMAN REVIEW ACCEPTED`

Observed improvement:

`Handoff Composition v1`

Properties demonstrated N=1:

- exact five-file external bundle;
- canonical `STATE.md` snapshot mapped from explicit Git base;
- canonical Git and newer local Room state kept distinct;
- founder manual file selection removed;
- raw Markdown free-UI transport accepted instead of brittle strict JSON;
- new unit test: `PASS`;
- existing Room tests: `18/18 PASS`;
- fresh external use reconstructed the canonical/local distinction.

Result Package:

`RP-DREAM30D-GATE3-HANDOFF-COMPOSITION-N1.md`

Human review / promotion decision:

`decisions/D014-dream30d-g2-g3-human-review-and-promotion.md`

Local Room track status remains:

`DOING / OPEN / PRESERVED`

This track-local status does not authorize K5 or any new D020 Doing.

G2 and G3 are reviewed.

Gate 4 — Resource metabolism:

`G4-T01 = PARTIAL / HUMAN REVIEW ACCEPTED`

Gate 4 promotion criterion:

`PASS N=1 / HUMAN REVIEW ACCEPTED`

Observed:

- resource events reconstructed: `5`;
- known material paid events: `3`;
- material paid events attributable to context/cause: `3/3`;
- observed paid total reconstructible: `YES`;
- observed account-delta total: `USD 0.02363745`;
- exact model attribution: `1/5`;
- exact usage attribution: `1/5`;
- exact USD measurement: `3/5`;
- new infrastructure justified: `NO`.

Result Package:

`RP-DREAM30D-GATE4-RESOURCE-METABOLISM-N1.md`

Human review / promotion decision:

`decisions/D015-dream30d-g4-human-review-and-promotion.md`

Historical next candidate gate from the adopted Plan, superseded as immediate
current direction by Future Readiness on 2026-09-04:

`GATE 5 — 24/7 THIN SLICE / NOT STARTED / REQUIRES NEW HUMAN DIRECTION`

Preserve:

`Task PARTIAL ≠ Gate promotion criterion failure`

`reconstructed account delta ≠ provider invoice`

`FREE_UI / HUMAN_RELAY ≠ paid API call`

`quota percentage-point change ≠ USD cost`

`PASS N=1 ≠ general autonomy ≠ external utility ≠ adoption ≠ PMF ≠ scale`

## Latest completed Dream — Internal Human–Multi-AI Composition

Result Package:

`RP-R2-INTERNAL-HUMAN-MULTI-AI-COMPOSITION-N1.md`

Human Celebration:

> Célula Zero já consegue representar e executar internamente uma relação humano–multi-IA com autoridade contextual, proveniência, evidência, revisão independente e decisão humana sem transformar IA em soberano. Mas ainda exige plumbing humano/técnico demais para ser uma experiência habitável.

Observed result:

- Dream → Plan → Need → Opportunity → Proposal → Commitment: `PASS`;
- real GPT ANC contribution: `PASS`;
- Contribution → Artifact → Claim → Evidence: `PASS`;
- Kimi Verification: `PASS / INDEPENDENT under B2-B2 / conflict_codes=[]`;
- Human Domain Decision: `ACCEPT_FOR_CONTEXT`;
- Outcome: `NONE`;
- Celebration / close: `PASS`;
- public publication: `NO`.

Observed integration seams justified the scoped R2-2A, R2-2B and R2-2D
candidate extensions. Other failures were resolved by composing existing
authority, ANC and T2 primitives.

Preserve:

`working primitives + poor composition ergonomics ≠ habitable system`

No result here demonstrates external utility, recurrence, adoption, PMF or
scale.

## Previous completed Dream — Cycle 4

`CYCLE 4 = CLOSED / CELEBRATED / PARTIAL`

Dragon Cycle:

`31224b3f-917d-450e-a535-0ef297afa394`

Closed at:

`2026-09-01T16:50:45.321033+00:00`

Final material version:

`46`

Human close Original Record:

`64bec4c6-2c7b-4132-b134-01622578c303`

Result Package:

`RP-CYCLE4-HUMAN-AI-DRAGON-DREAMING-SOIL.md`

### Result preserved

- `C4-T01 Observe and Bound`: `PASS`;
- `C4-T02 Simpler Rival Baseline`: `PASS`;
- `C4-T03 Interpret and Represent`: `PASS`;
- `C4-T04 Adversarial Reconstruction`: `PASS`;
- `C4-T05 Verify / Minimize / Test Decay`: `PARTIAL`;
- `C4-T06 Human Decision Surface / Cycle Evaluation`: `PARTIAL`;
- direct-source baseline reconstruction: `5/5`;
- full Soil Manifest reconstruction: `5/5`;
- minimal Soil Manifest reconstruction: `5/5`;
- full Soil Manifest unique capability over simpler rivals: `NOT DEMONSTRATED`;
- new lifecycle infrastructure justified: `NO`;
- final Cycle evaluation: `PARTIAL`.

Paid AI/model execution observed for Cycle 4 remained within the Human-authorized
`USD 3.00` ceiling. The three observed AI Gateway account deltas total
approximately `USD 0.02363745`; this is an execution-log account-delta measure,
not a provider-invoice claim.

Celebration preserved two seeds:

- `Human Process Awareness`;
- `Como preservar rastro sem preservar carga?`.

Observed learning:

`HUMAN_DECISION_TIME ≠ HUMAN_PLUMBING_TIME ≠ HUMAN_PROCESS_AWARENESS`

and:

`minimum sufficient continuity > maximum preserved context`

The second expression is an attributed Celebration synthesis, not a universal
Protocol rule.

No concrete property loss in this work justified a Soil Engine, new lifecycle
database/schema, artifact graph, RAG, MCP/A2A layer, generic orchestrator or
automated garbage collector.

Preserve:

`execution PASS ≠ experiment PASS`

`celebration ≠ PASS`

`PARTIAL ≠ FAIL`

`internal N=1 ≠ external utility ≠ adoption ≠ PMF ≠ scale`

## Previous completed Dream — Dream 3

`DREAM 3 = CLOSED / CELEBRATED / PARTIAL`

Dream:

`CÉLULA ZERO OPERA CÉLULA ZERO`

Shortest:

`Uma intenção humana → uma mudança verificável.`

Dragon Cycle:

`a3d1f512-7595-48f4-8266-56cea9c9869d`

Closed at:

`2026-08-31T22:40:32.090105+00:00`

Final material version:

`79`

Current/final Human Direction record:

`69d08579-94c3-482f-905d-2c542bbf94a3`

Later Human Decision — execution constraint:

`d4234df8-c962-4af9-be98-2fc1acfadc9c / DO NOT USE LOCAL MODEL ON CRITICAL PATH`

Task Plan:

`DREAM3-TASK-PLAN-001.md`

Result Package:

`RP-DREAM3-CELULA-ZERO-OPERA-CELULA-ZERO.md`

Verification:

`VERIFICATION-DREAM3-CELULA-ZERO-OPERA-CELULA-ZERO.md / PARTIAL / NON-INDEPENDENT`

### Result preserved

- explicit Dream task layer: `PASS`;
- PR #133 canonicalization: `PASS`;
- local qwen3.5 critical-path reliability: `FAIL N=1 / TIMEOUT`;
- fresh-process entry after recovery: `PASS N=1`;
- real non-STATE planning/coordination task: `PASS N=1`;
- Human-boundary criterion: `PARTIAL N=1`;
- fresh-process same-cycle continuity: `PASS N=1`;
- fresh AI on revised task-plan context: `NOT TESTED`;
- cross-cycle continuity: `NOT TESTED`;
- final Dream evaluation: `PARTIAL`.

Observed learning:

`Dream → Plan → Tasks → Do → Verify → Celebrate`

The planning gap was process/task visibility, not demonstrated need for new
custom orchestration.

No concrete property loss in this work justified:

- Mission Runner;
- `cz-do`;
- generic orchestrator;
- new context infrastructure.

Preserve:

`failed attempt ≠ erased history`

`celebration ≠ PASS`

`PARTIAL ≠ FAIL`

`fresh process ≠ fresh AI`

`N=1 ≠ general autonomy ≠ external utility ≠ adoption ≠ PMF ≠ scale`

## Previous completed Dream — Dream 2

`DREAM 2 = CLOSED / CELEBRATED`

Dragon Cycle:

`130401c7-43c1-4fb1-9eef-a01dfd16eee2`

Closed at:

`2026-08-31T17:10:54.38172+00:00`

Final material version:

`41`

Result Package:

`RP-DREAM2-BOUNDED-AI-SELF-IMPROVEMENT-GROUND.md`

Purpose:

> preparar terreno para que IAs possam progressivamente melhorar a Célula Zero
> com Dragon Dreaming, gasto de API limitado, autoridade humana preservada e
> preferência por reutilizar infraestrutura existente.

### Resultados preservados

- bounded self-inspection: `PASS N=1`;
- self-correction under counterevidence: `PASS N=1`;
- durable cycle learning: `PASS N=1`;
- real Room self-improvement: `PASS N=1`;
- official Room export: `PASS N=1`;
- official Room handoff: `PASS N=1`;
- package-only cold start: `PASS N=1`;
- cross-process continuity: `PASS N=1`;
- cross-cycle continuity: `NOT TESTED`;
- general autonomous self-improvement: `NOT PROVEN`;
- founder-light DREAM→CELEBRATE: `NOT PROVEN`.

Closing the Dream did not convert `NOT TESTED` or `NOT PROVEN` into `PASS`.

## Operational Room slice

Status after promotion of this state:

`ROOM = BOUNDED OPERATIONAL RUNTIME / INTERNAL VERIFIED N=1 / CANONICAL SLICE`

Promoted scope is intentionally narrow:

- Room runtime;
- focused Room regression test;
- participation/context portability test;
- minimal npm entrypoints.

Not promoted with this slice:

- MCP dependencies;
- generic Model Bridge;
- context compiler / benchmark;
- broad experimental worktree.

`Room ≠ universal platform ≠ autonomous orchestrator`

## Previous completed Dream — C001

`C001 = CLOSED / CELEBRATED / RECONCILED`

Result Package:

`RP-C001-DURABLE-GROUND-STATELESS-RECONSTRUCTION.md`

C001 remains reconstructible history and Company Core lineage.

## Classification boundary

Dream 3 does not demonstrate:

- external utility from this Dream;
- demand;
- revenue;
- recurrence;
- adoption;
- PMF;
- scale;
- strong physical-person assurance;
- cross-cycle continuity;
- general autonomous self-improvement;
- founder-light DREAM→CELEBRATE end to end.

Preserve:

`internal N=1 ≠ external utility ≠ PMF ≠ adoption ≠ scale`

`AI output ≠ Human Direction`

`authenticated session ≠ physical-person assurance`

## External evidence preserved

### EdgeLoom

`EXTERNAL UTILITY OBSERVED N=1 / BOUNDED REVIEW TRACK`

`PACKAGE-LEVEL FOREIGN NAMESPACE VERIFIED N=1 / MAINTAINER EVALUATION PENDING / NO ACTIVE WORK REQUIRED`

Isso não demonstra recurrence, adoption, PMF ou scale.

## Durable operating constraints

Preserve:

`Original Record ≠ Interpretation ≠ Claim ≠ Evidence ≠ Verification ≠ Decision ≠ Reputation`

`activity ≠ contribution ≠ result ≠ evidence ≠ evaluation ≠ reputation`

`PREPARED ≠ EXECUTED ≠ VERIFIED ≠ COMMITTED ≠ PUSHED ≠ MERGED ≠ CANONICAL`

AI consensus does not create Human Direction or legitimacy.

PASS N=1 does not prove PMF, adoption or scale.

## Hold

Em HOLD salvo nova Human Direction ou propriedade concreta:

- broad pre-sale offensive;
- HABITABLE-ALPHA-001;
- T4 implementation;
- generic Model Bridge;
- RAG / vector database;
- MCP / A2A infrastructure;
- specific Web3 implementations;
- token / DAO;
- universal reputation.

`HOLD ≠ REJECTED ≠ ABANDONED`

## Post-celebration Operational Convention

Human Decision:

`decisions/D011-post-celebration-canonical-reconciliation.md`

Convention:

`CELEBRATE → CANONICAL RECONCILIATION → NEXT DREAM`

Dream 2 reconciliation:

`PR #132 / MERGED / CANONICAL`

Dream 3 first-slice reconciliation:

`PR #133 / MERGED / CANONICAL`

Dream 3 final reconciliation:

`PR #134 / MERGED / CANONICAL`

R2 internal human–multi-AI composition reconciliation:

`PR #137 / MERGED / CANONICAL`

The canonical state preserves the bounded Room slice and the Dream 2 Result Package without promoting the broader experimental worktree.

## Historical preparedness gate — D016 / preserved, refined by D020

`HISTORICAL D016 PREPAREDNESS CRITERION = CLEAN HABITABLE INTERNAL N=1 → SIMPLE BASELINE N=1`

Human Direction:

`OPERATIONAL LEARNING RETENTION + HABITABLE BASELINE / PRESERVED D016 / CURRENT SEQUENCING REFINED BY D020`

Decision:

`decisions/D016-operational-learning-retention-and-baseline-gate.md`

Future Readiness remains the umbrella Human Direction. D016 remains preserved
Human Direction and operational-learning discipline, but D020 is the newer
Human Direction governing current sequencing. Under D020, clean internal N=1 and
the simple baseline are supporting readiness/calibration when material; they are
not absolute blockers to K3/K4 or a substitute for the adopted Karabirrdt
songline.

Historical D016 criterion:

1. one real internal Need reaches authorization, bounded AI execution, Human
   Result, evaluation and consequence through a normal human entrypoint without
   manual UUID, SQL, `psql` or bespoke recovery plumbing;
2. the same or a closely comparable problem is then executed through the
   simplest ordinary alternative;
3. compare consequential properties such as wall-clock time, founder plumbing,
   output usefulness, later reconstructibility and beneficiary evaluation when
   applicable.

No new infrastructure is justified by this comparison unless a concrete
property is shown to be lost in the simpler baseline.

Operational learning retention remains part of the operating discipline:

`FIXED ONCE ≠ LEARNED`

Material incidents that alter future execution should preserve the observed
incident, falsified assumption, generalized rule and a deterministic
regression/preflight when applicable, using existing repository structures
before inventing new memory infrastructure.

Preparedness capabilities preserved:

- Move 1 Participant Boundary:
  `VERIFIED_LOCAL / PR #145 / MERGED / CANONICAL`;
- Move 2 Durable AI Job Plane + Hard Budget:
  `VERIFIED_LOCAL N=1 / PR #146 / MERGED / CANONICAL`;
- Remote Upgrade Compatibility:
  `VERIFIED_LOCAL / PR #148 / MERGED / CANONICAL`;
- remote Supabase application: `NOT EXECUTED`;
- Restart / Resume Resilience:
  `VERIFIED_LOCAL N=1 / PR #150 / MERGED / CANONICAL`;
- Single-flight process primitive:
  `VERIFIED_LOCAL N=1 / PR #152 / MERGED / CANONICAL`;
- canonical `npm run cz` Founder entry:
  `SINGLE-FLIGHT PROTECTED / PR #153 / MERGED / CANONICAL`;
- single-flight autonomous execution:
  `PARTIAL / PRESERVED CAPABILITY GAP`;
- HABITABLE-V0-VS1 durable real-provider capability:
  `EXECUTED_LOCAL N=1 / PR #155`;
- clean habitable internal entrypoint:
  `NOT DEMONSTRATED / SUPPORTING READINESS WHEN MATERIAL UNDER D020`;
- simple ordinary-tool baseline:
  `NOT EXECUTED / SUPPORTING CALIBRATION WHEN MATERIAL UNDER D020`;
- 100-user shock test: `ARCHITECTURE STRESS TEST ONLY`;
- 100 actual users: `NOT DEMONSTRATED`;
- load/uptime/production readiness: `NOT DEMONSTRATED`;
- external utility: `NOT DEMONSTRATED BY THIS DIRECTION`;
- adoption / PMF / scale: `NOT DEMONSTRATED`.

Preserve:

`Future Readiness ≠ infrastructure expansion`

`clean habitability ≠ external utility`

`baseline comparison ≠ adoption ≠ PMF ≠ scale`

`FIXED ONCE ≠ LEARNED`

END OF STATE
