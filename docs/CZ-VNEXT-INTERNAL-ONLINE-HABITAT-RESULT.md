# CZ vNext — Internal Online Habitat V1 / Result Package

Status: `IMPLEMENTATION CANDIDATE / DRAFT PR REVIEW`; implementation merge is not authorized.

Canonical base: `b5ee3d1b7ef4951b53cff1ff7e88d0f5802bbea7` (PR #226 readback).
Implementation branch: `build/cz-vnext-internal-online-habitat-v1-20260930`.

## Implemented in this candidate

- The existing Supabase Auth project is reused. Email OTP is restricted by a
  server-side, rotatable `CZ_FOUNDER_EMAIL` environment variable and uses
  `shouldCreateUser: false`; email is a bootstrap credential, not a Person ID.
- Each online request resolves the authenticated account to its Profile and exactly one
  `PERSON` Actor through the existing durable membership. Missing or ambiguous identity
  or the current `cell-zero` relationship fails closed.
- The online route uses the fresh `apps/cz-web` interface, automatically reconstructs
  the founder context, and supports a private intention entry and return. The local
  fixture is reachable only with its explicit local flag on a loopback host.
- Migration `20260930172832_cz_vnext_internal_habitat_records.sql` adds only
  `public.cz_vnext_original_records`, an append-only normalized Original Record table,
  with owner-scoped RLS and identity-resolving RPCs. The project’s preproject and cycle
  record tables remain untouched.
- A dedicated Vercel project points to `apps/cz-web`; the two existing Vercel projects
  and their root/build configuration remain unchanged. Auth and public Supabase
  configuration are set for Preview only. The callback uses the deployment branch URL.

## Verification and boundaries

- `git diff --check`: pass.
- lint: pass.
- TypeScript: pass.
- Vitest: 26 passed (23 existing + 3 bootstrap/fixture-boundary checks).
- production build: pass.
- local Playwright: 4/4 existing Foundation journeys pass across desktop and mobile;
  these exercise the local fixture path, not real online authentication.
- The database pgTAP test is committed in the candidate but could not run locally:
  `127.0.0.1:54322` has no local database and Docker API access became unresponsive.
  Remote migration application succeeded and readback confirms the intended RLS/grants.
- No real OTP was sent, no Habitat record was written during agent verification, and no
  cross-device Human journey has been performed. Supabase Auth redirect allowlist and
  end-to-end magic-link completion still require confirmation against the resulting
  Preview URL.
- Deployment/technical checks do not constitute Human acceptance, habitability, or
  usefulness. No implementation merge is included or authorized.

## Current result

`FOUNDATION IMPLEMENTATION = LOCALLY VERIFIED`

`REMOTE HABITAT STORAGE = ADDITIVE MIGRATION APPLIED / SECURITY READBACK PASS`

`ONLINE HUMAN HABITABILITY = NOT YET VERIFIED`

Next gate: obtain a healthy protected Preview, then Marcos performs normal email-link
login, records an intention, closes, and returns from another browser/device to confirm
attributed continuity. Marcos decides accept / repair / reject.
