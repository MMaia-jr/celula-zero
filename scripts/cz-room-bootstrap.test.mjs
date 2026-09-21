import test from "node:test";
import assert from "node:assert/strict";
import { classifyCandidates, discoverySql, parseDiscoveryOutput, runBootstrap } from "./cz-room-bootstrap.mjs";

const candidate = Object.freeze({
  ROOM_PROFILE_ID: "profile",
  ROOM_HUMAN_ACTOR_ID: "human",
  ROOM_AI_ACTOR_ID: "ai",
  ROOM_PROJECT_ID: "project",
  ROOM_CYCLE_ID: "cycle",
});

test("canonical relation query requires controlled active Human and AI participation", () => {
  const sql = discoverySql();
  for (const relation of ["actor_memberships", "cycle_participations", "dragon_cycles", "projects"]) assert.match(sql, new RegExp(relation));
  assert.match(sql, /human\.kind = 'PERSON'/);
  assert.match(sql, /ai\.kind = 'AI_AGENT'/);
  assert.match(sql, /ai\.operator_profile_id = hm\.profile_id/);
  assert.match(sql, /project\.steward_actor_id = human\.id/);
  assert.match(sql, /private\.can_manage_project\(project\.id, hm\.profile_id\)/);
  assert.match(sql, /cycle\.state = 'OPEN'/);
  assert.match(sql, /ended_at is null/g);
  assert.match(sql, /order by hm\.profile_id, human\.id, ai\.id, project\.id, cycle\.id/);
  assert.doesNotMatch(sql, /insert|update|delete|call\s/i);
});

test("one complete candidate becomes READY", () => {
  assert.deepEqual(classifyCandidates([candidate]), { status: "READY", context: candidate });
});

test("zero candidates fail closed", () => {
  assert.deepEqual(classifyCandidates([]), { status: "STOP", reason: "NO_ROOM_CONTEXT" });
});

test("multiple candidates fail closed without selecting the first", () => {
  const other = { ...candidate, ROOM_CYCLE_ID: "other-cycle" };
  assert.deepEqual(classifyCandidates([candidate, other]), { status: "STOP", reason: "AMBIGUOUS_ROOM_CONTEXT", count: 2 });
});

test("duplicate relational rows describe one candidate deterministically", () => {
  assert.equal(classifyCandidates([candidate, { ...candidate }]).status, "READY");
});

test("partial or malformed discovery data fails closed", () => {
  assert.deepEqual(classifyCandidates([{ ...candidate, ROOM_AI_ACTOR_ID: "" }]), { status: "STOP", reason: "INVALID_CANDIDATE" });
  assert.deepEqual(classifyCandidates(null), { status: "STOP", reason: "INVALID_DISCOVERY_RESULT" });
  assert.throws(() => parseDiscoveryOutput("not-json"), SyntaxError);
});

test("resolve-only discovers but never launches the Room", () => {
  let launches = 0;
  const result = runBootstrap({
    resolveContext: () => ({ status: "READY", context: candidate }),
    launch: () => { launches += 1; return { status: 0 }; },
    resolveOnly: true,
  });
  assert.equal(result.status, "READY");
  assert.equal(launches, 0);
});

test("normal bootstrap launches existing Room only after READY", () => {
  const calls = [];
  const result = runBootstrap({
    resolveContext: () => ({ status: "READY", context: candidate }),
    launch: (command, args, options) => { calls.push({ command, args, options }); return { status: 0 }; },
  });
  assert.equal(result.status, "READY");
  assert.equal(calls.length, 1);
  assert.match(calls[0].args[0], /cz-room\.mjs$/);
  for (const [key, value] of Object.entries(candidate)) assert.equal(calls[0].options.env[key], value);
});

test("STOP resolution never launches the Room", () => {
  let launches = 0;
  const result = runBootstrap({
    resolveContext: () => ({ status: "STOP", reason: "AMBIGUOUS_ROOM_CONTEXT", count: 2 }),
    launch: () => { launches += 1; return { status: 0 }; },
  });
  assert.equal(result.status, "STOP");
  assert.equal(launches, 0);
});
