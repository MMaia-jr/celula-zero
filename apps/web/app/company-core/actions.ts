"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const projectContextSchema = z.object({
  projectId: z.string().uuid(),
  projectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
});

const commandSchema = z.object({
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

const createCycleSchema = projectContextSchema
  .and(commandSchema)
  .and(
    z.object({
      needTitle: z.string().trim().min(4).max(160),
      needProblem: z.string().trim().min(10).max(4000),
      needDesiredResult: z.string().trim().min(10).max(2000),
      needContext: z.string().trim().max(2000).optional().default(""),
      needPriority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
      needConstraints: z.string().trim().max(2000).optional(),
      needConfidentiality: z.string().trim().max(1000).optional(),
    }),
  );

const defineAgreementSchema = z.object({
  cycleId: z.string().uuid(),
  expectedResult: z.string().trim().min(3).max(2000),
  scope: z.string().trim().min(3).max(2000).optional(),
  exclusions: z.string().trim().max(2000).optional(),
  dependencies: z.string().trim().max(2000).optional(),
  evaluationCriterion: z.string().trim().min(3).max(2000),
  budgetBoundary: z.string().trim().max(1000).optional(),
  authority: z.string().trim().max(2000).optional(),
  deadline: z.string().datetime().optional().or(z.literal("")),
}).and(commandSchema);

const authorizeWorkSchema = z.object({
  cycleId: z.string().uuid(),
  sponsoredPoolId: z.string().uuid(),
  reservationUsd: z.coerce.number().positive().finite(),
}).and(commandSchema);

const recordResultSchema = z.object({
  cycleId: z.string().uuid(),
  resultContent: z.string().trim().min(1).max(8000),
}).and(commandSchema);

const recordEvaluationSchema = z.object({
  cycleId: z.string().uuid(),
  verdict: z.enum(["USEFUL", "PARTIAL", "NOT_USEFUL", "INCONCLUSIVE"]),
  rationale: z.string().trim().max(2000).optional(),
}).and(commandSchema);

const recordConsequenceSchema = z.object({
  cycleId: z.string().uuid(),
  founderTimeMinutes: z.coerce.number().int().nonnegative().optional(),
  aiCostUsd: z.string().optional(),
  description: z.string().trim().min(3).max(4000),
  consequenceType: z.enum([
    "TIME_SAVED",
    "DECISION_ENABLED",
    "TASK_COMPLETED",
    "AVOIDED_COST",
    "NEW_CAPABILITY",
    "OPPORTUNITY_CREATED",
    "MONEY_SPENT",
    "MONEY_EARNED",
    "OTHER",
  ]),
}).and(commandSchema);

function projectSlugFromFormData(formData: FormData) {
  return String(formData.get("projectSlug") ?? "");
}

export async function createCompanyCoreCycleAction(formData: FormData): Promise<void> {
  const parsed = createCycleSchema.safeParse({
    projectId: formData.get("projectId"),
    projectSlug: projectSlugFromFormData(formData),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
    needTitle: formData.get("needTitle"),
    needProblem: formData.get("needProblem"),
    needDesiredResult: formData.get("needDesiredResult"),
    needContext: formData.get("needContext") ?? "",
    needPriority: formData.get("needPriority") || undefined,
    needConstraints: formData.get("needConstraints") || undefined,
    needConfidentiality: formData.get("needConfidentiality") || undefined,
  });

  if (!parsed.success) {
    redirect(`/company-core/new?error=invalid-input`);
  }

  const input = parsed.data;
  const client = await createSupabaseServerClient();
  if (!client) redirect("/company-core?error=backend-unavailable");

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) redirect(`/login?next=${encodeURIComponent("/company-core/new")}`);

  const { data: steward } = await client
    .from("actors")
    .select("id")
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!steward) redirect("/company-core?error=no-actor");

  const { data, error } = await client.rpc("company_core_create_cycle", {
    p_actor_id: steward.id,
    p_project_id: input.projectId,
    p_need_title: input.needTitle,
    p_need_problem: input.needProblem,
    p_need_desired_result: input.needDesiredResult,
    p_need_context: input.needContext,
    p_need_priority: input.needPriority ?? null,
    p_need_constraints: input.needConstraints ?? null,
    p_need_confidentiality: input.needConfidentiality ?? null,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as { ok?: boolean; cycle_id?: string; state?: string } | null;
  if (error || !result?.ok || !result.cycle_id) {
    redirect(`/company-core?error=create-failed`);
  }

  revalidatePath("/company-core");
  redirect(`/company-core/${result.cycle_id}`);
}

export async function defineAgreementAction(formData: FormData): Promise<void> {
  const parsed = defineAgreementSchema.safeParse({
    cycleId: formData.get("cycleId"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
    expectedResult: formData.get("expectedResult"),
    scope: formData.get("scope") || undefined,
    exclusions: formData.get("exclusions") || undefined,
    dependencies: formData.get("dependencies") || undefined,
    evaluationCriterion: formData.get("evaluationCriterion"),
    budgetBoundary: formData.get("budgetBoundary") || undefined,
    authority: formData.get("authority") || undefined,
    deadline: formData.get("deadline") || undefined,
  });

  if (!parsed.success) {
    const cycleId = String(formData.get("cycleId") ?? "");
    redirect(`/company-core/${cycleId}?error=invalid-agreement`);
  }

  const input = parsed.data;
  const client = await createSupabaseServerClient();
  if (!client) redirect("/company-core?error=backend-unavailable");

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) redirect(`/login?next=${encodeURIComponent(`/company-core/${input.cycleId}`)}`);

  const { data: steward } = await client
    .from("actors")
    .select("id")
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!steward) redirect("/company-core?error=no-actor");

  const deadline = input.deadline && input.deadline !== "" ? input.deadline : null;

  const { data, error } = await client.rpc("company_core_define_agreement", {
    p_actor_id: steward.id,
    p_cycle_id: input.cycleId,
    p_expected_result: input.expectedResult,
    p_scope: input.scope ?? null,
    p_exclusions: input.exclusions ?? null,
    p_dependencies: input.dependencies ?? null,
    p_evaluation_criterion: input.evaluationCriterion,
    p_budget_boundary: input.budgetBoundary ?? null,
    p_authority: input.authority ?? null,
    p_deadline: deadline,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as { ok?: boolean; cycle_id?: string; state?: string } | null;
  if (error || !result?.ok) {
    redirect(`/company-core/${input.cycleId}?error=agreement-failed`);
  }

  revalidatePath(`/company-core/${input.cycleId}`);
  redirect(`/company-core/${input.cycleId}`);
}

export async function authorizeWorkAction(formData: FormData): Promise<void> {
  const parsed = authorizeWorkSchema.safeParse({
    cycleId: formData.get("cycleId"),
    sponsoredPoolId: formData.get("sponsoredPoolId"),
    reservationUsd: formData.get("reservationUsd"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) {
    const cycleId = String(formData.get("cycleId") ?? "");
    redirect(`/company-core/${cycleId}?error=invalid-authorize`);
  }

  const input = parsed.data;
  const client = await createSupabaseServerClient();
  if (!client) redirect("/company-core?error=backend-unavailable");

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) redirect(`/login?next=${encodeURIComponent(`/company-core/${input.cycleId}`)}`);

  const { data: steward } = await client
    .from("actors")
    .select("id")
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!steward) redirect("/company-core?error=no-actor");

  const { data: cycleRow } = await client
    .from("company_core_cycles")
    .select("project_id, dragon_cycle_id, need_title, need_problem, need_desired_result, need_context, agreement_expected_result, agreement_scope, agreement_evaluation_criterion, agreement_authority")
    .eq("id", input.cycleId)
    .maybeSingle();

  if (!cycleRow) {
    redirect(`/company-core/${input.cycleId}?error=cycle-missing`);
  }

  const cycle = cycleRow as {
    project_id: string;
    dragon_cycle_id: string;
    need_title: string;
    need_problem: string;
    need_desired_result: string;
    need_context: string;
    agreement_expected_result: string;
    agreement_scope: string | null;
    agreement_evaluation_criterion: string;
    agreement_authority: string | null;
  };

  // Agent identity and active participation must exist before the atomic
  // authorization/enqueue command; neither authorizes provider execution.
  const { data: agentRow } = await client
    .from("actors")
    .select("id")
    .eq("kind", "AI_AGENT")
    .eq("operator_profile_id", authData.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let agentActorId = agentRow?.id as string | undefined;

  if (!agentActorId) {
    // Auto-register a bounded agent for the founder
    const { data: regData } = await client.rpc("t3_register_bounded_agent", {
      p_actor_id: steward.id,
      p_project_id: cycle.project_id,
      p_name: "Company Core AI",
      p_operator_label: "Célula Zero · Company Core Operator",
      p_command_id: crypto.randomUUID(),
      p_idempotency_key: `company-core-agent-${input.commandId}`,
    });
    const regResult = regData as { ok?: boolean; agent_actor_id?: string } | null;
    if (regResult?.agent_actor_id) {
      agentActorId = regResult.agent_actor_id;
    }
  }

  if (!agentActorId) {
    redirect(`/company-core/${input.cycleId}?error=no-agent`);
  }

  const contextManifest = {
    manifest_version: "cz.ai-context.v1",
    project_id: cycle.project_id,
    cycle_id: cycle.dragon_cycle_id,
    agent_actor_id: agentActorId,
    purpose: `Company Core cycle ${input.cycleId}: ${cycle.need_title}`,
    task: `Answer the company need with a bounded, actionable recommendation.`,
    cycle_records: [] as Array<Record<string, unknown>>,
    repository_files: [],
    authority: cycle.agreement_authority ?? "Assist only; no human authority is delegated.",
    prohibited_inferences: ["Decision", "Verification", "Evidence", "Human Direction"],
  };

  const canonical = JSON.stringify({
    agent_actor_id: contextManifest.agent_actor_id,
    authority: contextManifest.authority,
    cycle_id: contextManifest.cycle_id,
    cycle_records: contextManifest.cycle_records,
    manifest_version: contextManifest.manifest_version,
    prohibited_inferences: contextManifest.prohibited_inferences,
    project_id: contextManifest.project_id,
    purpose: contextManifest.purpose,
    repository_files: contextManifest.repository_files,
    task: contextManifest.task,
  });

  const prompt = buildCompanyCorePrompt(cycle);
  const companyCoreParticipationResponse = await client.rpc(
    "ddr_add_cycle_ai_participant",
    {
      p_actor_id: steward.id,
      p_cycle_id: cycle.dragon_cycle_id,
      p_ai_actor_id: agentActorId,
      p_affiliation: "ROOM",
      p_social_role: "RESEARCHER",
      p_principal_actor_id: null,
      p_mode: "ASSIST",
      p_mandate:
        "Produce one bounded attributable Company Core recommendation; no human authority is delegated.",
      p_command_id: crypto.randomUUID(),
      p_idempotency_key: `company-core-ai-participation-${crypto.randomUUID()}`,
    },
  );

  const companyCoreParticipationError =
    companyCoreParticipationResponse &&
    typeof companyCoreParticipationResponse === "object" &&
    "error" in companyCoreParticipationResponse
      ? companyCoreParticipationResponse.error
      : null;

  if (companyCoreParticipationError) {
    redirect(`/company-core/${input.cycleId}?error=ai-participation-failed`);
  }
  const inferenceEnvelope = {
    provider: "moonshotai",
    model: "moonshotai/kimi-k2.6",
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  };
  // This is the only command that grants human execution authority. The DB
  // transaction also reserves budget, persists the exact envelope and queues.
  const { data, error } = await client.rpc("company_core_authorize_and_enqueue_ai", {
    p_actor_id: steward.id,
    p_cycle_id: input.cycleId,
    p_agent_actor_id: agentActorId,
    p_pool_id: input.sponsoredPoolId,
    p_reservation_usd: input.reservationUsd,
    p_inference_envelope: inferenceEnvelope,
    p_context_manifest: contextManifest,
    p_context_manifest_canonical: canonical,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });
  const result = data as { ok?: boolean; job_id?: string } | null;
  if (error || !result?.ok || !result.job_id) {
    redirect(`/company-core/${input.cycleId}?error=authorize-enqueue-failed`);
  }

  revalidatePath(`/company-core/${input.cycleId}`);
  redirect(`/company-core/${input.cycleId}`);
}

export async function recordResultAction(formData: FormData): Promise<void> {
  const parsed = recordResultSchema.safeParse({
    cycleId: formData.get("cycleId"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
    resultContent: formData.get("resultContent"),
  });

  if (!parsed.success) {
    const cycleId = String(formData.get("cycleId") ?? "");
    redirect(`/company-core/${cycleId}?error=invalid-result`);
  }

  const input = parsed.data;
  const client = await createSupabaseServerClient();
  if (!client) redirect("/company-core?error=backend-unavailable");

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) redirect(`/login?next=${encodeURIComponent(`/company-core/${input.cycleId}`)}`);

  const { data: steward } = await client
    .from("actors")
    .select("id")
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!steward) redirect("/company-core?error=no-actor");

  const { data, error } = await client.rpc("company_core_record_result", {
    p_actor_id: steward.id,
    p_cycle_id: input.cycleId,
    p_result_content: input.resultContent,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as { ok?: boolean; cycle_id?: string; state?: string } | null;
  if (error || !result?.ok) {
    redirect(`/company-core/${input.cycleId}?error=result-failed`);
  }

  revalidatePath(`/company-core/${input.cycleId}`);
  redirect(`/company-core/${input.cycleId}`);
}

export async function recordEvaluationAction(formData: FormData): Promise<void> {
  const parsed = recordEvaluationSchema.safeParse({
    cycleId: formData.get("cycleId"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
    verdict: formData.get("verdict"),
    rationale: formData.get("rationale") || undefined,
  });

  if (!parsed.success) {
    const cycleId = String(formData.get("cycleId") ?? "");
    redirect(`/company-core/${cycleId}?error=invalid-evaluation`);
  }

  const input = parsed.data;
  const client = await createSupabaseServerClient();
  if (!client) redirect("/company-core?error=backend-unavailable");

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) redirect(`/login?next=${encodeURIComponent(`/company-core/${input.cycleId}`)}`);

  const { data: steward } = await client
    .from("actors")
    .select("id")
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!steward) redirect("/company-core?error=no-actor");

  const { data, error } = await client.rpc("company_core_record_evaluation", {
    p_actor_id: steward.id,
    p_cycle_id: input.cycleId,
    p_verdict: input.verdict,
    p_rationale: input.rationale ?? null,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as { ok?: boolean; cycle_id?: string; state?: string } | null;
  if (error || !result?.ok) {
    redirect(`/company-core/${input.cycleId}?error=evaluation-failed`);
  }

  revalidatePath(`/company-core/${input.cycleId}`);
  redirect(`/company-core/${input.cycleId}`);
}

export async function recordConsequenceAction(formData: FormData): Promise<void> {
  const parsed = recordConsequenceSchema.safeParse({
    cycleId: formData.get("cycleId"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
    founderTimeMinutes: formData.get("founderTimeMinutes") || undefined,
    aiCostUsd: formData.get("aiCostUsd") || undefined,
    description: formData.get("description"),
    consequenceType: formData.get("consequenceType"),
  });

  if (!parsed.success) {
    const cycleId = String(formData.get("cycleId") ?? "");
    redirect(`/company-core/${cycleId}?error=invalid-consequence`);
  }

  const input = parsed.data;
  const client = await createSupabaseServerClient();
  if (!client) redirect("/company-core?error=backend-unavailable");

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) redirect(`/login?next=${encodeURIComponent(`/company-core/${input.cycleId}`)}`);

  const { data: steward } = await client
    .from("actors")
    .select("id")
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!steward) redirect("/company-core?error=no-actor");

  const aiCostUsd = input.aiCostUsd && input.aiCostUsd !== "" ? Number(input.aiCostUsd) : null;

  const { data, error } = await client.rpc("company_core_record_consequence", {
    p_actor_id: steward.id,
    p_cycle_id: input.cycleId,
    p_founder_time_minutes: input.founderTimeMinutes ?? null,
    p_ai_cost_usd: aiCostUsd,
    p_description: input.description,
    p_consequence_type: input.consequenceType,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as { ok?: boolean; cycle_id?: string; state?: string } | null;
  if (error || !result?.ok) {
    redirect(`/company-core/${input.cycleId}?error=consequence-failed`);
  }

  revalidatePath(`/company-core/${input.cycleId}`);
  redirect(`/company-core/${input.cycleId}`);
}

function systemPrompt(): string {
  return `Você é um assistente de análise econômica operacional para Célula Zero.
Suas respostas devem ser:
- Acionáveis e concretas
- Baseadas apenas no contexto fornecido
- Acompanhadas de pressupostos explícitos
- Limitadas ao escopo da pergunta

Você NÃO é uma autoridade humana, não toma decisões e não produz evidência verificada automaticamente.
Sua saída é uma contribuição de IA atribuível, sujeita à avaliação humana.`;
}

function buildCompanyCorePrompt(cycle: {
  need_title: string;
  need_problem: string;
  need_desired_result: string;
  need_context: string;
  agreement_expected_result: string;
  agreement_scope: string | null;
  agreement_evaluation_criterion: string;
  agreement_authority: string | null;
}): string {
  const parts = [
    `# Need: ${cycle.need_title}`,
    ``,
    `## Problema`,
    cycle.need_problem,
    ``,
    `## Resultado desejado`,
    cycle.need_desired_result,
    ``,
    `## Contexto`,
    cycle.need_context || "Nenhum contexto adicional fornecido.",
    ``,
    `# Acordo de trabalho`,
    ``,
    `## Resultado esperado`,
    cycle.agreement_expected_result,
    ``,
  ];

  if (cycle.agreement_scope) {
    parts.push(`## Escopo`, cycle.agreement_scope, ``);
  }

  parts.push(
    `## Critério de avaliação`,
    cycle.agreement_evaluation_criterion,
    ``,
    `## Instrução`,
    `Responda à Need com uma recomendação acionável que inclua:`,
    `- Uma ação principal concreta`,
    `- Benefício esperado`,
    `- Pressupostos explícitos`,
    `- Custo/esforço estimado`,
    `- Teste barato para validar`,
    `- Falsificador (o que tornaria a recomendação inválida)`,
    `- Primeiro passo imediato`,
    ``,
    `A resposta deve permitir ao fundador aceitar, rejeitar ou modificar a próxima ação sem precisar de outra rodada de arquitetura.`,
  );

  return parts.join("\n");
}
