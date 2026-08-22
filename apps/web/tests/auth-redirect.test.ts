import { describe, expect, it } from "vitest";
import {
  isSupabaseSessionCookie,
  resolveApplicationOrigin,
  resolveSafeNext,
} from "@/lib/auth/redirect";

describe("auth redirect invariants", () => {
  it("preserves the configured application host", () => {
    expect(
      resolveApplicationOrigin(
        "http://127.0.0.1:3000",
        "http://localhost:3000/auth/callback?code=example",
      ),
    ).toBe("http://127.0.0.1:3000");
  });

  it("falls back to the incoming origin when no site URL is configured", () => {
    expect(
      resolveApplicationOrigin(undefined, "https://example.org/auth/callback?code=example"),
    ).toBe("https://example.org");
  });

  it("accepts only same-origin path redirects", () => {
    expect(resolveSafeNext("/projects/new")).toBe("/projects/new");
    expect(resolveSafeNext("//attacker.example/path")).toBe("/projects");
    expect(resolveSafeNext("https://attacker.example/path")).toBe("/projects");
  });

  it("distinguishes session cookies from PKCE verifier cookies", () => {
    expect(isSupabaseSessionCookie("sb-project-auth-token")).toBe(true);
    expect(isSupabaseSessionCookie("sb-project-auth-token.0")).toBe(true);
    expect(isSupabaseSessionCookie("sb-project-auth-token-code-verifier")).toBe(false);
  });
});
