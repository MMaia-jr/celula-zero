// SPDX-License-Identifier: MPL-2.0
import { readdirSync, existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";

const DEFAULT_STORE = ".data/foundation.sqlite";
let loggedPath: string | undefined;

export function resolveFoundationStorePath(
  cwd = process.cwd(),
  configuredPath = process.env.CZ_FOUNDATION_DB,
) {
  return resolve(cwd, configuredPath?.trim() || DEFAULT_STORE);
}

function hasInstitutionalState(path: string): boolean {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    if (!tables.some((table) => table.name === "state"))
      throw new Error("CZ_FOUNDATION_STORE_SCHEMA_UNKNOWN");
    const row = db.prepare("SELECT body FROM state WHERE id=1").get() as { body?: string } | undefined;
    if (!row?.body) throw new Error("CZ_FOUNDATION_STORE_STATE_MISSING");
    const state = JSON.parse(row.body) as Record<string, unknown>;
    const hasArrayEntries = [
      "credentials", "relations", "memberships", "roles", "authorities", "experiences",
      "externalIdentities", "receipts", "records", "workItems", "intelligenceTurns",
      "actionRequests", "actionExecutions", "projects", "capabilities",
      "capabilityCandidates", "executionJobs", "agreements",
    ].some((key) => Array.isArray(state[key]) && (state[key] as unknown[]).length > 0);
    return Boolean(state.person || state.profile || state.cell || hasArrayEntries);
  } finally {
    db.close();
  }
}

/**
 * Fail closed when another CZ SQLite store under the app data directory also
 * contains institutional state. Empty legacy files are tolerated and retained.
 */
export function assertNoCompetingFoundationStore(
  selectedPath: string,
  dataDirectory = resolve(process.cwd(), ".data"),
  allowIsolatedTestStore = process.env.CZ_ALLOW_ISOLATED_TEST_STORE === "1",
) {
  if (allowIsolatedTestStore || !existsSync(dataDirectory)) return;
  let names: string[];
  try {
    names = readdirSync(dataDirectory).filter((name) => name.endsWith(".sqlite"));
  } catch {
    throw new Error("CZ_FOUNDATION_STORE_DIRECTORY_UNREADABLE");
  }
  for (const name of names) {
    const candidate = resolve(dataDirectory, name);
    if (candidate === selectedPath || !existsSync(candidate)) continue;
    let competing: boolean;
    try {
      competing = hasInstitutionalState(candidate);
    } catch {
      throw new Error("CZ_FOUNDATION_STORE_COMPETITOR_UNREADABLE");
    }
    if (competing) throw new Error("CZ_FOUNDATION_STORE_DRIFT_DETECTED");
  }
}

export function logFoundationStorePath(path: string) {
  if (loggedPath === path) return;
  loggedPath = path;
  console.info(`[CZ] Local Foundation store: ${path}`);
}
