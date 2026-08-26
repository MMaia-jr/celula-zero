import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProposalState =
  | "SUBMITTED"
  | "REVISION_REQUESTED"
  | "REJECTED"
  | "ACCEPTED";

export interface CoordinationOpportunity {
  id: string;
  projectId: string;
  needId: string | null;
  state: "DRAFT" | "OPEN" | "CLOSED";
  visibility: "PROJECT" | "PUBLIC";
  currentVersion: number;
  materialVersion: number;
  capacity: number;
  title: string;
  statement: string;
  conditions: string;
  expectedResult: string;
}

export interface CoordinationProposal {
  id: string;
  proposerActorId: string;
  proposerName: string;
  state: ProposalState;
  currentVersion: number;
  materialVersion: number;
  statement: string;
  conditions: string;
  expectedDelivery: string;
  rewardExpectation: string;
  createdAt: string;
}

export interface CoordinationCommitment {
  id: string;
  projectId: string;
  opportunityId: string;
  opportunityVersion: number;
  proposalId: string;
  proposalVersion: number;
  proposerActorId: string;
  proposerName: string;
  acceptedByActorId: string;
  acceptedByName: string;
  createdAt: string;
}

export interface OpportunityCoordination {
  opportunity: CoordinationOpportunity;
  viewer:
    | { status: "ANONYMOUS"; controlledActorIds: []; isSteward: false }
    | {
        status: "AUTHENTICATED";
        controlledActorIds: string[];
        isSteward: boolean;
      };
  proposals: CoordinationProposal[];
  commitments: CoordinationCommitment[];
}

interface RawOpportunity {
  id: string;
  project_id: string;
  need_id: string | null;
  state: CoordinationOpportunity["state"];
  visibility: CoordinationOpportunity["visibility"];
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
  proposer_actor_id: string;
  state: ProposalState;
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

function mapOpportunity(row: RawOpportunity): CoordinationOpportunity | null {
  const current = row.opportunity_versions.find(
    ({ version }) => version === row.current_version,
  );
  if (!current) return null;

  return {
    id: row.id,
    projectId: row.project_id,
    needId: row.need_id,
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

function mapProposal(
  row: RawProposal,
  actorNames: Map<string, string>,
): CoordinationProposal | null {
  const current = row.proposal_versions.find(
    ({ version }) => version === row.current_version,
  );
  if (!current) return null;

  return {
    id: row.id,
    proposerActorId: row.proposer_actor_id,
    proposerName: actorNames.get(row.proposer_actor_id) ?? "PERSON",
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

export async function getOpportunityCoordination(
  projectId: string,
  opportunityId: string,
): Promise<OpportunityCoordination | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  const { data: opportunityData, error: opportunityError } = await client
    .from("opportunities")
    .select(`
      id, project_id, need_id, state, visibility,
      current_version, material_version, capacity,
      opportunity_versions(
        version, title, statement, conditions, expected_result
      )
    `)
    .eq("id", opportunityId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (opportunityError) {
    throw new Error(`Não foi possível carregar a Opportunity: ${opportunityError.message}`);
  }
  if (!opportunityData) return null;

  const opportunity = mapOpportunity(
    opportunityData as unknown as RawOpportunity,
  );
  if (!opportunity) {
    throw new Error(`Opportunity ${opportunityId} sem versão material atual.`);
  }

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    return {
      opportunity,
      viewer: { status: "ANONYMOUS", controlledActorIds: [], isSteward: false },
      proposals: [],
      commitments: [],
    };
  }

  const { data: memberships, error: membershipsError } = await client
    .from("actor_memberships")
    .select("actor_id")
    .eq("profile_id", authData.user.id)
    .in("role", ["OWNER", "OPERATOR", "REPRESENTATIVE"]);

  if (membershipsError) {
    throw new Error(`Não foi possível resolver Actors controlados: ${membershipsError.message}`);
  }

  const controlledActorIds = [
    ...new Set(
      ((memberships ?? []) as Array<{ actor_id: string }>).map(
        ({ actor_id }) => actor_id,
      ),
    ),
  ];

  let isSteward = false;
  if (controlledActorIds.length) {
    const { data: stewardship, error: stewardshipError } = await client
      .from("project_members")
      .select("actor_id")
      .eq("project_id", projectId)
      .eq("role", "PROJECT_STEWARD")
      .in("actor_id", controlledActorIds)
      .limit(1)
      .maybeSingle();

    if (stewardshipError) {
      throw new Error(`Não foi possível resolver stewardship: ${stewardshipError.message}`);
    }
    isSteward = Boolean(stewardship);
  }

  const [
    { data: proposalRows, error: proposalError },
    { data: commitmentRows, error: commitmentError },
  ] = await Promise.all([
    client
      .from("proposals")
      .select(`
        id, proposer_actor_id, state, current_version,
        material_version, created_at,
        proposal_versions(
          version, statement, conditions, expected_delivery, reward_expectation
        )
      `)
      .eq("opportunity_id", opportunityId)
      .order("created_at", { ascending: true }),
    client
      .from("commitments")
      .select(`
        id, project_id, opportunity_id, opportunity_version,
        proposal_id, proposal_version, proposer_actor_id,
        accepted_by_actor_id, created_at
      `)
      .eq("opportunity_id", opportunityId)
      .order("created_at", { ascending: true }),
  ]);

  if (proposalError) {
    throw new Error(`Não foi possível carregar Proposals visíveis: ${proposalError.message}`);
  }
  if (commitmentError) {
    throw new Error(`Não foi possível carregar Commitments visíveis: ${commitmentError.message}`);
  }

  const rawProposals = (proposalRows ?? []) as unknown as RawProposal[];
  const rawCommitments = (commitmentRows ?? []) as unknown as RawCommitment[];

  const { data: visibleActors, error: actorsError } = await client.rpc(
    "t1_get_visible_coordination_actor_labels",
    { p_opportunity_id: opportunityId },
  );

  if (actorsError) {
    throw new Error(`Não foi possível carregar labels de Actors: ${actorsError.message}`);
  }

  const actorNames = new Map<string, string>();
  for (const actor of (visibleActors ?? []) as Array<{
    actor_id: string;
    actor_name: string;
  }>) {
    actorNames.set(actor.actor_id, actor.actor_name);
  }

  const proposals = rawProposals
    .map((row) => mapProposal(row, actorNames))
    .filter((proposal): proposal is CoordinationProposal => proposal !== null);

  const commitments: CoordinationCommitment[] = rawCommitments.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    opportunityId: row.opportunity_id,
    opportunityVersion: row.opportunity_version,
    proposalId: row.proposal_id,
    proposalVersion: row.proposal_version,
    proposerActorId: row.proposer_actor_id,
    proposerName: actorNames.get(row.proposer_actor_id) ?? "PERSON",
    acceptedByActorId: row.accepted_by_actor_id,
    acceptedByName: actorNames.get(row.accepted_by_actor_id) ?? "PERSON",
    createdAt: row.created_at,
  }));

  return {
    opportunity,
    viewer: {
      status: "AUTHENTICATED",
      controlledActorIds,
      isSteward,
    },
    proposals,
    commitments,
  };
}

export interface CommitmentDetail extends CoordinationCommitment {
  projectSlug: string;
  projectTitle: string;
  opportunityTitle: string;
  opportunityConditions: string;
  opportunityExpectedResult: string;
  proposalStatement: string;
  proposalConditions: string;
  proposalExpectedDelivery: string;
  proposalRewardExpectation: string;
}

export async function getCommitmentDetail(
  commitmentId: string,
): Promise<
  | { status: "ANONYMOUS" }
  | { status: "UNAVAILABLE" }
  | { status: "NOT_FOUND" }
  | { status: "READY"; commitment: CommitmentDetail }
> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE" };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { status: "ANONYMOUS" };

  const { data: row, error } = await client
    .from("commitments")
    .select(`
      id, project_id, opportunity_id, opportunity_version,
      proposal_id, proposal_version, proposer_actor_id,
      accepted_by_actor_id, created_at
    `)
    .eq("id", commitmentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar Commitment: ${error.message}`);
  }
  if (!row) return { status: "NOT_FOUND" };

  const commitment = row as unknown as RawCommitment;

  const [
    { data: project, error: projectError },
    { data: opportunityVersion, error: opportunityError },
    { data: proposalVersion, error: proposalError },
    { data: actors, error: actorsError },
  ] = await Promise.all([
    client
      .from("projects")
      .select("slug, title")
      .eq("id", commitment.project_id)
      .single(),
    client
      .from("opportunity_versions")
      .select("title, conditions, expected_result")
      .eq("opportunity_id", commitment.opportunity_id)
      .eq("version", commitment.opportunity_version)
      .single(),
    client
      .from("proposal_versions")
      .select("statement, conditions, expected_delivery, reward_expectation")
      .eq("proposal_id", commitment.proposal_id)
      .eq("version", commitment.proposal_version)
      .single(),
    client.rpc("t1_get_visible_coordination_actor_labels", {
      p_opportunity_id: commitment.opportunity_id,
    }),
  ]);

  if (projectError || !project) {
    throw new Error(`Commitment sem Project legível: ${projectError?.message ?? "ausente"}`);
  }
  if (opportunityError || !opportunityVersion) {
    throw new Error(`Commitment sem Opportunity version: ${opportunityError?.message ?? "ausente"}`);
  }
  if (proposalError || !proposalVersion) {
    throw new Error(`Commitment sem Proposal version: ${proposalError?.message ?? "ausente"}`);
  }
  if (actorsError) {
    throw new Error(`Commitment sem labels de Actor: ${actorsError.message}`);
  }

  const names = new Map(
    ((actors ?? []) as Array<{ actor_id: string; actor_name: string }>).map(
      ({ actor_id, actor_name }) => [actor_id, actor_name],
    ),
  );

  return {
    status: "READY",
    commitment: {
      id: commitment.id,
      projectId: commitment.project_id,
      projectSlug: project.slug,
      projectTitle: project.title,
      opportunityId: commitment.opportunity_id,
      opportunityVersion: commitment.opportunity_version,
      opportunityTitle: opportunityVersion.title,
      opportunityConditions: opportunityVersion.conditions,
      opportunityExpectedResult: opportunityVersion.expected_result,
      proposalId: commitment.proposal_id,
      proposalVersion: commitment.proposal_version,
      proposerActorId: commitment.proposer_actor_id,
      proposerName: names.get(commitment.proposer_actor_id) ?? "PERSON",
      acceptedByActorId: commitment.accepted_by_actor_id,
      acceptedByName: names.get(commitment.accepted_by_actor_id) ?? "PERSON",
      proposalStatement: proposalVersion.statement,
      proposalConditions: proposalVersion.conditions,
      proposalExpectedDelivery: proposalVersion.expected_delivery,
      proposalRewardExpectation: proposalVersion.reward_expectation,
      createdAt: commitment.created_at,
    },
  };
}
