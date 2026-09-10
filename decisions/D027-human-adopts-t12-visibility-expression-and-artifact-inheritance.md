# D027 — Human adopts T12 visibility expression and Artifact inheritance

Class:

`DECISION / HUMAN DIRECTION`

Authority:

`HUMAN / MARCOS`

Date:

`2026-09-10`

Promotion authority:

> Autorizo registrar D027 e promover D027 + os 5 arquivos localmente validados, com commit, push, PR e merge, sem STATE, sem Supabase remoto e sem ampliar o escopo.

## 1. Human adoption provenance

Human Original Record immediately after the proposed first-slice rule:

> ok

The adopted rule was the immediately preceding proposal that a derived Artifact
must not silently widen the audience of its source Contribution and that future
audience widening belongs to a separate explicit disclosure/publication act.

A later Human execution authorization made that same scope explicit:

> Autorizo implementar e validar localmente o menor slice T12 de expressão de visibility + herança Contribution→Artifact conforme a decisão acima, sem Git, sem Supabase remoto e sem ampliar para sensitivity, retention/deletion ou publication.

Preserve:

`ORIGINAL RECORD ≠ INTERPRETATION ≠ DECISION ≠ IMPLEMENTATION ≠ VERIFICATION`

## 2. Normative first-slice rule

For the currently tested Contribution / Artifact path governed by D026:

1. the Human-facing Contribution creation path must require an explicit choice
   of `PRIVATE`, `PARTIES` or `PROJECT`;
2. the software must not silently choose that Human privacy boundary;
3. an Artifact derived from a Contribution inherits the Contribution's exact
   `visibility`;
4. Artifact creation in this slice does not independently widen that audience;
5. text content attached to the Artifact remains bounded by the parent Artifact
   access already established under D026;
6. any future audience widening must occur through a separate, explicit
   disclosure/publication mechanism.

Therefore:

`Contribution PRIVATE → Artifact PRIVATE`

`Contribution PARTIES → Artifact PARTIES`

`Contribution PROJECT → Artifact PROJECT`

and:

`LEGACY API COMPATIBILITY DEFAULT ≠ HUMAN-FACING DEFAULT`

A backward-compatible technical command may preserve the historical `PROJECT`
default for existing seven-argument callers, provided the Human-facing path
requires explicit selection and does not silently rely on that default.

## 3. Boundaries preserved

This Decision does not redefine D026 audience membership. D026 remains
normative for who may read `PRIVATE / PARTIES / PROJECT`.

Preserve:

`VISIBILITY ≠ SENSITIVITY ≠ RETENTION ≠ PUBLICATION`

`READ ACCESS ≠ AUTHORITY`

`ARTIFACT INHERITANCE ≠ DISCLOSURE / PUBLICATION`

`HUMAN CHOICE ≠ LEGACY API DEFAULT`

`LOCAL VERIFIED ≠ COMMITTED ≠ PUSHED ≠ MERGED ≠ CANONICAL`

This Decision does not select or implement:

- sensitivity-specific policy;
- retention/deletion or withdrawal semantics;
- public publication;
- cross-Cell sharing;
- AI-provider disclosure boundaries;
- new ACL, membership or privacy ontology;
- new RLS semantics beyond D026.

## 4. Supporting local verification before promotion

The Human-authorized local slice was executed against canonical base:

`cd29f076685a34d005b73a85ce49415deb1df204`

Validated candidate source scope:

`5 files`

Observed deterministic results:

- focused database: `1 file / 26 tests / PASS`;
- generated expression divergences: `0`;
- full database: `40 files / 1083 tests / PASS`;
- web lint: `PASS`;
- web typecheck: `PASS`;
- web unit/component tests: `19 files / 77 tests / PASS`;
- Gate 1 domain contracts: `PASS`;
- production build: `PASS`;
- source changes during build-harness recovery: `0`;
- Remote Supabase writes: `0`;
- deployment: `0`;
- outreach: `0`;
- paid model calls: `0`.

The build recovery only replaced an external validation-harness `node_modules`
symlink with an offline local directory copy after Turbopack rejected the
external-root symlink. It did not change the five candidate source files.

Local verification supports promotion of the bounded implementation. It does
not establish external utility, Two-Human habitability, adoption or T12 privacy
completion.

Preserve:

`VISIBILITY EXPRESSION GREEN ≠ T12 FULL PRIVACY COMPLETE`

`LOCAL DETERMINISTIC GREEN ≠ EXTERNAL UTILITY`

## 5. Promotion scope authorized with this Decision

The Human authorized one bounded promotion containing exactly:

1. this `D027` Decision;
2. the locally verified Contribution visibility-expression migration;
3. the locally verified database regression;
4. the Contribution Server Action change;
5. the existing Contribution form change;
6. the focused web regression.

`STATE.md` is explicitly excluded from this promotion.

No Remote Supabase operation, deployment, outreach/enrollment, fund movement,
chain operation or paid model call is authorized by this Decision.
