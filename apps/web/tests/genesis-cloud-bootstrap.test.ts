import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthCallbackUrl, resolveSafeNext } from "@/lib/auth/redirect";
import { getSupabasePublicEnvironment } from "@/lib/supabase/config";
import { classifyPersonCandidates, classifyRecordsRead, composeGenesisContext } from "@/lib/genesis/context";
import { getGatewayPreparation, AI_GATEWAY_BASE_URL, GENESIS_MODEL } from "@/lib/genesis/gateway";
import { parseGitHubHead, readCanonicalGitHubState } from "@/lib/genesis/github";

afterEach(() => vi.unstubAllEnvs());

describe("Genesis cloud bootstrap", () => {
  it("builds a production callback and rejects unsafe next values", () => {
    expect(buildAuthCallbackUrl("https://cz.example", "http://localhost:3000", "//evil.example"))
      .toBe("https://cz.example/auth/callback?next=%2Fgenesis");
    expect(resolveSafeNext("/genesis?from=google", "/genesis")).toBe("/genesis?from=google");
  });

  it("fails closed when public Supabase configuration is incomplete", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getSupabasePublicEnvironment()).toBeNull();
  });

  it("pins STATE.md to the exact resolved canonical HEAD and fails closed", async () => {
    const sha = "a".repeat(40);
    expect(parseGitHubHead({ sha, html_url: "https://github.com/MMaia-jr/celula-zero/commit/x" })).toEqual({
      sha,
      url: "https://github.com/MMaia-jr/celula-zero/commit/x",
    });

    const successfulFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sha,
          html_url: "https://github.com/MMaia-jr/celula-zero/commit/x",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "# STATE\nexact commit state",
      });

    const result = await readCanonicalGitHubState({ fetch: successfulFetch, timeoutMs: 50 });
    expect(result).toMatchObject({ status: "AVAILABLE", headSha: sha });
    expect(successfulFetch).toHaveBeenNthCalledWith(
      2,
      `https://raw.githubusercontent.com/MMaia-jr/celula-zero/${sha}/STATE.md`,
      expect.any(Object),
    );

    const failingFetch = vi.fn().mockResolvedValue({ ok: false });
    await expect(readCanonicalGitHubState({ fetch: failingFetch, timeoutMs: 50 }))
      .resolves.toMatchObject({ status: "UNAVAILABLE" });
  });

  it("fails closed on PERSON ambiguity and distinguishes unreadable records from an empty history", () => {
    expect(classifyPersonCandidates([])).toEqual({ status: "MISSING" });
    expect(classifyPersonCandidates([{ id: "person-1" }])).toEqual({
      status: "READY",
      person: { id: "person-1" },
    });
    expect(classifyPersonCandidates([{ id: "person-1" }, { id: "person-2" }]))
      .toEqual({ status: "AMBIGUOUS" });

    expect(classifyRecordsRead(null)).toBe("AVAILABLE");
    expect(classifyRecordsRead(new Error("rls/read failure"))).toBe("UNAVAILABLE");
  });

  it("keeps Profile and PERSON relation fields distinct and never classifies Human Direction", () => {
    const context = composeGenesisContext({
      identity: { profileId: "profile-1", displayName: "Marcos", personId: "person-1", personName: "Marcos PERSON" },
      canonical: { headSha: "a".repeat(40), stateSummary: "operational" },
      recentRecords: [{ id: "record-1", recordClass: "ORIGINAL_RECORD", content: "human text", createdAt: "2026-09-21T00:00:00Z" }],
    });
    expect(context.identity.profileId).not.toBe(context.identity.personId);
    expect(context.recentPrivateRecords[0]?.recordClass).toBe("ORIGINAL_RECORD");
    expect(context.humanDirection).toBe(false);
  });

  it("refuses a missing Gateway key without a provider call or key exposure", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = getGatewayPreparation({ NODE_ENV: "test", AI_GATEWAY_API_KEY: "" } as NodeJS.ProcessEnv);
    expect(result).toEqual({ status: "UNAVAILABLE", reason: expect.not.stringContaining("Bearer") });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(AI_GATEWAY_BASE_URL).toBe("https://ai-gateway.vercel.sh/v1");
    expect(GENESIS_MODEL).toBe("moonshotai/kimi-k2.6");
    fetchSpy.mockRestore();
  });
});
