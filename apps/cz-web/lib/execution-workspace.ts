// SPDX-License-Identifier: MPL-2.0
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lstat, mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { chmodSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { z } from "zod";
import { taskCapsuleToMarkdown, type TaskCapsule } from "../../web/lib/domain/task-capsule";
import { parseResultPackage, type ResultPackage } from "../../web/lib/domain/result-package";

const execFileAsync = promisify(execFile);
const SHA256 = /^[a-f0-9]{64}$/;
const FULL_SHA = /^[a-f0-9]{40}$/;
const fabricReadbackSchema = z.object({
  schema: z.literal("cz.execution-result.v1"),
  executor: z.literal("CODEX_CLI"),
  canonical_base: z.string().regex(FULL_SHA),
  start_timestamp: z.string().datetime(),
  end_timestamp: z.string().datetime(),
  executor_exit_code: z.number().int().nullable(),
  changed_paths: z.array(z.string().min(1).max(1000)),
  validations: z.array(z.object({ argv: z.array(z.string().min(1)).min(1), exit_code: z.number().int().nullable(), stdout_sha256: z.string().regex(SHA256), stderr_sha256: z.string().regex(SHA256) }).strict()),
  scope_status: z.enum(["WITHIN_SCOPE", "SCOPE_VIOLATION", "NOT_ASSESSED"]),
  scope_violations: z.object({ head_moved: z.boolean().optional(), extra_paths: z.array(z.string()).optional() }).strict().optional(),
  final_classification: z.enum(["COMPLETED", "FAILED", "BLOCKED", "SCOPE_VIOLATION"]),
  executor_stdout_sha256: z.string().regex(SHA256),
  executor_stderr_sha256: z.string().regex(SHA256),
  git_promotion_performed: z.literal(false).nullable(),
  verified: z.literal(false),
  canonical: z.literal(false),
}).strict();
const validationsSchema = z.array(z.array(z.string().min(1).max(500)).min(1).max(16)).min(1).max(8);
export const executionPlanSchema = z.object({
  canonicalBase: z.string().regex(FULL_SHA),
  allowedPaths: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
  validations: validationsSchema,
  confirmed: z.literal(true),
}).strict().superRefine((value, context) => {
  if (new Set(value.allowedPaths).size !== value.allowedPaths.length) context.addIssue({ code: "custom", message: "Caminhos permitidos não podem se repetir." });
  for (const path of value.allowedPaths) {
    const normalized = path.replaceAll("\\", "/");
    const parts = normalized.split("/");
    if (normalized.startsWith("/") || normalized.includes("*") || parts.some((part) => !part || part === "." || part === "..")) {
      context.addIssue({ code: "custom", message: "Cada caminho deve apontar para um arquivo exato dentro do repositório." });
    }
    if (parts.some((part) => [".git", "node_modules", ".data", ".next", "dist", "build"].includes(part)) || /(^|\/)(\.env(?:\..*)?|[^/]*(?:secret|credential|token|private[-_.]?key)[^/]*|id_rsa)(\/|$)/i.test(normalized)) {
      context.addIssue({ code: "custom", message: "Caminhos de runtime, dependências e credenciais não podem entrar no escopo de execução." });
    }
  }
});
export type ExecutionPlan = z.infer<typeof executionPlanSchema>;

export interface FabricReadback {
  schema: "cz.execution-result.v1";
  executor: "CODEX_CLI";
  canonical_base: string;
  start_timestamp: string;
  end_timestamp: string;
  executor_exit_code: number | null;
  changed_paths: string[];
  validations: Array<{ argv: string[]; exit_code: number | null; stdout_sha256: string; stderr_sha256: string }>;
  scope_status: "WITHIN_SCOPE" | "SCOPE_VIOLATION" | "NOT_ASSESSED";
  scope_violations?: { head_moved?: boolean; extra_paths?: string[] };
  final_classification: "COMPLETED" | "FAILED" | "BLOCKED" | "SCOPE_VIOLATION";
  executor_stdout_sha256: string;
  executor_stderr_sha256: string;
  git_promotion_performed: false | null;
  verified: false;
  canonical: false;
}

export interface IsolatedExecutionOutput {
  result: ResultPackage;
  fabric: FabricReadback;
  resultDigest: string;
  deltaDigest: string;
  resultFileName: string;
  deltaFileName: string;
}

async function run(command: string, args: string[], cwd: string, options: { input?: string; timeout?: number; env?: NodeJS.ProcessEnv } = {}) {
  return execFileAsync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: options.timeout ?? 15_000,
    maxBuffer: 32 * 1024 * 1024,
    env: options.env,
    shell: false,
  });
}

async function runBinary(command: string, args: string[], cwd: string) {
  const output = await execFileAsync(command, args, { cwd, encoding: null, timeout: 15_000, maxBuffer: 4 * 1024 * 1024, shell: false });
  return output.stdout;
}

function parseStatusZ(output: string) {
  const fields = output.split("\0");
  const paths: string[] = [];
  for (let index = 0; index < fields.length; index += 1) {
    const entry = fields[index]!;
    if (!entry) continue;
    if (entry.length < 4 || entry[2] !== " ") throw new Error("EXECUTION_STATUS_UNREADABLE");
    paths.push(entry.slice(3).replaceAll("\\", "/"));
    if (entry[0] === "R" || entry[0] === "C" || entry[1] === "R" || entry[1] === "C") {
      const original = fields[++index];
      if (!original) throw new Error("EXECUTION_STATUS_UNREADABLE");
      paths.push(original.replaceAll("\\", "/"));
    }
  }
  return [...new Set(paths)].sort();
}

function checkedPath(workspace: string, path: string) {
  const normalized = path.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").some((part) => part === ".." || part === ".")) throw new Error("EXECUTION_PATH_INVALID");
  const full = resolve(workspace, normalized);
  if (relative(workspace, full).startsWith("..")) throw new Error("EXECUTION_PATH_INVALID");
  return full;
}

async function assertNoSymlinkPath(workspace: string, path: string) {
  const full = checkedPath(workspace, path);
  const parts = relative(workspace, full).split(/[\\/]+/);
  let current = workspace;
  for (const part of parts) {
    current = join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error("EXECUTION_PATH_SYMLINK");
    } catch (error) {
      if (error instanceof Error && error.message === "EXECUTION_PATH_SYMLINK") throw error;
      if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
      throw error;
    }
  }
}

function safeIdentifier(value: string) {
  return value.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 80);
}

function executorEnvironment(path: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: process.env.NODE_ENV ?? "production",
    PATH: path,
    HOME: process.env.HOME ?? homedir(),
    TMPDIR: process.env.TMPDIR ?? tmpdir(),
    LANG: process.env.LANG ?? "en_US.UTF-8",
  };
  if (process.env.CODEX_HOME) env.CODEX_HOME = process.env.CODEX_HOME;
  return env;
}

function validateFabricReadback(value: unknown, expectedBase: string): FabricReadback {
  const parsed = fabricReadbackSchema.safeParse(value);
  if (!parsed.success || parsed.data.canonical_base !== expectedBase) throw new Error("EXECUTION_FABRIC_RESULT_INVALID");
  return parsed.data as FabricReadback;
}

export async function executeInIsolatedWorktree(input: {
  repositoryRoot: string;
  canonicalHead: string;
  capsule: TaskCapsule;
  agreement: { id: string; digest: string; expectedResult: string; scope: string; exclusions: string; dependencies: string; evaluationCriterion: string };
  plan: ExecutionPlan;
  resultDirectory?: string;
  now?: () => string;
}): Promise<IsolatedExecutionOutput> {
  const plan = executionPlanSchema.parse(input.plan);
  if (!FULL_SHA.test(input.canonicalHead) || plan.canonicalBase !== input.canonicalHead) throw new Error("EXECUTION_BASE_CHANGED");
  if (!input.agreement.id || !SHA256.test(input.agreement.digest) || !input.agreement.expectedResult.trim() || !input.agreement.scope.trim() || !input.agreement.evaluationCriterion.trim()) throw new Error("EXECUTION_AGREEMENT_INVALID");
  if (input.capsule.digest !== input.capsule.digest.toLowerCase() || !SHA256.test(input.capsule.digest)) throw new Error("TASK_CAPSULE_DIGEST_INVALID");
  const now = input.now ?? (() => new Date().toISOString());
  const tempRoot = await mkdtemp(join(tmpdir(), "cz-execution-workspace-"));
  const workspace = join(tempRoot, "checkout");
  const packetPath = join(tempRoot, "execution-work-packet.json");
  let worktreeAdded = false;
  let preserveTempRoot = false;
  try {
    const readback = await run("git", ["rev-parse", "HEAD"], input.repositoryRoot);
    if (readback.stdout.trim() !== input.canonicalHead) throw new Error("EXECUTION_BASE_CHANGED");
    const packet = {
      schema: "cz.execution-work-packet.v1",
      canonical_base: plan.canonicalBase,
      executor: "CODEX_CLI",
      agreement: input.agreement,
      task: [
        taskCapsuleToMarkdown(input.capsule),
        "\n## Human-defined Agreement (supplements, does not replace the accepted Commitment)",
        `- Agreement id: ${input.agreement.id}`,
        `- Agreement digest: ${input.agreement.digest}`,
        `- Expected result: ${input.agreement.expectedResult}`,
        `- Scope: ${input.agreement.scope}`,
        `- Exclusions: ${input.agreement.exclusions}`,
        `- Dependencies: ${input.agreement.dependencies}`,
        `- Human evaluation criterion: ${input.agreement.evaluationCriterion}`,
        "- Economic boundary: no obligation, settlement, or fund movement is authorized.",
        "\n## Explicit human execution scope",
        `- Canonical base: ${plan.canonicalBase}`,
        `- Allowed paths: ${plan.allowedPaths.join(", ")}`,
        `- Validation commands: ${JSON.stringify(plan.validations)}`,
        "- Run only in this isolated clean worktree; do not touch the Habitat worktree.",
      ].join("\n"),
      allowed_paths: plan.allowedPaths,
      validations: plan.validations,
    };
    await writeFile(packetPath, JSON.stringify(packet, null, 2), { mode: 0o600 });
    await run("git", ["worktree", "add", "--detach", workspace, plan.canonicalBase], input.repositoryRoot, { timeout: 60_000 });
    worktreeAdded = true;
    await Promise.all(plan.allowedPaths.map((path) => assertNoSymlinkPath(workspace, path)));

    const fabricScript = join(workspace, "tools", "cz-execution-fabric.mjs");
    const codexPath = process.env.CZ_CODEX_BIN ?? join(homedir(), ".local", "bin", "codex");
    const cliBin = join(tempRoot, "cli-bin");
    await mkdir(cliBin, { mode: 0o700 });
    await symlink(resolve(codexPath), join(cliBin, "codex"));
    const executionPath = [cliBin, process.env.PATH ?? ""].filter(Boolean).join(":");
    let stdout = "";
    try {
      const output = await run(process.execPath, [fabricScript, "--packet", packetPath], workspace, {
        timeout: 31 * 60 * 1000,
        env: executorEnvironment(executionPath),
      });
      stdout = output.stdout;
    } catch (error) {
      const child = error as NodeJS.ErrnoException & { stdout?: string };
      stdout = child.stdout ?? "";
      if (!stdout.trim()) throw new Error(child.code === "ETIMEDOUT" ? "EXECUTION_TIMEOUT" : "EXECUTION_FABRIC_UNAVAILABLE");
    }
    const fabric = validateFabricReadback(JSON.parse(stdout.trim()), plan.canonicalBase);
    const changedPaths = parseStatusZ((await run("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], workspace)).stdout);
    const allowed = new Set(plan.allowedPaths);
    const extraPaths = changedPaths.filter((path) => !allowed.has(path));
    const endHead = (await run("git", ["rev-parse", "HEAD"], workspace)).stdout.trim();
    if (endHead !== plan.canonicalBase || extraPaths.length > 0) {
      fabric.scope_status = "SCOPE_VIOLATION";
      fabric.final_classification = "SCOPE_VIOLATION";
      fabric.scope_violations = { head_moved: endHead !== plan.canonicalBase, extra_paths: extraPaths };
    }

    const deltaFiles = await Promise.all(changedPaths.filter((path) => allowed.has(path)).map(async (path) => {
      await assertNoSymlinkPath(workspace, path);
      const fullPath = checkedPath(workspace, path);
      let before: Buffer | null = null;
      try { before = await runBinary("git", ["show", `${plan.canonicalBase}:${path}`], workspace); } catch { /* New file in the isolated worktree. */ }
      let after: Buffer | null = null;
      try {
        if ((await stat(fullPath)).size > 1_000_000) throw new Error("EXECUTION_ARTIFACT_TOO_LARGE");
        after = await readFile(fullPath);
      } catch (error) {
        if (error instanceof Error && error.message === "EXECUTION_ARTIFACT_TOO_LARGE") throw error;
        /* A deleted file has no after content. */
      }
      if ((before?.byteLength ?? 0) > 1_000_000 || (after?.byteLength ?? 0) > 1_000_000) throw new Error("EXECUTION_ARTIFACT_TOO_LARGE");
      return {
        path,
        change: before === null ? "ADDED" : after === null ? "DELETED" : "MODIFIED",
        beforeSha256: before ? createHash("sha256").update(before).digest("hex") : null,
        afterSha256: after ? createHash("sha256").update(after).digest("hex") : null,
        afterBase64: after?.toString("base64") ?? null,
      };
    }));
    const delta = { schema: "cz.execution-delta.v1", canonicalBase: plan.canonicalBase, taskCapsuleDigest: input.capsule.digest, files: deltaFiles };
    const deltaBody = JSON.stringify(delta, null, 2);
    const deltaDigest = createHash("sha256").update(deltaBody).digest("hex");
    const validations = fabric.validations.map((check) => ({
      name: check.argv.join(" "),
      status: check.exit_code === 0 ? "PASS" as const : check.exit_code === null ? "NOT_RUN" as const : "FAIL" as const,
      ...(check.exit_code === null ? {} : { details: `exit_code=${check.exit_code}; stdout_sha256=${check.stdout_sha256}; stderr_sha256=${check.stderr_sha256}` }),
    }));
    const result = parseResultPackage({
      schema: "cz.result-package.v1",
      taskCapsuleDigest: input.capsule.digest,
      executor: { id: "executor:codex-cli", label: "Codex CLI via CZ Execution Fabric" },
      status: fabric.final_classification === "COMPLETED" ? "EXECUTED" : fabric.final_classification === "BLOCKED" ? "BLOCKED" : "ABORTED",
      whatHappened: `Execution Fabric ${fabric.final_classification.toLowerCase()} em workspace isolado na base ${plan.canonicalBase}, sob o Acordo ${input.agreement.id}; alterou ${changedPaths.length} caminho(s).`,
      artifacts: [{ uri: `urn:sha256:${deltaDigest}`, digest: deltaDigest, mediaType: "application/vnd.cz.execution-delta+json", description: "Delta isolado com conteúdo e digests antes/depois por caminho permitido." }],
      checksRun: validations,
      claims: [{ statement: `Codex CLI reportou ${fabric.final_classification.toLowerCase()} e o Fabric registrou ${changedPaths.length} caminho(s) alterado(s).`, scope: `Task Capsule ${input.capsule.digest}; Acordo ${input.agreement.id} (${input.agreement.digest}); base ${plan.canonicalBase}; não é Verification nem decisão humana.` }],
      limitations: ["Resultado local do executor, sem revisão independente.", "Testes relatados não verificam utilidade nem correção institucional.", "Nenhuma mudança foi aplicada ao worktree Habitat."],
      unexpectedChanges: extraPaths,
      nextHumanDecision: "Revisar o Result Package e o delta; decidir se a contribuição e o resultado atendem ao Commitment.",
      notDone: ["Nenhum commit, push, PR, merge ou deploy.", "Nenhuma Verification ou decisão humana foi inferida."],
    }, input.capsule.digest);
    const resultBody = JSON.stringify({ result, fabric, deltaDigest, capturedAt: now() }, null, 2);
    const resultDigest = createHash("sha256").update(resultBody).digest("hex");
    const resultDirectory = input.resultDirectory ?? resolve(".data/execution-results");
    await mkdir(resultDirectory, { recursive: true, mode: 0o700 });
    const stem = `${safeIdentifier(input.capsule.packetId)}-${randomUUID()}`;
    const resultFileName = `${stem}.result.json`;
    const deltaFileName = `${stem}.delta.json`;
    const resultFile = join(resultDirectory, resultFileName);
    const deltaFile = join(resultDirectory, deltaFileName);
    await writeFile(deltaFile, deltaBody, { mode: 0o600 });
    await writeFile(resultFile, resultBody, { mode: 0o600 });
    chmodSync(resultFile, 0o600);
    chmodSync(deltaFile, 0o600);
    return { result, fabric, resultDigest, deltaDigest, resultFileName, deltaFileName };
  } finally {
    if (worktreeAdded) {
      try { await run("git", ["worktree", "remove", "--force", workspace], input.repositoryRoot, { timeout: 60_000 }); }
      catch { preserveTempRoot = true; console.warn("CZ_EXECUTION_WORKTREE_CLEANUP_INCOMPLETE"); }
    }
    if (!preserveTempRoot) await rm(tempRoot, { recursive: true, force: true });
  }
}

export const executionResultFileNameSchema = z.string().regex(/^tc-[a-f0-9-]{24,80}-[a-f0-9-]{36}\.(result|delta)\.json$/);
