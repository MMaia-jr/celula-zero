# Célula Zero — Operations

Operational index for the current repository.

Use this after environment setup when you need to answer:

> Which existing capability should I use, under which preconditions and authority
> boundary, where must it stop, and how do I verify what happened?

For environment setup and software testing, use [DEVELOPMENT.md](DEVELOPMENT.md).
Always read `STATE.md` before acting. This index exposes capabilities; it does
not grant authority or replace current Human Direction.

Global boundaries:

`documented command ≠ authorization`

`entrypoint exists ≠ safe to run in every context`

`PREPARED ≠ EXECUTED ≠ VERIFIED ≠ COMMITTED ≠ PUSHED ≠ MERGED ≠ CANONICAL`

`VERIFIED_LOCAL N=1 ≠ production readiness ≠ external utility ≠ adoption ≠ scale`

## Quick operator map

| Intent | Entrypoint | Main risk | Stop/result | Verify | Current gap |
| --- | --- | --- | --- | --- | --- |
| Reconstruct canonical state without a model call | `npm run cz -- --check` | read/network bootstrap only | canonical controls or fail-closed STOP | Founder regression | does not discover every capability |
| Enter Founder Mode | `npm run cz` | provider/model and paid calls; accepted local replacement | exit, cap, or unresolved controls | Founder regression | no additional gap established |
| Create private Project + Need + Agreement only | `node tools/company_core_stage_headless.mjs < payload.json` | local DB writes | `AGREEMENT_DEFINED` | focused Node tests + real-run readback | fresh Human auth/token bootstrap |
| Use Project Room | `npm run room` | durable Room writes; configured AI turn | `/quit` or missing-context STOP | Room tests | fresh path to five required IDs |
| Export Room context | `npm run room:export` | local files | JSON + Markdown export | emitted hashes; portability tests | CLI file-writing verification partial |
| Build Room handoff | `npm run room:handoff` | local files | 5-file handoff package | `scripts/cz-room.test.mjs` | no new system gap established |
| Compose Room + canonical Git state | `node scripts/cz-compose-handoff.mjs` | local files | 5-file composed bundle | manifest hashes; focused response-contract test | no npm alias |
| Capture external response | `node scripts/cz-compose-handoff.mjs --capture ... < response.md` | local files | response + SHA preserved | SHA + heading validation | no dedicated end-to-end capture test |
| Validate predecessor before dependent paid call | `python3 scripts/cz-paid-call-fail-closed.py ...` | none from validator itself | reject/accept predecessor contract | `--self-test` | no package alias |
| Run an already-authorized Move2 Job | `npm run worker:move2` | DB mutation + provider/model cost | `IDLE` / `SUCCEEDED` / `FAILED` / `NEEDS_RECONCILIATION` | worker tests | reconciliation disposition unresolved |
| Prepare first external concierge run | `WP-HA-001-FIRST-EXTERNAL-RUN.md` | real-world/privacy risk | observed run or STOP | packet Result Package criteria | not current immediate sequencing |

## 1. Canonical resume / Founder bootstrap

Read-only entrypoint:

```bash
npm run cz -- --check
```

Use a local checkout of the canonical repository with network access sufficient
to resolve actual remote `main`.

The bootstrap checks repository identity, rejects stale local tracking state,
reads `STATE.md` from the verified SHA, and reconstructs current Human Direction
and the next Human gate.

It grants no implementation, Doing, paid-call, Remote Supabase, or Git-promotion
authority.

Expected read-only result:
- `MODEL_CALLS=0`
- `PAID_SPEND=0`

If canonical controls are unresolved, STOP rather than infer from chats,
branches, issues, snapshots or stale local files.

Verify:

```bash
python3 scripts/cz-founder-resume.test.py
```

Evidence: `scripts/cz-founder.py`,
`scripts/cz-founder-resume.test.py`,
`decisions/D021-internal-operability-before-external-doing.md`.

## 2. Founder Mode

Entrypoint:

```bash
npm run cz
```

Canonical bootstrap must pass. Interactive AI use also depends on configured
Founder local state under `~/.celula-zero` and a Vercel AI Gateway credential.

After read-only bootstrap, network/provider access and paid calls may occur
within configured caps.

An AI response is not Human Direction or execution. A proposed local file
replacement remains a proposal until the Human explicitly accepts it. That
acceptance does not imply commit, push, PR or merge.

STOP on unresolved canonical controls, configured call/session caps, or Human
exit.

Verify focused canonical-bootstrap behavior with:

```bash
python3 scripts/cz-founder-resume.test.py
```

No additional Founder implementation gap is established by discoverability
alone.

## 3. Company Core staged headless through Agreement

Target bounded path:

`authenticated Human → controlled PERSON → PRIVATE Project → Need → Agreement → AGREEMENT_DEFINED → STOP`

Entrypoint:

```bash
node tools/company_core_stage_headless.mjs < /path/to/payload.json
```

Required environment:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_ACCESS_TOKEN`

`SUPABASE_URL` is restricted to loopback/local Supabase. The access token must
represent the authenticated Human whose canonical Profile controls the resulting
`PERSON` Actor.

Do not supply generated Actor / Project / Cycle IDs manually. Use a payload
matching the documented `project`, `need`, and `agreement` schema. The verified
N=1 payload is preserved in
`RP-GI1-002-COMPANY-CORE-STAGED-HEADLESS-N1.md`.

Mutating RPC allowlist:
- `create_project_atomic`
- `company_core_create_cycle`
- `company_core_define_agreement`

Outside this path:
- `company_core_authorize_work`
- AI Agent registration
- ANC prepare/start
- AI Gateway
- Move2

Required result:
- Project visibility `PRIVATE`
- state `AGREEMENT_DEFINED`
- `ai_run_id = NULL`
- `result_content = NULL`
- `evaluation_verdict = NULL`
- `consequence_type = NULL`

Verify:

```bash
node --test tools/company_core_stage_headless.test.mjs
```

For an authorized real run, independently read back returned IDs, visibility,
actor control, state, linkages and zero work-authorization evidence.

Evidence level: `VERIFIED_LOCAL N=1 / CANONICAL`.

Current precondition/bootstrap gap: a fresh operator's supported Human
authentication/access-token path has not yet been demonstrated as a one-command
operation. Do not weaken authentication to hide that gap.

## 4. Project Room

Purpose: bounded project/cycle conversation preserving Human Original Records,
AI interpretations/syntheses, explicit Human Direction and
`DREAM → PLAN → DO → CELEBRATE`.

Entrypoint:

```bash
npm run room
```

Room fails closed unless all five are supplied:
- `ROOM_PROFILE_ID`
- `ROOM_HUMAN_ACTOR_ID`
- `ROOM_AI_ACTOR_ID`
- `ROOM_PROJECT_ID`
- `ROOM_CYCLE_ID`

Optional runtime settings include `ROOM_AI_MODEL` and `ROOM_AI_TIMEOUT_MS`.

Do not guess required IDs. If a fresh operator does not know them, the current
documented path does not show how to obtain all five legitimately. STOP.

Useful controls:
- `/status`, `/confirm`, `/respond`
- `/direction`, `/plan`, `/do`, `/celebrate`, `/child`
- `/cancel`, `/quit`

Free text records a Human contribution and starts the configured local Room AI
turn. Commands such as `/direction`, `/plan`, `/do` and `/celebrate` can change
durable Room state under their existing contracts.

Participation context does not itself grant Project authority. `/quit` exits
while preserving Room context.

Verify:

```bash
npm run test:room
npm run test:room:participation-portability
```

Current bootstrap gap:
`fresh operator → legitimate discovery of all five Room IDs`
is not yet a supported documented path. Classify `MAP FIRST`; do not remove the
checks for convenience.

## 5. Room continuity

All paths below produce local, non-canonical artifacts.

Preserve:
`local Room state ≠ Git-canonical state`
`portable context ≠ Human Direction`
`external AI response ≠ Decision`

### 5.1 Portable export

Entrypoint:

```bash
npm run room:export
```

Observed contract:
- reads current Room projection;
- writes one `.json` context file and one `.md` context file;
- prints both paths and SHA-256 values;
- `MODEL_CALL=NO`;
- `DB_WRITE=NO`;
- `CANONICAL=NO`.

Verification:
- compare emitted SHA-256 values with the files;
- `npm run test:room:participation-portability` verifies important portability
  semantics, including that participation context does not leak private operator
  identity.

Coverage limit: No dedicated end-to-end test of the export file-writing CLI is
currently established by this index.

### 5.2 Room handoff package

Entrypoint:

```bash
npm run room:handoff
```

Output:
- `CONTEXT.json`
- `CONTEXT.md`
- `PROMPT.md`
- `RESPONSE-TEMPLATE.json`
- `MANIFEST.txt`

Boundary:
- local files are written;
- Room state is read before and after generation and must remain equal;
- `MODEL_CALL=NO`;
- `DB_WRITE=NO`.

Verification: `scripts/cz-room.test.mjs` directly exercises package
construction, schema, content preservation, hashes and restrictive
file/directory modes.

### 5.3 Composed Room + Git-canonical handoff

Entrypoint:

```bash
node scripts/cz-compose-handoff.mjs
```

Preconditions:
- Room handoff context exists;
- `CONTEXT.json` exposes an explicit canonical base;
- local repository HEAD equals that exact base.

Output:
- `CONTEXT.json`
- `CONTEXT.md`
- `CANONICAL-STATE.md`
- `PROMPT.md`
- `MANIFEST.txt`

Boundary:
- local files are written;
- `MODEL_CALL=NO`;
- `DB_WRITE=NO`;
- `GIT_WRITE=NO`;
- canonical and newer local state remain separate.

Verification:
- check `MANIFEST.txt` hashes;
- `scripts/cz-compose-handoff.test.mjs` verifies the required Markdown response
  heading contract used by capture.

Coverage limit: that focused test does **not** establish a full deterministic
test of every composed-bundle construction property.

Known discoverability gap: no npm alias exposes this composed path.

### 5.4 Capture external Markdown response

Entrypoint:

```bash
node scripts/cz-compose-handoff.mjs --capture /path/to/CZ-COMPOSED-HANDOFF < response.md
```

Observed result:
- validates that the target is a composed handoff bundle;
- writes `EXTERNAL-RESPONSE-<timestamp>.md`;
- writes corresponding `.sha256`;
- preserves the original external response;
- validates required Markdown headings;
- does not convert the response into Human Direction, Decision or canonical state;
- no model call, DB write or Git write occurs in capture.

Verification:
- emitted response SHA-256;
- Markdown heading validation;
- focused `scripts/cz-compose-handoff.test.mjs`.

Coverage limit: No dedicated end-to-end capture test beyond that focused
contract is currently established.

## 6. Paid predecessor fail-closed validation

Use before another paid call when continuation depends on the predecessor
satisfying a declared response contract.

Self-test:

```bash
python3 scripts/cz-paid-call-fail-closed.py --self-test
```

General validation example:

```bash
python3 scripts/cz-paid-call-fail-closed.py /path/to/response.json   --expect-json   --require-key role   --require-key pass_or_more
```

Adapt required keys to the real contract.

Preserve:
`provider returned ≠ role completed`
`budget remaining ≠ next paid call justified`

Rejected predecessor: `STOP before next dependent paid call`.

The validator itself does not authorize another paid call. Its self-test reports
zero model, network and paid spend.

Current discoverability gap: no package alias exposes this safety capability.

## 7. Move2 durable AI Job worker

Use only when an already-authorized durable AI Job is ready for worker
execution. Do not run the worker merely to inspect the system.

Entrypoint:

```bash
npm run worker:move2
```

The package entrypoint uses the existing single-flight guard.

Required at minimum:
- `MOVE2_DATABASE_URL`

Real provider work also requires:
- `AI_GATEWAY_API_KEY`
- `AI_GATEWAY_BASE_URL`

The durable Job, AI Run, reservation and provider request must already exist
through the applicable authorized path.

The worker can mutate database state, dispatch provider/model work and incur
cost. Running it does not create Human authorization.

Result classes:
- `IDLE`
- `SUCCEEDED`
- `FAILED`
- `NEEDS_RECONCILIATION`

Ambiguous post-dispatch outcomes and unknown/oversized actual costs are
preserved for reconciliation rather than silently retried or fabricated.

Verify:

```bash
node --test scripts/move2-vs1-worker.test.mjs
```

Current substantive gap:
`ambiguity detected ≠ ambiguity disposition resolved`

Deterministic disposition of `NEEDS_RECONCILIATION` remains unresolved.

## 8. First external concierge run

Status: `PREPARED / NOT EXECUTED`.

There is intentionally no generic execution command. Start from:
`WP-HA-001-FIRST-EXTERNAL-RUN.md`.

The packet requires real participant/context selection, privacy/data
minimization and separate Human authorization.

Observation chain:
`ENTRY → ACTION → RELATION → SECOND PERSON → REAL-WORLD CONSEQUENCE → RETURN`

A STOP is evidence. Current immediate sequencing comes from the newer Human
Direction in `STATE.md`.

## 9. Gap classification

### Discoverability gap

Capability exists, but operator cannot readily find its supported entrypoint or
safety boundary.

Current examples:
- composed handoff lacks npm alias;
- paid predecessor validator lacks package alias.

### Fresh-operator precondition/bootstrap gap

Capability exists and is documented, but a legitimate fresh-operator path to a
required precondition is not yet demonstrated.

Current examples:
- Company Core Human auth/access-token bootstrap;
- Project Room acquisition of all five required IDs.

### Substantive property gap

The behavior itself remains unresolved.

Current example:
- deterministic Move2 reconciliation disposition after `NEEDS_RECONCILIATION`.

Do not convert documentation friction into architectural absence.

## 10. Fresh-operator discoverability test

Starting from `README.md` only, a fresh competent operator should be able to
determine:
1. canonical read-only resume;
2. Founder Mode;
3. Company Core through Agreement only;
4. Project Room and required context;
5. export/handoff paths;
6. predecessor validation before dependent paid work;
7. Move2 worker boundaries;
8. STOP/result and verification for each path;
9. which gaps are discoverability, bootstrap/precondition, or substantive.

Correctly finding a real unresolved gap is not a documentation failure.

`OPERATIONS INDEX PREPARED ≠ DISCOVERABILITY VERIFIED`
