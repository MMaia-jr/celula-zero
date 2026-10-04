# CZ-GENESIS-OPERATING-HABITAT-IMPLEMENTATION-PLAN-V1

Status: HUMAN-ADOPTED / CANONICALIZATION AUTHORIZED / CANONICAL AFTER MERGE

Date: `2026-10-04`

## 1. Experience we are building

Célula Zero becomes a coherent connected human–AI operating habitat.

A Human should be able to:

`ENTER → BE RECOGNIZED → SPEAK NATURALLY → RECOVER RELEVANT CONTEXT → DISCOVER PEOPLE/KNOWLEDGE/TOOLS/RESOURCES → COMPOSE CAPACITY → AUTHORIZE MATERIAL ACTIONS → ACT → OBSERVE CONSEQUENCE → LEARN → CONTINUE`

Ordinary use must not require Git, OAuth concepts, provider IDs, MCP, Huly internals, database schemas, model-routing knowledge or CZ ontology.

Primary experience grammar:

`TALK → UNDERSTAND → RELATE → COMPOSE → ACT → SEE WHAT CHANGED → CONTINUE`

Preserve:

`CAPABILITY EXISTS ≠ INTEGRATED ≠ HUMAN CAN USE IT`

`AUTOMATED PASS ≠ PRODUCT EXPERIENCE`

`BIG PLAN ≠ BIG BANG`

`INTEGRATED BUILD ≠ MICRO-TESTING`

## 2. Current baseline

Canonical `main` still reflects the D059/Huly N=1 gate and is behind current Human Direction.

Current architecture lineage already preserves:

- D024 — autonomy, habitability and sovereign Cells;
- D049 — lived-capacity episodes and real consequence;
- D051 — one Essenthius / many models / many executors / many Cells;
- D052 — coherent modular online institution;
- D059 — CZ-owned experience/domain over replaceable substrate;
- CZ vNext Architecture Blueprint V0.2.

Preserved implementation checkpoints:

- PR #234 / `02be5fd45d2806ddab4d6c221aa167a4ddc5d260` — campaign checkpoint;
- PR #235 / `a741a9f33ec3ef5ef533ddca331994348c8d4fb9` — substantial-Habitat review candidate stacked on #234.

Both remain Draft / unmerged / not Human acceptance.

Current candidate already contains material substrate: CZ-owned human surface, persistent conversation, Person/Profile/Cell/Relation, current Human Direction projection, Work/consequence path, Experience drafting/confirmation, Meetings, Activity, capability inventory, Codex provider/executor boundaries, local-model background path, recovery/portability tests, and an initial `conversation → Work → result → learning → capability-growth` path.

Do not reimplement these without a concrete defect.

## 3. Product definition

Célula Zero is an online human–AI institutional habitat where people and organizations build persistent presence, Cells become living contexts, intentions become coordinated action, external capabilities are composed rather than rebuilt, Essenthius provides one coherent institutional intelligence, authority remains Human/contextual, consequences return to the institution, learning changes future interaction, trust remains contextual and economic conditions remain explicit.

CZ is not an issue tracker, email client, GitHub replacement, generic chatbot, Huly skin, agent marketplace, universal reputation system, or default DAO/token product.

## 4. Architecture

```text
                         GitHub
                         Linear
                         Gmail
                         Drive
                         Calendar
                         Web / APIs
                         Huly / other platform capability
                              ↑
                       CONNECTION FABRIC
                              ↑
                       CAPABILITY REGISTRY
                              ↑
                         ACTION GATEWAY
                              ↑
Human ↔ CZ Surface ↔ ESSENTHIUS ↔ Institutional Domain / Memory
                              ↓
                       INTELLIGENCE ROUTER
                              ↓
                    GPT / Codex / Kimi / Local
```

Layering:

`EXPERIENCE → DOMAIN → CZ CAPABILITY CONTRACTS → PROVIDER ADAPTERS → EXTERNAL WORLD`

Preserve:

`CZ EXPERIENCE ≠ PROVIDER UI`

`CZ DOMAIN ≠ PROVIDER DOMAIN`

`EXTERNAL CAPABILITY ≠ EXTERNAL AUTHORITY`

`CONNECTION EXISTS ≠ CAPABILITY AVAILABLE ≠ ACTION AUTHORIZED`

Use a modular monolith first. `MODULE ≠ MICROSERVICE`.

## 5. Semantic modules

1. Identity & Presence
2. Cells & Relations
3. Authority & Consent
4. Records & Provenance
5. Knowledge & Interpretation
6. Dreams / Intentions / Needs
7. Projects / Opportunities
8. Work / Contribution / Consequence
9. Resources
10. Capabilities
11. Connections
12. Discovery & Matching
13. Composition & Planning
14. Action Gateway & Execution
15. Essenthius / Memory / Continuation
16. Learning / Celebration / Capability Growth
17. Contextual Trust
18. Economy & Agreements
19. Governance & Deliberation
20. Portability & Federation
21. Operations / Safety / Compliance

Construction rule:

`ADOPT → MAP → COMPOSE → EXTEND → BUILD FROM ZERO`

For `EXTEND` or `MISSING`, answer first:

> What concrete property or real possibility is lost if we do not create this?

## 6. Workstream A — Human Habitat

Primary navigation:

`Início / Conversas / Células / Descobrir / Reuniões / Atividade / Você`

### Início
Show what matters now: current Cell, current Human Direction, what changed, pending attention, active work and next possibilities.

### Conversas
Persistent Human–Essenthius conversation. Messages remain messages; promotion to institutional records/decisions/work requires explicit semantics and authority.

Preserve:

`MESSAGE ≠ ORIGINAL RECORD`

`CONVERSATION ≠ DECISION`

`AI SUMMARY ≠ HUMAN DECISION`

### Células
Expose purpose, people/relations, work, decisions, results, resources, connections, meetings, learning and opportunities without forcing ontology.

### Descobrir
Surface relevant people, Cells, knowledge, files, capabilities, resources, opportunities and alternative framings with attributable basis.

### Reuniões
Text/live institutional meetings first: participants, purpose, conversation, proposals, explicit decisions, follow-ups, attributable summary.

### Atividade
Consequence feed, not database dump.

### Você
Profile, Experiences, self-reported capabilities, portfolio, connected accounts, visibility, provenance, direct editing and AI-assisted drafts with selective acceptance.

## 7. Workstream B — Connection Fabric

Core:

```text
Connection
- id
- ownerType: Person | Cell | Service
- ownerId
- provider
- externalAccountRef
- status
- scopes
- resourceBindings
- credentialReference
- consent
- fundingOwner
- createdAt
- refreshedAt
- expiresAt
- revokedAt
```

Supporting concepts:

- AuthorizationGrant
- ExternalAccount
- ExternalResource
- CredentialReference
- CapabilityDefinition
- CapabilityBinding

Secrets never become ordinary domain values.

### Provider family V1

Implement behind the same Connection/Capability interfaces.

#### GitHub
Read: repositories, branches, commits, PRs, issues, checks/status, selected content.

Write after authority: issue/comment, branch creation, PR open/update/comment/review; merge only under explicit high-risk confirmation.

Preserve:

`GITHUB ISSUE ≠ CZ NEED`

`GITHUB PR ≠ HUMAN ACCEPTANCE`

#### Linear
Read: teams, projects, issues, cycles, comments/status.

Write after authority: create/update issue, project coordination, status/assignment changes.

Preserve:

`LINEAR ISSUE ≠ CZ WORK`

`LINEAR PROJECT ≠ CZ CELL`

`LINEAR DONE ≠ REAL CONSEQUENCE`

#### Google family
One Google connection with capability-bound scopes.

Gmail: search/read, draft, send only under authority.

Drive: search/read, create/update when authorized, source attribution preserved.

Calendar: read events/availability, propose event, create/update/cancel after authority.

Preserve:

`EMAIL ≠ ORIGINAL RECORD AUTOMATICALLY`

`EMAIL ≠ AGREEMENT`

`CALENDAR EVENT ≠ COMMITMENT`

`DRIVE FILE ≠ EVIDENCE BY DEFAULT`

## 8. Workstream C — Capability Registry

Each executable capability records:

```text
Capability
- id
- provider
- connection
- resource
- action
- readWrite
- availability
- costClass
- latencyClass
- risk
- reversibility
- authorityRequirement
- approvalPolicy
- executionEntrypoint
- provenance
```

Availability states:

`AVAILABLE / AVAILABLE_WITH_HUMAN_CONFIRMATION / BACKGROUND_ONLY / CONFIGURED_BUT_UNAVAILABLE / NOT_CONFIGURED / HISTORICAL_ONLY`

Registry must reflect real connection/runtime state, not marketing promises.

Essenthius should be able to answer:

> Can we do this now? What is missing? Does it need Human authority? Is there cost? Is it reversible?

## 9. Workstream D — Essenthius Intelligence Mesh

Preserve:

`ONE ESSENTHIUS / MANY MODELS / MANY EXECUTORS / MANY ROLES`

Roles:

Companion, Witness, Facilitator, Planner, Researcher, Operator, Critic, Celebrant.

Components:

1. Context Compiler
2. Institutional Memory Reconstruction
3. Intent Interpreter
4. Capability Discovery
5. Planner
6. Authority Evaluator
7. Model Router
8. Executor Router
9. Result Interpreter
10. Continuation Manager
11. Cost/latency accounting
12. Provenance recorder

Default context:

`CORE IDENTITY + ACTIVE DIRECTION + CURRENT CELL + ACTIVE WORK + RECENT CONVERSATION + CURRENT CONNECTION/CAPABILITY STATE`

Expand on demand into exact records, Git history, email threads, Linear issues, Drive files, meetings and provenance.

Preserve:

`CONTEXT COMPRESSION ≠ MEMORY LOSS`

`SUMMARY ≠ SOURCE`

`MODEL CONTEXT ≠ INSTITUTIONAL MEMORY`

Provider routing should support local models, Codex, OpenAI/GPT-compatible providers, Kimi when configured/authorized, and future models.

Internal founder Alpha may reuse the current authenticated Codex path. Multi-user Alpha must not assume a ChatGPT subscription can be silently reused as a third-party app credential.

## 10. Workstream E — Action Gateway & Execution

All authority-sensitive effects flow through:

`REQUEST → INTERPRETATION → PLAN → CAPABILITY REQUEST → AUTHORITY CHECK → COST/PRIVACY CHECK → APPROVAL IF REQUIRED → EXECUTION → EXTERNAL RESULT → CZ RESULT → CONSEQUENCE → CONTINUATION`

Policy classes:

1. `READ_AUTONOMOUS_WITHIN_GRANTED_SCOPE`
2. `DRAFT_ONLY`
3. `WRITE_AFTER_HUMAN_CONFIRMATION`
4. `HIGH_RISK_EXPLICIT_CONFIRMATION`
5. `NOT_ALLOWED`

Examples:

- search GitHub → 1
- summarize email thread → 1
- prepare reply → 2
- create Linear issue → 3
- send email → 3
- merge PR → 4
- production deploy → 4
- funds/secrets → 4/5

### Codex operator

`natural Human request → development intent → scope/files/tests/risk/reversibility → Human authorization → Execution Fabric → isolated checkout → Codex → tests → Result Package → candidate change → Human promotion decision`

Codex remains executor/provider, not Essenthius identity.

## 11. Workstream F — Human/Social Metabolism

Move beyond founder + assistant.

Support coherent multi-person:

- Person / Presence
- Relation / Membership
- Role / Authority / Mandate / Delegation
- Cell
- Dream / Need / Project / Opportunity
- Work / Contribution / Result
- Agreement / Decision
- Learning / Capability Growth
- Contextual Trust
- Economy
- Celebration / Regeneration

Target metabolism:

`PERCEIVE → DISCOVER → RELATE → COMPOSE CAPACITY → LEARN → CONDITIONS/AGREEMENT → ACT → RESULT → EVIDENCE/VERIFICATION/HUMAN DECISION → CELEBRATE/REGENERATE → NEW POSSIBILITIES`

Not mandatory linear.

Preserve:

`ACTIVITY ≠ CAPABILITY`

`CAPABILITY DECLARED ≠ CAPABILITY VERIFIED`

Recover useful Esentya lineage through Witness/Celebration: what happened, what changed, what mattered, gratitude, tensions, unresolved questions, and new possibilities. No gamified proof-of-worth.

## 12. Workstream G — Governance, Trust and Economy

Governance:

`question → positions → claims/evidence → proposal → deliberation → Human decision → policy/mandate → consequence`

AI may summarize/map disagreement. AI consensus does not confer legitimacy.

Trust:

> “X is trusted for Y in context Z based on attributable observations/evidence.”

No universal score.

Economy:

`Opportunity → Conditions → Agreement → Contribution → Result → Evaluation → Settlement → Consequence`

Alpha supports explicit conditions, funding owner, reward expectation, agreements, cost accounting and attribution. Payment rails remain external adapters. No tokenomics unless a real episode requires it.

## 13. Workstream H — Hosted Durability and Survival

Target hosted Alpha:

- remote HTTPS entry;
- robust auth boundary;
- durable database;
- encrypted secrets;
- backups;
- restore drill;
- observability;
- safe logs;
- cost monitoring;
- health checks;
- background jobs;
- provider-outage handling;
- mobile/desktop;
- export/portability.

Essential state must not live only in model memory, browser state, one laptop or one SaaS without export.

Preserve:

`IF ONE PROVIDER DIES → CZ CAN CONTINUE`

`IF MARCOS LOSES HIS LAPTOP → CZ DOES NOT DISAPPEAR`

## 14. Huly / platform strategy

D059 remains useful architecture lineage but not the campaign’s center.

Rule:

`CZ EXPERIENCE → CZ DOMAIN → PLATFORM CONTRACT → BEST EXISTING CAPABILITY`

Use Huly only where it removes horizontal engineering while preserving CZ semantics and CZ-owned experience.

Potential Huly uses: realtime, documents, files, activity, notifications, collaboration primitives, background infrastructure.

Do not:
- use Huly native UI as CZ;
- map Workspace=Cell or Role=Authority;
- create a core fork without property loss;
- spend the campaign proving Huly features already known.

## 15. Build campaigns

### Campaign 1 — Coherent Habitat Core
Base from preserved #235 candidate.

Build coherent Home, Essenthius presence, Conversations, Cells, Discover, Meetings, Activity, You, notifications/attention, context continuity, deep links, accessibility, mobile/desktop, design system and elimination of legacy leakage from the normal path.

### Campaign 2 — Connected World V1
Build Connection Fabric plus GitHub, Linear and Google family (Gmail, Drive, Calendar) in one integrated campaign: secure credentials, consent/scopes, connection-management UI, capability projection, reads, drafts/writes, revocation, provenance and failure handling.

### Campaign 3 — Essenthius Orchestration V1
Build provider-neutral router, roles/tasks, context layering, usage/cost accounting, fallback, Witness/Companion continuity, connection-aware reconstruction and provenance disclosure.

### Campaign 4 — Action & Consequence V1
Build Action Gateway policy engine, external writes, confirmation UX, Codex operator normal flow, result interpretation, Activity consequence, retries/idempotency and audit.

### Campaign 5 — Social Metabolism V1
Build multi-person relations, Cell membership/authority, Dreams/Needs/Projects/Opportunities, Agreements, Contributions/Results, learning/capability growth, Celebration, contextual trust and explicit economic conditions.

### Campaign 6 — Durable Hosted Alpha
Build remote deployment, durable DB, secure secrets, backup/restore, observability, provider outage handling, privacy/admin controls, export/portability.

## 16. Human review cadence

Do not interrupt the Human for individual features, adapter plumbing, unit PASS, schema changes, individual pages, OAuth wiring or capability-registry entries.

Human interruption is justified for:

- new external spending;
- new secrets/accounts requiring Human action;
- destructive/irreversible migration;
- external outreach;
- funds;
- material provider privacy/permission choices;
- deployment/production promotion;
- genuine product/ethical tradeoff;
- integrated Habitat review gates.

Primary gate:

`GENESIS OPERATING HABITAT ALPHA READY`

Then:

`FOUNDER ONE-WEEK DOGFOOD`

Only afterward:

`EXTERNAL HUMAN N=1 READINESS REVIEW`

## 17. Alpha Definition of Done

Alpha is done when Marcos can:

1. open CZ from phone or desktop;
2. authenticate normally;
3. be recognized as Person / Founder-Steward;
4. receive relevant current context without reconstructing it;
5. talk naturally to Essenthius;
6. inspect provenance when needed;
7. connect/manage GitHub, Linear and Google sources;
8. ask cross-source questions;
9. produce a real draft/action from natural language;
10. authorize external writes explicitly;
11. see provider result return to CZ;
12. see meaningful consequence in Activity/Cell;
13. complete work and preserve learning;
14. recover relevant state after restart/return;
15. understand cost/provider/authority when needed;
16. export/backup essential institutional state;
17. use CZ for several consecutive days without reconstructing technical context.

Ordinary path requires no IDs and no terminal.

## 18. Founder dogfood scenario

Opening:

> “Bom dia, Essenthius. O que está acontecendo e o que precisa de mim?”

Essenthius composes current Human Direction, active Cell state, recent conversation, GitHub changes, Linear work, relevant email, calendar/meetings, files/resources, pending Human decisions and connection/cost state where material.

Then:

> “Me mostra a Allus.”

Essenthius composes durable CZ history plus live connected context.

Then:

> “Prepare uma resposta e um plano para avançarmos.”

CZ creates drafts/proposals. Marcos authorizes selected actions. External actions execute through adapters. Results return to CZ.

Later:

> “Onde paramos?”

The institution continues.

Success is not that each API works. Success is that Marcos becomes more capable.

## 19. Validation strategy

Continuous technical validation:

- lint/typecheck/unit;
- contract tests;
- adapter tests;
- isolated integration tests;
- E2E desktop/mobile;
- authority canaries;
- secret-leakage checks;
- idempotency;
- recovery;
- backup/restore;
- provider-failure injection;
- accessibility;
- performance budgets;
- cost accounting.

Use synthetic/isolated provider fixtures for deterministic regression.

Use real provider calls when necessary to validate a material integration boundary or real experience.

Preserve:

`TEST PASS ≠ PRODUCT EXPERIENCE`

## 20. Observability

Every external/model execution should support:

- request ID;
- actor;
- Cell;
- purpose;
- provider/resource/capability;
- authorization;
- start/end;
- status;
- cost/usage;
- latency;
- result reference;
- consequence link;
- failure classification.

Preserve:

`ACTIVITY ≠ COST`

`COST ≠ VALUE`

`PROVIDER SUCCESS ≠ HUMAN CONSEQUENCE`

## 21. Branching / preservation

Keep #234 and #235 frozen.

Next implementation branch should start from the preserved #235 implementation candidate, for example:

`build/genesis-operating-habitat-alpha-v1`

The branch may accumulate substantial integrated work.

Use remote checkpoints when loss risk becomes material, but do not turn each checkpoint into a Human review.

Promotion to `main` remains a separate Human decision.

## 22. Canonical reconciliation

Before or at the beginning of the large campaign, reconcile canonical documentation so D059/Huly N=1 no longer appears as the operational center.

Proposed new direction:

`BUILD GENESIS OPERATING HABITAT ALPHA AS AN INTEGRATED CONNECTED HUMAN–AI INSTITUTION`

Preserve D024, D049, D051, D052, and the provider/platform boundary learned through D059.

Do not canonize:
- Habitat acceptance;
- external utility;
- adoption;
- PMF;
- scale;
- final provider choices;
- Huly final adoption.

Suggested documentation package after explicit Human adoption:

1. new Human Direction Decision;
2. this Implementation Plan;
3. minimal `STATE.md` reconciliation.

Documentation promotion and implementation promotion remain separate authorities.

## 23. Explicit non-build list

Unless a lived requirement changes classification, do not build:

- universal reputation score;
- token/NFT/SBT;
- DAO;
- blockchain;
- graph DB;
- custom vector-memory platform;
- custom email;
- custom issue tracker;
- custom calendar;
- custom drive;
- custom foundation model;
- Huly core fork;
- microservice mesh;
- universal integration broker from zero;
- custom identity protocol;
- custom federation protocol.

## 24. Stop conditions for long campaign

Stop for Human intervention only if:

- new paid external spend requires authorization;
- a production secret/account must be created or granted;
- destructive migration becomes necessary;
- irreversible external data mutation is proposed;
- external outreach is needed;
- funds/economic settlement are involved;
- provider terms/privacy choices require Human judgment;
- a genuine architecture/product tradeoff cannot be resolved from adopted direction;
- integrated Alpha reaches the Human Review gate.

Ordinary defects, failed tests and integration bugs are executor work, not Human interruptions.

## 25. Success ladder

`DOCUMENTED → REPRESENTED → EXECUTED → VERIFIED → INTEGRATED → HABITABLE → USEFUL → REPEATED → ADOPTED → SCALABLE`

The build campaign may target `INTEGRATED`.

Only lived Human use can establish `HABITABLE`.

Only consequence can establish `USEFUL`.

Only repeated use can establish `REPEATED`.

## 26. Immediate next movement

If Human-adopted:

1. prepare a new Human Direction Decision representing the integrated Alpha;
2. reconcile `STATE.md` minimally;
3. canonicalize documentation only if separately authorized;
4. create `build/genesis-operating-habitat-alpha-v1` from the preserved implementation candidate;
5. give Codex one long integrated implementation campaign;
6. validate technically continuously;
7. preserve remote checkpoints when loss risk becomes material;
8. stop only at material authority blocker or integrated Alpha Human Review gate.

Target gate:

`GENESIS OPERATING HABITAT ALPHA / SUBSTANTIAL INTEGRATED REVIEW`

Definition:

> A person can simply use Célula Zero as a connected institutional habitat: enter normally, be recognized, converse with Essenthius, recover relevant context, compose people/knowledge/tools/providers, authorize action, observe real consequence, learn, leave and return with continuity.

## 27. Non-inferences

This plan does not establish:

- #235 Human acceptance;
- Huly final adoption;
- GitHub/Linear/Google adapters implemented;
- production-ready external model routing;
- hosted deployment;
- founder one-week dogfood;
- external benefit;
- adoption;
- PMF;
- scale.

`PLAN ≠ IMPLEMENTED`

`IMPLEMENTED ≠ INTEGRATED`

`INTEGRATED ≠ HABITABLE`

`HABITABLE ≠ USEFUL`

`USEFUL N=1 ≠ ADOPTION`
