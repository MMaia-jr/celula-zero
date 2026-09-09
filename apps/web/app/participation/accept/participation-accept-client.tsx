"use client";
import { useActionState, useEffect, useState } from "react";
import { acceptInvitation } from "../actions";
import { tokenFromFragment } from "@/lib/domain/participation";

const initialState = { ok:false, message:"" };
export function ParticipationAcceptClient() {
  const [token,setToken] = useState<string | null>(null);
  const [state,action,pending] = useActionState(acceptInvitation,initialState);
  useEffect(() => {
    const task = window.setTimeout(() => setToken(tokenFromFragment(window.location.hash)), 0);
    return () => window.clearTimeout(task);
  }, []);
  return <section className="content-block"><p>The bearer token is read from the URL fragment and is not sent in the initial request URL.</p>
    {!token ? <p role="alert">A valid invitation fragment is required.</p> : <form action={action}><input type="hidden" name="token" value={token}/><label htmlFor="statement">Explicit consent statement</label><textarea id="statement" name="statement" required minLength={10}/><button className="button button-primary" disabled={pending}>{pending ? "Recording…" : "Consent and participate"}</button></form>}
    {state.message ? <p role="status">{state.message}</p> : null}</section>;
}
