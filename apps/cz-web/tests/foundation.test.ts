// SPDX-License-Identifier: MPL-2.0
import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  seedFoundation,
  emptyFoundation,
  bootstrapFoundation,
  applyCommand,
  projection,
  commandSchema,
  actorFor,
  beginIntelligenceTurn,
  expireStaleIntelligenceTurns,
  failIntelligenceTurn,
  retryIntelligenceTurn,
} from "../lib/foundation";
import { LocalStore } from "../lib/local-store";
import {
  canAct,
  canDelegate,
  type Mandate,
  type Delegation,
} from "@cz/authority";
import {
  appendRecord,
  PROVENANCE_ORIGINS,
  type InstitutionalRecord,
  type Provenance,
} from "@cz/records";
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
  it("recovers an interrupted interpretation without converting its durable conversation message into a record", () => {
    const initial = seed();
    const actor = initial.person.id;
    const pending = beginIntelligenceTurn(initial, actor, "Quero continuar", "request-key-123456", randomUUID, now).state;
    const turn = pending.intelligenceTurns![0]!;
    const message = pending.conversationMessages?.find((item) => item.id === turn.humanMessageId);

    expect(expireStaleIntelligenceTurns(pending, "2026-09-30T12:02:59.999Z")).toBe(pending);
    const recovered = expireStaleIntelligenceTurns(pending, "2026-09-30T12:03:00.000Z");
    expect(recovered.intelligenceTurns![0]).toMatchObject({ status: "unavailable", failureCode: "INTELLIGENCE_PROCESS_INTERRUPTED" });
    expect(recovered.conversationMessages).toContainEqual(message);
    expect(recovered.records.some((record) => record.kind === "OriginalRecord" && record.content === "Quero continuar")).toBe(false);
    expect(recovered.actionRequests ?? []).toHaveLength(0);
    expect(expireStaleIntelligenceTurns(recovered, "2026-09-30T12:04:00.000Z")).toBe(recovered);
  });

  it("retries an unavailable interpretation from its durable message without duplicating the message", () => {
    const initial = seed();
    const actor = initial.person.id;
    const begun = beginIntelligenceTurn(initial, actor, "Onde estamos?", "retry-key-1234567", randomUUID, now);
    const failed = failIntelligenceTurn(begun.state, actor, begun.turn.id, "CODEX_CLI_TIMEOUT");
    const retrying = retryIntelligenceTurn(failed, actor, begun.turn.id);
    expect(retrying.intelligenceTurns).toHaveLength(1);
    expect(retrying.intelligenceTurns![0]).toMatchObject({ id: begun.turn.id, status: "interpreting", failureCode: null });
    expect(retrying.conversationMessages).toHaveLength(1);
    expect(retrying.conversationMessages![0]!.body).toBe("Onde estamos?");
    expect(() => retryIntelligenceTurn(retrying, actor, begun.turn.id)).toThrow("INTELLIGENCE_TURN_ALREADY_RUNNING");
  });

  it("keeps provenance origin separate from Evidence and Verification records", () => {
    const origins: readonly Provenance["origin"][] = PROVENANCE_ORIGINS;
    expect(origins).toEqual([
      "user_reported",
      "source_observed",
      "ai_inferred",
    ]);

    const base = seed().records[0]!;
    const evidence: InstitutionalRecord = {
      ...base,
      id: "evidence-record",
      kind: "Evidence",
      claimId: "claim-record",
      sourceId: base.id,
      rationale: "Source supports the claim.",
    };
    const verification: InstitutionalRecord = {
      ...base,
      id: "verification-record",
      kind: "Verification",
      claimId: "claim-record",
      evidenceIds: [evidence.id],
      method: "human review",
      outcome: "supported",
    };
    expect(evidence.kind).toBe("Evidence");
    expect(verification.kind).toBe("Verification");
  });
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
  it("creates the local N=1 bootstrap once from an authenticated Huly subject", () => {
    const first = bootstrapFoundation(emptyFoundation(), "account-uuid", randomUUID, now);
    expect(first.person.name).toBe("Marcos");
    expect(first.credentials).toHaveLength(1);
    expect(first.credentials[0]).toMatchObject({ provider: "huly", subject: "account-uuid", personId: first.person.id, status: "active" });
    expect(first.cell.name).toBe("Célula Zero");
    expect(first.relations.map((relation) => relation.kind)).toEqual(["founder", "steward"]);
    expect(first.memberships[0]?.personId).toBe(first.person.id);
    expect(first.authorities[0]?.permissions).toEqual(["cell.read", "cell.update"]);
    expect(first.records.filter((record) => record.kind === "OriginalRecord").map((record) => record.purpose)).toEqual(["bootstrap_authorization", "source_observation"]);
    const retry = bootstrapFoundation(first, "account-uuid", randomUUID, "2026-10-01T12:00:00.000Z");
    expect(retry).toBe(first);
    expect(retry.credentials).toHaveLength(1);
    expect(retry.records).toHaveLength(2);
    expect(() => bootstrapFoundation(first, "different-account", randomUUID, now)).toThrow("CZ_FOUNDATION_NOT_EMPTY");
    expect(() => bootstrapFoundation({ ...first, credentials: [...first.credentials, { ...first.credentials[0]!, id: randomUUID() }] }, "account-uuid", randomUUID, now)).toThrow("CZ_IDENTITY_AMBIGUOUS");
  });
  it("fails ambiguous and revoked identity resolution", () => {
    const s = seed();
    expect(() =>
      resolvePerson(
        [...s.credentials, { ...s.credentials[0]!, personId: other }],
        "local-foundation",
        "founder-fixture",
      ),
    ).toThrow("CZ_IDENTITY_AMBIGUOUS");
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
  it("records a Human Decision separately from its OriginalRecord and resolves its authority server-side", () => {
    const s = seed();
    const withHumanSource = applyCommand(s, s.person.id, { type: "intention", content: "Quero preservar a continuidade local da Célula." }, randomUUID(), randomUUID, now);
    const supporting = withHumanSource.records.find((record) => record.kind === "OriginalRecord" && record.purpose === "intention")!;
    const command = { type: "decision", question: "Como continuar o Habitat local?", alternatives: ["Continuar localmente", "Pausar"], selectedAlternative: "Continuar localmente", supportingRecordIds: [supporting.id], mandateChange: "Manter o escopo local, sem promoção.", statement: "Continuar o Habitat local com revisão de contexto.", rationale: "A sessão deve continuar a partir de registros atribuíveis." } as const;
    const key = randomUUID();
    const decided = applyCommand(withHumanSource, s.person.id, command, key, randomUUID, now);
    const source = decided.records.find((record) => record.kind === "OriginalRecord" && record.purpose === "human_decision");
    expect(source).toBeDefined();
    if (!source || source.kind !== "OriginalRecord") throw new Error("Human decision source record missing");
    const decision = decided.records.find((record) => record.kind === "Decision" && record.sourceId === source.id);
    expect(decision).toMatchObject({ kind: "Decision", authorityId: s.authorities[0]?.id, authorId: s.person.id });
    expect(JSON.parse(source.content)).toMatchObject({ statement: command.statement, rationale: command.rationale });
    expect(JSON.parse(source.content)).toMatchObject({ question: command.question, alternatives: command.alternatives, selectedAlternative: command.selectedAlternative, supportingRecordIds: command.supportingRecordIds, mandateChange: command.mandateChange });
    if (!decision || decision.kind !== "Decision") throw new Error("Decision record missing");
    expect(JSON.parse(decision.content)).toMatchObject({ decisionContext: "FOUNDER_N1_NOT_CONSENSUS", supportingRecordIds: command.supportingRecordIds });
    expect(decided.records.some((record) => record.kind === "OriginalRecord" && record.purpose === "governance_mandate" && record.content.includes("RECORDED_ONLY_NO_AUTHORITY_CHANGE"))).toBe(true);
    expect(() => commandSchema.parse({ ...command, selectedAlternative: "Inventada" })).toThrow();
    expect(() => applyCommand(s, s.person.id, { ...command, supportingRecordIds: ["not-a-record"] }, randomUUID(), randomUUID, now)).toThrow("GOVERNANCE_SUPPORTING_RECORD_UNAVAILABLE");
    expect(applyCommand(decided, s.person.id, command, key, randomUUID, now)).toBe(decided);
    expect(() => commandSchema.parse({ ...command, authorityId: "client-spoof" })).toThrow();
    const ambiguous = { ...withHumanSource, authorities: [...withHumanSource.authorities, { ...withHumanSource.authorities[0]!, id: "second-authority" }] };
    expect(() => applyCommand(ambiguous, s.person.id, command, randomUUID(), randomUUID, now)).toThrow("CZ_AUTHORITY_AMBIGUOUS");
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
  it("keeps a human-confirmed Cell work item durable and records its consequence separately", () => {
    const s = seed();
    const active = applyCommand(
      s,
      s.person.id,
      { type: "work_create", title: "Preparar a próxima conversa", context: "Retomar a continuidade da Célula e decidir o próximo passo." },
      randomUUID(),
      randomUUID,
      now,
    );
    expect(active.workItems).toHaveLength(1);
    const work = active.workItems![0]!;
    expect(work).toMatchObject({ cellId: s.cell.id, responsiblePersonId: s.person.id, status: "active" });
    expect(active.records.at(-1)).toMatchObject({ kind: "OriginalRecord", purpose: "work_create", authorId: s.person.id });
    expect(projection(active, s.person.id).workItems).toEqual([work]);

    const completed = applyCommand(
      active,
      s.person.id,
      { type: "work_complete", workItemId: work.id, result: "A próxima conversa ficou preparada.", learning: "Registrar resultado ajuda a continuar sem reconstruir o contexto.", gratitude: "A clareza do contexto ajudou.", unresolvedTension: "Ainda falta uma segunda perspectiva.", nextPossibility: "Convidar alguém para revisar quando houver autoridade e relação legítimas." },
      randomUUID(),
      randomUUID,
      "2026-10-01T20:00:00.000Z",
    );
    expect(completed.workItems?.[0]).toMatchObject({ status: "complete", completedAt: "2026-10-01T20:00:00.000Z" });
    const consequence = completed.records.find((record) => record.kind === "OriginalRecord" && record.purpose === "work_consequence");
    expect(consequence?.kind).toBe("OriginalRecord");
    if (consequence?.kind === "OriginalRecord") {
      expect(consequence.content).toContain(work.title);
      expect(consequence.content).toContain("A próxima conversa ficou preparada.");
      expect(consequence.content).toContain("Registrar resultado ajuda");
      expect(consequence.content).toContain("A clareza do contexto ajudou.");
    }
    expect(completed.records.some((record) => record.kind === "OriginalRecord" && record.purpose === "learning" && record.content.includes("segunda perspectiva"))).toBe(true);
    expect(completed.records.some((record) => record.kind === "OriginalRecord" && record.purpose === "next_possibility" && record.content.includes("revisar"))).toBe(true);
    expect(() => applyCommand(s, other, { type: "work_create", title: "Outro", context: "Sem autoridade" }, randomUUID(), randomUUID, now)).toThrow("FORBIDDEN");
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
  it("starts empty, bootstraps only after confirmation, and resumes the same Person", () => {
    const dir = mkdtempSync(join(tmpdir(), "cz-foundation-test-")),
      path = join(dir, "state.sqlite");
    try {
      let db = new LocalStore(path);
      expect(db.read().person).toBeUndefined();
      const token = db.createSession("huly", "account-uuid");
      const bootstrapped = db.transact((state) => ({
        state: bootstrapFoundation(state, "account-uuid", randomUUID, now),
        result: null,
      }));
      expect(bootstrapped).toBeNull();
      const initial = db.read();
      const personId = initial.person?.id;
      expect(initial.credentials).toHaveLength(1);
      expect(initial.records.filter((record) => record.kind === "OriginalRecord").map((record) => record.purpose)).toEqual([
        "bootstrap_authorization",
        "source_observation",
      ]);
      db.transact((s) => ({
        state: applyCommand(
          s as import("../lib/foundation").Foundation,
          s.person!.id,
          experience,
          randomUUID(),
          randomUUID,
          now,
        ),
        result: null,
      }));
      db.close();
      db = new LocalStore(path);
      expect(db.read().person?.id).toBe(personId);
      expect(db.read().experiences).toHaveLength(1);
      expect(db.sessionIdentity(token)).toEqual({ provider: "huly", subject: "account-uuid" });
      db.db.prepare("UPDATE sessions SET expires=? WHERE provider=? AND subject=?").run(Date.now() - 1, "huly", "account-uuid");
      expect(db.sessionIdentity(token)).toBeNull();
      const renewedToken = db.createSession("huly", "account-uuid");
      expect(db.sessionIdentity(renewedToken)).toEqual({ provider: "huly", subject: "account-uuid" });
      db.revoke(token);
      expect(db.sessionIdentity(token)).toBeNull();
      expect(db.sessionIdentity("forged")).toBeNull();
      db.close();
      db = new LocalStore(path);
      expect(db.read().person?.id).toBe(personId);
      expect(db.sessionIdentity(renewedToken)).toEqual({ provider: "huly", subject: "account-uuid" });
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("rolls back rejected operations including their original record", () => {
    const db = new LocalStore(":memory:");
    try {
      db.transact((s) => ({
        state: bootstrapFoundation(s, "account-uuid", randomUUID, now),
        result: null,
      }));
      const initialized = db.read();
      expect(() =>
        db.transact((s) => {
          applyCommand(
            s as import("../lib/foundation").Foundation,
            s.person!.id,
            experience,
            randomUUID(),
            randomUUID,
            now,
          );
          throw new Error("cancel");
        }),
      ).toThrow();
      expect(db.read()).toEqual(initialized);
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
      a.transact((s) => ({ state: bootstrapFoundation(s, "account-uuid", randomUUID, now), result: null }));
      a.transact((s) => ({
        state: applyCommand(s as import("../lib/foundation").Foundation, s.person!.id, experience, key, randomUUID, now),
        result: null,
      }));
      b.transact((s) => ({
        state: applyCommand(
          s as import("../lib/foundation").Foundation,
          s.person!.id,
          { type: "intention", content: "Continuar amanhã" },
          randomUUID(),
          randomUUID,
          now,
        ),
        result: null,
      }));
      a.transact((s) => ({
        state: applyCommand(s as import("../lib/foundation").Foundation, s.person!.id, experience, key, randomUUID, now),
        result: null,
      }));
      expect(b.read().experiences).toHaveLength(1);
      expect(b.read().records).toHaveLength(4);
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
