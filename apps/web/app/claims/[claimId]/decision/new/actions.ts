"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  claimId: z.string().uuid(),
  actorId: z.string().uuid(),
  disposition: z.enum(["ACCEPT_FOR_CONTEXT", "REJECT_FOR_CONTEXT", "DEFER"]),
  reason: z.string().trim().min(10).max(4000),
  limitations: z.string().trim().min(2).max(2000),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

export async function issueDomainDecisionAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    claimId: formData.get("claimId"),
    actorId: formData.get("actorId"),
    disposition: formData.get("disposition"),
    reason: formData.get("reason"),
    limitations: formData.get("limitations"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) redirect("/projects?decision=invalid");

  const input = parsed.data;
  const path = `/claims/${input.claimId}/decision/new`;
  const verificationIds = formData
    .getAll("verificationIds")
    .map(String)
    .filter((value) => z.string().uuid().safeParse(value).success);

  const client = await createSupabaseServerClient();
  if (!client) redirect(`${path}?decision=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) redirect(`/login?next=${encodeURIComponent(path)}`);

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id")
    .eq("id", input.actorId)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (actorError || !actor) redirect(`${path}?decision=actor-control-denied`);

  const { data, error } = await client.rpc("t2d_issue_domain_decision", {
    p_actor_id: input.actorId,
    p_claim_id: input.claimId,
    p_verification_ids: verificationIds,
    p_disposition: input.disposition,
    p_reason: input.reason,
    p_limitations: input.limitations,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as {
    ok?: boolean;
    decision_id?: string;
    disposition?: string;
  } | null;

  if (
    error ||
    !result?.ok ||
    !result.decision_id ||
    result.disposition !== input.disposition
  ) {
    redirect(`${path}?decision=issue-denied`);
  }

  redirect(`/decisions/${result.decision_id}?decision=issued`);
}
