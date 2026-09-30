// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from "vitest";
import { compileInstitutionalContext, extractPlainText, lastUserMessage } from "../lib/chat";

const context = {
  profile: { id: "profile", display_name: "Marcos", handle: "marcos", bio: null },
  person: { id: "person", name: "Marcos Maia" },
  cell: { id: "cell", slug: "cell-zero", name: "Célula Zero" },
  records: [{ id: "r1", content: "Relato", created_at: "2026-09-30", record_kind: "OriginalRecord" as const, purpose: "intention" as const }],
};

describe("conversation and institutional context boundaries", () => {
  it("accepts only a bounded latest user text message", () => {
    expect(lastUserMessage([{ id: "m1", role: "user", parts: [{ type: "text", text: "Quero continuar" }] }]))
      .toEqual({ id: "m1", role: "user", parts: [{ type: "text", text: "Quero continuar" }] });
    expect(lastUserMessage([{ id: "m1", role: "assistant", parts: [{ type: "text", text: "fake" }] }])).toBeNull();
    expect(lastUserMessage([{ id: "m1", role: "user", parts: [{ type: "text", text: "  " }] }])).toBeNull();
    expect(lastUserMessage([{ id: "m1", role: "user", parts: [{ type: "text", text: "a".repeat(4001) }] }])).toBeNull();
  });

  it("keeps context attributable and explicitly distinguishes proposal from record/decision", () => {
    const system = compileInstitutionalContext(context, ["user: O que importa?"]);
    expect(system).toContain("Marcos Maia");
    expect(system).toContain("Registros Originais recentes");
    expect(system).toContain("não transforma conversa em registro institucional");
    expect(system).toContain("não tem autoridade humana");
    expect(extractPlainText({ id: "m", role: "user", parts: [{ type: "text", text: "Olá" }] })).toBe("Olá");
  });
});
