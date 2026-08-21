import { describe, expect, it } from "vitest";
import { createProjectSchema, slugifyProjectTitle } from "@/lib/domain/project-schema";

const validInput = {
  title: "Projeto de auditoria",
  summary: "Um projeto completo para testar as regras do primeiro Gate.",
  originalIntent: "Preservar literalmente uma intenção suficientemente detalhada.",
  currentIntent: "Testar a criação atômica e a leitura pública do projeto.",
  intendedResult: "Uma página pública e exportável.",
  rulesAndLimits: "Sem fundos, wallet ou promessa de retorno.",
  needs: "auditoria, design, documentação",
  economicRegime: "VOLUNTARY",
  stage: "OPEN",
  publishNow: true,
};

describe("createProjectSchema", () => {
  it("normalizes needs without creating implicit rights", () => {
    const parsed = createProjectSchema.parse(validInput);
    expect(parsed.needs).toEqual(["auditoria", "design", "documentação"]);
    expect(parsed.economicRegime).toBe("VOLUNTARY");
  });

  it("rejects an underspecified original intent", () => {
    const parsed = createProjectSchema.safeParse({ ...validInput, originalIntent: "curta" });
    expect(parsed.success).toBe(false);
  });

  it("limits needs to twelve explicit entries", () => {
    const needs = Array.from({ length: 15 }, (_, index) => `necessidade-${index}`).join(",");
    const parsed = createProjectSchema.parse({ ...validInput, needs });
    expect(parsed.needs).toHaveLength(12);
  });
});

describe("slugifyProjectTitle", () => {
  it("creates a stable, URL-safe base slug", () => {
    expect(slugifyProjectTitle("Célula Zero — Auditoria 001")).toBe("celula-zero-auditoria-001");
  });

  it("bounds the slug length", () => {
    expect(slugifyProjectTitle("projeto ".repeat(30)).length).toBeLessThanOrEqual(72);
  });
});
