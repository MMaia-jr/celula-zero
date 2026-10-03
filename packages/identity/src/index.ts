// SPDX-License-Identifier: MPL-2.0
export type PersonId = string & { readonly __person: unique symbol };
export interface Person {
  id: PersonId;
  name: string;
  createdAt: string;
}
export interface IdentityCredential {
  id: string;
  personId: PersonId;
  provider: string;
  subject: string;
  status: "active" | "revoked";
}
export interface ExternalIdentity {
  id: string;
  personId: PersonId;
  provider: string;
  url: string;
  ownership: "unverified" | "verified";
  sourceRecordId: string;
}
export function resolvePerson(
  credentials: readonly IdentityCredential[],
  provider: string,
  subject: string,
): PersonId {
  const active = credentials.filter(
    (c) => c.provider === provider && c.subject === subject && c.status === "active",
  );
  if (active.length > 1) throw new Error("CZ_IDENTITY_AMBIGUOUS");
  if (active.length !== 1 || !active[0]?.personId) throw new Error("IDENTITY_UNRESOLVED");
  return active[0].personId;
}
