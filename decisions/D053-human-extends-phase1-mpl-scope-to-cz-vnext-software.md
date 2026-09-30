# D053 — Human extends MPL software scope to CZ vNext Foundation

Date:

`2026-09-30`

Class:

`DECISION / HUMAN DIRECTION`

Status:

`CANONICAL / MERGED THROUGH PR #225`

Canonicalized by merge commit `ae88780505576cfc8a0866aae8dc4cd20e19cf18` on
2026-09-30. The historical authorization and boundaries below record what was
authorized at that time and remain part of the Decision's provenance.

Canonical base:

`f431552511c82d611d0a99c46587f3016c68e986`

## Human Direction Original Record

Marcos explicitly authorized:

> Autorizo reconciliar o escopo MPL-2.0 para o software CZ vNext, fazer commit e push da Foundation na branch existente e abrir Draft PR para revisão. Não autorizo merge nem deploy.

## Adopted direction

Extend the D032 Phase-1 MPL-2.0 software scope only to the CZ-authored vNext Foundation V1 software explicitly listed in `LICENSING.md`.

The extension applies only to the listed Foundation application source, tests and software configuration and the seven explicitly listed CZ-owned package manifests and source. It does not place all of `apps/cz-web/**` or `packages/**` under MPL-2.0.

Preserve:

`PUBLIC ≠ MPL-COVERED`

`MPL SCOPE ≠ REPOSITORY SCOPE`

`THIRD-PARTY MATERIAL ≠ RELICENSED`

`LICENSE GRANT ≠ OWNERSHIP TRANSFER`

## Exclusions and rights boundary

This Decision does not relicense third-party or generated third-party material, dependencies, existing package contents, or material subject to other notices. Their applicable licenses and notices remain in force.

The app README, general documentation under `docs/**`, Decisions, Work Packets, Result Packages, provenance records, repository or Cell content, names, marks and identity remain outside this extension. Existing D032 exclusions remain unchanged.

MPL coverage extends only to material CZ authors have the right to license. SPDX notices indicate the intended license for the listed CZ-authored source files; they do not transfer ownership or override third-party terms.

## Canonicalization boundary

This Decision was canonicalized through repository governance by merging PR #225. Its original Human Direction authorized the bounded licensing reconciliation, commit, push and Draft PR; it initially excluded merge and deploy. The later merge authorization was separately given on 2026-09-30. This canonicalization does not broaden the MPL scope stated above.

Authorized for this exact implementation branch:

- reconcile `LICENSING.md` to the explicit Foundation source/configuration allowlist;
- add this D053 Decision;
- add applicable SPDX notices to new CZ-authored Foundation source files;
- commit and push `build/cz-vnext-foundation-v1-20260930`;
- open a Draft PR against `main`.

Not authorized:

- merge;
- deploy;
- Remote Supabase writes;
- production credentials/secrets;
- external outreach or onboarding;
- Huly core changes;
- changes beyond the reviewed Foundation and licensing scope.

Preserve:

`DRAFT PR ≠ HUMAN ACCEPTANCE ≠ MERGE AUTHORIZATION`

`PREPARED ≠ COMMITTED ≠ PUSHED ≠ PR ≠ MERGED ≠ CANONICAL`
