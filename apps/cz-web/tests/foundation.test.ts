// SPDX-License-Identifier: MPL-2.0
import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  seedFoundation,
  applyCommand,
  projection,
  commandSchema,
  actorFor,
} from "../lib/foundation";
import { LocalStore } from "../lib/local-store";
import {
  canAct,
  canDelegate,
  type Mandate,
  type Delegation,
} from "@cz/authority";
import { appendRecord } from "@cz/records";
import { resolvePerson, type PersonId } from "@cz/identity";
import { requireHulyCapability } from "@cz/platform-huly";
const now = "2026-09-30T12:00:00.000Z",
  other = "other-person" as PersonId;
const seed = () => seedFoundation(randomUUID, now);
const experience = {
  type: "experience",
  title: "Primeira colaboração",
  description: "Produzi uma proposta e registrei o aprendizado.",
  occurredOn: "2026-09-29",
} as const;
describe("Institutional boundaries", () => {
  it("separates provider credential, Person, Profile and Cell", () => {
    const s = seed();
    expect(
      new Set([s.person.id, s.profile.id, s.cell.id, s.credentials[0]?.id])
        .size,
    ).toBe(4);
    expect(actorFor(s, "local-foundation", "founder-fixture")).toBe(
      s.person.id,
    );
    expect(s.relations.map((r) => r.kind)).toEqual(["founder", "steward"]);
  });
  it("fails ambiguous and revoked identity resolution", () => {
    const s = seed();
    expect(() =>
      resolvePerson(
        [...s.credentials, { ...s.credentials[0]!, personId: other }],
        "local-foundation",
        "founder-fixture",
      ),
    ).toThrow("IDENTITY_UNRESOLVED");
    s.credentials[0]!.status = "revoked";
    expect(() => actorFor(s, "local-foundation", "founder-fixture")).toThrow();
  });
  it("preserves original input separately from the experience projection", () => {
    const s = seed(),
      n = applyCommand(
        s,
        s.person.id,
        experience,
        randomUUID(),
        randomUUID,
        now,
      );
    expect(s.experiences).toHaveLength(0);
    expect(n.experiences[0]?.provenance.origin).toBe("user_reported");
    expect(
      n.records.find((r) => r.id === n.experiences[0]?.sourceRecordId)?.kind,
    ).toBe("OriginalRecord");
    expect(n.experiences[0]?.visibility).toEqual({
      scope: "private",
      ownerId: s.person.id,
    });
  });
  it("does not accept spoofed authorship or epistemic promotion", () => {
    expect(() =>
      commandSchema.parse({ ...experience, personId: other }),
    ).toThrow();
    expect(() =>
      commandSchema.parse({ ...experience, origin: "verified" }),
    ).toThrow();
  });
  it("rejects another actor", () => {
    const s = seed();
    expect(() =>
      applyCommand(s, other, experience, randomUUID(), randomUUID, now),
    ).toThrow("FORBIDDEN");
    expect(() => projection(s, other)).toThrow("FORBIDDEN");
  });
  it("requires active, same-cell authority", () => {
    const s = seed();
    expect(
      canAct(
        s.person.id,
        s.cell.id,
        "cell.update",
        s.memberships,
        s.authorities,
      ),
    ).toBe(true);
    expect(
      canAct(
        s.person.id,
        "another-cell",
        "cell.update",
        s.memberships,
        s.authorities,
      ),
    ).toBe(false);
    s.memberships[0]!.status = "revoked";
    expect(() =>
      applyCommand(
        s,
        s.person.id,
        { type: "cell", purpose: "Outro propósito" },
        randomUUID(),
        randomUUID,
        now,
      ),
    ).toThrow("FORBIDDEN");
    expect(projection(s, s.person.id).cell).toBeNull();
    expect(projection(s, s.person.id).records).toHaveLength(0);
  });
  it("does not equate participation or relation with authority", () => {
    const s = seed();
    expect(s.relations.length).toBe(2);
    expect(
      canAct(s.person.id, s.cell.id, "cell.update", [], s.authorities),
    ).toBe(false);
  });
  it("retains prior originals when profile changes", () => {
    const s = seed(),
      a = applyCommand(
        s,
        s.person.id,
        { type: "profile", headline: "Primeiro", bio: "" },
        randomUUID(),
        randomUUID,
        now,
      ),
      b = applyCommand(
        a,
        s.person.id,
        { type: "profile", headline: "Segundo", bio: "" },
        randomUUID(),
        randomUUID,
        now,
      );
    expect(b.profile.headline).toBe("Segundo");
    expect(b.records[1]).toEqual(a.records[1]);
    expect(b.records).toHaveLength(3);
  });
  it("cannot overwrite an OriginalRecord or invent interpretation source", () => {
    const s = seed();
    expect(() => appendRecord(s.records, s.records[0]!)).toThrow(
      "RECORD_IMMUTABLE",
    );
    expect(() =>
      appendRecord(s.records, {
        ...s.records[0]!,
        id: "new",
        kind: "Interpretation",
        sourceId: "missing",
        generatorId: "agent",
        content: "inferred",
      }),
    ).toThrow("SOURCE_MISSING");
  });
  it("external references stay unverified and never grant authority", () => {
    const s = seed(),
      n = applyCommand(
        s,
        s.person.id,
        {
          type: "external_identity",
          provider: "GitHub",
          url: "https://github.com/example",
        },
        randomUUID(),
        randomUUID,
        now,
      );
    expect(n.externalIdentities[0]?.ownership).toBe("unverified");
    expect(n.credentials).toEqual(s.credentials);
    expect(n.authorities).toEqual(s.authorities);
  });
  it.each([
    "javascript:alert(1)",
    "http://example.com",
    "https://user:secret@example.com",
  ])("rejects unsafe external URL %s", (url) => {
    expect(() =>
      commandSchema.parse({ type: "external_identity", provider: "Web", url }),
    ).toThrow();
  });
  it("rejects invalid dates and blank content", () => {
    expect(() =>
      commandSchema.parse({ ...experience, occurredOn: "2026-02-30" }),
    ).toThrow();
    expect(() =>
      commandSchema.parse({ type: "intention", content: "   " }),
    ).toThrow();
  });
  it("retries are idempotent and conflicting replay fails", () => {
    const s = seed(),
      key = randomUUID(),
      a = applyCommand(s, s.person.id, experience, key, randomUUID, now),
      b = applyCommand(a, s.person.id, experience, key, randomUUID, now);
    expect(b).toEqual(a);
    expect(() =>
      applyCommand(
        a,
        s.person.id,
        { ...experience, title: "changed" },
        key,
        randomUUID,
        now,
      ),
    ).toThrow("REQUEST_KEY_CONFLICT");
  });
  it("never exports credential or session material", () => {
    const s = seed(),
      v = projection(s, s.person.id);
    expect(v).not.toHaveProperty("credentials");
    expect(v).not.toHaveProperty("receipts");
    expect(v).not.toHaveProperty("sessions");
  });
  it("does not broaden delegation beyond mandate, time or grantee", () => {
    const s = seed();
    const m: Mandate = {
      id: "m",
      personId: s.person.id,
      cellId: s.cell.id,
      permissions: ["cell.read"],
      startsAt: "2026-09-29",
      expiresAt: "2026-10-02",
      revoked: false,
      decisionRecordId: "decision",
    };
    const d: Delegation = {
      id: "d",
      mandateId: "m",
      grantorId: s.person.id,
      granteeId: other,
      permissions: ["cell.read"],
      expiresAt: "2026-10-01",
      revoked: false,
    };
    expect(canDelegate(m, d, now)).toBe(true);
    expect(canDelegate(m, { ...d, permissions: ["cell.update"] }, now)).toBe(
      false,
    );
    expect(canDelegate({ ...m, revoked: true }, d, now)).toBe(false);
    expect(canDelegate(m, { ...d, expiresAt: "2026-11-01" }, now)).toBe(false);
    expect(canDelegate(m, d, "2026-10-03")).toBe(false);
  });
  it("Huly candidate cannot falsely report successful operations", () => {
    expect(() => requireHulyCapability("storage")).toThrow("PROPERTY_GAP");
  });
});
describe("Durable local adapter", () => {
  it("survives close/reopen, seed is stable, session revocation persists", () => {
    const dir = mkdtempSync(join(tmpdir(), "cz-foundation-test-")),
      path = join(dir, "state.sqlite");
    try {
      let db = new LocalStore(path);
      const initial = db.read(),
        token = db.createSession();
      db.transact((s) => ({
        state: applyCommand(
          s,
          s.person.id,
          experience,
          randomUUID(),
          randomUUID,
          now,
        ),
        result: null,
      }));
      db.close();
      db = new LocalStore(path);
      expect(db.read().person.id).toBe(initial.person.id);
      expect(db.read().experiences).toHaveLength(1);
      expect(db.session(token)).toBe(true);
      db.revoke(token);
      expect(db.session(token)).toBe(false);
      expect(db.session("forged")).toBe(false);
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("rolls back rejected operations including their original record", () => {
    const db = new LocalStore(":memory:");
    try {
      const before = db.read();
      expect(() =>
        db.transact((s) => {
          applyCommand(
            s,
            s.person.id,
            experience,
            randomUUID(),
            randomUUID,
            now,
          );
          throw new Error("cancel");
        }),
      ).toThrow();
      expect(db.read()).toEqual(before);
    } finally {
      db.close();
    }
  });
  it("two connections preserve independent writes and retry receipt", () => {
    const dir = mkdtempSync(join(tmpdir(), "cz-foundation-test-")),
      path = join(dir, "state.sqlite");
    const a = new LocalStore(path),
      b = new LocalStore(path),
      key = randomUUID();
    try {
      a.transact((s) => ({
        state: applyCommand(s, s.person.id, experience, key, randomUUID, now),
        result: null,
      }));
      b.transact((s) => ({
        state: applyCommand(
          s,
          s.person.id,
          { type: "intention", content: "Continuar amanhã" },
          randomUUID(),
          randomUUID,
          now,
        ),
        result: null,
      }));
      a.transact((s) => ({
        state: applyCommand(s, s.person.id, experience, key, randomUUID, now),
        result: null,
      }));
      expect(b.read().experiences).toHaveLength(1);
      expect(b.read().records).toHaveLength(3);
    } finally {
      a.close();
      b.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
it("domain packages do not import provider, UI or persistence implementations", () => {
  const root = resolve("../../packages");
  for (const name of [
    "identity",
    "presence",
    "cells",
    "authority",
    "records",
  ]) {
    for (const file of readdirSync(join(root, name, "src"))) {
      const source = readFileSync(join(root, name, "src", file), "utf8");
      expect(source).not.toMatch(
        /from ["'](?:@hcengineering|@supabase|next|react|node:|.*apps\/|@cz\/platform-huly)/,
      );
    }
  }
});
