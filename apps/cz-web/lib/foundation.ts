// SPDX-License-Identifier: MPL-2.0
import { z } from "zod";
import type {
  Person,
  PersonId,
  IdentityCredential,
  ExternalIdentity,
} from "@cz/identity";
import { resolvePerson } from "@cz/identity";
import type { Profile, Experience, Capability } from "@cz/presence";
import { reportedExperience } from "@cz/presence";
import type { Cell, Relation, Membership, Role } from "@cz/cells";
import { canAct, type Authority } from "@cz/authority";
import { appendRecord, type InstitutionalRecord } from "@cz/records";
import type { IntelligenceResult } from "./essenthius/port";
import type { WorkbenchProject } from "../../web/lib/domain/workbench-types";
import type { ResultPackage } from "../../web/lib/domain/result-package";
import type { ModelPreference } from "./essenthius/model-preference";
export interface Foundation {
  schema: "cz.foundation.v1";
  person: Person;
  profile: Profile;
  credentials: IdentityCredential[];
  cell: Cell;
  relations: Relation[];
  memberships: Membership[];
  roles: Role[];
  authorities: Authority[];
  experiences: Experience[];
  externalIdentities: ExternalIdentity[];
  records: InstitutionalRecord[];
  /** Durable conversation messages are not institutional records. Legacy turns remain readable through humanRecordId. */
  conversationMessages?: ConversationMessage[];
  receipts: Array<{ key: string; personId: PersonId; command: string }>;
  /** Local Habitat projection. Work is kept distinct from its attributable source record. */
  workItems?: WorkItem[];
  intelligenceTurns?: IntelligenceTurn[];
  actionRequests?: ActionRequest[];
  actionExecutions?: ActionExecution[];
  /** Historical CZ Workbench project/opportunity/proposal/commitment semantics, locally projected for this founder Habitat. */
  projects?: WorkbenchProject[];
  /** Capabilities are human-accepted profile projections; candidates remain separate and unverified. */
  capabilities?: Capability[];
  capabilityCandidates?: CapabilityCandidate[];
  executionJobs?: ExecutionJob[];
  agreements?: FoundationAgreement[];
  /** A CZ meeting groups participants and existing attributable conversation turns. */
  meetings?: FoundationMeeting[];
  /** Operational preference only; it never changes the Essenthius identity or thread history. */
  threadModelPreferences?: Record<string, ModelPreference>;
}
export interface FoundationMeeting {
  id: string;
  cellId: string;
  title: string;
  purpose: string;
  hostPersonId: PersonId;
  participants: Array<{ kind: "PERSON" | "AGENT"; id: string; label: string }>;
  turnIds: string[];
  status: "OPEN" | "CLOSED";
  createdAt: string;
  closedAt?: string;
}
export interface ConversationMessage {
  id: string;
  threadId: string;
  authorId: PersonId;
  body: string;
  createdAt: string;
}
export interface FoundationAgreement {
  id: string;
  projectId: string;
  commitmentId: string;
  proposalId: string;
  opportunityId: string;
  authorizingActorId: PersonId;
  sourceRecordId: string;
  expectedResult: string;
  scope: string;
  exclusions: string;
  dependencies: string;
  evaluationCriterion: string;
  budgetBoundary: "NO_AUTOMATED_FUND_MOVEMENT";
  economicMode: "NONE" | "OBLIGATION_DEFINED" | "SETTLEMENT_PENDING" | "SETTLED" | "RECONCILIATION_REQUIRED";
  economicTerms?: {
    payerRole: string;
    payeeRole: string;
    amount?: string;
    currency?: string;
    obligationCondition: string;
    source: "HUMAN_SUPPLIED";
  };
  settlementReference?: string;
  economicStatusUpdatedAt?: string;
  authorityBoundary: string;
  createdAt: string;
  version: 1;
}
export interface CapabilityCandidate {
  id: string;
  personId: PersonId;
  workItemId: string;
  sourceRecordId: string;
  learningRecordId: string;
  proposedName: string;
  status: "PROPOSED" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  requestKey: string;
  acceptedCapabilityId?: string;
}
export interface ExecutionJob {
  id: string;
  workItemId: string;
  projectId: string;
  commitmentId: string;
  agreementId: string;
  agreementDigest: string;
  requestKey: string;
  authorizationDigest?: string;
  requestedByActorId: PersonId;
  taskCapsuleDigest: string;
  canonicalBase: string;
  allowedPaths: string[];
  validations: string[][];
  status: "RUNNING" | "COMPLETED" | "FAILED";
  startedAt: string;
  completedAt?: string;
  resultPackage?: ResultPackage;
  fabric?: { classification: string; scopeStatus: string; changedPaths: string[]; validations: Array<{ argv: string[]; exitCode: number | null }> };
  resultDigest?: string;
  deltaDigest?: string;
  resultFileName?: string;
  deltaFileName?: string;
  errorCode?: string;
}
export interface ActionRequest {
  id: string;
  turnId: string;
  sourceMessageId?: string;
  sourceRecordId?: string;
  capabilityId: "cz:local-work";
  action: "create_work";
  proposedTitle: string;
  proposedContext: string;
  status: "PROPOSED" | "REJECTED" | "EXECUTED";
  createdAt: string;
  authorizationRecordId: string | null;
  executionId: string | null;
  resultWorkItemId: string | null;
  resultRecordId: string | null;
}
export interface ActionExecution {
  id: string;
  requestId: string;
  capabilityId: string;
  status: "COMPLETED";
  startedAt: string;
  completedAt: string;
  resultRecordId: string;
  resultWorkItemId: string;
}
export interface IntelligenceTurn {
  id: string;
  requestKey: string;
  actorId: PersonId;
  humanMessageId?: string;
  /** Read compatibility for turns persisted before ConversationMessage was introduced. */
  humanRecordId?: string;
  threadId?: string;
  interpretationRecordId: string | null;
  responseRecordId?: string | null;
  parentTurnId: string | null;
  status: "interpreting" | "interpreted" | "unavailable";
  disposition: "awaiting_human" | "continued" | "corrected" | "rejected";
  provider: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  contextDigest: string | null;
  contextCharacters?: number;
  promptCharacters?: number;
  requestId: string | null;
  failureCode: string | null;
  requestedPreference?: ModelPreference;
  taskClass?: "CONVERSATION";
  intelligenceMode?: "interpret" | "compose" | "explain" | "reflect";
  fundingOwnerClass?: "USER_CONNECTED_ACCOUNT" | "LOCAL_DEVICE";
  accountQuotaClass?: "EXISTING_AUTHENTICATED_ACCOUNT_LIMITS" | "LOCAL_COMPUTE";
  monetaryCostStatus?: "KNOWN" | "ESTIMATED" | "UNKNOWN" | "ACCOUNT_INCLUDED_NO_INCREMENTAL_CHARGE_OBSERVED";
  selectionReason?: string;
  fallbackUsed?: boolean;
  durationMs?: number;
  createdAt: string;
}
export interface WorkItem {
  id: string;
  cellId: string;
  responsiblePersonId: PersonId;
  title: string;
  context: string;
  status: "active" | "complete";
  sourceRecordId: string;
  commitmentId?: string;
  taskCapsuleDigest?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
export interface FoundationState extends Omit<Foundation, "person" | "profile" | "cell"> {
  person?: Person;
  profile?: Profile;
  cell?: Cell;
}
const line = z.string().trim().min(1).max(160);
const text = z.string().trim().min(1).max(6000);
const url = z
  .string()
  .url()
  .max(2048)
  .refine((s) => {
    const u = new URL(s);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "Use um endereço HTTPS sem credenciais.");
export const commandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("experience"),
      title: line,
      description: text,
      occurredOn: z.iso.date(),
      sourceMessageId: line.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("profile"),
      displayName: z.string().trim().min(1).max(120).optional(),
      headline: line,
      bio: z.string().trim().max(3000),
      visibility: z.enum(["private", "cell"]).default("private"),
    })
    .strict(),
  z
    .object({ type: z.literal("external_identity"), provider: line, url })
    .strict(),
  z.object({ type: z.literal("intention"), content: text }).strict(),
  z.object({
    type: z.literal("decision"), statement: text, rationale: text,
    question: z.string().trim().max(2000).optional(),
    alternatives: z.array(z.string().trim().min(2).max(1000)).max(8).default([]),
    selectedAlternative: z.string().trim().max(1000).optional(),
    supportingRecordIds: z.array(line).max(12).default([]),
    mandateChange: z.string().trim().max(2000).optional(),
  }).strict().refine((decision) => decision.alternatives.length === 0 || (!!decision.selectedAlternative && decision.alternatives.includes(decision.selectedAlternative)), "Selecione uma das alternativas registradas."),
  z.object({ type: z.literal("work_create"), title: line, context: text }).strict(),
  z.object({ type: z.literal("work_complete"), workItemId: line, result: text, learning: z.string().trim().max(2000), gratitude: z.string().trim().max(1000).default(""), unresolvedTension: z.string().trim().max(1000).default(""), nextPossibility: z.string().trim().max(1000).default(""), executionJobId: line.optional() }).strict(),
  z.object({ type: z.literal("cell"), purpose: text }).strict(),
]);
export type Command = z.infer<typeof commandSchema>;
export function seedFoundation(id: () => string, now: string): Foundation {
  const personId = id() as PersonId,
    cellId = id(),
    roleId = id(),
    sourceId = id();
  return {
    schema: "cz.foundation.v1",
    person: { id: personId, name: "Marcos", createdAt: now },
    profile: {
      id: id(),
      personId,
      headline: "Construindo Célula Zero",
      bio: "",
      visibility: { scope: "private", ownerId: personId },
      updatedAt: now,
    },
    credentials: [
      {
        id: id(),
        personId,
        provider: "local-foundation",
        subject: "founder-fixture",
        status: "active",
      },
    ],
    cell: {
      id: cellId,
      name: "Célula Zero",
      purpose: "Operar, desenvolver e governar Célula Zero.",
      createdAt: now,
    },
    roles: [{ id: roleId, cellId, name: "Founder / Steward" }],
    relations: [
      { id: id(), personId, cellId, kind: "founder", sourceRecordId: sourceId },
      { id: id(), personId, cellId, kind: "steward", sourceRecordId: sourceId },
    ],
    memberships: [{ id: id(), personId, cellId, roleId, status: "active" }],
    authorities: [
      { id: id(), roleId, cellId, permissions: ["cell.read", "cell.update"] },
    ],
    experiences: [],
    externalIdentities: [],
    receipts: [],
    records: [
      {
        id: sourceId,
        kind: "OriginalRecord",
        authorId: "system:local-seed",
        createdAt: now,
        visibility: { scope: "cell", cellId },
        purpose: "cell",
        content:
          "Fixture local autorizada pela D052/WP Foundation: Marcos, Person e Founder/Steward da Cell Célula Zero. Não é verificação de identidade externa.",
      },
    ],
    workItems: [],
  };
}

/** Normal runtime starts empty; institutional identity follows explicit human confirmation. */
export function emptyFoundation(): FoundationState {
  return {
    schema: "cz.foundation.v1",
    credentials: [],
    relations: [],
    memberships: [],
    roles: [],
    authorities: [],
    experiences: [],
    externalIdentities: [],
    receipts: [],
    records: [],
    conversationMessages: [],
    workItems: [],
    intelligenceTurns: [],
    capabilities: [],
    capabilityCandidates: [],
    executionJobs: [],
    agreements: [],
    meetings: [],
  };
}

export function isEmptyFoundation(state: FoundationState): boolean {
  return !state.person && !state.profile && !state.cell &&
    state.credentials.length === 0 && state.relations.length === 0 &&
    state.memberships.length === 0 && state.roles.length === 0 &&
    state.authorities.length === 0 && state.experiences.length === 0 &&
    state.externalIdentities.length === 0 && state.records.length === 0 &&
    state.receipts.length === 0 && (state.workItems ?? []).length === 0 &&
    (state.intelligenceTurns ?? []).length === 0 &&
    (state.conversationMessages ?? []).length === 0 &&
    (state.actionRequests ?? []).length === 0 &&
    (state.actionExecutions ?? []).length === 0 &&
    (state.projects ?? []).length === 0 &&
    (state.capabilities ?? []).length === 0 &&
    (state.capabilityCandidates ?? []).length === 0 &&
    (state.executionJobs ?? []).length === 0 &&
    (state.agreements ?? []).length === 0;
}

export function bootstrapFoundation(
  state: FoundationState,
  subject: string,
  id: () => string,
  now: string,
): Foundation {
  const active = state.credentials.filter(
    (credential) => credential.provider === "huly" && credential.subject === subject && credential.status === "active",
  );
  if (active.length > 1) throw new Error("CZ_IDENTITY_AMBIGUOUS");
  if (active.length === 1) {
    if (!hasInstitutionalState(state) || active[0]?.personId !== state.person.id)
      throw new Error("CZ_IDENTITY_UNRESOLVED");
    return state;
  }
  if (!isEmptyFoundation(state)) throw new Error("CZ_FOUNDATION_NOT_EMPTY");

  const personId = id() as PersonId;
  const cellId = id();
  const roleId = id();
  const authorizationRecordId = id();
  const sourceRecordId = id();
  const authorization: InstitutionalRecord = {
    id: authorizationRecordId,
    kind: "OriginalRecord",
    purpose: "bootstrap_authorization",
    content: [
      "D059 N=1 — Marcos confirmou explicitamente a inicialização local de sua presença institucional em Célula Zero.",
      `Huly Account.uuid usado somente como credencial técnica: ${subject}.`,
      "Esta ação é autoatestada e não constitui verificação externa de identidade.",
      "Relações Founder / Steward e autoridade mínima autorizadas para este N=1.",
      `Confirmação recebida em: ${now}.`,
    ].join("\n"),
    authorId: personId,
    createdAt: now,
    visibility: { scope: "cell", cellId },
  };
  const sourceObservation: InstitutionalRecord = {
    id: sourceRecordId,
    kind: "OriginalRecord",
    purpose: "source_observation",
    content: [
      "SOURCE OBSERVATION — referência ao contexto D059 observado no repositório canônico.",
      "Repository: MMaia-jr/celula-zero",
      "Commit: 50b4917593b0979d5c218c725038bf89afb1134f",
      "Artifact kind: DECISION / HUMAN DIRECTION",
      "Path: decisions/D059-human-adopts-cz-on-huly-substrate-direction.md",
      "Artifact kind: WORK PACKET",
      "Path: WP-CZ-VNEXT-CZ-ON-HULY-SUBSTRATE-N1.md",
      "A referência observa a fonte; não converte o conteúdo Git em verdade institucional automática.",
    ].join("\n"),
    authorId: personId,
    createdAt: now,
    visibility: { scope: "cell", cellId },
  };
  const person: Person = { id: personId, name: "Marcos", createdAt: now };
  const cell: Cell = {
    id: cellId,
    name: "Célula Zero",
    purpose: "Operar, desenvolver e governar Célula Zero.",
    createdAt: now,
  };
  return {
    ...emptyFoundation(),
    person,
    profile: {
      id: id(), personId, headline: "Construindo Célula Zero", bio: "",
      visibility: { scope: "private", ownerId: personId }, updatedAt: now,
    },
    credentials: [{ id: id(), personId, provider: "huly", subject, status: "active" }],
    cell,
    roles: [{ id: roleId, cellId, name: "Founder / Steward" }],
    relations: [
      { id: id(), personId, cellId, kind: "founder", sourceRecordId: authorizationRecordId },
      { id: id(), personId, cellId, kind: "steward", sourceRecordId: authorizationRecordId },
    ],
    memberships: [{ id: id(), personId, cellId, roleId, status: "active" }],
    authorities: [{ id: id(), roleId, cellId, permissions: ["cell.read", "cell.update"] }],
    records: [authorization, sourceObservation],
  };
}

export function hasInstitutionalState(state: FoundationState): state is Foundation {
  return state.person !== undefined && state.profile !== undefined && state.cell !== undefined;
}

export function beginIntelligenceTurn(
  state: Foundation,
  actor: PersonId,
  text: string,
  requestKey: string,
  id: () => string,
  now: string,
  parentTurnId: string | null = null,
  threadId = `cell:${state.cell.id}`,
) {
  if (actor !== state.person.id || !canAct(actor, state.cell.id, "cell.read", state.memberships, state.authorities)) throw new Error("FORBIDDEN");
  const content = text.trim();
  if (!content || content.length > 6000) throw new Error("INVALID_HUMAN_INPUT");
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(requestKey)) throw new Error("INVALID_REQUEST_KEY");
  const turns = state.intelligenceTurns ?? [];
  const existing = turns.find((turn) => turn.requestKey === requestKey && turn.actorId === actor);
  if (existing) {
    const message = (state.conversationMessages ?? []).find((item) => item.id === existing.humanMessageId);
    const legacy = state.records.find((item) => item.id === existing.humanRecordId);
    const legacyContent = legacy?.kind === "OriginalRecord" ? legacy.content : undefined;
    if ((message?.body ?? legacyContent) !== content || (existing.threadId && existing.threadId !== threadId)) throw new Error("REQUEST_KEY_CONFLICT");
    return { state, turn: existing, repeated: true };
  }
  if (parentTurnId && !turns.some((turn) => turn.id === parentTurnId && turn.actorId === actor && (turn.threadId ?? `cell:${state.cell.id}`) === threadId)) throw new Error("INTERPRETATION_NOT_FOUND");
  const humanMessageId = id();
  const next = structuredClone(state);
  if (parentTurnId) {
    const parent = next.intelligenceTurns?.find((turn) => turn.id === parentTurnId);
    if (parent) parent.disposition = "corrected";
  }
  next.conversationMessages ??= [];
  next.conversationMessages.push({ id: humanMessageId, threadId, authorId: actor, body: content, createdAt: now });
  const turn: IntelligenceTurn = {
    id: id(), requestKey, actorId: actor, humanMessageId, threadId,
    interpretationRecordId: null, responseRecordId: null, parentTurnId, status: "interpreting",
    disposition: "awaiting_human", provider: null, model: null,
    inputTokens: null, outputTokens: null, contextDigest: null,
    requestId: null, failureCode: null, createdAt: now,
  };
  next.intelligenceTurns = [...(next.intelligenceTurns ?? []), turn];
  return { state: next, turn, repeated: false };
}

/** Recover provider turns left pending by a process exit after their source was durably recorded. */
export function expireStaleIntelligenceTurns(
  state: FoundationState,
  now: string,
  staleAfterMs = 180_000,
): FoundationState {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs) || !Number.isFinite(staleAfterMs) || staleAfterMs < 0) return state;
  const cutoff = nowMs - staleAfterMs;
  const stale = (state.intelligenceTurns ?? []).some((turn) =>
    turn.status === "interpreting" &&
    Number.isFinite(Date.parse(turn.createdAt)) &&
    Date.parse(turn.createdAt) <= cutoff,
  );
  if (!stale) return state;
  const next = structuredClone(state);
  for (const turn of next.intelligenceTurns ?? []) {
    if (turn.status !== "interpreting" || !Number.isFinite(Date.parse(turn.createdAt)) || Date.parse(turn.createdAt) > cutoff) continue;
    turn.status = "unavailable";
    turn.failureCode = "INTELLIGENCE_PROCESS_INTERRUPTED";
  }
  return next;
}

export function completeIntelligenceTurn(
  state: Foundation, actor: PersonId, turnId: string, result: IntelligenceResult,
  id: () => string, now: string,
  metadata: { requestedPreference?: ModelPreference; selectionReason?: string; fallbackUsed?: boolean; durationMs?: number; taskClass?: "CONVERSATION"; intelligenceMode?: "interpret" | "compose" | "explain" | "reflect"; fundingOwnerClass?: "USER_CONNECTED_ACCOUNT" | "LOCAL_DEVICE"; accountQuotaClass?: "EXISTING_AUTHENTICATED_ACCOUNT_LIMITS" | "LOCAL_COMPUTE"; monetaryCostStatus?: "KNOWN" | "ESTIMATED" | "UNKNOWN" | "ACCOUNT_INCLUDED_NO_INCREMENTAL_CHARGE_OBSERVED" } = {},
): Foundation {
  const next = structuredClone(state);
  const turn = (next.intelligenceTurns ?? []).find((item) => item.id === turnId && item.actorId === actor);
  if (!turn || turn.status !== "interpreting" || actor !== next.person.id) throw new Error("INTERPRETATION_NOT_FOUND");
  const message = (next.conversationMessages ?? []).find((item) => item.id === turn.humanMessageId && item.authorId === actor);
  const legacySource = next.records.find((record) => record.id === turn.humanRecordId && record.kind === "OriginalRecord");
  if (!message && !legacySource) throw new Error("INTERPRETATION_SOURCE_MISSING");
  const recordId = id();
  next.records = appendRecord(next.records, {
    id: recordId,
    kind: "Interpretation",
    content: JSON.stringify(result.interpretation),
    ...(message ? { sourceMessageId: message.id } : { sourceId: legacySource!.id }),
    generatorId: "essenthius:genesis-v1",
    authorId: "essenthius:genesis-v1",
    createdAt: now,
    visibility: { scope: "cell", cellId: next.cell.id },
  });
  turn.interpretationRecordId = recordId;
  turn.status = "interpreted";
  turn.provider = result.provider;
  turn.model = result.model;
  turn.inputTokens = result.inputTokens;
  turn.outputTokens = result.outputTokens;
  turn.contextDigest = result.contextDigest;
  if (result.contextCharacters !== undefined) turn.contextCharacters = result.contextCharacters;
  if (result.promptCharacters !== undefined) turn.promptCharacters = result.promptCharacters;
  turn.requestId = result.requestId;
  Object.assign(turn, metadata);
  if (result.interpretation.workProposal) {
    next.actionRequests ??= [];
    next.actionRequests.push({
      id: id(), turnId, ...(message ? { sourceMessageId: message.id } : { sourceRecordId: legacySource!.id }), capabilityId: "cz:local-work", action: "create_work",
      proposedTitle: result.interpretation.workProposal.title,
      proposedContext: result.interpretation.workProposal.context,
      status: "PROPOSED", createdAt: now, authorizationRecordId: null,
      executionId: null, resultWorkItemId: null, resultRecordId: null,
    });
  }
  return next;
}

export function executeHumanAuthorizedWorkAction(state: Foundation, actor: PersonId, actionRequestId: string, title: string, context: string, requestKey: string, id: () => string, now: string): Foundation {
  if (actor !== state.person.id || !canAct(actor, state.cell.id, "cell.update", state.memberships, state.authorities)) throw new Error("FORBIDDEN");
  const existing = (state.actionRequests ?? []).find((item) => item.id === actionRequestId);
  if (!existing) throw new Error("ACTION_REQUEST_NOT_FOUND");
  const sourceTurn = (state.intelligenceTurns ?? []).find((turn) => turn.id === existing.turnId && turn.actorId === actor && turn.status === "interpreted");
  const sourceMatches = existing.sourceMessageId ? sourceTurn?.humanMessageId === existing.sourceMessageId : sourceTurn?.humanRecordId === existing.sourceRecordId;
  if (!sourceTurn || !sourceMatches || !sourceTurn.interpretationRecordId || existing.capabilityId !== "cz:local-work" || existing.action !== "create_work") throw new Error("ACTION_REQUEST_SOURCE_INVALID");
  if (existing.status === "EXECUTED") return state;
  if (existing.status !== "PROPOSED") throw new Error("ACTION_REQUEST_NOT_PENDING");
  const next = structuredClone(state);
  const request = next.actionRequests!.find((item) => item.id === actionRequestId)!;
  const authorizationRecordId = id();
  next.records = appendRecord(next.records, {
    id: authorizationRecordId, kind: "OriginalRecord", purpose: "action_authorization",
    content: JSON.stringify({ actionRequestId, action: "create_work", capabilityId: request.capabilityId, title, context, authorizedBy: actor, authorizedAt: now }),
    authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: next.cell.id },
  });
  request.status = "EXECUTED";
  request.authorizationRecordId = authorizationRecordId;
  const executionId = id();
  const beforeRecordIds = new Set(next.records.map((record) => record.id));
  const created = applyCommand(next, actor, { type: "work_create", title, context }, requestKey, id, now);
  const work = (created.workItems ?? []).find((item) => !(next.workItems ?? []).some((previous) => previous.id === item.id));
  const resultRecord = created.records.find((record) => !beforeRecordIds.has(record.id) && record.kind === "OriginalRecord" && record.purpose === "work_create");
  if (!work || !resultRecord) throw new Error("ACTION_EXECUTION_RESULT_MISSING");
  request.executionId = executionId;
  request.resultWorkItemId = work.id;
  request.resultRecordId = resultRecord.id;
  created.actionRequests = next.actionRequests ?? [];
  created.actionExecutions = [...(next.actionExecutions ?? []), { id: executionId, requestId: request.id, capabilityId: request.capabilityId, status: "COMPLETED", startedAt: now, completedAt: now, resultRecordId: resultRecord.id, resultWorkItemId: work.id }];
  return created;
}

export function rejectActionRequest(state: Foundation, actor: PersonId, actionRequestId: string, id: () => string, now: string): Foundation {
  if (actor !== state.person.id || !canAct(actor, state.cell.id, "cell.read", state.memberships, state.authorities)) throw new Error("FORBIDDEN");
  const prior = (state.actionRequests ?? []).find((item) => item.id === actionRequestId);
  if (prior?.status === "REJECTED") return state;
  const next = structuredClone(state);
  const request = (next.actionRequests ?? []).find((item) => item.id === actionRequestId);
  if (!request || request.status !== "PROPOSED") throw new Error("ACTION_REQUEST_NOT_PENDING");
  request.status = "REJECTED";
  next.records = appendRecord(next.records, { id: id(), kind: "OriginalRecord", purpose: "human_speech", content: JSON.stringify({ responseToActionRequest: actionRequestId, response: "Human rejected the proposed action; no work item was created." }), authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: next.cell.id } });
  return next;
}

export function failIntelligenceTurn(state: Foundation, actor: PersonId, turnId: string, failureCode: string, metadata: Partial<Pick<IntelligenceTurn, "provider" | "model" | "requestedPreference" | "selectionReason" | "fallbackUsed" | "durationMs" | "taskClass" | "intelligenceMode" | "fundingOwnerClass" | "accountQuotaClass" | "monetaryCostStatus">> = {}): Foundation {
  const next = structuredClone(state);
  const turn = (next.intelligenceTurns ?? []).find((item) => item.id === turnId && item.actorId === actor);
  if (!turn || actor !== next.person.id) throw new Error("INTERPRETATION_NOT_FOUND");
  if (turn.status !== "interpreting") return state;
  turn.status = "unavailable";
  turn.failureCode = failureCode.slice(0, 100);
  Object.assign(turn, metadata);
  return next;
}

export function retryIntelligenceTurn(state: Foundation, actor: PersonId, turnId: string): Foundation {
  if (actor !== state.person.id || !canAct(actor, state.cell.id, "cell.read", state.memberships, state.authorities)) throw new Error("FORBIDDEN");
  const prior = (state.intelligenceTurns ?? []).find((turn) => turn.id === turnId && turn.actorId === actor);
  if (!prior) throw new Error("INTERPRETATION_NOT_FOUND");
  if (prior.status === "interpreting") throw new Error("INTELLIGENCE_TURN_ALREADY_RUNNING");
  if (prior.status !== "unavailable") throw new Error("INTELLIGENCE_TURN_NOT_RETRYABLE");
  const source = (state.conversationMessages ?? []).find((message) => message.id === prior.humanMessageId && message.authorId === actor);
  if (!source) throw new Error("INTERPRETATION_SOURCE_MISSING");
  const next = structuredClone(state);
  const turn = next.intelligenceTurns!.find((item) => item.id === turnId)!;
  turn.status = "interpreting";
  turn.failureCode = null;
  return next;
}

export function respondToInterpretation(state: Foundation, actor: PersonId, turnId: string, disposition: "continued" | "rejected", responseText: string, id: () => string, now: string): Foundation {
  const next = structuredClone(state);
  const turn = (next.intelligenceTurns ?? []).find((item) => item.id === turnId && item.actorId === actor);
  if (!turn || !turn.interpretationRecordId || actor !== next.person.id) throw new Error("INTERPRETATION_NOT_FOUND");
  const clean = responseText.trim();
  if (!clean || clean.length > 4000) throw new Error("INVALID_HUMAN_INPUT");
  if (turn.responseRecordId) return state;
  if (turn.status !== "interpreted" || turn.disposition !== "awaiting_human") throw new Error("INTERPRETATION_ALREADY_ANSWERED");
  turn.disposition = disposition;
  const responseRecordId = id();
  next.records = appendRecord(next.records, {
    id: responseRecordId,
    kind: "OriginalRecord",
    purpose: "human_speech",
    content: clean,
    authorId: actor,
    createdAt: now,
    visibility: { scope: "cell", cellId: next.cell.id },
  });
  turn.responseRecordId = responseRecordId;
  return next;
}
export function applyCommand(
  state: Foundation,
  actor: PersonId,
  raw: unknown,
  key: string,
  id: () => string,
  now: string,
): Foundation {
  if (actor !== state.person.id) throw new Error("FORBIDDEN");
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(key))
    throw new Error("INVALID_REQUEST_KEY");
  const command = commandSchema.parse(raw);
  const previous = state.receipts.find(
    (r) => r.key === key && r.personId === actor,
  );
  if (previous) {
    if (previous.command !== JSON.stringify(command))
      throw new Error("REQUEST_KEY_CONFLICT");
    return state;
  }
  if (
    (command.type === "cell" || command.type === "work_create" || command.type === "work_complete" || command.type === "decision") &&
    !canAct(
      actor,
      state.cell.id,
      "cell.update",
      state.memberships,
      state.authorities,
    )
  )
    throw new Error("FORBIDDEN");
  if (command.type === "experience" && command.sourceMessageId) {
    const source = state.conversationMessages?.find((message) => message.id === command.sourceMessageId);
    if (!source || source.authorId !== actor) throw new Error("EXPERIENCE_SOURCE_UNAVAILABLE");
  }
  const next = structuredClone(state),
    recordId = id();
  const content = command.type === "intention" ? command.content : JSON.stringify(command);
  next.records = appendRecord(next.records, {
    id: recordId,
    kind: "OriginalRecord",
    purpose: command.type === "decision" ? "human_decision" : command.type,
    content,
    authorId: actor,
    createdAt: now,
    visibility:
      command.type === "cell" || command.type === "work_create" || command.type === "work_complete" || command.type === "decision"
        ? { scope: "cell", cellId: next.cell.id }
        : { scope: "private", ownerId: actor },
  });
  if (command.type === "decision") {
    const allowedSupportingRecords = new Set(next.records.filter((record) =>
      (record.kind === "Claim" || record.kind === "Evidence" || record.kind === "Verification" || record.kind === "Decision" || record.kind === "OriginalRecord") &&
      ((record.visibility.scope === "cell" && record.visibility.cellId === next.cell.id) || (record.visibility.scope === "private" && record.visibility.ownerId === actor)) &&
      record.authorId !== "system:local-seed",
    ).map((record) => record.id));
    if (command.supportingRecordIds.some((recordId) => !allowedSupportingRecords.has(recordId))) throw new Error("GOVERNANCE_SUPPORTING_RECORD_UNAVAILABLE");
    const activeRoleIds = new Set(next.memberships.filter((membership) => membership.personId === actor && membership.cellId === next.cell.id && membership.status === "active").map((membership) => membership.roleId));
    const decisionAuthorities = next.authorities.filter((authority) => authority.cellId === next.cell.id && activeRoleIds.has(authority.roleId) && authority.permissions.includes("cell.update"));
    if (decisionAuthorities.length !== 1) throw new Error(decisionAuthorities.length ? "CZ_AUTHORITY_AMBIGUOUS" : "FORBIDDEN");
    next.records = appendRecord(next.records, {
      id: id(), kind: "Decision", sourceId: recordId, authorityId: decisionAuthorities[0]!.id,
      content: JSON.stringify({
        statement: command.statement, rationale: command.rationale, decidedAt: now,
        question: command.question ?? command.statement,
        alternatives: command.alternatives,
        selectedAlternative: command.selectedAlternative ?? null,
        supportingRecordIds: command.supportingRecordIds,
        decisionContext: "FOUNDER_N1_NOT_CONSENSUS",
        mandateChange: command.mandateChange ?? null,
        mandateBoundary: command.mandateChange ? "A mudança foi registrada como consequência proposta; permissões e authority não são alteradas automaticamente." : null,
      }),
      authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: next.cell.id },
    });
    if (command.mandateChange?.trim()) next.records = appendRecord(next.records, {
      id: id(), kind: "OriginalRecord", purpose: "governance_mandate",
      content: JSON.stringify({ decisionSourceId: recordId, proposedMandateConsequence: command.mandateChange.trim(), effect: "RECORDED_ONLY_NO_AUTHORITY_CHANGE" }),
      authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: next.cell.id },
    });
  }
  if (command.type === "experience")
    next.experiences.push(
      reportedExperience(
        {
          id: id(),
          personId: actor,
          title: command.title,
          description: command.description,
          occurredOn: command.occurredOn,
          visibility: { scope: "private", ownerId: actor },
          sourceRecordId: recordId,
        },
        actor,
        now,
      ),
    );
  if (command.type === "profile")
    next.profile = {
      ...next.profile,
      ...(command.displayName !== undefined ? { displayName: command.displayName } : {}),
      headline: command.headline,
      bio: command.bio,
      visibility: command.visibility === "cell" ? { scope: "cell", cellId: next.cell.id } : { scope: "private", ownerId: actor },
      updatedAt: now,
    };
  if (command.type === "external_identity") {
    if (
      next.externalIdentities.some(
        (e) => e.provider === command.provider && e.url === command.url,
      )
    )
      throw new Error("IDENTITY_ALREADY_RECORDED");
    next.externalIdentities.push({
      id: id(),
      personId: actor,
      provider: command.provider,
      url: command.url,
      ownership: "unverified",
      sourceRecordId: recordId,
    });
  }
  if (command.type === "cell") next.cell.purpose = command.purpose;
  if (command.type === "work_create") {
    const workId = id();
    next.workItems ??= [];
    next.workItems.push({
      id: workId,
      cellId: next.cell.id,
      responsiblePersonId: actor,
      title: command.title,
      context: command.context,
      status: "active",
      sourceRecordId: recordId,
      createdAt: now,
      updatedAt: now,
    });
  }
  if (command.type === "work_complete") {
    const item = (next.workItems ?? []).find((work) => work.id === command.workItemId && work.cellId === next.cell.id);
    if (!item) throw new Error("WORK_NOT_FOUND");
    const executionJob = command.executionJobId
      ? next.executionJobs?.find((job) => job.id === command.executionJobId && job.workItemId === item.id && job.requestedByActorId === actor && job.status === "COMPLETED" && job.fabric?.classification === "COMPLETED" && job.fabric.scopeStatus === "WITHIN_SCOPE")
      : undefined;
    if (command.executionJobId && !executionJob) throw new Error("EXECUTION_RESULT_NOT_FOUND");
    if (executionJob && !next.agreements?.some((agreement) => agreement.id === executionJob.agreementId && agreement.commitmentId === executionJob.commitmentId && agreement.authorizingActorId === actor)) throw new Error("EXECUTION_AGREEMENT_MISMATCH");
    if (item.status !== "complete") {
      item.status = "complete";
      item.updatedAt = now;
      item.completedAt = now;
      const consequenceRecordId = id();
      next.records = appendRecord(next.records, {
        id: consequenceRecordId,
        kind: "OriginalRecord",
        purpose: "work_consequence",
        content: JSON.stringify({ workItemId: item.id, title: item.title, result: command.result, learning: command.learning, gratitude: command.gratitude, unresolvedTension: command.unresolvedTension, nextPossibility: command.nextPossibility, ...(executionJob ? { executorResult: { executionJobId: executionJob.id, resultDigest: executionJob.resultDigest, deltaDigest: executionJob.deltaDigest, taskCapsuleDigest: executionJob.taskCapsuleDigest, agreementId: executionJob.agreementId, agreementDigest: executionJob.agreementDigest, canonicalBase: executionJob.canonicalBase, classification: executionJob.fabric?.classification } } : {}), consequence: "Resultado e aprendizado relatados pelo responsável humano ao concluir o trabalho." }),
        authorId: actor,
        createdAt: now,
        visibility: { scope: "cell", cellId: next.cell.id },
      });
      if (command.learning || command.gratitude || command.unresolvedTension) next.records = appendRecord(next.records, {
        id: id(), kind: "OriginalRecord", purpose: "learning",
        content: JSON.stringify({ workItemId: item.id, sourceRecordId: consequenceRecordId, learning: command.learning, gratitude: command.gratitude, unresolvedTension: command.unresolvedTension, attribution: actor }),
        authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: next.cell.id },
      });
      if (command.nextPossibility) next.records = appendRecord(next.records, {
        id: id(), kind: "OriginalRecord", purpose: "next_possibility",
        content: JSON.stringify({ workItemId: item.id, sourceRecordId: consequenceRecordId, possibility: command.nextPossibility, status: "HUMAN_REPORTED_NOT_AUTHORIZED" }),
        authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: next.cell.id },
      });
    }
  }
  next.receipts.push({
    key,
    personId: actor,
    command: JSON.stringify(command),
  });
  return next;
}
export function actorFor(
  state: Foundation,
  provider: string,
  subject: string,
): PersonId {
  return resolvePerson(state.credentials, provider, subject);
}
export function projection(state: Foundation, actor: PersonId) {
  if (actor !== state.person.id) throw new Error("FORBIDDEN");
  const member = canAct(
    actor,
    state.cell.id,
    "cell.read",
    state.memberships,
    state.authorities,
  );
  return {
    schema: state.schema,
    person: state.person,
    profile: state.profile,
    experiences: state.experiences,
    externalIdentities: state.externalIdentities,
    cell: member ? state.cell : null,
    relations: member ? state.relations : [],
    roles: member ? state.roles : [],
    canUpdateCell: canAct(
      actor,
      state.cell.id,
      "cell.update",
      state.memberships,
      state.authorities,
    ),
    records: state.records.filter(
      (r) =>
        r.visibility.scope === "public" ||
        (r.visibility.scope === "private" && r.visibility.ownerId === actor) ||
        (r.visibility.scope === "cell" &&
          member &&
          r.visibility.cellId === state.cell.id),
    ),
    workItems: (state.workItems ?? []).filter((work) => member && work.cellId === state.cell.id),
    intelligenceTurns: (state.intelligenceTurns ?? []).filter((turn) => member && turn.actorId === actor),
    conversationMessages: (state.conversationMessages ?? []).filter((message) => member && message.authorId === actor),
    actionRequests: (state.actionRequests ?? []).filter((request) => member && state.intelligenceTurns?.some((turn) => turn.id === request.turnId && turn.actorId === actor)),
    actionExecutions: (state.actionExecutions ?? []).filter((execution) => member && state.actionRequests?.some((request) => request.id === execution.requestId && state.intelligenceTurns?.some((turn) => turn.id === request.turnId && turn.actorId === actor))),
    projects: (state.projects ?? []).filter((project) => member && project.actors.some((candidate) => candidate.id === actor)),
    capabilities: (state.capabilities ?? []).filter((capability) => capability.personId === actor),
    capabilityCandidates: (state.capabilityCandidates ?? []).filter((candidate) => member && candidate.personId === actor),
    executionJobs: (state.executionJobs ?? []).filter((job) => member && job.requestedByActorId === actor).map((job) => {
      const visibleJob = { ...job };
      delete visibleJob.resultFileName;
      delete visibleJob.deltaFileName;
      return visibleJob;
    }),
    agreements: (state.agreements ?? []).filter((agreement) => member && agreement.authorizingActorId === actor && agreement.sourceRecordId && state.records.some((record) => record.id === agreement.sourceRecordId)),
    meetings: (state.meetings ?? []).filter((meeting) => member && meeting.cellId === state.cell.id && meeting.participants.some((participant) => participant.kind === "PERSON" && participant.id === actor)),
    threadModelPreferences: state.threadModelPreferences ?? {},
  };
}
export type FoundationView = ReturnType<typeof projection>;
