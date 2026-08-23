import { SEED_PROJECTS } from "@/lib/data/seed-projects";
import type {
  ActorKind,
  EconomicRegime,
  ProjectEventType,
  ProjectRecord,
  ProjectStage,
  ProjectVisibility,
} from "@/lib/domain/types";
import { getSupabasePublicEnvironment } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface RawProjectRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  current_intent: string;
  stage: ProjectStage;
  visibility: ProjectVisibility;
  economic_regime: EconomicRegime;
  intended_result: string;
  rules_and_limits: string;
  needs: string[];
  created_at: string;
  published_at: string | null;
  version: number;
  source_label: ProjectRecord["sourceLabel"];
  steward: { id: string; name: string; kind: ActorKind; operator_label: string | null } | null;
  project_intents: Array<{ kind: "ORIGINAL" | "INTERPRETATION"; content: string; version: number }>;
  events: Array<{
    id: string;
    event_type: ProjectEventType;
    title: string;
    description: string;
    occurred_at: string;
    material_version: number;
  }>;
}

const projectSelection = `
  id, slug, title, summary, current_intent, stage, visibility,
  economic_regime, intended_result, rules_and_limits, needs,
  created_at, published_at, version, source_label,
  steward:actors!projects_steward_actor_id_fkey(id, name, kind, operator_label),
  project_intents!project_intents_project_id_fkey(kind, content, version),
  events(id, event_type, title, description, occurred_at, material_version)
`;

function mapProject(row: RawProjectRow): ProjectRecord {
  const originalIntent = row.project_intents.find((intent) => intent.kind === "ORIGINAL");
  if (!row.steward) {
    throw new Error(`Projeto ${row.id} não possui responsável público.`);
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    originalIntent: originalIntent?.content ?? null,
    currentIntent: row.current_intent,
    steward: {
      id: row.steward.id,
      name: row.steward.name,
      kind: row.steward.kind,
      ...(row.steward.operator_label ? { operatorLabel: row.steward.operator_label } : {}),
    },
    stage: row.stage,
    visibility: row.visibility,
    economicRegime: row.economic_regime,
    intendedResult: row.intended_result,
    rulesAndLimits: row.rules_and_limits,
    needs: row.needs,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    version: row.version,
    sourceLabel: row.source_label,
    events: [...row.events]
      .sort((left, right) => left.occurred_at.localeCompare(right.occurred_at))
      .map((event) => ({
        id: event.id,
        type: event.event_type,
        title: event.title,
        description: event.description,
        occurredAt: event.occurred_at,
        materialVersion: event.material_version,
      })),
  };
}

async function publicProjectQuery() {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  return client
    .from("projects")
    .select(projectSelection)
    .eq("visibility", "PUBLIC")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
}

export async function listPublicProjects(): Promise<ProjectRecord[]> {
  if (!getSupabasePublicEnvironment()) return SEED_PROJECTS;

  const result = await publicProjectQuery();
  if (!result || result.error) {
    throw new Error(`Não foi possível carregar projetos públicos: ${result?.error?.message ?? "cliente ausente"}`);
  }

  return (result.data as unknown as RawProjectRow[]).map(mapProject);
}

export async function getPublicProjectBySlug(slug: string): Promise<ProjectRecord | null> {
  if (!getSupabasePublicEnvironment()) {
    return SEED_PROJECTS.find((project) => project.slug === slug) ?? null;
  }

  const client = await createSupabaseServerClient();
  if (!client) return null;

  const { data, error } = await client
    .from("projects")
    .select(projectSelection)
    .eq("slug", slug)
    .eq("visibility", "PUBLIC")
    .not("published_at", "is", null)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível carregar o projeto: ${error.message}`);
  return data ? mapProject(data as unknown as RawProjectRow) : null;
}
