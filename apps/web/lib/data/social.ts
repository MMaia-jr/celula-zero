import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FollowTargetType = "ACTOR" | "PROJECT" | "NEED";

export interface SocialActivityItem {
  eventId: string;
  eventType: string;
  occurredAt: string;
  visibility: "PUBLIC" | "PROJECT" | "PARTIES" | "PRIVATE";
  actorId: string | null;
  actorName: string;
  actorHandle: string | null;
  targetType: string;
  targetId: string;
  targetLabel: string;
  targetPath: string;
  projectId: string | null;
  projectSlug: string | null;
  needId: string | null;
  opportunityId: string | null;
  commitmentId: string | null;
  isFollowed: boolean;
}

export interface MyFollow {
  followId: string;
  targetType: FollowTargetType;
  targetId: string;
  targetLabel: string;
  targetPath: string;
  createdAt: string;
}

interface RawActivity {
  event_id: string;
  event_type: string;
  occurred_at: string;
  visibility: SocialActivityItem["visibility"];
  actor_id: string | null;
  actor_name: string;
  actor_handle: string | null;
  target_type: string;
  target_id: string;
  target_label: string;
  target_path: string;
  project_id: string | null;
  project_slug: string | null;
  need_id: string | null;
  opportunity_id: string | null;
  commitment_id: string | null;
  is_followed: boolean;
}

interface RawFollow {
  follow_id: string;
  target_type: FollowTargetType;
  target_id: string;
  target_label: string;
  target_path: string;
  created_at: string;
}

export async function listSocialActivity(
  followingOnly = false,
  limit = 50,
): Promise<SocialActivityItem[]> {
  const client = await createSupabaseServerClient();
  if (!client) return [];

  const { data, error } = await client.rpc("t2_list_social_activity", {
    p_following_only: followingOnly,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Não foi possível carregar a Social Projection: ${error.message}`);
  }

  return ((data ?? []) as unknown as RawActivity[]).map((row) => ({
    eventId: row.event_id,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    visibility: row.visibility,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorHandle: row.actor_handle,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label,
    targetPath: row.target_path,
    projectId: row.project_id,
    projectSlug: row.project_slug,
    needId: row.need_id,
    opportunityId: row.opportunity_id,
    commitmentId: row.commitment_id,
    isFollowed: row.is_followed,
  }));
}

export async function listMyFollows(): Promise<MyFollow[]> {
  const client = await createSupabaseServerClient();
  if (!client) return [];

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return [];

  const { data, error } = await client.rpc("t1_list_my_follows");

  if (error) {
    throw new Error(`Não foi possível carregar seus Follows: ${error.message}`);
  }

  return ((data ?? []) as unknown as RawFollow[]).map((row) => ({
    followId: row.follow_id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label,
    targetPath: row.target_path,
    createdAt: row.created_at,
  }));
}

export async function getMyFollowState(
  targetType: FollowTargetType,
  targetId: string,
): Promise<"UNAVAILABLE" | "ANONYMOUS" | "FOLLOWING" | "NOT_FOLLOWING"> {
  const client = await createSupabaseServerClient();
  if (!client) return "UNAVAILABLE";

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return "ANONYMOUS";

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id")
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .limit(1)
    .maybeSingle();

  if (actorError || !actor) return "NOT_FOLLOWING";

  let query = client
    .from("follows")
    .select("id")
    .eq("follower_actor_id", actor.id)
    .eq("target_type", targetType)
    .eq("state", "ACTIVE");

  if (targetType === "ACTOR") query = query.eq("target_actor_id", targetId);
  if (targetType === "PROJECT") query = query.eq("target_project_id", targetId);
  if (targetType === "NEED") query = query.eq("target_need_id", targetId);

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) {
    throw new Error(`Não foi possível resolver Follow: ${error.message}`);
  }

  return data ? "FOLLOWING" : "NOT_FOLLOWING";
}

export function activitySentence(
  item: SocialActivityItem,
  locale: "pt" | "en",
): string {
  const en = locale === "en";
  const actor = item.actorName;

  const verbs: Record<string, [string, string]> = {
    NEED_CREATED: ["expressou uma Need", "expressed a Need"],
    NEED_PUBLISHED: ["publicou uma Need", "published a Need"],
    OPPORTUNITY_CREATED: ["criou uma Opportunity", "created an Opportunity"],
    OPPORTUNITY_LINKED_TO_NEED: ["vinculou uma Opportunity a uma Need", "linked an Opportunity to a Need"],
    OPPORTUNITY_PUBLISHED: ["abriu uma Opportunity", "opened an Opportunity"],
    PROPOSAL_SUBMITTED: ["enviou uma Proposal", "submitted a Proposal"],
    PROPOSAL_REVISION_REQUESTED: ["solicitou revisão de uma Proposal", "requested a Proposal revision"],
    PROPOSAL_REVISED: ["revisou uma Proposal", "revised a Proposal"],
    PROPOSAL_REJECTED: ["rejeitou uma Proposal", "rejected a Proposal"],
    PROPOSAL_ACCEPTED: ["aceitou uma Proposal", "accepted a Proposal"],
    OPPORTUNITY_CAPACITY_FILLED: ["preencheu a capacidade de uma Opportunity", "filled an Opportunity capacity"],
    FOLLOW_STARTED: ["passou a seguir", "followed"],
    FOLLOW_ENDED: ["deixou de seguir", "unfollowed"],
    CONTRIBUTION_SUBMITTED: ["registrou uma Contribution", "recorded a Contribution"],
    ARTIFACT_ATTACHED: ["anexou um Artifact", "attached an Artifact"],
    CLAIM_RECORDED: ["registrou uma Claim", "recorded a Claim"],
    EVIDENCE_REGISTERED: ["registrou Evidence", "registered Evidence"],
    VERIFICATION_REQUESTED: ["solicitou uma Verification", "requested a Verification"],
    VERIFICATION_ISSUED: ["emitiu uma Verification", "issued a Verification"],
    DOMAIN_DECISION_ISSUED: ["emitiu uma Decision contextual", "issued a contextual Decision"],
    OUTCOME_RECORDED: ["registrou um Outcome", "recorded an Outcome"],
  };

  const pair = verbs[item.eventType] ?? ["registrou uma atividade", "recorded an activity"];
  return `${actor} ${en ? pair[1] : pair[0]} · ${item.targetLabel}`;
}
