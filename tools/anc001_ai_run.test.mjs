import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildContextManifest, canonicalJson, executeRequest, sha256 } from './anc001_ai_run.mjs';

const request = {
  project_id: '10000000-0000-4000-8000-000000000001',
  cycle_id: '10000000-0000-4000-8000-000000000002',
  agent_actor_id: '10000000-0000-4000-8000-000000000003',
  purpose: 'Synthesize bounded cycle material.',
  task: 'Return one attributed synthesis.',
  authority: 'Assist the active DragonCycle; no human authority is delegated.',
  prohibited_inferences: ['Do not infer a Decision.', 'Do not infer Verification.'],
  cycle_records: [{
    id: '10000000-0000-4000-8000-000000000004',
    content_class: 'ORIGINAL_RECORD',
    content_digest: 'a'.repeat(64),
  }],
  repository_paths: ['bounded.txt'],
  provider: 'MOCK',
  model: 'mock-deterministic-v1',
};

const CONFORMANCE_MANIFEST = {
  manifest_version: 'cz.ai-context-vector.v1',
  nested: { z: 'é', a: 1 },
  values: [true, null, 3],
};
const CONFORMANCE_CANONICAL = '{"manifest_version":"cz.ai-context-vector.v1","nested":{"a":1,"z":"é"},"values":[true,null,3]}';
const CONFORMANCE_SHA256 = '630f9802cdc6cd8b13f5962cbc4d8fea1c0ed1034fdf5174721211e6accc2993';

test('versioned cross-runtime canonical context vector matches exact text and SHA-256', () => {
  assert.equal(canonicalJson(CONFORMANCE_MANIFEST), CONFORMANCE_CANONICAL);
  assert.equal(sha256(Buffer.from(CONFORMANCE_CANONICAL, 'utf8')), CONFORMANCE_SHA256);
});

test('equivalent bounded context has an identical canonical digest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'anc001-'));
  await writeFile(join(root, 'bounded.txt'), 'bounded material\n');
  const first = await buildContextManifest(request, root);
  const reordered = { ...request, cycle_records: [...request.cycle_records].reverse() };
  const second = await buildContextManifest(reordered, root);
  assert.equal(sha256(Buffer.from(canonicalJson(first))), sha256(Buffer.from(canonicalJson(second))));
});

test('material file change changes context digest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'anc001-'));
  await writeFile(join(root, 'bounded.txt'), 'first\n');
  const first = await buildContextManifest(request, root);
  await writeFile(join(root, 'bounded.txt'), 'second\n');
  const second = await buildContextManifest(request, root);
  assert.notEqual(sha256(Buffer.from(canonicalJson(first))), sha256(Buffer.from(canonicalJson(second))));
});

test('MOCK execution preserves raw/output provenance and unknown economics', async () => {
  const root = await mkdtemp(join(tmpdir(), 'anc001-'));
  await writeFile(join(root, 'bounded.txt'), 'bounded material\n');
  const execution = await executeRequest({ ...request, mock_output: 'Bounded synthesis.' }, root);
  assert.equal(execution.state, 'COMPLETED');
  assert.equal(execution.prepared.context_manifest_canonical, canonicalJson(execution.prepared.manifest));
  assert.equal(
    execution.prepared.context_digest,
    sha256(Buffer.from(execution.prepared.context_manifest_canonical, 'utf8')),
  );
  assert.equal(execution.result.output_digest, sha256(Buffer.from('Bounded synthesis.')));
  assert.equal(execution.result.raw_response_digest, sha256(execution.raw_response));
  assert.equal(execution.result.input_tokens, null);
  assert.equal(execution.result.cost_usd, null);
  assert.equal(execution.result.cost_source, 'UNKNOWN');
});

test('observed usage is preserved without changing AI identity context', async () => {
  const root = await mkdtemp(join(tmpdir(), 'anc001-'));
  await writeFile(join(root, 'bounded.txt'), 'bounded material\n');
  const execution = await executeRequest({
    ...request,
    model: 'another-runtime-model',
    mock_usage: { input_tokens: 7, output_tokens: 3, total_tokens: 10 },
    mock_cost_usd: 0.01,
  }, root);
  assert.equal(execution.prepared.manifest.agent_actor_id, request.agent_actor_id);
  assert.deepEqual(
    [execution.result.input_tokens, execution.result.output_tokens, execution.result.total_tokens],
    [7, 3, 10],
  );
  assert.equal(execution.result.cost_source, 'PROVIDER_REPORTED');
});

test('provider failure is explicit and fabricates no output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'anc001-'));
  await writeFile(join(root, 'bounded.txt'), 'bounded material\n');
  const execution = await executeRequest({ ...request, mock_fail: true }, root);
  assert.equal(execution.state, 'FAILED');
  assert.equal(execution.failure_code, 'MOCK_PROVIDER_FAILURE');
  assert.equal('result' in execution, false);
  assert.equal('raw_response' in execution, false);
});

test('repository traversal is denied', async () => {
  const root = await mkdtemp(join(tmpdir(), 'anc001-'));
  await assert.rejects(buildContextManifest({ ...request, repository_paths: ['../outside'] }, root), /escapes root/);
});
