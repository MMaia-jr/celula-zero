#!/usr/bin/env node

import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  buildContextManifest,
  buildModelInput,
  canonicalJson,
  normalizeProviderResponse,
  sha256,
} from './anc001_ai_run.mjs';

export const OLLAMA_PROVIDER = 'OLLAMA_LOCAL';
export const DEFAULT_OLLAMA_PORT = 11434;
export const DEFAULT_NUM_PREDICT = 640;
export const MAX_NUM_PREDICT = 4096;
export const MAX_RAW_RESPONSE_BYTES = 1_048_576;

function requireModel(value) {
  if (typeof value !== 'string' || value.trim().length === 0 || value !== value.trim()) {
    throw Object.assign(new Error('model must be an explicit non-empty string'), { code: 'INVALID_MODEL' });
  }
  return value;
}

function boundedInteger(value, label, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw Object.assign(new Error(`${label} must be an integer from ${minimum} through ${maximum}`), {
      code: 'INVALID_TRANSPORT_OPTION',
    });
  }
  return value;
}

function metric(value, label) {
  if (value == null) return null;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw Object.assign(new Error(`${label} must be a non-negative integer when present`), {
      code: 'INVALID_OLLAMA_RESPONSE',
    });
  }
  return value;
}

function responseError(message, code = 'INVALID_OLLAMA_RESPONSE') {
  return Object.assign(new Error(message), { code });
}

export function validateOllamaResponse(rawBytes, statusCode, requestedModel) {
  if (!Buffer.isBuffer(rawBytes)) rawBytes = Buffer.from(rawBytes);
  if (statusCode !== 200) throw responseError(`local Ollama API returned HTTP ${statusCode}`, 'OLLAMA_HTTP_ERROR');

  let envelope;
  try {
    envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawBytes));
  } catch (error) {
    throw responseError(`invalid Ollama API JSON: ${error.message}`, 'OLLAMA_INVALID_JSON');
  }
  if (envelope === null || Array.isArray(envelope) || typeof envelope !== 'object') {
    throw responseError('Ollama API response must be a JSON object');
  }
  if (envelope.done !== true) throw responseError('Ollama API response is not marked done=true');
  if (envelope.done_reason === 'length') throw responseError('Ollama API response was truncated at num_predict');
  if (typeof envelope.response !== 'string' || envelope.response.trim().length === 0) {
    throw responseError('Ollama API response is empty');
  }
  if (envelope.thinking != null && (typeof envelope.thinking !== 'string' || envelope.thinking.length > 0)) {
    throw responseError('Ollama returned unexpected thinking despite think=false');
  }

  const inputTokens = metric(envelope.prompt_eval_count, 'prompt_eval_count');
  const outputTokens = metric(envelope.eval_count, 'eval_count');
  const totalTokens = inputTokens == null || outputTokens == null ? null : inputTokens + outputTokens;
  const normalizedEnvelope = Buffer.from(canonicalJson({
    provider: OLLAMA_PROVIDER,
    model: requestedModel,
    output: envelope.response,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
    },
    cost_usd: null,
  }), 'utf8');
  const normalized = normalizeProviderResponse(normalizedEnvelope);

  return {
    ...normalized,
    provider: OLLAMA_PROVIDER,
    model: requestedModel,
    cost_usd: null,
    cost_source: 'UNKNOWN',
    raw_response_digest: sha256(rawBytes),
    raw_response_size_bytes: rawBytes.length,
    normalized_envelope_digest: sha256(normalizedEnvelope),
    normalized_envelope_size_bytes: normalizedEnvelope.length,
  };
}

export async function ollamaLocalTransport(modelInput, options = {}) {
  if (!Buffer.isBuffer(modelInput)) modelInput = Buffer.from(modelInput);
  const model = requireModel(options.model);
  const port = boundedInteger(options.port ?? DEFAULT_OLLAMA_PORT, 'port', 1, 65535);
  const numPredict = boundedInteger(options.numPredict ?? DEFAULT_NUM_PREDICT, 'numPredict', 1, MAX_NUM_PREDICT);
  const timeoutMs = boundedInteger(options.timeoutMs ?? 900_000, 'timeoutMs', 1, 3_600_000);
  const requestBytes = Buffer.from(JSON.stringify({
    model,
    prompt: modelInput.toString('utf8'),
    stream: false,
    think: false,
    keep_alive: 0,
    options: { temperature: 0, num_predict: numPredict },
  }), 'utf8');

  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1',
      port,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': requestBytes.length,
        Connection: 'close',
      },
    }, (response) => {
      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_RAW_RESPONSE_BYTES) {
          response.destroy(responseError('Ollama API response exceeds bounded size', 'OLLAMA_RESPONSE_TOO_LARGE'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ statusCode: response.statusCode, rawBytes: Buffer.concat(chunks) }));
      response.on('error', reject);
    });
    request.setTimeout(timeoutMs, () => request.destroy(responseError('local Ollama API timed out', 'OLLAMA_TIMEOUT')));
    request.on('error', (error) => {
      if (!error.code || !String(error.code).startsWith('OLLAMA_')) error.code = 'OLLAMA_TRANSPORT_FAILURE';
      reject(error);
    });
    request.end(requestBytes);
  });
}

export async function executeLiveLocalRequest(request, repoRoot, options = {}) {
  if (request?.provider !== OLLAMA_PROVIDER) {
    throw Object.assign(new Error(`provider must be ${OLLAMA_PROVIDER}`), { code: 'INVALID_PROVIDER' });
  }
  const model = requireModel(request.model);
  const manifest = await buildContextManifest(request, repoRoot);
  const contextManifestCanonical = canonicalJson(manifest);
  const modelInput = buildModelInput(manifest);
  const prepared = {
    manifest,
    context_manifest_canonical: contextManifestCanonical,
    context_digest: sha256(Buffer.from(contextManifestCanonical, 'utf8')),
    input_digest: sha256(modelInput),
    provider: OLLAMA_PROVIDER,
    model,
  };

  try {
    const transport = options.transport ?? ollamaLocalTransport;
    const { statusCode, rawBytes } = await transport(modelInput, {
      model,
      port: options.port,
      numPredict: options.numPredict,
      timeoutMs: options.timeoutMs,
    });
    const result = validateOllamaResponse(rawBytes, statusCode, model);
    return { state: 'COMPLETED', prepared, result, raw_response: rawBytes };
  } catch (error) {
    return {
      state: 'FAILED',
      prepared,
      failure_code: error.code ?? 'OLLAMA_PROVIDER_FAILURE',
      error: error.message,
    };
  }
}

async function main(argv) {
  if (argv.length !== 3) {
    throw new Error('usage: node tools/anc002_ollama_adapter.mjs REQUEST.json RESULT.json RAW_RESPONSE.bin');
  }
  const [requestPath, resultPath, rawPath] = argv;
  const request = JSON.parse(await readFile(requestPath, 'utf8'));
  const execution = await executeLiveLocalRequest(request, process.cwd());
  if (execution.state === 'COMPLETED') await writeFile(rawPath, execution.raw_response);
  const serializable = { ...execution };
  delete serializable.raw_response;
  await writeFile(resultPath, `${JSON.stringify(serializable, null, 2)}\n`);
  if (execution.state === 'FAILED') process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
