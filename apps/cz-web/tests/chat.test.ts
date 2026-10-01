// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from "vitest";
import { compileInstitutionalContext, extractPlainText, lastUserMessage } from "../lib/chat";
import { canonicalCellDirection } from "../lib/canonical-state";

const context = {
  profile: { id: "profile", display_name: "Marcos", handle: "marcos", bio: null },
  person: { id: "person", name: "Marcos Maia" },
  cell: { id: "cell", slug: "cell-zero", name: "Célula Zero" },
  records: [{ id: "r1", content: "Relato", created_at: "2026-09-30", record_kind: "OriginalRecord" as const, purpose: "intention" as const }],
  workItems: [{ id: "w1", title: "Continuar habitat", description: "Experiência integrada", status: "in_progress" as const, source: "human_confirmed_conversation" as const, created_at: "2026-09-30", updated_at: "2026-09-30", completed_at: null }],
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
    expect(system).toContain("Continuar habitat");
    expect(system).toContain("Esta é a primeira entrada conversacional");
    expect(extractPlainText({ id: "m", role: "user", parts: [{ type: "text", text: "Olá" }] })).toBe("Olá");
  });

  it("frames later turns around durable open work rather than asking for known identity again", () => {
    const system = compileInstitutionalContext(context, ["user: quero continuar", "assistant: vamos lá", "user: atualize o estado"]);
    expect(system).toContain("Esta thread já tem continuidade");
    expect(system).toContain("Trabalho em andamento com continuidade");
  });

  it("extracts only the canonical current Human Direction section for the Cell", () => {
    const state = "# State\n## Current Human Direction — CZ vNext / Habitable MVP\n`D055`\n\nThe coherent target is the human habitat.\n\n`KNOWN EXPERIENCE → HUMAN USE`\n\nPreserve:\nKEEP THIS";
    expect(canonicalCellDirection(state)).toContain("The coherent target");
    expect(canonicalCellDirection(state)).toContain("KNOWN EXPERIENCE");
    expect(canonicalCellDirection(state)).not.toContain("KEEP THIS");
    expect(canonicalCellDirection("# State\nno section")).toBeNull();
  });
});
