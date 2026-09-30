# CZ vNext — Habitable MVP Assembly Result

Date: `2026-09-30`

## Canonical and implementation lineage

- D055 is canonical through documentation PR #228, merged as
  `4049175952e29c524b2b0d2982dd2bc5aefe75a7`.
- Implementation branch: `build/cz-vnext-habitable-mvp-assembly-20260930`.
- PR #227's single reusable implementation commit was cherry-picked as
  `157e06b`; PR #227 remains partial, reusable, unaccepted by Marcos and unmerged.
- This branch is an integrated candidate. It is not merged and has not received
  Human Acceptance.

## Adopted and composed

- Pinned Vercel AI SDK v7 and the Vercel AI Gateway adapter, currently selecting
  `google/gemini-2.5-flash-lite` as one replaceable, low-cost model.
- Pinned assistant-ui React runtime and AI SDK adapter for the conversation
  surface. Durable history remains in CZ/Supabase; Assistant Cloud is not used.
- Reused Supabase Auth, Profile, PERSON, Cell membership, Cell context and the
  existing private Original Record RPC.
- Reused public canonical GitHub STATE and open Issues as read-only state/work
  sources. No GitHub mutations are made.
- Huly remains disconnected because no reachable endpoint was found; no local
  Huly Core self-host, fork or patch is part of this branch.

## Implemented candidate experience

- Home presents a continuing assistant-ui conversation, with AI SDK streaming,
  bounded institutional context reconstruction and read-only tools for identity,
  recent Original Records, canonical public STATE and public Cell work.
- `cz_vnext_threads` and `cz_vnext_messages` persist a continuing conversation
  as attributable individual messages. Human messages resolve to the server-
  derived PERSON; AI messages store provider/model, response ID and token counts
  where supplied. RLS restricts reads to the authenticated Profile; server RPCs
  mediate writes.
- AI can propose a private Original Record or Profile change, but those proposal
  tools do not mutate institutional state. Marcos explicitly saves an Original
  Record in the dedicated form or edits his Profile in You.
- Cell shows Marcos's existing membership, current CZ direction and read-only
  open GitHub issues. Activity separates chat from Original Records. Empty
  Discover navigation is removed.
- The founder allowlist remains server-side configuration. Email, Auth Account,
  Profile and PERSON remain distinct. No client-provided actor or authority ID
  is trusted.

The existing `decision_records` / `domain_decisions` require specific governed
targets and authority semantics. A conversation proposal is not sufficient to
create one, so this tranche does not synthesize Decision records or bypass their
existing authority path.

## Schema

The additive migration is
`supabase/migrations/20260930192026_cz_vnext_habitable_mvp_conversation.sql`.
It adds two normalized tables, ownership RLS and server-checked RPCs for opening
the founder's continuing thread, appending attributable messages and explicitly
editing the authenticated owner's Profile. It adds no generic state/conversation
JSON blob, vector DB, Work table, or public signup. It was applied only to the
already authorized Supabase project `pvhbrpnclxjqnkdijkfi`; remote readback
confirmed constraints, RLS, owner-read policies and authenticated-only writes.
Project-wide advisor output included unrelated pre-existing findings; this
branch did not attempt unrelated cleanup.

## Verification so far

- `npm run check:vnext`: PASS — lint, TypeScript, 28 Vitest tests and optimized
  production build.
- `npm run test:vnext:e2e`: 4/4 PASS on desktop/mobile, exercising the preserved
  local Foundation fixture journey and anonymous-write/CSRF boundaries. This is
  not an online-auth/chat journey and does not prove Human habitability.
- The model provider, Vercel OIDC availability, deployed streaming, remote
  conversation persistence and cross-browser continuation remain to be checked
  on the isolated Preview. No model call/cost has been observed yet.
- `DEPLOYMENT PASS ≠ HUMAN HABITABILITY PASS`.
- `HUMAN HABITABILITY ≠ HUMAN ACCEPTANCE`.

## Promotion boundary

The implementation branch, Preview and Draft PR are authorized for review.
Implementation merge is not authorized. PR #227 remains open as preserved
partial implementation lineage. No external outreach, Economy, Essenthius
expansion, Huly integration or production deployment is claimed here.
