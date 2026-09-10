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

## 2. Third-party material inside a covered path

Path scope does not override a separate applicable rights notice.

If a covered path contains a file or portion that is third-party, generated
from third-party material, or governed by another explicit license/notice, that
material keeps its applicable regime. D032 grants no rights beyond those the
relevant Contributor can actually license.

Preserve all applicable copyright, patent, attribution and license notices.

Dependencies named by `package.json`, `package-lock.json` or other manifests
are **not** relicensed under MPL-2.0 merely because the manifest or lockfile is
in the Phase-1 scope.

## 3. Outside the Phase-1 MPL scope

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

## 4. Documentation and other content

General project documentation, research, decisions and provenance records do
not become MPL-2.0 material merely because they describe, test or accompany
MPL-covered software.

A later Human Direction may choose a documentation/content license for a
specific class. Until then, `RIGHTS.md` and any file-specific terms govern.

## 5. Contributions

An intentional contribution to the Phase-1 MPL software scope must be provided
by someone with sufficient authority to offer that contribution under
MPL-2.0.

Submission does not transfer ownership by itself.

Third-party code or other material must retain its applicable notices and must
not be incorporated on the assumption that public availability equals
relicensing permission.

See `CONTRIBUTING.md`.

## 6. Future changes

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
