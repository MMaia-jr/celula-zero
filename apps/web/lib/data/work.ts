import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CommitmentWorkContribution {
  id: string;
  commitmentId: string;
  authorActorId: string;
  description: string;
  limitations: string;
  submittedAt: string;
}

export interface CommitmentWorkOverview {
  commitmentId: string;
  projectId: string;
  proposerActorId: string;
  acceptedByActorId: string;
  isContributor: boolean;
  contributions: CommitmentWorkContribution[];
}

export interface ContributionArtifact {
  id: string;
  contributionId: string;
  createdByActorId: string;
  kind: string;
  uri: string;
  digestAlgorithm: string;
  digest: string;
  mediaType: string;
  sizeBytes: number | null;
  retentionClass: string;
  createdAt: string;
  textContent: string | null;
}

export interface ContributionDetail {
  id: string;
  commitmentId: string;
  projectId: string;
  authorActorId: string;
  description: string;
  limitations: string;
  submittedAt: string;
  isAuthor: boolean;
  artifacts: ContributionArtifact[];
}

interface RawContribution {
  id: string;
  commitment_id: string;
  project_id: string;
  author_actor_id: string;
  description: string;
  limitations: string;
  submitted_at: string;
}

interface RawArtifact {
  id: string;
  contribution_id: string;
  created_by_actor_id: string;
  kind: string;
  uri: string;
  digest_algorithm: string;
  digest: string;
  media_type: string;
  size_bytes: number | null;
  retention_class: string;
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

export async function getCommitmentWorkOverview(
  commitmentId: string,
): Promise<
  | { status: "ANONYMOUS" }
  | { status: "UNAVAILABLE" }
  | { status: "NOT_FOUND" }
  | { status: "READY"; work: CommitmentWorkOverview }
> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE" };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { status: "ANONYMOUS" };

  const { data: commitment, error: commitmentError } = await client
    .from("commitments")
    .select("id, project_id, proposer_actor_id, accepted_by_actor_id")
    .eq("id", commitmentId)
    .maybeSingle();

  if (commitmentError) {
    throw new Error(`Não foi possível carregar o trabalho do Commitment: ${commitmentError.message}`);
  }
  if (!commitment) return { status: "NOT_FOUND" };

  const controlled = await controlledActorIds(client, authData.user.id);

  const { data: contributionRows, error: contributionError } = await client
    .from("contributions")
    .select("id, commitment_id, project_id, author_actor_id, description, limitations, submitted_at")
    .eq("commitment_id", commitmentId)
    .order("submitted_at", { ascending: true });

  if (contributionError) {
    throw new Error(`Não foi possível carregar Contributions: ${contributionError.message}`);
  }

  const contributions = ((contributionRows ?? []) as unknown as RawContribution[]).map(
    (row): CommitmentWorkContribution => ({
      id: row.id,
      commitmentId: row.commitment_id,
      authorActorId: row.author_actor_id,
      description: row.description,
      limitations: row.limitations,
      submittedAt: row.submitted_at,
    }),
  );

  return {
    status: "READY",
    work: {
      commitmentId: commitment.id,
      projectId: commitment.project_id,
      proposerActorId: commitment.proposer_actor_id,
      acceptedByActorId: commitment.accepted_by_actor_id,
      isContributor: controlled.includes(commitment.proposer_actor_id),
      contributions,
    },
  };
}

export async function getContributionDetail(
  contributionId: string,
): Promise<
  | { status: "ANONYMOUS" }
  | { status: "UNAVAILABLE" }
  | { status: "NOT_FOUND" }
  | { status: "READY"; contribution: ContributionDetail }
> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE" };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { status: "ANONYMOUS" };

  const { data: contributionRow, error: contributionError } = await client
    .from("contributions")
    .select("id, commitment_id, project_id, author_actor_id, description, limitations, submitted_at")
    .eq("id", contributionId)
    .maybeSingle();

  if (contributionError) {
    throw new Error(`Não foi possível carregar Contribution: ${contributionError.message}`);
  }
  if (!contributionRow) return { status: "NOT_FOUND" };

  const contribution = contributionRow as unknown as RawContribution;
  const controlled = await controlledActorIds(client, authData.user.id);

  const { data: artifactRows, error: artifactError } = await client
    .from("artifacts")
    .select(`
      id, contribution_id, created_by_actor_id, kind, uri,
      digest_algorithm, digest, media_type, size_bytes,
      retention_class, created_at
    `)
    .eq("contribution_id", contributionId)
    .order("created_at", { ascending: true });

  if (artifactError) {
    throw new Error(`Não foi possível carregar Artifacts: ${artifactError.message}`);
  }

  const rawArtifacts = (artifactRows ?? []) as unknown as RawArtifact[];
  const artifactIds = rawArtifacts.map(({ id }) => id);
  const textByArtifact = new Map<string, string>();

  if (artifactIds.length) {
    const { data: textRows, error: textError } = await client
      .from("artifact_text_contents")
      .select("artifact_id, content")
      .in("artifact_id", artifactIds);

    if (textError) {
      throw new Error(`Não foi possível carregar conteúdo textual de Artifact: ${textError.message}`);
    }

    for (const row of (textRows ?? []) as Array<{ artifact_id: string; content: string }>) {
      textByArtifact.set(row.artifact_id, row.content);
    }
  }

  const artifacts = rawArtifacts.map(
    (row): ContributionArtifact => ({
      id: row.id,
      contributionId: row.contribution_id,
      createdByActorId: row.created_by_actor_id,
      kind: row.kind,
      uri: row.uri,
      digestAlgorithm: row.digest_algorithm,
      digest: row.digest,
      mediaType: row.media_type,
      sizeBytes: row.size_bytes,
      retentionClass: row.retention_class,
      createdAt: row.created_at,
      textContent: textByArtifact.get(row.id) ?? null,
    }),
  );

  return {
    status: "READY",
    contribution: {
      id: contribution.id,
      commitmentId: contribution.commitment_id,
      projectId: contribution.project_id,
      authorActorId: contribution.author_actor_id,
      description: contribution.description,
      limitations: contribution.limitations,
      submittedAt: contribution.submitted_at,
      isAuthor: controlled.includes(contribution.author_actor_id),
      artifacts,
    },
  };
}
