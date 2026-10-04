# CZ vNext — Internal Online Habitat V1 / Stage 0 Readback

Date: `2026-09-30`
Canonical base: `b5ee3d1b7ef4951b53cff1ff7e88d0f5802bbea7`
Branch: `build/cz-vnext-internal-online-habitat-v1-20260930`

This readback was completed before Habitat application changes or database migrations.
Remote database inspection was read-only. The only preceding remote write was the
explicitly authorized documentation promotion in PR #226.

## Existing capability map

| Capability | Classification | Readback and bounded use |
| --- | --- | --- |
| Supabase Auth | ADOPT / COMPOSE | Existing active project `pvhbrpnclxjqnkdijkfi` in `us-east-2`. The current read finds one Auth Account. The pre-execution handoff reported zero; current state supersedes that earlier observation. Use cookie-backed email OTP and existing Auth. Do not add another identity provider. |
| `public.profiles` | MAP | Existing row is keyed by an FK to `auth.users(id)` and carries `display_name`, `handle`, `bio`, and `visibility`. Resolve the row by the authenticated account; keep Profile distinct from Auth Account and Bio. |
| PERSON Actor | MAP | Current read finds one `PERSON` Actor associated to the Profile through `actor_memberships` (`OWNER`). The app must require exactly one such mapping at runtime and fail closed otherwise. The Auth UUID is not treated as the Actor ID. |
| `actor_memberships` | ADOPT / MAP | Existing authenticated-self read policy and Profile-to-Actor relation provide identity binding. This relation alone is not Cell authority. |
| Cells | MAP | Existing `cell-zero` / `Célula Zero` can be reconstructed; current Cell RLS permits this Profile to read it through an active Cell-scoped role assignment. |
| Cell participation / authority | MAP | `cell_participations` currently has zero rows. The mapped PERSON has an active `CELL_MEMBER` assignment scoped to `cell-zero` and an active `PROJECT_STEWARD` assignment for a project. Preserve these meanings; do not promote `CELL_MEMBER` or login into Founder/Steward authority. The Habitat action is a personal Experience and requires the authenticated PERSON's own authorship, not Cell mutation authority. |
| Existing record classes | REFERENCE ONLY | `preproject_records` contains three rows and is explicitly preproject-specific with append-only semantics. `cycle_records` requires a Dragon Cycle and phase context. Neither is a compatible generic Original Record / Experience store. Do not reinterpret either. |
| Experience persistence | EXTEND | No existing `public.experiences` table or vNext remote projection exists. Without an attributable normalized Original Record and linked Experience, the human's action cannot be reconstructed after logout or on another device. A small additive pair of vNext tables is justified; no whole-Foundation JSON blob. |
| Vercel project `celula-zero` | REFERENCE / PRESERVE | Existing Project ID `prj_gvw5k234USjhdDEgPRN2wDXIhWzB`, root `.`, Next.js, output `apps/web/.next`. It serves the historical app. Do not repoint this production project to vNext. |
| Vercel project `celula-zero-genesis-mmaia-jr` | REFERENCE / PRESERVE | Existing root `.`, Next.js, default output; it is also not configured for `apps/cz-web`. Do not repurpose its existing deployment lineage. |
| Vercel Habitat deployment | COMPOSE | A dedicated project scoped to `apps/cz-web` is required to deploy the fresh app while preserving the two existing project configurations. The monorepo root lockfile/workspaces and `packages/*` are outside that app directory, so Vercel's “Include source files outside of Root Directory” must be enabled. This is a bounded deployment project, not a new CZ runtime service. |
| Old auth code | REUSE SELECTED PATTERNS | `apps/web/lib/supabase/server.ts`, `/auth/callback`, `proxy.ts`, and `apps/web/app/login/actions.ts` demonstrate Supabase SSR cookies and PKCE code exchange. Reuse only those patterns. Existing login sets `shouldCreateUser: false`; it is reference code, not the new UI. |
| Old UI | DO NOT IMPORT | `apps/web` remains lineage. The Habitat continues the fresh `apps/cz-web` experience and normal navigation. |
| Huly candidate adapter | REFERENCE ONLY | It remains disconnected with explicit `PROPERTY_GAP`s. No Huly SDK, core patch, or role authority is introduced. |

## Remote identity and authority readback

Read-only queries to `pvhbrpnclxjqnkdijkfi` returned one `auth.users` row, one Profile,
one `PERSON` Actor, one `actor_memberships` relation, one Cell, zero
`cell_participations`, two `role_assignments`, and three `preproject_records`. The current
Profile display label is `marcosmaiajr`; the Auth email was not copied into source or this
report. The Profile maps to exactly one PERSON through `actor_memberships`, and that
PERSON currently has Cell access through `CELL_MEMBER`. Runtime code must resolve the
mapping from the authenticated session rather than rely on these observed counts or IDs.

The existing auth-user trigger creates Profile, PERSON Actor, and `OWNER` membership for
new Auth Accounts. Do not change that historical trigger in this slice. Online login is
founder-only through server-side `CZ_FOUNDER_EMAIL` configuration and must not expose
unrestricted signup. Since an Auth Account already exists, the normal return path uses
`shouldCreateUser: false`; if the configured founder identity does not match the existing
account, stop and report the mismatch rather than create another account or change Auth
settings silently.

## Remote data decision

No current normalized table preserves the user's exact private intention as a vNext
Original Record. `preproject_records` and `cycle_records` stay untouched. The minimal
additive scope is only:

- a private append-only vNext `OriginalRecord` table, attributed to both Profile and
  PERSON Actor;
- an authenticated operation that resolves `auth.uid()` to exactly one Profile/PERSON
  and stores the exact intention once;
- row policies that restrict read/write to that Profile/PERSON relation and keep private
  Experience state private.

The exact additive migration is tracked as
`20260930172832_cz_vnext_internal_habitat_records.sql`. It has been applied only to
`pvhbrpnclxjqnkdijkfi`; the readback confirms RLS enabled, one owner-read policy,
authenticated SELECT but no direct INSERT, authenticated-only checked RPC, and no anon
table/RPC access. The migration SQL was accepted successfully by the remote PostgreSQL
engine. The repository pgTAP migration test is written, but could not run locally because
there is no local database on port 54322 and Docker API access stalled; it still requires
an executable test run before acceptance.

## Deployment readback

Both existing Vercel projects are configured around the root `.` and old app. The
connected Vercel integration created an automated production deployment after the
authorized documentation PR #226 merged; its observed target was `apps/web` under the
existing root/output settings. No manual deploy was performed. This automatic effect is
recorded separately from Habitat deployment and Human acceptance.

The dedicated Habitat Vercel project must use `apps/cz-web` as its root, Node `24.x`,
the root workspace lockfile, and access to shared CZ packages outside the app directory.
It will be linked to the existing Git repository for a branch Preview; production
configuration and aliases of both legacy projects remain untouched. Use exact Habitat
Preview environment values only, including the existing Supabase project URL and a
non-disabled publishable key; keep `CZ_FOUNDER_EMAIL` server-side and never commit
secrets. Supabase Auth redirect URLs must be restricted to the Habitat Preview callback
and local development.

## Documentation checked

- Supabase current passwordless email and Next.js SSR guidance: [email OTP / magic link](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Next.js SSR client](https://supabase.com/docs/guides/auth/server-side/nextjs).
- Supabase changelog through 2026-09-30: the 2026-09-25 PostgreSQL 17.11 notice concerns `ltree`, `pgcrypto` legacy PGP ciphers, `btree_gist` float indexes, and custom operators. The project reports PostgreSQL 17.6.1.155; no engine upgrade or unrelated database repair is part of this Habitat.
- Vercel monorepo guidance: [monorepos](https://vercel.com/docs/monorepos/monorepo-faq) and [build configuration](https://vercel.com/docs/builds/configure-a-build). Separate app roots are separate projects; shared workspace sources outside `apps/cz-web` require the corresponding root-directory setting.

## Stop boundary

This Stage 0 result justifies the dedicated Habitat deploy project and a small normalized
remote Experience extension. It does not authorize changes to historical table meaning,
Cell authority, old UI, Huly, Essenthius, Economy, or the legacy Vercel projects. The
implementation remains isolated and must stop at usable Preview + verification + Draft
PR for Human Review; implementation merge remains unauthorized.
