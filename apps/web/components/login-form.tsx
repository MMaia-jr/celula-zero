"use client";

import { useActionState } from "react";
import { requestAccessLink } from "@/app/login/actions";
import { initialLoginState } from "@/app/login/state";
import type { Locale } from "@/lib/i18n/core";

export function LoginForm({
  enabled,
  next,
  locale,
}: {
  enabled: boolean;
  next: string;
  locale: Locale;
}) {
  const en = locale === "en";
  const [state, action, pending] = useActionState(requestAccessLink, initialLoginState);

  return (
    <form className="auth-card" action={action}>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="locale" value={locale} />
      <div>
        <p className="mini-label">{en ? "Email" : "E-mail"}</p>
        <h2>{en ? "Sign in or create access" : "Entrar ou criar acesso"}</h2>
        <p>
          {en
            ? "If the email does not exist yet, Supabase may create the account through the magic link."
            : "Se o e-mail ainda não existir, o Supabase pode criar a conta durante o magic link."}
        </p>
      </div>
      <label htmlFor="email">{en ? "Email" : "E-mail"}</label>
      <input
        id="email"
        name="email"
        type="email"
        placeholder={en ? "you@example.com" : "voce@exemplo.com"}
        autoComplete="email"
        disabled={!enabled || pending}
        required
      />
      <button
        className="button button-primary button-full"
        type="submit"
        disabled={!enabled || pending}
      >
        {pending
          ? en ? "Issuing link…" : "Emitindo link…"
          : en ? "Continue by email" : "Continuar por e-mail"}
      </button>
      {!enabled ? (
        <p className="form-message form-neutral">
          {en
            ? "Configure Supabase to enable authentication."
            : "Configure o Supabase para habilitar autenticação."}
        </p>
      ) : null}
      {state.message ? (
        <p className={`form-message form-${state.status.toLowerCase()}`} role="status">
          {state.message}
        </p>
      ) : null}
      <small>
        {en
          ? "Login does not equal authority, membership, reputation, or Commitment."
          : "Login não equivale a autoridade, membership, reputação ou Commitment."}
      </small>
    </form>
  );
}
