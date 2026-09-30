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
  const ids = [
    ...new Set(
      credentials
        .filter(
          (c) =>
            c.provider === provider &&
            c.subject === subject &&
            c.status === "active",
        )
        .map((c) => c.personId),
    ),
  ];
  if (ids.length !== 1 || !ids[0]) throw new Error("IDENTITY_UNRESOLVED");
  return ids[0];
}
