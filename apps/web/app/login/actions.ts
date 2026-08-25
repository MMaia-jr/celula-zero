"use server";

import { z } from "zod";
import { resolveSafeNext } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LoginActionState } from "@/app/login/state";

export async function requestAccessLink(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (!email.success) return { status: "ERROR", message: "Informe um e-mail válido." };

  const requestedNext =
    typeof formData.get("next") === "string" ? String(formData.get("next")) : null;
  const next = resolveSafeNext(requestedNext, "/projects");

  const client = await createSupabaseServerClient();
  if (!client) return { status: "ERROR", message: "Supabase local não configurado." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await client.auth.signInWithOtp({
    email: email.data,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  if (error) return { status: "ERROR", message: "Não foi possível emitir o link de acesso." };
  return {
    status: "SENT",
    message: "Link emitido. Abra o e-mail para continuar exatamente de onde você parou.",
  };
}
