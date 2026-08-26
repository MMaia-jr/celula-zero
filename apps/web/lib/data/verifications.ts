import { createSupabaseServerClient } from "@/lib/supabase/server";

export type VerificationClassification =
  | "PASS"
  | "FAIL"
  | "PARTIAL"
  | "INCONCLUSIVE";

export interface ReviewCandidate {
  actorId: string;
  handle: string;
  displayName: string;
  actorName: string;
}

export interface VerificationEvidence {
  id: string;
  relation: string;
  sourceArtifactId: string;
  description: string;
  limitations: string;
  digestAlgorithm: string;
  digest: string;
}

export interface VerificationIssued {
  id: string;
  method: string;
  findings: string;
  classification: VerificationClassification;
  limitations: string;
  independence: "INDEPENDENT" | "NON_INDEPENDENT";
  conflictCodes: string[];
  evidenceItemIds: string[];
  createdAt: string;
}

export interface VerificationRequestDetail {
  id: string;
  projectId: string;
  claimId: string;
  commitmentId: string | null;
  requesterActorId: string;
  reviewerActorId: string;
  criteria: string;
  expectedMethod: string;
  independence: "INDEPENDENT" | "NON_INDEPENDENT";
  conflictCodes: string[];
  dueAt: string | null;
  state: "OPEN" | "COMPLETED";
  createdAt: string;
  claimStatement: string;
  reviewerLabel: string;
  canIssue: boolean;
  evidence: VerificationEvidence[];
  issued: VerificationIssued | null;
}

interface RawPublicProfile {
  handle: string;
  display_name: string;
  actor_id: string;
  actor_name: string;
}

async function controlledActorIds(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  profileId: string,
): Promise<string[]> {
  if (!client) return [];

  const { data, error } = await client
    .from("actor_memberships")
    .select("actor_id")
    .eq("profile_id", profileId)
    .in("role", ["OWNER", "OPERATOR", "REPRESENTATIVE"]);

  if (error) {
    throw new Error(`Não foi possível resolver Actors controlados: ${error.message}`);
  }

  return [
    ...new Set(
      ((data ?? []) as Array<{ actor_id: string }>).map(({ actor_id }) => actor_id),
    ),
  ];
}

export async function getVerificationRequestSetup(claimId: string): Promise<
  | { status: "ANONYMOUS" }
  | { status: "UNAVAILABLE" }
  | { status: "NOT_FOUND" }
  | {
      status: "READY";
      canRequest: boolean;
      requesterActorId: string | null;
      claimStatement: string;
      candidates: ReviewCandidate[];
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

  if (claimError) {
    throw new Error(`Não foi possível carregar Claim para revisão: ${claimError.message}`);
  }
  if (!claim) return { status: "NOT_FOUND" };

  const { data: project, error: projectError } = await client
    .from("projects")
    .select("steward_actor_id")
    .eq("id", claim.project_id)
    .maybeSingle();

  if (projectError || !project) {
    throw new Error("Não foi possível resolver a autoridade do Project.");
  }

  const controlled = await controlledActorIds(client, authData.user.id);
  const requesterActorId = controlled.includes(project.steward_actor_id as string)
    ? (project.steward_actor_id as string)
    : null;

  if (!requesterActorId) {
    return {
      status: "READY",
      canRequest: false,
      requesterActorId: null,
      claimStatement: claim.statement as string,
      candidates: [],
    };
  }

  const { data: profileRows, error: profilesError } = await client.rpc(
    "list_public_profiles",
  );

  if (profilesError) {
    throw new Error(`Não foi possível listar Reviewers públicos: ${profilesError.message}`);
  }

  const candidates = ((profileRows ?? []) as RawPublicProfile[]).map(
    (row): ReviewCandidate => ({
      actorId: row.actor_id,
      handle: row.handle,
      displayName: row.display_name,
      actorName: row.actor_name,
    }),
  );

  return {
    status: "READY",
    canRequest: true,
    requesterActorId,
    claimStatement: claim.statement as string,
    candidates,
  };
}

export async function getVerificationRequestDetail(
  requestId: string,
): Promise<
  | { status: "ANONYMOUS" }
  | { status: "UNAVAILABLE" }
  | { status: "NOT_FOUND" }
  | { status: "READY"; request: VerificationRequestDetail }
> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE" };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { status: "ANONYMOUS" };

  const { data: requestRow, error: requestError } = await client
    .from("verification_requests")
    .select(`
      id, project_id, claim_id, requester_actor_id, reviewer_actor_id,
      criteria, expected_method, conflict_codes, independence,
      due_at, state, created_at
    `)
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    throw new Error(`Não foi possível carregar Verification Request: ${requestError.message}`);
  }
  if (!requestRow) return { status: "NOT_FOUND" };

  const controlled = await controlledActorIds(client, authData.user.id);
  const canIssue = controlled.includes(requestRow.reviewer_actor_id as string);

  const { data: commitmentId } = await client.rpc("t2d_commitment_for_claim", {
    p_claim_id: requestRow.claim_id,
  });

  const { data: claimRow, error: claimError } = await client
    .from("claims")
    .select("statement")
    .eq("id", requestRow.claim_id)
    .maybeSingle();

  if (claimError || !claimRow) {
    throw new Error("Não foi possível carregar a Claim atribuída à revisão.");
  }

  const { data: reviewerRows } = await client.rpc("get_public_profile_by_actor", {
    p_actor_id: requestRow.reviewer_actor_id,
  });
  const reviewer = (reviewerRows?.[0] ?? null) as RawPublicProfile | null;

  const { data: linkRows, error: linkError } = await client
    .from("evidence_links")
    .select("evidence_item_id, relation")
    .eq("claim_id", requestRow.claim_id)
    .order("created_at", { ascending: true });

  if (linkError) {
    throw new Error(`Não foi possível carregar Evidence da Claim: ${linkError.message}`);
  }

  const links = (linkRows ?? []) as Array<{
    evidence_item_id: string;
    relation: string;
  }>;
  const relationById = new Map(
    links.map((row) => [row.evidence_item_id, row.relation] as const),
  );

  let evidence: VerificationEvidence[] = [];
  const evidenceIds = links.map((row) => row.evidence_item_id);

  if (evidenceIds.length) {
    const { data: evidenceRows, error: evidenceError } = await client
      .from("evidence_items")
      .select(`
        id, source_artifact_id, description, limitations,
        digest_algorithm, digest
      `)
      .in("id", evidenceIds)
      .order("created_at", { ascending: true });

    if (evidenceError) {
      throw new Error(`Não foi possível ler Evidence atribuída: ${evidenceError.message}`);
    }

    evidence = (evidenceRows ?? []).map((row) => ({
      id: row.id as string,
      relation: relationById.get(row.id as string) ?? "CONTEXTUALIZES",
      sourceArtifactId: row.source_artifact_id as string,
      description: row.description as string,
      limitations: row.limitations as string,
      digestAlgorithm: row.digest_algorithm as string,
      digest: row.digest as string,
    }));
  }

  const { data: verificationRow, error: verificationError } = await client
    .from("verifications")
    .select(`
      id, method, findings, classification, limitations,
      conflict_codes, independence, created_at
    `)
    .eq("request_id", requestId)
    .maybeSingle();

  if (verificationError) {
    throw new Error(`Não foi possível carregar Verification emitida: ${verificationError.message}`);
  }

  let issued: VerificationIssued | null = null;

  if (verificationRow) {
    const { data: examinedRows, error: examinedError } = await client
      .from("verification_evidence_items")
      .select("evidence_item_id")
      .eq("verification_id", verificationRow.id);

    if (examinedError) {
      throw new Error(`Não foi possível carregar Evidence examinada: ${examinedError.message}`);
    }

    issued = {
      id: verificationRow.id as string,
      method: verificationRow.method as string,
      findings: verificationRow.findings as string,
      classification: verificationRow.classification as VerificationClassification,
      limitations: verificationRow.limitations as string,
      independence: verificationRow.independence as "INDEPENDENT" | "NON_INDEPENDENT",
      conflictCodes: (verificationRow.conflict_codes ?? []) as string[],
      evidenceItemIds: (examinedRows ?? []).map(
        ({ evidence_item_id }) => evidence_item_id as string,
      ),
      createdAt: verificationRow.created_at as string,
    };
  }

  return {
    status: "READY",
    request: {
      id: requestRow.id as string,
      projectId: requestRow.project_id as string,
      claimId: requestRow.claim_id as string,
      commitmentId: (commitmentId as string | null) ?? null,
      requesterActorId: requestRow.requester_actor_id as string,
      reviewerActorId: requestRow.reviewer_actor_id as string,
      criteria: requestRow.criteria as string,
      expectedMethod: requestRow.expected_method as string,
      independence: requestRow.independence as "INDEPENDENT" | "NON_INDEPENDENT",
      conflictCodes: (requestRow.conflict_codes ?? []) as string[],
      dueAt: (requestRow.due_at as string | null) ?? null,
      state: requestRow.state as "OPEN" | "COMPLETED",
      createdAt: requestRow.created_at as string,
      claimStatement: claimRow.statement as string,
      reviewerLabel: reviewer?.display_name ?? reviewer?.actor_name ?? "Reviewer",
      canIssue,
      evidence,
      issued,
    },
  };
}
