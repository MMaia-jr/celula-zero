import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const actionSource = readFileSync(
  resolve(process.cwd(), "app/commitments/[commitmentId]/contribute/actions.ts"),
  "utf8",
);
const pageSource = readFileSync(
  resolve(process.cwd(), "app/commitments/[commitmentId]/contribute/page.tsx"),
  "utf8",
);

describe("T12 Human visibility expression", () => {
  it("requires an explicit PRIVATE / PARTIES / PROJECT choice in the Human form", () => {
    expect(pageSource).toContain('name="visibility"');
    expect(pageSource).toContain('defaultValue=""');
    expect(pageSource).toContain('value="PRIVATE"');
    expect(pageSource).toContain('value="PARTIES"');
    expect(pageSource).toContain('value="PROJECT"');
    expect(pageSource).toContain("Ampliação futura exige disclosure/publication explícito");
  });

  it("validates and forwards the Human visibility choice to the database command", () => {
    expect(actionSource).toContain(
      'visibility: z.enum(["PRIVATE", "PARTIES", "PROJECT"])',
    );
    expect(actionSource).toContain('visibility: formData.get("visibility")');
    expect(actionSource).toContain("p_visibility: input.visibility");
  });
});
