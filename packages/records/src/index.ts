// SPDX-License-Identifier: MPL-2.0
import type { PersonId } from "@cz/identity";
export type VisibilityPolicy =
  | { scope: "private"; ownerId: PersonId }
  | { scope: "cell"; cellId: string }
  | { scope: "public" };
export type Origin =
  | "user_reported"
  | "source_observed"
  | "ai_inferred"
  | "human_confirmed"
  | "evidenced"
  | "verified";
export interface Provenance {
  origin: Origin;
  actorId: string;
  actorKind: "human" | "agent" | "system";
  sourceIds: readonly string[];
  createdAt: string;
}
interface BaseRecord {
  id: string;
  authorId: string;
  createdAt: string;
  visibility: VisibilityPolicy;
}
export type InstitutionalRecord = BaseRecord &
  (
    | {
        kind: "OriginalRecord";
        content: string;
        purpose:
          | "experience"
          | "profile"
          | "external_identity"
          | "intention"
          | "cell";
      }
    | {
        kind: "Interpretation";
        content: string;
        sourceId: string;
        generatorId: string;
      }
    | { kind: "Claim"; content: string; sourceIds: string[] }
    | { kind: "Evidence"; claimId: string; sourceId: string; rationale: string }
    | {
        kind: "Verification";
        claimId: string;
        evidenceIds: string[];
        method: string;
        outcome: "supported" | "unsupported" | "inconclusive";
      }
    | { kind: "Decision"; content: string; authorityId: string }
  );
export function appendRecord(
  records: readonly InstitutionalRecord[],
  record: InstitutionalRecord,
): InstitutionalRecord[] {
  if (records.some((r) => r.id === record.id))
    throw new Error("RECORD_IMMUTABLE");
  if (
    record.kind === "Interpretation" &&
    !records.some((r) => r.id === record.sourceId)
  )
    throw new Error("SOURCE_MISSING");
  return [...records, structuredClone(record)];
}
