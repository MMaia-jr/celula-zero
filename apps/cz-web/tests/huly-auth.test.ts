// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it, vi } from "vitest";
import { authenticateHuly } from "../lib/huly-auth";

const account = "8be52aba-16a3-4b48-8f49-b9e6b771fe52";

describe("CZ-owned Huly authentication adapter", () => {
  it("uses the server-side account RPC and returns only the stable subject", async () => {
    const request = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      {
        void _url;
        void _init;
        return new Response(JSON.stringify({ result: { account, token: "secret-session-token" } }), { status: 200 });
      },
    );
    await expect(authenticateHuly("http://127.0.0.1:8087/_accounts", "m@example.test", "pw", request))
      .resolves.toEqual({ provider: "huly", subject: account });
    expect(request).toHaveBeenCalledOnce();
    const init = request.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toEqual({ method: "login", params: { email: "m@example.test", password: "pw" } });
  });

  it("rejects non-loopback plaintext endpoints and malformed login responses", async () => {
    await expect(authenticateHuly("http://huly.example/_accounts", "a", "b", vi.fn()))
      .rejects.toThrow("HULY_AUTH_FAILED");
    const malformed = vi.fn(async () => new Response(JSON.stringify({ result: { account, token: "t", tfaRequired: true } })));
    await expect(authenticateHuly("http://localhost:8087/_accounts", "a", "b", malformed))
      .rejects.toThrow("HULY_AUTH_FAILED");
  });
});
