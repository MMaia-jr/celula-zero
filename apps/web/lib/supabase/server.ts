import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnvironment } from "@/lib/supabase/config";

export async function createSupabaseServerClient() {
  const environment = getSupabasePublicEnvironment();
  if (!environment) return null;

  const cookieStore = await cookies();

  return createServerClient(environment.url, environment.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. Session refresh is
          // handled by proxy.ts, where the response is mutable.
        }
      },
    },
  });
}
