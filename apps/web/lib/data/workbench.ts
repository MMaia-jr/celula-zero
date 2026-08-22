import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WorkbenchOpportunityState = "DRAFT" | "OPEN" | "CLOSED";

export interface WorkbenchOpportunity {
  id: string;
  state: WorkbenchOpportunityState;
  visibility: "PROJECT" | "PUBLIC";
  currentVersion: number;
  materialVersion: number;
  capacity: number;
  title: string;
  statement: string;
  conditions: string;
  expectedResult: string;
}

export interface WorkbenchProject {
  id: string;
  slug: string;
  title: string;
  stage: string;
  sourceLabel: string;
  opportunities: WorkbenchOpportunity[];
}

export type WorkbenchData =
  | { status: "UNAVAILABLE"; projects: [] }
  | { status: "ANONYMOUS"; projects: [] }
  | { status: "READY"; projects: WorkbenchProject[] };

interface RawOpportunity {
  id: string;
  project_id: string;
  state: WorkbenchOpportunityState;
  visibility: "PROJECT" | "PUBLIC";
  current_version: number;
  material_version: number;
  capacity: number;
  opportunity_versions: Array<{
    version: number;
    title: string;
    statement: string;
    conditions: string;
    expected_result: string;
  }>;
}

export async function getWorkbenchData(): Promise<WorkbenchData> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE", projects: [] };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { status: "ANONYMOUS", projects: [] };

  const { data: actorMemberships, error: actorError } = await client
    .from("actor_memberships")
    .select("actor_id")
    .eq("profile_id", authData.user.id)
    .in("role", ["OWNER", "OPERATOR", "REPRESENTATIVE"]);

  if (actorError) {
    throw new Error(`Não foi possível resolver atores controlados: ${actorError.message}`);
  }

  const actorIds = [...new Set((actorMemberships ?? []).map(({ actor_id }) => actor_id))];
  if (!actorIds.length) return { status: "READY", projects: [] };

  const { data: stewardMemberships, error: stewardError } = await client
    .from("project_members")
    .select("project_id")
    .eq("role", "PROJECT_STEWARD")
    .in("actor_id", actorIds);

  if (stewardError) {
    throw new Error(`Não foi possível carregar stewardship: ${stewardError.message}`);
  }

  const projectIds = [...new Set((stewardMemberships ?? []).map(({ project_id }) => project_id))];
  if (!projectIds.length) return { status: "READY", projects: [] };

  const [{ data: projects, error: projectsError }, { data: opportunities, error: opportunitiesError }] =
    await Promise.all([
      client
        .from("projects")
        .select("id, slug, title, stage, source_label, updated_at")
        .in("id", projectIds)
        .order("updated_at", { ascending: false }),
      client
        .from("opportunities")
        .select(`
          id, project_id, state, visibility, current_version, material_version, capacity,
          opportunity_versions(version, title, statement, conditions, expected_result)
        `)
        .in("project_id", projectIds)
        .order("created_at", { ascending: true }),
    ]);

  if (projectsError) {
    throw new Error(`Não foi possível carregar projetos operáveis: ${projectsError.message}`);
  }
  if (opportunitiesError) {
    throw new Error(`Não foi possível carregar oportunidades: ${opportunitiesError.message}`);
  }

  const byProject = new Map<string, WorkbenchOpportunity[]>();
  for (const row of (opportunities ?? []) as unknown as RawOpportunity[]) {
    const current = row.opportunity_versions.find(({ version }) => version === row.current_version);
    if (!current) {
      throw new Error(`Oportunidade ${row.id} sem versão material atual.`);
    }

    const mapped: WorkbenchOpportunity = {
      id: row.id,
      state: row.state,
      visibility: row.visibility,
      currentVersion: row.current_version,
      materialVersion: row.material_version,
      capacity: row.capacity,
      title: current.title,
      statement: current.statement,
      conditions: current.conditions,
      expectedResult: current.expected_result,
    };

    byProject.set(row.project_id, [...(byProject.get(row.project_id) ?? []), mapped]);
  }

  return {
    status: "READY",
    projects: (projects ?? []).map((project) => ({
      id: project.id,
      slug: project.slug,
      title: project.title,
      stage: project.stage,
      sourceLabel: project.source_label,
      opportunities: byProject.get(project.id) ?? [],
    })),
  };
}
