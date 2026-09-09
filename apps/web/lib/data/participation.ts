import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function controlledPersonActor() {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await client.from("actor_memberships").select("actor_id, actors!inner(kind)")
    .eq("profile_id", auth.user.id).in("role", ["OWNER", "OPERATOR", "REPRESENTATIVE"])
    .eq("actors.kind", "PERSON").limit(1).maybeSingle();
  if (error) throw new Error(`Participant Boundary resolution failed: ${error.message}`);
  return data?.actor_id as string | undefined ?? null;
}

export async function listCellParticipations(cellId: string) {
  const client = await createSupabaseServerClient();
  if (!client) return [];
  const { data, error } = await client.from("cell_participations")
    .select("id,actor_id,status,joined_at,left_at,material_version").eq("cell_id", cellId).order("joined_at");
  if (error) throw new Error(`Participation read failed: ${error.message}`);
  return data ?? [];
}
