// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from "vitest";
import { executionPlanSchema } from "../lib/execution-workspace";

const base = "50b4917593b0979d5c218c725038bf89afb1134f";

describe("bounded isolated Codex execution plan", () => {
  it("requires human confirmation, an exact base, exact paths and explicit argv validations", () => {
    expect(executionPlanSchema.safeParse({
      canonicalBase: base,
      allowedPaths: ["apps/cz-web/lib/example.ts"],
      validations: [["npm", "run", "check:vnext"]],
      confirmed: true,
    }).success).toBe(true);
    expect(executionPlanSchema.safeParse({ canonicalBase: base, allowedPaths: ["apps/a.ts"], validations: [], confirmed: true }).success).toBe(false);
    expect(executionPlanSchema.safeParse({ canonicalBase: base, allowedPaths: ["apps/a.ts"], validations: [["npm", "test"]], confirmed: false }).success).toBe(false);
  });

  it("rejects broad, escaping, generated, runtime and credential paths", () => {
    for (const path of ["../secrets.txt", "/tmp/file.ts", "apps/**", "apps/cz-web/.env.local", "apps/cz-web/token-store.ts", "node_modules/pkg/index.js", ".data/foundation.sqlite"]) {
      expect(executionPlanSchema.safeParse({ canonicalBase: base, allowedPaths: [path], validations: [["npm", "test"]], confirmed: true }).success, path).toBe(false);
    }
  });
});
