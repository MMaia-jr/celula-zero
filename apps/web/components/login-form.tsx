"use client";

import { useActionState } from "react";
import { requestAccessLink } from "@/app/login/actions";
import { initialLoginState } from "@/app/login/state";

export function LoginForm({ enabled, next }: { enabled: boolean; next: string }) {
  const [state, action, pending] = useActionState(requestAccessLink, initialLoginState);

  return (
    <form className="auth-card" action={action}>
      <input type="hidden" name="next" value={next} />
      <div>
        <p className="mini-label">E-mail</p>
        <h2>Entrar ou criar acesso</h2>
        <p>Se o e-mail ainda não existir, o Supabase pode criar a conta durante o magic link.</p>
      </div>
      <label htmlFor="email">E-mail</label>
      <input
        id="email"
        name="email"
        type="email"
        placeholder="voce@exemplo.com"
        autoComplete="email"
        disabled={!enabled || pending}
        required
      />
      <button
        className="button button-primary button-full"
        type="submit"
        disabled={!enabled || pending}
      >
        {pending ? "Emitindo link…" : "Continuar por e-mail"}
      </button>
      {!enabled ? (
        <p className="form-message form-neutral">
          Configure o Supabase para habilitar autenticação.
        </p>
      ) : null}
      {state.message ? (
        <p className={`form-message form-${state.status.toLowerCase()}`} role="status">
          {state.message}
        </p>
      ) : null}
      <small>Login não equivale a autoridade, membership, reputação ou Commitment.</small>
    </form>
  );
}
