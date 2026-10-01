// SPDX-License-Identifier: MPL-2.0
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { signInWithOAuth: vi.fn() },
  redirect: vi.fn((destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../lib/supabase", () => ({
  habitatClient: async () => ({ auth: mocks.auth }),
  habitatSiteUrl: () => "https://habitat.example.test",
}));

import { startFounderGoogleOAuth } from "../lib/auth-actions";

describe("founder Google OAuth entry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mocks.auth.signInWithOAuth.mockReset();
    mocks.redirect.mockClear();
  });

  it("uses Google, SSR callback, and only the server-configured founder hint", async () => {
    vi.stubEnv("CZ_FOUNDER_EMAIL", "founder@example.test");
    mocks.auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/auth?state=test" },
      error: null,
    });

    await expect(startFounderGoogleOAuth()).rejects.toThrow(
      "REDIRECT:https://accounts.google.com/o/oauth2/auth?state=test",
    );
    expect(mocks.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://habitat.example.test/auth/callback",
        queryParams: {
          login_hint: "founder@example.test",
          prompt: "select_account",
        },
      },
    });
  });

  it("fails closed without the server-side founder configuration", async () => {
    vi.stubEnv("CZ_FOUNDER_EMAIL", "");
    await expect(startFounderGoogleOAuth()).rejects.toThrow(
      "REDIRECT:/login?result=unavailable",
    );
    expect(mocks.auth.signInWithOAuth).not.toHaveBeenCalled();
  });
});
