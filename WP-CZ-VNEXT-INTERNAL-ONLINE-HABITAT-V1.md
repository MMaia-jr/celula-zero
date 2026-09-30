# WP-CZ-VNEXT-INTERNAL-ONLINE-HABITAT-V1

Status:

`HUMAN EXECUTION AUTHORIZED / IMPLEMENTATION MERGE NOT AUTHORIZED`

Decision dependency:

`D054 / CZ VNEXT INTERNAL ONLINE HABITAT V1`

Canonical Foundation:

`PR #225 / ae88780505576cfc8a0866aae8dc4cd20e19cf18`

## Mission

Make the existing CZ vNext Foundation normally usable online by Marcos. The outcome is
one complete human path, not another isolated capability demonstration:

`NORMAL ONLINE URL → REAL AUTH → AUTH ACCOUNT→PROFILE→PERSON → CONTEXT → NORMAL HUMAN ACTION → ATTRIBUTED AUTHORIZED REMOTE WRITE → CLOSE → RETURN FROM ANOTHER DEVICE → CONTINUITY`

This Work Packet does not claim external-user utility, adoption or scale.

## Stage 0 — read existing capability before changes

Before architecture, migrations or application writes, inspect and document the current
repository and authorized remote project. Classify at least:

| Capability | Required classification question |
| --- | --- |
| Supabase Auth | ADOPT / COMPOSE: can it provide founder-only normal authentication? |
| `profiles` | MAP: does its Auth Account ownership and shape preserve Profile semantics? |
| PERSON Actor | MAP: can Auth Account resolve to exactly one distinct PERSON? |
| actor membership | MAP: can the Founder/Steward relation be reconstructed durably? |
| Cells | MAP: can the Célula Zero context be reconstructed without changing historical meaning? |
| participation / authority | MAP: does durable CZ authority—not login—authorize each write? |
| Original Records / existing record classes | MAP / REFERENCE ONLY: are their meanings and constraints compatible? |
| Experience persistence | EXTEND only if no compatible durable representation exists. Name the lost property. |
| Vercel deployment | ADOPT / COMPOSE: can the existing project preview the fresh `apps/cz-web` experience? |
| old auth code | REFERENCE ONLY / REUSE selected patterns only after review. |
| old UI | DO NOT IMPORT as the Habitat product experience. |
| Huly candidate adapter | REFERENCE ONLY; leave explicit `PROPERTY_GAP`s. |

Write the reuse map before migration or app implementation. For every EXTEND/MISSING item
state the concrete Habitat property that would be lost without it. If no concrete loss is
identified, do not build it. Inspect `pvhbrpnclxjqnkdijkfi` first; do not create another
Supabase project absent a concrete property need.

## Authentication and identity

- Prefer existing Supabase Auth and Auth → Profile → PERSON semantics.
- Do not expose unrestricted public signup to bootstrap Marcos. Use a founder-only
  allowlisted email magic-link/OTP flow; account creation is permitted only after the
  submitted email matches server-side deployment configuration.
- Never hard-code private founder email or secrets in source. Use only a current
  publishable key client-side; never expose a service-role/secret key.
- Resolve Auth Account → exactly one Profile → exactly one PERSON, preserving their
  conceptual distinction even if an inherited table relationship shares a UUID.
- Fail closed for missing/malformed Profile, zero or ambiguous PERSON, or unreconstructable
  authority.
- Authentication provides identity/session only. Server-side authority is reconstructed
  from durable CZ relationships. Ignore client-supplied actor, authority or verification
  claims.

## Remote durable state

- Do not move the SQLite whole-state JSON object into Postgres or treat it as the
  authoritative remote model.
- Preserve `FOUNDATION WHOLE-STATE TRANSACTION ≠ PLATFORM STORAGE CONTRACT`.
- Reuse existing normalized tables only where the institutional semantics genuinely fit.
  In particular, do not repurpose `preproject_records` as a universal record store.
- If necessary, create the smallest additive normalized migration for Habitat semantics
  such as durable Experience and attributable Original Record, with UUIDs, attribution,
  visibility, source links, constraints and RLS. Do not add a generic event platform or
  universal reputation score.
- Use repository migrations and the controlled Supabase migration workflow. Before any
  remote migration: validate locally, review the complete SQL diff and additive scope,
  apply only to project `pvhbrpnclxjqnkdijkfi`, then read back schema, grants and policies.
- Enable RLS on exposed tables and verify both allowed founder access and denied
  unauthorized access. Never use user-editable Auth metadata for authorization.

## Normal human experience

Keep the fresh `apps/cz-web` experience and navigation `Home / Cells / Discover / Activity / You`.

- Replace the local Marcos fixture as the online entry path with `Entrar na Célula Zero`.
- After authentication, reconstruct Marcos's Profile, Célula Zero, legitimate authority
  and relevant durable records automatically.
- Support an ordinary human action: create an intention or Experience, with attributable
  Original Record and projection persisted remotely.
- Hide provider details, UUIDs, table names, actor selection, manual record selection and
  technical workspace identifiers from the human path.
- Support entering, acting, logout/close and return from another browser/device with the
  same attributable state.

## Deployment boundary

An implementation branch, push, Draft PR, preview/internal deployment and environment
configuration are authorized as needed for Human use. Inspect existing Vercel project
root/configuration first; make only the minimum documented adjustment required to serve
`apps/cz-web`, preserving old deployment lineage. Do not commit secrets.

Production deployment is permitted only if actually necessary for the authorized internal
experience and must be explicitly reported. A healthy preview is not Human Acceptance.

## Required verification

- Auth: wrong founder identity cannot bootstrap; legitimate founder auth resolves exactly
  one Profile and PERSON; missing/ambiguous binding fails closed; client cannot spoof
  actor/authority; login alone grants no arbitrary Cell authority.
- Persistence: Experience/intention survives server restart and logout/login; remote
  readback preserves attribution and projection; no whole-Foundation JSON blob is needed.
- RLS: authorized reads/writes succeed; unauthorized access is denied; no secret is
  returned to the client; old fixture path is not active online.
- End-to-end: online auth → ordinary write → logout → fresh browser context → auth → same
  state. Test desktop and mobile viewport where practical.
- Run applicable lint, typecheck, unit/contract tests, build and E2E. Report local and
  remote checks distinctly.

## Stop and human gate

After a healthy, usable preview and verification, stop building and give Marcos the
ordinary URL/path. Record separately:

`DEPLOYMENT PASS ≠ HUMAN HABITABILITY PASS`

Wait for Marcos to use it, close it, return from another device and report accept/repair/
reject. Do not invent this result. Do not merge the implementation branch without a new
Human Review. No Huly Core patch/fork, external outreach, Essenthius implementation,
Economy, token/DAO or unrelated architecture expansion is in scope.
