export const CANONICAL_REPOSITORY = "MMaia-jr/celula-zero";

export interface CanonicalGitHubState {
  status: "AVAILABLE";
  repository: typeof CANONICAL_REPOSITORY;
  branch: "main";
  headSha: string;
  headUrl: string;
  stateMarkdown: string;
  fetchedAt: string;
}

export type CanonicalGitHubReadback =
  | CanonicalGitHubState
  | { status: "UNAVAILABLE"; repository: typeof CANONICAL_REPOSITORY; reason: string };

export function parseGitHubHead(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as { sha?: unknown; html_url?: unknown };
  if (typeof record.sha !== "string" || !/^[0-9a-f]{40}$/.test(record.sha)) return null;
  if (typeof record.html_url !== "string" || !record.html_url.startsWith("https://github.com/")) return null;
  return { sha: record.sha, url: record.html_url };
}

export async function readCanonicalGitHubState(
  options: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<CanonicalGitHubReadback> {
  const fetcher = options.fetch ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);

  try {
    const headResponse = await fetcher(
      `https://api.github.com/repos/${CANONICAL_REPOSITORY}/commits/main`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "celula-zero-genesis-readback",
        },
        signal: controller.signal,
        cache: "no-store",
      },
    );
    if (!headResponse.ok) throw new Error("canonical HEAD response was not successful");

    const head = parseGitHubHead(await headResponse.json());
    if (!head) throw new Error("canonical HEAD response shape was invalid");

    const stateResponse = await fetcher(
      `https://raw.githubusercontent.com/${CANONICAL_REPOSITORY}/${head.sha}/STATE.md`,
      {
        signal: controller.signal,
        cache: "no-store",
      },
    );
    if (!stateResponse.ok) throw new Error("canonical STATE response was not successful");

    const stateMarkdown = await stateResponse.text();
    if (!stateMarkdown.trim() || stateMarkdown.length > 1_000_000) {
      throw new Error("canonical STATE response shape was invalid");
    }

    return {
      status: "AVAILABLE",
      repository: CANONICAL_REPOSITORY,
      branch: "main",
      headSha: head.sha,
      headUrl: head.url,
      stateMarkdown,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return {
      status: "UNAVAILABLE",
      repository: CANONICAL_REPOSITORY,
      reason: "Canonical GitHub readback is unavailable; no state was inferred.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
