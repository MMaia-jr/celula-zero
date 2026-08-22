import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabasePublicEnvironment } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/projects";
  const environment = getSupabasePublicEnvironment();

  if (code && environment) {
    const redirectResponse = NextResponse.redirect(new URL(next, url.origin));
    const client = createServerClient(environment.url, environment.publishableKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    });
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return redirectResponse;
  }

  return NextResponse.redirect(new URL("/login?error=invalid-link", url.origin));
}
