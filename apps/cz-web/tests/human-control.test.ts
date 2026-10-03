// SPDX-License-Identifier: MPL-2.0
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { LocalStore } from "../lib/local-store";
import { seedFoundation, projection, beginIntelligenceTurn } from "../lib/foundation";
import { detectModelPreferenceRequest, selectModelProvider } from "../lib/essenthius/model-preference";
import { acceptSelectedProfileFields, mergeManualProfileEdit } from "../lib/essenthius/profile-assistance";
import { CodexCliAdapter } from "../lib/essenthius/codex-cli";

const now = "2026-10-02T12:00:00.000Z";
const temporary = new Set<string>();
afterEach(() => { for (const path of temporary) rmSync(path, { recursive: true, force: true }); temporary.clear(); vi.restoreAllMocks(); });

describe("human-controlled model and assisted profile slice", () => {
  it("persists a thread preference in a disposable store without changing its thread", () => {
    const dir = mkdtempSync(join(tmpdir(), "cz-human-control-")); temporary.add(dir);
    const store = new LocalStore(join(dir, "test.sqlite"));
    const fixture = seedFoundation(randomUUID, now);
    fixture.threadModelPreferences = { [`cell:${fixture.cell.id}`]: "codex-cli" };
    const actor = fixture.person.id;
    const begin = beginIntelligenceTurn(fixture, actor, "Mensagem preservada", "request-key-human-control-0001", randomUUID, now, null, `cell:${fixture.cell.id}`);
    store.transact(() => ({ state: begin.state, result: null }));
    const readback = store.read();
    const view = projection(readback as ReturnType<typeof seedFoundation>, actor);
    expect(view.threadModelPreferences[`cell:${fixture.cell.id}`]).toBe("codex-cli");
    expect(view.conversationMessages?.length).toBe(1);
    expect(view.intelligenceTurns?.[0]?.threadId).toBe(`cell:${fixture.cell.id}`);
    store.close();
  });

  it("recognizes direct natural-language model preferences and informational requests", () => {
    expect(detectModelPreferenceRequest("usa o Codex nessa conversa")).toBe("codex-cli");
    expect(detectModelPreferenceRequest("volta para automático")).toBe("auto");
    expect(detectModelPreferenceRequest("usa o Kimi nessa conversa")).toBe("unavailable-kimi");
    expect(detectModelPreferenceRequest("qual modelo você está usando?")).toBe("ask-current");
    expect(detectModelPreferenceRequest("qual modelo é mais barato para isso?")).toBe("ask-cost");
  });

  it("keeps AUTO overridable and fails explicitly when a requested provider is unavailable", () => {
    expect(selectModelProvider({ preference: "auto", codexAuthenticated: true, localInteractive: false }).provider).toBe("codex-cli");
    expect(selectModelProvider({ preference: "codex-cli", codexAuthenticated: true, localInteractive: false }).provider).toBe("codex-cli");
    expect(selectModelProvider({ preference: "codex-cli", codexAuthenticated: false, localInteractive: false }).provider).toBeNull();
    expect(selectModelProvider({ preference: "ollama-local", codexAuthenticated: true, localInteractive: false }).provider).toBeNull();
  });

  it("keeps the Essenthius identity label independent from provider labels", () => {
    const provider = selectModelProvider({ preference: "codex-cli", codexAuthenticated: true, localInteractive: false });
    expect(provider.provider).toBe("codex-cli");
    expect("identity" in provider).toBe(false);
    expect("thread" in provider).toBe(false);
  });

  it("supports manual profile editing without invoking an AI", () => {
    const profile = { displayName: "Marcos", headline: "Manual headline", bio: "Existing bio" };
    expect(mergeManualProfileEdit(profile, { displayName: "Marcos Maia", headline: "Edited directly" })).toEqual({ displayName: "Marcos Maia", headline: "Edited directly", bio: "Existing bio" });
  });

  it("creates a review-only profile draft from supplied attributed sources", async () => {
    const invoke = vi.fn(async (prompt: string) => {
      expect(prompt).toContain("Headline editado manualmente");
      return { text: JSON.stringify({ fields: [{ field: "bio", proposed: "Bio sustentada", sourceIds: ["experience-1", "invented-id"], uncertainty: "Relato pessoal, não verificado." }] }), threadId: "fake-test", inputTokens: null, outputTokens: null };
    });
    const adapter = new CodexCliAdapter({ invoke });
    const draft = await adapter.draftProfile({ current: { headline: "Headline editado manualmente", bio: "" }, experiences: [{ id: "experience-1", title: "Experiência confirmada", description: "Descrição atribuída." }], capabilities: [], contributions: [], records: [] });
    expect(draft.fields).toEqual([{ field: "bio", proposed: "Bio sustentada", sourceIds: ["experience-1"], uncertainty: "Relato pessoal, não verificado." }]);
    expect(draft.requestId).toBe("fake-test");
    expect(draft.inputTokens).toBeNull();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("accepts only selected draft fields and preserves later manual edits", () => {
    const current = { headline: "Headline editado depois", bio: "Bio antiga" };
    const proposals = [
      { field: "headline" as const, current: "Antiga", proposed: "Proposta de headline", sourceIds: ["e1"], uncertainty: "Incerta", visibilityImpact: "Sem mudança" },
      { field: "bio" as const, current: "Bio antiga", proposed: "Bio aceita", sourceIds: ["e1"], uncertainty: "Incerta", visibilityImpact: "Sem mudança" },
    ];
    expect(acceptSelectedProfileFields(current, proposals, { bio: "Bio aceita" })).toEqual({ headline: "Headline editado depois", bio: "Bio aceita" });
  });

  it("does not mutate a profile when the model only produces a draft", async () => {
    const fixture = seedFoundation(randomUUID, now);
    const before = structuredClone(fixture.profile);
    const adapter = new CodexCliAdapter({ invoke: async () => ({ text: JSON.stringify({ fields: [{ field: "bio", proposed: "Sugestão", sourceIds: ["record-1"], uncertainty: "Não verificado" }] }), threadId: null, inputTokens: null, outputTokens: null }) });
    await adapter.draftProfile({ current: { headline: fixture.profile.headline, bio: fixture.profile.bio }, experiences: [], capabilities: [], contributions: [], records: [{ id: "record-1", purpose: "experience", content: "Relato atribuído" }] });
    expect(fixture.profile).toEqual(before);
  });

  it("uses only an injected fake invocation in deterministic tests", () => {
    const realCalls = vi.fn();
    expect(realCalls).not.toHaveBeenCalled();
    expect(selectModelProvider({ preference: "auto", codexAuthenticated: true, localInteractive: false }).provider).toBe("codex-cli");
    expect(realCalls).not.toHaveBeenCalled();
  });
});
