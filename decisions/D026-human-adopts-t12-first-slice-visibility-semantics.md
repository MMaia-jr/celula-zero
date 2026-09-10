# D026 — Human adopts T12 first-slice visibility semantics

Class:

`DECISION / HUMAN DIRECTION`

Authority:

`HUMAN / MARCOS`

Date:

`2026-09-10`

Promotion authority:

`HUMAN / MARCOS / 2026-09-10`

> Autorizo registrar e promover a decisão T12 de visibilidade como D026 e reconciliar minimamente STATE, somente documentação; sem implementação.

Canonical base inspected immediately before preparation:

`4d6a866bb627a7ab235f8bdbee5342e4c6672edc`

Human Original Record:

> Adotar para o primeiro slice T12 a matriz acima como semântica normativa de `PRIVATE / PARTIES / PROJECT`, mantendo disclosure explícito/material-bound como mecanismo separado para terceiros.

This Decision records the Human-adopted visibility semantics for the first T12
privacy access slice currently under test.

Preserve:

`HUMAN POLICY DECISION ≠ RLS IMPLEMENTATION`

`VISIBILITY LABEL ≠ ACCESS POLICY UNTIL ENFORCED`

`READ ACCESS ≠ AUTHORITY`

`VISIBILITY ≠ SENSITIVITY ≠ RETENTION`

`PROJECT VISIBILITY ≠ PUBLICATION`

`CAPABILITY ≠ GLOBAL PROJECT READ`

## 1. Scope

This Decision governs the first T12 visibility slice for the currently tested
Contribution / Artifact path whose governing provenance reaches an exact
Commitment.

It does not silently define the audience semantics of every Célula Zero object
class.

It does not select retention/deletion semantics, sensitivity handling,
publication rules or a universal privacy schema.

## 2. Normative first-slice matrix

| Actor | `PRIVATE` | `PARTIES` | `PROJECT` |
|---|---|---|---|
| originator / author | READ | READ | READ |
| exact Commitment counterparty | DENY | READ | READ |
| legitimate Project steward who is not a party | DENY | DENY | READ |
| unrelated participant / profile | DENY | DENY | DENY |

For this slice:

`PRIVATE = originator/controller only`

`PARTIES = exact parties of the governing Commitment`

`PROJECT = originator + exact Commitment parties + legitimate Project steward`

The exact Commitment parties are the actors represented by the governing
Commitment relation, including proposer and authorized accepting counterparty.

## 3. Third-party disclosure remains separate

Reviewer, auditor or other third-party access is not inferred merely from
`PROJECT`, membership, participation or possession of an unrelated capability.

Where a workflow requires third-party access, disclosure must remain:

`EXPLICIT + CONTEXTUAL + MATERIAL-BOUND`

Existing exact material-bound relations may be composed when they preserve the
required property. This Decision does not create a general Project read
capability or universal ACL.

## 4. Supporting local execution before adoption

The Human decision followed local readback of the current canonical RLS against
the same first-slice relations.

Observed local current-RLS test:

`FILES=1 / TESTS=16 / RESULT=PASS / MATRIX=24 ROWS`

Observed property-loss witnesses:

- Project steward could read `PRIVATE` Contribution and Artifact;
- exact Commitment counterparty could not read `PARTIES` Contribution and
  Artifact;
- exact Commitment counterparty also could not read `PROJECT` Contribution and
  Artifact merely by being a Commitment party;
- unrelated profile remained denied.

After Human adoption of the matrix, the normative expected-policy test produced
the intended RED result:

`FILES=1 / TESTS=19 / FAILED=4 / RESULT=FAIL EXPECTED`

Exact normative divergences:

- `COUNTERPARTY / PARTIES: expected=2 / actual=0`;
- `COUNTERPARTY / PROJECT: expected=2 / actual=0`;
- `STEWARD / PRIVATE: expected=0 / actual=2`;
- `STEWARD / PARTIES: expected=0 / actual=2`.

These were local, non-canonical execution results at the time of this Decision.

Preserve:

`EXPECTED RED CONFIRMED ≠ RLS FIX IMPLEMENTED`

`LOCAL EXECUTION EVIDENCE ≠ CANONICAL IMPLEMENTATION`

## 5. Consequence for the next technical gate

The current Contribution / Artifact RLS does not satisfy the adopted matrix.

Any future implementation for this slice must be evaluated against the adopted
matrix and must not silently broaden unrelated participant, Cell member,
reviewer or capability-holder access.

The smallest future implementation should prefer composition of existing
Commitment, author/controller and legitimate Project-steward relations before
introducing new ACL, membership or privacy ontology.

That future implementation requires separate Human authorization.

## 6. Still unresolved in T12

This Decision does not resolve:

- retention duration or deletion semantics;
- creator/content rights beyond the access slice above;
- AI-provider disclosure boundaries;
- cross-Cell sharing;
- public projection;
- export policy;
- never-public / never-chain classes;
- sensitivity-specific handling;
- administrative emergency access, if any;
- visibility semantics for object classes outside this first slice.

These remain subject to observed property loss and separate decisions where
material.

## 7. Explicit non-authorizations

This Decision and its documentation promotion do not authorize:

- RLS implementation;
- schema migration;
- RPC or application-code changes;
- UI controls;
- new ACL tables;
- new membership models;
- retention/deletion implementation;
- Remote Supabase writes;
- deployment;
- external enrollment or outreach;
- chain/testnet/mainnet operations;
- real-fund movement;
- paid model calls.

The only promotion authority accompanying this Decision is the Human-authorized
documentation change:

`D026 + minimal STATE reconciliation / documentation only`
