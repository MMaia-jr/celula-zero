"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoginActionState {
  status: "IDLE" | "ERROR" | "SENT";
  message: string;
}

export const initialLoginState: LoginActionState = { status: "IDLE", message: "" };

export async function requestAccessLink(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (!email.success) return { status: "ERROR", message: "Informe um e-mail válido." };

  const client = await createSupabaseServerClient();
  if (!client) return { status: "ERROR", message: "Supabase local não configurado." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await client.auth.signInWithOtp({
    email: email.data,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/projects/new`,
      shouldCreateUser: true,
    },
  });

  if (error) return { status: "ERROR", message: "Não foi possível emitir o link de acesso." };
  return {
    status: "SENT",
    message: "Link emitido. No ambiente local, abra a caixa de e-mail do Supabase em http://127.0.0.1:54324.",
  };
}
