# Célula Zero — Licensing Map

Status:

`D032 / PHASE-1 MIXED LICENSING`

Authority:

`decisions/D032-human-adopts-phase1-mpl-software-licensing.md`

This repository does **not** have one repository-wide license.

Célula Zero uses an explicit mixed-licensing boundary. The Phase-1 software
scope below is made available under the Mozilla Public License 2.0 (`MPL-2.0`)
to the extent the relevant Contributor has rights that are Licensable under
that license.

Full license text:

`LICENSES/MPL-2.0.txt`

## 1. MPL-2.0 Phase-1 software scope

The following repository paths are designated as the Phase-1 Célula Zero
software scope:

- `apps/web/**`
- `supabase/**`
- `scripts/**`
- `tools/**`
- `.github/workflows/**`
- `package.json`
- `package-lock.json`
- `.env.example`
- `.nvmrc`

For the covered scope, the following MPL notice applies:

> This Source Code Form is subject to the terms of the Mozilla Public License,
> v. 2.0. If a copy of the MPL was not distributed with this file, You can
> obtain one at https://mozilla.org/MPL/2.0/.

For new source files in this scope, prefer
`SPDX-License-Identifier: MPL-2.0` where the file format supports an
appropriate comment.

Existing files do not need to be mass-edited solely to add SPDX headers in
Phase 1.

## 2. CZ-authored vNext Foundation software — D053 candidate scope

This section records the Human Direction in
`decisions/D053-human-extends-phase1-mpl-scope-to-cz-vnext-software.md`.
In the current implementation branch it is a candidate canonicalization for
Draft PR review. It is not canonical until merged. If accepted and merged, the
D032 MPL-2.0 software scope is extended only to the following CZ-authored
Foundation V1 source and executable configuration files:

- `apps/cz-web/app/**/*.ts`
- `apps/cz-web/app/**/*.tsx`
- `apps/cz-web/app/**/*.css`
- `apps/cz-web/components/**/*.tsx`
- `apps/cz-web/e2e/**/*.ts`
- `apps/cz-web/tests/**/*.ts`
- `apps/cz-web/lib/**/*.ts`
- `apps/cz-web/eslint.config.mjs`
- `apps/cz-web/next.config.ts`
- `apps/cz-web/playwright.config.ts`
- `apps/cz-web/vitest.config.ts`
- `apps/cz-web/package.json`
- `apps/cz-web/tsconfig.json`
- `packages/identity/package.json` and `packages/identity/src/**/*.ts`
- `packages/presence/package.json` and `packages/presence/src/**/*.ts`
- `packages/cells/package.json` and `packages/cells/src/**/*.ts`
- `packages/authority/package.json` and `packages/authority/src/**/*.ts`
- `packages/records/package.json` and `packages/records/src/**/*.ts`
- `packages/platform-contract/package.json` and `packages/platform-contract/src/**/*.ts`
- `packages/platform-huly/package.json` and `packages/platform-huly/src/**/*.ts`

This is an explicit allowlist of the software introduced for this Foundation,
not a grant for `packages/**` or `apps/cz-web/**` generally. The app README,
Stage 0 and Result Package, generated `next-env.d.ts`, and all other Markdown,
decisions, Work Packets, Result Packages, provenance, identity/marks and Cell
content remain outside this extension. Existing Phase-1 paths continue under
the original D032 scope.

Only CZ-authored material for which the contributor has the relevant rights is
covered. Third-party code, generated third-party material, dependencies,
notices and licenses keep their applicable terms. A path or SPDX notice does
not relicense third-party material, transfer ownership, or determine rights in
content merely because the content is stored beside software.

## 3. Third-party material inside a covered path

Path scope does not override a separate applicable rights notice.

If a covered path contains a file or portion that is third-party, generated
from third-party material, or governed by another explicit license/notice, that
material keeps its applicable regime. D032 grants no rights beyond those the
relevant Contributor can actually license.

Preserve all applicable copyright, patent, attribution and license notices.

Dependencies named by `package.json`, `package-lock.json` or other manifests
are **not** relicensed under MPL-2.0 merely because the manifest or lockfile is
in the Phase-1 scope.

## 4. Outside the Phase-1 MPL scope

Unless a file or class receives a separate explicit license, D032 does not
place the following under MPL-2.0:

- `decisions/**`;
- `agents/**`;
- `claims/**`;
- `graph/**`;
- `experiments/**`;
- `genesis/**`;
- `incidents/**`;
- `prototypes/**`;
- `questions/**`;
- `rounds/**`;
- `tests/**` as preserved historical/research/test records;
- general documentation under `docs/**`;
- root-level Decisions, Work Packets, Result Packages, preserved results,
  research and provenance records;
- content produced by Cells;
- Célula Zero names, marks, logos and project identity;
- third-party material;
- Indigenous, traditional, confidential, personal, security-sensitive or
  otherwise restricted material.

This list describes important exclusions; it is not a grant for every
unlisted repository path.

When uncertain whether material is in the MPL software scope, do **not** infer
coverage from public availability. Check this map, the file's own notices,
`RIGHTS.md`, provenance and the relevant rights authority.

## 5. Documentation and other content

General project documentation, research, decisions and provenance records do
not become MPL-2.0 material merely because they describe, test or accompany
MPL-covered software.

A later Human Direction may choose a documentation/content license for a
specific class. Until then, `RIGHTS.md` and any file-specific terms govern.

## 6. Contributions

An intentional contribution to any explicitly covered MPL software scope must be
provided by someone with sufficient authority to offer that contribution under
MPL-2.0.

Submission does not transfer ownership by itself.

Third-party code or other material must retain its applicable notices and must
not be incorporated on the assumption that public availability equals
relicensing permission.

See `CONTRIBUTING.md`.

## 7. Future changes

A future licensing decision may apply to future versions or other content
classes only to the extent the project has the necessary rights.

A later licensing change does not retroactively revoke permissions already
granted for versions distributed under MPL-2.0.

Preserve:

`PUBLIC ≠ MPL-COVERED`

`MPL SCOPE ≠ REPOSITORY SCOPE`

`LICENSE GRANT ≠ OWNERSHIP TRANSFER`

`PROVENANCE ≠ COPYRIGHT DETERMINATION`

`FUTURE LICENSING CHANGE ≠ REVOCATION OF PRIOR MPL GRANTS`
