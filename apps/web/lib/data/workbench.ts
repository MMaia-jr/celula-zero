import { createSupabaseServerClient } from "@/lib/supabase/server";

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


interface RawActorMembership {
  actor_id: string;
}

interface RawStewardMembership {
  project_id: string;
}

interface RawProject {
  id: string;
  slug: string;
  title: string;
  stage: string;
  source_label: string;
  steward_actor_id: string;
  updated_at: string;
}

interface RawProjectMember {
  project_id: string;
  actor_id: string;
  role: string;
}

interface RawActor {
  id: string;
  name: string;
  kind: WorkbenchActor["kind"];
  operator_label: string | null;
}

interface RawOpportunity {
  id: string;
  project_id: string;
  owner_actor_id: string;
  state: WorkbenchOpportunityState;
  visibility: "PROJECT" | "PUBLIC";
  current_version: number;
  material_version: number;
  capacity: number;
  opportunity_versions: Array<{
    version: number;
    title: string;
    statement: string;
    conditions: string;
    expected_result: string;
  }>;
}

interface RawProposal {
  id: string;
  opportunity_id: string;
  proposer_actor_id: string;
  state: WorkbenchProposalState;
  current_version: number;
  material_version: number;
  created_at: string;
  proposal_versions: Array<{
    version: number;
    statement: string;
    conditions: string;
    expected_delivery: string;
    reward_expectation: string;
  }>;
}

interface RawCommitment {
  id: string;
  project_id: string;
  opportunity_id: string;
  opportunity_version: number;
  proposal_id: string;
  proposal_version: number;
  proposer_actor_id: string;
  accepted_by_actor_id: string;
  created_at: string;
}

interface RawContribution {
  id: string;
  project_id: string;
  commitment_id: string;
  author_actor_id: string;
  description: string;
  limitations: string;
  submitted_at: string;
}

interface RawArtifact {
  id: string;
  project_id: string;
  contribution_id: string;
  created_by_actor_id: string;
  kind: string;
  uri: string;
  digest: string;
  media_type: string;
  size_bytes: number | null;
  retention_class: string;
  created_at: string;
}

interface RawClaim {
  id: string;
  project_id: string;
  subject_type: "CONTRIBUTION" | "ARTIFACT";
  subject_id: string;
  author_actor_id: string;
  statement: string;
  scope_description: string;
  state: "RECORDED";
  created_at: string;
}

interface RawEvidenceItem {
  id: string;
  project_id: string;
  source_artifact_id: string;
  custodian_actor_id: string;
  description: string;
  limitations: string;
  digest: string;
  state: "DOCUMENTED";
  created_at: string;
}

interface RawEvidenceLink {
  id: string;
  evidence_item_id: string;
  claim_id: string;
  relation: "SUPPORTS" | "CHALLENGES" | "CONTEXTUALIZES" | "REPLICATES";
  declared_by_actor_id: string;
}

interface RawVerificationRequest {
  id: string;
  project_id: string;
  claim_id: string;
  requester_actor_id: string;
  reviewer_actor_id: string;
  criteria: string;
  expected_method: string;
  conflict_codes: string[];
  independence: "INDEPENDENT" | "NON_INDEPENDENT";
  state: "OPEN" | "COMPLETED";
  created_at: string;
}

interface RawVerification {
  id: string;
  request_id: string;
  project_id: string;
  claim_id: string;
  verifier_actor_id: string;
  method: string;
  findings: string;
  classification: WorkbenchVerificationClassification;
  limitations: string;
  conflict_codes: string[];
  independence: "INDEPENDENT" | "NON_INDEPENDENT";
  created_at: string;
}

interface RawDomainEvent {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  actor_id: string;
  authorized_by_actor_id: string;
  occurred_at: string;
  material_version_before: number | null;
  material_version_after: number | null;
  payload: Record<string, unknown> | null;
  canonical_digest: string;
}

function currentOpportunity(row: RawOpportunity): WorkbenchOpportunity {
  const current = row.opportunity_versions.find(
    ({ version }) => version === row.current_version,
  );
  if (!current) {
    throw new Error(`Oportunidade ${row.id} sem versão material atual.`);
  }

  return {
    id: row.id,
    ownerActorId: row.owner_actor_id,
    state: row.state,
    visibility: row.visibility,
    currentVersion: row.current_version,
    materialVersion: row.material_version,
    capacity: row.capacity,
    title: current.title,
    statement: current.statement,
    conditions: current.conditions,
    expectedResult: current.expected_result,
  };
}

function currentProposal(row: RawProposal): WorkbenchProposal {
  const current = row.proposal_versions.find(
    ({ version }) => version === row.current_version,
  );
  if (!current) {
    throw new Error(`Proposta ${row.id} sem versão material atual.`);
  }

  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    proposerActorId: row.proposer_actor_id,
    state: row.state,
    currentVersion: row.current_version,
    materialVersion: row.material_version,
    statement: current.statement,
    conditions: current.conditions,
    expectedDelivery: current.expected_delivery,
    rewardExpectation: current.reward_expectation,
    createdAt: row.created_at,
  };
}

export async function getWorkbenchData(): Promise<WorkbenchData> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE", projects: [] };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { status: "ANONYMOUS", projects: [] };

  const { data: actorMemberships, error: actorError } = await client
    .from("actor_memberships")
    .select("actor_id")
    .eq("profile_id", authData.user.id)
    .in("role", ["OWNER", "OPERATOR", "REPRESENTATIVE"]);

  if (actorError) {
    throw new Error(`Não foi possível resolver atores controlados: ${actorError.message}`);
  }

  const controlledActorIds: string[] = [
    ...new Set(
      ((actorMemberships ?? []) as unknown as RawActorMembership[]).map(
        ({ actor_id }) => actor_id,
      ),
    ),
  ];

  if (!controlledActorIds.length) {
    return { status: "READY", projects: [] };
  }

  const { data: stewardMemberships, error: stewardError } = await client
    .from("project_members")
    .select("project_id")
    .eq("role", "PROJECT_STEWARD")
    .in("actor_id", controlledActorIds);

  if (stewardError) {
    throw new Error(`Não foi possível carregar stewardship: ${stewardError.message}`);
  }

  const projectIds: string[] = [
    ...new Set(
      ((stewardMemberships ?? []) as unknown as RawStewardMembership[]).map(
        ({ project_id }) => project_id,
      ),
    ),
  ];

  if (!projectIds.length) {
    return { status: "READY", projects: [] };
  }

  const [
    { data: projects, error: projectsError },
    { data: projectMembers, error: projectMembersError },
    { data: opportunities, error: opportunitiesError },
    { data: commitments, error: commitmentsError },
    { data: contributions, error: contributionsError },
    { data: artifacts, error: artifactsError },
    { data: claims, error: claimsError },
    { data: evidenceItems, error: evidenceItemsError },
    { data: verificationRequests, error: verificationRequestsError },
    { data: verifications, error: verificationsError },
    { data: domainEvents, error: domainEventsError },
  ] = await Promise.all([
    client
      .from("projects")
      .select("id, slug, title, stage, source_label, steward_actor_id, updated_at")
      .in("id", projectIds)
      .order("updated_at", { ascending: false }),
    client
      .from("project_members")
      .select("project_id, actor_id, role")
      .in("project_id", projectIds),
    client
      .from("opportunities")
      .select(`
        id, project_id, owner_actor_id, state, visibility,
        current_version, material_version, capacity,
        opportunity_versions(version, title, statement, conditions, expected_result)
      `)
      .in("project_id", projectIds)
      .order("created_at", { ascending: true }),
    client
      .from("commitments")
      .select(`
        id, project_id, opportunity_id, opportunity_version,
        proposal_id, proposal_version, proposer_actor_id,
        accepted_by_actor_id, created_at
      `)
      .in("project_id", projectIds)
      .order("created_at", { ascending: true }),
    client
      .from("contributions")
      .select(`
        id, project_id, commitment_id, author_actor_id,
        description, limitations, submitted_at
      `)
      .in("project_id", projectIds)
      .order("submitted_at", { ascending: true }),
    client
      .from("artifacts")
      .select(`
        id, project_id, contribution_id, created_by_actor_id,
        kind, uri, digest, media_type, size_bytes, retention_class, created_at
      `)
      .in("project_id", projectIds)
      .order("created_at", { ascending: true }),
    client
      .from("claims")
      .select(`
        id, project_id, subject_type, subject_id, author_actor_id,
        statement, scope_description, state, created_at
      `)
      .in("project_id", projectIds)
      .order("created_at", { ascending: true }),
    client
      .from("evidence_items")
      .select(`
        id, project_id, source_artifact_id, custodian_actor_id,
        description, limitations, digest, state, created_at
      `)
      .in("project_id", projectIds)
      .order("created_at", { ascending: true }),
    client
      .from("verification_requests")
      .select(`
        id, project_id, claim_id, requester_actor_id, reviewer_actor_id,
        criteria, expected_method, conflict_codes, independence, state, created_at
      `)
      .in("project_id", projectIds)
      .order("created_at", { ascending: true }),
    client
      .from("verifications")
      .select(`
        id, request_id, project_id, claim_id, verifier_actor_id,
        method, findings, classification, limitations,
        conflict_codes, independence, created_at
      `)
      .in("project_id", projectIds)
      .order("created_at", { ascending: true }),
    client
      .from("domain_events")
      .select(`
        id, event_type, aggregate_type, aggregate_id,
        actor_id, authorized_by_actor_id, occurred_at,
        material_version_before, material_version_after,
        payload, canonical_digest
      `)
      .order("occurred_at", { ascending: true }),
  ]);

  const errors = [
    ["projetos", projectsError],
    ["membros do projeto", projectMembersError],
    ["oportunidades", opportunitiesError],
    ["commitments", commitmentsError],
    ["contribuições", contributionsError],
    ["artefatos", artifactsError],
    ["claims", claimsError],
    ["evidências", evidenceItemsError],
    ["pedidos de verificação", verificationRequestsError],
    ["verificações", verificationsError],
    ["eventos de domínio", domainEventsError],
  ] as const;

  for (const [label, error] of errors) {
    if (error) throw new Error(`Não foi possível carregar ${label}: ${error.message}`);
  }

  const rawProjects = (projects ?? []) as unknown as RawProject[];
  const rawProjectMembers = (projectMembers ?? []) as unknown as RawProjectMember[];
  const rawOpportunities = (opportunities ?? []) as unknown as RawOpportunity[];
  const opportunityIds = rawOpportunities.map(({ id }) => id);

  let rawProposals: RawProposal[] = [];
  if (opportunityIds.length) {
    const { data, error } = await client
      .from("proposals")
      .select(`
        id, opportunity_id, proposer_actor_id, state,
        current_version, material_version, created_at,
        proposal_versions(
          version, statement, conditions, expected_delivery, reward_expectation
        )
      `)
      .in("opportunity_id", opportunityIds)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Não foi possível carregar propostas: ${error.message}`);
    rawProposals = (data ?? []) as unknown as RawProposal[];
  }

  const rawClaims = (claims ?? []) as unknown as RawClaim[];
  const claimIds = rawClaims.map(({ id }) => id);

  let rawEvidenceLinks: RawEvidenceLink[] = [];
  if (claimIds.length) {
    const { data, error } = await client
      .from("evidence_links")
      .select("id, evidence_item_id, claim_id, relation, declared_by_actor_id")
      .in("claim_id", claimIds)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Não foi possível carregar relações de evidência: ${error.message}`);
    rawEvidenceLinks = (data ?? []) as unknown as RawEvidenceLink[];
  }

  const rawCommitments = (commitments ?? []) as unknown as RawCommitment[];
  const rawContributions = (contributions ?? []) as unknown as RawContribution[];
  const rawArtifacts = (artifacts ?? []) as unknown as RawArtifact[];
  const rawEvidenceItems = (evidenceItems ?? []) as unknown as RawEvidenceItem[];
  const rawVerificationRequests =
    (verificationRequests ?? []) as unknown as RawVerificationRequest[];
  const rawVerifications = (verifications ?? []) as unknown as RawVerification[];
  const rawDomainEvents = (domainEvents ?? []) as unknown as RawDomainEvent[];

  const referencedActorIds = new Set<string>(controlledActorIds);
  for (const project of rawProjects) referencedActorIds.add(project.steward_actor_id);
  for (const member of rawProjectMembers) referencedActorIds.add(member.actor_id);
  for (const row of rawOpportunities) referencedActorIds.add(row.owner_actor_id);
  for (const row of rawProposals) referencedActorIds.add(row.proposer_actor_id);
  for (const row of rawCommitments) {
    referencedActorIds.add(row.proposer_actor_id);
    referencedActorIds.add(row.accepted_by_actor_id);
  }
  for (const row of rawContributions) referencedActorIds.add(row.author_actor_id);
  for (const row of rawArtifacts) referencedActorIds.add(row.created_by_actor_id);
  for (const row of rawClaims) referencedActorIds.add(row.author_actor_id);
  for (const row of rawEvidenceItems) referencedActorIds.add(row.custodian_actor_id);
  for (const row of rawEvidenceLinks) referencedActorIds.add(row.declared_by_actor_id);
  for (const row of rawVerificationRequests) {
    referencedActorIds.add(row.requester_actor_id);
    referencedActorIds.add(row.reviewer_actor_id);
  }
  for (const row of rawVerifications) referencedActorIds.add(row.verifier_actor_id);
  for (const row of rawDomainEvents) {
    referencedActorIds.add(row.actor_id);
    referencedActorIds.add(row.authorized_by_actor_id);
  }

  const { data: actors, error: actorsError } = await client
    .from("actors")
    .select("id, name, kind, operator_label")
    .in("id", [...referencedActorIds]);

  if (actorsError) {
    throw new Error(`Não foi possível carregar atores operacionais: ${actorsError.message}`);
  }

  const rawActors = (actors ?? []) as unknown as RawActor[];
  const actorById = new Map(rawActors.map((actor) => [actor.id, actor]));
  const controlled = new Set(controlledActorIds);

  const projectByOpportunity = new Map(
    rawOpportunities.map((row) => [row.id, row.project_id]),
  );
  const opportunityByProposal = new Map(
    rawProposals.map((row) => [row.id, row.opportunity_id]),
  );
  const projectByCommitment = new Map(
    rawCommitments.map((row) => [row.id, row.project_id]),
  );
  const projectByContribution = new Map(
    rawContributions.map((row) => [row.id, row.project_id]),
  );
  const projectByArtifact = new Map(
    rawArtifacts.map((row) => [row.id, row.project_id]),
  );
  const projectByClaim = new Map(rawClaims.map((row) => [row.id, row.project_id]));
  const projectByEvidence = new Map(
    rawEvidenceItems.map((row) => [row.id, row.project_id]),
  );
  const projectByVerificationRequest = new Map(
    rawVerificationRequests.map((row) => [row.id, row.project_id]),
  );
  const projectByVerification = new Map(
    rawVerifications.map((row) => [row.id, row.project_id]),
  );

  function projectForEvent(event: RawDomainEvent): string | null {
    const payloadProjectId = event.payload?.project_id;
    if (typeof payloadProjectId === "string" && projectIds.includes(payloadProjectId)) {
      return payloadProjectId;
    }

    if (event.aggregate_type === "OPPORTUNITY") {
      return projectByOpportunity.get(event.aggregate_id) ?? null;
    }
    if (event.aggregate_type === "PROPOSAL") {
      const opportunityId = opportunityByProposal.get(event.aggregate_id);
      return opportunityId ? projectByOpportunity.get(opportunityId) ?? null : null;
    }
    if (event.aggregate_type === "COMMITMENT") {
      return projectByCommitment.get(event.aggregate_id) ?? null;
    }
    if (event.aggregate_type === "CONTRIBUTION") {
      return projectByContribution.get(event.aggregate_id) ?? null;
    }
    if (event.aggregate_type === "ARTIFACT") {
      return projectByArtifact.get(event.aggregate_id) ?? null;
    }
    if (event.aggregate_type === "CLAIM") {
      return projectByClaim.get(event.aggregate_id) ?? null;
    }
    if (event.aggregate_type === "EVIDENCE") {
      return projectByEvidence.get(event.aggregate_id) ?? null;
    }
    if (event.aggregate_type === "VERIFICATION_REQUEST") {
      return projectByVerificationRequest.get(event.aggregate_id) ?? null;
    }
    if (event.aggregate_type === "VERIFICATION") {
      return projectByVerification.get(event.aggregate_id) ?? null;
    }

    return null;
  }

  return {
    status: "READY",
    projects: rawProjects.map((project) => {
      const memberships = rawProjectMembers.filter(
        (member) => member.project_id === project.id,
      );
      const actorIds = new Set([
        project.steward_actor_id,
        ...memberships.map(({ actor_id }) => actor_id),
      ]);

      return {
        id: project.id,
        slug: project.slug,
        title: project.title,
        stage: project.stage,
        sourceLabel: project.source_label,
        stewardActorId: project.steward_actor_id,
        actors: [...actorIds]
          .map((actorId) => {
            const actor = actorById.get(actorId);
            if (!actor) return null;
            return {
              id: actor.id,
              name: actor.name,
              kind: actor.kind as WorkbenchActor["kind"],
              operatorLabel: actor.operator_label,
              controlled: controlled.has(actor.id),
              roles: memberships
                .filter((member) => member.actor_id === actor.id)
                .map((member) => member.role),
            };
          })
          .filter((actor): actor is WorkbenchActor => actor !== null),
        opportunities: rawOpportunities
          .filter((row) => row.project_id === project.id)
          .map(currentOpportunity),
        proposals: rawProposals
          .filter(
            (row) =>
              projectByOpportunity.get(row.opportunity_id) === project.id,
          )
          .map(currentProposal),
        commitments: rawCommitments
          .filter((row) => row.project_id === project.id)
          .map((row) => ({
            id: row.id,
            opportunityId: row.opportunity_id,
            opportunityVersion: row.opportunity_version,
            proposalId: row.proposal_id,
            proposalVersion: row.proposal_version,
            proposerActorId: row.proposer_actor_id,
            acceptedByActorId: row.accepted_by_actor_id,
            createdAt: row.created_at,
          })),
        contributions: rawContributions
          .filter((row) => row.project_id === project.id)
          .map((row) => ({
            id: row.id,
            commitmentId: row.commitment_id,
            authorActorId: row.author_actor_id,
            description: row.description,
            limitations: row.limitations,
            submittedAt: row.submitted_at,
          })),
        artifacts: rawArtifacts
          .filter((row) => row.project_id === project.id)
          .map((row) => ({
            id: row.id,
            contributionId: row.contribution_id,
            createdByActorId: row.created_by_actor_id,
            kind: row.kind,
            uri: row.uri,
            digest: row.digest,
            mediaType: row.media_type,
            sizeBytes: row.size_bytes,
            retentionClass: row.retention_class,
            createdAt: row.created_at,
          })),
        claims: rawClaims
          .filter((row) => row.project_id === project.id)
          .map((row) => ({
            id: row.id,
            subjectType: row.subject_type,
            subjectId: row.subject_id,
            authorActorId: row.author_actor_id,
            statement: row.statement,
            scopeDescription: row.scope_description,
            state: row.state,
            createdAt: row.created_at,
          })),
        evidenceItems: rawEvidenceItems
          .filter((row) => row.project_id === project.id)
          .map((row) => ({
            id: row.id,
            sourceArtifactId: row.source_artifact_id,
            custodianActorId: row.custodian_actor_id,
            description: row.description,
            limitations: row.limitations,
            digest: row.digest,
            state: row.state,
            createdAt: row.created_at,
          })),
        evidenceLinks: rawEvidenceLinks.filter((row) =>
          projectByClaim.get(row.claim_id) === project.id
        ).map((row) => ({
          id: row.id,
          evidenceItemId: row.evidence_item_id,
          claimId: row.claim_id,
          relation: row.relation,
          declaredByActorId: row.declared_by_actor_id,
        })),
        verificationRequests: rawVerificationRequests
          .filter((row) => row.project_id === project.id)
          .map((row) => ({
            id: row.id,
            claimId: row.claim_id,
            requesterActorId: row.requester_actor_id,
            reviewerActorId: row.reviewer_actor_id,
            criteria: row.criteria,
            expectedMethod: row.expected_method,
            conflictCodes: row.conflict_codes,
            independence: row.independence,
            state: row.state,
            createdAt: row.created_at,
          })),
        verifications: rawVerifications
          .filter((row) => row.project_id === project.id)
          .map((row) => ({
            id: row.id,
            requestId: row.request_id,
            claimId: row.claim_id,
            verifierActorId: row.verifier_actor_id,
            method: row.method,
            findings: row.findings,
            classification: row.classification,
            limitations: row.limitations,
            conflictCodes: row.conflict_codes,
            independence: row.independence,
            createdAt: row.created_at,
          })),
        events: rawDomainEvents
          .filter((event) => projectForEvent(event) === project.id)
          .map((event) => ({
            id: event.id,
            eventType: event.event_type,
            aggregateType: event.aggregate_type,
            aggregateId: event.aggregate_id,
            actorId: event.actor_id,
            authorizedByActorId: event.authorized_by_actor_id,
            occurredAt: event.occurred_at,
            materialVersionBefore: event.material_version_before,
            materialVersionAfter: event.material_version_after,
            payload: event.payload ?? {},
            canonicalDigest: event.canonical_digest,
          })),
      };
    }),
  };
}
