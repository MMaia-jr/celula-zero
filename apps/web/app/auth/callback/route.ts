import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  isSupabaseSessionCookie,
  resolveApplicationOrigin,
  resolveSafeNext,
} from "@/lib/auth/redirect";
import { getSupabasePublicEnvironment } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = resolveSafeNext(url.searchParams.get("next"));
  const applicationOrigin = resolveApplicationOrigin(
    process.env.NEXT_PUBLIC_SITE_URL,
    request.url,
  );
  const environment = getSupabasePublicEnvironment();

  if (code && environment) {
    const redirectResponse = NextResponse.redirect(new URL(next, applicationOrigin));
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

    await client.auth.initialize();
    const { data, error } = await client.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const hasSessionCookie = () =>
        redirectResponse.cookies
          .getAll()
          .some(({ name, value }) => isSupabaseSessionCookie(name) && value.length > 0);

      if (!hasSessionCookie()) {
        await client.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      if (hasSessionCookie()) return redirectResponse;
    }
  }

  return NextResponse.redirect(new URL("/login?error=invalid-link", applicationOrigin));
}
