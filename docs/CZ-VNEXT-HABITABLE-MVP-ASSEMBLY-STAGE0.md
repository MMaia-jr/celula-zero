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
| Progressive onboarding state | EXTEND only if required by actual UI | No compatible resumable onboarding projection exists. If first-entry guidance cannot be reconstructed from existing Profile/relations and thread state, add a minimal per-Person/per-Cell state row; ask only unresolved prompts. |
| Work projection | MAP / COMPOSE first | Read canonical public GitHub CZ state through a read-only adapter. No Huly endpoint is connected. Add only a small Cell-linked Work projection if GitHub does not represent the in-product human work/continuation needed for the MVP. |
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

The applied additive migration creates the two normalized conversation tables,
owner-read RLS, server-checked thread/message RPCs and an explicitly human-driven
Profile update RPC. No whole-state or whole-conversation blob, vector database,
Work table, Huly service, or AI-provider secret was added. Supabase readback
confirmed RLS and owner policies on both tables; only authenticated users receive
table SELECT, while writes flow through identity-derived RPCs. Supabase's project
wide advisor reported existing unrelated security/performance findings; no
cleanup outside this Habitat scope was attempted.

The integrated branch now includes streaming Home, normalized chat history,
read-only context/records/canonical STATE/GitHub work tools, an explicit Original
Record form, a user-edited Profile surface, a Cell context with canonical open
GitHub issues, and an Activity view separating chat from Original Records. The
automated local E2E still covers the preserved fixture path, not real online auth.
