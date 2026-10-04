// SPDX-License-Identifier: MPL-2.0
import type { PersonId } from "@cz/identity";
export type VisibilityPolicy =
  | { scope: "private"; ownerId: PersonId }
  | { scope: "cell"; cellId: string }
  | { scope: "public" };
export const PROVENANCE_ORIGINS = [
  "user_reported",
  "source_observed",
  "ai_inferred",
] as const;
export type Origin = (typeof PROVENANCE_ORIGINS)[number];
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
          | "human_speech"
          | "cell"
          | "work_create"
          | "work_complete"
          | "work_consequence"
          | "learning"
          | "next_possibility"
          | "agreement"
          | "action_authorization"
          | "human_decision"
          | "evidence_attachment"
          | "economic_status"
          | "governance_mandate"
          | "bootstrap_authorization"
          | "source_observation"
          | "capability_candidate"
          | "connection_authorization"
          | "meeting_opened";
      }
    | {
        kind: "Interpretation";
        content: string;
        /** Exactly one source pointer: an institutional record or a durable conversation message. */
        sourceId?: string;
        sourceMessageId?: string;
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
    | { kind: "Decision"; content: string; sourceId: string; authorityId: string }
  );
export function appendRecord(
  records: readonly InstitutionalRecord[],
  record: InstitutionalRecord,
): InstitutionalRecord[] {
  if (records.some((r) => r.id === record.id))
    throw new Error("RECORD_IMMUTABLE");
  if (record.kind === "Interpretation") {
    if ((record.sourceId === undefined) === (record.sourceMessageId === undefined)) throw new Error("INTERPRETATION_SOURCE_INVALID");
    if (record.sourceId !== undefined && !records.some((r) => r.id === record.sourceId)) throw new Error("SOURCE_MISSING");
  }
  if (record.kind === "Decision" && !records.some((r) => r.id === record.sourceId && r.kind === "OriginalRecord"))
    throw new Error("DECISION_ORIGINAL_SOURCE_REQUIRED");
  return [...records, structuredClone(record)];
}
