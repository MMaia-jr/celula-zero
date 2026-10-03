// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { emptyFoundation } from "../lib/foundation";
import { LocalStore } from "../lib/local-store";
import { assertNoCompetingFoundationStore, resolveFoundationStorePath } from "../lib/foundation-db-path";

describe("durable Foundation store selection", () => {
  it("uses one explicit app-local durable path when the environment override is absent", () => {
    expect(resolveFoundationStorePath("/app", undefined)).toBe("/app/.data/foundation.sqlite");
  });

  it("tolerates but does not replace a preserved empty legacy store", () => {
    const directory = mkdtempSync(join(tmpdir(), "cz-store-path-"));
    const selected = join(directory, "foundation.sqlite");
    const legacy = join(directory, "huly-auth-n1.sqlite");
    const store = new LocalStore(legacy);
    store.close();
    try {
      expect(assertNoCompetingFoundationStore(selected, directory)).toBeUndefined();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("fails closed instead of switching away from a competing institutional state", () => {
    const directory = mkdtempSync(join(tmpdir(), "cz-store-conflict-"));
    const data = join(directory, ".data");
    const selected = join(directory, "alternate", "foundation.sqlite");
    const legacy = join(data, "foundation.sqlite");
    const store = new LocalStore(legacy);
    store.transact((state) => {
      const next = { ...state, ...emptyFoundation(), person: { id: "person-1" as never, name: "Marcos", createdAt: "2026-10-01T00:00:00.000Z" } };
      return { state: next, result: undefined };
    });
    store.close();
    try {
      expect(() => assertNoCompetingFoundationStore(selected, data)).toThrow("CZ_FOUNDATION_STORE_DRIFT_DETECTED");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
