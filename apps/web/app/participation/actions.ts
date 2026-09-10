"use server";

import { redirect } from "next/navigation";
import {
  controlledPersonActor,
  controlledPersonActorForParticipation,
} from "@/lib/data/participation";
import type { ParticipationActionState } from "@/lib/domain/participation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function acceptInvitation(
  _previous: ParticipationActionState,
  formData: FormData,
): Promise<ParticipationActionState> {
  const client = await createSupabaseServerClient();
  if (!client) return { ok: false, message: "Backend unavailable." };

  const actorId = await controlledPersonActor();
  if (!actorId) {
    return {
      ok: false,
      message: "Sign in with exactly one controlled PERSON Actor before accepting an invitation.",
    };
  }

  const token = String(formData.get("token") ?? "");
  const statement = String(formData.get("statement") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return { ok: false, message: "Invitation token is missing or invalid." };
  }

  const { data, error } = await client.rpc("k002_accept_cell_invitation", {
    p_actor_id: actorId,
    p_bearer_token: token,
    p_consent_statement: statement,
    p_command_id: crypto.randomUUID(),
    p_idempotency_key: `participation-accept-${crypto.randomUUID()}`,
  });
  if (error) return { ok: false, message: error.message };

  const participationId = (data as { participation_id?: string } | null)?.participation_id;
  if (!participationId || !UUID.test(participationId)) {
    return {
      ok: false,
      message: "Participation was recorded, but its bounded context could not be resolved safely.",
    };
  }
  redirect(`/participation/context/${participationId}`);
}

export async function leaveParticipation(formData: FormData): Promise<void> {
  const client = await createSupabaseServerClient();
  if (!client) throw new Error("Backend unavailable.");

  const participationId = String(formData.get("participationId") ?? "");
  if (!UUID.test(participationId)) throw new Error("Invalid participation identifier.");

  const actorId = await controlledPersonActorForParticipation(participationId);
  if (!actorId) {
    throw new Error("The authenticated profile does not control the PERSON Actor for this participation.");
  }

  const { error } = await client.rpc("k002_leave_cell_participation", {
    p_actor_id: actorId,
    p_participation_id: participationId,
    p_command_id: crypto.randomUUID(),
    p_idempotency_key: `participation-leave-${crypto.randomUUID()}`,
  });
  if (error) throw new Error(`Leave failed closed: ${error.message}`);
  redirect("/participation/left");
}
