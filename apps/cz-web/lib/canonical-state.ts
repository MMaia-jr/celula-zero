// SPDX-License-Identifier: MPL-2.0
export const CANONICAL_STATE_URL = "https://github.com/MMaia-jr/celula-zero/blob/main/STATE.md";

export function canonicalCellDirection(markdown: string): string | null {
  const start = markdown.indexOf("## Current Human Direction — CZ vNext / Habitable MVP");
  if (start < 0) return null;
  const bodyStart = markdown.indexOf("\n", start) + 1;
  const next = markdown.indexOf("\nPreserve:", bodyStart);
  const end = next < 0 ? Math.min(markdown.length, bodyStart + 3500) : next;
  const excerpt = markdown.slice(bodyStart, end).trim();
  const targetStart = excerpt.indexOf("The coherent target is");
  if (targetStart < 0) return excerpt.slice(0, 2600);
  const targetEnd = excerpt.indexOf("\n\n", targetStart);
  const target = excerpt.slice(targetStart, targetEnd < 0 ? undefined : targetEnd).replace(/\s+/g, " ").trim();
  const sequence = excerpt.split("\n").map((line) => line.trim()).find((line) => line.startsWith("`KNOWN EXPERIENCE"));
  return [target, sequence?.replaceAll("`", "")].filter(Boolean).join("\n\n").slice(0, 1200);
}

export async function readCanonicalCellDirection(): Promise<string | null> {
  try {
    const response = await fetch("https://api.github.com/repos/MMaia-jr/celula-zero/contents/STATE.md?ref=main", {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const file = await response.json() as { content?: string; encoding?: string };
    if (file.encoding !== "base64" || typeof file.content !== "string") return null;
    return canonicalCellDirection(Buffer.from(file.content, "base64").toString("utf8"));
  } catch {
    return null;
  }
}
