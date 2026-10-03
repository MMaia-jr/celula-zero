// SPDX-License-Identifier: MPL-2.0
import { cookies, headers } from "next/headers";
import { resolvePerson } from "@cz/identity";
import { LocalStore } from "./local-store";
import { assertNoCompetingFoundationStore, logFoundationStorePath, resolveFoundationStorePath } from "./foundation-db-path";
import {
  hasInstitutionalState,
  isEmptyFoundation,
  projection,
  type FoundationView,
} from "./foundation";

export interface ServerEntry {
  loaded: boolean;
  authenticated: boolean;
  bootstrapRequired: boolean;
  view: FoundationView | null;
  error: string | null;
}

const COOKIE = "cz_foundation_session";
const emptyEntry = (error: string | null = null): ServerEntry => ({
  loaded: true,
  authenticated: false,
  bootstrapRequired: false,
  view: null,
  error,
});

/** Render the existing local session before hydration; this is a read path only. */
export async function readServerEntry(): Promise<ServerEntry> {
  if (process.env.CZ_LOCAL_FOUNDATION !== "1") return { ...emptyEntry(), loaded: false };
  const host = (await headers()).get("host");
  if (!host || !/^(127\.0\.0\.1|localhost):[0-9]+$/.test(host))
    return { ...emptyEntry(), loaded: false };

  const token = (await cookies()).get(COOKIE)?.value;
  let store: LocalStore | undefined;
  try {
    const storePath = resolveFoundationStorePath();
    assertNoCompetingFoundationStore(storePath);
    logFoundationStorePath(storePath);
    store = new LocalStore(storePath);
    const principal = store.sessionIdentity(token);
    if (!principal) return emptyEntry();
    if (principal.provider !== "huly") return emptyEntry("A sessão não usa um provedor reconhecido.");

    const state = store.read();
    const active = state.credentials.filter((credential) =>
      credential.provider === principal.provider &&
      credential.subject === principal.subject &&
      credential.status === "active",
    );
    if (active.length > 1) return emptyEntry("Há mais de um vínculo ativo para esta conta. A entrada foi interrompida para proteger sua continuidade.");
    if (active.length === 0) {
      if (isEmptyFoundation(state)) return { loaded: true, authenticated: true, bootstrapRequired: true, view: null, error: null };
      return emptyEntry("A identidade não pôde ser resolvida com segurança.");
    }

    const personId = resolvePerson(state.credentials, principal.provider, principal.subject);
    if (!hasInstitutionalState(state) || state.person.id !== personId)
      return emptyEntry("A identidade não pôde ser resolvida com segurança.");
    return { loaded: true, authenticated: true, bootstrapRequired: false, view: projection(state, personId), error: null };
  } catch {
    return emptyEntry("Não foi possível ler sua continuidade local. Nenhum registro foi alterado.");
  } finally {
    store?.close();
  }
}
