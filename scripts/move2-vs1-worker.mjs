import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const MOCK_OUTPUT = "Deterministic sponsored MOCK synthesis.";
export const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");

export async function callGateway(envelope, {
  fetchImpl = globalThis.fetch,
  apiKey = process.env.AI_GATEWAY_API_KEY,
  baseUrl = process.env.AI_GATEWAY_BASE_URL,
} = {}) {
  const normalizedApiKey = apiKey?.trim();
  const normalizedBaseUrl = baseUrl?.trim().replace(/\/+$/, "");
  if (!normalizedApiKey) throw new Error("AI_GATEWAY_API_KEY is required");
  if (!normalizedBaseUrl) throw new Error("AI_GATEWAY_BASE_URL is required");
  const gatewayUrl = `${normalizedBaseUrl}/chat/completions`;
  const response = await fetchImpl(gatewayUrl, {
    method: "POST",
    headers: { authorization: `Bearer ${normalizedApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: envelope.model,
      messages: envelope.messages,
      temperature: envelope.temperature,
      max_tokens: envelope.max_tokens,
    }),
  });
  if (!response.ok) {
    const error = new Error(`Gateway HTTP ${response.status}`);
    error.definitive = response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429;
    throw error;
  }
  const body = await response.json();
  const output = body?.choices?.[0]?.message?.content;
  const usage = body?.usage;
  if (typeof output !== "string" || !usage || !Number.isSafeInteger(usage.prompt_tokens)
      || !Number.isSafeInteger(usage.completion_tokens) || !Number.isSafeInteger(usage.total_tokens)) {
    throw new Error("Ambiguous Gateway response");
  }
  const reportedCost = typeof usage.cost === "number" && Number.isFinite(usage.cost) && usage.cost >= 0
    ? usage.cost
    : null;
  return {
    output,
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    actualCostUsd: reportedCost,
    costSource: reportedCost === null ? "UNKNOWN" : "PROVIDER_REPORTED",
  };
}

export function makePsqlExecutor({ databaseUrl = process.env.MOVE2_DATABASE_URL, psql = "psql", spawnImpl = spawnSync } = {}) {
  if (!databaseUrl) throw new Error("MOVE2_DATABASE_URL is required");
  return (sql, values = {}) => {
    const wrapped = `begin; set local role move2_vs1_worker; ${sql}; commit;`;
    const variableArgs = Object.entries(values).flatMap(([name, value]) => {
      if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error(`invalid psql variable name: ${name}`);
      return ["-v", `${name}=${String(value)}`];
    });
    const result = spawnImpl(psql, [databaseUrl, "-X", "-qAt", "-v", "ON_ERROR_STOP=1", ...variableArgs], {
      encoding: "utf8",
      input: wrapped,
    });
    if (result.status !== 0) throw new Error((result.stderr || result.stdout || "psql failed").trim());
    const lines = result.stdout.trim().split("\n").filter(Boolean);
    return lines.at(-1) ?? "";
  };
}

export async function runOnce({
  execute = makePsqlExecutor(),
  output = MOCK_OUTPUT,
  interruptAfterDispatch = false,
  gateway = callGateway,
} = {}) {
  const claimText = execute("select coalesce(private.move2_worker_claim(30)::text,'null')");
  const claim = JSON.parse(claimText);
  if (claim === null) return { status: "IDLE" };
  if (!['MOCK', 'moonshotai'].includes(claim.provider)) throw new Error("provider denied");
  const fence = randomUUID();
  const dispatchValues = { job_id: claim.job_id, claim_token: claim.claim_token, fence, message_id: claim.message_id };
  const context = JSON.parse(execute("select private.move2_worker_begin_dispatch(:'job_id'::uuid,:'claim_token'::uuid,:'fence'::uuid)::text", dispatchValues));
  if (context.provider !== claim.provider) throw new Error("dispatch provider mismatch");
  if (interruptAfterDispatch) {
    execute("select private.move2_worker_mark_uncertain(:'job_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'message_id'::bigint)", dispatchValues);
    return { status: "NEEDS_RECONCILIATION", job_id: claim.job_id };
  }
  if (claim.provider === "MOCK") {
    const digest = sha256(output.trim());
    const size = Buffer.byteLength(output.trim(), "utf8");
    const result = JSON.parse(execute("select private.move2_worker_complete_mock(:'job_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'output'::text,:'digest'::text,:'size'::bigint,:'message_id'::bigint)::text", { ...dispatchValues, output, digest, size }));
    return { status: "SUCCEEDED", job_id: claim.job_id, result };
  }

  if (context.model !== "moonshotai/kimi-k2.6" || typeof context.request_canonical !== "string"
      || sha256(context.request_canonical) !== context.request_digest) {
    throw new Error("durable inference request provenance mismatch");
  }
  const envelope = JSON.parse(context.request_canonical);
  if (envelope.provider !== "moonshotai" || envelope.model !== "moonshotai/kimi-k2.6") {
    throw new Error("durable inference request denied");
  }
  let inference;
  try {
    inference = await gateway(envelope);
  } catch (error) {
    if (error?.definitive === true) {
      execute("select private.move2_worker_fail_provider(:'job_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'failure_code'::text,:'message_id'::bigint)", { ...dispatchValues, failure_code: "GATEWAY_REJECTED" });
      return { status: "FAILED", job_id: claim.job_id };
    }
    execute("select private.move2_worker_mark_uncertain(:'job_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'message_id'::bigint)", dispatchValues);
    return { status: "NEEDS_RECONCILIATION", job_id: claim.job_id };
  }
  const normalizedOutput = inference.output.trim();
  const digest = sha256(normalizedOutput);
  const size = Buffer.byteLength(normalizedOutput, "utf8");
  const result = JSON.parse(execute("select private.move2_worker_complete_provider(:'job_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'output'::text,:'digest'::text,:'size'::bigint,:'input_tokens'::bigint,:'output_tokens'::bigint,:'total_tokens'::bigint,nullif(:'actual_cost_usd','')::numeric,:'cost_source'::text,:'message_id'::bigint)::text", {
    ...dispatchValues, output: normalizedOutput, digest, size,
    input_tokens: inference.inputTokens, output_tokens: inference.outputTokens,
    total_tokens: inference.totalTokens, actual_cost_usd: inference.actualCostUsd ?? "",
    cost_source: inference.costSource,
  }));
  return { status: result.job_state === "NEEDS_RECONCILIATION" ? "NEEDS_RECONCILIATION" : "SUCCEEDED", job_id: claim.job_id, result };
}

export async function main(env = process.env) {
  const once = env.MOVE2_WORKER_ONCE === "1";
  do {
    const result = await runOnce();
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (once || result.status === "IDLE") return;
  } while (true);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
