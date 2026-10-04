// SPDX-License-Identifier: MPL-2.0
import { execFileSync } from "node:child_process";

export interface CanonicalSourceExcerpt {
  path: string;
  artifactKind: string;
  excerpt: string;
}

type SourceReader = (head: string, path: string) => string;

function readGitSource(head: string, path: string) {
  return execFileSync("git", ["show", `${head}:${path}`], {
    cwd: process.cwd(), encoding: "utf8", timeout: 2500, maxBuffer: 128_000,
  });
}

function section(source: string, heading: string, maxLength: number) {
  const start = source.indexOf(heading);
  if (start < 0) return "Canonical section was not found in this commit.";
  const following = source.indexOf("\n## ", start + heading.length);
  return source.slice(start, following < 0 ? start + maxLength : Math.min(following, start + maxLength)).trim();
}

/** Reads current canonical direction only from the supplied immutable Git commit. */
export function canonicalSourceExcerpts(head: string, read: SourceReader = readGitSource): CanonicalSourceExcerpt[] {
  try {
    const state = read(head, "STATE.md");
    const decision = read(head, "decisions/D060-human-adopts-genesis-operating-habitat-alpha.md");
    const plan = read(head, "CZ-GENESIS-OPERATING-HABITAT-IMPLEMENTATION-PLAN-V1.md");
    return [
      { path: "STATE.md", artifactKind: "CANONICAL STATE READBACK", excerpt: section(state, "## Current Human Direction — D060 / Genesis Operating Habitat Alpha", 1500) },
      { path: "decisions/D060-human-adopts-genesis-operating-habitat-alpha.md", artifactKind: "DECISION / HUMAN DIRECTION SOURCE", excerpt: section(decision, "## Adopted construction direction", 1200) },
      { path: "CZ-GENESIS-OPERATING-HABITAT-IMPLEMENTATION-PLAN-V1.md", artifactKind: "CANONICAL IMPLEMENTATION PLAN", excerpt: section(plan, "## 1. Experience we are building", 1200) },
    ];
  } catch {
    return [{ path: "STATE.md", artifactKind: "CANONICAL SOURCE READBACK UNAVAILABLE", excerpt: "Canonical artifacts could not be read from the selected immutable commit; do not infer their content." }];
  }
}
