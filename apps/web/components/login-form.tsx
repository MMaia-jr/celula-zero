"use client";

import { useActionState } from "react";
import { initialLoginState, requestAccessLink } from "@/app/login/actions";

export function LoginForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(requestAccessLink, initialLoginState);

  return (
    <form className="auth-card" action={action}>
      <div>
        <p className="mini-label">Link de acesso</p>
        <h2>Entre no piloto local</h2>
        <p>Use um e-mail previamente incluído em <code>pilot_invites</code>.</p>
      </div>
      <label htmlFor="email">E-mail</label>
      <input id="email" name="email" type="email" placeholder="pilot@celulazero.local" autoComplete="email" disabled={!enabled || pending} required />
      <button className="button button-primary button-full" type="submit" disabled={!enabled || pending}>
        {pending ? "Emitindo link…" : "Receber link local"}
      </button>
      {!enabled ? <p className="form-message form-neutral">Configure o Supabase local para habilitar o acesso.</p> : null}
      {state.message ? <p className={`form-message form-${state.status.toLowerCase()}`} role="status">{state.message}</p> : null}
      <small>Nenhuma senha ou chave privilegiada é enviada ao navegador.</small>
    </form>
  );
}
