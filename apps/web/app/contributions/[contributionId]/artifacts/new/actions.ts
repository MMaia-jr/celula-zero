"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  contributionId: z.string().uuid(),
  actorId: z.string().uuid(),
  content: z.string().min(1).max(20000),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

export async function attachTextArtifactAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    contributionId: formData.get("contributionId"),
    actorId: formData.get("actorId"),
    content: formData.get("content"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) redirect("/projects?artifact=invalid");

  const input = parsed.data;
  const contributionPath = `/contributions/${input.contributionId}`;
  const client = await createSupabaseServerClient();
  if (!client) redirect(`${contributionPath}?artifact=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    redirect(`/login?next=${encodeURIComponent(`${contributionPath}/artifacts/new`)}`);
  }

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id")
    .eq("id", input.actorId)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (actorError || !actor) redirect(`${contributionPath}?artifact=actor-control-denied`);

  const { data: contribution, error: contributionError } = await client
    .from("contributions")
    .select("id, author_actor_id")
    .eq("id", input.contributionId)
    .eq("author_actor_id", input.actorId)
    .maybeSingle();

  if (contributionError || !contribution) {
    redirect(`${contributionPath}?artifact=author-required`);
  }

  const { data, error } = await client.rpc("t2a_attach_text_artifact", {
    p_actor_id: input.actorId,
    p_contribution_id: input.contributionId,
    p_content: input.content,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as {
    ok?: boolean;
    artifact_id?: string;
    contribution_id?: string;
    digest?: string;
  } | null;

  if (
    error ||
    !result?.ok ||
    !result.artifact_id ||
    result.contribution_id !== input.contributionId ||
    !result.digest
  ) {
    redirect(`${contributionPath}?artifact=attach-denied`);
  }

  revalidatePath(contributionPath);
  redirect(`${contributionPath}?artifact=attached`);
}
