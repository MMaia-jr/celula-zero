import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const MOCK_OUTPUT = "Deterministic sponsored MOCK synthesis.";
export const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");
export const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;

export function makePsqlExecutor({ databaseUrl = process.env.MOVE2_DATABASE_URL, psql = "psql" } = {}) {
  if (!databaseUrl) throw new Error("MOVE2_DATABASE_URL is required");
  return (sql) => {
    const wrapped = `begin; set local role move2_vs1_worker; ${sql}; commit;`;
    const result = spawnSync(psql, [databaseUrl, "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", wrapped], { encoding: "utf8" });
    if (result.status !== 0) throw new Error((result.stderr || result.stdout || "psql failed").trim());
    const lines = result.stdout.trim().split("\n").filter(Boolean);
    return lines.at(-1) ?? "";
  };
}

export async function runOnce({ execute = makePsqlExecutor(), output = MOCK_OUTPUT, interruptAfterDispatch = false } = {}) {
  const claimText = execute("select coalesce(private.move2_worker_claim(30)::text,'null')");
  const claim = JSON.parse(claimText);
  if (claim === null) return { status: "IDLE" };
  if (claim.provider !== "MOCK") throw new Error("non-MOCK provider denied");
  const fence = randomUUID();
  const context = JSON.parse(execute(`select private.move2_worker_begin_dispatch(${sqlLiteral(claim.job_id)}::uuid,${sqlLiteral(claim.claim_token)}::uuid,${sqlLiteral(fence)}::uuid)::text`));
  if (context.provider !== "MOCK") throw new Error("non-MOCK dispatch denied");
  if (interruptAfterDispatch) {
    execute(`select private.move2_worker_mark_uncertain(${sqlLiteral(claim.job_id)}::uuid,${sqlLiteral(claim.claim_token)}::uuid,${sqlLiteral(fence)}::uuid,${BigInt(claim.message_id)})`);
    return { status: "NEEDS_RECONCILIATION", job_id: claim.job_id };
  }
  const digest = sha256(output.trim());
  const size = Buffer.byteLength(output.trim(), "utf8");
  const result = JSON.parse(execute(`select private.move2_worker_complete_mock(${sqlLiteral(claim.job_id)}::uuid,${sqlLiteral(claim.claim_token)}::uuid,${sqlLiteral(fence)}::uuid,${sqlLiteral(output)}::text,${sqlLiteral(digest)}::text,${size}::bigint,${BigInt(claim.message_id)})::text`));
  return { status: "SUCCEEDED", job_id: claim.job_id, result };
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
