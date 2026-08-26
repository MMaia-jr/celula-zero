import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ClaimSubjectType = "CONTRIBUTION" | "ARTIFACT";
export type EvidenceRelation =
  | "SUPPORTS"
  | "CHALLENGES"
  | "CONTEXTUALIZES"
  | "REPLICATES";

export interface ClaimEvidenceItem {
  id: string;
  relation: EvidenceRelation;
  sourceArtifactId: string;
  description: string;
  limitations: string;
  digestAlgorithm: string;
  digest: string;
  state: string;
  createdAt: string;
}

export interface ClaimDetail {
  id: string;
  projectId: string;
  subjectType: ClaimSubjectType;
  subjectId: string;
  subjectContributionId: string;
  authorActorId: string;
  statement: string;
  scopeDescription: string;
  state: string;
  createdAt: string;
  isAuthor: boolean;
  evidence: ClaimEvidenceItem[];
}

export interface EvidenceCandidateArtifact {
  id: string;
  contributionId: string;
  kind: string;
  uri: string;
  digestAlgorithm: string;
  digest: string;
  mediaType: string;
  createdAt: string;
}

interface RawClaim {
  id: string;
  project_id: string;
  subject_type: ClaimSubjectType;
  subject_id: string;
  author_actor_id: string;
  statement: string;
  scope_description: string;
  state: string;
  created_at: string;
}

interface RawEvidenceItem {
  id: string;
  source_artifact_id: string;
  description: string;
  limitations: string;
  digest_algorithm: string;
  digest: string;
  state: string;
  created_at: string;
}

interface RawArtifact {
  id: string;
  contribution_id: string;
  kind: string;
  uri: string;
  digest_algorithm: string;
  digest: string;
  media_type: string;
  created_at: string;
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

export async function getClaimDetail(
  claimId: string,
): Promise<
  | { status: "ANONYMOUS" }
  | { status: "UNAVAILABLE" }
  | { status: "NOT_FOUND" }
  | { status: "READY"; claim: ClaimDetail }
> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE" };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { status: "ANONYMOUS" };

  const { data: claimRow, error: claimError } = await client
    .from("claims")
    .select(`
      id, project_id, subject_type, subject_id, author_actor_id,
      statement, scope_description, state, created_at
    `)
    .eq("id", claimId)
    .maybeSingle();

  if (claimError) {
    throw new Error(`Não foi possível carregar Claim: ${claimError.message}`);
  }
  if (!claimRow) return { status: "NOT_FOUND" };

  const claim = claimRow as unknown as RawClaim;
  const controlled = await controlledActorIds(client, authData.user.id);

  let subjectContributionId = claim.subject_id;
  if (claim.subject_type === "ARTIFACT") {
    const { data: artifact, error: artifactError } = await client
      .from("artifacts")
      .select("contribution_id")
      .eq("id", claim.subject_id)
      .maybeSingle();

    if (artifactError || !artifact) {
      throw new Error("Não foi possível resolver o Artifact sujeito da Claim.");
    }
    subjectContributionId = artifact.contribution_id as string;
  }

  const { data: linkRows, error: linkError } = await client
    .from("evidence_links")
    .select("evidence_item_id, relation")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: true });

  if (linkError) {
    throw new Error(`Não foi possível carregar relações de Evidence: ${linkError.message}`);
  }

  const links = (linkRows ?? []) as Array<{
    evidence_item_id: string;
    relation: EvidenceRelation;
  }>;
  const relationByEvidenceId = new Map(
    links.map((row) => [row.evidence_item_id, row.relation] as const),
  );

  const evidenceIds = links.map((row) => row.evidence_item_id);
  let evidence: ClaimEvidenceItem[] = [];

  if (evidenceIds.length) {
    const { data: evidenceRows, error: evidenceError } = await client
      .from("evidence_items")
      .select(`
        id, source_artifact_id, description, limitations,
        digest_algorithm, digest, state, created_at
      `)
      .in("id", evidenceIds)
      .order("created_at", { ascending: true });

    if (evidenceError) {
      throw new Error(`Não foi possível carregar Evidence: ${evidenceError.message}`);
    }

    evidence = ((evidenceRows ?? []) as unknown as RawEvidenceItem[]).map((row) => ({
      id: row.id,
      relation: relationByEvidenceId.get(row.id) ?? "CONTEXTUALIZES",
      sourceArtifactId: row.source_artifact_id,
      description: row.description,
      limitations: row.limitations,
      digestAlgorithm: row.digest_algorithm,
      digest: row.digest,
      state: row.state,
      createdAt: row.created_at,
    }));
  }

  return {
    status: "READY",
    claim: {
      id: claim.id,
      projectId: claim.project_id,
      subjectType: claim.subject_type,
      subjectId: claim.subject_id,
      subjectContributionId,
      authorActorId: claim.author_actor_id,
      statement: claim.statement,
      scopeDescription: claim.scope_description,
      state: claim.state,
      createdAt: claim.created_at,
      isAuthor: controlled.includes(claim.author_actor_id),
      evidence,
    },
  };
}

export async function getEvidenceRegistrationContext(
  claimId: string,
): Promise<
  | { status: "ANONYMOUS" }
  | { status: "UNAVAILABLE" }
  | { status: "NOT_FOUND" }
  | { status: "NOT_AUTHORIZED" }
  | {
      status: "READY";
      claim: RawClaim;
      actorId: string;
      artifacts: EvidenceCandidateArtifact[];
    }
> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE" };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { status: "ANONYMOUS" };

  const { data: claimRow, error: claimError } = await client
    .from("claims")
    .select(`
      id, project_id, subject_type, subject_id, author_actor_id,
      statement, scope_description, state, created_at
    `)
    .eq("id", claimId)
    .maybeSingle();

  if (claimError) {
    throw new Error(`Não foi possível carregar Claim: ${claimError.message}`);
  }
  if (!claimRow) return { status: "NOT_FOUND" };

  const claim = claimRow as unknown as RawClaim;
  const controlled = await controlledActorIds(client, authData.user.id);
  if (!controlled.includes(claim.author_actor_id)) {
    return { status: "NOT_AUTHORIZED" };
  }

  const { data: artifactRows, error: artifactError } = await client
    .from("artifacts")
    .select(`
      id, contribution_id, kind, uri,
      digest_algorithm, digest, media_type, created_at
    `)
    .eq("project_id", claim.project_id)
    .eq("created_by_actor_id", claim.author_actor_id)
    .order("created_at", { ascending: true });

  if (artifactError) {
    throw new Error(`Não foi possível carregar Artifacts candidatos: ${artifactError.message}`);
  }

  const artifacts = ((artifactRows ?? []) as unknown as RawArtifact[]).map(
    (row): EvidenceCandidateArtifact => ({
      id: row.id,
      contributionId: row.contribution_id,
      kind: row.kind,
      uri: row.uri,
      digestAlgorithm: row.digest_algorithm,
      digest: row.digest,
      mediaType: row.media_type,
      createdAt: row.created_at,
    }),
  );

  return {
    status: "READY",
    claim,
    actorId: claim.author_actor_id,
    artifacts,
  };
}
