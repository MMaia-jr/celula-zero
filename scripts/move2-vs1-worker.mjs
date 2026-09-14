import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const MOCK_OUTPUT = "Deterministic sponsored MOCK synthesis.";
export const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");
export const LOCAL_DB_CONTAINER = "supabase_db_celula-zero-gate-1";

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

function commandSucceeded(spawnImpl, command, args) {
  const result = spawnImpl(command, args, { encoding: "utf8", stdio: "pipe" });
  return !result.error && result.status === 0;
}

export function resolveSqlTransport({
  databaseUrl = process.env.MOVE2_DATABASE_URL,
  psql = "psql",
  container = process.env.MOVE2_DB_CONTAINER || LOCAL_DB_CONTAINER,
  spawnImpl = spawnSync,
} = {}) {
  if (commandSucceeded(spawnImpl, psql, ["--version"])) {
    if (!databaseUrl) throw new Error("MOVE2_DATABASE_URL is required for host psql transport");
    return { kind: "host", command: psql, connectionArgs: [databaseUrl] };
  }
  if (commandSucceeded(spawnImpl, "docker", ["exec", container, "psql", "--version"])) {
    return { kind: "docker", command: "docker", connectionArgs: ["exec", "-i", container, "psql", "-U", "supabase_admin", "-d", "postgres"] };
  }
  throw new Error(`database SQL transport unavailable: neither host psql nor psql in local Supabase container ${container} is reachable`);
}

export function makePsqlExecutor({ databaseUrl = process.env.MOVE2_DATABASE_URL, psql = "psql", container, spawnImpl = spawnSync, transport } = {}) {
  const selected = transport ?? resolveSqlTransport({ databaseUrl, psql, container, spawnImpl });
  return (sql, values = {}) => {
    const wrapped = `begin; set local role move2_vs1_worker; ${sql}; commit;`;
    const variableArgs = Object.entries(values).flatMap(([name, value]) => {
      if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error(`invalid psql variable name: ${name}`);
      return ["-v", `${name}=${String(value)}`];
    });
    const result = spawnImpl(selected.command, [...selected.connectionArgs, "-X", "-qAt", "-v", "ON_ERROR_STOP=1", ...variableArgs], {
      encoding: "utf8",
      input: wrapped,
    });
    if (result.status !== 0) throw new Error((result.stderr || result.stdout || "psql failed").trim());
    const lines = result.stdout.trim().split("\n").filter(Boolean);
    return lines.at(-1) ?? "";
  };
}

export function preflightWorker({ env = process.env, execute = makePsqlExecutor({ databaseUrl: env.MOVE2_DATABASE_URL, container: env.MOVE2_DB_CONTAINER }) } = {}) {
  if (!env.AI_GATEWAY_API_KEY?.trim()) throw new Error("worker preflight failed: AI_GATEWAY_API_KEY is required");
  if (!env.AI_GATEWAY_BASE_URL?.trim()) throw new Error("worker preflight failed: AI_GATEWAY_BASE_URL is required");
  let probe;
  try {
    probe = execute("select 1");
  } catch (error) {
    throw new Error(`worker preflight failed: local database runtime is unreachable (${error.message})`);
  }
  if (probe !== "1") throw new Error("worker preflight failed: local database runtime returned an unexpected SQL probe result");
  return { status: "PASS" };
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
  const preproject = claim.execution_kind === "PREPROJECT_HUMAN";
  const executionId = preproject ? claim.execution_id : claim.job_id;
  const dispatchValues = { job_id: claim.job_id ?? "", execution_id: claim.execution_id ?? "", claim_token: claim.claim_token, fence, message_id: claim.message_id };
  const context = JSON.parse(execute(preproject
    ? "select private.preproject_worker_begin_dispatch(:'execution_id'::uuid,:'claim_token'::uuid,:'fence'::uuid)::text"
    : "select private.move2_worker_begin_dispatch(:'job_id'::uuid,:'claim_token'::uuid,:'fence'::uuid)::text", dispatchValues));
  if (context.provider !== claim.provider) throw new Error("dispatch provider mismatch");
  if (interruptAfterDispatch) {
    execute(preproject
      ? "select private.preproject_worker_mark_uncertain(:'execution_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'message_id'::bigint)"
      : "select private.move2_worker_mark_uncertain(:'job_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'message_id'::bigint)", dispatchValues);
    return { status: "NEEDS_RECONCILIATION", [preproject ? "execution_id" : "job_id"]: executionId };
  }
  if (claim.provider === "MOCK") {
    const digest = sha256(output.trim());
    const size = Buffer.byteLength(output.trim(), "utf8");
    const result = JSON.parse(execute(preproject
      ? "select private.preproject_worker_complete_mock(:'execution_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'output'::text,:'digest'::text,:'message_id'::bigint)::text"
      : "select private.move2_worker_complete_mock(:'job_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'output'::text,:'digest'::text,:'size'::bigint,:'message_id'::bigint)::text", { ...dispatchValues, output, digest, size }));
    return { status: "SUCCEEDED", [preproject ? "execution_id" : "job_id"]: executionId, result };
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
      execute(preproject
        ? "select private.preproject_worker_fail(:'execution_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'failure_code'::text,:'message_id'::bigint)"
        : "select private.move2_worker_fail_provider(:'job_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'failure_code'::text,:'message_id'::bigint)", { ...dispatchValues, failure_code: "GATEWAY_REJECTED" });
      return { status: "FAILED", [preproject ? "execution_id" : "job_id"]: executionId };
    }
    execute(preproject
      ? "select private.preproject_worker_mark_uncertain(:'execution_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'message_id'::bigint)"
      : "select private.move2_worker_mark_uncertain(:'job_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'message_id'::bigint)", dispatchValues);
    return { status: "NEEDS_RECONCILIATION", [preproject ? "execution_id" : "job_id"]: executionId };
  }
  const normalizedOutput = inference.output.trim();
  const digest = sha256(normalizedOutput);
  const size = Buffer.byteLength(normalizedOutput, "utf8");
  const result = JSON.parse(execute(preproject
    ? "select private.preproject_worker_complete_provider(:'execution_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'output'::text,:'digest'::text,:'input_tokens'::bigint,:'output_tokens'::bigint,:'total_tokens'::bigint,nullif(:'actual_cost_usd','')::numeric,:'cost_source'::text,:'message_id'::bigint)::text"
    : "select private.move2_worker_complete_provider(:'job_id'::uuid,:'claim_token'::uuid,:'fence'::uuid,:'output'::text,:'digest'::text,:'size'::bigint,:'input_tokens'::bigint,:'output_tokens'::bigint,:'total_tokens'::bigint,nullif(:'actual_cost_usd','')::numeric,:'cost_source'::text,:'message_id'::bigint)::text", {
    ...dispatchValues, output: normalizedOutput, digest, size,
    input_tokens: inference.inputTokens, output_tokens: inference.outputTokens,
    total_tokens: inference.totalTokens, actual_cost_usd: inference.actualCostUsd ?? "",
    cost_source: inference.costSource,
  }));
  return { status: (result.job_state ?? result.state) === "NEEDS_RECONCILIATION" ? "NEEDS_RECONCILIATION" : "SUCCEEDED", [preproject ? "execution_id" : "job_id"]: executionId, result };
}

export async function main(env = process.env) {
  const execute = makePsqlExecutor({ databaseUrl: env.MOVE2_DATABASE_URL, container: env.MOVE2_DB_CONTAINER });
  preflightWorker({ env, execute });
  const once = env.MOVE2_WORKER_ONCE === "1";
  do {
    const result = await runOnce({ execute });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (once || result.status === "IDLE") return;
  } while (true);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
