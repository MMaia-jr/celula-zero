#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_KEYS = Object.freeze([
  "ROOM_PROFILE_ID",
  "ROOM_HUMAN_ACTOR_ID",
  "ROOM_AI_ACTOR_ID",
  "ROOM_PROJECT_ID",
  "ROOM_CYCLE_ID",
]);

export function discoverySql() {
  return `select jsonb_build_object(
    'ROOM_PROFILE_ID', hm.profile_id,
    'ROOM_HUMAN_ACTOR_ID', human.id,
    'ROOM_AI_ACTOR_ID', ai.id,
    'ROOM_PROJECT_ID', project.id,
    'ROOM_CYCLE_ID', cycle.id
  )
  from public.dragon_cycles cycle
  join public.projects project
    on project.id = cycle.project_id
  join public.cycle_participations human_participation
    on human_participation.cycle_id = cycle.id
   and human_participation.ended_at is null
  join public.actors human
    on human.id = human_participation.actor_id
   and human.kind = 'PERSON'
  join public.actor_memberships hm
    on hm.actor_id = human.id
   and hm.role in ('OWNER','OPERATOR','REPRESENTATIVE')
  join public.cycle_participations ai_participation
    on ai_participation.cycle_id = cycle.id
   and ai_participation.ended_at is null
  join public.actors ai
    on ai.id = ai_participation.actor_id
   and ai.kind = 'AI_AGENT'
   and ai.operator_profile_id = hm.profile_id
  join public.actor_memberships aim
    on aim.actor_id = ai.id
   and aim.profile_id = hm.profile_id
   and aim.role in ('OWNER','OPERATOR','REPRESENTATIVE')
  where cycle.state = 'OPEN'
    and project.steward_actor_id = human.id
    and private.can_manage_project(project.id, hm.profile_id)
  order by hm.profile_id, human.id, ai.id, project.id, cycle.id;`;
}

function normalizeCandidate(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const normalized = {};
  for (const key of REQUIRED_KEYS) {
    const value = String(candidate[key] ?? "").trim();
    if (!value) return null;
    normalized[key] = value;
  }
  return normalized;
}

export function classifyCandidates(candidates) {
  if (!Array.isArray(candidates)) {
    return { status: "STOP", reason: "INVALID_DISCOVERY_RESULT" };
  }
  const normalized = candidates.map(normalizeCandidate);
  if (normalized.some((candidate) => candidate === null)) {
    return { status: "STOP", reason: "INVALID_CANDIDATE" };
  }
  const unique = [...new Map(normalized.map((candidate) => [JSON.stringify(candidate), candidate])).values()];
  if (unique.length === 0) return { status: "STOP", reason: "NO_ROOM_CONTEXT" };
  if (unique.length > 1) return { status: "STOP", reason: "AMBIGUOUS_ROOM_CONTEXT", count: unique.length };
  return { status: "READY", context: unique[0] };
}

export function parseDiscoveryOutput(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  return text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function projectRef(configPath = resolve(process.cwd(), "supabase", "config.toml")) {
  let text;
  try { text = readFileSync(configPath, "utf8"); }
  catch { throw new Error(`Config Supabase local não encontrado: ${configPath}`); }
  const match = text.match(/^\s*project_id\s*=\s*["']([^"']+)["']\s*$/m);
  if (!match) throw new Error(`project_id ausente em ${configPath}`);
  return match[1];
}

export function localDiscoveryTransport({ spawn = spawnSync } = {}) {
  const expected = `supabase_db_${projectRef()}`;
  const lookup = spawn("docker", ["ps", "--filter", `name=^/${expected}$`, "--format", "{{.Names}}"], { encoding: "utf8" });
  if (lookup.status !== 0) throw new Error(lookup.stderr?.trim() || `Falha ao consultar ${expected}`);
  const containers = lookup.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  if (containers.length !== 1 || containers[0] !== expected) {
    throw new Error(`Container DB Supabase local esperado não está disponível de forma única: ${expected}`);
  }
  const result = spawn("docker", ["exec", "-i", expected, "psql", "-U", "postgres", "-d", "postgres", "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1"], {
    input: discoverySql(), encoding: "utf8", maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || "Falha na descoberta local da Room");
  return parseDiscoveryOutput(result.stdout);
}

export function resolveRoomContext(transport = localDiscoveryTransport) {
  return classifyCandidates(transport());
}

export function runBootstrap({ resolveContext = resolveRoomContext, launch = spawnSync, resolveOnly = false } = {}) {
  const resolution = resolveContext();
  if (resolution.status !== "READY") return resolution;
  if (resolveOnly) return resolution;

  const roomPath = resolve(dirname(fileURLToPath(import.meta.url)), "cz-room.mjs");
  const child = launch(process.execPath, [roomPath], {
    env: { ...process.env, ...resolution.context },
    stdio: "inherit",
  });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error(`Room encerrou com status ${child.status ?? "desconhecido"}`);
  return resolution;
}

async function main() {
  const result = runBootstrap({ resolveOnly: process.argv.includes("--resolve-only") });
  if (result.status !== "READY") {
    console.error(`STOP: ${result.reason}${result.count ? ` (${result.count} candidates)` : ""}`);
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes("--resolve-only")) console.log(JSON.stringify(result));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { await main(); } catch (error) { console.error(`STOP: ${error.message}`); process.exitCode = 1; }
}
