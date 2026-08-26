"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  claimId: z.string().uuid(),
  actorId: z.string().uuid(),
  sourceArtifactId: z.string().uuid(),
  relation: z.enum(["SUPPORTS", "CHALLENGES", "CONTEXTUALIZES", "REPLICATES"]),
  description: z.string().trim().min(10).max(4000),
  limitations: z.string().trim().min(2).max(2000),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

export async function registerEvidenceAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    claimId: formData.get("claimId"),
    actorId: formData.get("actorId"),
    sourceArtifactId: formData.get("sourceArtifactId"),
    relation: formData.get("relation"),
    description: formData.get("description"),
    limitations: formData.get("limitations"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) redirect("/projects?evidence=invalid");

  const input = parsed.data;
  const claimPath = `/claims/${input.claimId}`;
  const client = await createSupabaseServerClient();
  if (!client) redirect(`${claimPath}?evidence=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    redirect(`/login?next=${encodeURIComponent(`${claimPath}/evidence/new`)}`);
  }

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id")
    .eq("id", input.actorId)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (actorError || !actor) redirect(`${claimPath}?evidence=actor-control-denied`);

  const { data: claim, error: claimError } = await client
    .from("claims")
    .select("id, project_id, author_actor_id")
    .eq("id", input.claimId)
    .eq("author_actor_id", input.actorId)
    .maybeSingle();

  if (claimError || !claim) redirect(`${claimPath}?evidence=claim-author-required`);

  const { data: artifact, error: artifactError } = await client
    .from("artifacts")
    .select("id, project_id, created_by_actor_id")
    .eq("id", input.sourceArtifactId)
    .eq("project_id", claim.project_id)
    .eq("created_by_actor_id", input.actorId)
    .maybeSingle();

  if (artifactError || !artifact) redirect(`${claimPath}?evidence=source-denied`);

  const { data, error } = await client.rpc("b2b1_register_evidence", {
    p_actor_id: input.actorId,
    p_claim_id: input.claimId,
    p_source_artifact_id: input.sourceArtifactId,
    p_relation: input.relation,
    p_description: input.description,
    p_limitations: input.limitations,
    p_supersedes_evidence_item_id: null,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as {
    ok?: boolean;
    evidence_item_id?: string;
    claim_id?: string;
    source_artifact_id?: string;
    relation?: string;
  } | null;

  if (
    error ||
    !result?.ok ||
    !result.evidence_item_id ||
    result.claim_id !== input.claimId ||
    result.source_artifact_id !== input.sourceArtifactId ||
    result.relation !== input.relation
  ) {
    redirect(`${claimPath}?evidence=register-denied`);
  }

  revalidatePath(claimPath);
  redirect(`${claimPath}?evidence=registered`);
}
