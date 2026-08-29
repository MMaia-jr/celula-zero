import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildContextManifest, buildModelInput, canonicalJson, sha256 } from './anc001_ai_run.mjs';
import { executeLiveLocalRequest } from './anc002_ollama_adapter.mjs';

const baseRequest = {
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
  provider: 'OLLAMA_LOCAL',
  model: 'local-test-model:1',
};

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'anc002-'));
  await writeFile(join(root, 'bounded.txt'), 'bounded material\n');
  return root;
}

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    await run(server.address().port);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function collectRequest(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
    request.on('error', reject);
  });
}

test('successful request preserves exact raw bytes, ANC provenance, metrics, and unknown cost', async () => {
  const root = await fixture();
  const raw = Buffer.from('{"response":"Bounded synthesis.   ","done":true,"done_reason":"stop","prompt_eval_count":17,"eval_count":5}\n');
  await withServer(async (request, response) => {
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '/api/generate');
    const body = await collectRequest(request);
    const manifest = await buildContextManifest(baseRequest, root);
    assert.deepEqual(body, {
      model: baseRequest.model,
      prompt: buildModelInput(manifest).toString('utf8'),
      stream: false,
      think: false,
      keep_alive: 0,
      options: { temperature: 0, num_predict: 640 },
    });
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(raw);
  }, async (port) => {
    const execution = await executeLiveLocalRequest(baseRequest, root, { port });
    assert.equal(execution.state, 'COMPLETED');
    assert.deepEqual(execution.raw_response, raw);
    assert.equal(execution.result.raw_response_digest, sha256(raw));
    assert.equal(execution.result.raw_response_size_bytes, raw.length);
    assert.equal(execution.prepared.context_manifest_canonical, canonicalJson(execution.prepared.manifest));
    assert.equal(execution.prepared.context_digest, sha256(Buffer.from(execution.prepared.context_manifest_canonical)));
    assert.equal(execution.prepared.input_digest, sha256(buildModelInput(execution.prepared.manifest)));
    assert.deepEqual(
      [execution.result.input_tokens, execution.result.output_tokens, execution.result.total_tokens],
      [17, 5, 22],
    );
    assert.equal(execution.result.cost_usd, null);
    assert.equal(execution.result.cost_source, 'UNKNOWN');
    assert.equal(execution.result.provider, 'OLLAMA_LOCAL');
    assert.equal(execution.result.model, baseRequest.model);
  });
});

async function assertFails(responseBody, statusCode, pattern) {
  const root = await fixture();
  await withServer((_request, response) => {
    response.writeHead(statusCode);
    response.end(responseBody);
  }, async (port) => {
    const execution = await executeLiveLocalRequest(baseRequest, root, { port });
    assert.equal(execution.state, 'FAILED');
    assert.match(execution.error, pattern);
    assert.equal('result' in execution, false);
    assert.equal('raw_response' in execution, false);
  });
}

test('malformed JSON fails closed', () => assertFails('{not-json', 200, /invalid Ollama API JSON/));
test('non-200 fails closed', () => assertFails('{"error":"unavailable"}', 503, /HTTP 503/));
test('done_reason=length fails closed', () => assertFails(
  JSON.stringify({ response: 'partial', done: true, done_reason: 'length' }),
  200,
  /truncated/,
));
test('unexpected thinking fails closed', () => assertFails(
  JSON.stringify({ response: 'answer', thinking: 'hidden reasoning', done: true, done_reason: 'stop' }),
  200,
  /unexpected thinking/,
));

test('provider and model remain runtime metadata and do not alter Actor/context identity', async () => {
  const root = await fixture();
  const seenPrompts = [];
  await withServer(async (request, response) => {
    seenPrompts.push((await collectRequest(request)).prompt);
    response.end(JSON.stringify({ response: 'answer', done: true, prompt_eval_count: 1, eval_count: 1 }));
  }, async (port) => {
    const first = await executeLiveLocalRequest(baseRequest, root, { port });
    const second = await executeLiveLocalRequest({ ...baseRequest, model: 'different-local-model' }, root, { port });
    assert.equal(first.state, 'COMPLETED');
    assert.equal(second.state, 'COMPLETED');
    assert.equal(first.prepared.manifest.agent_actor_id, baseRequest.agent_actor_id);
    assert.equal(second.prepared.manifest.agent_actor_id, baseRequest.agent_actor_id);
    assert.equal(first.prepared.context_digest, second.prepared.context_digest);
    assert.equal(first.prepared.input_digest, second.prepared.input_digest);
    assert.equal(seenPrompts[0], seenPrompts[1]);
    assert.notEqual(first.prepared.model, second.prepared.model);
  });
});

test('invalid token metrics fail closed', () => assertFails(
  JSON.stringify({ response: 'answer', done: true, prompt_eval_count: -1 }),
  200,
  /prompt_eval_count/,
));
