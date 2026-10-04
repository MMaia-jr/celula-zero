// SPDX-License-Identifier: MPL-2.0
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { bootstrapFoundation, emptyFoundation } from "../lib/foundation";
import { LocalStore } from "../lib/local-store";
import { digestRecoveryValue, parseRecoveryState, recoveryEnvelopeSchema } from "../lib/recovery";

const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });
const snapshot = () => {
  const state = bootstrapFoundation(emptyFoundation(), "huly-account", randomUUID, "2026-10-01T00:00:00.000Z");
  return { schema: "cz.foundation.recovery.v1", exportedAt: "2026-10-02T00:00:00.000Z", state };
};

describe("local Foundation recovery", () => {
  it("accepts a provenance-complete snapshot only for the same authenticated Huly subject", () => {
    const current = emptyFoundation();
    const envelope = recoveryEnvelopeSchema.parse(snapshot());
    const restored = parseRecoveryState(envelope, { provider: "huly", subject: "huly-account" }, current);
    expect(restored.person?.name).toBe("Marcos");
    expect(restored.cell?.name).toBe("Célula Zero");
    expect(restored.records.map((record) => record.kind === "OriginalRecord" ? record.purpose : record.kind)).toEqual(["bootstrap_authorization", "source_observation"]);
    expect(() => parseRecoveryState(envelope, { provider: "huly", subject: "different-account" }, current)).toThrow("RECOVERY_AUTH_ACCOUNT_MISMATCH");
  });

  it("rejects a conflicting Person or Cell rather than merging histories", () => {
    const envelope = recoveryEnvelopeSchema.parse(snapshot());
    const other = bootstrapFoundation(emptyFoundation(), "huly-account", randomUUID, "2026-10-01T00:00:00.000Z");
    expect(() => parseRecoveryState(envelope, { provider: "huly", subject: "huly-account" }, other)).toThrow("RECOVERY_IDENTITY_CONFLICT");
  });

  it("rejects same-identity snapshots with divergent institutional history", () => {
    const envelope = recoveryEnvelopeSchema.parse(snapshot());
    const current = structuredClone(envelope.state) as unknown as ReturnType<typeof bootstrapFoundation>;
    current.records.push({ id: "divergent", kind: "OriginalRecord", purpose: "human_speech", content: "Uma continuação posterior.", authorId: current.person!.id, createdAt: "2026-10-02T00:00:00.000Z", visibility: { scope: "cell", cellId: current.cell!.id } });
    expect(() => parseRecoveryState(envelope, { provider: "huly", subject: "huly-account" }, current)).toThrow("RECOVERY_HISTORY_CONFLICT");
  });

  it("rejects a recovery snapshot whose external grant references a different connection", () => {
    const state = bootstrapFoundation(emptyFoundation(), "huly-account", randomUUID, "2026-10-01T00:00:00.000Z");
    state.connections = [{ id: "github-connection", owner: { kind: "PERSON", id: state.person.id }, provider: "github", status: "PENDING_AUTHORIZATION", createdAt: "2026-10-01T00:00:00.000Z" }];
    state.authorizationGrants = [{ id: "grant", connectionId: "missing-connection", grantedByPersonId: state.person.id, scopes: [], consentRecordId: state.records[0]!.id, grantedAt: "2026-10-01T00:00:00.000Z" }];
    const invalid = recoveryEnvelopeSchema.parse({ schema: "cz.foundation.recovery.v1", exportedAt: "2026-10-02T00:00:00.000Z", state });
    expect(() => parseRecoveryState(invalid, { provider: "huly", subject: "huly-account" }, emptyFoundation())).toThrow("RECOVERY_CONNECTION_FABRIC_INVALID");
  });

  it("backs up the live SQLite state and keeps the snapshot readable", async () => {
    const directory = mkdtempSync(join(tmpdir(), "cz-recovery-backup-")); directories.push(directory);
    const original = join(directory, "foundation.sqlite"), backup = join(directory, "recovery.sqlite");
    const store = new LocalStore(original);
    store.transact((state) => ({ state: bootstrapFoundation(state, "huly-account", randomUUID, "2026-10-01T00:00:00.000Z"), result: null }));
    await store.backupTo(backup);
    const copy = new LocalStore(backup);
    expect(copy.db.prepare("PRAGMA integrity_check").get()).toEqual({ integrity_check: "ok" });
    expect(copy.read().person?.id).toBe(store.read().person?.id);
    copy.close(); store.close();
    expect(readFileSync(backup).byteLength).toBeGreaterThan(0);
  });

  it("restores a validated snapshot into an isolated store and reads the same history after restart", () => {
    const directory = mkdtempSync(join(tmpdir(), "cz-recovery-restore-")); directories.push(directory);
    const sourcePath = join(directory, "source.sqlite"), targetPath = join(directory, "target.sqlite");
    const source = new LocalStore(sourcePath);
    const seeded = bootstrapFoundation(emptyFoundation(), "huly-account", randomUUID, "2026-10-01T00:00:00.000Z");
    source.transact(() => ({ state: seeded, result: null }));
    const exported = recoveryEnvelopeSchema.parse({ schema: "cz.foundation.recovery.v1", exportedAt: "2026-10-02T00:00:00.000Z", state: source.read() });
    const target = new LocalStore(targetPath);
    const validated = parseRecoveryState(exported, { provider: "huly", subject: "huly-account" }, target.read());
    target.transact(() => ({ state: validated, result: null }));
    const expected = digestRecoveryValue(source.read());
    expect(digestRecoveryValue(target.read())).toBe(expected);
    expect(target.db.prepare("PRAGMA integrity_check").get()).toEqual({ integrity_check: "ok" });

    expect(() => target.transact((current) => {
      if (current.person) current.person.name = "incompleto";
      throw new Error("simulated interrupted transaction");
    })).toThrow("simulated interrupted transaction");
    expect(digestRecoveryValue(target.read())).toBe(expected);
    target.close(); source.close();

    const restarted = new LocalStore(targetPath);
    expect(digestRecoveryValue(restarted.read())).toBe(expected);
    expect(restarted.read().person?.name).toBe("Marcos");
    expect(restarted.read().cell?.name).toBe("Célula Zero");
    restarted.close();
  });
});
