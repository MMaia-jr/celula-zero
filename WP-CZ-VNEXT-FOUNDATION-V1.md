# WP-CZ-vNEXT-FOUNDATION-V1

Status:

`PREPARED / HUMAN EXECUTION AUTHORIZED / NOT EXECUTED`

Canonical base:

`3eb7560034bbc559213bf191aa092f4f0f9cac57`

Decision dependency:

`D052 / ADOPTED`

## Mission

Create the first durable codebase tranche of CZ vNext without reusing the historical CZ
product frontend as the experience and without coupling CZ domain semantics directly to
Huly or any other external provider.

## Build scope

Create a new product surface and module boundaries for:

1. `apps/cz-web`
2. Identity / Presence / Experience
3. Cells / Relations / Authority
4. Records / Provenance minimum
5. Platform Contract
6. Huly adapter skeleton/candidate only where current upstream primitives map cleanly
7. shared UI / events / observability / security foundations required by the tranche

## Required Stage 0 readback

Before writing:

- inspect current monorepo/package/workspace layout;
- inspect current licensing boundary;
- inspect current TypeScript/Next.js/runtime conventions;
- inspect existing identity/person/cell/authority models for salvageable semantics only;
- inspect current Huly Core / Platform Collective package structure and licensing;
- produce a short reuse map:
  `REUSE / ADAPT / REFERENCE ONLY / DO NOT IMPORT`;
- confirm exact files/directories to be created or modified.

Stage 0 must not rewrite existing app code.

## Product requirements

### New experience shell

Must not import old product pages/components as the primary experience.

Target top-level experience:

`Home / Cells / Discover / Activity / You`

Home must support:

- Continuity area;
- clear human action options;
- natural-language input surface;
- mobile-first responsive layout.

No requirement for full functionality of every navigation item in V1.

### Identity / Presence / Experience

Implement domain contracts for:

- Person
- Profile
- IdentityCredential
- ExternalIdentity
- Experience
- Capability
- PortfolioItem
- BioView
- VisibilityPolicy

Preserve epistemic source/origin markers sufficient to distinguish:

- user reported;
- source observed;
- AI inferred;
- human confirmed;
- evidenced;
- verified.

### Cells / Relations / Authority

Implement domain contracts for:

- Cell
- Relation
- Membership
- Role
- Authority
- Mandate
- Delegation

Create a fixture/seed strategy for:

`Cell:Célula Zero`

and:

`Marcos → Founder/Steward → Cell:Célula Zero`

without hard-coding provider identity as institutional identity.

### Records / Provenance minimum

Implement only the minimum record/provenance primitives required to attribute profile and
Cell changes correctly.

Preserve:

`OriginalRecord ≠ Interpretation ≠ Claim ≠ Evidence ≠ Decision`

### Platform Contract

Define CZ-owned interfaces for:

- identity substrate;
- realtime;
- documents;
- collaboration;
- files;
- activity;
- search;
- notifications;
- storage;
- background jobs.

Domain packages must not depend directly on Huly package types except inside
`platform-huly`.

### Huly adapter

Implement only mappings that are supported by current upstream primitives.

Do not fork or patch Huly core under this Work Packet.

If a required property cannot be mapped cleanly, record:

`PROPERTY_GAP`

and leave the interface unimplemented/stubbed behind the CZ Platform Contract.

`PROPERTY_GAP ≠ AUTHORIZATION TO PATCH HULY CORE`

## Non-goals

Not in this execution:

- old frontend migration;
- `/operate`;
- Genesis Console;
- full Huly UI embedding;
- GitHub/Linear/Supabase/Vercel OAuth;
- Essenthius model execution;
- semantic retrieval/RAG;
- governance engine;
- development executor;
- economy;
- token;
- federation;
- production deployment;
- remote Supabase migration;
- external users.

These remain architectural modules, not rejected features.

## Quality requirements

For new code in scope:

- TypeScript strictness consistent with repository conventions;
- module boundaries explicit;
- no cross-module DB reach-through;
- provider-specific types isolated to adapters;
- deterministic unit tests for domain invariants;
- responsive UX;
- accessible interactive controls;
- no secrets committed;
- no remote writes;
- no paid calls.

## Expected output

A coherent local vNext foundation that can be run as one product surface and demonstrates
the intended architecture structurally.

Required report:

- files changed/created;
- reuse/adaptation map;
- module dependency graph;
- test/build/lint/typecheck results;
- unresolved property gaps;
- no claim of habitability/adoption from technical pass.

## Stop gates

Stop and request Human Review if execution would require:

- deleting or mass-rewriting historical implementation;
- Huly core patch/fork;
- new production infrastructure;
- remote database changes;
- production auth credentials;
- paid provider/model calls;
- deploy;
- broad repository restructuring outside the agreed paths;
- replacing GitHub canonical governance.

## Promotion boundary

Even after local implementation and tests:

`LOCAL IMPLEMENTATION ≠ COMMITTED ≠ PUSHED ≠ PR ≠ MERGED ≠ CANONICAL`

A later explicit Human gate is required for promotion.
