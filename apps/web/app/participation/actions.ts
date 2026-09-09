"use server";
import { controlledPersonActor } from "@/lib/data/participation";
import type { ParticipationActionState } from "@/lib/domain/participation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function acceptInvitation(_previous: ParticipationActionState, formData: FormData): Promise<ParticipationActionState> {
  const client = await createSupabaseServerClient();
  if (!client) return { ok:false, message:"Backend unavailable." };
  const actorId = await controlledPersonActor();
  if (!actorId) return { ok:false, message:"Sign in as an authenticated controlled PERSON Actor." };
  const token = String(formData.get("token") ?? "");
  const statement = String(formData.get("statement") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) return { ok:false, message:"Invitation token is missing or invalid." };
  const { data, error } = await client.rpc("k002_accept_cell_invitation", { p_actor_id:actorId,p_bearer_token:token,p_consent_statement:statement,p_command_id:crypto.randomUUID(),p_idempotency_key:`participation-accept-${crypto.randomUUID()}` });
  if (error) return { ok:false, message:error.message };
  return { ok:true, message:`Participation ${(data as { participation_id:string }).participation_id} is active. No role, delegation, membership, or admin authority was granted.` };
}
