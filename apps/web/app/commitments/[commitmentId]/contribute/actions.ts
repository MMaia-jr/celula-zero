"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  commitmentId: z.string().uuid(),
  actorId: z.string().uuid(),
  description: z.string().trim().min(10).max(4000),
  limitations: z.string().trim().min(2).max(2000),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

export async function submitContributionAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    commitmentId: formData.get("commitmentId"),
    actorId: formData.get("actorId"),
    description: formData.get("description"),
    limitations: formData.get("limitations"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) redirect("/projects?work=invalid-contribution");

  const input = parsed.data;
  const commitmentPath = `/commitments/${input.commitmentId}`;
  const client = await createSupabaseServerClient();
  if (!client) redirect(`${commitmentPath}?work=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    redirect(`/login?next=${encodeURIComponent(`${commitmentPath}/contribute`)}`);
  }

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id")
    .eq("id", input.actorId)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (actorError || !actor) {
    redirect(`${commitmentPath}?work=actor-control-denied`);
  }

  const { data: commitment, error: commitmentError } = await client
    .from("commitments")
    .select("id, proposer_actor_id")
    .eq("id", input.commitmentId)
    .eq("proposer_actor_id", input.actorId)
    .maybeSingle();

  if (commitmentError || !commitment) {
    redirect(`${commitmentPath}?work=contributor-required`);
  }

  const { data, error } = await client.rpc("b2a_submit_contribution", {
    p_actor_id: input.actorId,
    p_commitment_id: input.commitmentId,
    p_description: input.description,
    p_limitations: input.limitations,
    p_supersedes_contribution_id: null,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as {
    ok?: boolean;
    contribution_id?: string;
    commitment_id?: string;
  } | null;

  if (
    error ||
    !result?.ok ||
    !result.contribution_id ||
    result.commitment_id !== input.commitmentId
  ) {
    redirect(`${commitmentPath}?work=contribution-denied`);
  }

  revalidatePath(commitmentPath);
  revalidatePath(`/contributions/${result.contribution_id}`);
  redirect(`/contributions/${result.contribution_id}?work=submitted`);
}
