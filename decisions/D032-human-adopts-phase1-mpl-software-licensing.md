# D032 — Phase-1 MPL-2.0 licensing for Célula Zero software

Class:

`DECISION / HUMAN DIRECTION`

Authority:

`HUMAN / MARCOS`

Date:

`2026-09-10`

## 1. Human Original Record

> Adotar MPL-2.0 como licença Phase-1 para o software próprio da Célula Zero,
> em escopo explicitamente identificado, preservando regime separado para
> decisões, registros de proveniência, pesquisa, conteúdo produzido por Cells,
> marca, material de terceiros e material sensível. A adoção não implica
> relicenciamento automático de material cujo direito não esteja estabelecido.
> Mudanças futuras de licença não revogam permissões já concedidas a versões
> anteriormente distribuídas e dependem dos direitos disponíveis sobre as
> contribuições envolvidas.

Preserve:

`ORIGINAL RECORD ≠ INTERPRETATION ≠ LICENSE MAP ≠ LEGAL OWNERSHIP DETERMINATION`

## 2. Decision

Célula Zero adopts the Mozilla Public License 2.0 (`MPL-2.0`) as its Phase-1
software license only for the software scope explicitly identified in
`LICENSING.md`.

The repository remains mixed-license / mixed-rights.

There is no repository-wide MPL grant.

Preserve:

`MPL SCOPE ≠ REPOSITORY SCOPE`

`PUBLICLY ACCESSIBLE ≠ MPL-COVERED`

`PROVENANCE ≠ COPYRIGHT OWNERSHIP`

## 3. Phase-1 software boundary

The first licensing map covers Célula Zero software and supporting software
files in the explicitly enumerated paths in `LICENSING.md`.

The grant reaches only rights that the relevant Contributor is able to license.
A path designation does not erase, replace or broaden a separate third-party
license, notice, copyright interest or other restriction that applies to
material within that path.

Dependencies referenced by manifests or lockfiles retain their own licenses.
Their presence in dependency metadata does not relicense those dependencies
under MPL-2.0.

## 4. Explicitly separate regimes

D032 does not automatically license under MPL-2.0:

- Decisions / Human Directions;
- Work Packets, Result Packages and preserved operational history;
- provenance records;
- research records;
- historical agent outputs;
- general project documentation outside the explicit software scope;
- content produced by Cells;
- the Célula Zero name, marks, logos or identity;
- Indigenous, traditional, confidential, personal, security-sensitive or other
  restricted material;
- third-party material;
- any material for which the relevant licensing authority is not established.

Those classes remain governed by `RIGHTS.md`, their own explicit notices,
applicable agreements and applicable law.

## 5. Existing and future source files

Phase 1 uses `LICENSING.md` as the authoritative repository scope map and
`LICENSES/MPL-2.0.txt` as the full MPL-2.0 text.

For new source files created inside the covered software scope after D032,
prefer:

`SPDX-License-Identifier: MPL-2.0`

where the file format supports a suitable comment.

D032 does not require a mechanical mass-edit of historical source files merely
to add headers. A later bounded change may add per-file notices if a concrete
need appears.

## 6. License continuity

A later project licensing strategy does not retroactively withdraw permissions
already granted for versions distributed under MPL-2.0.

Any future relicensing or additional licensing depends on the rights actually
available over the contributions involved.

D032 does not create a promise that every future version will use the same
license.

## 7. Rights/provenance scan boundary

The read-only pre-adoption scan found a concrete reason not to license the
repository as a whole: preserved experimental material includes a substantial
delta against third-party Huly source.

The scan did not establish universal legal ownership of every software byte.
Absence of an observed contrary notice is evidence for bounded implementation,
not proof of title.

Therefore:

`WHOLE-REPOSITORY MPL = NO-GO`

`EXPLICIT CZ SOFTWARE MPL-2.0 = PARTIAL GO`

## 8. Promotion authorization

Human authorization on 2026-09-10:

> autorizo implementação + validação + commit + push + PR + CI + merge desse
> slice D032.

This authority is bounded to implementing and promoting D032 without silently
expanding the MPL scope, relicensing excluded material, changing product
semantics, deploying software, contacting external participants, moving funds
or altering external infrastructure.

If a new rights ambiguity or scope drift appears, STOP rather than infer
authority.
