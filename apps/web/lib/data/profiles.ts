import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileVisibility = "PRIVATE" | "PUBLIC";

export interface MyProfile {
  handle: string | null;
  displayName: string;
  bio: string;
  visibility: ProfileVisibility;
  actorId: string;
  actorName: string;
}

export interface PublicProfile {
  handle: string;
  displayName: string;
  bio: string;
  actorId: string;
  actorName: string;
}

export type MyProfileResult =
  | { status: "ANONYMOUS" }
  | { status: "UNAVAILABLE" }
  | { status: "READY"; profile: MyProfile };

export async function getMyProfile(): Promise<MyProfileResult> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE" };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { status: "ANONYMOUS" };

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("handle, display_name, bio, visibility")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error(`Não foi possível carregar o Profile: ${profileError?.message ?? "ausente"}`);
  }

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id, name")
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (actorError || !actor) {
    throw new Error(`Não foi possível carregar o Actor PERSON: ${actorError?.message ?? "ausente"}`);
  }

  return {
    status: "READY",
    profile: {
      handle: profile.handle ? String(profile.handle) : null,
      displayName: String(profile.display_name),
      bio: String(profile.bio ?? ""),
      visibility: profile.visibility as ProfileVisibility,
      actorId: String(actor.id),
      actorName: String(actor.name),
    },
  };
}

export async function getPublicProfile(handle: string): Promise<PublicProfile | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  const { data, error } = await client.rpc("get_public_profile", {
    p_handle: handle,
  });

  if (error) {
    throw new Error(`Não foi possível carregar o Profile público: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const row = rows[0] as
    | {
        handle: string;
        display_name: string;
        bio: string;
        actor_id: string;
        actor_name: string;
      }
    | undefined;

  if (!row) return null;

  return {
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio,
    actorId: row.actor_id,
    actorName: row.actor_name,
  };
}
