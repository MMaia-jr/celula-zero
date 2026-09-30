# WP-CZ-VNEXT-HABITABLE-MVP-ASSEMBLY

Status:

`HUMAN EXECUTION AUTHORIZED / IMPLEMENTATION MERGE NOT AUTHORIZED`

Decision:

`D055 / CZ vNext HABITABLE MVP`

## Mission

Assemble one coherent, founder-usable Célula Zero experience by adopting and
composing mature documented capabilities before writing CZ-specific
infrastructure. Build continuously on isolated branch
`build/cz-vnext-habitable-mvp-assembly-20260930`; incorporate PR #227 commit
`3e27ba0fefab66d0a041cf65d4ae3bafa16a107a` once, leaving PR #227 open and
unmerged as historical partial lineage.

`OPEN CZ → AUTHENTICATE → ONBOARD / RESUME → PERSON / PROFILE / RELATION → CELL CÉLULA ZERO → CONVERSATION → CONTEXT → THINK / PLAN / ACT → CONFIRMED ACTION → DURABLE RECORD → PROFILE / CELL / WORK UPDATE → CLOSE → RETURN → CONTINUITY`

Do not stop for human micro-tests at each capability. Use automated regression
while building, then ask for Human use only when the integrated MVP is coherent.

## Starting facts and product requirements

PR #227 demonstrated online entry, founder auth, Auth Account → Profile → PERSON,
Célula Zero relation visibility and private Original Record persistence. The
human observed that Home is a composer/feed rather than conversation; integrated
AI, progressive onboarding, living Profile, a working Cell, useful Discover and
coherent institutional continuity are missing. These are product requirements,
not new architecture hypotheses.

Preserve:

`AUTH ACCOUNT ≠ PERSON ≠ PROFILE`

`CONVERSATION MESSAGE ≠ ORIGINAL RECORD`

`AI RESPONSE ≠ INTERPRETATION ADOPTED`

`AI PROPOSAL ≠ HUMAN DECISION`

`LOGIN ≠ AUTHORITY`

`CONTEXT PACK ≠ MEMORY`

`MODEL MEMORY ≠ INSTITUTIONAL MEMORY`

`ESSENTHIUS ≠ MODEL ≠ EXECUTOR ≠ HUMAN AUTHORITY`

## Stage 0 — reuse map before implementation

Read canonical main, PR #227, Foundation packages, Habitat result/migration,
remote schema and current official package/API documentation. Record exact
dependency versions, upstream URLs/licenses, deployment and provider status.

Classify relevant capabilities:

| Capability | MVP treatment |
| --- | --- |
| Supabase Auth, Postgres, RLS, profiles, PERSON, actor memberships, Cells | ADOPT / MAP |
| PR #227 auth/context/write path | REUSE / EXTEND |
| CZ records and provenance packages | REUSE their semantics; do not collapse message into record |
| AI SDK | ADOPT for model calls, streaming, tools and provider boundary |
| assistant-ui | ADOPT / COMPOSE for conversation UI/runtime if compatible with current React/Next |
| assistant-ui managed cloud persistence | DO NOT ADOPT; CZ must own normalized durable institutional data in existing Supabase |
| Vercel Chatbot template | REFERENCE patterns only; no Auth.js/Neon/Blob stack import |
| Supabase Realtime | ADOPT only where live UI updates materially help; no custom websocket server |
| Huly | MAP / adapter-ready only when an actual reachable endpoint exists; do not self-host or fork to unblock MVP |
| Existing old auth implementation | REFERENCE / selectively reuse after code review |
| Historical CZ UI | DO NOT IMPORT as product experience |
| GitHub canonical state | COMPOSE for authoritative current CZ state where access is available |

Every new CZ-owned capability must name the concrete property lost without it.
Do not add infrastructure for future optionality.

## Human experience

### Conversation and continuity

Home is a real conversation-first surface. Adopt assistant-ui's current React
runtime and Vercel AI SDK streaming/tool protocol instead of writing a bespoke
chat runtime. The user can ask what matters, resume work, state an idea, request
a change or correct the assistant. Ordinary dialogue is not automatically an
institutional record.

Persist normalized thread and message rows only if no existing compatible
remote tables exist. A thread belongs to one Person and Cell; messages retain
author kind/Actor, role, content/parts, timestamps, model/provider metadata for
AI messages, and optional record/tool references. Scope reads/writes with RLS
and server-resolved authority. Do not persist all application state as one JSON
blob or treat chat as institutional memory.

### Context compiler

For each request, compile a small explicit context from authenticated Person and
Profile, legitimate current Cell relation, Cell purpose/current direction,
recent conversation, attributable Original Records, relevant decisions/work and
canonical CZ state when available. Enforce size limits and exclude private or
unauthorized material. Structured state and attributable records remain the
source; no vector database/RAG layer absent a demonstrated need.

### Model and tools

Use one low-cost current model via Vercel AI Gateway if an already authorized
credential/capability works; otherwise use the existing authorized provider
credential. Do not store keys in source or expose them client-side. Stop only if
neither provider path is available. Record provider/model/request IDs and usage
metadata when returned; keep calls integrated and bounded.

Keep the product label `Célula Zero` / `Assistente da Célula Zero`; do not call
the raw model Essenthius. Use structured tools for current context, recent
records, Cell work, canonical CZ state, and proposals for Original Record,
Profile or Work updates. Tool output is structured. Mutations resolve Person,
Cell and authority server-side; the model can propose, and a human must confirm
meaning-changing Profile updates, decisions, or material actions before the
authorized write. Never accept client actor/authority IDs.

### Progressive onboarding and Profile

On meaningful first use, ask only for missing context and resume from durable
onboarding state. Prefer known verified identity/Cell relationship over asking
again. Ask preferred name, current purpose, correction/confirmation of relation
only if unresolved, and profile enrichment only when useful. No questionnaire
wizard.

The You surface shows Person identity label, Profile, Cells/relations,
user-reported experiences, sourced capabilities where evidence exists, recent
contributions and visibility. AI may propose changes; human confirmation is
required when meaning changes. Preserve Original Record, Claim, Evidence and
Verification boundaries.

### Cell, Work, Activity, Discover

The Célula Zero surface provides purpose, current direction, Marcos's actual
relation/authority, recent work, decisions/records, activity and a direct
conversation entry with Cell context. No UUIDs or manual context selection.

Prefer canonical GitHub read-only context for CZ development/current state.
Use a typed Huly client only if an already reachable compatible endpoint is
verified. Otherwise implement only the smallest provider-neutral Work
projection needed for one real task, with explicit source/provider linkage.
Do not build a general project-management system.

Activity aggregates material conversations, records, Profile/Cell/Work changes
and consequential tool executions; it does not treat every token as activity.
Discover either surfaces reachable Cells/capabilities relevant to Marcos or is
hidden until useful.

## Data and migrations

Inspect the remote schema and PR #227 migration first. Reuse compatible
normalized tables. Add the minimum normalized thread/message/onboarding/work or
AI execution records only when a specific continuity/provenance property is
otherwise lost. Every exposed table requires RLS and grants tested for allowed
and denied paths. No direct client writes for authority-sensitive records.

Use repository migration files, local validation, SQL diff/security review and
controlled application only to the already authorized project
`pvhbrpnclxjqnkdijkfi`. Read back schema, RLS, grants and policies. Do not
repurpose `preproject_records`; do not add vector DB, event platform, Huly
storage or a whole-state blob.

## OSS and licensing

Pin compatible versions and lockfiles. Record package, version, upstream URL
and license in the Stage 0/result documentation. Candidate licenses:
AI SDK Apache-2.0; assistant-ui MIT; Huly API client EPL-2.0. Dependencies
retain upstream licensing; do not copy upstream source into MPL-covered CZ
files without compatible terms/notices. Update `LICENSING.md` only if the
explicit CZ-authored software scope changes.

## Verification and integrated Human gate

Keep existing 26+ Vitest/regression, auth/RLS, typecheck, lint and build checks.
Add relevant context/tool/persistence contracts and database tests. Integrated
Playwright should exercise, as far as environment allows:

`AUTH → ONBOARD/RESUME → CELL → CREATE/RESUME THREAD → SEND → STREAM → CONTEXT TOOL → HUMAN-CONFIRMED ACTION → DURABLE STATE → CLOSE/LOGOUT → FRESH SESSION → LOGIN → THREAD + STATE RESTORED`

Exercise both desktop and mobile where practical. Automated PASS validates
implementation, not habitability. Do not use repeated model calls, load tests or
synthetic bulk data.

Deploy one stable protected development/Preview URL. Resolve the stale alias
problem without overwriting canonical production aliases or changing production
configuration absent necessity. Once the integrated experience is coherent,
stop engineering and tell Marcos simply to open Célula Zero and use it. Do not
provide a micro-test checklist or claim Human acceptance.

## Promotion boundary

Authorized: isolated MVP branch; one-time reuse of PR #227 commit; additive
migrations; low-cost bounded model calls; development/Preview deployments;
local commits, push and Draft PR for Human Review.

Not authorized: merging MVP to `main`; merging PR #227; Huly Core fork/patch;
external outreach/onboarding; Economy/token/DAO; unrelated architecture.

After the MVP branch incorporates the reusable commit, update PR #227 body or
comment:

`SUPERSEDED FOR PRODUCT PROMOTION BY HABITABLE MVP ASSEMBLY / PRESERVED AS PARTIAL IMPLEMENTATION LINEAGE`

Keep PR #227 Draft/open unless repository governance clearly requires closing
superseded drafts. Stop at coherent Preview + regression + Draft PR. The next
gate is:

`OPEN CZ AND USE → HUMAN ACCEPT / REPAIR / REJECT`
