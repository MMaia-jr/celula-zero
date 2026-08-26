import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface DecisionVerification {
  id: string;
  requestId: string;
  classification: "PASS" | "FAIL" | "PARTIAL" | "INCONCLUSIVE";
  independence: "INDEPENDENT" | "NON_INDEPENDENT";
  findings: string;
  limitations: string;
  verifierActorId: string;
  createdAt: string;
}

export interface DecisionOutcome {
  id: string;
  classification: "OBSERVED" | "INCONCLUSIVE";
  statement: string;
  observedAt: string | null;
  limitations: string;
  reporterActorId: string;
  createdAt: string;
}

export interface DomainDecisionDetail {
  id: string;
  projectId: string;
  claimId: string;
  decidingActorId: string;
  authorityBasis: "PROJECT_STEWARDSHIP";
  disposition: "ACCEPT_FOR_CONTEXT" | "REJECT_FOR_CONTEXT" | "DEFER";
  reason: string;
  limitations: string;
  createdAt: string;
  commitmentId: string | null;
  verifications: DecisionVerification[];
  outcomes: DecisionOutcome[];
  canRecordOutcome: boolean;
}

async function controlledActorIds(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  profileId: string,
) {
  if (!client) return [] as string[];
  const { data, error } = await client
    .from("actor_memberships")
    .select("actor_id")
    .eq("profile_id", profileId)
    .in("role", ["OWNER", "OPERATOR", "REPRESENTATIVE"]);
  if (error) throw new Error(`Não foi possível resolver Actors controlados: ${error.message}`);
  return [...new Set((data ?? []).map(({ actor_id }) => actor_id as string))];
}

export async function getClaimDecisionSetup(claimId: string): Promise<
  | { status: "ANONYMOUS" }
  | { status: "UNAVAILABLE" }
  | { status: "NOT_FOUND" }
  | {
      status: "READY";
      canDecide: boolean;
      actorId: string | null;
      claimStatement: string;
      commitmentId: string | null;
      verifications: DecisionVerification[];
    }
> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE" };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { status: "ANONYMOUS" };

  const { data: claim, error: claimError } = await client
    .from("claims")
    .select("id, project_id, statement")
    .eq("id", claimId)
    .maybeSingle();

  if (claimError) throw new Error(`Não foi possível carregar Claim: ${claimError.message}`);
  if (!claim) return { status: "NOT_FOUND" };

  const { data: project, error: projectError } = await client
    .from("projects")
    .select("steward_actor_id")
    .eq("id", claim.project_id)
    .maybeSingle();

  if (projectError || !project) return { status: "NOT_FOUND" };

  const controlled = await controlledActorIds(client, authData.user.id);
  const canDecide = controlled.includes(project.steward_actor_id as string);
  const actorId = canDecide ? (project.steward_actor_id as string) : null;

  const { data: verificationRows, error: verificationError } = await client
    .from("verifications")
    .select(`
      id, request_id, classification, independence, findings, limitations,
      verifier_actor_id, created_at
    `)
    .eq("claim_id", claimId)
    .order("created_at", { ascending: true });

  if (verificationError) {
    throw new Error(`Não foi possível carregar Verifications: ${verificationError.message}`);
  }

  const { data: commitmentId } = await client.rpc("t2d_commitment_for_claim", {
    p_claim_id: claimId,
  });

  const verifications = (verificationRows ?? []).map(
    (row): DecisionVerification => ({
      id: row.id as string,
      requestId: row.request_id as string,
      classification: row.classification as DecisionVerification["classification"],
      independence: row.independence as DecisionVerification["independence"],
      findings: row.findings as string,
      limitations: row.limitations as string,
      verifierActorId: row.verifier_actor_id as string,
      createdAt: row.created_at as string,
    }),
  );

  return {
    status: "READY",
    canDecide,
    actorId,
    claimStatement: claim.statement as string,
    commitmentId: (commitmentId as string | null) ?? null,
    verifications,
  };
}

export async function getDomainDecisionDetail(
  decisionId: string,
): Promise<
  | { status: "ANONYMOUS" }
  | { status: "UNAVAILABLE" }
  | { status: "NOT_FOUND" }
  | { status: "READY"; decision: DomainDecisionDetail }
> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE" };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { status: "ANONYMOUS" };

  const { data: row, error } = await client
    .from("domain_decisions")
    .select(`
      id, project_id, claim_id, deciding_actor_id, authority_basis,
      disposition, reason, limitations, created_at
    `)
    .eq("id", decisionId)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível carregar Decision: ${error.message}`);
  if (!row) return { status: "NOT_FOUND" };

  const { data: links, error: linksError } = await client
    .from("domain_decision_verifications")
    .select("verification_id")
    .eq("decision_id", decisionId);

  if (linksError) throw new Error(`Não foi possível carregar referências da Decision: ${linksError.message}`);

  const verificationIds = (links ?? []).map(({ verification_id }) => verification_id as string);
  let verifications: DecisionVerification[] = [];

  if (verificationIds.length) {
    const { data: verificationRows, error: verificationError } = await client
      .from("verifications")
      .select(`
        id, request_id, classification, independence, findings, limitations,
        verifier_actor_id, created_at
      `)
      .in("id", verificationIds)
      .order("created_at", { ascending: true });

    if (verificationError) throw new Error(`Não foi possível carregar Verifications: ${verificationError.message}`);

    verifications = (verificationRows ?? []).map((item) => ({
      id: item.id as string,
      requestId: item.request_id as string,
      classification: item.classification as DecisionVerification["classification"],
      independence: item.independence as DecisionVerification["independence"],
      findings: item.findings as string,
      limitations: item.limitations as string,
      verifierActorId: item.verifier_actor_id as string,
      createdAt: item.created_at as string,
    }));
  }

  const { data: outcomeRows, error: outcomeError } = await client
    .from("outcomes")
    .select(`
      id, classification, statement, observed_at, limitations,
      reporter_actor_id, created_at
    `)
    .eq("decision_id", decisionId)
    .order("created_at", { ascending: true });

  if (outcomeError) throw new Error(`Não foi possível carregar Outcomes: ${outcomeError.message}`);

  const { data: project, error: projectError } = await client
    .from("projects")
    .select("steward_actor_id")
    .eq("id", row.project_id)
    .maybeSingle();

  const controlled = await controlledActorIds(client, authData.user.id);
  const canRecordOutcome =
    !projectError &&
    Boolean(project) &&
    controlled.includes(project?.steward_actor_id as string);

  const { data: commitmentId } = await client.rpc("t2d_commitment_for_claim", {
    p_claim_id: row.claim_id,
  });

  return {
    status: "READY",
    decision: {
      id: row.id as string,
      projectId: row.project_id as string,
      claimId: row.claim_id as string,
      decidingActorId: row.deciding_actor_id as string,
      authorityBasis: row.authority_basis as "PROJECT_STEWARDSHIP",
      disposition: row.disposition as DomainDecisionDetail["disposition"],
      reason: row.reason as string,
      limitations: row.limitations as string,
      createdAt: row.created_at as string,
      commitmentId: (commitmentId as string | null) ?? null,
      verifications,
      outcomes: (outcomeRows ?? []).map((item) => ({
        id: item.id as string,
        classification: item.classification as DecisionOutcome["classification"],
        statement: item.statement as string,
        observedAt: (item.observed_at as string | null) ?? null,
        limitations: item.limitations as string,
        reporterActorId: item.reporter_actor_id as string,
        createdAt: item.created_at as string,
      })),
      canRecordOutcome,
    },
  };
}
