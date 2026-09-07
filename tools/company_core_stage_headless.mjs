#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const RPC_ALLOWLIST = Object.freeze([
  'create_project_atomic',
  'company_core_create_cycle',
  'company_core_define_agreement',
]);

const FORBIDDEN_INPUT_KEYS = new Set([
  'actor_id', 'actorid', 'project_id', 'projectid', 'cycle_id', 'cycleid',
  'company_core_cycle_id', 'companycorecycleid', 'dragon_cycle_id', 'dragoncycleid',
  'need_id', 'needid', 'ai_run_id', 'airunid',
]);

function fail(message) {
  throw new Error(message);
}

export function assertLocalSupabaseUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { fail('SUPABASE_URL must be a valid URL'); }
  const host = url.hostname.toLowerCase();
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) {
    fail('Refusing non-local SUPABASE_URL before any request');
  }
  if (!['http:', 'https:'].includes(url.protocol)) fail('SUPABASE_URL must use HTTP(S)');
  return url.href.replace(/\/$/, '');
}

function assertNoOperatorIds(value, path = 'input') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.replaceAll('-', '_').toLowerCase();
    if (FORBIDDEN_INPUT_KEYS.has(normalized)) fail(`${path}.${key} is not accepted; database IDs are resolved internally`);
    assertNoOperatorIds(child, `${path}.${key}`);
  }
}

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
  return value;
}

function text(value, name, { optional = false } = {}) {
  if (value == null && optional) return null;
  if (typeof value !== 'string' || !value.trim()) fail(`${name} must be a non-empty string`);
  return value.trim();
}

function optionalText(value, name) {
  return value == null || value === '' ? null : text(value, name);
}

function slugify(value) {
  const slug = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 63).replace(/-$/g, '');
  if (!slug) fail('project.title cannot produce a valid slug; provide project.slug_base');
  return slug;
}

export function validateInput(raw) {
  assertNoOperatorIds(raw);
  const root = object(raw, 'input');
  const project = object(root.project, 'project');
  const need = object(root.need, 'need');
  const agreement = object(root.agreement, 'agreement');
  if (!Array.isArray(project.needs) || project.needs.length === 0 || project.needs.some((v) => typeof v !== 'string' || !v.trim())) {
    fail('project.needs must be a non-empty array of non-empty strings');
  }
  const title = text(project.title, 'project.title');
  return {
    project: {
      title,
      slugBase: project.slug_base == null ? slugify(title) : text(project.slug_base, 'project.slug_base'),
      summary: text(project.summary, 'project.summary'),
      originalIntent: text(project.original_intent, 'project.original_intent'),
      currentInterpretation: text(project.current_interpretation, 'project.current_interpretation'),
      intendedResult: text(project.intended_result, 'project.intended_result'),
      rulesAndLimits: text(project.rules_and_limits, 'project.rules_and_limits'),
      needs: project.needs.map((v) => v.trim()),
      economicRegime: text(project.economic_regime, 'project.economic_regime'),
      stage: text(project.stage, 'project.stage'),
    },
    need: {
      title: text(need.title, 'need.title'),
      problem: text(need.problem, 'need.problem'),
      desiredResult: text(need.desired_result, 'need.desired_result'),
      context: text(need.context, 'need.context'),
      priority: optionalText(need.priority, 'need.priority'),
      constraints: optionalText(need.constraints, 'need.constraints'),
      confidentiality: optionalText(need.confidentiality, 'need.confidentiality'),
    },
    agreement: {
      expectedResult: text(agreement.expected_result, 'agreement.expected_result'),
      scope: text(agreement.scope, 'agreement.scope'),
      exclusions: text(agreement.exclusions, 'agreement.exclusions'),
      dependencies: text(agreement.dependencies, 'agreement.dependencies'),
      evaluationCriterion: text(agreement.evaluation_criterion, 'agreement.evaluation_criterion'),
      budgetBoundary: text(agreement.budget_boundary, 'agreement.budget_boundary'),
      authority: text(agreement.authority, 'agreement.authority'),
      deadline: optionalText(agreement.deadline, 'agreement.deadline'),
    },
  };
}

function one(data, label) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) fail(`${label} was not returned/readable`);
  return row;
}

export async function runStage({ supabaseUrl, anonKey, accessToken, input, fetchImpl = fetch, uuid = randomUUID }) {
  const baseUrl = assertLocalSupabaseUrl(supabaseUrl);
  if (!anonKey?.trim()) fail('SUPABASE_ANON_KEY is required');
  if (!accessToken?.trim()) fail('SUPABASE_ACCESS_TOKEN is required');
  const values = validateInput(input);
  const headers = { apikey: anonKey.trim(), Authorization: `Bearer ${accessToken.trim()}` };

  async function request(path, options = {}) {
    const response = await fetchImpl(`${baseUrl}${path}`, { ...options, headers: { ...headers, ...options.headers } });
    const data = await response.json().catch(() => null);
    if (!response.ok) fail(`Local Supabase request failed (${response.status}) at ${path.split('?')[0]}: ${JSON.stringify(data)}`);
    return data;
  }
  async function select(table, columns, filters) {
    const params = new URLSearchParams({ select: columns, ...filters });
    return request(`/rest/v1/${table}?${params}`);
  }
  async function rpc(name, params) {
    if (!RPC_ALLOWLIST.includes(name)) fail(`RPC is not allowlisted: ${name}`);
    return request(`/rest/v1/rpc/${name}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(params),
    });
  }

  const authUser = await request('/auth/v1/user');
  const profileId = authUser?.id;
  if (!profileId) fail('Authenticated user could not be verified');
  const profile = one(await select('profiles', 'id', { id: `eq.${profileId}` }), 'authenticated profile');
  if (profile.id !== profileId) fail('Authenticated profile mismatch');

  const created = one(await rpc('create_project_atomic', {
    p_title: values.project.title, p_slug_base: values.project.slugBase, p_summary: values.project.summary,
    p_original_intent: values.project.originalIntent, p_current_intent: values.project.currentInterpretation,
    p_intended_result: values.project.intendedResult, p_rules_and_limits: values.project.rulesAndLimits,
    p_needs: values.project.needs, p_economic_regime: values.project.economicRegime, p_stage: values.project.stage,
    p_publish: false,
  }), 'created project');
  if (!created.project_id || !created.slug) fail('Project RPC returned no project identity');

  const project = one(await select('projects', 'id,slug,visibility,steward_actor_id,created_by_profile_id', { id: `eq.${created.project_id}` }), 'created project readback');
  if (project.id !== created.project_id || project.slug !== created.slug || project.visibility !== 'PRIVATE') fail('Created project readback is not the expected PRIVATE project');
  if (project.created_by_profile_id !== profileId || !project.steward_actor_id) fail('Project attribution to authenticated profile/steward is not established');
  const actor = one(await select('actors', 'id,kind', { id: `eq.${project.steward_actor_id}` }), 'steward actor');
  if (actor.id !== project.steward_actor_id || actor.kind !== 'PERSON') fail('Project steward is not a PERSON actor');
  const membership = one(await select('actor_memberships', 'actor_id,profile_id,role', {
    actor_id: `eq.${actor.id}`, profile_id: `eq.${profileId}`, role: 'in.(OWNER,OPERATOR,REPRESENTATIVE)',
  }), 'authenticated actor control');
  if (membership.actor_id !== actor.id || membership.profile_id !== profileId || !['OWNER', 'OPERATOR', 'REPRESENTATIVE'].includes(membership.role)) fail('Authenticated profile does not canonically control steward actor');

  const createCycle = await rpc('company_core_create_cycle', {
    p_actor_id: actor.id, p_project_id: project.id, p_need_title: values.need.title,
    p_need_problem: values.need.problem, p_need_desired_result: values.need.desiredResult,
    p_need_context: values.need.context, p_need_priority: values.need.priority,
    p_need_constraints: values.need.constraints, p_need_confidentiality: values.need.confidentiality,
    p_command_id: uuid(), p_idempotency_key: `company-core-stage-create-${uuid()}`,
  });
  if (!createCycle?.ok || !createCycle.cycle_id || !createCycle.dragon_cycle_id || createCycle.state !== 'NEED_CREATED') fail('Company Core create-cycle did not reach NEED_CREATED');
  const needReadback = one(await select('company_core_cycles', 'id,project_id,dragon_cycle_id,need_id,state', { id: `eq.${createCycle.cycle_id}` }), 'NEED_CREATED readback');
  if (needReadback.project_id !== project.id || needReadback.dragon_cycle_id !== createCycle.dragon_cycle_id || needReadback.state !== 'NEED_CREATED') fail('NEED_CREATED readback linkage/state mismatch');

  const agreement = await rpc('company_core_define_agreement', {
    p_actor_id: actor.id, p_cycle_id: createCycle.cycle_id, p_expected_result: values.agreement.expectedResult,
    p_scope: values.agreement.scope, p_exclusions: values.agreement.exclusions, p_dependencies: values.agreement.dependencies,
    p_evaluation_criterion: values.agreement.evaluationCriterion, p_budget_boundary: values.agreement.budgetBoundary,
    p_authority: values.agreement.authority, p_deadline: values.agreement.deadline,
    p_command_id: uuid(), p_idempotency_key: `company-core-stage-agreement-${uuid()}`,
  });
  if (!agreement?.ok || agreement.cycle_id !== createCycle.cycle_id || agreement.state !== 'AGREEMENT_DEFINED') fail('Agreement did not reach AGREEMENT_DEFINED');

  const final = one(await select('company_core_cycles', 'id,project_id,dragon_cycle_id,need_id,state,ai_run_id,result_content,evaluation_verdict,consequence_type', { id: `eq.${createCycle.cycle_id}` }), 'final Agreement readback');
  if (final.id !== createCycle.cycle_id || final.project_id !== project.id || final.dragon_cycle_id !== createCycle.dragon_cycle_id || final.state !== 'AGREEMENT_DEFINED') fail('Final readback is not the expected AGREEMENT_DEFINED cycle');
  for (const key of ['ai_run_id', 'result_content', 'evaluation_verdict', 'consequence_type']) {
    if (final[key] !== null) fail(`Final readback failed closed: ${key} must be null`);
  }

  return {
    ok: true, stop_boundary: 'AGREEMENT_DEFINED', authenticated_profile_id: profileId,
    actor_id: actor.id, project_id: project.id, project_slug: project.slug,
    project_visibility: project.visibility, company_core_cycle_id: final.id,
    dragon_cycle_id: final.dragon_cycle_id, need_id: final.need_id ?? null, state: final.state,
    ai_run_id: null, implemented_system_model_calls: 0, implemented_system_paid_calls: 0,
    remote_supabase_writes: 0,
  };
}

async function readStdin() {
  let body = '';
  for await (const chunk of process.stdin) body += chunk;
  if (!body.trim()) fail('Expected one JSON object on stdin');
  try { return JSON.parse(body); } catch { fail('stdin must contain valid JSON'); }
}

async function main() {
  const output = await runStage({
    supabaseUrl: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    accessToken: process.env.SUPABASE_ACCESS_TOKEN,
    input: await readStdin(),
  });
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
