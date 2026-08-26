"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  requestId: z.string().uuid(),
  actorId: z.string().uuid(),
  method: z.string().trim().min(3).max(200),
  findings: z.string().trim().min(10).max(4000),
  classification: z.enum(["PASS", "FAIL", "PARTIAL", "INCONCLUSIVE"]),
  limitations: z.string().trim().min(2).max(2000),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

export async function issueVerificationAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    requestId: formData.get("requestId"),
    actorId: formData.get("actorId"),
    method: formData.get("method"),
    findings: formData.get("findings"),
    classification: formData.get("classification"),
    limitations: formData.get("limitations"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) redirect("/projects?verification=invalid");

  const evidenceItemIds = formData
    .getAll("evidenceItemIds")
    .map(String)
    .filter((value) => z.string().uuid().safeParse(value).success);

  if (!evidenceItemIds.length) {
    redirect(`/verifications/${String(formData.get("requestId"))}?verification=evidence-required`);
  }

  const input = parsed.data;
  const path = `/verifications/${input.requestId}`;
  const client = await createSupabaseServerClient();
  if (!client) redirect(`${path}?verification=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id")
    .eq("id", input.actorId)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (actorError || !actor) redirect(`${path}?verification=actor-control-denied`);

  const { data: request, error: requestError } = await client
    .from("verification_requests")
    .select("id, reviewer_actor_id, expected_method, state")
    .eq("id", input.requestId)
    .maybeSingle();

  if (
    requestError ||
    !request ||
    request.reviewer_actor_id !== input.actorId ||
    request.state !== "OPEN"
  ) {
    redirect(`${path}?verification=assigned-reviewer-required`);
  }

  if (input.method !== request.expected_method) {
    redirect(`${path}?verification=method-mismatch`);
  }

  const { data, error } = await client.rpc("b2b2_issue_verification", {
    p_actor_id: input.actorId,
    p_request_id: input.requestId,
    p_method: input.method,
    p_findings: input.findings,
    p_classification: input.classification,
    p_limitations: input.limitations,
    p_evidence_item_ids: evidenceItemIds,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as {
    ok?: boolean;
    verification_id?: string;
    verification_request_id?: string;
    classification?: string;
  } | null;

  if (
    error ||
    !result?.ok ||
    !result.verification_id ||
    result.verification_request_id !== input.requestId ||
    result.classification !== input.classification
  ) {
    redirect(`${path}?verification=issue-denied`);
  }

  revalidatePath(path);
  redirect(`${path}?verification=issued`);
}
