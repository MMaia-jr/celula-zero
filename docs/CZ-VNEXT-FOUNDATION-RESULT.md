# CZ vNext Foundation V1 — Result Package

Status: `IMPLEMENTED LOCALLY / TESTED / PROMOTED TO DRAFT PR / NOT MERGED / NOT DEPLOYED`

## Promotion and implementation bases

- Canonical documentation PR: #224, merged 2026-09-30.
- Merge commit and main HEAD: `f431552511c82d611d0a99c46587f3016c68e986`.
- Implementation branch/worktree: `build/cz-vnext-foundation-v1-20260930` at `/private/tmp/cz-vnext-foundation-20260930`.
- No implementation commit, push, PR or merge had occurred when this Result Package was prepared. The authorized Draft PR will carry this report. No deploy, remote DB write, paid call or production credential was used.

## Stage 0

Reuse and dependency map: [`CZ-VNEXT-FOUNDATION-STAGE0.md`](CZ-VNEXT-FOUNDATION-STAGE0.md).

In brief: existing Next/React, strict TypeScript, npm workspace and test tools are reused; CZ identity, authority and provenance semantics are adapted into provider-independent domain packages; historical Company Core, Room, Task Capsule, Execution Fabric and schemas remain reference/capability library; old product UI and Huly UI are not imported. Huly has no SDK or live service in this slice. Its candidate adapter reports explicit `PROPERTY_GAP`s. No Huly core modification or fork.

D053 and the accompanying LICENSING.md allowlist reconcile MPL-2.0 coverage for the CZ-authored Foundation software. That licensing Decision is a candidate in the Draft PR and is not canonical until merge. Documentation, generated `next-env.d.ts`, third-party material and unrelated package paths remain outside this extension.

## Foundation delivered

- Fresh mobile-first `Home / Cells / Discover / Activity / You` experience.
- Explicit local Marcos fixture linked to a separate Person, Profile and Founder/Steward relation to Cell `Célula Zero`.
- Editable profile; user-reported Experiences; explicit unverified external profile references.
- Durable Original Records separately attributed from Experience/Profile projections.
- Same-Cell role authorization for purpose edits; revocation and ambiguous identity fail closed.
- Local SQLite storage through a CZ Storage contract; atomic serialized writes and HTTP request idempotency; hashed, revocable, expiring local sessions; same-origin write checks; no remote credentials.
- JSON snapshot export for authorized local context.
- A provider-neutral Platform Contract and Huly classification stub. Unsupported platform functions fail with `PROPERTY_GAP`; no successful Huly persistence is simulated.
- Discover, live identity, outside research, AI, collaboration, background jobs and external storage are clearly not connected.

The local “Enter as Marcos” button loads only the explicitly authorized developer fixture. It is not signup, verified identity, production auth or a hosted institution. The data file is local and survives restart; direct operator tampering, multi-user authorization, cross-device sync and production recovery are not solved.

## Validation

Executed with Node `v24.19.0` and npm 11:

- `npm run check:vnext` — PASS: ESLint, TypeScript strict check, 22 Vitest tests and optimized Next.js production build.
- `npm run test:vnext:e2e` — PASS: 4 Playwright runs across desktop and iPhone-sized mobile. Full enter → intention → profile → Experience → reload → Cell update → JSON export → logout → return journey, plus anonymous write, foreign Origin and spoofed-record rejection. No page errors; no mobile horizontal overflow.
- `git diff --check` — PASS.
- Browser visual review — useful Home renders in desktop and 390px mobile viewport; no Next error overlay.

These checks establish a local product foundation path and tested invariants. They do not establish production security, external identity, habitability for other people, automatic institutional memory, adoption, Huly integration, or Essenthius implementation.

## Next gate

`HUMAN REVIEW OF LOCAL FOUNDATION DIFF → DECIDE REVISE / ACCEPT / STOP`

Until a separate promotion direction, implementation stays isolated and unpromoted.
