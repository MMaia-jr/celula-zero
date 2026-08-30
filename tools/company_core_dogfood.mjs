#!/usr/bin/env node
/**
 * Company Core v0.1 — Dogfood Helper
 *
 * Accepts real Need fields through environment variables,
 * creates a Company Core cycle, defines agreement,
 * executes ONE real Kimi call through Vercel AI Gateway,
 * preserves attributable run/result lineage,
 * and stops BEFORE fabricating Human Evaluation.
 *
 * Emits one valid JSON object to stdout.
 */

import { createHash, randomUUID } from 'node:crypto';

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function env(name, defaultValue = null) {
  return process.env[name]?.trim() ?? defaultValue;
}

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = requireEnv('SUPABASE_ANON_KEY');
const ACCESS_TOKEN = requireEnv('SUPABASE_ACCESS_TOKEN');

const PROJECT_ID = requireEnv('DOGFOOD_PROJECT_ID');
const ACTOR_ID = env('DOGFOOD_ACTOR_ID');

const NEED_TITLE = requireEnv('NEED_TITLE');
const NEED_PROBLEM = requireEnv('NEED_PROBLEM');
const NEED_DESIRED_RESULT = requireEnv('NEED_DESIRED_RESULT');
const NEED_CONTEXT = env('NEED_CONTEXT', '');
const NEED_PRIORITY = env('NEED_PRIORITY', null);
const NEED_CONSTRAINTS = env('NEED_CONSTRAINTS', null);
const NEED_CONFIDENTIALITY = env('NEED_CONFIDENTIALITY', null);

const AGREEMENT_EXPECTED_RESULT = requireEnv('AGREEMENT_EXPECTED_RESULT');
const AGREEMENT_SCOPE = env('AGREEMENT_SCOPE', null);
const AGREEMENT_EVALUATION_CRITERION = requireEnv('AGREEMENT_EVALUATION_CRITERION');
const AGREEMENT_AUTHORITY = env('AGREEMENT_AUTHORITY', null);

const GATEWAY_BASE_URL = env('AI_GATEWAY_BASE_URL', null);
const GATEWAY_API_KEY = env('AI_GATEWAY_API_KEY', null);

async function supabaseRpc(functionName, params) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`RPC ${functionName} failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function supabaseSelect(table, query, single = false) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (query) url.searchParams.set('select', query);
  const response = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Select ${table} failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return single ? (Array.isArray(data) ? data[0] : data) : data;
}

async function resolveActorId() {
  if (ACTOR_ID) return ACTOR_ID;
  const actors = await supabaseSelect(
    'actors',
    "id,kind",
  );
  const match = actors?.find(a => a.kind === 'PERSON');
  if (!match) throw new Error('No PERSON actor found. Set DOGFOOD_ACTOR_ID.');
  return match.id;
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function callAiGateway(messages) {
  if (!GATEWAY_BASE_URL || !GATEWAY_API_KEY) {
    return {
      ok: false,
      output: '',
      model: 'moonshotai/kimi-k2.6',
      provider: 'moonshotai',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      costUsd: null,
      costSource: 'UNKNOWN',
      failureCode: 'AI_GATEWAY_NOT_CONFIGURED',
    };
  }

  const startedAt = new Date().toISOString();
  const response = await fetch(`${GATEWAY_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GATEWAY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'moonshotai/kimi-k2.6',
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  const completedAt = new Date().toISOString();

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown');
    return {
      ok: false,
      output: '',
      model: 'moonshotai/kimi-k2.6',
      provider: 'moonshotai',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      costUsd: null,
      costSource: 'UNKNOWN',
      startedAt,
      completedAt,
      failureCode: `GATEWAY_HTTP_${response.status}`,
    };
  }

  const raw = await response.json();
  const output = raw.choices?.[0]?.message?.content?.trim() ?? '';
  const usage = {
    promptTokens: raw.usage?.prompt_tokens ?? 0,
    completionTokens: raw.usage?.completion_tokens ?? 0,
    totalTokens: raw.usage?.total_tokens ?? 0,
  };

  const inputRate = 0.000_002;
  const outputRate = 0.000_008;
  const calculatedCost = Number((usage.promptTokens * inputRate + usage.completionTokens * outputRate).toFixed(10));

  return {
    ok: true,
    output,
    model: raw.model ?? 'moonshotai/kimi-k2.6',
    provider: 'moonshotai',
    usage,
    costUsd: calculatedCost,
    costSource: 'CALCULATED',
    startedAt,
    completedAt,
  };
}

function buildPrompt(need, agreement) {
  return [
    `# Need: ${need.title}`,
    ``,
    `## Problema`,
    need.problem,
    ``,
    `## Resultado desejado`,
    need.desiredResult,
    ``,
    `## Contexto`,
    need.context || 'Nenhum contexto adicional fornecido.',
    ``,
    `# Acordo de trabalho`,
    ``,
    `## Resultado esperado`,
    agreement.expectedResult,
    ``,
    agreement.scope ? `## Escopo\n${agreement.scope}\n` : '',
    `## Critério de avaliação`,
    agreement.evaluationCriterion,
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
  ].join('\n');
}

async function main() {
  const actorId = await resolveActorId();

  // 1. Create cycle
  const createResult = await supabaseRpc('company_core_create_cycle', {
    p_actor_id: actorId,
    p_project_id: PROJECT_ID,
    p_need_title: NEED_TITLE,
    p_need_problem: NEED_PROBLEM,
    p_need_desired_result: NEED_DESIRED_RESULT,
    p_need_context: NEED_CONTEXT,
    p_need_priority: NEED_PRIORITY,
    p_need_constraints: NEED_CONSTRAINTS,
    p_need_confidentiality: NEED_CONFIDENTIALITY,
    p_command_id: randomUUID(),
    p_idempotency_key: `dogfood-create-${randomUUID()}`,
  });

  if (!createResult?.ok) throw new Error(`Create cycle failed: ${JSON.stringify(createResult)}`);
  const cycleId = createResult.cycle_id;
  const dragonCycleId = createResult.dragon_cycle_id;

  // 2. Define agreement
  const agreementResult = await supabaseRpc('company_core_define_agreement', {
    p_actor_id: actorId,
    p_cycle_id: cycleId,
    p_expected_result: AGREEMENT_EXPECTED_RESULT,
    p_scope: AGREEMENT_SCOPE,
    p_exclusions: null,
    p_dependencies: null,
    p_evaluation_criterion: AGREEMENT_EVALUATION_CRITERION,
    p_budget_boundary: null,
    p_authority: AGREEMENT_AUTHORITY,
    p_deadline: null,
    p_command_id: randomUUID(),
    p_idempotency_key: `dogfood-agreement-${randomUUID()}`,
  });

  if (!agreementResult?.ok) throw new Error(`Define agreement failed: ${JSON.stringify(agreementResult)}`);

  // 3. Authorize work
  const authResult = await supabaseRpc('company_core_authorize_work', {
    p_actor_id: actorId,
    p_cycle_id: cycleId,
    p_command_id: randomUUID(),
    p_idempotency_key: `dogfood-auth-${randomUUID()}`,
  });

  if (!authResult?.ok) throw new Error(`Authorize work failed: ${JSON.stringify(authResult)}`);

  // 4. Find or register AI agent
  let agentActorId = null;
  const agents = await supabaseSelect('actors', "id,kind");
  const existingAgent = agents?.find(a => a.kind === 'AI_AGENT');
  if (existingAgent) {
    agentActorId = existingAgent.id;
  } else {
    const regResult = await supabaseRpc('t3_register_bounded_agent', {
      p_actor_id: actorId,
      p_project_id: PROJECT_ID,
      p_name: 'Company Core AI',
      p_operator_label: 'Célula Zero · Company Core Operator',
      p_command_id: randomUUID(),
      p_idempotency_key: `dogfood-agent-${randomUUID()}`,
    });
    if (regResult?.agent_actor_id) agentActorId = regResult.agent_actor_id;
  }

  if (!agentActorId) throw new Error('No AI agent available');

  // 5. Build context manifest and prompt
  const contextManifest = {
    manifest_version: 'cz.ai-context.v1',
    project_id: PROJECT_ID,
    cycle_id: dragonCycleId,
    agent_actor_id: agentActorId,
    purpose: `Company Core cycle ${cycleId}: ${NEED_TITLE}`,
    task: 'Answer the company need with a bounded, actionable recommendation.',
    cycle_records: [],
    repository_files: [],
    authority: AGREEMENT_AUTHORITY ?? 'Assist only; no human authority is delegated.',
    prohibited_inferences: ['Decision', 'Verification', 'Evidence', 'Human Direction'],
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

  const contextDigest = sha256(canonical);
  const prompt = buildPrompt(
    { title: NEED_TITLE, problem: NEED_PROBLEM, desiredResult: NEED_DESIRED_RESULT, context: NEED_CONTEXT },
    { expectedResult: AGREEMENT_EXPECTED_RESULT, scope: AGREEMENT_SCOPE, evaluationCriterion: AGREEMENT_EVALUATION_CRITERION },
  );
  const inputDigest = sha256(prompt);

  // 6. Prepare AI run
  const companyCoreParticipationResponse = await supabaseRpc(
    "ddr_add_cycle_ai_participant",
    {
      p_actor_id: actorId,
      p_cycle_id: dragonCycleId,
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
    throw new Error(
      `AI cycle participation failed: ${String(companyCoreParticipationError)}`,
    );
  }

  const prepResult = await supabaseRpc('anc001_prepare_ai_run', {
    p_requester_actor_id: actorId,
    p_project_id: PROJECT_ID,
    p_cycle_id: dragonCycleId,
    p_agent_actor_id: agentActorId,
    p_purpose: contextManifest.purpose,
    p_provider: 'moonshotai',
    p_model: 'moonshotai/kimi-k2.6',
    p_context_manifest: contextManifest,
    p_context_manifest_canonical: canonical,
p_input_digest: inputDigest,
    p_command_id: randomUUID(),
    p_idempotency_key: `dogfood-prep-${randomUUID()}`,
  });

  if (!prepResult?.ok || !prepResult.ai_run_id) throw new Error(`AI prepare failed: ${JSON.stringify(prepResult)}`);
  const aiRunId = prepResult.ai_run_id;

  // 7. Start AI run
  const startResult = await supabaseRpc('anc001_start_ai_run', {
    p_requester_actor_id: actorId,
    p_ai_run_id: aiRunId,
    p_command_id: randomUUID(),
    p_idempotency_key: `dogfood-start-${randomUUID()}`,
  });

  if (!startResult?.ok) throw new Error(`AI start failed: ${JSON.stringify(startResult)}`);

  // 8. Call AI Gateway
  const systemPrompt = `Você é um assistente de análise econômica operacional para Célula Zero.
Suas respostas devem ser acionáveis, concretas, baseadas apenas no contexto fornecido,
acompanyadas de pressupostos explícitos e limitadas ao escopo da pergunta.
Você NÃO é uma autoridade humana, não toma decisões e não produz evidência verificada automaticamente.`;

  const gatewayResult = await callAiGateway([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]);

  // 9. Complete or fail AI run
  if (!gatewayResult.ok) {
    await supabaseRpc('anc001_fail_ai_run', {
      p_requester_actor_id: actorId,
      p_ai_run_id: aiRunId,
      p_failure_code: gatewayResult.failureCode ?? 'GATEWAY_FAILURE',
      p_command_id: randomUUID(),
      p_idempotency_key: `dogfood-fail-${randomUUID()}`,
    });

    await supabaseRpc('company_core_attach_ai_run', {
      p_actor_id: actorId,
      p_cycle_id: cycleId,
      p_ai_run_id: aiRunId,
      p_command_id: randomUUID(),
      p_idempotency_key: `dogfood-attach-fail-${randomUUID()}`,
    });

    const output = {
      status: 'AWAITING_HUMAN_EVALUATION',
      cycle_id: cycleId,
      dragon_cycle_id: dragonCycleId,
      ai_run_id: aiRunId,
      ai_output: '',
      usage: gatewayResult.usage,
      cost_usd: gatewayResult.costUsd,
      cost_source: gatewayResult.costSource,
      ui_path: `/company-core/${cycleId}`,
      gateway_error: gatewayResult.failureCode,
    };
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    process.exitCode = 2;
    return;
  }

  const outputDigest = sha256(gatewayResult.output);
  const outputSizeBytes = Buffer.byteLength(gatewayResult.output, 'utf8');

  const completeResult = await supabaseRpc('anc001_complete_ai_run', {
      p_content_class: "SYNTHESIS",
    p_requester_actor_id: actorId,
    p_ai_run_id: aiRunId,
    p_output: gatewayResult.output,
    p_output_digest: outputDigest,
    p_output_size_bytes: outputSizeBytes,
    p_input_tokens: Number(gatewayResult.usage.promptTokens),
    p_output_tokens: Number(gatewayResult.usage.completionTokens),
    p_total_tokens: Number(gatewayResult.usage.totalTokens),
    p_cost_usd: null,
    p_cost_source: "UNKNOWN",
    p_command_id: randomUUID(),
    p_idempotency_key: `dogfood-complete-${randomUUID()}`,
  });

  if (!completeResult?.ok) {
    await supabaseRpc('anc001_fail_ai_run', {
      p_requester_actor_id: actorId,
      p_ai_run_id: aiRunId,
      p_failure_code: 'ANC_COMPLETE_FAILED',
      p_command_id: randomUUID(),
      p_idempotency_key: `dogfood-fail-complete-${randomUUID()}`,
    });

    await supabaseRpc('company_core_attach_ai_run', {
      p_actor_id: actorId,
      p_cycle_id: cycleId,
      p_ai_run_id: aiRunId,
      p_command_id: randomUUID(),
      p_idempotency_key: `dogfood-attach-fail2-${randomUUID()}`,
    });

    throw new Error(`AI complete failed: ${JSON.stringify(completeResult)}`);
  }

  // 10. Attach AI run to cycle
  const attachResult = await supabaseRpc('company_core_attach_ai_run', {
    p_actor_id: actorId,
    p_cycle_id: cycleId,
    p_ai_run_id: aiRunId,
    p_command_id: randomUUID(),
    p_idempotency_key: `dogfood-attach-${randomUUID()}`,
  });

  if (!attachResult?.ok) throw new Error(`Attach AI run failed: ${JSON.stringify(attachResult)}`);

  const output = {
    status: 'AWAITING_HUMAN_EVALUATION',
    cycle_id: cycleId,
    dragon_cycle_id: dragonCycleId,
    ai_run_id: aiRunId,
    ai_output: gatewayResult.output,
    usage: {
      prompt_tokens: gatewayResult.usage.promptTokens,
      completion_tokens: gatewayResult.usage.completionTokens,
      total_tokens: gatewayResult.usage.totalTokens,
    },
    cost_usd: gatewayResult.costUsd,
    cost_source: gatewayResult.costSource,
    ui_path: `/company-core/${cycleId}`,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
