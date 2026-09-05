import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CompanyCoreState =
  | "NEED_CREATED"
  | "AGREEMENT_DEFINED"
  | "WORK_AUTHORIZED"
  | "AI_RUNNING"
  | "AI_COMPLETED"
  | "AI_FAILED"
  | "RESULT_RECORDED"
  | "EVALUATION_RECORDED"
  | "CONSEQUENCE_RECORDED"
  | "CLOSED";

export interface CompanyCoreCycle {
  id: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  dragonCycleId: string;
  ownerActorId: string;
  ownerActorName: string;
  state: CompanyCoreState;
  createdAt: string;
  updatedAt: string;

  needTitle: string;
  needProblem: string;
  needDesiredResult: string;
  needContext: string;
  needPriority: string | null;
  needConstraints: string | null;
  needConfidentiality: string | null;

  agreementExpectedResult: string | null;
  agreementScope: string | null;
  agreementExclusions: string | null;
  agreementDependencies: string | null;
  agreementEvaluationCriterion: string | null;
  agreementBudgetBoundary: string | null;
  agreementAuthority: string | null;
  agreementDeadline: string | null;

  aiRunId: string | null;
  aiRunProvider: string | null;
  aiRunModel: string | null;
  aiRunState: string | null;
  aiRunOutput: string | null;
  aiRunInputTokens: number | null;
  aiRunOutputTokens: number | null;
  aiRunTotalTokens: number | null;
  aiRunCostUsd: number | null;
  aiRunCostSource: string | null;
  aiRunStartedAt: string | null;
  aiRunCompletedAt: string | null;

  resultContent: string | null;
  resultRecordedAt: string | null;

  evaluationVerdict: string | null;
  evaluationRationale: string | null;
  evaluationRecordedAt: string | null;

  consequenceFounderTimeMinutes: number | null;
  consequenceAiCostUsd: number | null;
  consequenceDescription: string | null;
  consequenceType: string | null;
  consequenceRecordedAt: string | null;
}

export interface SponsoredBudgetPoolOption {
  id: string;
  name: string;
  hardLimitUsd: number;
  settledUsd: number;
}

export interface AiJobOperationalStatus {
  state: string;
  failureCode: string | null;
}

const selection = `
  id,
  project_id,
  dragon_cycle_id,
  owner_actor_id,
  state,
  created_at,
  updated_at,
  need_title,
  need_problem,
  need_desired_result,
  need_context,
  need_priority,
  need_constraints,
  need_confidentiality,
  agreement_expected_result,
  agreement_scope,
  agreement_exclusions,
  agreement_dependencies,
  agreement_evaluation_criterion,
  agreement_budget_boundary,
  agreement_authority,
  agreement_deadline,
  ai_run_id,
  result_content,
  result_recorded_at,
  evaluation_verdict,
  evaluation_rationale,
  evaluation_recorded_at,
  consequence_founder_time_minutes,
  consequence_ai_cost_usd,
  consequence_description,
  consequence_type,
  consequence_recorded_at,
  projects:projects!company_core_cycles_project_id_fkey(id, slug, title),
  owner:actors!company_core_cycles_owner_actor_id_fkey(id, name),
  ai_run:ai_runs!company_core_cycles_ai_run_id_fkey(
    provider, model, state, output_uri,
    input_tokens, output_tokens, total_tokens,
    cost_usd, cost_source, started_at, completed_at
  )
`;

function mapCycle(row: Record<string, unknown>): CompanyCoreCycle | null {
  const project = row.projects as { id: string; slug: string; title: string } | null;
  const owner = row.owner as { id: string; name: string } | null;
  const aiRun = row.ai_run as {
    provider: string | null;
    model: string | null;
    state: string | null;
    output_uri: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
    cost_usd: number | null;
    cost_source: string | null;
    started_at: string | null;
    completed_at: string | null;
  } | null;

  if (!project || !owner) return null;

  // output_uri is like urn:cz:ai-output:sha256:... ; the actual output is stored in cycle_record content
  // For display purposes, we can't easily fetch the cycle_record here without another query,
  // but the dogfood/UI can fetch it separately if needed.

  return {
    id: String(row.id),
    projectId: project.id,
    projectSlug: project.slug,
    projectTitle: project.title,
    dragonCycleId: String(row.dragon_cycle_id),
    ownerActorId: owner.id,
    ownerActorName: owner.name,
    state: String(row.state) as CompanyCoreState,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),

    needTitle: String(row.need_title),
    needProblem: String(row.need_problem),
    needDesiredResult: String(row.need_desired_result),
    needContext: String(row.need_context),
    needPriority: row.need_priority ? String(row.need_priority) : null,
    needConstraints: row.need_constraints ? String(row.need_constraints) : null,
    needConfidentiality: row.need_confidentiality ? String(row.need_confidentiality) : null,

    agreementExpectedResult: row.agreement_expected_result ? String(row.agreement_expected_result) : null,
    agreementScope: row.agreement_scope ? String(row.agreement_scope) : null,
    agreementExclusions: row.agreement_exclusions ? String(row.agreement_exclusions) : null,
    agreementDependencies: row.agreement_dependencies ? String(row.agreement_dependencies) : null,
    agreementEvaluationCriterion: row.agreement_evaluation_criterion ? String(row.agreement_evaluation_criterion) : null,
    agreementBudgetBoundary: row.agreement_budget_boundary ? String(row.agreement_budget_boundary) : null,
    agreementAuthority: row.agreement_authority ? String(row.agreement_authority) : null,
    agreementDeadline: row.agreement_deadline ? String(row.agreement_deadline) : null,

    aiRunId: row.ai_run_id ? String(row.ai_run_id) : null,
    aiRunProvider: aiRun?.provider ?? null,
    aiRunModel: aiRun?.model ?? null,
    aiRunState: aiRun?.state ?? null,
    aiRunOutput: null, // fetched separately when needed
    aiRunInputTokens: aiRun?.input_tokens ?? null,
    aiRunOutputTokens: aiRun?.output_tokens ?? null,
    aiRunTotalTokens: aiRun?.total_tokens ?? null,
    aiRunCostUsd: aiRun?.cost_usd ?? null,
    aiRunCostSource: aiRun?.cost_source ?? null,
    aiRunStartedAt: aiRun?.started_at ?? null,
    aiRunCompletedAt: aiRun?.completed_at ?? null,

    resultContent: row.result_content ? String(row.result_content) : null,
    resultRecordedAt: row.result_recorded_at ? String(row.result_recorded_at) : null,

    evaluationVerdict: row.evaluation_verdict ? String(row.evaluation_verdict) : null,
    evaluationRationale: row.evaluation_rationale ? String(row.evaluation_rationale) : null,
    evaluationRecordedAt: row.evaluation_recorded_at ? String(row.evaluation_recorded_at) : null,

    consequenceFounderTimeMinutes: row.consequence_founder_time_minutes ? Number(row.consequence_founder_time_minutes) : null,
    consequenceAiCostUsd: row.consequence_ai_cost_usd ? Number(row.consequence_ai_cost_usd) : null,
    consequenceDescription: row.consequence_description ? String(row.consequence_description) : null,
    consequenceType: row.consequence_type ? String(row.consequence_type) : null,
    consequenceRecordedAt: row.consequence_recorded_at ? String(row.consequence_recorded_at) : null,
  };
}

export async function listCompanyCoreCycles(projectId?: string): Promise<CompanyCoreCycle[]> {
  const client = await createSupabaseServerClient();
  if (!client) return [];

  let query = client
    .from("company_core_cycles")
    .select(selection)
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Não foi possível carregar ciclos Company Core: ${error.message}`);
  }

  return ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map(mapCycle)
    .filter((item): item is CompanyCoreCycle => item !== null);
}

export async function getCompanyCoreCycle(cycleId: string): Promise<CompanyCoreCycle | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  const { data, error } = await client
    .from("company_core_cycles")
    .select(selection)
    .eq("id", cycleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar o ciclo Company Core: ${error.message}`);
  }

  return data ? mapCycle(data as unknown as Record<string, unknown>) : null;
}

export async function getAiRunOutput(cycleId: string): Promise<string | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  // Fetch the cycle to get ai_run_id and cycle_record_id via ai_runs
  const { data: cycleData } = await client
    .from("company_core_cycles")
    .select("ai_run_id")
    .eq("id", cycleId)
    .maybeSingle();

  const aiRunId = cycleData?.ai_run_id as string | undefined;
  if (!aiRunId) return null;

  // ai_runs.output_uri is urn:cz:ai-output:sha256:... ; the actual content is in cycle_records
  const { data: aiRun } = await client
    .from("ai_runs")
    .select("cycle_record_id")
    .eq("id", aiRunId)
    .maybeSingle();

  const cycleRecordId = aiRun?.cycle_record_id as string | undefined;
  if (!cycleRecordId) return null;

  const { data: record } = await client
    .from("cycle_records")
    .select("content")
    .eq("id", cycleRecordId)
    .maybeSingle();

  return record ? String(record.content ?? "") : null;
}

export async function getAiJobOperationalStatus(aiRunId: string): Promise<AiJobOperationalStatus | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  const { data, error } = await client
    .from("ai_jobs")
    .select("state,failure_code")
    .eq("ai_run_id", aiRunId)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível carregar o estado operacional do Job de IA: ${error.message}`);
  return data
    ? { state: String(data.state), failureCode: data.failure_code ? String(data.failure_code) : null }
    : null;
}

export async function listSponsoredBudgetPools(cellId: string): Promise<SponsoredBudgetPoolOption[]> {
  const client = await createSupabaseServerClient();
  if (!client) return [];
  const { data, error } = await client
    .from("sponsored_budget_pools")
    .select("id,name,hard_limit_usd,settled_usd")
    .eq("cell_id", cellId)
    .order("name", { ascending: true });
  if (error) throw new Error(`Não foi possível carregar fundos patrocinados: ${error.message}`);
  return (data ?? []).map((pool) => ({
    id: String(pool.id),
    name: String(pool.name),
    hardLimitUsd: Number(pool.hard_limit_usd),
    settledUsd: Number(pool.settled_usd),
  }));
}
