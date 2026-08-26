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

export interface PublicProfileSummary extends PublicProfile {
  publicProjectCount: number;
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

function mapPublicProfileRow(row: {
  handle: string;
  display_name: string;
  bio: string;
  actor_id: string;
  actor_name: string;
}): PublicProfile {
  return {
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio,
    actorId: row.actor_id,
    actorName: row.actor_name,
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

  return row ? mapPublicProfileRow(row) : null;
}

export async function getPublicProfileByActor(actorId: string): Promise<PublicProfile | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  const { data, error } = await client.rpc("get_public_profile_by_actor", {
    p_actor_id: actorId,
  });

  if (error) {
    throw new Error(`Não foi possível resolver o Profile público do Actor: ${error.message}`);
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

  return row ? mapPublicProfileRow(row) : null;
}

export async function listPublicProfiles(): Promise<PublicProfileSummary[]> {
  const client = await createSupabaseServerClient();
  if (!client) return [];

  const { data, error } = await client.rpc("list_public_profiles");

  if (error) {
    throw new Error(`Não foi possível listar Profiles públicos: ${error.message}`);
  }

  return ((data ?? []) as Array<{
    handle: string;
    display_name: string;
    bio: string;
    actor_id: string;
    actor_name: string;
    public_project_count: number | string;
  }>).map((row) => ({
    ...mapPublicProfileRow(row),
    publicProjectCount: Number(row.public_project_count),
  }));
}
