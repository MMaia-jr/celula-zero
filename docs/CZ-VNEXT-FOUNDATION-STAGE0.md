# Foundation V1 — Stage 0 and implementation boundary

Canonical base: `f431552511c82d611d0a99c46587f3016c68e986` (D052, PR #224).
Implementation branch: `build/cz-vnext-foundation-v1-20260930`.
Authority: Phase B in the active Human conversation and WP-CZ-VNEXT-FOUNDATION-V1.

## Reuse map

| Classification | Finding                                                                                                       | Use                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| REUSE          | npm workspaces, Node 24/npm 11, Next 16.3.5, React 19.2.8, strict TypeScript, ESLint, Vitest, Playwright, Zod | Existing runtime/tool versions; no old UI import. Root legacy commands unchanged.                                   |
| ADAPT          | uniqueControlledPersonActor / Genesis actor resolution                                                        | Fail closed on zero/ambiguous identity bindings; provider subject distinct from Person ID. No legacy module import. |
| ADAPT          | participation does not grant role/delegation/membership; contextual authority                                 | Explicit active membership plus same-Cell role authority; revoke/expiry checks.                                     |
| ADAPT          | preproject originals and provenance distinctions                                                              | Immutable original entries and separate profile/experience projections, atomic with persistence.                    |
| REFERENCE ONLY | Company Core, Room, AI Job plane, Task Capsule, Result Package, export                                        | Preserved capability library; no hidden runtime requirement for Foundation.                                         |
| REFERENCE ONLY | Huly/Platform Collective architecture, Doc/Space and API client                                               | Candidate mappings behind platform contract; no SDK copied or vendor types in domains.                              |
| DO NOT IMPORT  | historical app pages/components, /operate, Genesis Console, Huly UI                                           | Fresh product surface.                                                                                              |
| DO NOT IMPORT  | old Supabase schema, production credentials, model workers                                                    | No database migration, provider execution or Docker required.                                                       |

## Readback and licensing

CZ originally has only apps/web as npm workspace. Its strict compiler includes
noUncheckedIndexedAccess and exactOptionalPropertyTypes; Foundation keeps these.
D032 licensing did not cover the new paths by implication. D053 now records Human
Direction to extend MPL-2.0 only to the explicit Foundation source/configuration
allowlist in LICENSING.md. D053 and that reconciliation are candidates in the current
Draft PR, not canonical until merge. General documentation, generated next-env.d.ts and
third-party material remain excluded. No repository-wide MPL or EPL claim is made.

Huly local checkout inspected: c0939fcd4f69576780a63714c61f8a4138666dca.
Read-only current upstream: https://github.com/Platform-Collective/platform and
https://github.com/hcengineering/huly.core/tree/main/packages/api-client (2026-09-30).
Rush monorepo separates foundations/core, models, plugins, server-plugins and services.
Local core package 0.7.26 and api-client 0.7.19 declare EPL-2.0. Their TypeScript/Svelte
runtime differs from CZ Next/React; no forced runtime merge. Public API primitives do
not establish CZ authority, append-only behavior, atomicity or a working deployment.

## Exact write scope declared before implementation

- package.json / package-lock.json: additive workspaces and vNext commands.
- apps/cz-web/\*\*: fresh app, local server adapter, orchestration, tests, runbook.
- packages/{identity,presence,cells,authority,records,platform-contract,platform-huly}/\*\*.
- docs/CZ-VNEXT-FOUNDATION-STAGE0.md and docs/CZ-VNEXT-FOUNDATION-RESULT.md.

No apps/web edits, canonical Decision edits, schema changes, Huly core patches, remote
writes, production infrastructure or implementation promotion.

## Runtime choice

The observed property required is local durable Foundation state across process restarts,
with no remote credentials, Docker repairs or external effects. Node 24 node:sqlite
provides that storage without a new service or dependency. It is a local adapter behind
CZ Storage, not the selected online/production backend. Single writer transactions,
server session tokens, request idempotency and original/projection writes share the
local persistence boundary. Direct database/operator tampering is outside this bound.

## Dependency graph

apps/cz-web (composition / HTTP / fresh UX)
-> identity
-> presence -> identity + records
-> cells -> identity
-> authority -> cells + identity
-> records -> identity
-> local SQLite adapter -> platform-contract
platform-huly -> platform-contract (candidate and explicit gaps only)

No domain-to-provider dependency or cross-module SQL. Unneeded architecture modules are
not empty package scaffolds. UI, event display and sanitized operational error handling
remain app-local until there is a second consumer.

## Huly classification

Identity: MAP (explicit Account-to-Person binding gap).
Documents/records: PLUGIN (model registration, permissions, append-only gap).
Realtime: MAP (authenticated subscriptions not exercised).
Files: SERVICE (no configured authorized storage client).
Other Platform Contract ports: unimplemented; no false success.
CORE PATCH: none. Live Huly backend is not claimed.
