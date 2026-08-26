"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  contributionId: z.string().uuid(),
  actorId: z.string().uuid(),
  subjectType: z.enum(["CONTRIBUTION", "ARTIFACT"]),
  subjectId: z.string().uuid(),
  statement: z.string().trim().min(10).max(4000),
  scopeDescription: z.string().trim().min(3).max(2000),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

export async function recordClaimAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    contributionId: formData.get("contributionId"),
    actorId: formData.get("actorId"),
    subjectType: formData.get("subjectType"),
    subjectId: formData.get("subjectId"),
    statement: formData.get("statement"),
    scopeDescription: formData.get("scopeDescription"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) redirect("/projects?claim=invalid");

  const input = parsed.data;
  const contributionPath = `/contributions/${input.contributionId}`;
  const client = await createSupabaseServerClient();
  if (!client) redirect(`${contributionPath}?claim=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    redirect(`/login?next=${encodeURIComponent(`${contributionPath}/claims/new`)}`);
  }

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id")
    .eq("id", input.actorId)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (actorError || !actor) redirect(`${contributionPath}?claim=actor-control-denied`);

  const { data: contribution, error: contributionError } = await client
    .from("contributions")
    .select("id, author_actor_id")
    .eq("id", input.contributionId)
    .eq("author_actor_id", input.actorId)
    .maybeSingle();

  if (contributionError || !contribution) {
    redirect(`${contributionPath}?claim=author-required`);
  }

  if (input.subjectType === "CONTRIBUTION") {
    if (input.subjectId !== input.contributionId) {
      redirect(`${contributionPath}?claim=subject-mismatch`);
    }
  } else {
    const { data: artifact, error: artifactError } = await client
      .from("artifacts")
      .select("id")
      .eq("id", input.subjectId)
      .eq("contribution_id", input.contributionId)
      .eq("created_by_actor_id", input.actorId)
      .maybeSingle();

    if (artifactError || !artifact) {
      redirect(`${contributionPath}?claim=subject-mismatch`);
    }
  }

  const { data, error } = await client.rpc("b2b1_record_claim", {
    p_actor_id: input.actorId,
    p_subject_type: input.subjectType,
    p_subject_id: input.subjectId,
    p_statement: input.statement,
    p_scope_description: input.scopeDescription,
    p_supersedes_claim_id: null,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as {
    ok?: boolean;
    claim_id?: string;
    subject_type?: string;
    subject_id?: string;
  } | null;

  if (
    error ||
    !result?.ok ||
    !result.claim_id ||
    result.subject_type !== input.subjectType ||
    result.subject_id !== input.subjectId
  ) {
    redirect(`${contributionPath}?claim=record-denied`);
  }

  revalidatePath(contributionPath);
  revalidatePath(`/claims/${result.claim_id}`);
  redirect(`/claims/${result.claim_id}?claim=recorded`);
}
