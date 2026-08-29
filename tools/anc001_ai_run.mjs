#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MANIFEST_VERSION = 'cz.ai-context.v1';
export const MAX_OUTPUT_BYTES = 1_048_576;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new TypeError(`unsupported canonical JSON value: ${typeof value}`);
}

function requireUuid(value, label) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error(`${label} must be a UUID`);
  return value.toLowerCase();
}

function requireText(value, label, max = 8000) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) {
    throw new Error(`${label} must be non-empty and at most ${max} characters`);
  }
  return value.trim();
}

function safeRepositoryPath(root, candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0 || isAbsolute(candidate)) {
    throw new Error(`unsafe repository path: ${String(candidate)}`);
  }
  const absolute = resolve(root, candidate);
  const rel = relative(resolve(root), absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`repository path escapes root: ${candidate}`);
  }
  return { absolute, relative: candidate.split('\\').join('/') };
}

export async function buildContextManifest(request, repoRoot) {
  const projectId = requireUuid(request.project_id, 'project_id');
  const cycleId = requireUuid(request.cycle_id, 'cycle_id');
  const agentActorId = requireUuid(request.agent_actor_id, 'agent_actor_id');
  const purpose = requireText(request.purpose, 'purpose', 1000);
  const task = requireText(request.task, 'task', 8000);
  const authority = requireText(request.authority, 'authority', 2000);
  if (!Array.isArray(request.prohibited_inferences) || request.prohibited_inferences.length === 0) {
    throw new Error('prohibited_inferences must be a non-empty array');
  }

  const records = (request.cycle_records ?? []).map((record, index) => ({
    id: requireUuid(record.id, `cycle_records[${index}].id`),
    content_class: requireText(record.content_class, `cycle_records[${index}].content_class`, 64),
    content_digest: (() => {
      const digest = String(record.content_digest ?? '').toLowerCase();
      if (!SHA256.test(digest)) throw new Error(`cycle_records[${index}].content_digest must be SHA-256`);
      return digest;
    })(),
  })).sort((a, b) => a.id.localeCompare(b.id));

  const files = [];
  for (const candidate of [...new Set(request.repository_paths ?? [])].sort()) {
    const path = safeRepositoryPath(repoRoot, candidate);
    const bytes = await readFile(path.absolute);
    files.push({ path: path.relative, digest: sha256(bytes), size_bytes: bytes.length });
  }

  return {
    manifest_version: MANIFEST_VERSION,
    project_id: projectId,
    cycle_id: cycleId,
    agent_actor_id: agentActorId,
    purpose,
    task,
    cycle_records: records,
    repository_files: files,
    authority,
    prohibited_inferences: request.prohibited_inferences.map((item, index) => requireText(item, `prohibited_inferences[${index}]`, 1000)),
  };
}

export function buildModelInput(manifest) {
  return Buffer.from(`${canonicalJson({
    contract: 'cz.ai-input.v1',
    context: manifest,
    boundaries: {
      output_is_human_direction: false,
      output_is_verification: false,
      permitted_cycle_record_classes: ['INTERPRETATION', 'SYNTHESIS'],
    },
  })}\n`, 'utf8');
}

export async function mockProvider(modelInput, options = {}) {
  if (options.fail) throw Object.assign(new Error('deterministic mock failure'), { code: 'MOCK_PROVIDER_FAILURE' });
  const output = requireText(options.output ?? 'Deterministic attributed AI interpretation.', 'mock output', 8000);
  const envelope = {
    provider: 'MOCK',
    model: options.model ?? 'mock-deterministic-v1',
    output,
    usage: options.usage ?? null,
    cost_usd: options.cost_usd ?? null,
    input_digest: sha256(modelInput),
  };
  return Buffer.from(canonicalJson(envelope), 'utf8');
}

export function normalizeProviderResponse(rawBytes) {
  if (!Buffer.isBuffer(rawBytes)) rawBytes = Buffer.from(rawBytes);
  const envelope = JSON.parse(rawBytes.toString('utf8'));
  const output = requireText(envelope.output, 'provider output', 8000);
  const outputBytes = Buffer.from(output, 'utf8');
  if (outputBytes.length > MAX_OUTPUT_BYTES) throw new Error('provider output exceeds bounded size');
  const usage = envelope.usage;
  const integerOrNull = (value, label) => {
    if (value == null) return null;
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer or null`);
    return value;
  };
  const inputTokens = integerOrNull(usage?.input_tokens, 'input_tokens');
  const outputTokens = integerOrNull(usage?.output_tokens, 'output_tokens');
  const totalTokens = integerOrNull(usage?.total_tokens, 'total_tokens');
  if (totalTokens != null && inputTokens != null && outputTokens != null && totalTokens !== inputTokens + outputTokens) {
    throw new Error('total_tokens does not equal input_tokens + output_tokens');
  }
  if (envelope.cost_usd != null && (typeof envelope.cost_usd !== 'number' || envelope.cost_usd < 0)) {
    throw new Error('cost_usd must be non-negative or null');
  }
  return {
    output,
    output_digest: sha256(outputBytes),
    output_size_bytes: outputBytes.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    cost_usd: envelope.cost_usd ?? null,
    cost_source: envelope.cost_usd == null ? 'UNKNOWN' : 'PROVIDER_REPORTED',
    raw_response_digest: sha256(rawBytes),
    raw_response_size_bytes: rawBytes.length,
  };
}

export async function executeRequest(request, repoRoot, adapter = mockProvider) {
  const manifest = await buildContextManifest(request, repoRoot);
  const contextManifestCanonical = canonicalJson(manifest);
  const manifestBytes = Buffer.from(contextManifestCanonical, 'utf8');
  const modelInput = buildModelInput(manifest);
  const prepared = {
    manifest,
    context_manifest_canonical: contextManifestCanonical,
    context_digest: sha256(manifestBytes),
    input_digest: sha256(modelInput),
    provider: request.provider ?? 'MOCK',
    model: request.model ?? 'mock-deterministic-v1',
  };
  try {
    const rawResponse = await adapter(modelInput, {
      model: prepared.model,
      output: request.mock_output,
      usage: request.mock_usage,
      cost_usd: request.mock_cost_usd,
      fail: request.mock_fail,
    });
    return { state: 'COMPLETED', prepared, raw_response: rawResponse, result: normalizeProviderResponse(rawResponse) };
  } catch (error) {
    return { state: 'FAILED', prepared, failure_code: error.code ?? 'PROVIDER_FAILURE', error: error.message };
  }
}

async function main(argv) {
  if (argv.length !== 4) throw new Error('usage: node tools/anc001_ai_run.mjs REQUEST.json RESULT.json RAW_RESPONSE.bin');
  const [requestPath, resultPath, rawPath] = argv.slice(1);
  const request = JSON.parse(await readFile(requestPath, 'utf8'));
  if ((request.provider ?? 'MOCK') !== 'MOCK') throw new Error('only the deterministic MOCK provider is enabled');
  const execution = await executeRequest(request, process.cwd());
  if (execution.raw_response) await writeFile(rawPath, execution.raw_response);
  const serializable = { ...execution };
  delete serializable.raw_response;
  await writeFile(resultPath, `${JSON.stringify(serializable, null, 2)}\n`);
  if (execution.state === 'FAILED') process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(1)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
