// SPDX-License-Identifier: MPL-2.0
import { createHash } from "node:crypto";
import { z } from "zod";
import type { FoundationState } from "./foundation";
import { parseConnectionFabricState } from "@cz/connection-fabric";

export const recoveryEnvelopeSchema = z.object({
  schema: z.literal("cz.foundation.recovery.v1"),
  exportedAt: z.string().datetime(),
  state: z.record(z.string(), z.unknown()),
  boundary: z.string().optional(),
}).strict();

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const array = (value: unknown): value is unknown[] => Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export function digestRecoveryValue(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function parseRecoveryState(
  value: unknown,
  principal: { provider: string; subject: string },
  current: FoundationState,
): FoundationState {
  const envelope = recoveryEnvelopeSchema.parse(value);
  const state = envelope.state;
  if (state.schema !== "cz.foundation.v1" || !object(state.person) || !object(state.profile) || !object(state.cell)) throw new Error("RECOVERY_SCHEMA_INVALID");
  const person = state.person, profile = state.profile, cell = state.cell;
  if (!nonempty(person.id) || !nonempty(person.name) || profile.personId !== person.id || !nonempty(cell.id) || !nonempty(cell.name)) throw new Error("RECOVERY_IDENTITY_INVALID");
  const requiredArrays = ["credentials", "relations", "memberships", "roles", "authorities", "experiences", "externalIdentities", "records", "receipts"];
  if (requiredArrays.some((key) => !array(state[key]))) throw new Error("RECOVERY_SCHEMA_INVALID");
  const credentials = state.credentials as Array<Record<string, unknown>>;
  const matching = credentials.filter((credential) => credential.provider === principal.provider && credential.subject === principal.subject && credential.status === "active" && credential.personId === person.id);
  if (principal.provider !== "huly" || matching.length !== 1) throw new Error("RECOVERY_AUTH_ACCOUNT_MISMATCH");
  if (credentials.some((credential) => credential.personId !== person.id)) throw new Error("RECOVERY_PERSON_BINDING_AMBIGUOUS");
  const activeCredentialSubjects = credentials.filter((credential) => credential.status === "active").map((credential) => `${credential.provider}\u0000${credential.subject}`);
  if (new Set(activeCredentialSubjects).size !== activeCredentialSubjects.length) throw new Error("RECOVERY_DUPLICATE_CREDENTIAL");
  const relations = state.relations as Array<Record<string, unknown>>;
  const memberships = state.memberships as Array<Record<string, unknown>>;
  const roles = state.roles as Array<Record<string, unknown>>;
  const authorities = state.authorities as Array<Record<string, unknown>>;
  const records = state.records as Array<Record<string, unknown>>;
  if (!relations.some((relation) => relation.personId === person.id && relation.cellId === cell.id && relation.kind === "founder") ||
      !relations.some((relation) => relation.personId === person.id && relation.cellId === cell.id && relation.kind === "steward")) throw new Error("RECOVERY_RELATION_MISSING");
  const activeMemberships = memberships.filter((membership) => membership.personId === person.id && membership.cellId === cell.id && membership.status === "active");
  if (activeMemberships.length !== 1) throw new Error("RECOVERY_MEMBERSHIP_INVALID");
  const membershipRole = roles.find((role) => role.id === activeMemberships[0]?.roleId && role.cellId === cell.id);
  if (!membershipRole || !authorities.some((authority) => authority.roleId === membershipRole.id && authority.cellId === cell.id && array(authority.permissions) && (authority.permissions as unknown[]).includes("cell.update"))) throw new Error("RECOVERY_AUTHORITY_INVALID");
  if (!records.some((record) => record.kind === "OriginalRecord" && record.purpose === "bootstrap_authorization" && record.authorId === person.id) ||
      !records.some((record) => record.kind === "OriginalRecord" && record.purpose === "source_observation" && record.authorId === person.id)) throw new Error("RECOVERY_BOOTSTRAP_PROVENANCE_MISSING");
  if (["workItems", "intelligenceTurns", "actionRequests", "actionExecutions", "projects", "capabilities", "capabilityCandidates", "executionJobs", "agreements"].some((key) => state[key] !== undefined && !array(state[key]))) throw new Error("RECOVERY_SCHEMA_INVALID");
  if (current.person && (current.person.id !== person.id || current.cell?.id !== cell.id)) throw new Error("RECOVERY_IDENTITY_CONFLICT");
  if (!current.person && current.cell) throw new Error("RECOVERY_CURRENT_STATE_INCONSISTENT");
  if (current.person && digestRecoveryValue(current) !== digestRecoveryValue(state)) throw new Error("RECOVERY_HISTORY_CONFLICT");
  let connectionFabric;
  try { connectionFabric = parseConnectionFabricState(state); }
  catch (error) {
    if (error instanceof Error && /^(CONNECTION_|GRANT_|EXTERNAL_RESOURCE_|CAPABILITY_BINDING_)/.test(error.message)) throw new Error("RECOVERY_CONNECTION_FABRIC_INVALID");
    throw error;
  }
  return { ...state, ...connectionFabric } as unknown as FoundationState;
}

export function recoverySummary(state: FoundationState) {
  return {
    person: state.person?.name ?? "",
    cell: state.cell?.name ?? "",
    records: state.records.length,
    projects: state.projects?.length ?? 0,
    workItems: state.workItems?.length ?? 0,
    agreements: state.agreements?.length ?? 0,
  };
}
