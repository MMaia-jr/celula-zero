import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PublicNeed {
  id: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  ownerActorId: string;
  ownerActorName: string;
  state: "OPEN";
  visibility: "PUBLIC";
  currentVersion: number;
  materialVersion: number;
  title: string;
  statement: string;
  context: string;
  updatedAt: string;
}

interface RawNeed {
  id: string;
  project_id: string;
  owner_actor_id: string;
  state: "OPEN";
  visibility: "PUBLIC";
  current_version: number;
  material_version: number;
  updated_at: string;
  project: { id: string; slug: string; title: string } | null;
  owner: { id: string; name: string } | null;
  need_versions: Array<{
    version: number;
    title: string;
    statement: string;
    context: string;
    state: string;
    visibility: string;
  }>;
}

const selection = `
  id,
  project_id,
  owner_actor_id,
  state,
  visibility,
  current_version,
  material_version,
  updated_at,
  project:projects!needs_project_id_fkey(id, slug, title),
  owner:actors!needs_owner_actor_id_fkey(id, name),
  need_versions(version, title, statement, context, state, visibility)
`;

function mapNeed(row: RawNeed): PublicNeed | null {
  const version = row.need_versions.find((item) => item.version === row.current_version);
  if (!version || !row.project || !row.owner) return null;
  if (version.state !== "OPEN" || version.visibility !== "PUBLIC") return null;

  return {
    id: row.id,
    projectId: row.project_id,
    projectSlug: row.project.slug,
    projectTitle: row.project.title,
    ownerActorId: row.owner_actor_id,
    ownerActorName: row.owner.name,
    state: row.state,
    visibility: row.visibility,
    currentVersion: row.current_version,
    materialVersion: row.material_version,
    title: version.title,
    statement: version.statement,
    context: version.context,
    updatedAt: row.updated_at,
  };
}

async function publicNeedQuery(projectId?: string) {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  let query = client
    .from("needs")
    .select(selection)
    .eq("state", "OPEN")
    .eq("visibility", "PUBLIC")
    .order("updated_at", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);
  return query;
}

export async function listPublicNeeds(projectId?: string): Promise<PublicNeed[]> {
  const result = await publicNeedQuery(projectId);
  if (!result) return [];
  if (result.error) {
    throw new Error(`Não foi possível carregar Needs públicas: ${result.error.message}`);
  }

  return ((result.data ?? []) as unknown as RawNeed[])
    .map(mapNeed)
    .filter((item): item is PublicNeed => item !== null);
}

export async function listPublicNeedsByProject(projectId: string) {
  return listPublicNeeds(projectId);
}

export async function getPublicNeed(needId: string): Promise<PublicNeed | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  const { data, error } = await client
    .from("needs")
    .select(selection)
    .eq("id", needId)
    .eq("state", "OPEN")
    .eq("visibility", "PUBLIC")
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar a Need: ${error.message}`);
  }

  return data ? mapNeed(data as unknown as RawNeed) : null;
}
