"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  projectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  opportunityId: z.string().uuid(),
  proposalId: z.string().uuid(),
  operation: z.enum(["ACCEPT", "REJECT", "REQUEST_REVISION"]),
  opportunityVersion: z.coerce.number().int().positive(),
  proposalVersion: z.coerce.number().int().positive(),
  expectedOpportunityMaterialVersion: z.coerce.number().int().positive(),
  expectedProposalMaterialVersion: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(1000),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

const reviseSchema = z.object({
  projectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  opportunityId: z.string().uuid(),
  proposalId: z.string().uuid(),
  actorId: z.string().uuid(),
  expectedProposalMaterialVersion: z.coerce.number().int().positive(),
  statement: z.string().trim().min(10).max(4000),
  conditions: z.string().trim().min(3).max(4000),
  expectedDelivery: z.string().trim().min(3).max(2000),
  rewardExpectation: z.string().trim().min(2).max(1000),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

function opportunityPath(projectSlug: string, opportunityId: string) {
  return `/projects/${projectSlug}/opportunities/${opportunityId}`;
}

export async function reviewProposalAction(formData: FormData): Promise<void> {
  const parsed = reviewSchema.safeParse({
    projectSlug: formData.get("projectSlug"),
    opportunityId: formData.get("opportunityId"),
    proposalId: formData.get("proposalId"),
    operation: formData.get("operation"),
    opportunityVersion: formData.get("opportunityVersion"),
    proposalVersion: formData.get("proposalVersion"),
    expectedOpportunityMaterialVersion: formData.get("expectedOpportunityMaterialVersion"),
    expectedProposalMaterialVersion: formData.get("expectedProposalMaterialVersion"),
    reason: formData.get("reason"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) redirect("/projects?coordination=invalid-review");

  const input = parsed.data;
  const client = await createSupabaseServerClient();
  if (!client) redirect(`${opportunityPath(input.projectSlug, input.opportunityId)}?coordination=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    redirect(`/login?next=${encodeURIComponent(opportunityPath(input.projectSlug, input.opportunityId))}`);
  }

  const { data: project, error: projectError } = await client
    .from("projects")
    .select("id, steward_actor_id")
    .eq("slug", input.projectSlug)
    .maybeSingle();

  if (projectError || !project) {
    redirect(`${opportunityPath(input.projectSlug, input.opportunityId)}?coordination=project-not-found`);
  }

  const { data: controlledSteward, error: stewardError } = await client
    .from("actor_memberships")
    .select("actor_id")
    .eq("profile_id", authData.user.id)
    .eq("actor_id", project.steward_actor_id)
    .in("role", ["OWNER", "OPERATOR", "REPRESENTATIVE"])
    .limit(1)
    .maybeSingle();

  if (stewardError || !controlledSteward) {
    redirect(`${opportunityPath(input.projectSlug, input.opportunityId)}?coordination=steward-control-required`);
  }

  const { data: proposal, error: proposalError } = await client
    .from("proposals")
    .select("id, opportunity_id")
    .eq("id", input.proposalId)
    .eq("opportunity_id", input.opportunityId)
    .maybeSingle();

  if (proposalError || !proposal) {
    redirect(`${opportunityPath(input.projectSlug, input.opportunityId)}?coordination=proposal-not-found`);
  }

  const { data: opportunity, error: opportunityError } = await client
    .from("opportunities")
    .select("id, project_id")
    .eq("id", input.opportunityId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (opportunityError || !opportunity) {
    redirect(`${opportunityPath(input.projectSlug, input.opportunityId)}?coordination=opportunity-not-found`);
  }

  let data: unknown = null;
  let error: { message: string } | null = null;

  if (input.operation === "ACCEPT") {
    const response = await client.rpc("t2b_accept_proposal_for_claim_evidence", {
      p_actor_id: project.steward_actor_id,
      p_proposal_id: input.proposalId,
      p_opportunity_version: input.opportunityVersion,
      p_proposal_version: input.proposalVersion,
      p_expected_opportunity_material_version: input.expectedOpportunityMaterialVersion,
      p_expected_proposal_material_version: input.expectedProposalMaterialVersion,
      p_reason: input.reason,
      p_command_id: input.commandId,
      p_idempotency_key: input.idempotencyKey,
    });
    data = response.data;
    error = response.error;
  } else if (input.operation === "REJECT") {
    const response = await client.rpc("b1_reject_proposal", {
      p_actor_id: project.steward_actor_id,
      p_proposal_id: input.proposalId,
      p_expected_material_version: input.expectedProposalMaterialVersion,
      p_reason: input.reason,
      p_command_id: input.commandId,
      p_idempotency_key: input.idempotencyKey,
    });
    data = response.data;
    error = response.error;
  } else {
    const response = await client.rpc("b1_request_proposal_revision", {
      p_actor_id: project.steward_actor_id,
      p_proposal_id: input.proposalId,
      p_expected_material_version: input.expectedProposalMaterialVersion,
      p_reason: input.reason,
      p_command_id: input.commandId,
      p_idempotency_key: input.idempotencyKey,
    });
    data = response.data;
    error = response.error;
  }

  const result = data as { ok?: boolean; commitment_id?: string } | null;
  if (error || !result?.ok) {
    redirect(`${opportunityPath(input.projectSlug, input.opportunityId)}?coordination=review-denied`);
  }

  revalidatePath(opportunityPath(input.projectSlug, input.opportunityId));
  revalidatePath(`/projects/${input.projectSlug}`);

  if (input.operation === "ACCEPT" && result.commitment_id) {
    revalidatePath(`/commitments/${result.commitment_id}`);
    redirect(`/commitments/${result.commitment_id}?coordination=accepted`);
  }

  redirect(
    `${opportunityPath(input.projectSlug, input.opportunityId)}?coordination=${
      input.operation === "REJECT" ? "rejected" : "revision-requested"
    }`,
  );
}

export async function revisePublicProposalAction(formData: FormData): Promise<void> {
  const parsed = reviseSchema.safeParse({
    projectSlug: formData.get("projectSlug"),
    opportunityId: formData.get("opportunityId"),
    proposalId: formData.get("proposalId"),
    actorId: formData.get("actorId"),
    expectedProposalMaterialVersion: formData.get("expectedProposalMaterialVersion"),
    statement: formData.get("statement"),
    conditions: formData.get("conditions"),
    expectedDelivery: formData.get("expectedDelivery"),
    rewardExpectation: formData.get("rewardExpectation"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) redirect("/projects?coordination=invalid-revision");

  const input = parsed.data;
  const client = await createSupabaseServerClient();
  if (!client) redirect(`${opportunityPath(input.projectSlug, input.opportunityId)}?coordination=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    redirect(`/login?next=${encodeURIComponent(opportunityPath(input.projectSlug, input.opportunityId))}`);
  }

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id")
    .eq("id", input.actorId)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (actorError || !actor) {
    redirect(`${opportunityPath(input.projectSlug, input.opportunityId)}?coordination=actor-control-denied`);
  }

  const { data: proposal, error: proposalError } = await client
    .from("proposals")
    .select("id, proposer_actor_id, opportunity_id")
    .eq("id", input.proposalId)
    .eq("opportunity_id", input.opportunityId)
    .eq("proposer_actor_id", input.actorId)
    .maybeSingle();

  if (proposalError || !proposal) {
    redirect(`${opportunityPath(input.projectSlug, input.opportunityId)}?coordination=proposal-not-found`);
  }

  const { data, error } = await client.rpc("t1_submit_public_proposal_revision", {
    p_actor_id: input.actorId,
    p_proposal_id: input.proposalId,
    p_expected_material_version: input.expectedProposalMaterialVersion,
    p_statement: input.statement,
    p_conditions: input.conditions,
    p_expected_delivery: input.expectedDelivery,
    p_reward_expectation: input.rewardExpectation,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as { ok?: boolean; state?: string } | null;
  if (error || !result?.ok || result.state !== "SUBMITTED") {
    redirect(`${opportunityPath(input.projectSlug, input.opportunityId)}?coordination=revision-denied`);
  }

  revalidatePath(opportunityPath(input.projectSlug, input.opportunityId));
  redirect(`${opportunityPath(input.projectSlug, input.opportunityId)}?coordination=revision-submitted`);
}
