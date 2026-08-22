export function resolveApplicationOrigin(
  configuredSiteUrl: string | undefined,
  requestUrl: string,
) {
  const configured = configuredSiteUrl?.trim();

  try {
    return new URL(configured || requestUrl).origin;
  } catch {
    return new URL(requestUrl).origin;
  }
}

export function resolveSafeNext(requestedNext: string | null, fallback = "/projects") {
  return requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : fallback;
}

export function isSupabaseSessionCookie(name: string) {
  return name.startsWith("sb-") && name.includes("-auth-token") && !name.endsWith("-code-verifier");
}
