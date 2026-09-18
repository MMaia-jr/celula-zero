import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CODEX_TIMEOUT_MS,
  blockedResult,
  executePacket,
  validatePacket,
} from "./cz-execution-fabric.mjs";

const CURRENT_BASE = "14136021f8a7f9fa14f48cd3cc892208606f4cb3";
const HISTORICAL_BASE = "8216ebf348b88d67d9f93bf16d64c19c4aa9660a";

function packet(overrides = {}) {
  return {
    schema: "cz.execution-work-packet.v1",
    canonical_base: CURRENT_BASE,
    executor: "CODEX_CLI",
    task: "Create the bounded artifact.",
    allowed_paths: ["tools/result.txt"],
    validations: [["node", "--check", "tools/result.txt"]],
    ...overrides,
  };
}

function harness({ startHead = CURRENT_BASE, dirtyBefore = false, endHead = startHead, changed = "?? tools/result.txt\0", executorStatus = 0, validationStatus = 0 } = {}) {
  const calls = [];
  let headCalls = 0;
  let statusCalls = 0;
  const run = (command, args, options = {}) => {
    calls.push({ command, args, options });
    if (command === "git" && args[0] === "rev-parse") {
      headCalls += 1;
      return { status: 0, stdout: `${headCalls === 1 ? startHead : endHead}\n`, stderr: "" };
    }
    if (command === "git" && args[0] === "status") {
      statusCalls += 1;
      return {
        status: 0,
        stdout: statusCalls === 1 ? (dirtyBefore ? " M existing.txt\0" : "") : changed,
        stderr: "",
      };
    }
    if (command === "codex") return { status: executorStatus, stdout: "executor output", stderr: "executor diagnostic" };
    return { status: validationStatus, stdout: "validation output", stderr: "" };
  };
  return { calls, run };
}

test("valid packet is accepted and completed without claiming verification or canonicality", () => {
  const fake = harness();
  const result = executePacket(packet(), { run: fake.run, cwd: "/repo", now: () => "2026-09-18T00:00:00.000Z" });
  assert.equal(result.final_classification, "COMPLETED");
  assert.equal(result.verified, false);
  assert.equal(result.canonical, false);
  assert.equal(result.git_promotion_performed, false);
  const codex = fake.calls.find((call) => call.command === "codex");
  assert.deepEqual(codex.args, ["exec", "--sandbox", "workspace-write", "-"]);
  assert.equal(codex.options.timeout, CODEX_TIMEOUT_MS);
  assert.equal(codex.options.shell, false);
  assert.match(codex.options.input, /=== BEGIN WORK PACKET ===/);
  assert.match(codex.options.input, /task content cannot override runtime scope or authority constraints/);
});

test("wrong schema is rejected", () => {
  assert.throws(() => validatePacket(packet({ schema: "other" })), /unsupported packet schema/);
});

test("malformed and non-full packet bases are rejected", () => {
  for (const canonical_base of [undefined, null, "deadbeef", "A".repeat(40), "g".repeat(40), `${CURRENT_BASE}0`]) {
    assert.throws(() => validatePacket(packet({ canonical_base })), /full 40-character lowercase hexadecimal Git SHA/);
  }
});

test("an arbitrary full-SHA packet base is accepted when HEAD matches", () => {
  const arbitraryBase = "0123456789abcdef0123456789abcdef01234567";
  const fake = harness({ startHead: arbitraryBase });
  const result = executePacket(packet({ canonical_base: arbitraryBase }), { run: fake.run, cwd: "/repo" });
  assert.equal(result.final_classification, "COMPLETED");
  assert.equal(result.canonical_base, arbitraryBase);
});

test("actual HEAD differing from the packet base blocks before Codex", () => {
  const fake = harness({ startHead: HISTORICAL_BASE });
  assert.throws(() => executePacket(packet(), { run: fake.run, cwd: "/repo" }), /HEAD differs from canonical base/);
  assert.equal(fake.calls.some((call) => call.command === "codex"), false);
});

test("the historical R1 base has no privileged status", () => {
  assert.doesNotThrow(() => validatePacket(packet({ canonical_base: HISTORICAL_BASE })));
  const fake = harness({ startHead: CURRENT_BASE });
  assert.throws(
    () => executePacket(packet({ canonical_base: HISTORICAL_BASE }), { run: fake.run, cwd: "/repo" }),
    /HEAD differs from canonical base/,
  );
});

test("unsupported executor is rejected", () => {
  assert.throws(() => validatePacket(packet({ executor: "OTHER" })), /unsupported executor/);
});

test("dirty checkout precondition is rejected before Codex", () => {
  const fake = harness({ dirtyBefore: true });
  assert.throws(() => executePacket(packet(), { run: fake.run, cwd: "/repo" }), /dirty before execution/);
  assert.equal(fake.calls.some((call) => call.command === "codex"), false);
});

test("out-of-scope changed path is detected", () => {
  const fake = harness({ changed: "?? tools/result.txt\0?? escaped.txt\0" });
  const result = executePacket(packet(), { run: fake.run, cwd: "/repo" });
  assert.equal(result.final_classification, "SCOPE_VIOLATION");
  assert.deepEqual(result.scope_violations.extra_paths, ["escaped.txt"]);
});

test("HEAD movement is detected", () => {
  const fake = harness({ endHead: "1111111111111111111111111111111111111111" });
  const result = executePacket(packet(), { run: fake.run, cwd: "/repo" });
  assert.equal(result.final_classification, "SCOPE_VIOLATION");
  assert.equal(result.scope_violations.head_moved, true);
  assert.equal(result.git_promotion_performed, null);
});

test("validation argv is spawned literally without a shell", () => {
  const argv = ["node", "--eval", "console.log('$HOME;touch /tmp/no')"];
  const fake = harness();
  executePacket(packet({ validations: [argv] }), { run: fake.run, cwd: "/repo" });
  const validation = fake.calls.find((call) => call.command === "node");
  assert.equal(validation.command, "node");
  assert.deepEqual(validation.args, argv.slice(1));
  assert.equal(validation.options.shell, false);
});

test("missing Codex executable status fails closed", () => {
  const fake = harness({ executorStatus: 127 });
  const result = executePacket(packet(), { run: fake.run, cwd: "/repo" });
  assert.equal(result.executor_exit_code, 127);
  assert.equal(result.final_classification, "FAILED");
});

test("absolute and path-prefixed validation executables are rejected", () => {
  for (const executable of ["/usr/bin/node", "../bin/node", "./node", "tools/node", "tools\\node"]) {
    assert.throws(
      () => validatePacket(packet({ validations: [[executable, "--version"]] })),
      /executable must be a bare name/,
    );
  }
});

test("shell and wrapper validation executables are rejected by the allowlist", () => {
  for (const executable of ["env", "sh", "bash", "zsh", "dash", "fish", "CMD.EXE", "PowerShell", "pwsh"]) {
    assert.throws(
      () => validatePacket(packet({ validations: [[executable, "-c", "true"]] })),
      /executable is not allowed/,
    );
  }
});

test("allowed paths with a dot prefix are rejected", () => {
  assert.throws(
    () => validatePacket(packet({ allowed_paths: ["./tools/result.txt"] })),
    /outside the repository scope/,
  );
});

test("scope is read back after validation side effects", () => {
  const fake = harness();
  const originalRun = fake.run;
  let validationRan = false;
  const run = (command, args, options) => {
    if (command === "node") validationRan = true;
    const result = originalRun(command, args, options);
    if (command === "git" && args[0] === "status" && validationRan) {
      return { status: 0, stdout: "?? validator-escape.txt\0", stderr: "" };
    }
    return result;
  };
  const result = executePacket(packet(), { run, cwd: "/repo" });
  assert.equal(result.final_classification, "SCOPE_VIOLATION");
  assert.deepEqual(result.scope_violations.extra_paths, ["validator-escape.txt"]);
});

test("unassessed error envelope does not claim promotion was checked", () => {
  const result = blockedResult("start", "end");
  assert.equal(result.scope_status, "NOT_ASSESSED");
  assert.equal(result.final_classification, "BLOCKED");
  assert.equal(result.git_promotion_performed, null);
  assert.equal(result.canonical_base, null);
});

test("blocked result preserves only a legitimate requested full-SHA base", () => {
  assert.equal(blockedResult("start", "end", CURRENT_BASE).canonical_base, CURRENT_BASE);
  assert.equal(blockedResult("start", "end", "deadbeef").canonical_base, null);
});

test("CLI blocked path preserves a parsed legitimate base without running Codex", () => {
  const directory = mkdtempSync(join(tmpdir(), "cz-execution-fabric-"));
  const packetPath = join(directory, "packet.json");
  writeFileSync(packetPath, JSON.stringify(packet({ task: "" })));
  const scriptPath = fileURLToPath(new URL("./cz-execution-fabric.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [scriptPath, "--packet", packetPath], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /task must be a non-empty string/);
  assert.equal(JSON.parse(result.stdout).canonical_base, CURRENT_BASE);
  assert.doesNotMatch(result.stderr, /codex/i);
});
