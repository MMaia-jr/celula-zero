// SPDX-License-Identifier: MPL-2.0
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function habitatEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

export function habitatSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const branchHost = process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
  if (branchHost) return `https://${branchHost}`;
  return "http://localhost:3088";
}

export async function habitatClient() {
  const environment = habitatEnvironment();
  if (!environment) return null;
  const cookieStore = await cookies();
  return createServerClient(environment.url, environment.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Session refresh is handled in the route handler that mutates cookies.
        }
      },
    },
  });
}
