#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const DEFAULTS = Object.freeze({
  profileId: "a240350e-4bbc-4589-b3bc-adc17b182129",
  humanActorId: "18af2804-ee20-460c-98cb-edc5f2871928",
  aiActorId: "e64b68d7-e61f-4f0c-bf95-11f7f08cc757",
  projectId: "49859ae3-0c7f-4a88-b503-513890c9261d",
  cycleId: "2aaaa2d1-4c5c-4a9d-8fea-b377c6be498e",
  model: "qwen3.5:9b",
});

const config = {
  profileId: process.env.ROOM_PROFILE_ID ?? DEFAULTS.profileId,
  humanActorId: process.env.ROOM_HUMAN_ACTOR_ID ?? DEFAULTS.humanActorId,
  aiActorId: process.env.ROOM_AI_ACTOR_ID ?? DEFAULTS.aiActorId,
  projectId: process.env.ROOM_PROJECT_ID ?? DEFAULTS.projectId,
  cycleId: process.env.ROOM_CYCLE_ID ?? DEFAULTS.cycleId,
  model: process.env.ROOM_AI_MODEL ?? DEFAULTS.model,
  aiTimeoutMs: Number(process.env.ROOM_AI_TIMEOUT_MS ?? 120_000),
};

let activeInference = null;

export function sqlText(value) {
  return `convert_from(decode('${Buffer.from(String(value)).toString("base64")}','base64'),'UTF8')`;
}

export function parseAiEnvelope(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return { kind: "SYNTHESIS", text: cleaned };
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const kind = ["RESTATEMENT", "QUESTION", "SYNTHESIS", "PLAN"].includes(parsed.kind)
      ? parsed.kind
      : "SYNTHESIS";
    return { ...parsed, kind, text: String(parsed.text ?? cleaned).trim() };
  } catch {
    return { kind: "SYNTHESIS", text: cleaned };
  }
}

export function humanState(projection) {
  const c = projection.cycle;
  return [
    `Projeto: ${projection.project_name}`,
    `Fase: ${c.current_phase} | ciclo ${c.state}`,
    `Direção humana: ${projection.human_direction?.content ?? "ainda não adotada"}`,
    `Registros humanos: ${projection.human_original_records.length}`,
    `Interpretações/sínteses da IA: ${projection.ai_interpretations.length}/${projection.ai_syntheses.length}`,
    `Questões abertas: ${projection.open_questions.length}`,
    `Objetos ligados: ${projection.bound_canonical_objects.length}`,
    `Limites conhecidos: ${projection.known_limitations.join("; ") || "nenhum registrado"}`,
  ].join("\n");
}

export function supabaseProjectRef(configPath = resolve(process.cwd(), "supabase", "config.toml")) {
  let text;
  try {
    text = readFileSync(configPath, "utf8");
  } catch {
    throw new Error(`Config Supabase local não encontrado: ${configPath}`);
  }
  const match = text.match(/^\s*project_id\s*=\s*["']([^"']+)["']\s*$/m);
  if (!match) {
    throw new Error(`project_id ausente em ${configPath}`);
  }
  return match[1];
}

export function containerName() {
  const projectRef = supabaseProjectRef();
  const expected = `supabase_db_${projectRef}`;
  const result = spawnSync("docker", [
    "ps",
    "--filter", `name=^/${expected}$`,
    "--format", "{{.Names}}",
  ], { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Falha ao consultar o container Supabase local esperado: ${expected}`);
  }

  const matches = result.stdout
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  if (matches.length !== 1 || matches[0] !== expected) {
    throw new Error(
      `Container DB Supabase local esperado não está disponível de forma única: ${expected}. ` +
      "Verifique supabase/config.toml e o status local.",
    );
  }

  return expected;
}

function db(sql) {
  const result = spawnSync("docker", ["exec", "-i", containerName(), "psql", "-U", "postgres", "-d", "postgres", "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1"], {
    input: sql,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr.trim() || "Falha ao acessar o banco local.");
  return result.stdout.trim();
}

function authenticated(sql) {
  return db(`begin; select set_config('request.jwt.claim.sub','${config.profileId}',true); ${sql}; commit;`)
    .split("\n").filter((line) => line && line !== config.profileId).at(-1);
}

function commandKey(prefix) {
  return [`${prefix}-${randomUUID()}`, randomUUID()];
}

function rpc(name, args, actor = config.humanActorId) {
  const [key, command] = commandKey(name);
  return JSON.parse(authenticated(`select public.${name}(${args(actor)},'${command}','${key}')`));
}

function record(actor, contentClass, content, provenance = {}) {
  return rpc("ddr_record_cycle_record", (a) => [
    `'${a}'`, `'${config.cycleId}'`, `'${contentClass}'`, sqlText(content),
    `${sqlText(JSON.stringify(provenance))}::jsonb`,
  ].join(","), actor).cycle_record_id;
}

function relate(source, target, type, actor = config.humanActorId) {
  return rpc("ddr_relate_cycle_records", (a) =>
    [`'${a}'`, `'${config.cycleId}'`, `'${source}'`, `'${target}'`, `'${type}'`].join(","), actor);
}

function transition(to, reason) {
  return rpc("ddr_transition_cycle_phase", (a) =>
    [`'${a}'`, `'${config.cycleId}'`, `'${to}'`, sqlText(reason)].join(","));
}

// CZ-108-PARTICIPATION-PORTABILITY-001
// Preserve cycle participation context in portable Room projections.
// Participation != authority. Operator identity is not exported here.
export function projectionSql(cycleId) {
  return `select jsonb_build_object(
    'canonical_state', jsonb_build_object('base','838338300618b0b8f8d428dd78f6e7998d266a1e','boundaries',jsonb_build_array('Original Record != Interpretation','AI Synthesis != Human Direction','Room deliberation != T3 execution')),
    'project_name', p.title,
    'cycle', to_jsonb(c) - 'cell_id',
    'cycle_participations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'participation_id', cp.id,
          'actor_id', cp.actor_id,
          'actor_kind', a.kind,
          'actor_name', a.name,
          'affiliation', cp.affiliation,
          'social_role', cp.social_role,
          'principal_actor_id', cp.principal_actor_id,
          'mode', cp.mode,
          'mandate', cp.mandate,
          'valid_from', cp.valid_from,
          'ended_at', cp.ended_at
        )
        order by cp.valid_from, cp.id
      )
      from public.cycle_participations cp
      join public.actors a on a.id=cp.actor_id
      where cp.cycle_id=c.id
    ),'[]'::jsonb),
    'human_original_records', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.cycle_records r join public.actors a on a.id=r.author_actor_id where r.cycle_id=c.id and r.content_class='ORIGINAL_RECORD' and a.kind='PERSON'),'[]'::jsonb),
    'ai_original_records', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.cycle_records r join public.actors a on a.id=r.author_actor_id where r.cycle_id=c.id and r.content_class='ORIGINAL_RECORD' and a.kind='AI_AGENT'),'[]'::jsonb),
    'ai_interpretations', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.cycle_records r join public.actors a on a.id=r.author_actor_id where r.cycle_id=c.id and r.content_class='INTERPRETATION' and a.kind='AI_AGENT'),'[]'::jsonb),
    'ai_syntheses', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.cycle_records r join public.actors a on a.id=r.author_actor_id where r.cycle_id=c.id and r.content_class='SYNTHESIS' and a.kind='AI_AGENT'),'[]'::jsonb),
    'human_confirmations', coalesce((select jsonb_agg(to_jsonb(rr) order by rr.created_at,rr.id) from public.cycle_record_relations rr where rr.cycle_id=c.id and rr.relation_type='CONFIRMS'),'[]'::jsonb),
    'human_responses', coalesce((select jsonb_agg(to_jsonb(rr) order by rr.created_at,rr.id) from public.cycle_record_relations rr join public.cycle_records r on r.id=rr.source_record_id join public.actors a on a.id=r.author_actor_id where rr.cycle_id=c.id and rr.relation_type in ('RESPONDS_TO','CORRECTS') and a.kind='PERSON'),'[]'::jsonb),
    'record_relations', coalesce((select jsonb_agg(to_jsonb(rr) order by rr.created_at,rr.id) from public.cycle_record_relations rr where rr.cycle_id=c.id),'[]'::jsonb),
    'human_direction', (select to_jsonb(r) from public.cycle_records r where r.id=c.current_direction_record_id),
    'bound_canonical_objects', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at,b.id) from public.cycle_bindings b where b.cycle_id=c.id),'[]'::jsonb),
    'open_questions', coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'content',r.content)) from public.cycle_records r where r.cycle_id=c.id and r.provenance->>'room_kind'='QUESTION'),'[]'::jsonb),
    'known_limitations', jsonb_build_array('BE004 semantic fidelity was PARTIAL','Human Direction is never inferred from AI output','local technical use does not establish external utility')
  ) from public.dragon_cycles c join public.projects p on p.id=c.project_id where c.id='${cycleId}'`;
}

export function project() {
  const raw = db(projectionSql(config.cycleId));
  if (!raw) throw new Error(`Ciclo ${config.cycleId} não encontrado no banco local.`);
  return JSON.parse(raw);
}

export function canonicalRoomContext() {
  return portableContext(project());
}

function portableRecord(record, authorKind) {
  if (!record) return null;

  const provenance = { ...(record.provenance ?? {}) };

  // Raw provider envelopes are provenance material, but they are not needed
  // to reconstruct the semantic Room context across models.
  delete provenance.raw_ollama_envelope;

  return {
    id: record.id,
    author_actor_id: record.author_actor_id,
    author_kind: authorKind,
    content_class: record.content_class,
    phase_context: record.phase_context,
    content: record.content,
    provenance,
    created_at: record.created_at,
  };
}

export function portableContext(projection) {
  const participants = (projection.cycle_participations ?? []).map((p) => ({
    participation_id: p.participation_id,
    actor_id: p.actor_id,
    actor_kind: p.actor_kind,
    actor_name: p.actor_name,
    affiliation: p.affiliation,
    social_role: p.social_role,
    principal_actor_id: p.principal_actor_id ?? null,
    mode: p.mode,
    mandate: p.mandate,
    valid_from: p.valid_from,
    ended_at: p.ended_at ?? null,
    active: p.ended_at == null,
  }));

  const records = [
    ...(projection.human_original_records ?? []).map((r) =>
      portableRecord(r, "PERSON")),
    ...(projection.ai_original_records ?? []).map((r) =>
      portableRecord(r, "AI_AGENT")),
    ...(projection.ai_interpretations ?? []).map((r) =>
      portableRecord(r, "AI_AGENT")),
    ...(projection.ai_syntheses ?? []).map((r) =>
      portableRecord(r, "AI_AGENT")),
  ].sort((a, b) =>
    String(a.created_at).localeCompare(String(b.created_at))
      || String(a.id).localeCompare(String(b.id)));

  const byId = new Map(records.map((r) => [r.id, r]));

  const relations = (projection.record_relations ?? []).map((rr) => ({
    id: rr.id,
    relation_type: rr.relation_type,
    source_record_id: rr.source_record_id,
    target_record_id: rr.target_record_id,
    asserted_by_actor_id: rr.asserted_by_actor_id,
    created_at: rr.created_at,
    source_summary: byId.has(rr.source_record_id)
      ? {
          author_kind: byId.get(rr.source_record_id).author_kind,
          content_class: byId.get(rr.source_record_id).content_class,
        }
      : null,
    target_summary: byId.has(rr.target_record_id)
      ? {
          author_kind: byId.get(rr.target_record_id).author_kind,
          content_class: byId.get(rr.target_record_id).content_class,
        }
      : null,
  }));

  return {
    export_schema: "CZ_ROOM_CONTEXT_PORT_V1",

    authority: {
      classification: "NON_CANONICAL_LOCAL_CONTEXT_EXPORT",
      statement:
        "This package represents local Room state. It is not itself a Human Decision, Verification, canonical GitHub state, or proof of truth.",
    },

    canonical_state: projection.canonical_state,

    project: {
      id: config.projectId,
      name: projection.project_name,
    },

    cycle: {
      id: projection.cycle.id,
      parent_cycle_id: projection.cycle.parent_cycle_id ?? null,
      current_phase: projection.cycle.current_phase,
      state: projection.cycle.state,
      current_direction_record_id:
        projection.cycle.current_direction_record_id ?? null,
    },

    participants,
    records,
    relations,

    human_confirmations: projection.human_confirmations ?? [],
    human_responses: projection.human_responses ?? [],

    human_direction: portableRecord(
      projection.human_direction,
      "PERSON",
    ),

    bound_canonical_objects:
      projection.bound_canonical_objects ?? [],

    explicitly_tagged_open_questions:
      projection.open_questions ?? [],

    open_questions_completeness:
      "EXPLICITLY_TAGGED_ONLY",

    open_questions_warning:
      "Absence from explicitly_tagged_open_questions does not mean no uncertainty exists. Human Original Records and responses may preserve unresolved questions without an explicit QUESTION tag.",

    known_limitations: projection.known_limitations ?? [],

    authority_boundaries: [
      "Original Record != Interpretation",
      "AI Synthesis != Human Direction",
      "Model agreement != legitimacy",
      "Participation != authority",
      "Room deliberation != T3 execution",
      "Delegation != execution",
      "Execution != Verification != Decision",
    ],
  };
}

function markdownParticipants(context) {
  const participants = context.participants ?? [];

  if (!participants.length) return "NONE";

  return participants.map((p) => [
    `### ${p.actor_name} (${p.actor_kind})`,
    `- Participation ID: ${p.participation_id}`,
    `- Actor ID: ${p.actor_id}`,
    `- Affiliation: ${p.affiliation}`,
    `- Social role: ${p.social_role}`,
    `- Mode: ${p.mode}`,
    `- Principal actor ID: ${p.principal_actor_id ?? "NONE"}`,
    `- Mandate: ${p.mandate || "NONE"}`,
    `- Valid from: ${p.valid_from}`,
    `- Ended at: ${p.ended_at ?? "NONE"}`,
    `- Active: ${p.active ? "YES" : "NO"}`,
    "- Authority: PARTICIPATION_CONTEXT_ONLY",
  ].join("\n")).join("\n\n");
}

export function portableMarkdown(context) {
  return `# CÉLULA ZERO — PORTABLE PROJECT ROOM CONTEXT

## Authority

This is a **NON-CANONICAL LOCAL CONTEXT EXPORT**.

It represents the current Project Room state available to the exporter.

It does **not** mean:

- the content is true merely because it is recorded;
- an AI synthesis is a Human Direction;
- model agreement is legitimacy;
- a local technical result establishes external utility, adoption or scale.

## Participants

${markdownParticipants(context)}

Participation context describes affiliation, role, mode and mandate.
It does not grant project membership, delegation, execution authority,
Human Direction, governance authority or economic rights.

## Mission for a new external intelligence

You are entering this Célula Zero Project Room without access to the
previous chat session.

Reconstruct the state **only from this package**.

Preserve these distinctions:

Original Record != Interpretation != Claim != Evidence != Verification != Decision.

When responding:

1. identify what the human actually said;
2. distinguish AI interpretations/syntheses from human statements;
3. identify explicit human confirmations/responses/corrections;
4. state whether a Human Direction currently exists;
5. preserve unresolved uncertainty;
6. if you infer additional open questions, label them as
   **INTERPRETATION / CANDIDATE OPEN QUESTION**, not as an existing human decision;
7. do not invent a next project direction;
8. you may propose useful questions or options, but they remain proposals.

## Exact portable context payload

\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`
`;
}

export function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function markdownRecords(title, records) {
  const body = records.length
    ? records.map((record) => `### ${record.id}\n\n- Author: ${record.author_kind} / ${record.author_actor_id}\n- Class: ${record.content_class}\n- Phase: ${record.phase_context}\n- Created: ${record.created_at}\n\n${record.content}`).join("\n\n")
    : "NONE";
  return `## ${title}\n\n${body}`;
}

export function handoffMarkdown(context) {
  const human = context.records.filter((record) => record.author_kind === "PERSON");
  const ai = context.records.filter((record) => record.author_kind === "AI_AGENT");
  const responseIds = new Set(context.human_responses.map((relation) => relation.source_record_id));
  const humanResponses = human.filter((record) => responseIds.has(record.id));
  const relations = context.relations.length
    ? context.relations.map((relation) => `- ${relation.source_record_id} --${relation.relation_type}--> ${relation.target_record_id} (asserted by ${relation.asserted_by_actor_id})`).join("\n")
    : "NONE";
  const questions = context.explicitly_tagged_open_questions.length
    ? context.explicitly_tagged_open_questions.map((question) => `- ${question.id}: ${question.content}`).join("\n")
    : "NONE EXPLICITLY TAGGED. This does not establish that no uncertainty exists.";
  return `# CÉLULA ZERO — PROJECT ROOM HANDOFF\n\n## PROJECT\n\n- ID: ${context.project.id}\n- Name: ${context.project.name}\n\n## CYCLE\n\n- ID: ${context.cycle.id}\n- Phase: ${context.cycle.current_phase}\n- State: ${context.cycle.state}\n\n## PARTICIPANTS\n\n${markdownParticipants(context)}\n\nParticipation context is descriptive only. Participation != authority.\n\n## HUMAN DIRECTION\n\n${context.human_direction ? `${context.human_direction.id}: ${context.human_direction.content}` : "NONE"}\n\n## AUTHORITY BOUNDARIES\n\n${context.authority_boundaries.map((boundary) => `- ${boundary}`).join("\n")}\n\n${markdownRecords("HUMAN ORIGINAL RECORDS", human)}\n\n${markdownRecords("AI RECORDS", ai)}\n\n${markdownRecords("HUMAN RESPONSES", humanResponses)}\n\n## RELATIONS\n\n${relations}\n\n## EXPLICIT OPEN QUESTIONS\n\n${questions}\n\nCompleteness: ${context.open_questions_completeness}.\n\n## KNOWN LIMITATIONS\n\n${context.known_limitations.map((limitation) => `- ${limitation}`).join("\n")}\n\nOriginal content above is preserved; summaries and relation labels do not replace it.\n`;
}

export function handoffPrompt(contextSha256) {
  return `# Mission for an external intelligence\n\nYou are a new intelligence entering a Célula Zero Project Room without access to previous chats. Reconstruct state exclusively from CONTEXT.md and CONTEXT.json in this package. The exact CONTEXT.json SHA-256 is \`${contextSha256}\`. Do not invent missing memory, human choices, or authority. Provenance is not truth. Model agreement is not legitimacy.\n\nReturn JSON using RESPONSE-TEMPLATE.json and preserve these separate sections:\n\n1. HUMAN ORIGINAL STATE\n2. AI INTERPRETATIONS / SYNTHESES\n3. HUMAN CONFIRMATIONS / RESPONSES\n4. CURRENT HUMAN DIRECTION\n5. CURRENT PHASE\n6. EXPLICIT OPEN QUESTIONS\n7. CANDIDATE OPEN QUESTIONS — label these INTERPRETATION\n8. KNOWN LIMITATIONS\n9. POSSIBLE NEXT QUESTIONS / MOVES — proposals only\n\nYour response is an attributable external AI contribution. It is not Human Direction, Verification, Decision, or canonical state. Set provider and model to the actual intelligence used. Do not modify input_context_sha256 or source_mode.\n`;
}

export function externalResponseTemplate(contextSha256) {
  return {
    response_schema: "CZ_EXTERNAL_INTELLIGENCE_RESPONSE_V1",
    input_context_sha256: contextSha256,
    provider: "",
    model: "",
    source_mode: "MANUAL_PORTABLE",
    state_reconstruction: {
      human_original_state: [],
      ai_interpretations_and_syntheses: [],
      human_confirmations_and_responses: [],
      current_human_direction: null,
      current_phase: "",
      explicit_open_questions: [],
      known_limitations: [],
    },
    candidate_open_questions: [],
    proposed_next_moves: [],
    limitations: [],
    response_text: "",
  };
}

function writeSecure(file, content) {
  writeFileSync(file, content, { encoding: "utf8", mode: 0o600 });
  chmodSync(file, 0o600);
}

export function buildHandoffPackage(contextPort, rootDirectory = "/private/tmp", timestamp = new Date()) {
  const context = { ...contextPort, export_schema: "CZ_ROOM_HANDOFF_V1", generated_at: timestamp.toISOString() };
  const directory = join(rootDirectory, `CZ-HANDOFF-${timestamp.toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(directory, { recursive: false, mode: 0o700 });
  chmodSync(directory, 0o700);

  const contextJson = JSON.stringify(context, null, 2) + "\n";
  const contextSha = sha256(contextJson);
  const files = {
    "CONTEXT.json": contextJson,
    "CONTEXT.md": handoffMarkdown(context),
    "PROMPT.md": handoffPrompt(contextSha),
    "RESPONSE-TEMPLATE.json": JSON.stringify(externalResponseTemplate(contextSha), null, 2) + "\n",
  };
  for (const [name, content] of Object.entries(files)) writeSecure(join(directory, name), content);

  const manifestLines = [
    "SCHEMA=CZ_ROOM_HANDOFF_V1",
    `PROJECT_ID=${context.project.id}`,
    `CYCLE_ID=${context.cycle.id}`,
    `CANONICAL_BASE_SHA=${context.canonical_state.base}`,
    `CURRENT_PHASE=${context.cycle.current_phase}`,
    `HUMAN_DIRECTION=${context.human_direction?.id ?? "NONE"}`,
    `CONTEXT_RECORD_COUNT=${context.records.length}`,
    `RELATION_COUNT=${context.relations.length}`,
    `GENERATION_TIMESTAMP=${context.generated_at}`,
    "CLASSIFICATION=NON_CANONICAL_LOCAL_CONTEXT_EXPORT",
    "MODEL_CALL=NO",
    "DB_WRITE=NO",
    ...Object.entries(files).map(([name, content]) => `FILE_SHA256 ${sha256(content)} ${name}`),
    "",
  ];
  const manifest = manifestLines.join("\n");
  writeSecure(join(directory, "MANIFEST.txt"), manifest);
  return { directory, contextSha256: contextSha, files: [...Object.keys(files), "MANIFEST.txt"], manifest };
}

function invalidAuthority(value, path = "response") {
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (key !== "current_human_direction" && /^(is_|claims_)?human_direction$/i.test(key) && child !== null && child !== "NONE" && child !== false) return childPath;
    const nested = invalidAuthority(child, childPath);
    if (nested) return nested;
  }
  return null;
}

export function validateExternalResponse(response, expectedContextSha256, expectedHumanDirection = null) {
  const errors = [];
  if (!response || typeof response !== "object" || Array.isArray(response)) errors.push("response must be a JSON object");
  if (response?.response_schema !== "CZ_EXTERNAL_INTELLIGENCE_RESPONSE_V1") errors.push("invalid response_schema");
  if (response?.input_context_sha256 !== expectedContextSha256) errors.push("input_context_sha256 does not match CONTEXT.json");
  if (typeof response?.provider !== "string" || !response.provider.trim()) errors.push("provider is required");
  if (typeof response?.model !== "string" || !response.model.trim()) errors.push("model is required");
  if (response?.source_mode !== "MANUAL_PORTABLE") errors.push("source_mode must be MANUAL_PORTABLE");
  if (!response?.state_reconstruction || typeof response.state_reconstruction !== "object" || Array.isArray(response.state_reconstruction)) errors.push("state_reconstruction object is required");
  for (const field of ["human_original_state", "ai_interpretations_and_syntheses", "human_confirmations_and_responses", "explicit_open_questions", "known_limitations"]) if (!Array.isArray(response?.state_reconstruction?.[field])) errors.push(`state_reconstruction.${field} must be an array`);
  if (typeof response?.state_reconstruction?.current_phase !== "string" || !response.state_reconstruction.current_phase.trim()) errors.push("state_reconstruction.current_phase is required");
  const reconstructedDirection = response?.state_reconstruction?.current_human_direction;
  const normalizedDirection = reconstructedDirection === "NONE" ? null : reconstructedDirection;
  if (normalizedDirection !== expectedHumanDirection) errors.push("state_reconstruction.current_human_direction does not match input context");
  for (const field of ["candidate_open_questions", "proposed_next_moves", "limitations"]) if (!Array.isArray(response?.[field])) errors.push(`${field} must be an array`);
  if (typeof response?.response_text !== "string") errors.push("response_text must be a string");
  const authorityPath = invalidAuthority(response);
  if (authorityPath) errors.push(`invalid authority claim at ${authorityPath}: external AI response cannot be Human Direction`);
  return { ok: errors.length === 0, errors };
}

export function validateExternalResponseFile(responseFile, contextFile = join(dirname(resolve(responseFile)), "CONTEXT.json")) {
  const contextBytes = readFileSync(contextFile);
  const context = JSON.parse(contextBytes);
  const response = JSON.parse(readFileSync(responseFile, "utf8"));
  const result = validateExternalResponse(response, sha256(contextBytes), context.human_direction?.id ?? null);
  return { ...result, response, contextFile, contextSha256: sha256(contextBytes) };
}

function handoffRoom() {
  const before = project();
  const packageResult = buildHandoffPackage(portableContext(before));
  const after = project();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Room state changed while generating handoff");
  console.log(`HANDOFF_DIR=${packageResult.directory}`);
  console.log(`CONTEXT_FILE=${join(packageResult.directory, "CONTEXT.json")}`);
  console.log(`PROMPT_FILE=${join(packageResult.directory, "PROMPT.md")}`);
  console.log(`RESPONSE_TEMPLATE=${join(packageResult.directory, "RESPONSE-TEMPLATE.json")}`);
  console.log(`MANIFEST=${join(packageResult.directory, "MANIFEST.txt")}`);
  console.log(`CONTEXT_SHA256=${packageResult.contextSha256}`);
  console.log("MODEL_CALL=NO");
  console.log("DB_WRITE=NO");
}

function validateExternalCli() {
  const marker = process.argv.indexOf("--validate-external");
  const responseFile = process.argv[marker + 1];
  if (!responseFile) throw new Error("Usage: npm run room:external:validate -- /path/response.json");
  const contextMarker = process.argv.indexOf("--context");
  const result = validateExternalResponseFile(responseFile, contextMarker >= 0 ? process.argv[contextMarker + 1] : undefined);
  if (!result.ok) throw new Error(`EXTERNAL_RESPONSE_VALIDATION=FAIL\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  console.log("EXTERNAL_RESPONSE_VALIDATION=PASS");
  console.log(`INPUT_CONTEXT_SHA256=${result.contextSha256}`);
  console.log(`PROVIDER=${result.response.provider}`);
  console.log(`MODEL=${result.response.model}`);
  console.log(`CURRENT_PHASE=${result.response.state_reconstruction.current_phase || "NOT_RECONSTRUCTED"}`);
  console.log(`CURRENT_HUMAN_DIRECTION=${result.response.state_reconstruction.current_human_direction ?? "NONE"}`);
  console.log(`CANDIDATE_OPEN_QUESTIONS=${result.response.candidate_open_questions.length}`);
  console.log(`PROPOSED_NEXT_MOVES=${result.response.proposed_next_moves.length}`);
  console.log("AUTHORITY=EXTERNAL_AI_CONTRIBUTION_ONLY");
  console.log("DB_WRITE=NO");
}

function exportPortableRoom() {
  const projection = project();
  const context = portableContext(projection);
  const markdown = portableMarkdown(context);

  const json = JSON.stringify(context, null, 2) + "\n";

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const directory =
    process.env.ROOM_EXPORT_DIR ?? "/private/tmp";

  mkdirSync(directory, {
    recursive: true,
    mode: 0o700,
  });

  const base =
    `${directory}/CZ-ROOM-CONTEXT-${stamp}`;

  const jsonFile = `${base}.json`;
  const mdFile = `${base}.md`;

  writeFileSync(jsonFile, json, {
    encoding: "utf8",
    mode: 0o600,
  });

  writeFileSync(mdFile, markdown, {
    encoding: "utf8",
    mode: 0o600,
  });

  chmodSync(jsonFile, 0o600);
  chmodSync(mdFile, 0o600);

  console.log("===== CZ-CONTEXT-PORT-001 =====");
  console.log(`PROJECT_ID=${context.project.id}`);
  console.log(`CYCLE_ID=${context.cycle.id}`);
  console.log(`CURRENT_PHASE=${context.cycle.current_phase}`);
  console.log(
    `HUMAN_DIRECTION=${
      context.human_direction?.id ?? "NONE"
    }`,
  );
  console.log(`RECORDS=${context.records.length}`);
  console.log(`RELATIONS=${context.relations.length}`);
  console.log(
    `EXPLICIT_OPEN_QUESTIONS=${
      context.explicitly_tagged_open_questions.length
    }`,
  );
  console.log(
    "OPEN_QUESTIONS_COMPLETENESS=EXPLICITLY_TAGGED_ONLY",
  );
  console.log("MODEL_CALL=NO");
  console.log("DB_WRITE=NO");
  console.log("CANONICAL=NO");
  console.log(`JSON_FILE=${jsonFile}`);
  console.log(`JSON_SHA256=${sha256(json)}`);
  console.log(`MARKDOWN_FILE=${mdFile}`);
  console.log(`MARKDOWN_SHA256=${sha256(markdown)}`);
}

export function humanInputNeedsConfirmation(line) {
  const trimmed = line.trim();
  return Boolean(trimmed) && !trimmed.startsWith("/");
}

export async function completeInferenceBeforePersist(infer, persist) {
  const result = await infer();
  return persist(result);
}

async function ollama(projection, humanText, mode = "DELIBERATION", signal) {
  const modelContext = portableContext(projection);
  const prompt = `Você é a IA da Project Room Célula Zero. Preserve incerteza e autoria. Nunca trate sua síntese como decisão humana. Responda em português, concisamente, como JSON {"kind":"RESTATEMENT|QUESTION|SYNTHESIS|PLAN","text":"...","open_questions":[],"limitations":[]}.
No modo PLAN, text deve conter: objetivo, premissas, questões abertas, próximas ações, dependências, responsabilidade e critério de conclusão. Não invente escolha humana.
MODO=${mode}\nPROJEÇÃO DETERMINÍSTICA=${JSON.stringify(modelContext)}\nMENSAGEM HUMANA=${humanText}`;
  const response = await fetch("http://127.0.0.1:11434/api/chat", {
    method: "POST", headers: { "content-type": "application/json" },
    signal,
    body: JSON.stringify({ model: config.model, stream: false, think: false, options: { num_predict: 100 }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`Ollama respondeu HTTP ${response.status}.`);
  const envelope = await response.json();
  return { parsed: parseAiEnvelope(envelope.message?.content ?? ""), envelope };
}

async function aiTurn(text, sourceId, mode = "DELIBERATION", signal) {
  return completeInferenceBeforePersist(
    () => ollama(project(), text, mode, signal),
    ({ parsed, envelope }) => {
      const contentClass = parsed.kind === "RESTATEMENT" ? "INTERPRETATION" : "SYNTHESIS";
      const aiId = record(config.aiActorId, contentClass, parsed.text, {
        provider: "OLLAMA_LOCAL", model: config.model, room_kind: parsed.kind,
        open_questions: parsed.open_questions ?? [], limitations: parsed.limitations ?? [],
        raw_ollama_envelope: envelope,
      });
      relate(aiId, sourceId, parsed.kind === "RESTATEMENT" ? "RESTATES" : parsed.kind === "QUESTION" ? "RESPONDS_TO" : "DERIVES_FROM", config.aiActorId);
      console.log(`\nRoom AI (${parsed.kind}, registro ${aiId}):\n${parsed.text}\n`);
      return { aiId, envelope };
    },
  );
}

function startAiTurn(text, sourceId, mode = "DELIBERATION") {
  if (activeInference) throw new Error("Já existe uma inferência ativa. Use /cancel antes de iniciar outra.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("Inferência excedeu o timeout.")), config.aiTimeoutMs);
  const promise = aiTurn(text, sourceId, mode, controller.signal)
    .catch((error) => {
      if (controller.signal.aborted) console.error(`\nInferência interrompida: ${controller.signal.reason?.message ?? "cancelada"}`);
      else console.error(`\nErro na inferência: ${error.message}`);
    })
    .finally(() => {
      clearTimeout(timeout);
      if (activeInference?.controller === controller) activeInference = null;
    });
  activeInference = { controller, promise };
  console.log("Inferência iniciada em segundo plano. Use /cancel ou /quit para interromper.");
}

function help() {
  console.log(`Comandos:
  texto livre                 registra sua fala e chama a Room AI
  /ai                         continua a partir do último registro humano
  /cancel                     interrompe a inferência ativa
  /status                     mostra o estado atual
  /confirm ID [texto]         confirma uma interpretação da IA
  /respond ID texto           responde/corrige sem sobrescrever a IA
  /direction texto            adota explicitamente a direção e entra em Planejar
  /plan texto                 preserva um registro humano de planejamento
  /do motivo                  entra em Fazer (ação humana continua humana)
  /celebrate reflexão         entra em Celebrar e registra aprendizagem
  /child novo sonho           abre um Dream filho a partir de Celebrar
  /quit                       sai; o contexto permanece no banco`);
}

function roomOperations() {
  return {
    project,
    record,
    relate,
    rpc,
    transition,
    startAiTurn,
  };
}

export async function handleRoomCommand(line, operations = roomOperations()) {
  const {
    project: readProject,
    record: persistRecord,
    relate: persistRelation,
    rpc: callRpc,
    transition: transitionPhase,
    startAiTurn: beginAiTurn,
  } = operations;
  const [command, ...rest] = line.trim().split(/\s+/);
  const body = rest.join(" ");
  if (!line.trim()) return true;
  if (command === "/quit") { activeInference?.controller.abort(new Error("Saída solicitada pelo humano.")); return false; }
  if (command === "/help") { help(); return true; }
  if (command === "/cancel") {
    if (!activeInference) console.log("Nenhuma inferência ativa.");
    else activeInference.controller.abort(new Error("Cancelamento solicitado pelo humano."));
    return true;
  }
  if (command === "/status") { console.log(`\n${humanState(readProject())}\n`); return true; }
  if (command === "/ai") {
    const latest = readProject().human_original_records.at(-1);
    if (!latest) throw new Error("Ainda não existe registro humano para a IA considerar.");
    beginAiTurn("Continue a deliberação a partir do último registro humano já preservado, sem inventar uma decisão.", latest.id);
    return true;
  }
  if (command === "/confirm" || command === "/respond") {
    const [target, ...words] = rest;
    if (!/^[0-9a-f-]{36}$/i.test(target ?? "")) throw new Error("Informe o UUID do registro da IA.");
    const text = words.join(" ") || "Confirmo que esta interpretação preserva o que eu quis dizer.";
    const id = persistRecord(config.humanActorId, "ORIGINAL_RECORD", text, { room_kind: command === "/confirm" ? "CONFIRMATION" : "RESPONSE" });
    persistRelation(id, target, command === "/confirm" ? "CONFIRMS" : "RESPONDS_TO");
    console.log(`Resposta humana preservada: ${id}`); return true;
  }
  if (command === "/direction") {
    if (!body) throw new Error("Escreva a direção humana explícita.");
    const id = persistRecord(config.humanActorId, "ORIGINAL_RECORD", body, { room_kind: "HUMAN_DIRECTION" });
    callRpc("ddr_set_cycle_direction", (a) => [`'${a}'`, `'${config.cycleId}'`, `'${id}'`].join(","));
    transitionPhase("PLANNING", "A pessoa responsável adotou explicitamente esta direção humana para planejar.");
    console.log(`Direção humana adotada: ${id}. Fase atual: PLANNING.`); return true;
  }
  if (command === "/plan") {
    if (!body) throw new Error("Descreva naturalmente o plano desejado.");
    const id = persistRecord(config.humanActorId, "ORIGINAL_RECORD", body, { room_kind: "PLAN_INPUT" });
    console.log(`Planejamento humano preservado: ${id}`); return true;
  }
  if (command === "/do") { transitionPhase("DOING", body || "O plano possui uma próxima ação concreta e a pessoa decidiu iniciar o trabalho."); console.log("Fase atual: DOING. Nenhuma execução T3 foi criada."); return true; }
  if (command === "/celebrate") {
    transitionPhase("CELEBRATING", "A pessoa encerrou esta etapa de ação e decidiu refletir sobre o que ocorreu.");
    const id = persistRecord(config.humanActorId, "ORIGINAL_RECORD", body || "Pausa para reconhecer o ocorrido, aprender e manter questões abertas.", { room_kind: "CELEBRATION" });
    console.log(`Celebração/reflexão preservada: ${id}`); return true;
  }
  if (command === "/child") {
    if (!body) throw new Error("Escreva o possível novo Dream.");
    const origin = persistRecord(config.humanActorId, "ORIGINAL_RECORD", body, { room_kind: "NEW_DREAM" });
    const result = callRpc("ddr_open_child_cycle", (a) => [`'${a}'`, `'${config.cycleId}'`, `'${origin}'`].join(","));
    console.log(`Dream filho aberto: ${result.dragon_cycle_id}. Para retomá-lo: ROOM_CYCLE_ID=${result.dragon_cycle_id} npm run room`); return true;
  }
  if (command.startsWith("/")) throw new Error("Comando desconhecido. Use /help.");
  const id = persistRecord(config.humanActorId, "ORIGINAL_RECORD", line, { room_kind: "HUMAN_SPEECH" });
  beginAiTurn(line, id); return true;
}

export async function runOneShotCommand(line, operations) {
  return handleRoomCommand(line, operations);
}

async function main() {
  if (process.argv.includes("--handoff")) {
    handoffRoom();
    return;
  }
  if (process.argv.includes("--validate-external")) {
    validateExternalCli();
    return;
  }
  if (process.argv.includes("--export")) {
    exportPortableRoom();
    return;
  }

  console.log(`CÉLULA ZERO — LOCAL PROJECT ROOM\nProvider: OLLAMA_LOCAL | modelo: ${config.model}\n\n${humanState(project())}\n`);
  help();
  const commandIndex = process.argv.indexOf("--command");
  const inlineCommand = process.argv.find((arg) => arg.startsWith("--command="));
  const positionalCommand = process.argv.slice(2).find((arg) => arg.startsWith("/"));
  if (commandIndex >= 0 || inlineCommand || positionalCommand || process.env.ROOM_COMMAND) {
    const oneCommand = process.env.ROOM_COMMAND ?? inlineCommand?.slice("--command=".length) ?? positionalCommand ?? process.argv[commandIndex + 1];
    if (!oneCommand) throw new Error("--command exige um comando da Room.");
    if (humanInputNeedsConfirmation(oneCommand) && !process.argv.includes("--confirm") && process.env.ROOM_CONFIRM !== "1") {
      throw new Error("Texto livre exige confirmação explícita: use --confirm ou ROOM_CONFIRM=1.");
    }
    await runOneShotCommand(oneCommand);
    return;
  }
  if (!stdin.isTTY) {
    const chunks = []; for await (const chunk of stdin) chunks.push(chunk);
    for (const line of Buffer.concat(chunks).toString("utf8").split("\n")) {
      if (!line.trim()) continue;
      if (humanInputNeedsConfirmation(line)) throw new Error("Texto livre via stdin exige confirmação explícita; use ROOM_COMMAND com ROOM_CONFIRM=1.");
      if (!(await handleRoomCommand(line))) break;
    }
    return;
  }
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    while (true) {
      const line = await rl.question("\nVocê > ");
      if (humanInputNeedsConfirmation(line)) {
        const answer = await rl.question(`Confirmar e persistir este input? [y/N]\n> ${line}\n`);
        if (!/^(y|yes|s|sim)$/i.test(answer.trim())) { console.log("Input descartado; nada foi persistido."); continue; }
      }
      if (!(await handleRoomCommand(line))) break;
    }
  } catch (error) { console.error(`\nErro: ${error.message}`); process.exitCode = 1; } finally { rl.close(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { await main(); } catch (error) { console.error(`Erro: ${error.message}`); process.exitCode = 1; }
}
