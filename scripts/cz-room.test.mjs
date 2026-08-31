import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildHandoffPackage, completeInferenceBeforePersist, externalResponseTemplate, humanInputNeedsConfirmation, humanState, parseAiEnvelope, portableContext, projectionSql, runOneShotCommand, sha256, sqlText, validateExternalResponse } from "./cz-room.mjs";

function projectionFixture() {
  const human = (id, content, provenance = {}) => ({ id, author_actor_id: "human", content_class: "ORIGINAL_RECORD", phase_context: "DREAMING", content, provenance, created_at: `2026-08-27T00:00:0${id}Z` });
  const ai = (id, content, contentClass = "ORIGINAL_RECORD", provenance = {}) => ({ id, author_actor_id: "ai", content_class: contentClass, phase_context: "DREAMING", content, provenance, created_at: `2026-08-27T00:00:0${id}Z` });
  return {
    canonical_state: { base: "838338300618b0b8f8d428dd78f6e7998d266a1e", boundaries: [] }, project_name: "Célula Zero",
    cycle: { id: "cycle", current_phase: "DREAMING", state: "OPEN", current_direction_record_id: null },
    human_original_records: [human("1", "Dream sustentável e contexto portátil entre modelos"), human("4", "Continuidade e portabilidade continuam abertas", { room_kind: "RESPONSE" })],
    ai_original_records: [ai("2", "Qual contexto deve sobreviver?")],
    ai_interpretations: [ai("3", "Interpretação atribuída", "INTERPRETATION", { raw_ollama_envelope: { secret: "not exported" } })],
    ai_syntheses: [], human_confirmations: [], human_responses: [{ source_record_id: "4", target_record_id: "3" }],
    record_relations: [{ id: "r", relation_type: "RESPONDS_TO", source_record_id: "4", target_record_id: "3", asserted_by_actor_id: "human", created_at: "2026-08-27T00:01:00Z" }],
    human_direction: null, bound_canonical_objects: [], open_questions: [{ id: "2", content: "Qual contexto deve sobreviver?" }], known_limitations: ["semantic fidelity partial"],
  };
}

function oneShotFixture() {
  const calls = { ai: [], records: [], relations: [], rpcs: [], transitions: [] };
  const projection = projectionFixture();
  const operations = {
    project: () => projection,
    record: (...args) => { calls.records.push(args); return "record-id"; },
    relate: (...args) => { calls.relations.push(args); },
    rpc: (...args) => { calls.rpcs.push(args); return {}; },
    transition: (...args) => { calls.transitions.push(args); },
    startAiTurn: (...args) => { calls.ai.push(args); },
  };
  return { calls, operations };
}

test("one-shot /plan persists human planning and returns without AI", async () => {
  const { calls, operations } = oneShotFixture();
  assert.equal(await runOneShotCommand("/plan validar a fronteira humana", operations), true);
  assert.equal(calls.records.length, 1);
  assert.equal(calls.records[0][2], "validar a fronteira humana");
  assert.deepEqual(calls.records[0][3], { room_kind: "PLAN_INPUT" });
  assert.equal(calls.ai.length, 0);
});

test("one-shot /status returns without a model call", async () => {
  const { calls, operations } = oneShotFixture();
  assert.equal(await runOneShotCommand("/status", operations), true);
  assert.equal(calls.ai.length, 0);
});

test("one-shot /do performs only its bounded transition and returns", async () => {
  const { calls, operations } = oneShotFixture();
  assert.equal(await runOneShotCommand("/do iniciar trabalho", operations), true);
  assert.deepEqual(calls.transitions, [["DOING", "iniciar trabalho"]]);
  assert.equal(calls.ai.length, 0);
});

test("one-shot /direction records human authority without AI and returns", async () => {
  const { calls, operations } = oneShotFixture();
  assert.equal(await runOneShotCommand("/direction preservar autoria", operations), true);
  assert.deepEqual(calls.records[0].slice(2), ["preservar autoria", { room_kind: "HUMAN_DIRECTION" }]);
  assert.equal(calls.rpcs[0][0], "ddr_set_cycle_direction");
  assert.equal(calls.transitions[0][0], "PLANNING");
  assert.equal(calls.ai.length, 0);
});

test("one-shot /ai remains the sole explicit command path to inference", async () => {
  const { calls, operations } = oneShotFixture();
  assert.equal(await runOneShotCommand("/ai", operations), true);
  assert.equal(calls.ai.length, 1);
  assert.equal(calls.ai[0][1], "4");
});

test("AI envelope keeps supported kind and text", () => {
  assert.deepEqual(parseAiEnvelope('```json\n{"kind":"QUESTION","text":"O que permanece aberto?"}\n```'), {
    kind: "QUESTION", text: "O que permanece aberto?",
  });
});

test("arbitrary human text is encoded rather than interpolated as SQL", () => {
  const encoded = sqlText("sonho d'água");
  assert.ok(!encoded.includes("sonho"));
  assert.match(encoded, /^convert_from\(decode\('[A-Za-z0-9+/=]+'/);
});

test("projection explicitly contains every required context class", () => {
  const sql = projectionSql("2aaaa2d1-4c5c-4a9d-8fea-b377c6be498e");
  for (const key of ["canonical_state", "human_original_records", "ai_interpretations", "ai_syntheses", "human_confirmations", "human_responses", "human_direction", "bound_canonical_objects", "open_questions", "known_limitations"]) assert.ok(sql.includes(`'${key}'`), key);
});

test("human state is short and does not expose ontology", () => {
  const text = humanState({ project_name: "Célula Zero", cycle: { current_phase: "DREAMING", state: "OPEN" }, human_direction: null, human_original_records: [], ai_interpretations: [], ai_syntheses: [], open_questions: [], bound_canonical_objects: [], known_limitations: [] });
  assert.match(text, /Direção humana: ainda não adotada/);
  assert.doesNotMatch(text, /CycleRecord|T1|UUID/);
});

test("unsupported AI kind cannot become an authority class", () => {
  assert.equal(parseAiEnvelope('{"kind":"HUMAN_DIRECTION","text":"decidi"}').kind, "SYNTHESIS");
});

test("free human input requires confirmation but explicit commands do not", () => {
  assert.equal(humanInputNeedsConfirmation("um novo Dream"), true);
  assert.equal(humanInputNeedsConfirmation('cd "$HOME/projects/example"'), true);
  assert.equal(humanInputNeedsConfirmation("/quit"), false);
  assert.equal(humanInputNeedsConfirmation("   "), false);
});

test("failed or cancelled inference cannot persist partial AI output", async () => {
  let persisted = 0;
  await assert.rejects(
    completeInferenceBeforePersist(
      async () => { throw new DOMException("cancelled", "AbortError"); },
      () => { persisted += 1; },
    ),
    { name: "AbortError" },
  );
  assert.equal(persisted, 0);
});

test("completed inference persists exactly once and preserves its envelope", async () => {
  let persisted = 0;
  const envelope = { parsed: { kind: "SYNTHESIS", text: "resultado" }, envelope: { model: "fixture" } };
  const result = await completeInferenceBeforePersist(async () => envelope, (value) => {
    persisted += 1;
    return value;
  });
  assert.equal(persisted, 1);
  assert.equal(result, envelope);
});

test("handoff package preserves the demonstrated properties and hashes", () => {
  const context = portableContext(projectionFixture());
  const root = mkdtempSync("/private/tmp/cz-handoff-test-");
  const result = buildHandoffPackage(context, root, new Date("2026-08-27T22:00:00.000Z"));
  const parsed = JSON.parse(readFileSync(join(result.directory, "CONTEXT.json"), "utf8"));
  assert.equal(parsed.export_schema, "CZ_ROOM_HANDOFF_V1");
  assert.equal(parsed.human_direction, null);
  assert.match(JSON.stringify(parsed), /Dream sustentável/);
  assert.match(JSON.stringify(parsed), /Continuidade e portabilidade/);
  assert.match(JSON.stringify(parsed), /Qual contexto deve sobreviver/);
  assert.equal(parsed.relations.length, 1);
  assert.doesNotMatch(JSON.stringify(parsed), /raw_ollama_envelope|not exported/);
  assert.equal(result.contextSha256, sha256(readFileSync(join(result.directory, "CONTEXT.json"))));
  for (const file of result.files) assert.equal(statSync(join(result.directory, file)).mode & 0o777, 0o600);
  assert.equal(statSync(result.directory).mode & 0o777, 0o700);
  for (const line of result.manifest.split("\n").filter((item) => item.startsWith("FILE_SHA256"))) {
    const [, hash, name] = line.split(" ");
    assert.equal(hash, sha256(readFileSync(join(result.directory, name))));
  }
});

test("external validator accepts a hash-bound synthetic response", () => {
  const response = externalResponseTemplate("a".repeat(64));
  Object.assign(response, { provider: "fixture-provider", model: "fixture-model", response_text: "Synthetic parser fixture" });
  response.state_reconstruction.current_phase = "DREAMING";
  assert.deepEqual(validateExternalResponse(response, "a".repeat(64)), { ok: true, errors: [] });
});

test("external validator rejects wrong hash and invalid authority", () => {
  const response = externalResponseTemplate("b".repeat(64));
  Object.assign(response, { provider: "fixture-provider", model: "fixture-model", response_text: "fixture", claims_human_direction: true });
  const result = validateExternalResponse(response, "a".repeat(64));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("input_context_sha256")));
  assert.ok(result.errors.some((error) => error.includes("invalid authority")));
});
