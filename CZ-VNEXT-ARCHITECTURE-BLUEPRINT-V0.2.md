# CZ vNext — Architecture Blueprint V0.2

Status:

`ADOPTED ARCHITECTURE / CANONICAL`

Canonical base inspected:

`3eb7560034bbc559213bf191aa092f4f0f9cac57`

## 1. Product goal

Build Célula Zero as a coherent online institution that ordinary people can use without
technical know-how while preserving strong institutional semantics beneath the surface.

Primary experience rule:

`ARCHITECTURE IS MODULAR`

`EXPERIENCE IS CONTINUOUS`

`INTERNAL SYSTEM COMPLEXITY ↑`

`PERCEIVED HUMAN COMPLEXITY ↓`

`HUMAN CAPACITY ↑`

## 2. Human surface

Global navigation target:

`Home / Cells / Discover / Activity / You`

Essenthius is contextual and transversal rather than a mandatory standalone destination.

The main interaction surface combines:

### Continuity
- continue current work;
- review decisions requiring attention;
- inspect completed results;
- resume a prior Cell context.

### Clear human actions
- Create;
- Solve;
- Find;
- Decide;
- Learn;
- Register an experience;
- Improve my profile;
- See what needs me.

### Natural input
A free text/voice/file/link/image input remains available everywhere.

The system must not force internal ontology on ordinary users.

## 3. Identity, Presence & Experience

Core entities:

- Person
- Agent
- IdentityCredential
- Profile
- ExternalIdentity
- ProfileSource
- Experience
- Capability
- PortfolioItem
- BioView
- VisibilityPolicy
- EvidenceLink

Core invariants:

`AUTH ACCOUNT ≠ PERSON`

`PERSON ≠ PROFILE`

`PROFILE ≠ BIO`

`EXPERIENCE ≠ EVIDENCE`

`ACTIVITY ≠ CAPABILITY`

`CAPABILITY ≠ VERIFIED CAPABILITY`

Profile sources may include user-authorized or public:

- GitHub;
- LinkedIn;
- Lattes;
- Instagram;
- YouTube;
- Google Drive;
- Gmail;
- Calendar;
- personal websites;
- organization websites;
- public web research.

Profile enrichment pipeline:

`SOURCE`
→ `OBSERVATION`
→ `POSSIBLE MATCH`
→ `INTERPRETATION`
→ `PROFILE CLAIM / EXPERIENCE CANDIDATE`
→ `HUMAN REVIEW`
→ `PROFILE ITEM`
→ optional `EVIDENCE / VERIFICATION`

Private sources may inform a candidate without becoming public content.

## 4. Cells, Relations & Authority

Core entities:

- Cell
- Relation
- Membership
- Role
- Authority
- Mandate
- Delegation
- Policy

A Cell is the institutional context in which people, work, capabilities, decisions,
resources and consequences relate.

The first Cell is:

`Cell: Célula Zero`

Initial relation:

`Marcos → Founder / Steward → Cell:Célula Zero`

Authority remains contextual.

## 5. Records, Knowledge & Provenance

Core entities:

- OriginalRecord
- Interpretation
- Claim
- Evidence
- Verification
- Source
- ArtifactReference
- ProvenanceLink

Invariant:

`Original Record ≠ Interpretation ≠ Claim ≠ Evidence ≠ Verification ≠ Decision`

All system-generated interpretations must remain attributable to their generating actor
or model run.

## 6. Work & Consequence

Core entities:

- Need
- Opportunity
- Work
- Action
- Contribution
- Artifact
- Result
- Evaluation
- Consequence
- Continuation

Human surface language should be simpler than these internal entities.

## 7. Connections & Capabilities

Core entities:

- Connection
- AuthorizationGrant
- ExternalAccount
- ExternalResource
- CredentialReference
- CapabilityDefinition
- CapabilityBinding
- ActionRequest
- ExternalExecution
- ExternalResult

Connection ownership:

- PersonConnection
- CellConnection
- ServiceConnection

Provider integration rule:

`PROVIDER → ADAPTER → CZ CAPABILITY CONTRACT → DOMAIN`

Core/high-trust provider candidates:

- GitHub;
- Supabase;
- Vercel;
- Linear.

Long-tail provider candidates may use an integration broker behind the same CZ
Connection contract.

Secrets never become ordinary domain values. Store opaque credential references only.

## 8. Capability Registry

Example capabilities:

- github.repository.read
- github.issue.create
- github.branch.create
- github.pull_request.open
- github.pull_request.review
- github.pull_request.merge
- linear.issue.read
- linear.issue.write
- supabase.project.inspect
- supabase.database.read
- supabase.migration.apply
- vercel.project.read
- vercel.preview.deploy
- vercel.production.deploy

Capability metadata:

- provider
- connection
- resource
- read/write
- risk
- cost
- reversibility
- authority requirement
- approval policy

## 9. Action Gateway

All authority-sensitive external effects flow through:

`INTENTION`
→ `PLAN`
→ `CAPABILITY REQUEST`
→ `AUTHORITY CHECK`
→ `HUMAN / POLICY APPROVAL WHEN REQUIRED`
→ `EXECUTOR`
→ `EXTERNAL RESULT`
→ `CZ RESULT`
→ `CONSEQUENCE`

Preserve:

`REQUEST ≠ AUTHORIZATION ≠ EXECUTION ≠ RESULT ≠ CONSEQUENCE`

## 10. Essenthius & Institutional Memory

Essenthius components:

- Context Compiler
- Memory Retrieval
- Intent Interpreter
- Planner
- Capability Discovery
- Authority Evaluation
- Model Router
- Executor Router
- Result Interpreter
- Continuation Manager

Memory retrieval order:

`STRUCTURED STATE`
→ `ATTRIBUTABLE RECORDS`
→ `CURRENT PROJECTIONS`
→ `EXACT SEARCH`
→ `FULL TEXT`
→ `SEMANTIC RETRIEVAL`
→ `MODEL REASONING`

Preserve:

`MEMORY ≠ VECTOR DATABASE`

`MODEL MEMORY ≠ ESSENTHIUS MEMORY`

## 11. Governance

Core entities:

- GovernanceQuestion
- Proposal
- Deliberation
- Position
- Policy
- Decision
- Authorization
- MandateChange

Governance chain:

`ORIGINAL RECORD`
→ `QUESTION`
→ `ALTERNATIVES`
→ `CLAIMS / EVIDENCE`
→ `PROPOSAL`
→ `DELIBERATION`
→ `HUMAN DECISION`
→ `POLICY / MANDATE`
→ `CONSEQUENCE`

## 12. Development & Operations

Core entities:

- Repository
- DevelopmentIntent
- ChangePlan
- DevelopmentTask
- AgentRun
- Review
- CandidateChange
- PullRequestRef
- BuildResult
- Deployment
- Incident

Target self-development flow:

`Marcos in Cell:Célula Zero`
→ `intent`
→ `context`
→ `development plan`
→ `Human authorization`
→ `executor`
→ `code`
→ `tests`
→ `review`
→ `candidate`
→ `Human Decision`
→ `promotion authorization`
→ `merge / deploy`
→ `consequence`

## 13. Economy & Contextual Trust

Economy chain:

`Opportunity`
→ `Conditions`
→ `Agreement`
→ `Contribution`
→ `Result`
→ `Evaluation`
→ `Settlement`
→ `Consequence`

Payment rails remain external/adaptable.

Trust remains contextual:

`I trust X for Y based on Z`

No universal reputation score is required.

## 14. Portability & Federation

Core entities:

- ExportPackage
- Snapshot
- Handoff
- Import
- CellRelation
- SharedCapability
- FederationPolicy

Essential institutional data must not exist only in one SaaS provider.

## 15. Platform Contract

CZ domain modules must depend on a CZ-owned platform interface rather than importing Huly
semantics everywhere.

Initial target contract:

- Identity substrate
- Realtime
- Documents
- Collaboration
- Files
- Activity
- Search
- Notifications
- Storage
- Background jobs

Initial adapter candidate:

`HulyPlatformAdapter`

Preserve:

`CZ DOMAIN ≠ HULY DOMAIN`

`CZ EXPERIENCE ≠ HULY UI`

## 16. Huly classification

For every CZ requirement classify Huly capability as:

- ADOPT
- MAP
- PLUGIN
- SERVICE
- CORE PATCH
- EXTERNAL

Default preference:

`ADOPT → MAP → PLUGIN/SERVICE → CORE PATCH`

A core patch requires a concrete CZ property that clean extension cannot preserve.

## 17. Repository shape target

Provisional:

```text
apps/
  cz-web/

packages/
  identity/
  presence/
  cells/
  authority/
  records/
  work/
  connections/
  capabilities/
  essenthius/
  governance/
  development/
  economy/
  trust/
  portability/
  federation/

  platform-contract/
  platform-huly/

  provider-github/
  provider-linear/
  provider-supabase/
  provider-vercel/
  provider-google/

  ui/
  events/
  observability/
  security/
```

Historical implementation remains preserved during transition.

Do not destructively migrate or delete prior implementation before vNext reaches a
separate Human Review gate.

## 18. First construction tranche

Build together:

1. Fresh CZ experience shell
2. Identity / Presence / Experience
3. Cells / Relations / Authority
4. Platform Contract
5. Huly adapter candidate where useful
6. minimum Records/Provenance support required by the above

Expected first visible state:

- Marcos can enter the new CZ experience;
- Marcos exists as a Person with a Profile;
- `Cell:Célula Zero` exists and Marcos has an explicit Founder/Steward relation;
- profile can accept a manually reported Experience;
- profile can represent at least one external identity/source connection structurally;
- home shows Continuity + clear human actions + natural input;
- no old CZ frontend or Huly product UI is required for the experience.

This is a product tranche, not a disposable harness.

## 19. Construction discipline

The architecture is intentionally complete, but implementation remains staged by module
dependency.

Do not reopen product identity at every module.

Do not add infrastructure solely because it is architecturally fashionable.

Use mature external capability when it satisfies the required property.

Extend only at the module boundary that needs the missing property.

## 20. Promotion / deployment boundary

This blueprint is an implementation candidate only.

It does not authorize Git promotion, remote DB writes, Huly fork creation, deployment,
paid calls, production secrets, outreach or external-user onboarding.
