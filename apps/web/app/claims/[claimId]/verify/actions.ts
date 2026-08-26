"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  claimId: z.string().uuid(),
  requesterActorId: z.string().uuid(),
  reviewerActorId: z.string().uuid(),
  criteria: z.string().trim().min(10).max(4000),
  expectedMethod: z.string().trim().min(3).max(200),
  delegationCommandId: z.string().uuid(),
  delegationIdempotencyKey: z.string().min(8).max(180),
  requestCommandId: z.string().uuid(),
  requestIdempotencyKey: z.string().min(8).max(180),
});

export async function requestVerificationAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    claimId: formData.get("claimId"),
    requesterActorId: formData.get("requesterActorId"),
    reviewerActorId: formData.get("reviewerActorId"),
    criteria: formData.get("criteria"),
    expectedMethod: formData.get("expectedMethod"),
    delegationCommandId: formData.get("delegationCommandId"),
    delegationIdempotencyKey: formData.get("delegationIdempotencyKey"),
    requestCommandId: formData.get("requestCommandId"),
    requestIdempotencyKey: formData.get("requestIdempotencyKey"),
  });

  if (!parsed.success) redirect("/projects?review=invalid");

  const input = parsed.data;
  const claimPath = `/claims/${input.claimId}`;
  const client = await createSupabaseServerClient();
  if (!client) redirect(`${claimPath}?review=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    redirect(`/login?next=${encodeURIComponent(`${claimPath}/verify`)}`);
  }

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id")
    .eq("id", input.requesterActorId)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (actorError || !actor) redirect(`${claimPath}?review=actor-control-denied`);

  const { data: claim, error: claimError } = await client
    .from("claims")
    .select("id, project_id")
    .eq("id", input.claimId)
    .maybeSingle();

  if (claimError || !claim) redirect(`${claimPath}?review=claim-unavailable`);

  const { data: project, error: projectError } = await client
    .from("projects")
    .select("steward_actor_id")
    .eq("id", claim.project_id)
    .maybeSingle();

  if (
    projectError ||
    !project ||
    project.steward_actor_id !== input.requesterActorId
  ) {
    redirect(`${claimPath}?review=steward-required`);
  }

  const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await client.rpc(
    "t2c_assign_and_request_verification",
    {
      p_actor_id: input.requesterActorId,
      p_claim_id: input.claimId,
      p_reviewer_actor_id: input.reviewerActorId,
      p_criteria: input.criteria,
      p_expected_method: input.expectedMethod,
      p_valid_until: dueAt,
      p_delegation_command_id: input.delegationCommandId,
      p_delegation_idempotency_key: input.delegationIdempotencyKey,
      p_request_command_id: input.requestCommandId,
      p_request_idempotency_key: input.requestIdempotencyKey,
    },
  );

  const result = data as {
    ok?: boolean;
    verification_request_id?: string;
    reviewer_actor_id?: string;
    review_authority_capability?: string;
  } | null;

  if (
    error ||
    !result?.ok ||
    !result.verification_request_id ||
    result.reviewer_actor_id !== input.reviewerActorId ||
    result.review_authority_capability !== "verification.issue"
  ) {
    redirect(`${claimPath}?review=request-denied`);
  }

  redirect(`/verifications/${result.verification_request_id}?review=requested`);
}
