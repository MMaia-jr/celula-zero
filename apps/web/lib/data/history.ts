import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface HistoryActor {
  actor_id: string;
  name: string;
  handle: string | null;
}

export interface HistoryNeed {
  id: string;
  title: string;
  statement: string;
  owner_actor_id: string;
  created_at: string;
}

export interface HistoryOpportunity {
  id: string;
  version: number;
  title: string;
  statement: string;
  owner_actor_id: string;
  created_at: string;
}

export interface HistoryProposal {
  id: string;
  version: number;
  statement: string | null;
  proposer_actor_id: string;
  created_at: string;
}

export interface HistoryCommitment {
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

export interface HistoryContribution {
  id: string;
  author_actor_id: string;
  description: string | null;
  limitations: string | null;
  supersedes_contribution_id: string | null;
  submitted_at: string;
}

export interface HistoryArtifact {
  id: string;
  contribution_id: string;
  created_by_actor_id: string;
  kind: string;
  uri: string;
  digest_algorithm: string;
  digest: string;
  media_type: string;
  size_bytes: number | null;
  created_at: string;
}

export interface HistoryClaim {
  id: string;
  subject_type: "CONTRIBUTION" | "ARTIFACT";
  subject_id: string;
  author_actor_id: string;
  statement: string;
  scope_description: string;
  created_at: string;
}

export interface HistoryEvidence {
  id: string;
  claim_id: string;
  relation: "SUPPORTS" | "CHALLENGES" | "CONTEXTUALIZES" | "REPLICATES";
  source_artifact_id: string;
  custodian_actor_id: string;
  description: string;
  limitations: string;
  digest_algorithm: string;
  digest: string;
  created_at: string;
}

export interface HistoryVerificationRequest {
  id: string;
  claim_id: string;
  requester_actor_id: string;
  reviewer_actor_id: string;
  criteria: string;
  expected_method: string;
  conflict_codes: string[];
  independence: "INDEPENDENT" | "NON_INDEPENDENT";
  due_at: string | null;
  state: "OPEN" | "COMPLETED";
  created_at: string;
}

export interface HistoryVerification {
  id: string;
  request_id: string;
  claim_id: string;
  verifier_actor_id: string;
  method: string;
  findings: string;
  classification: "PASS" | "FAIL" | "PARTIAL" | "INCONCLUSIVE";
  limitations: string;
  conflict_codes: string[];
  independence: "INDEPENDENT" | "NON_INDEPENDENT";
  evidence_item_ids: string[];
  created_at: string;
}

export interface HistoryDecision {
  id: string;
  claim_id: string;
  deciding_actor_id: string;
  authority_basis: "PROJECT_STEWARDSHIP";
  disposition: "ACCEPT_FOR_CONTEXT" | "REJECT_FOR_CONTEXT" | "DEFER";
  reason: string;
  limitations: string;
  verification_ids: string[];
  created_at: string;
}

export interface HistoryOutcome {
  id: string;
  decision_id: string;
  reporter_actor_id: string;
  classification: "OBSERVED" | "INCONCLUSIVE";
  statement: string;
  observed_at: string | null;
  limitations: string;
  created_at: string;
}

export interface CoordinationHistory {
  viewer_scope: "PARTY" | "REVIEWER";
  project: {
    id: string;
    slug: string;
    title: string;
    steward_actor_id: string;
  };
  need: HistoryNeed | null;
  opportunity: HistoryOpportunity;
  proposal: HistoryProposal;
  commitment: HistoryCommitment;
  actors: HistoryActor[];
  contributions: HistoryContribution[];
  artifacts: HistoryArtifact[];
  claims: HistoryClaim[];
  evidence: HistoryEvidence[];
  verification_requests: HistoryVerificationRequest[];
  verifications: HistoryVerification[];
  decisions: HistoryDecision[];
  outcomes: HistoryOutcome[];
}

export async function getCommitmentHistory(
  commitmentId: string,
): Promise<
  | { status: "ANONYMOUS" }
  | { status: "UNAVAILABLE" }
  | { status: "DENIED" }
  | { status: "NOT_FOUND" }
  | { status: "READY"; history: CoordinationHistory }
> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE" };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { status: "ANONYMOUS" };

  const { data, error } = await client.rpc("t2d_get_commitment_history", {
    p_commitment_id: commitmentId,
  });

  if (error) {
    if (error.message.includes("CZ403:COMMITMENT_HISTORY_DENIED")) {
      return { status: "DENIED" };
    }
    if (error.message.includes("CZ404:COMMITMENT_NOT_FOUND")) {
      return { status: "NOT_FOUND" };
    }
    throw new Error(`Não foi possível carregar Coordination History: ${error.message}`);
  }

  if (!data) return { status: "NOT_FOUND" };
  return { status: "READY", history: data as unknown as CoordinationHistory };
}

export function actorLabel(history: CoordinationHistory, actorId: string) {
  const actor = history.actors.find((item) => item.actor_id === actorId);
  if (!actor) return "Actor";
  return actor.handle ? `${actor.name} (@${actor.handle})` : actor.name;
}
