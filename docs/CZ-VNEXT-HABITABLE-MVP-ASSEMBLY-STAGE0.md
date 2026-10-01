# CZ vNext — Habitable MVP Assembly / Stage 0 Reuse Map

Date: `2026-09-30`

Canonical base: `4049175952e29c524b2b0d2982dd2bc5aefe75a7` (PR #228 merge)

Implementation branch: `build/cz-vnext-habitable-mvp-assembly-20260930`

Reusable Habitat commit: PR #227 commit `3e27ba0fefab66d0a041cf65d4ae3bafa16a107a`,
cherry-picked as `157e06b`.

This Stage 0 readback uses the canonical D055/D054/D052/Blueprint/WP, PR #227's
diff and result, the existing vNext packages, current package registries and
official integration documentation, plus a read-only schema inspection of the
already-authorized Supabase project. The classification was recorded before
implementation writes. Subsequent Habitat implementation and schema outcomes
are recorded in the Result Package.

## Classification

| Capability | Classification | Finding and MVP treatment |
| --- | --- | --- |
| Supabase Auth | ADOPT | Existing authenticated founder account and cookie session remain the account boundary. No new IdP or unrestricted signup. Rotatable founder allowlist remains deployment-only. |
| Profile | MAP / REUSE | Existing Profile resolves from Auth Account. Preserve Profile as a separate institutional projection; use existing `display_name`, `handle`, `bio`, `visibility` where their meanings fit. |
| PERSON Actor | MAP / REUSE | Existing Auth → Profile → exactly-one-PERSON resolution from the Habitat RPC is retained; technical UUID overlap does not collapse the concepts. |
| Actor membership / Cell authority | MAP / REUSE | Reuse existing identity and `CELL_MEMBER` relationship readback. Login confers no Cell authority; every server mutation must resolve the relation from durable state. |
| Cells / Célula Zero | MAP / REUSE | Reconstruct the existing `cell-zero` entity and relation. No second Cell or altered historical semantics. |
| PR #227 auth/session/context/Original Record write | REUSE / EXTEND | Preserve as the base. Its observed human path passed entry, auth, identity mapping, Cell relation visibility and private Original Record persistence. It lacks conversation, progressive onboarding and integrated continuity. |
| Existing Original Records | REUSE | Reuse the append-only `cz_vnext_original_records` semantics and checked RPC for confirmed material records. Do not treat ordinary chat messages as Original Records. |
| Existing preproject/cycle records | REFERENCE ONLY | Keep their specific semantics; do not use as generic chat, onboarding or work storage. |
| Threads and messages | EXTEND | Read-only schema inspection found no compatible normalized thread/message tables. Without them, attributed conversation cannot survive reload/provider change while remaining distinct from institutional records. Added normalized `cz_vnext_threads` and `cz_vnext_messages` scoped to Profile, Person, and Cell, with human/model provenance and token/response metadata. |
| Progressive onboarding state | REUSE / DERIVE | No separate onboarding table is needed for this MVP. Derive what remains useful from authenticated Profile, Cell relation and the continuing thread; ask the first useful question in the conversation and resume from that thread. |
| Work projection | EXTEND | GitHub remains canonical for repository issues/state, but is read-only and cannot preserve a small CZ conversation-originated Cell task, its status/consequence, and its return/resume in this UI. Existing Projects, Commitments, Contributions, Agent Tasks and related governed records have different semantics; repurposing them would distort their meaning. Add only a normalized Cell/Profile/PERSON-linked work item with simple status and source-message lineage. |
| Current canonical CZ state | COMPOSE | Server-side read of canonical `STATE.md` from the public repository, with bounded cached/fail-closed behavior; keep source URL/commit attribution. Never let model output replace canonical state. |
| AI SDK | ADOPT | Pinned `ai@7.0.124` (Apache-2.0), `@ai-sdk/react@4.0.127` (Apache-2.0), `@ai-sdk/gateway@4.0.102` (Apache-2.0). AI SDK v7 drives streaming/tool calls; selected low-cost model `google/gemini-2.5-flash-lite` behind the Gateway adapter. |
| assistant-ui | ADOPT / COMPOSE | Pinned `@assistant-ui/react@0.15.22` and `@assistant-ui/ai-sdk@0.0.8`, MIT. Runtime and thread/composer/message primitives power the conversational Home; CZ-owned normalized persistence stays in Supabase, not Assistant Cloud. |
| Vercel Chatbot template | REFERENCE ONLY | Reuse only current route/streaming/tool patterns. Do not import Auth.js, Neon or Blob because the current Supabase account/storage path is already working. |
| Supabase Realtime | ADOPT only where concretely useful | No custom websocket/event service. MVP conversation is request/stream driven; realtime is unnecessary unless a live Cell/activity view needs it. |
| Vercel | ADOPT / COMPOSE | Reuse isolated Habitat Preview project and protect it. Preserve separate root and legacy production aliases. The Preview already exists; do not create another hosting project. |
| Huly / `@hcengineering/api-client` | MAP / ADAPTER-READY / DO NOT BLOCK | Upstream platform is EPL-2.0 and has typed REST/WebSocket client lineage, but no compatible reachable endpoint is present. Local self-host result remains inconclusive/not habitable for this slice. Do not install the client or revive self-hosting without a reachable instance and concrete Work property. |
| Historical CZ frontend | REFERENCE ONLY | Do not import its UI or revive `/operate`; the user observed the fresh UI and identified its conversation-first gap. |
| Company Core, Dragon Cycle, Execution Fabric, Task Capsule, Result Package | REFERENCE / SELECTIVE REUSE | Keep lineage. Reuse domain meanings and existing adapters only when they directly support a coherent founder workflow; do not port their harness or full product surface. |

## Product consequence

The human observed the V1 Habitat as `PARTIAL`: authentication, Account → Profile →
PERSON, Célula Zero relation and private remote Original Record worked; Home was a
record composer/feed, conversation and onboarding were absent, Profile was static,
Cell was only a card/context, Discover was a placeholder, and continuity was not a
coherent relationship. These observed gaps define the integrated MVP work.

Required boundaries:

`CONVERSATION MESSAGE ≠ ORIGINAL RECORD`

`AI RESPONSE ≠ INTERPRETATION ADOPTED`

`AI PROPOSAL ≠ HUMAN DECISION`

`CONTEXT PACK ≠ MEMORY`

`LOGIN ≠ AUTHORITY`

## Sources checked for implementation

- [AI SDK](https://ai-sdk.dev/docs): current v7 package/docs and stream/UI transport.
- [AI SDK Gateway model library](https://ai-sdk.dev/model-library): current provider/model catalog; select one available low-cost model only after credential availability is verified.
- [assistant-ui AI SDK runtime](https://www.assistant-ui.com/docs/runtimes/ai-sdk/overview): current AI SDK v7 adapter/runtime.
- [assistant-ui custom persistence](https://www.assistant-ui.com/docs/integrations/persistence/custom-adapter): remote thread/message adapter boundary.
- [assistant-ui repository](https://github.com/assistant-ui/assistant-ui): MIT licensing and composable React runtime/components.
- [Huly platform source](https://github.com/hcengineering/platform), [API client docs](https://github.com/hcengineering/huly.core/tree/main/packages/api-client), and [self-host docs](https://docs.huly.io/getting-started/self-host/): platform/source and integration reference only.
- Supabase official changelog/docs checked under the Supabase skill. No change identified that invalidates the existing Auth/Postgres/RLS composition used by the branch.

## Build rule

Use assistant-ui + AI SDK for conversation and streaming rather than implementing a
chat protocol. Use CZ-owned normalized persistence, identity/authority checks,
context selection and explicit institutional record semantics only where existing
capabilities do not preserve the required property. No new vector database, Huly
service, work platform, universal event store or model provider fleet is justified.

## Implementation readback

The first additive migration creates the two normalized conversation tables,
owner-read RLS, server-checked thread/message RPCs and an explicitly human-driven
Profile update RPC. The assembly follow-up adds only `cz_vnext_work_items`,
because the specific conversation → durable attributable work → return/resume
property is absent from compatible existing tables and read-only GitHub. Authenticated
users can read only their own projection; direct writes are revoked, and an RPC
derives the authenticated Profile, exactly one PERSON, Cell membership, current
thread and latest human source message before writing. The Habitat context RPC
returns recent work and Original Records for this authorized identity/Cell.
No separate onboarding state, whole-state/conversation blob, vector database,
Huly service, or AI-provider secret is added. The new migration's remote application
and policy readback are recorded in the Result Package. Supabase's project-wide
advisor has unrelated existing findings; no cleanup outside this Habitat scope
was attempted.

The integrated branch now includes streaming Home, normalized chat history,
context/records/canonical STATE/GitHub tools, conversation-based progressive
entry without a separate onboarding wizard, a Cell work and continuity surface,
an attributable Work projection, inline explicit confirmation for proposed
Work/Original Record/Profile changes, a living Profile view grounded in stored
records, and Activity composed from material records, work and conversations.
The automated local E2E still does not exercise a real online Google session or
model call.
