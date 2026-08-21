import { describe, expect, it } from "vitest";
import { projectToMarkdown, toPortableProject } from "@/lib/domain/export-project";
import { SEED_PROJECTS } from "@/lib/data/seed-projects";

const project = SEED_PROJECTS[0]!;
const timestamp = "2026-08-21T20:00:00.000Z";

describe("project portability", () => {
  it("keeps original intent and current interpretation separate in JSON", () => {
    const exported = toPortableProject(project, timestamp);
    expect(exported.schemaVersion).toBe("cz.project.v1");
    expect(exported.project.originalIntent).toBe(project.originalIntent);
    expect(exported.project.currentIntent).toBe(project.currentIntent);
    expect(exported.project.originalIntent).not.toBe(exported.project.currentIntent);
    expect(exported.notices).toContain(
      "Este arquivo é uma exportação portável; não concede autoridade ou direitos econômicos.",
    );
  });

  it("exports a human-readable trajectory with material versions", () => {
    const markdown = projectToMarkdown(project, timestamp);
    expect(markdown).toContain("## Registro Original");
    expect(markdown).toContain("## Interpretação atual");
    expect(markdown).toContain("versão material 2");
    expect(markdown).toContain("não concede autoridade ou direitos econômicos");
  });
});
