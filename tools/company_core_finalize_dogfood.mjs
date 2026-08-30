#!/usr/bin/env node
/**
 * Company Core v0.1 — Finalize Dogfood Helper
 *
 * Accepts dogfood reference/IDs and explicit Human Evaluation via env,
 * records Evaluation and actual consequence through the same domain semantics,
 * never invents Human Direction,
 * emits one valid JSON object to stdout.
 */

import { randomUUID } from 'node:crypto';

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

const CYCLE_ID = requireEnv('DOGFOOD_CYCLE_ID');
const ACTOR_ID = env('DOGFOOD_ACTOR_ID');

const EVALUATION_VERDICT = requireEnv('EVALUATION_VERDICT');
const EVALUATION_RATIONALE = env('EVALUATION_RATIONALE', null);

const CONSEQUENCE_TYPE = requireEnv('CONSEQUENCE_TYPE');
const CONSEQUENCE_DESCRIPTION = requireEnv('CONSEQUENCE_DESCRIPTION');
const CONSEQUENCE_FOUNDER_TIME_MINUTES = env('CONSEQUENCE_FOUNDER_TIME_MINUTES', null);
const CONSEQUENCE_AI_COST_USD = env('CONSEQUENCE_AI_COST_USD', null);

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
  const actors = await supabaseSelect('actors', "id,kind");
  const match = actors?.find(a => a.kind === 'PERSON');
  if (!match) throw new Error('No PERSON actor found. Set DOGFOOD_ACTOR_ID.');
  return match.id;
}

async function main() {
  const actorId = await resolveActorId();

  // 1. Record Evaluation
  const evalResult = await supabaseRpc('company_core_record_evaluation', {
    p_actor_id: actorId,
    p_cycle_id: CYCLE_ID,
    p_verdict: EVALUATION_VERDICT,
    p_rationale: EVALUATION_RATIONALE,
    p_command_id: randomUUID(),
    p_idempotency_key: `dogfood-eval-${randomUUID()}`,
  });

  if (!evalResult?.ok) throw new Error(`Record evaluation failed: ${JSON.stringify(evalResult)}`);

  // 2. Record Consequence
  const aiCostUsd = CONSEQUENCE_AI_COST_USD ? Number(CONSEQUENCE_AI_COST_USD) : null;
  const founderTime = CONSEQUENCE_FOUNDER_TIME_MINUTES ? Number(CONSEQUENCE_FOUNDER_TIME_MINUTES) : null;

  const consResult = await supabaseRpc('company_core_record_consequence', {
    p_actor_id: actorId,
    p_cycle_id: CYCLE_ID,
    p_founder_time_minutes: founderTime,
    p_ai_cost_usd: aiCostUsd,
    p_description: CONSEQUENCE_DESCRIPTION,
    p_consequence_type: CONSEQUENCE_TYPE,
    p_command_id: randomUUID(),
    p_idempotency_key: `dogfood-consequence-${randomUUID()}`,
  });

  if (!consResult?.ok) throw new Error(`Record consequence failed: ${JSON.stringify(consResult)}`);

  const output = {
    status: 'COMPLETE',
    cycle_id: CYCLE_ID,
    state: 'CONSEQUENCE_RECORDED',
    evaluation_verdict: EVALUATION_VERDICT,
    consequence_type: CONSEQUENCE_TYPE,
    ui_path: `/company-core/${CYCLE_ID}`,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
