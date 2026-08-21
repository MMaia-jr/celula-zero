import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  migration: resolve(root, "supabase/migrations/20260821190000_gate_1_foundation.sql"),
  seed: resolve(root, "supabase/seed.sql"),
  tests: resolve(root, "supabase/tests/database/gate1.test.sql"),
};

const [migration, seed, tests] = await Promise.all(Object.values(files).map((file) => readFile(file, "utf8")));

const contracts = [
  [migration.includes("create_project_atomic"), "atomic project creation function"],
  [migration.includes("project_intents_append_only"), "append-only project intents"],
  [migration.includes("events_append_only"), "append-only events"],
  [migration.includes("enable row level security"), "RLS enabled"],
  [migration.includes("reconcile_project"), "independent material reconciler"],
  [migration.includes("revoke all on all tables"), "minimum table grants"],
  [migration.includes("active pilot invite required"), "invite-controlled write"],
  [!migration.toLowerCase().includes("service_role_key"), "no privileged client key"],
  [seed.includes("DEMO / SYNTHETIC"), "synthetic seed labeling"],
  [seed.includes("FAIL"), "FAIL counterexample preserved"],
  [tests.includes("pilot A cannot read pilot B draft"), "cross-tenant adversarial test"],
  [tests.includes("failed authorization leaves no orphan event"), "atomic rollback assertion"],
];

const failed = contracts.filter(([passed]) => !passed);
for (const [passed, label] of contracts) {
  process.stdout.write(`${passed ? "PASS" : "FAIL"} ${label}\n`);
}

if (failed.length > 0) process.exitCode = 1;
