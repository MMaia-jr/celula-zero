// SPDX-License-Identifier: MPL-2.0
/** CZ-owned server adapter over Huly's documented account RPC surface. */
export interface AuthenticatedAccount {
  provider: "huly";
  subject: string;
}

export class HulyAuthenticationError extends Error {
  constructor() {
    super("HULY_AUTH_FAILED");
    this.name = "HulyAuthenticationError";
  }
}

export async function authenticateHuly(
  accountsUrl: string,
  email: string,
  password: string,
  request: typeof fetch = fetch,
): Promise<AuthenticatedAccount> {
  const url = new URL(accountsUrl);
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    !url.pathname.replace(/\/$/, "").endsWith("/_accounts") ||
    url.username || url.password
  ) throw new HulyAuthenticationError();

  try {
    const response = await request(url, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method: "login", params: { email, password } }),
    });
    const body: unknown = await response.json();
    if (!response.ok || !body || typeof body !== "object" || "error" in body)
      throw new HulyAuthenticationError();
    const result = "result" in body ? body.result : undefined;
    if (
      !result || typeof result !== "object" ||
      Array.isArray(result)
    ) throw new HulyAuthenticationError();
    const accountResult = result as Record<string, unknown>;
    if (
      typeof accountResult.account !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountResult.account) ||
      typeof accountResult.token !== "string" || accountResult.token.length === 0 ||
      accountResult.tfaRequired === true
    ) throw new HulyAuthenticationError();
    // The Huly access token is deliberately not persisted or returned to the browser.
    return { provider: "huly", subject: accountResult.account };
  } catch {
    throw new HulyAuthenticationError();
  }
}
