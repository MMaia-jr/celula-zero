// SPDX-License-Identifier: MPL-2.0
import { createHash, createPrivateKey, createSign, randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { appendRecord } from "@cz/records";
import { canAct } from "@cz/authority";
import type { PersonId } from "@cz/identity";
import { externalResourceSchema, providerCapabilityCatalog, type ExternalProvider, type ExternalResource } from "@cz/connection-fabric";
import { LocalStore } from "../local-store";
import { actorFor, hasInstitutionalState, type FoundationState } from "../foundation";
import { assertNoCompetingFoundationStore, resolveFoundationStorePath } from "../foundation-db-path";
import { MacOSKeychainSecretStore, providerCredentialAccount, type SecretStore } from "./secure-store";

const SESSION = "cz_foundation_session";
const STATE_COOKIE = "cz_connection_oauth_state";
const TARGET_REPOSITORY = "MMaia-jr/celula-zero";
const service = new MacOSKeychainSecretStore();
let localDb: LocalStore | undefined;
function db() {
  if (!localDb) {
    const path = resolveFoundationStorePath();
    assertNoCompetingFoundationStore(path);
    localDb = new LocalStore(path);
  }
  return localDb;
}

export const providerOAuthScopes = {
  github: ["metadata:read", "contents:read", "issues:read", "issues:write", "pull_requests:read", "pull_requests:write", "checks:read", "commit_statuses:read"],
  linear: ["read", "write", "issues:create", "comments:create"],
  google: ["openid", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.compose", "https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/calendar.calendarlist.readonly", "https://www.googleapis.com/auth/calendar.events.owned"],
} as const;

export function callbackUrl(provider: ExternalProvider) {
  const origin = process.env.CZ_CONNECTED_WORLD_ORIGIN ?? "http://127.0.0.1:3088";
  const url = new URL(origin);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.port !== "3088" || url.pathname !== "/" || url.search || url.hash)
    throw new Error("CONNECTED_WORLD_ORIGIN_MUST_BE_LOCAL_LOOPBACK");
  return `${url.origin}/api/connections/${provider}/callback`;
}

export interface OAuthPending {
  state: string;
  verifier: string;
  createdAt: number;
}

export function createOAuthPending(now = Date.now()): OAuthPending {
  return { state: randomBytes(32).toString("base64url"), verifier: randomBytes(48).toString("base64url"), createdAt: now };
}
export function pkceChallenge(verifier: string) { return createHash("sha256").update(verifier).digest("base64url"); }
export function validateOAuthCallback(pending: OAuthPending | null, queryState: string | null, now = Date.now()) {
  return Boolean(pending && queryState && pending.state.length >= 32 && pending.state === queryState && now - pending.createdAt >= 0 && now - pending.createdAt <= 10 * 60_000);
}

function clientId(provider: ExternalProvider) {
  const key = provider === "github" ? "CZ_GITHUB_APP_CLIENT_ID" : provider === "linear" ? "CZ_LINEAR_CLIENT_ID" : "CZ_GOOGLE_CLIENT_ID";
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${provider.toUpperCase()}_OAUTH_CLIENT_NOT_CONFIGURED`);
  return value;
}
async function clientSecret(provider: "github" | "linear" | "google") {
  const value = await service.get(`${provider}:client-secret`);
  if (!value) throw new Error(`${provider.toUpperCase()}_OAUTH_CLIENT_SECRET_NOT_CONFIGURED`);
  return value;
}
function localHostAllowed(request: NextRequest) {
  const host = request.headers.get("host");
  return process.env.CZ_LOCAL_FOUNDATION === "1" && !!host && /^(127\.0\.0\.1|localhost):3088$/.test(host);
}
function sameSiteStateCookie(response: NextResponse, state: string | null) {
  if (state) response.cookies.set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: false, path: "/api/connections", maxAge: 600 });
  else response.cookies.set(STATE_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: false, path: "/api/connections", maxAge: 0 });
  return response;
}
function errorResponse(error: unknown, request: NextRequest) {
  const code = error instanceof Error && /^[A-Z0-9_:-]{3,100}$/.test(error.message) ? error.message : "CONNECTED_WORLD_OPERATION_FAILED";
  const message = code.includes("NOT_CONFIGURED")
    ? "Esta conexão ainda precisa ser configurada neste dispositivo. Nenhum dado foi alterado."
    : code === "SECURE_KEYCHAIN_UNAVAILABLE"
      ? "O Cofre do Sistema não está disponível neste dispositivo. Nenhuma credencial foi armazenada."
      : "Não foi possível concluir a conexão com segurança. Nenhuma credencial será exibida.";
  return NextResponse.redirect(new URL(`/discover?connection_error=${encodeURIComponent(message)}`, request.url));
}

export async function startConnectionOAuth(request: NextRequest, provider: ExternalProvider) {
  if (!localHostAllowed(request)) return NextResponse.json({ error: "Entrada local indisponível." }, { status: 503 });
  const token = request.cookies.get(SESSION)?.value;
  const store = db();
  const principal = store.sessionIdentity(token);
  if (!principal) return NextResponse.redirect(new URL("/", request.url));
  try {
    const state = store.read();
    if (!hasInstitutionalState(state)) throw new Error("BOOTSTRAP_REQUIRED");
    const personId = actorFor(state, principal.provider, principal.subject);
    if (personId !== state.person.id || !state.cell || !canAct(personId, state.cell.id, "cell.update", state.memberships, state.authorities))
      return NextResponse.json({ error: "A autoridade atual não permite gerenciar conexões nesta Célula." }, { status: 403 });
    const pending = createOAuthPending();
    const redirectUri = callbackUrl(provider);
    const id = clientId(provider);
    if (provider !== "github") await clientSecret(provider);
    else {
      await clientSecret(provider);
      const pem = await service.get("github:app-private-key");
      if (!pem || !process.env.CZ_GITHUB_APP_ID || !process.env.CZ_GITHUB_APP_SLUG) throw new Error("GITHUB_APP_CREDENTIALS_NOT_CONFIGURED");
      try { createPrivateKey(pem); } catch { throw new Error("GITHUB_APP_PRIVATE_KEY_INVALID"); }
    }
    const authorization = provider === "github"
      ? (() => {
          const slug = process.env.CZ_GITHUB_APP_SLUG?.trim();
          if (!slug || !process.env.CZ_GITHUB_APP_ID) throw new Error("GITHUB_APP_NOT_CONFIGURED");
          const url = new URL(`https://github.com/apps/${encodeURIComponent(slug)}/installations/new`);
          url.searchParams.set("state", pending.state);
          return url;
        })()
      : provider === "linear"
        ? (() => {
            const url = new URL("https://linear.app/oauth/authorize");
            url.searchParams.set("client_id", id); url.searchParams.set("redirect_uri", redirectUri); url.searchParams.set("response_type", "code");
            url.searchParams.set("scope", providerOAuthScopes.linear.join(",")); url.searchParams.set("state", pending.state); url.searchParams.set("actor", "user");
            url.searchParams.set("code_challenge", pkceChallenge(pending.verifier)); url.searchParams.set("code_challenge_method", "S256");
            return url;
          })()
        : (() => {
            const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
            url.searchParams.set("client_id", id); url.searchParams.set("redirect_uri", redirectUri); url.searchParams.set("response_type", "code");
            url.searchParams.set("scope", providerOAuthScopes.google.join(" ")); url.searchParams.set("state", pending.state); url.searchParams.set("access_type", "offline");
            url.searchParams.set("include_granted_scopes", "false"); url.searchParams.set("prompt", "consent");
            url.searchParams.set("code_challenge", pkceChallenge(pending.verifier)); url.searchParams.set("code_challenge_method", "S256");
            return url;
          })();
    const response = NextResponse.redirect(authorization);
    response.cookies.set(STATE_COOKIE, JSON.stringify({ ...pending, provider }), { httpOnly: true, sameSite: "lax", secure: false, path: "/api/connections", maxAge: 600 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return errorResponse(error, request);
  }
}

type TokenPayload = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string; installation_id?: number };
async function tokenRequest(url: string, body: URLSearchParams, headers: Record<string, string> = {}) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", ...headers }, body, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const parsed = await response.json().catch(() => ({})) as TokenPayload & { error?: string };
  if (!response.ok || !parsed.access_token) throw new Error("OAUTH_TOKEN_EXCHANGE_FAILED");
  return parsed;
}
async function boundedFetch<T>(url: string, token: string, provider: "github" | "linear" | "google", body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  if (provider === "github") { headers.Accept = "application/vnd.github+json"; headers["X-GitHub-Api-Version"] = "2022-11-28"; }
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(url, { method: body === undefined ? "GET" : "POST", headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${provider.toUpperCase()}_READBACK_FAILED_${response.status}`);
  return await response.json() as T;
}

async function githubJwt(appId: string, privatePem: string) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iat: now - 30, exp: now + 8 * 60, iss: appId })}`;
  const signer = createSign("RSA-SHA256"); signer.update(unsigned); signer.end();
  try { return `${unsigned}.${signer.sign(createPrivateKey(privatePem)).toString("base64url")}`; }
  catch { throw new Error("GITHUB_APP_PRIVATE_KEY_INVALID"); }
}

async function revokeGitHubUserToken(accessToken: string) {
  const id = clientId("github"), secret = await clientSecret("github");
  const authorization = Buffer.from(`${id}:${secret}`).toString("base64");
  const response = await fetch(`https://api.github.com/applications/${encodeURIComponent(id)}/token`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${authorization}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status !== 204) throw new Error("GITHUB_TEMPORARY_USER_TOKEN_REVOCATION_FAILED");
}

async function revokeGitHubInstallationToken(accessToken: string) {
  const response = await fetch("https://api.github.com/installation/token", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status !== 204) throw new Error("GITHUB_TEMPORARY_INSTALLATION_TOKEN_REVOCATION_FAILED");
}

interface Discovery { account: { subject: string; label: string }; resources: Array<{ type: ExternalResource["resourceType"]; externalId: string; label: string; url?: string }> }
async function discoverProvider(provider: ExternalProvider, accessToken: string, installationId?: string): Promise<Discovery> {
  if (provider === "github") {
    const repo = await boundedFetch<{ id: number; full_name: string; html_url: string; default_branch: string; permissions?: Record<string, boolean> }>(`https://api.github.com/repos/${TARGET_REPOSITORY}`, accessToken, provider);
    if (repo.full_name.toLowerCase() !== TARGET_REPOSITORY.toLowerCase()) throw new Error("GITHUB_REPOSITORY_TARGET_MISMATCH");
    const [issues, pulls, branches, commits] = await Promise.all([
      boundedFetch<Array<{ id: number; number: number; title: string; html_url: string; pull_request?: unknown }>>(`https://api.github.com/repos/${TARGET_REPOSITORY}/issues?state=open&per_page=10`, accessToken, provider),
      boundedFetch<Array<{ id: number; number: number; title: string; html_url: string }>>(`https://api.github.com/repos/${TARGET_REPOSITORY}/pulls?state=open&per_page=10`, accessToken, provider),
      boundedFetch<Array<{ name: string; commit: { sha: string } }>>(`https://api.github.com/repos/${TARGET_REPOSITORY}/branches?per_page=10`, accessToken, provider),
      boundedFetch<Array<{ sha: string; html_url: string; commit: { message: string } }>>(`https://api.github.com/repos/${TARGET_REPOSITORY}/commits?per_page=10`, accessToken, provider),
    ]);
    if (repo.default_branch && commits[0]) await boundedFetch<unknown>(`https://api.github.com/repos/${TARGET_REPOSITORY}/commits/${encodeURIComponent(commits[0].sha)}/check-runs?per_page=5`, accessToken, provider);
    if (repo.default_branch && commits[0]) await boundedFetch<unknown>(`https://api.github.com/repos/${TARGET_REPOSITORY}/commits/${encodeURIComponent(commits[0].sha)}/status`, accessToken, provider);
    const resources: Discovery["resources"] = [
      { type: "REPOSITORY", externalId: String(repo.id), label: repo.full_name, url: repo.html_url },
      ...branches.map((item) => ({ type: "GITHUB_BRANCH" as const, externalId: item.name, label: item.name })),
      ...commits.map((item) => ({ type: "GITHUB_COMMIT" as const, externalId: item.sha, label: item.commit.message.slice(0, 200), url: item.html_url })),
      ...issues.filter((item) => !item.pull_request).map((item) => ({ type: "ISSUE" as const, externalId: String(item.number), label: item.title, url: item.html_url })),
      ...pulls.map((item) => ({ type: "PULL_REQUEST" as const, externalId: String(item.number), label: item.title, url: item.html_url })),
    ];
    return { account: { subject: `installation:${installationId}`, label: "MMaia-jr · repositório autorizado" }, resources };
  }
  if (provider === "linear") {
    const query = JSON.stringify({ query: "query ConnectedWorldReadback { viewer { id name } teams(first: 10) { nodes { id name key cycles(first: 10) { nodes { id name number startsAt endsAt } } } } projects(first: 20) { nodes { id name url } } issues(first: 20) { nodes { id identifier title url } } }" });
    const response = await fetch("https://api.linear.app/graphql", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: query, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`LINEAR_READBACK_FAILED_${response.status}`);
    const payload = await response.json() as { data?: { viewer?: { id: string; name: string }; teams?: { nodes: Array<{ id: string; name: string; key: string; cycles?: { nodes: Array<{ id: string; name: string; number: number }> } }> }; projects?: { nodes: Array<{ id: string; name: string; url?: string }> }; issues?: { nodes: Array<{ id: string; identifier: string; title: string; url: string }> } } };
    const viewer = payload.data?.viewer;
    if (!viewer) throw new Error("LINEAR_VIEWER_READBACK_FAILED");
    const resources: Discovery["resources"] = [
      ...(payload.data?.teams?.nodes ?? []).map((item) => ({ type: "LINEAR_TEAM" as const, externalId: item.id, label: `${item.name} (${item.key})` })),
      ...(payload.data?.projects?.nodes ?? []).map((item) => ({ type: "LINEAR_PROJECT" as const, externalId: item.id, label: item.name, ...(item.url ? { url: item.url } : {}) })),
      ...(payload.data?.issues?.nodes ?? []).map((item) => ({ type: "LINEAR_ISSUE" as const, externalId: item.id, label: `${item.identifier} · ${item.title}`, url: item.url })),
      ...(payload.data?.teams?.nodes ?? []).flatMap((team) => (team.cycles?.nodes ?? []).map((item) => ({ type: "LINEAR_CYCLE" as const, externalId: item.id, label: `${team.key} · ${item.name} #${item.number}` }))),
    ];
    return { account: { subject: viewer.id, label: viewer.name }, resources };
  }
  const user = await boundedFetch<{ sub: string; email?: string }>("https://openidconnect.googleapis.com/v1/userinfo", accessToken, provider);
  if (!user.sub) throw new Error("GOOGLE_ACCOUNT_READBACK_FAILED");
  const [files, calendars, profile, gmailSearch] = await Promise.all([
    boundedFetch<{ files?: Array<{ id: string; name: string; webViewLink?: string }> }>("https://www.googleapis.com/drive/v3/files?pageSize=10&orderBy=modifiedTime%20desc&fields=files(id,name,webViewLink)&q=trashed%20%3D%20false", accessToken, provider),
    boundedFetch<{ items?: Array<{ id: string; summary: string }> }>("https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=10", accessToken, provider),
    boundedFetch<{ emailAddress?: string }>("https://gmail.googleapis.com/gmail/v1/users/me/profile", accessToken, provider),
    boundedFetch<{ messages?: Array<{ id: string; threadId: string }> }>("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=3&q=newer_than%3A30d", accessToken, provider),
  ]);
  // Verify Calendar event-read scope without retaining event titles or bodies.
  const primaryCalendar = calendars.items?.find((item) => item.id === "primary") ?? calendars.items?.[0];
  if (primaryCalendar) await boundedFetch<{ items?: Array<{ id: string }> }>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(primaryCalendar.id)}/events?maxResults=3&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(new Date().toISOString())}`, accessToken, provider);
  void gmailSearch;
  const resources: Discovery["resources"] = [
    ...(files.files ?? []).map((item) => ({ type: "DRIVE_FILE" as const, externalId: item.id, label: item.name, ...(item.webViewLink ? { url: item.webViewLink } : {}) })),
    ...(calendars.items ?? []).map((item) => ({ type: "GOOGLE_CALENDAR" as const, externalId: item.id, label: item.summary })),
  ];
  return { account: { subject: user.sub, label: profile.emailAddress ?? "Conta Google autorizada" }, resources };
}
async function exchange(provider: ExternalProvider, code: string, redirectUri: string, pending: OAuthPending) {
  if (provider === "github") {
    const id = clientId(provider), secret = await clientSecret(provider);
    const token = await tokenRequest("https://github.com/login/oauth/access_token", new URLSearchParams({ client_id: id, client_secret: secret, code, redirect_uri: redirectUri }), { Accept: "application/json" });
    return { token, installationId: null as string | null };
  }
  if (provider === "linear") {
    const token = await tokenRequest("https://api.linear.app/oauth/token", new URLSearchParams({ client_id: clientId(provider), client_secret: await clientSecret(provider), code, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: pending.verifier }));
    return { token, installationId: null as string | null };
  }
  const token = await tokenRequest("https://oauth2.googleapis.com/token", new URLSearchParams({ client_id: clientId(provider), client_secret: await clientSecret(provider), code, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: pending.verifier }));
  return { token, installationId: null as string | null };
}

export async function completeConnectionOAuth(request: NextRequest, provider: ExternalProvider) {
  if (!localHostAllowed(request)) return NextResponse.json({ error: "Callback local indisponível." }, { status: 503 });
  const cookieValue = request.cookies.get(STATE_COOKIE)?.value;
  const queryState = request.nextUrl.searchParams.get("state");
  let pending: OAuthPending & { provider?: string } | null = null;
  try { pending = cookieValue ? JSON.parse(cookieValue) as OAuthPending & { provider?: string } : null; } catch { /* fail closed */ }
  const stateValid = validateOAuthCallback(pending, queryState);
  const token = request.cookies.get(SESSION)?.value;
  const store = db();
  const principal = store.sessionIdentity(token);
  if (!stateValid || pending?.provider !== provider || !principal) {
    const response = NextResponse.redirect(new URL("/discover?connection_error=Autorização+expirada+ou+não+corresponde+à+sessão.", request.url));
    sameSiteStateCookie(response, null); return response;
  }
  if (request.nextUrl.searchParams.has("error")) {
    const response = NextResponse.redirect(new URL(`/discover?connection_error=${encodeURIComponent("A autorização foi cancelada; nenhuma conexão foi criada.")}`, request.url));
    sameSiteStateCookie(response, null); return response;
  }
  const code = request.nextUrl.searchParams.get("code");
  if (!code || code.length > 4096) {
    const response = NextResponse.redirect(new URL("/discover?connection_error=O+provedor+não+retornou+uma+autorização+válida.", request.url));
    sameSiteStateCookie(response, null); return response;
  }
  let temporaryAccessToken: string | null = null;
  let temporaryInstallationToken: string | null = null;
  const savedAccounts: string[] = [];
  try {
    const before = store.read();
    if (!hasInstitutionalState(before) || !before.cell) throw new Error("BOOTSTRAP_REQUIRED");
    const actor = actorFor(before, principal.provider, principal.subject);
    if (actor !== before.person.id || !canAct(actor, before.cell.id, "cell.update", before.memberships, before.authorities)) throw new Error("CONNECTION_AUTHORITY_DENIED");
    const redirectUri = callbackUrl(provider);
    const { token: exchanged, installationId: unused } = await exchange(provider, code, redirectUri, pending);
    void unused;
    temporaryAccessToken = exchanged.access_token!;
    let scopes = (exchanged.scope ?? "").split(/[ ,]+/).filter(Boolean);
    if (provider !== "github") {
      const required = providerOAuthScopes[provider] as readonly string[];
      if (!required.every((scope) => scopes.includes(scope))) throw new Error("OAUTH_SCOPE_DOWNGRADE");
    }
    let accessToken = temporaryAccessToken;
    let installationId: string | undefined;
    if (provider === "github") {
      const appId = process.env.CZ_GITHUB_APP_ID;
      const pem = await service.get("github:app-private-key");
      if (!appId || !pem) throw new Error("GITHUB_APP_PRIVATE_KEY_NOT_CONFIGURED");
      const jwt = await githubJwt(appId, pem);
      const userInstallations = await boundedFetch<{ installations?: Array<{ id: number; account?: { login?: string } }> }>("https://api.github.com/user/installations?per_page=100", accessToken, provider);
      const ownerInstallations = userInstallations.installations?.filter((item) => item.account?.login?.toLowerCase() === "mmaia-jr") ?? [];
      if (ownerInstallations.length !== 1) throw new Error(ownerInstallations.length ? "GITHUB_INSTALLATION_AMBIGUOUS" : "GITHUB_INSTALLATION_NOT_AUTHORIZED_FOR_ACCOUNT");
      installationId = String(ownerInstallations[0]!.id);
      const authorizedRepositories = await boundedFetch<{ repositories?: Array<{ full_name: string }> }>(`https://api.github.com/user/installations/${installationId}/repositories?per_page=100`, accessToken, provider);
      if (!authorizedRepositories.repositories?.some((repo) => repo.full_name.toLowerCase() === TARGET_REPOSITORY.toLowerCase())) throw new Error("GITHUB_TARGET_REPOSITORY_NOT_GRANTED");
      const installationToken = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, { method: "POST", headers: { Authorization: `Bearer ${jwt}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" }, body: JSON.stringify({ repositories: ["celula-zero"], permissions: { contents: "read", issues: "write", pull_requests: "write", checks: "read", statuses: "read" } }), cache: "no-store", signal: AbortSignal.timeout(20_000) });
      const installationPayload = await installationToken.json() as { token?: string; permissions?: Record<string, string>; repositories?: Array<{ full_name: string }> };
      if (!installationToken.ok || !installationPayload.token || !installationPayload.repositories?.some((repo) => repo.full_name.toLowerCase() === TARGET_REPOSITORY.toLowerCase())) throw new Error("GITHUB_TARGET_REPOSITORY_NOT_GRANTED");
      temporaryInstallationToken = installationPayload.token;
      for (const [permission, access] of Object.entries({ contents: "read", issues: "write", pull_requests: "write", checks: "read", statuses: "read" })) if (installationPayload.permissions?.[permission] !== access) throw new Error("GITHUB_PERMISSION_READBACK_MISMATCH");
      scopes = [...providerOAuthScopes.github];
      accessToken = installationPayload.token;
      // The user token is only needed to prove the selected installation belongs
      // to the authenticated GitHub account. All bounded repository reads use
      // the narrower, single-repository installation token.
      await revokeGitHubUserToken(temporaryAccessToken);
      temporaryAccessToken = null;
    }
    const discovery = await discoverProvider(provider, accessToken, installationId);
    const connectionId = randomUUID(), accountId = randomUUID(), credentialId = randomUUID(), grantId = randomUUID(), consentId = randomUUID();
    const now = new Date().toISOString();
    const vaultAccount = provider === "github" ? null : providerCredentialAccount(provider, connectionId, "access-token");
    const refreshAccount = provider === "github" ? null : providerCredentialAccount(provider, connectionId, "refresh-token");
    if (provider !== "github") {
      const bundle = JSON.stringify({ accessToken: exchanged.access_token, expiresAt: Date.now() + (exchanged.expires_in ?? 3600) * 1000 });
      await service.set(vaultAccount!, bundle); savedAccounts.push(vaultAccount!);
      if (exchanged.refresh_token) { await service.set(refreshAccount!, exchanged.refresh_token); savedAccounts.push(refreshAccount!); }
    }
    const credentialLocator = provider === "github" ? `github:app-installation:${installationId}` : vaultAccount!;
    const sourceText = JSON.stringify({ provider, externalAccount: discovery.account.subject, scopes, authorizedAt: now, boundary: "OAUTH_GRANT_IS_NOT_CZ_AUTHORITY; provider access remains constrained by current CZ authority and Action Gateway policy." });
    const result = store.transact((current) => {
      if (!hasInstitutionalState(current) || current.person.id !== actor || !current.cell || !canAct(actor, current.cell.id, "cell.update", current.memberships, current.authorities)) throw new Error("CONNECTION_AUTHORITY_CHANGED");
      const consent = { id: consentId, kind: "OriginalRecord" as const, purpose: "connection_authorization" as const, content: sourceText, authorId: actor, createdAt: now, visibility: { scope: "private" as const, ownerId: actor } };
      const next: FoundationState = structuredClone(current);
      next.connections ??= []; next.authorizationGrants ??= []; next.externalAccounts ??= []; next.externalResources ??= []; next.credentialReferences ??= []; next.capabilityBindings ??= []; next.records = appendRecord(next.records, consent);
      const previous = next.connections.find((item) => item.provider === provider && item.owner.kind === "PERSON" && item.owner.id === actor && item.status !== "REVOKED");
      if (previous) {
        previous.status = "REVOKED"; previous.revokedAt = now;
        const oldGrant = next.authorizationGrants.find((item) => item.id === previous.authorizationGrantId); if (oldGrant) oldGrant.revokedAt = now;
        const oldCredential = next.credentialReferences.find((item) => item.id === previous.credentialReferenceId); if (oldCredential) oldCredential.status = "REVOKED";
      }
      next.externalAccounts.push({ id: accountId, provider, externalSubject: discovery.account.subject, displayLabel: discovery.account.label.slice(0, 160), observedAt: now, source: "PROVIDER_READBACK" });
      next.credentialReferences.push({ id: credentialId, provider, store: "OS_KEYCHAIN", locator: credentialLocator, status: "AVAILABLE", createdAt: now });
      const connection = { id: connectionId, owner: { kind: "PERSON" as const, id: actor }, provider, status: "CONNECTED" as const, externalAccountId: accountId, authorizationGrantId: grantId, credentialReferenceId: credentialId, createdAt: now, lastVerifiedAt: now };
      next.connections.push(connection);
      const grantedActions = provider === "github"
        ? ["github:read_repository", "github:read_branch", "github:read_commit", "github:read_issue", "github:read_pull_request", "github:create_issue", "github:update_issue", "github:comment_issue", "github:open_pull_request", "github:update_pull_request", "github:comment_pull_request"]
        : provider === "linear"
          ? ["linear:read_team", "linear:read_issue", "linear:read_cycle", ...(scopes.includes("write") && scopes.includes("issues:create") ? ["linear:create_issue", "linear:update_issue"] : []), ...(scopes.includes("write") && scopes.includes("comments:create") ? ["linear:create_comment"] : [])]
          : [
              ...(scopes.includes("https://www.googleapis.com/auth/gmail.readonly") ? ["google:read_thread"] : []),
              ...(scopes.includes("https://www.googleapis.com/auth/gmail.compose") ? ["google:create_draft", "google:send_email"] : []),
              ...(scopes.includes("https://www.googleapis.com/auth/drive.readonly") ? ["google:read_file"] : []),
              ...(scopes.includes("https://www.googleapis.com/auth/calendar.events.owned") ? ["google:read_event", "google:create_event", "google:update_event"] : []),
            ];
      next.authorizationGrants.push({ id: grantId, connectionId, grantedByPersonId: actor, scopes: [...new Set([...scopes, ...grantedActions])], consentRecordId: consentId, grantedAt: now });
      const capabilityFor = (resourceType: ExternalResource["resourceType"]) => providerCapabilityCatalog.filter((definition) => definition.provider === provider && definition.targetResourceTypes.includes(resourceType));
      for (const discovered of discovery.resources) {
        const resourceId = randomUUID();
        const resource = externalResourceSchema.parse({ id: resourceId, provider, accountId, resourceType: discovered.type, externalId: discovered.externalId, label: discovered.label.slice(0, 240), source: "PROVIDER_READBACK", observedAt: now, ...(discovered.url ? { url: discovered.url } : {}) });
        next.externalResources.push(resource);
        for (const definition of capabilityFor(discovered.type)) next.capabilityBindings.push({ id: randomUUID(), connectionId, capabilityDefinitionId: definition.id, externalResourceId: resourceId, enabledAt: now });
      }
      return { state: next, result: { ok: true } };
    });
    void result;
    const response = NextResponse.redirect(new URL("/discover?connection=connected", request.url));
    sameSiteStateCookie(response, null);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    for (const account of savedAccounts) await service.delete(account).catch(() => undefined);
    console.error("CZ_CONNECTION_OAUTH_FAILED", JSON.stringify({ provider, failureCode: error instanceof Error && /^[A-Z0-9_:-]{3,100}$/.test(error.message) ? error.message : "CONNECTED_WORLD_OPERATION_FAILED" }));
    const response = errorResponse(error, request);
    sameSiteStateCookie(response, null);
    return response;
  } finally {
    if (temporaryAccessToken && provider === "github") await revokeGitHubUserToken(temporaryAccessToken).catch(() => console.error("CZ_CONNECTION_OAUTH_CLEANUP_FAILED", JSON.stringify({ provider, failureCode: "GITHUB_TEMPORARY_USER_TOKEN_REVOCATION_FAILED" })));
    temporaryAccessToken = null;
    if (temporaryInstallationToken) await revokeGitHubInstallationToken(temporaryInstallationToken).catch(() => undefined);
  }
}

export async function revokeConnection(store: LocalStore, actor: PersonId, provider: ExternalProvider, secrets: SecretStore = service) {
  const now = new Date().toISOString();
  const providerContext = store.transact<{ provider: ExternalProvider; connectionId: string; accountSubject: string }>((current) => {
    if (!hasInstitutionalState(current) || !current.cell || actor !== current.person.id || !canAct(actor, current.cell.id, "cell.update", current.memberships, current.authorities)) throw new Error("CONNECTION_AUTHORITY_DENIED");
    const next = structuredClone(current);
    const active = next.connections?.filter((item) => item.provider === provider && item.owner.kind === "PERSON" && item.owner.id === actor && item.status === "CONNECTED") ?? [];
    if (!active.length) throw new Error("CONNECTION_NOT_FOUND");
    if (active.length > 1) throw new Error("CONNECTION_AMBIGUOUS");
    const connection = active[0]!;
    const credential = next.credentialReferences?.find((item) => item.id === connection.credentialReferenceId);
    if (!credential) throw new Error("CREDENTIAL_REFERENCE_UNAVAILABLE");
    const grant = next.authorizationGrants?.find((item) => item.id === connection.authorizationGrantId);
    if (grant) grant.revokedAt = now;
    connection.status = "REVOKED"; connection.revokedAt = now;
    credential.status = "REVOKED";
    const account = next.externalAccounts?.find((item) => item.id === connection.externalAccountId);
    if (!account) throw new Error("CONNECTED_ACCOUNT_UNAVAILABLE");
    next.records = appendRecord(next.records, { id: randomUUID(), kind: "OriginalRecord", purpose: "connection_authorization", authorId: actor, createdAt: now, visibility: { scope: "private", ownerId: actor }, content: JSON.stringify({ action: "connection_revoked", provider: connection.provider, connectionId: connection.id, authorizationGrantId: grant?.id ?? null, revokedAt: now }) });
    return { state: next, result: { provider: connection.provider, connectionId: connection.id, accountSubject: account.externalSubject } };
  });
  const connectionId = providerContext.connectionId;
  let providerRevoked = false;
  try {
    if (providerContext.provider === "github") {
      const installationId = providerContext.accountSubject.replace(/^installation:/, "");
      const appId = process.env.CZ_GITHUB_APP_ID;
      const privateKey = await secrets.get("github:app-private-key");
      if (appId && privateKey && /^\d+$/.test(installationId)) {
        const jwt = await githubJwt(appId, privateKey);
        const response = await fetch(`https://api.github.com/app/installations/${installationId}`, { method: "DELETE", headers: { Authorization: `Bearer ${jwt}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, signal: AbortSignal.timeout(15_000) });
        providerRevoked = response.status === 204 || response.status === 404;
      }
    } else {
      const accessAccount = providerCredentialAccount(providerContext.provider, connectionId, "access-token");
      const refreshAccount = providerCredentialAccount(providerContext.provider, connectionId, "refresh-token");
      const access = await secrets.get(accessAccount);
      const refresh = await secrets.get(refreshAccount);
      const accessToken = access ? (JSON.parse(access) as { accessToken?: string }).accessToken : undefined;
      const tokenToRevoke = refresh ?? accessToken;
      if (tokenToRevoke) {
        const endpoint = providerContext.provider === "linear" ? "https://api.linear.app/oauth/revoke" : "https://oauth2.googleapis.com/revoke";
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: tokenToRevoke, token_type_hint: refresh ? "refresh_token" : "access_token" }), signal: AbortSignal.timeout(15_000) });
        providerRevoked = response.ok;
      }
      await secrets.delete(accessAccount);
      await secrets.delete(refreshAccount);
    }
  } catch {
    // Local grant revocation already failed closed; network/Keychain errors are not surfaced with provider payloads.
    providerRevoked = false;
  }
  if (providerContext.provider !== "github") {
    await Promise.allSettled([
      secrets.delete(providerCredentialAccount(providerContext.provider, connectionId, "access-token")),
      secrets.delete(providerCredentialAccount(providerContext.provider, connectionId, "refresh-token")),
    ]);
  }
  return { revoked: true, providerRevoked };
}

export function parseProvider(value: string): ExternalProvider | null { return value === "github" || value === "linear" || value === "google" ? value : null; }
