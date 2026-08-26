"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  decisionId: z.string().uuid(),
  actorId: z.string().uuid(),
  classification: z.enum(["OBSERVED", "INCONCLUSIVE"]),
  statement: z.string().trim().min(10).max(4000),
  observedAt: z.string().optional(),
  limitations: z.string().trim().min(2).max(2000),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

export async function recordOutcomeAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    decisionId: formData.get("decisionId"),
    actorId: formData.get("actorId"),
    classification: formData.get("classification"),
    statement: formData.get("statement"),
    observedAt: String(formData.get("observedAt") ?? ""),
    limitations: formData.get("limitations"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) redirect("/projects?outcome=invalid");

  const input = parsed.data;
  const path = `/decisions/${input.decisionId}`;
  const client = await createSupabaseServerClient();
  if (!client) redirect(`${path}?outcome=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) redirect(`/login?next=${encodeURIComponent(path)}`);

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id")
    .eq("id", input.actorId)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (actorError || !actor) redirect(`${path}?outcome=actor-control-denied`);

  const observedAt =
    input.classification === "OBSERVED" && input.observedAt
      ? new Date(input.observedAt).toISOString()
      : null;

  const { data, error } = await client.rpc("t2d_record_outcome", {
    p_actor_id: input.actorId,
    p_decision_id: input.decisionId,
    p_classification: input.classification,
    p_statement: input.statement,
    p_observed_at: observedAt,
    p_limitations: input.limitations,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as {
    ok?: boolean;
    outcome_id?: string;
    classification?: string;
  } | null;

  if (
    error ||
    !result?.ok ||
    !result.outcome_id ||
    result.classification !== input.classification
  ) {
    redirect(`${path}?outcome=record-denied`);
  }

  revalidatePath(path);
  redirect(`${path}?outcome=recorded`);
}
