"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { buildAuthCallbackUrl, resolveSafeNext } from "@/lib/auth/redirect";
import { coerceLocale } from "@/lib/i18n/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LoginActionState } from "@/app/login/state";

export async function requestAccessLink(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const locale = coerceLocale(formData.get("locale"));
  const en = locale === "en";
  const email = z.string().trim().email().safeParse(formData.get("email"));

  if (!email.success) {
    return {
      status: "ERROR",
      message: en ? "Enter a valid email address." : "Informe um e-mail válido.",
    };
  }

  const requestedNext =
    typeof formData.get("next") === "string" ? String(formData.get("next")) : null;
  const next = resolveSafeNext(requestedNext, "/projects");

  const client = await createSupabaseServerClient();
  if (!client) {
    return {
      status: "ERROR",
      message: en ? "Supabase is not configured." : "Supabase local não configurado.",
    };
  }

  const requestHeaders = await headers();
  const incomingUrl = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = buildAuthCallbackUrl(process.env.NEXT_PUBLIC_SITE_URL, incomingUrl, next);
  const { error } = await client.auth.signInWithOtp({
    email: email.data,
    options: {
      emailRedirectTo: callbackUrl,
      shouldCreateUser: false,
    },
  });

  if (error) {
    return {
      status: "ERROR",
      message: en
        ? "The access link could not be issued."
        : "Não foi possível emitir o link de acesso.",
    };
  }

  return {
    status: "SENT",
    message: en
      ? "Access link issued. Open the email to continue exactly where you left off."
      : "Link emitido. Abra o e-mail para continuar exatamente de onde você parou.",
  };
}

export async function signInWithGoogle(formData: FormData) {
  const requestedNext = typeof formData.get("next") === "string" ? String(formData.get("next")) : null;
  const next = resolveSafeNext(requestedNext, "/genesis");
  const client = await createSupabaseServerClient();
  if (!client) redirect(`/login?error=not-configured&next=${encodeURIComponent(next)}`);

  const requestHeaders = await headers();
  const incomingUrl = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectTo = buildAuthCallbackUrl(process.env.NEXT_PUBLIC_SITE_URL, incomingUrl, next);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error || !data.url) redirect(`/login?error=oauth&next=${encodeURIComponent(next)}`);
  redirect(data.url);
}
