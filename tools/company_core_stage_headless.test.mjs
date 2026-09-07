import assert from 'node:assert/strict';
import test from 'node:test';
import { RPC_ALLOWLIST, assertLocalSupabaseUrl, runStage, validateInput } from './company_core_stage_headless.mjs';

const TOKEN = 'super-secret-access-token';
const PROFILE = '10000000-0000-4000-8000-000000000001';
const ACTOR = '20000000-0000-4000-8000-000000000001';
const PROJECT = '30000000-0000-4000-8000-000000000001';
const CYCLE = '40000000-0000-4000-8000-000000000001';
const DRAGON = '50000000-0000-4000-8000-000000000001';
const NEED = '60000000-0000-4000-8000-000000000001';

function input() {
  return {
    project: { title: 'Headless private project', summary: 'A sufficiently explicit private project summary.', original_intent: 'Original human intent remains distinct and explicit.', current_interpretation: 'Current human interpretation remains separately explicit.', intended_result: 'Reach the bounded durable Agreement state.', rules_and_limits: 'No work authorization and no AI execution are permitted.', needs: ['A safe staged headless operation'], economic_regime: 'VOLUNTARY', stage: 'DRAFT' },
    need: { title: 'Define bounded internal operation', problem: 'The existing capability is not safely composable headlessly.', desired_result: 'A durable Agreement boundary with no AI work.', context: 'Local deterministic Company Core staging only.', priority: 'HIGH', constraints: 'No frontend and no remote writes.', confidentiality: 'PRIVATE local operation.' },
    agreement: { expected_result: 'Durable AGREEMENT_DEFINED state.', scope: 'Create only Project, Need, and Agreement.', exclusions: 'Work authorization, AI, ANC, Gateway, and Move2.', dependencies: 'Canonical local schema and authenticated Human token.', evaluation_criterion: 'Final readback proves Agreement and null downstream fields.', budget_boundary: 'Zero paid calls and zero model calls.', authority: 'Create through Agreement only; stop structurally.', deadline: null },
  };
}

function response(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }); }

function successfulFetch({ final = {}, actorKind = 'PERSON', membershipProfile = PROFILE } = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (path === '/auth/v1/user') return response({ id: PROFILE });
    if (path === '/rest/v1/profiles') return response([{ id: PROFILE }]);
    if (path.endsWith('/rpc/create_project_atomic')) return response([{ project_id: PROJECT, slug: 'headless-private-project' }]);
    if (path === '/rest/v1/projects') return response([{ id: PROJECT, slug: 'headless-private-project', visibility: 'PRIVATE', steward_actor_id: ACTOR, created_by_profile_id: PROFILE }]);
    if (path === '/rest/v1/actors') return response([{ id: ACTOR, kind: actorKind }]);
    if (path === '/rest/v1/actor_memberships') return response([{ actor_id: ACTOR, profile_id: membershipProfile, role: 'OWNER' }]);
    if (path.endsWith('/rpc/company_core_create_cycle')) return response({ ok: true, cycle_id: CYCLE, dragon_cycle_id: DRAGON, state: 'NEED_CREATED' });
    if (path.endsWith('/rpc/company_core_define_agreement')) return response({ ok: true, cycle_id: CYCLE, state: 'AGREEMENT_DEFINED' });
    if (path === '/rest/v1/company_core_cycles') {
      if (parsed.searchParams.get('select').includes('ai_run_id')) return response([{ id: CYCLE, project_id: PROJECT, dragon_cycle_id: DRAGON, need_id: NEED, state: 'AGREEMENT_DEFINED', ai_run_id: null, result_content: null, evaluation_verdict: null, consequence_type: null, ...final }]);
      return response([{ id: CYCLE, project_id: PROJECT, dragon_cycle_id: DRAGON, need_id: NEED, state: 'NEED_CREATED' }]);
    }
    return response({ error: `unexpected ${path}` }, 500);
  };
  return { calls, fetchImpl };
}

async function run(mock) {
  return runStage({ supabaseUrl: 'http://127.0.0.1:54321', anonKey: 'local-anon', accessToken: TOKEN, input: input(), fetchImpl: mock.fetchImpl, uuid: (() => { let n = 0; return () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`; })() });
}

test('rejects remote/non-loopback URL before any request', async () => {
  for (const url of ['https://example.supabase.co', 'http://192.168.1.2:54321', 'https://example.com']) assert.throws(() => assertLocalSupabaseUrl(url), /Refusing non-local/);
  let calls = 0;
  await assert.rejects(() => runStage({ supabaseUrl: 'https://x.supabase.co', anonKey: 'x', accessToken: TOKEN, input: input(), fetchImpl: async () => { calls++; } }), /Refusing non-local/);
  assert.equal(calls, 0);
  for (const url of ['http://localhost:54321', 'http://127.0.0.1:54321', 'http://[::1]:54321']) assert.doesNotThrow(() => assertLocalSupabaseUrl(url));
});

test('rejects every operator-supplied generated database ID', () => {
  for (const key of ['actor_id', 'actorId', 'project_id', 'projectId', 'cycle_id', 'company_core_cycle_id', 'dragon_cycle_id', 'need_id', 'ai_run_id']) {
    const value = input(); value[key] = 'not-accepted';
    assert.throws(() => validateInput(value), /database IDs are resolved internally/);
  }
});

test('verifies auth/profile, creates PRIVATE project, proves actor control, and structurally stops at Agreement', async () => {
  const mock = successfulFetch();
  const result = await run(mock);
  assert.deepEqual(result, { ok: true, stop_boundary: 'AGREEMENT_DEFINED', authenticated_profile_id: PROFILE, actor_id: ACTOR, project_id: PROJECT, project_slug: 'headless-private-project', project_visibility: 'PRIVATE', company_core_cycle_id: CYCLE, dragon_cycle_id: DRAGON, need_id: NEED, state: 'AGREEMENT_DEFINED', ai_run_id: null, implemented_system_model_calls: 0, implemented_system_paid_calls: 0, remote_supabase_writes: 0 });

  const rpcCalls = mock.calls.filter(({ url }) => new URL(url).pathname.includes('/rpc/'));
  assert.deepEqual(rpcCalls.map(({ url }) => new URL(url).pathname.split('/').at(-1)), RPC_ALLOWLIST);
  const projectBody = JSON.parse(rpcCalls[0].options.body);
  assert.equal(projectBody.p_publish, false);
  assert.equal('p_actor_id' in projectBody, false);
  assert.equal('p_project_id' in projectBody, false);
  assert.equal(JSON.parse(rpcCalls[1].options.body).p_actor_id, ACTOR);
  assert.equal(JSON.parse(rpcCalls[1].options.body).p_project_id, PROJECT);
  assert.equal(mock.calls[0].url, 'http://127.0.0.1:54321/auth/v1/user');
  assert.equal(new URL(mock.calls.find(({ url }) => url.includes('/actor_memberships?')).url).searchParams.get('profile_id'), `eq.${PROFILE}`);
  assert.equal(mock.calls.some(({ url }) => /authorize|agent|anc|gateway|move2/i.test(new URL(url).pathname)), false);
  assert.equal(JSON.stringify({ result, calls: mock.calls.map((c) => c.url) }).includes(TOKEN), false);
});

test('fails closed when authenticated profile cannot be verified', async () => {
  let calls = 0;
  await assert.rejects(() => runStage({ supabaseUrl: 'http://localhost:54321', anonKey: 'x', accessToken: TOKEN, input: input(), fetchImpl: async () => { calls++; return response({}); } }), /Authenticated user could not be verified/);
  assert.equal(calls, 1);
});

test('fails closed when steward is not a PERSON controlled by authenticated profile', async () => {
  await assert.rejects(() => run(successfulFetch({ actorKind: 'AI_AGENT' })), /not a PERSON/);
  await assert.rejects(() => run(successfulFetch({ membershipProfile: 'wrong-profile' })), /does not canonically control/);
});

test('fails closed on every forbidden final state or downstream artifact', async () => {
  for (const final of [{ state: 'WORK_AUTHORIZED' }, { ai_run_id: 'unexpected' }, { result_content: 'unexpected' }, { evaluation_verdict: 'USEFUL' }, { consequence_type: 'OTHER' }]) {
    await assert.rejects(() => run(successfulFetch({ final })), /Final readback/);
  }
});

test('fails closed when mutation transitions/readbacks are unexpected', async () => {
  const mock = successfulFetch();
  const original = mock.fetchImpl;
  mock.fetchImpl = async (url, options) => new URL(url).pathname.endsWith('/rpc/company_core_create_cycle')
    ? response({ ok: true, cycle_id: CYCLE, dragon_cycle_id: DRAGON, state: 'WORK_AUTHORIZED' })
    : original(url, options);
  await assert.rejects(() => run(mock), /did not reach NEED_CREATED/);
});
