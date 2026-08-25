"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  projectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  actorId: z.string().uuid(),
  opportunityId: z.string().uuid(),
  statement: z.string().trim().min(10).max(4000),
  conditions: z.string().trim().min(3).max(4000),
  expectedDelivery: z.string().trim().min(3).max(2000),
  rewardExpectation: z.string().trim().min(2).max(1000),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

export async function submitPublicProposalAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    projectSlug: formData.get("projectSlug"),
    actorId: formData.get("actorId"),
    opportunityId: formData.get("opportunityId"),
    statement: formData.get("statement"),
    conditions: formData.get("conditions"),
    expectedDelivery: formData.get("expectedDelivery"),
    rewardExpectation: formData.get("rewardExpectation"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) redirect("/projects?proposal=invalid");

  const input = parsed.data;
  const client = await createSupabaseServerClient();
  if (!client) redirect(`/projects/${input.projectSlug}?proposal=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    const next = `/projects/${input.projectSlug}/opportunities/${input.opportunityId}/propose`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id")
    .eq("id", input.actorId)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (actorError || !actor) {
    redirect(`/projects/${input.projectSlug}?proposal=actor-control-denied`);
  }

  const { data, error } = await client.rpc("b1_submit_public_proposal", {
    p_actor_id: input.actorId,
    p_opportunity_id: input.opportunityId,
    p_statement: input.statement,
    p_conditions: input.conditions,
    p_expected_delivery: input.expectedDelivery,
    p_reward_expectation: input.rewardExpectation,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as { ok?: boolean; proposal_id?: string } | null;
  if (error || !result?.ok || !result.proposal_id) {
    redirect(`/projects/${input.projectSlug}?proposal=denied`);
  }

  revalidatePath(`/projects/${input.projectSlug}`);
  redirect(`/projects/${input.projectSlug}?proposal=submitted`);
}
