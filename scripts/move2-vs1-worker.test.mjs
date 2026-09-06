import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { callGateway, makePsqlExecutor, MOCK_OUTPUT, runOnce, sha256 } from "./move2-vs1-worker.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(join(here, "../supabase/migrations/20260904193000_move2_vs1_durable_sponsored_mock_job.sql"), "utf8");
const realMigration = readFileSync(join(here, "../supabase/migrations/20260905162000_habitable_v0_real_ai_job.sql"), "utf8");

function fakeExecutor({ noJob = false } = {}) {
  const calls = [];
  const bindings = [];
  const ids = { job: "10000000-0000-4000-8000-000000000001", claim: "10000000-0000-4000-8000-000000000002" };
  const execute = (sql, values = {}) => {
    calls.push(sql);
    bindings.push(values);
    if (sql.includes("move2_worker_claim")) return noJob ? "null" : JSON.stringify({ job_id: ids.job, claim_token: ids.claim, message_id: 7, provider: "MOCK" });
    if (sql.includes("move2_worker_begin_dispatch")) return JSON.stringify({ job_id: ids.job, provider: "MOCK", model: "mock-v1" });
    if (sql.includes("move2_worker_mark_uncertain")) return "t";
    if (sql.includes("move2_worker_complete_mock")) return JSON.stringify({ ai_run_id: "run", cycle_record_id: "record", completed: true, verified: false });
    throw new Error(`unexpected SQL: ${sql}`);
  };
  return { calls, bindings, execute, ids };
}

function fakeRealExecutor() {
  const calls = [];
  const bindings = [];
  const envelope = { provider: "moonshotai", model: "moonshotai/kimi-k2.6", messages: [{ role: "system", content: "s" }, { role: "user", content: "u" }], temperature: 0.3, max_tokens: 4096 };
  const canonical = JSON.stringify(envelope);
  const execute = (sql, values = {}) => {
    calls.push(sql);
    bindings.push(values);
    if (sql.includes("move2_worker_claim")) return JSON.stringify({ job_id: "10000000-0000-4000-8000-000000000001", claim_token: "10000000-0000-4000-8000-000000000002", message_id: 8, provider: "moonshotai" });
    if (sql.includes("move2_worker_begin_dispatch")) return JSON.stringify({ provider: "moonshotai", model: "moonshotai/kimi-k2.6", request_canonical: canonical, request_digest: sha256(canonical) });
    if (sql.includes("move2_worker_complete_provider")) return JSON.stringify({ completed: true, verified: false, job_state: values.actual_cost_usd === "" ? "NEEDS_RECONCILIATION" : "SUCCEEDED" });
    if (sql.includes("move2_worker_mark_uncertain") || sql.includes("move2_worker_fail_provider")) return "t";
    throw new Error(`unexpected SQL: ${sql}`);
  };
  return { calls, bindings, execute, envelope };
}

test("psql executor sends SQL through stdin and preserves variable bindings", () => {
  let invocation;
  const execute = makePsqlExecutor({
    databaseUrl: "postgresql://local/test",
    psql: "test-psql",
    spawnImpl: (command, args, options) => {
      invocation = { command, args, options };
      return { status: 0, stdout: "first\nlast\n", stderr: "" };
    },
  });

  assert.equal(execute("select :'payload'::text", { payload: "single' back\\slash" }), "last");
  assert.equal(invocation.command, "test-psql");
  assert.deepEqual(invocation.args, [
    "postgresql://local/test", "-X", "-qAt", "-v", "ON_ERROR_STOP=1",
    "-v", "payload=single' back\\slash",
  ]);
  assert.equal(invocation.args.includes("-c"), false);
  assert.deepEqual(invocation.options, {
    encoding: "utf8",
    input: "begin; set local role move2_vs1_worker; select :'payload'::text; commit;",
  });
});

test("worker is independently idle when durable queue has no message", async () => {
  const fake = fakeExecutor({ noJob: true });
  assert.deepEqual(await runOnce({ execute: fake.execute }), { status: "IDLE" });
  assert.equal(fake.calls.length, 1);
});

test("MOCK worker crosses dispatch fence once and completes attributable output", async () => {
  const fake = fakeExecutor();
  const result = await runOnce({ execute: fake.execute });
  assert.equal(result.status, "SUCCEEDED");
  assert.equal(fake.calls.filter((sql) => sql.includes("begin_dispatch")).length, 1);
  assert.equal(fake.calls.filter((sql) => sql.includes("complete_mock")).length, 1);
  assert.equal(fake.bindings.at(-1).digest, sha256(MOCK_OUTPUT));
  assert.equal(fake.bindings.at(-1).output, MOCK_OUTPUT);
});

test("interruption after dispatch fails closed for reconciliation and never completes", async () => {
  const fake = fakeExecutor();
  const result = await runOnce({ execute: fake.execute, interruptAfterDispatch: true });
  assert.equal(result.status, "NEEDS_RECONCILIATION");
  assert.equal(fake.calls.filter((sql) => sql.includes("mark_uncertain")).length, 1);
  assert.equal(fake.calls.filter((sql) => sql.includes("complete_mock")).length, 0);
});

test("migration uses PGMQ transactionally and sends only job_id", () => {
  assert.match(migration, /create extension if not exists pgmq/);
  assert.match(migration, /pgmq\.send\('move2_vs1_ai_jobs',jsonb_build_object\('job_id',v_job_id\)\)/);
  assert.doesNotMatch(migration, /pgmq_public/);
});

test("budget admission serializes on pool and counts reconciliation holds", () => {
  assert.match(migration, /sponsored_budget_pools where id=p_pool_id and cell_id=v_cell_id for update/);
  assert.match(migration, /state in \('ACTIVE','HELD_FOR_RECONCILIATION'\)/);
  assert.match(migration, /SPONSORED_BUDGET_EXHAUSTED/);
});

test("worker role is narrow and receives no table or human ANC access", () => {
  assert.match(migration, /create role move2_vs1_worker nologin noinherit/);
  assert.match(migration, /revoke all on public\.sponsored_budget_pools,public\.sponsored_budget_reservations,public\.ai_jobs from anon,authenticated,move2_vs1_worker/);
  assert.doesNotMatch(migration, /grant execute on function public\.anc001_.*move2_vs1_worker/);
  assert.doesNotMatch(migration, /grant .* on all tables .*move2_vs1_worker/i);
});

test("post-dispatch redelivery becomes reconciliation and is archived", () => {
  assert.match(migration, /v_job\.state in \('DISPATCHING','NEEDS_RECONCILIATION'\)/);
  assert.match(migration, /state='NEEDS_RECONCILIATION',failure_code='WORKER_LOST_AFTER_DISPATCH'/);
  assert.match(migration, /pgmq\.archive\('move2_vs1_ai_jobs',v_msg\.msg_id\)/);
});

test("terminal stale delivery is archived without disturbing a valid claim", () => {
  assert.match(migration, /v_job\.state in \('SUCCEEDED','FAILED','CANCELLED'\)[\s\S]*?pgmq\.archive\('move2_vs1_ai_jobs',v_msg\.msg_id\)/);
  assert.match(migration, /v_job\.state='CLAIMED' and v_job\.claim_expires_at > now\(\)\) then return null/);
});

test("moonshot worker dispatches the exact durable envelope through injection", async () => {
  const fake = fakeRealExecutor();
  let observed;
  const result = await runOnce({ execute: fake.execute, gateway: async (envelope) => {
    observed = envelope;
    return { output: " attributable output ", inputTokens: 2, outputTokens: 3, totalTokens: 5, actualCostUsd: 0.01, costSource: "PROVIDER_REPORTED" };
  } });
  assert.deepEqual(observed, fake.envelope);
  assert.equal(result.status, "SUCCEEDED");
  assert.match(fake.calls.at(-1), /move2_worker_complete_provider/);
  assert.equal(fake.bindings.at(-1).actual_cost_usd, 0.01);
});

test("provider output is a bound psql value and cannot alter SQL structure", async () => {
  const fake = fakeRealExecutor();
  const hostile = "single' back\\slash; select pg_sleep(9); -- comment /* tail */";
  await runOnce({ execute: fake.execute, gateway: async () => ({
    output: hostile, inputTokens: 1, outputTokens: 2, totalTokens: 3,
    actualCostUsd: 0.01, costSource: "PROVIDER_REPORTED",
  }) });
  const sql = fake.calls.at(-1);
  assert.match(sql, /:'output'::text/);
  assert.doesNotMatch(sql, /single|back\\slash|pg_sleep|-- comment|\/\* tail \*\//);
  assert.equal(fake.bindings.at(-1).output, hostile);
});

test("unknown provider cost preserves output for reconciliation", async () => {
  const fake = fakeRealExecutor();
  const result = await runOnce({ execute: fake.execute, gateway: async () => ({
    output: "output", inputTokens: 1, outputTokens: 1, totalTokens: 2, actualCostUsd: null, costSource: "UNKNOWN",
  }) });
  assert.equal(result.status, "NEEDS_RECONCILIATION");
  assert.match(fake.calls.at(-1), /nullif\(:'actual_cost_usd',''\)::numeric/);
  assert.equal(fake.bindings.at(-1).actual_cost_usd, "");
  assert.equal(fake.bindings.at(-1).cost_source, "UNKNOWN");
});

test("trusted actual cost above reservation is reported as reconciliation", async () => {
  const fake = fakeRealExecutor();
  const execute = (sql) => sql.includes("move2_worker_complete_provider")
    ? JSON.stringify({ completed: true, verified: false, job_state: "NEEDS_RECONCILIATION" })
    : fake.execute(sql);
  const result = await runOnce({ execute, gateway: async () => ({
    output: "observed output", inputTokens: 1, outputTokens: 2, totalTokens: 3, actualCostUsd: 9, costSource: "PROVIDER_REPORTED",
  }) });
  assert.equal(result.status, "NEEDS_RECONCILIATION");
  assert.match(fake.calls.at(-1), /move2_worker_begin_dispatch/);
});

test("ambiguous post-dispatch transport result holds for reconciliation", async () => {
  const fake = fakeRealExecutor();
  const result = await runOnce({ execute: fake.execute, gateway: async () => { throw new Error("socket lost"); } });
  assert.equal(result.status, "NEEDS_RECONCILIATION");
  assert.match(fake.calls.at(-1), /move2_worker_mark_uncertain/);
});

test("definitive provider rejection fails without fabricating output", async () => {
  const fake = fakeRealExecutor();
  const error = new Error("rejected");
  error.definitive = true;
  const result = await runOnce({ execute: fake.execute, gateway: async () => { throw error; } });
  assert.equal(result.status, "FAILED");
  assert.match(fake.calls.at(-1), /move2_worker_fail_provider/);
});

test("Gateway adapter sends only the fixed envelope and does not invent cost", async () => {
  let request;
  const result = await callGateway(fakeRealExecutor().envelope, {
    apiKey: "test-key",
    baseUrl: "http://127.0.0.1:9999/v1/",
    fetchImpl: async (url, init) => {
      request = { url, init };
      return { ok: true, json: async () => ({ choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } }) };
    },
  });
  assert.equal(request.url, "http://127.0.0.1:9999/v1/chat/completions");
  assert.deepEqual(JSON.parse(request.init.body), { model: "moonshotai/kimi-k2.6", messages: fakeRealExecutor().envelope.messages, temperature: 0.3, max_tokens: 4096 });
  assert.equal(result.actualCostUsd, null);
  assert.equal(result.costSource, "UNKNOWN");
});

test("Gateway adapter fails closed unless both canonical settings exist", async () => {
  await assert.rejects(
    callGateway(fakeRealExecutor().envelope, { apiKey: "test-key", baseUrl: "", fetchImpl: async () => assert.fail("fetch called") }),
    /AI_GATEWAY_BASE_URL is required/,
  );
  await assert.rejects(
    callGateway(fakeRealExecutor().envelope, { apiKey: "", baseUrl: "http://127.0.0.1", fetchImpl: async () => assert.fail("fetch called") }),
    /AI_GATEWAY_API_KEY is required/,
  );
});

test("real-provider migration keeps exact requests private and authorization atomic", () => {
  assert.match(realMigration, /create table private\.ai_job_inference_requests/);
  assert.match(realMigration, /envelope_canonical = envelope::text/);
  assert.match(realMigration, /revoke all on private\.ai_job_inference_requests from public, anon, authenticated, move2_vs1_worker/);
  assert.match(realMigration, /company_core_authorize_work[\s\S]*anc001_prepare_ai_run[\s\S]*pgmq\.send/);
  assert.match(realMigration, /p_actual_cost_usd is null or p_actual_cost_usd>v_res\.amount_usd/);
});
