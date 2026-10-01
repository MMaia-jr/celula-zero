# CZ vNext — Habitable MVP Assembly Result

Date: `2026-09-30`

OAuth follow-up: `2026-10-01`

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
  open GitHub issues alongside in-product work, relevant records and a direct
  conversation continuation entry. Activity composes material chat references,
  Original Records, Work changes and Profile changes from existing sources;
  empty Discover navigation is removed.
- The founder allowlist remains server-side configuration. Email, Auth Account,
  Profile and PERSON remain distinct. No client-provided actor or authority ID
  is trusted.
- Progressive entry derives known identity, Profile and Cell relation, then
  asks only the first useful unresolved question in the existing conversation;
  it does not add a separate onboarding state machine/table.
- AI action tools return proposals without writing. assistant-ui renders those
  proposals inline; an explicit human confirmation calls a same-origin server
  action, where Auth, PERSON and Cell authority are resolved again. The durable
  result is returned into the same thread. Conversation messages remain distinct
  from Original Records and Profile projections.
- A small normalized Work projection is the only new domain table in this follow-up.
  It preserves `conversation → durable attributable work → return/resume`, which
  the read-only GitHub adapter and existing governed Project/Commitment/Contribution/
  Agent Task tables do not represent without semantic distortion. It is scoped to
  Profile/PERSON/Cell/thread/source-message lineage, has owner-read RLS, revoked
  direct writes and an authority-resolving RPC. No project-management system is added.

The existing `decision_records` / `domain_decisions` require specific governed
targets and authority semantics. A conversation proposal is not sufficient to
create one, so this tranche does not synthesize Decision records or bypass their
existing authority path.

## Schema

The conversation migration is
`supabase/migrations/20260930193553_cz_vnext_habitable_mvp_conversation.sql`.
The Work follow-up migration is
`supabase/migrations/20261001101048_cz_vnext_habitable_mvp_work.sql`. It adds the
single normalized Work table, owner-read RLS and an RPC that resolves authenticated
identity, Cell membership and source lineage server-side; it also extends the
context RPC with relevant recent Work. The first migration was applied only to
the already authorized project `pvhbrpnclxjqnkdijkfi`; its schema/policy readback
confirmed constraints, RLS and owner-read policies. The Work follow-up was also
applied to that authorized project. Readback confirmed the normalized columns and
foreign keys, `relrowsecurity=true`, one authenticated owner-read policy, and
SECURITY DEFINER RPCs executable by authenticated users but not `anon`. Direct
table writes remain revoked. Neither migration creates a whole-state blob, vector
DB, public signup or production storage abstraction. Project-wide advisor output
includes unrelated existing findings; this branch does not attempt unrelated
cleanup.

## Verification so far

- `npm run check:vnext`: PASS — lint, TypeScript, 32 Vitest tests and optimized
  production build after the Habitable MVP assembly changes.
- `npm run test:vnext:e2e`: 6/6 PASS on desktop/mobile, including Google as the
  normal login action and the collapsed email-link fallback, preserved local
  Foundation fixture journeys, and anonymous-write/CSRF boundaries. This does
  not complete a real online Google auth, model/tool confirmation or cross-session
  conversation/Work journey and does not prove Human habitability.
- GitHub CI: web/domain/portability PASS; PostgreSQL migration reset, pgTAP
  authorization tests and authenticated local Habitat journey PASS.
- Dedicated Vercel deployment `dpl_A7aNhPAAXyRYhdiAEWq94MJ5Gpqj` is Ready as a
  Preview. Vercel's branch alias is
  `https://cz-vnext-internal-online-habitat-v-git-8ae53e-marcosmaiajr-8127.vercel.app`.
  The alias was read back from Vercel and served `/login`; the root route
  redirected an unauthenticated request to `/login`. Vercel SSO protection is
  still enabled.
- Preview environment metadata includes `CZ_HABITAT_MODE`, `CZ_FOUNDER_EMAIL`,
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; values
  were not printed. `NEXT_PUBLIC_SITE_URL` is not set, so the callback URL uses
  Vercel's branch URL. The current branch alias is stable for this branch.
- The first Google sign-in on this branch has not yet been completed. The
  Auth Account → Profile → PERSON post-login readback, Gateway OIDC,
  actual model streaming/cost, remote chat/Work writes and cross-browser
  continuation remain unverified on this branch. No model call/cost has been
  observed in this assembly run.
- `DEPLOYMENT PASS ≠ HUMAN HABITABILITY PASS`.
- `HUMAN HABITABILITY ≠ HUMAN ACCEPTANCE`.
- `PREVIEW READY = READY FOR HUMAN USE`; it does not mean the online journey was
  independently authenticated or accepted.

## Promotion boundary

The implementation branch, Preview and Draft PR are authorized for review.
Implementation merge is not authorized. PR #227 remains open as preserved
partial implementation lineage. No external outreach, Economy, Essenthius
expansion, Huly integration or production deployment is claimed here.

## 2026-10-01 — Google OAuth primary login

- Supabase Auth is read back as `external.google=true` and `disable_signup=true`
  for the authorized project `pvhbrpnclxjqnkdijkfi`.
- The login page now uses Supabase `signInWithOAuth({ provider: "google" })` as
  its primary action. The existing SSR/PKCE `/auth/callback` and
  `exchangeCodeForSession` remain; the server-side founder allowlist is still
  checked after exchange. The email link remains a collapsed fallback and
  retains `shouldCreateUser: false`.
- The server passes the configured founder email only as a Google `login_hint`;
  source contains no founder address. Google identity is not treated as the
  Auth Account, Profile, or PERSON. Supabase automatic identity linking uses a
  matching verified email ([identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking));
  the app does not create or map those records from a Google identity.
- The normal-use E2E verifies the visible Google primary action and that the
  manual-email fallback stays collapsed by default. It does not complete Google
  consent or a founder session. Post-login identity/count readback remains
  pending Marcos's first sign-in through the Preview.
