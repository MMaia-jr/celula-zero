import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PublicOpportunity {
  id: string;
  projectId: string;
  state: "OPEN";
  visibility: "PUBLIC";
  currentVersion: number;
  materialVersion: number;
  capacity: number;
  title: string;
  statement: string;
  conditions: string;
  expectedResult: string;
}

interface RawOpportunity {
  id: string;
  project_id: string;
  state: "OPEN";
  visibility: "PUBLIC";
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

const selection = `
  id,
  project_id,
  state,
  visibility,
  current_version,
  material_version,
  capacity,
  opportunity_versions(
    version,
    title,
    statement,
    conditions,
    expected_result
  )
`;

function mapOpportunity(row: RawOpportunity): PublicOpportunity | null {
  const version = row.opportunity_versions.find(
    (item) => item.version === row.current_version,
  );
  if (!version) return null;

  return {
    id: row.id,
    projectId: row.project_id,
    state: row.state,
    visibility: row.visibility,
    currentVersion: row.current_version,
    materialVersion: row.material_version,
    capacity: row.capacity,
    title: version.title,
    statement: version.statement,
    conditions: version.conditions,
    expectedResult: version.expected_result,
  };
}

export async function listPublicOpenOpportunities(
  projectId: string,
): Promise<PublicOpportunity[]> {
  const client = await createSupabaseServerClient();
  if (!client) return [];

  const { data, error } = await client
    .from("opportunities")
    .select(selection)
    .eq("project_id", projectId)
    .eq("state", "OPEN")
    .eq("visibility", "PUBLIC")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Não foi possível carregar oportunidades públicas: ${error.message}`);
  }

  return ((data ?? []) as unknown as RawOpportunity[])
    .map(mapOpportunity)
    .filter((item): item is PublicOpportunity => item !== null);
}

export async function getPublicOpenOpportunity(
  projectId: string,
  opportunityId: string,
): Promise<PublicOpportunity | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  const { data, error } = await client
    .from("opportunities")
    .select(selection)
    .eq("id", opportunityId)
    .eq("project_id", projectId)
    .eq("state", "OPEN")
    .eq("visibility", "PUBLIC")
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar a oportunidade: ${error.message}`);
  }

  return data ? mapOpportunity(data as unknown as RawOpportunity) : null;
}
