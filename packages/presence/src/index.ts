// SPDX-License-Identifier: MPL-2.0
import type { PersonId } from "@cz/identity";
import type { Provenance, VisibilityPolicy } from "@cz/records";
export type { VisibilityPolicy } from "@cz/records";
export interface Profile {
  id: string;
  personId: PersonId;
  headline: string;
  bio: string;
  visibility: VisibilityPolicy;
  updatedAt: string;
}
export interface Experience {
  id: string;
  personId: PersonId;
  title: string;
  description: string;
  occurredOn: string;
  provenance: Provenance;
  visibility: VisibilityPolicy;
  sourceRecordId: string;
}
export interface Capability {
  id: string;
  personId: PersonId;
  name: string;
  provenance: Provenance;
  verificationIds: string[];
}
export interface PortfolioItem {
  id: string;
  personId: PersonId;
  title: string;
  artifactUrl: string;
  sourceRecordIds: string[];
  visibility: VisibilityPolicy;
}
export interface BioView {
  personId: PersonId;
  text: string;
  sourceRecordIds: string[];
  provenance: Provenance;
  visibility: VisibilityPolicy;
}
export function reportedExperience(
  input: Omit<Experience, "provenance">,
  actorId: PersonId,
  now: string,
): Experience {
  if (
    actorId !== input.personId ||
    input.visibility.scope !== "private" ||
    input.visibility.ownerId !== actorId
  )
    throw new Error("FORBIDDEN");
  return {
    ...input,
    provenance: {
      origin: "user_reported",
      actorId,
      actorKind: "human",
      sourceIds: [input.sourceRecordId],
      createdAt: now,
    },
  };
}
