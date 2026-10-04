// SPDX-License-Identifier: MPL-2.0
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { habitatEnvironment, habitatSiteUrl } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const environment = habitatEnvironment();
  const siteUrl = habitatSiteUrl();
  if (!code || !environment)
    return NextResponse.redirect(new URL("/login?result=invalid", request.url));

  const response = NextResponse.redirect(new URL("/", siteUrl));
  const client = createServerClient(environment.url, environment.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?result=invalid", siteUrl));
  const allowlisted = process.env.CZ_FOUNDER_EMAIL?.trim().toLowerCase();
  if (!allowlisted || data.user.email?.toLowerCase() !== allowlisted) {
    await client.auth.signOut();
    return NextResponse.redirect(new URL("/login?result=sent", siteUrl));
  }
  return response;
}
