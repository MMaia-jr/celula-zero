export interface SupabasePublicEnvironment {
  url: string;
  publishableKey: string;
}

export function getSupabasePublicEnvironment(): SupabasePublicEnvironment | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey || publishableKey.startsWith("replace-")) {
    return null;
  }

  return { url, publishableKey };
}
