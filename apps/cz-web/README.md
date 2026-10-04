# CZ vNext — CZ-owned entry with Huly authentication (D059 N=1)

From the repository root, using Node 24 and npm 11:

```sh
npm ci
npm run dev:vnext
```

Open http://127.0.0.1:3088. The visible entry and product experience belong to Célula Zero. The local server uses Huly Account authentication at `http://127.0.0.1:8087/_accounts`; Huly is an authentication capability only in this tranche. The human does not enter Huly Workbench or select a Huly workspace/application.

On the first authenticated entry, CZ asks for explicit confirmation before creating local institutional state. The authenticated Huly `Account.uuid` is stored as the subject of a CZ `IdentityCredential`; it is not treated as a Person or external identity verification. After confirmation, the local SQLite FoundationStore creates the Person Marcos, Profile, Cell Célula Zero, Founder/Steward relations, active membership, minimum authority, and attributable bootstrap/source-observation records in one SQLite transaction. No identity or Cell is seeded before confirmation.

This is a local D059 N=1 path, bound to loopback. SQLite is temporary institutional storage for this tranche; CZ institutional persistence is not written to Huly. Keep Huly available locally at port 8087 and do not expose the CZ server to a network. State defaults to `apps/cz-web/.data/huly-auth-n1.sqlite` (ignored); set `CZ_FOUNDATION_DB` to a different absolute path when needed. Local sessions last eight hours, use an opaque HttpOnly cookie, and store only a hash of the session token plus the server-resolved Huly account subject.

The Habitat composes the existing CZ identity, authority, Cell, presence, and record semantics with a small local Work projection and historical CZ Project / Opportunity / Proposal / Commitment contracts. An intention remains an Original Record when explicitly promoted into coordination. Proposal, human acceptance, frozen Commitment, Work, human-reported Contribution, Claim, and any executor Artifact remain separate. No payment obligation, Evidence, Verification, or consensus is inferred. Home reconstructs open work and recent intention on return; Cells shows purpose, relation, work, Projects, Opportunities, agreements, records and material activity; Discover exposes only recorded capabilities and user-provided references; You preserves living Profile/Experience and explicitly unverified capability candidates; Activity projects consequential transitions and makes provenance inspectable/exportable. Mutations resolve the authenticated Person and `cell.update` authority on the server.

Essenthius composition uses the existing authenticated Codex CLI by default through `InstitutionalIntelligencePort`. Each interpretation receives bounded CZ context and remains separate from the human Original Record. It is a text-only interpreter and cannot authorize CZ actions. The relevant message/context is sent to the authenticated ChatGPT/Codex service and consumes the existing account's usage limits; no API billing key is configured. Local qwen3:4b took 137.15 seconds with the Huly stack paused and is insufficient as this host's interactive default. The separate Codex executor is available only after a human accepts a CZ Commitment and explicitly confirms an exact execution plan. It creates a detached clean Git worktree at the displayed full HEAD, invokes `tools/cz-execution-fabric.mjs`, passes only the CLI's HOME/CODEX_HOME and basic runtime environment (not application/provider secrets), restricts modifications to exact listed files, runs explicitly supplied argv validations, and saves a digest-linked Result Package and delta before removing the temporary checkout. The Habitat worktree is never the executor workspace. Returned output remains an executor result until a human evaluates it; completing Work can preserve the delta as an Artifact and the evaluation as a separate human consequence. No Git promotion is performed.

This remains a local Founder N=1 candidate, not an accepted or canonical product. SQLite is temporary local institutional storage; Huly supplies authentication only. Task Capsule and Result Package are composed with the local Work/Project path. Economic status is explicitly “no obligation authorized”; there is no settlement, transfer, receipt, or payment path. Governance supports attributed human decisions and proposal acceptance/decline, not multi-party deliberation, voting, or inferred consensus. Claims can be recorded; no independent Evidence/Verification workflow is active in this slice. Historical Supabase/Company Core and Huly persistence remain unconnected. No remote storage or deployment is part of this candidate.

```sh
npm run check:vnext
npm run test:vnext:e2e
```

Automated checks do not establish that the human experiences this as entering Célula Zero. The human gate is Marcos opening the CZ URL, authenticating there, deciding whether to confirm the first-entry bootstrap, then closing and returning to check continuity. No bootstrap confirmation should be performed by a test or operator on his behalf.
