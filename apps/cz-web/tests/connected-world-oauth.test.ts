// SPDX-License-Identifier: MPL-2.0
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemorySecretStore } from "../lib/connections/secure-store";
import { callbackUrl, createOAuthPending, pkceChallenge, providerOAuthScopes, validateOAuthCallback } from "../lib/connections/oauth";

afterEach(() => vi.unstubAllEnvs());

describe("Connected World OAuth boundaries", () => {
  it("uses a fresh unpredictable state and S256 PKCE challenge", () => {
    const first = createOAuthPending(10_000);
    const second = createOAuthPending(10_000);
    expect(first.state).not.toBe(second.state);
    expect(first.verifier).not.toBe(second.verifier);
    expect(pkceChallenge(first.verifier)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(validateOAuthCallback(first, first.state, 10_001)).toBe(true);
    expect(validateOAuthCallback(first, second.state, 10_001)).toBe(false);
    expect(validateOAuthCallback(first, first.state, 610_001)).toBe(false);
  });

  it("restricts OAuth callbacks to the local normal CZ origin", () => {
    vi.stubEnv("CZ_CONNECTED_WORLD_ORIGIN", "http://127.0.0.1:3088");
    expect(callbackUrl("google")).toBe("http://127.0.0.1:3088/api/connections/google/callback");
    vi.stubEnv("CZ_CONNECTED_WORLD_ORIGIN", "https://example.com");
    expect(() => callbackUrl("google")).toThrow("CONNECTED_WORLD_ORIGIN_MUST_BE_LOCAL_LOOPBACK");
  });

  it("requests only the approved provider scopes and keeps Gmail send behind CZ policy", () => {
    expect(providerOAuthScopes.github).toContain("contents:read");
    expect(providerOAuthScopes.github).not.toContain("contents:write");
    expect(providerOAuthScopes.linear).not.toContain("admin");
    expect(providerOAuthScopes.google).toContain("https://www.googleapis.com/auth/gmail.readonly");
    expect(providerOAuthScopes.google).toContain("https://www.googleapis.com/auth/gmail.compose");
    expect(providerOAuthScopes.google).not.toContain("https://www.googleapis.com/auth/gmail.send");
    expect(providerOAuthScopes.google).toContain("https://www.googleapis.com/auth/drive.readonly");
  });

  it("provides a deterministic isolated vault fake without serializing a credential reference", async () => {
    const vault = new MemorySecretStore();
    await vault.set("google:connection-1:access-token", "token-test-never-serialize");
    expect(await vault.get("google:connection-1:access-token")).toBe("token-test-never-serialize");
    await vault.delete("google:connection-1:access-token");
    expect(await vault.get("google:connection-1:access-token")).toBeNull();
  });
});
