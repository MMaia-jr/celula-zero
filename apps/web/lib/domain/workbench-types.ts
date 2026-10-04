// Historical CZ Workbench semantic contracts, extracted for provider-neutral reuse.
export type WorkbenchOpportunityState = "DRAFT" | "OPEN" | "CLOSED";
export type WorkbenchProposalState =
  | "SUBMITTED"
  | "REVISION_REQUESTED"
  | "REJECTED"
  | "ACCEPTED";
export type WorkbenchVerificationClassification =
  | "PASS"
  | "FAIL"
  | "PARTIAL"
  | "INCONCLUSIVE";

export interface WorkbenchActor {
  id: string;
  name: string;
  kind: "PERSON" | "AI_AGENT" | "ORGANIZATION" | "SYSTEM";
  operatorLabel: string | null;
  controlled: boolean;
  roles: string[];
}

export interface WorkbenchOpportunity {
  id: string;
  ownerActorId: string;
  state: WorkbenchOpportunityState;
  visibility: "PROJECT" | "PUBLIC";
  currentVersion: number;
  materialVersion: number;
  capacity: number;
  title: string;
  statement: string;
  conditions: string;
  expectedResult: string;
  versions?: Array<{
    version: number;
    title: string;
    statement: string;
    conditions: string;
    expectedResult: string;
  }>;
}

export interface WorkbenchProposal {
  id: string;
  opportunityId: string;
  proposerActorId: string;
  state: WorkbenchProposalState;
  currentVersion: number;
  materialVersion: number;
  statement: string;
  conditions: string;
  expectedDelivery: string;
  rewardExpectation: string;
  createdAt: string;
  versions?: Array<{
    version: number;
    statement: string;
    conditions: string;
    expectedDelivery: string;
    rewardExpectation: string;
  }>;
}

export interface WorkbenchCommitment {
  id: string;
  opportunityId: string;
  opportunityVersion: number;
  proposalId: string;
  proposalVersion: number;
  proposerActorId: string;
  acceptedByActorId: string;
  createdAt: string;
}

export interface WorkbenchContribution {
  id: string;
  commitmentId: string;
  authorActorId: string;
  description: string;
  limitations: string;
  submittedAt: string;
}

export interface WorkbenchArtifact {
  id: string;
  contributionId: string;
  createdByActorId: string;
  kind: string;
  uri: string;
  digest: string;
  mediaType: string;
  sizeBytes: number | null;
  retentionClass: string;
  createdAt: string;
}

export interface WorkbenchClaim {
  id: string;
  subjectType: "CONTRIBUTION" | "ARTIFACT";
  subjectId: string;
  authorActorId: string;
  statement: string;
  scopeDescription: string;
  state: "RECORDED";
  createdAt: string;
}

export interface WorkbenchEvidenceItem {
  id: string;
  sourceArtifactId: string;
  custodianActorId: string;
  description: string;
  limitations: string;
  digest: string;
  state: "DOCUMENTED";
  createdAt: string;
}

export interface WorkbenchEvidenceLink {
  id: string;
  evidenceItemId: string;
  claimId: string;
  relation: "SUPPORTS" | "CHALLENGES" | "CONTEXTUALIZES" | "REPLICATES";
  declaredByActorId: string;
}

export interface WorkbenchVerificationRequest {
  id: string;
  claimId: string;
  requesterActorId: string;
  reviewerActorId: string;
  criteria: string;
  expectedMethod: string;
  conflictCodes: string[];
  independence: "INDEPENDENT" | "NON_INDEPENDENT";
  state: "OPEN" | "COMPLETED";
  createdAt: string;
}

export interface WorkbenchVerification {
  id: string;
  requestId: string;
  claimId: string;
  verifierActorId: string;
  method: string;
  findings: string;
  classification: WorkbenchVerificationClassification;
  limitations: string;
  conflictCodes: string[];
  independence: "INDEPENDENT" | "NON_INDEPENDENT";
  createdAt: string;
}

export interface WorkbenchDomainEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  actorId: string;
  authorizedByActorId: string;
  occurredAt: string;
  materialVersionBefore: number | null;
  materialVersionAfter: number | null;
  payload: Record<string, unknown>;
  canonicalDigest: string;
}

export interface WorkbenchProject {
  id: string;
  slug: string;
  title: string;
  stage: string;
  sourceLabel: string;
  stewardActorId: string;
  actors: WorkbenchActor[];
  opportunities: WorkbenchOpportunity[];
  proposals: WorkbenchProposal[];
  commitments: WorkbenchCommitment[];
  contributions: WorkbenchContribution[];
  artifacts: WorkbenchArtifact[];
  claims: WorkbenchClaim[];
  evidenceItems: WorkbenchEvidenceItem[];
  evidenceLinks: WorkbenchEvidenceLink[];
  verificationRequests: WorkbenchVerificationRequest[];
  verifications: WorkbenchVerification[];
  events: WorkbenchDomainEvent[];
}

export type WorkbenchData =
  | { status: "UNAVAILABLE"; projects: [] }
  | { status: "ANONYMOUS"; projects: [] }
  | { status: "READY"; projects: WorkbenchProject[] };
