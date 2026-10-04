// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from "vitest";
import { canonicalSourceExcerpts } from "../lib/essenthius/canonical-sources";

describe("canonical direction reconstruction", () => {
  it("reads D060 and its implementation plan from the supplied canonical commit", () => {
    const files: Record<string, string> = {
      "STATE.md": "# State\n\n## Current Human Direction — D060 / Genesis Operating Habitat Alpha\nAlpha is current.\n\n## Licensing\n",
      "decisions/D060-human-adopts-genesis-operating-habitat-alpha.md": "# D060\n\n## Adopted construction direction\nBuild Genesis Alpha.\n\n## Explicit holds\n",
      "CZ-GENESIS-OPERATING-HABITAT-IMPLEMENTATION-PLAN-V1.md": "# Plan\n\n## 1. Experience we are building\nEnter, act, continue.\n\n## 2. Current baseline\n",
    };
    const excerpts = canonicalSourceExcerpts("canonical-sha", (_head, path) => {
      const content = files[path];
      if (!content) throw new Error("MISSING_CANONICAL_FILE");
      return content;
    });
    expect(excerpts).toHaveLength(3);
    expect(excerpts.map((item) => item.path)).toEqual([
      "STATE.md",
      "decisions/D060-human-adopts-genesis-operating-habitat-alpha.md",
      "CZ-GENESIS-OPERATING-HABITAT-IMPLEMENTATION-PLAN-V1.md",
    ]);
    expect(excerpts.map((item) => item.excerpt).join(" ")).toContain("D060");
    expect(excerpts.map((item) => item.excerpt).join(" ")).toContain("Build Genesis Alpha");
    expect(excerpts.map((item) => item.excerpt).join(" ")).not.toContain("D059-human-adopts");
  });

  it("fails closed when any required canonical artifact is unavailable", () => {
    const excerpts = canonicalSourceExcerpts("missing-sha", () => {
      throw new Error("NOT_FOUND");
    });
    expect(excerpts).toEqual([{ path: "STATE.md", artifactKind: "CANONICAL SOURCE READBACK UNAVAILABLE", excerpt: "Canonical artifacts could not be read from the selected immutable commit; do not infer their content." }]);
  });
});
