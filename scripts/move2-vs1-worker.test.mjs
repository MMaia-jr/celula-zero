import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MOCK_OUTPUT, runOnce, sha256, sqlLiteral } from "./move2-vs1-worker.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(join(here, "../supabase/migrations/20260904193000_move2_vs1_durable_sponsored_mock_job.sql"), "utf8");

function fakeExecutor({ noJob = false } = {}) {
  const calls = [];
  const ids = { job: "10000000-0000-4000-8000-000000000001", claim: "10000000-0000-4000-8000-000000000002" };
  const execute = (sql) => {
    calls.push(sql);
    if (sql.includes("move2_worker_claim")) return noJob ? "null" : JSON.stringify({ job_id: ids.job, claim_token: ids.claim, message_id: 7, provider: "MOCK" });
    if (sql.includes("move2_worker_begin_dispatch")) return JSON.stringify({ job_id: ids.job, provider: "MOCK", model: "mock-v1" });
    if (sql.includes("move2_worker_mark_uncertain")) return "t";
    if (sql.includes("move2_worker_complete_mock")) return JSON.stringify({ ai_run_id: "run", cycle_record_id: "record", completed: true, verified: false });
    throw new Error(`unexpected SQL: ${sql}`);
  };
  return { calls, execute, ids };
}

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
  assert.match(fake.calls.at(-1), new RegExp(sha256(MOCK_OUTPUT)));
  assert.match(fake.calls.at(-1), /Deterministic sponsored MOCK synthesis/);
});

test("interruption after dispatch fails closed for reconciliation and never completes", async () => {
  const fake = fakeExecutor();
  const result = await runOnce({ execute: fake.execute, interruptAfterDispatch: true });
  assert.equal(result.status, "NEEDS_RECONCILIATION");
  assert.equal(fake.calls.filter((sql) => sql.includes("mark_uncertain")).length, 1);
  assert.equal(fake.calls.filter((sql) => sql.includes("complete_mock")).length, 0);
});

test("SQL literals cannot break out into a second statement", () => {
  assert.equal(sqlLiteral("x'; select secret; --"), "'x''; select secret; --'");
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
