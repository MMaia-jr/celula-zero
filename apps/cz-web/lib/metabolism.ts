// SPDX-License-Identifier: MPL-2.0
import { createHash } from "node:crypto";
import { z } from "zod";
import { canAct } from "@cz/authority";
import type { PersonId } from "@cz/identity";
import { appendRecord } from "@cz/records";
import type { Capability } from "@cz/presence";
import type { WorkbenchDomainEvent, WorkbenchProject } from "../../web/lib/domain/workbench-types";
import { hasInstitutionalState, type Foundation, type FoundationState } from "./foundation";
import { createTaskCapsule } from "../../web/lib/domain/task-capsule";

export type MetabolismAction =
  | { type: "project_create"; sourceRecordId: string; title: string; requestKey: string }
  | { type: "opportunity_open"; projectId: string; title: string; statement: string; conditions: string; expectedResult: string; requestKey: string }
  | { type: "proposal_submit"; projectId: string; opportunityId: string; statement: string; conditions: string; expectedDelivery: string; requestKey: string }
  | { type: "proposal_decide"; projectId: string; proposalId: string; disposition: "accept" | "decline"; requestKey: string }
  | { type: "agreement_define"; projectId: string; commitmentId: string; scope: string; exclusions: string; dependencies: string; evaluationCriterion: string; requestKey: string }
  | { type: "agreement_economic_status"; projectId: string; agreementId: string; mode: "OBLIGATION_DEFINED" | "SETTLEMENT_PENDING" | "SETTLED" | "RECONCILIATION_REQUIRED"; payerRole: string; payeeRole: string; obligationCondition: string; amount: string; currency: string; settlementReference: string; requestKey: string }
  | { type: "evidence_attach"; projectId: string; contributionId: string; claimId: string; artifactId: string; description: string; limitations: string; requestKey: string }
  | { type: "claim_record"; projectId: string; contributionId: string; statement: string; scopeDescription: string; requestKey: string }
  | { type: "capability_candidate_create"; workItemId: string; proposedName: string; requestKey: string }
  | { type: "capability_candidate_decide"; candidateId: string; disposition: "accept" | "decline"; acceptedName: string; requestKey: string };

export const metabolismActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("project_create"), sourceRecordId: z.string().min(1).max(160), title: z.string().trim().min(4).max(100), requestKey: z.string().min(16).max(80) }).strict(),
  z.object({ type: z.literal("opportunity_open"), projectId: z.string().min(1).max(160), title: z.string().trim().min(4).max(120), statement: z.string().trim().min(10).max(2000), conditions: z.string().trim().min(4).max(2000), expectedResult: z.string().trim().min(4).max(1000), requestKey: z.string().min(16).max(80) }).strict(),
  z.object({ type: z.literal("proposal_submit"), projectId: z.string().min(1).max(160), opportunityId: z.string().min(1).max(160), statement: z.string().trim().min(10).max(2000), conditions: z.string().trim().min(4).max(2000), expectedDelivery: z.string().trim().min(4).max(1000), requestKey: z.string().min(16).max(80) }).strict(),
  z.object({ type: z.literal("proposal_decide"), projectId: z.string().min(1).max(160), proposalId: z.string().min(1).max(160), disposition: z.enum(["accept", "decline"]), requestKey: z.string().min(16).max(80) }).strict(),
  z.object({ type: z.literal("agreement_define"), projectId: z.string().min(1).max(160), commitmentId: z.string().min(1).max(160), scope: z.string().trim().min(3).max(2000), exclusions: z.string().trim().max(2000), dependencies: z.string().trim().max(2000), evaluationCriterion: z.string().trim().min(3).max(2000), requestKey: z.string().min(16).max(80) }).strict(),
  z.object({ type: z.literal("agreement_economic_status"), projectId: z.string().min(1).max(160), agreementId: z.string().min(1).max(160), mode: z.enum(["OBLIGATION_DEFINED", "SETTLEMENT_PENDING", "SETTLED", "RECONCILIATION_REQUIRED"]), payerRole: z.string().trim().max(120), payeeRole: z.string().trim().max(120), obligationCondition: z.string().trim().max(1000), amount: z.string().trim().max(80), currency: z.string().trim().max(12), settlementReference: z.string().trim().max(300), requestKey: z.string().min(16).max(80) }).strict(),
  z.object({ type: z.literal("evidence_attach"), projectId: z.string().min(1).max(160), contributionId: z.string().min(1).max(160), claimId: z.string().min(1).max(160), artifactId: z.string().min(1).max(160), description: z.string().trim().min(4).max(2000), limitations: z.string().trim().min(4).max(1000), requestKey: z.string().min(16).max(80) }).strict(),
  z.object({ type: z.literal("claim_record"), projectId: z.string().min(1).max(160), contributionId: z.string().min(1).max(160), statement: z.string().trim().min(10).max(4000), scopeDescription: z.string().trim().min(3).max(2000), requestKey: z.string().min(16).max(80) }).strict(),
  z.object({ type: z.literal("capability_candidate_create"), workItemId: z.string().min(1).max(160), proposedName: z.string().trim().min(3).max(120), requestKey: z.string().min(16).max(80) }).strict(),
  z.object({ type: z.literal("capability_candidate_decide"), candidateId: z.string().min(1).max(160), disposition: z.enum(["accept", "decline"]), acceptedName: z.string().trim().min(3).max(120), requestKey: z.string().min(16).max(80) }).strict(),
]);

const bounded = (value: unknown, min: number, max: number) => typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64) || "projeto";

function canManage(state: FoundationState, actor: PersonId) {
  if (!state.cell || actor !== state.person?.id || !canAct(actor, state.cell.id, "cell.update", state.memberships, state.authorities))
    throw new Error("FORBIDDEN");
}

function event(input: Omit<WorkbenchDomainEvent, "canonicalDigest">): WorkbenchDomainEvent {
  const canonical = JSON.stringify({
    id: input.id,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    actorId: input.actorId,
    authorizedByActorId: input.authorizedByActorId,
    occurredAt: input.occurredAt,
    materialVersionBefore: input.materialVersionBefore,
    materialVersionAfter: input.materialVersionAfter,
    payload: input.payload,
  });
  return { ...input, canonicalDigest: createHash("sha256").update(canonical).digest("hex") };
}

function hasRequest(project: WorkbenchProject, action: MetabolismAction) {
  const prior = project.events.find((item) => item.payload.requestKey === action.requestKey);
  if (!prior) return false;
  if (prior.payload.actionDigest !== createHash("sha256").update(JSON.stringify(action)).digest("hex")) throw new Error("REQUEST_KEY_CONFLICT");
  return true;
}

function addHumanSource(state: FoundationState, actor: PersonId, content: string, id: () => string, now: string) {
  const sourceRecordId = id();
  state.records = appendRecord(state.records, {
    id: sourceRecordId, kind: "OriginalRecord", purpose: "human_speech", content,
    authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: state.cell!.id },
  });
  return sourceRecordId;
}

function decisionAuthorityId(state: FoundationState, actor: PersonId) {
  const activeRoles = new Set(state.memberships.filter((item) => item.personId === actor && item.cellId === state.cell!.id && item.status === "active").map((item) => item.roleId));
  const authority = state.authorities.find((item) => item.cellId === state.cell!.id && activeRoles.has(item.roleId) && item.permissions.includes("cell.update"));
  if (!authority) throw new Error("FORBIDDEN");
  return authority.id;
}

export function applyMetabolismAction(state: FoundationState, actor: PersonId, action: MetabolismAction, id: () => string, now: string): FoundationState {
  canManage(state, actor);
  if (!bounded(action.requestKey, 16, 80)) throw new Error("INVALID_REQUEST_KEY");
  const next = structuredClone(state);
  next.projects ??= [];
  const actionDigest = createHash("sha256").update(JSON.stringify(action)).digest("hex");

  if (action.type === "project_create") {
    if (!bounded(action.title, 4, 100) || !bounded(action.sourceRecordId, 1, 160)) throw new Error("INVALID_PROJECT");
    for (const existingProject of next.projects) {
      if (hasRequest(existingProject, action)) return state;
    }
    const source = next.records.find((record) => record.id === action.sourceRecordId);
    if (source?.kind !== "OriginalRecord" || !["intention", "human_speech"].includes(source.purpose) || source.authorId !== actor)
      throw new Error("PROJECT_SOURCE_NOT_OWNED_ORIGINAL");
    if (next.projects.some((project) => project.events.some((item) => item.payload.sourceRecordId === source.id))) throw new Error("INTENTION_ALREADY_PROJECTED");
    const baseSlug = slugify(action.title);
    const slug = next.projects.some((project) => project.slug === baseSlug) ? `${baseSlug}-${id().slice(0, 8)}` : baseSlug;
    const projectId = id();
    const projectActor = { id: actor, name: next.person!.name, kind: "PERSON" as const, operatorLabel: null, controlled: true, roles: next.roles.filter((role) => next.memberships.some((membership) => membership.roleId === role.id && membership.personId === actor && membership.status === "active")).map((role) => role.name) };
    next.projects.push({
      id: projectId, slug, title: action.title.trim(), stage: "OPEN", sourceLabel: "CZ_ORIGINAL_RECORD",
      stewardActorId: actor, actors: [projectActor], opportunities: [], proposals: [], commitments: [],
      contributions: [], artifacts: [], claims: [], evidenceItems: [], evidenceLinks: [], verificationRequests: [], verifications: [],
      events: [event({
        id: id(), eventType: "PROJECT_CREATED_FROM_ORIGINAL_INTENTION", aggregateType: "PROJECT", aggregateId: projectId,
        actorId: actor, authorizedByActorId: actor, occurredAt: now, materialVersionBefore: null, materialVersionAfter: 1,
        payload: { requestKey: action.requestKey, actionDigest, sourceRecordId: source.id, sourceKind: source.kind, sourcePurpose: source.purpose, originalContent: source.content },
      })],
    });
    return next;
  }

  if (action.type === "capability_candidate_create") {
    for (const prior of next.capabilityCandidates ?? []) {
      if (prior.requestKey === action.requestKey) {
        if (prior.proposedName !== action.proposedName || prior.workItemId !== action.workItemId) throw new Error("REQUEST_KEY_CONFLICT");
        return state;
      }
    }
    const work = next.workItems?.find((item) => item.id === action.workItemId && item.cellId === next.cell?.id && item.status === "complete");
    if (!work || work.responsiblePersonId !== actor) throw new Error("COMPLETED_WORK_NOT_OWNED");
    const result = next.records.find((record) => {
      if (record.kind !== "OriginalRecord" || !["learning", "work_consequence"].includes(record.purpose) || record.authorId !== actor) return false;
      try { return (JSON.parse(record.content) as { workItemId?: unknown }).workItemId === work.id; } catch { return false; }
    });
    if (result?.kind !== "OriginalRecord") throw new Error("WORK_LEARNING_SOURCE_MISSING");
    const sourceRecordId = addHumanSource(next, actor, `Proponho reconhecer uma capacidade desenvolvida ou exercitada em “${work.title}”: ${action.proposedName.trim()}. Isto é uma proposta baseada no aprendizado relatado; ainda não é uma capacidade aceita nem verificada.`, id, now);
    next.capabilityCandidates ??= [];
    next.capabilityCandidates.push({ id: id(), personId: actor, workItemId: work.id, sourceRecordId, learningRecordId: result.id, proposedName: action.proposedName.trim(), status: "PROPOSED", createdAt: now, requestKey: action.requestKey });
    return next;
  }

  if (action.type === "capability_candidate_decide") {
    const candidate = next.capabilityCandidates?.find((item) => item.id === action.candidateId && item.personId === actor);
    if (!candidate) throw new Error("CAPABILITY_CANDIDATE_NOT_FOUND");
    if (candidate.status === "ACCEPTED" || candidate.status === "DECLINED") return state;
    const work = next.workItems?.find((item) => item.id === candidate.workItemId && item.status === "complete");
    if (!work) throw new Error("CAPABILITY_SOURCE_WORK_MISSING");
    const source = next.records.find((record) => record.id === candidate.sourceRecordId && record.kind === "OriginalRecord");
    if (source?.kind !== "OriginalRecord") throw new Error("CAPABILITY_SOURCE_RECORD_MISSING");
    const acceptedName = action.acceptedName.trim();
    if (!bounded(acceptedName, 3, 120)) throw new Error("INVALID_CAPABILITY_NAME");
    const decisionSourceId = addHumanSource(next, actor, action.disposition === "accept"
      ? `Aceitei e registrei a capacidade “${acceptedName}” a partir da proposta e do aprendizado relatado em “${work.title}”. Ela permanece não verificada.`
      : `Recusei a proposta de capacidade “${candidate.proposedName}” ligada ao aprendizado de “${work.title}”.`, id, now);
    next.records = appendRecord(next.records, {
      id: id(), kind: "Decision",
      content: action.disposition === "accept" ? "Capacidade aceita como projeção user-reported; nenhuma verificação foi criada." : "Proposta de capacidade recusada.",
      sourceId: decisionSourceId, authorityId: decisionAuthorityId(next, actor), authorId: actor, createdAt: now,
      visibility: { scope: "private", ownerId: actor },
    });
    candidate.status = action.disposition === "accept" ? "ACCEPTED" : "DECLINED";
    if (action.disposition === "accept") {
      const capability: Capability = {
        id: id(), personId: actor, name: acceptedName,
        provenance: { origin: "user_reported", actorId: actor, actorKind: "human", sourceIds: [candidate.learningRecordId, candidate.sourceRecordId, decisionSourceId], createdAt: now },
        verificationIds: [],
      };
      next.capabilities ??= [];
      next.capabilities.push(capability);
      candidate.acceptedCapabilityId = capability.id;
    }
    return next;
  }

  const project = next.projects.find((candidate) => candidate.id === action.projectId && candidate.stewardActorId === actor);
  if (!project) throw new Error("PROJECT_NOT_FOUND_OR_NOT_STEWARD");
  if (hasRequest(project, action)) return state;

  if (action.type === "claim_record") {
    const contribution = project.contributions.find((item) => item.id === action.contributionId && item.authorActorId === actor);
    if (!contribution) throw new Error("CONTRIBUTION_NOT_OWNED");
    if (project.claims.some((item) => item.subjectType === "CONTRIBUTION" && item.subjectId === contribution.id)) throw new Error("CONTRIBUTION_CLAIM_ALREADY_EXISTS");
    const sourceRecordId = project.events.find((item) => item.aggregateId === contribution.id && item.aggregateType === "CONTRIBUTION")?.payload.sourceRecordId;
    if (typeof sourceRecordId !== "string" || !next.records.some((record) => record.id === sourceRecordId && record.kind === "OriginalRecord")) throw new Error("CONTRIBUTION_SOURCE_MISSING");
    const claimId = id();
    project.claims.push({ id: claimId, subjectType: "CONTRIBUTION", subjectId: contribution.id, authorActorId: actor, statement: action.statement.trim(), scopeDescription: action.scopeDescription.trim(), state: "RECORDED", createdAt: now });
    project.events.push(event({ id: id(), eventType: "CLAIM_RECORDED", aggregateType: "CLAIM", aggregateId: claimId, actorId: actor, authorizedByActorId: actor, occurredAt: now, materialVersionBefore: null, materialVersionAfter: 1, payload: { requestKey: action.requestKey, actionDigest, sourceRecordId, contributionId: contribution.id, statement: action.statement.trim(), scopeDescription: action.scopeDescription.trim() } }));
    return next;
  }

  if (action.type === "agreement_define") {
    const commitment = project.commitments.find((item) => item.id === action.commitmentId);
    if (!commitment) throw new Error("COMMITMENT_NOT_FOUND");
    if ((next.agreements ?? []).some((item) => item.commitmentId === commitment.id)) throw new Error("AGREEMENT_ALREADY_DEFINED");
    const work = next.workItems?.find((item) => item.commitmentId === commitment.id && item.status === "active" && item.responsiblePersonId === actor);
    if (!work) throw new Error("COMMITTED_WORK_REQUIRED");
    const opportunity = project.opportunities.find((item) => item.id === commitment.opportunityId);
    const proposal = project.proposals.find((item) => item.id === commitment.proposalId);
    if (!opportunity || !proposal || proposal.state !== "ACCEPTED") throw new Error("COMMITMENT_TERMS_UNRESOLVED");
    const frozenOpportunity = opportunity.versions?.find((item) => item.version === commitment.opportunityVersion);
    if (!frozenOpportunity) throw new Error("COMMITMENT_TERMS_UNRESOLVED");
    const sourceRecordId = id();
    const agreementId = id();
    const agreement = {
      id: agreementId, projectId: project.id, commitmentId: commitment.id, proposalId: proposal.id, opportunityId: opportunity.id,
      authorizingActorId: actor, sourceRecordId, expectedResult: frozenOpportunity.expectedResult,
      scope: action.scope.trim(), exclusions: action.exclusions.trim(), dependencies: action.dependencies.trim(),
      evaluationCriterion: action.evaluationCriterion.trim(), budgetBoundary: "NO_AUTOMATED_FUND_MOVEMENT" as const,
      economicMode: "NONE" as const,
      authorityBoundary: "Founder/Steward CZ pode registrar esta definição. Executor não recebe authority CZ; qualquer Git promotion exige Human Direction separada.",
      createdAt: now, version: 1 as const,
    };
    next.records = appendRecord(next.records, {
      id: sourceRecordId, kind: "OriginalRecord", purpose: "agreement",
      content: JSON.stringify({ kind: "AGREEMENT", agreementId, projectId: project.id, commitmentId: commitment.id, proposalId: proposal.id, opportunityId: opportunity.id, expectedResult: agreement.expectedResult, scope: agreement.scope, exclusions: agreement.exclusions, dependencies: agreement.dependencies, evaluationCriterion: agreement.evaluationCriterion, budgetBoundary: agreement.budgetBoundary, economicMode: agreement.economicMode, authorityBoundary: agreement.authorityBoundary, version: agreement.version }),
      authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: next.cell!.id },
    });
    next.agreements ??= [];
    next.agreements.push(agreement);
    project.events.push(event({
      id: id(), eventType: "AGREEMENT_DEFINED", aggregateType: "AGREEMENT", aggregateId: agreementId,
      actorId: actor, authorizedByActorId: actor, occurredAt: now, materialVersionBefore: null, materialVersionAfter: 1,
      payload: { requestKey: action.requestKey, actionDigest, sourceRecordId, projectId: project.id, commitmentId: commitment.id, proposalId: proposal.id, opportunityId: opportunity.id, expectedResult: agreement.expectedResult, evaluationCriterion: agreement.evaluationCriterion, budgetBoundary: agreement.budgetBoundary },
    }));
    return next;
  }

  if (action.type === "agreement_economic_status") {
    const agreement = (next.agreements ?? []).find((item) => item.id === action.agreementId && item.projectId === project.id);
    if (!agreement) throw new Error("AGREEMENT_NOT_FOUND");
    const allowed = new Set([
      "NONE->OBLIGATION_DEFINED", "OBLIGATION_DEFINED->SETTLEMENT_PENDING",
      "OBLIGATION_DEFINED->SETTLED", "OBLIGATION_DEFINED->RECONCILIATION_REQUIRED",
      "SETTLEMENT_PENDING->SETTLED", "SETTLEMENT_PENDING->RECONCILIATION_REQUIRED",
      "SETTLED->RECONCILIATION_REQUIRED",
      "RECONCILIATION_REQUIRED->SETTLEMENT_PENDING", "RECONCILIATION_REQUIRED->SETTLED",
    ]);
    if (!allowed.has(`${agreement.economicMode}->${action.mode}`)) throw new Error("ECONOMIC_STATUS_TRANSITION_INVALID");
    if (action.mode !== "RECONCILIATION_REQUIRED" && (!bounded(action.payerRole, 2, 120) || !bounded(action.payeeRole, 2, 120) || !bounded(action.obligationCondition, 4, 1000))) throw new Error("ECONOMIC_TERMS_REQUIRED");
    if ((action.amount && !action.currency) || (!action.amount && action.currency) || (action.amount && !/^\d+(\.\d{1,4})?$/.test(action.amount))) throw new Error("ECONOMIC_AMOUNT_CURRENCY_INVALID");
    if (action.mode === "SETTLED" && !bounded(action.settlementReference, 3, 300)) throw new Error("SETTLEMENT_REFERENCE_REQUIRED");
    const previous = agreement.economicMode;
    const sourceRecordId = id();
    const report = action.mode === "SETTLED" ? "estado informado pelo Founder; recebimento externo não verificado e fundos não foram movidos pelo CZ" : "status institucional registrado; nenhum fundo foi movimentado";
    const terms = action.mode === "RECONCILIATION_REQUIRED"
      ? { ...agreement.economicTerms, payerRole: agreement.economicTerms?.payerRole ?? "não definido", payeeRole: agreement.economicTerms?.payeeRole ?? "não definido", obligationCondition: agreement.economicTerms?.obligationCondition ?? "reconciliação pendente", source: "HUMAN_SUPPLIED" as const }
      : { payerRole: action.payerRole.trim(), payeeRole: action.payeeRole.trim(), obligationCondition: action.obligationCondition.trim(), source: "HUMAN_SUPPLIED" as const, ...(action.amount ? { amount: action.amount, currency: action.currency.toUpperCase() } : {}) };
    agreement.economicMode = action.mode;
    agreement.economicTerms = terms;
    if (action.settlementReference) agreement.settlementReference = action.settlementReference.trim();
    agreement.economicStatusUpdatedAt = now;
    next.records = appendRecord(next.records, { id: sourceRecordId, kind: "OriginalRecord", purpose: "economic_status", content: JSON.stringify({ agreementId: agreement.id, previous, mode: action.mode, terms, settlementReference: action.settlementReference.trim() || null, statement: report, createdAt: now }), authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: next.cell!.id } });
    project.events.push(event({ id: id(), eventType: "AGREEMENT_ECONOMIC_STATUS_RECORDED", aggregateType: "AGREEMENT", aggregateId: agreement.id, actorId: actor, authorizedByActorId: actor, occurredAt: now, materialVersionBefore: 1, materialVersionAfter: 1, payload: { requestKey: action.requestKey, actionDigest, sourceRecordId, previous, mode: action.mode, statement: report } }));
    return next;
  }

  if (action.type === "evidence_attach") {
    const contribution = project.contributions.find((item) => item.id === action.contributionId && item.authorActorId === actor);
    const claim = project.claims.find((item) => item.id === action.claimId && item.subjectType === "CONTRIBUTION" && item.subjectId === action.contributionId);
    const artifact = project.artifacts.find((item) => item.id === action.artifactId && item.contributionId === action.contributionId);
    if (!contribution || !claim || !artifact) throw new Error("EVIDENCE_SUBJECT_MISMATCH");
    if (project.evidenceItems.some((item) => item.sourceArtifactId === artifact.id && project.evidenceLinks.some((link) => link.evidenceItemId === item.id && link.claimId === claim.id))) throw new Error("EVIDENCE_ALREADY_ATTACHED");
    const sourceRecordId = id();
    const evidenceId = id();
    const original = `Human attached an artifact as evidence for a claim.\nDescription: ${action.description.trim()}\nLimitations: ${action.limitations.trim()}\nArtifact digest: ${artifact.digest}\nState: documented by the claimant; not independently verified.`;
    next.records = appendRecord(next.records, { id: sourceRecordId, kind: "OriginalRecord", purpose: "evidence_attachment", content: original, authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: next.cell!.id } });
    next.records = appendRecord(next.records, { id: evidenceId, kind: "Evidence", claimId: claim.id, sourceId: sourceRecordId, rationale: `${action.description.trim()}\nLimitations: ${action.limitations.trim()}\nArtifact digest: ${artifact.digest}. Evidence is attributable and documented; no Verification is implied.` , authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: next.cell!.id } });
    project.evidenceItems.push({ id: id(), sourceArtifactId: artifact.id, custodianActorId: actor, description: action.description.trim(), limitations: action.limitations.trim(), digest: artifact.digest, state: "DOCUMENTED", createdAt: now });
    const evidenceItem = project.evidenceItems.at(-1)!;
    project.evidenceLinks.push({ id: id(), evidenceItemId: evidenceItem.id, claimId: claim.id, relation: "SUPPORTS", declaredByActorId: actor });
    project.events.push(event({ id: id(), eventType: "EVIDENCE_ATTACHED_TO_CLAIM", aggregateType: "EVIDENCE", aggregateId: evidenceId, actorId: actor, authorizedByActorId: actor, occurredAt: now, materialVersionBefore: null, materialVersionAfter: 1, payload: { requestKey: action.requestKey, actionDigest, sourceRecordId, claimId: claim.id, artifactId: artifact.id, evidenceItemId: evidenceItem.id, limitation: action.limitations.trim(), verification: "NOT_INDEPENDENTLY_VERIFIED" } }));
    return next;
  }

  if (action.type === "opportunity_open") {
    if (!bounded(action.title, 4, 120) || !bounded(action.statement, 10, 2000) || !bounded(action.conditions, 4, 2000) || !bounded(action.expectedResult, 4, 1000)) throw new Error("INVALID_OPPORTUNITY");
    const opportunityId = id();
    const sourceRecordId = addHumanSource(next, actor, `Abri a possibilidade “${action.title.trim()}”.\n\n${action.statement.trim()}\n\nCondições: ${action.conditions.trim()}\n\nResultado esperado: ${action.expectedResult.trim()}`, id, now);
    project.opportunities.push({
      id: opportunityId, ownerActorId: actor, state: "OPEN", visibility: "PROJECT", currentVersion: 1,
      materialVersion: 1, capacity: 1, title: action.title.trim(), statement: action.statement.trim(), conditions: action.conditions.trim(), expectedResult: action.expectedResult.trim(),
      versions: [{ version: 1, title: action.title.trim(), statement: action.statement.trim(), conditions: action.conditions.trim(), expectedResult: action.expectedResult.trim() }],
    });
    project.events.push(event({
      id: id(), eventType: "OPPORTUNITY_OPENED", aggregateType: "OPPORTUNITY", aggregateId: opportunityId,
      actorId: actor, authorizedByActorId: actor, occurredAt: now, materialVersionBefore: null, materialVersionAfter: 1,
      payload: { requestKey: action.requestKey, actionDigest, projectId: project.id, sourceRecordId, title: action.title.trim(), conditions: action.conditions.trim(), expectedResult: action.expectedResult.trim() },
    }));
    return next;
  }

  if (action.type === "proposal_submit") {
    if (!bounded(action.statement, 10, 2000) || !bounded(action.conditions, 4, 2000) || !bounded(action.expectedDelivery, 4, 1000)) throw new Error("INVALID_PROPOSAL");
    const opportunity = project.opportunities.find((item) => item.id === action.opportunityId && item.state === "OPEN");
    if (!opportunity) throw new Error("OPPORTUNITY_NOT_OPEN");
    const proposalId = id();
    const noEconomicObligation = "Sem obrigação econômica; qualquer economia exige autorização e registro próprios.";
    const sourceRecordId = addHumanSource(next, actor, `Apresentei uma proposta para “${opportunity.title}”.\n\nAbordagem: ${action.statement.trim()}\n\nCondições: ${action.conditions.trim()}\n\nEntrega esperada: ${action.expectedDelivery.trim()}\n\n${noEconomicObligation}`, id, now);
    project.proposals.push({
      id: proposalId, opportunityId: opportunity.id, proposerActorId: actor, state: "SUBMITTED", currentVersion: 1, materialVersion: 1,
      statement: action.statement.trim(), conditions: action.conditions.trim(), expectedDelivery: action.expectedDelivery.trim(), rewardExpectation: noEconomicObligation, createdAt: now,
      versions: [{ version: 1, statement: action.statement.trim(), conditions: action.conditions.trim(), expectedDelivery: action.expectedDelivery.trim(), rewardExpectation: noEconomicObligation }],
    });
    project.events.push(event({
      id: id(), eventType: "PROPOSAL_SUBMITTED", aggregateType: "PROPOSAL", aggregateId: proposalId,
      actorId: actor, authorizedByActorId: actor, occurredAt: now, materialVersionBefore: null, materialVersionAfter: 1,
      payload: { requestKey: action.requestKey, actionDigest, sourceRecordId, opportunityId: opportunity.id, opportunityVersion: opportunity.currentVersion, statement: action.statement.trim(), conditions: action.conditions.trim(), expectedDelivery: action.expectedDelivery.trim(), rewardExpectation: noEconomicObligation },
    }));
    return next;
  }

  const proposal = project.proposals.find((item) => item.id === action.proposalId);
  if (!proposal) throw new Error("PROPOSAL_NOT_FOUND");
  if (action.disposition === "decline") {
    if (proposal.state === "REJECTED") return state;
    if (proposal.state !== "SUBMITTED") throw new Error("PROPOSAL_ALREADY_DECIDED");
    const sourceRecordId = addHumanSource(next, actor, `Decidi recusar a proposta “${proposal.statement}” para “${project.opportunities.find((item) => item.id === proposal.opportunityId)?.title ?? "a possibilidade"}”.`, id, now);
    next.records = appendRecord(next.records, { id: id(), kind: "Decision", content: "Proposta recusada pelo Founder/Steward desta Célula.", sourceId: sourceRecordId, authorityId: decisionAuthorityId(next, actor), authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: next.cell!.id } });
    proposal.state = "REJECTED";
    project.events.push(event({
      id: id(), eventType: "PROPOSAL_DECLINED", aggregateType: "PROPOSAL", aggregateId: proposal.id,
      actorId: actor, authorizedByActorId: actor, occurredAt: now, materialVersionBefore: proposal.materialVersion, materialVersionAfter: proposal.materialVersion + 1,
      payload: { requestKey: action.requestKey, actionDigest, sourceRecordId, reason: "Human steward declined this proposal." },
    }));
    return next;
  }
  if (proposal.state === "ACCEPTED") return state;
  if (proposal.state !== "SUBMITTED") throw new Error("PROPOSAL_ALREADY_DECIDED");
  const opportunity = project.opportunities.find((item) => item.id === proposal.opportunityId);
  if (!opportunity) throw new Error("OPPORTUNITY_NOT_FOUND");
  const sourceRecordId = addHumanSource(next, actor, `Decidi aceitar a proposta “${proposal.statement}” para “${opportunity.title}”, sob o resultado e as condições exibidas. Não autorizei obrigação econômica ou pagamento.`, id, now);
  const authorityId = decisionAuthorityId(next, actor);
  next.records = appendRecord(next.records, { id: id(), kind: "Decision", content: "Proposta aceita sob as condições registradas; nenhum direito econômico ou pagamento foi criado.", sourceId: sourceRecordId, authorityId, authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: next.cell!.id } });
  proposal.state = "ACCEPTED";
  proposal.materialVersion += 1;
  const commitmentId = id();
  project.commitments.push({
    id: commitmentId, opportunityId: opportunity.id, opportunityVersion: opportunity.currentVersion,
    proposalId: proposal.id, proposalVersion: proposal.currentVersion, proposerActorId: proposal.proposerActorId,
    acceptedByActorId: actor, createdAt: now,
  });
  next.workItems ??= [];
  const workItemId = id();
  next.workItems.push({
    id: workItemId, cellId: next.cell!.id, responsiblePersonId: proposal.proposerActorId as PersonId,
    title: proposal.expectedDelivery, context: `${opportunity.statement}\n\nResultado esperado: ${opportunity.expectedResult}\n\nCondições do Opportunity: ${opportunity.conditions}\n\nCondições da Proposal: ${proposal.conditions}\n\nCompromisso explícito sob as versões congeladas; sem obrigação econômica autorizada.`,
    status: "active", sourceRecordId, commitmentId, taskCapsuleDigest: createTaskCapsule(project, commitmentId).digest, createdAt: now, updatedAt: now,
  });
  project.events.push(event({
    id: id(), eventType: "PROPOSAL_ACCEPTED_AS_COMMITMENT", aggregateType: "COMMITMENT", aggregateId: commitmentId,
    actorId: actor, authorizedByActorId: actor, occurredAt: now, materialVersionBefore: proposal.materialVersion - 1, materialVersionAfter: proposal.materialVersion,
    payload: { requestKey: action.requestKey, actionDigest, sourceRecordId, workItemId, taskCapsuleDigest: next.workItems.at(-1)?.taskCapsuleDigest, opportunityId: opportunity.id, opportunityVersion: opportunity.currentVersion, proposalId: proposal.id, proposalVersion: proposal.currentVersion, expectedResult: opportunity.expectedResult, conditions: [opportunity.conditions, proposal.conditions], economicStatus: "NO_ECONOMIC_OBLIGATION_AUTHORIZED" },
  }));
  return next;
}

export function recordWorkContribution(state: FoundationState, actor: PersonId, workItemId: string, id: () => string, now: string): Foundation {
  if (!hasInstitutionalState(state)) throw new Error("IDENTITY_UNRESOLVED");
  const work = state.workItems?.find((item) => item.id === workItemId && item.cellId === state.cell?.id);
  if (!work?.commitmentId) return state;
  canManage(state, actor);
  const next = structuredClone(state);
  const commitment = next.projects?.flatMap((project) => project.commitments).find((item) => item.id === work.commitmentId);
  if (!commitment) throw new Error("COMMITMENT_NOT_FOUND");
  const project = next.projects?.find((item) => item.commitments.some((candidate) => candidate.id === commitment.id));
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  const existing = project.contributions.find((contribution) => contribution.commitmentId === commitment.id);
  if (existing) return state;
  const resultRecord = next.records.filter((record) => {
    if (record.kind !== "OriginalRecord" || record.purpose !== "work_consequence" || record.authorId !== actor) return false;
    try { return (JSON.parse(record.content) as { workItemId?: unknown }).workItemId === work.id; }
    catch { return false; }
  }).at(-1);
  if (resultRecord?.kind !== "OriginalRecord") throw new Error("WORK_RESULT_RECORD_MISSING");
  const contributionId = id();
  const contribution = { id: contributionId, commitmentId: commitment.id, authorActorId: actor, description: resultRecord.content, limitations: "Relato de resultado feito pelo responsável; não constitui verificação independente.", submittedAt: now };
  project.contributions.push(contribution);
  let artifactId: string | undefined;
  let executorResultDigest: string | undefined;
  try {
    const consequence = JSON.parse(resultRecord.content) as { executorResult?: { executionJobId?: unknown; resultDigest?: unknown; deltaDigest?: unknown } };
    const jobId = consequence.executorResult?.executionJobId;
    const job = typeof jobId === "string" ? next.executionJobs?.find((candidate) => candidate.id === jobId && candidate.workItemId === work.id && candidate.requestedByActorId === actor && candidate.status === "COMPLETED") : undefined;
    const agreement = job ? next.agreements?.find((candidate) => candidate.id === job.agreementId && candidate.commitmentId === job.commitmentId && candidate.authorizingActorId === actor) : undefined;
    const delta = job?.resultPackage?.artifacts.find((candidate) => candidate.digest === job.deltaDigest);
    const agreementDigest = agreement ? createHash("sha256").update(JSON.stringify(agreement)).digest("hex") : undefined;
    if (job && agreement && agreementDigest === job.agreementDigest && delta?.uri.startsWith("urn:sha256:") && typeof delta.digest === "string" && delta.digest === consequence.executorResult?.deltaDigest) {
      const createdArtifactId = id();
      artifactId = createdArtifactId;
      executorResultDigest = job.resultDigest;
      project.artifacts.push({
        id: createdArtifactId, contributionId, createdByActorId: "executor:codex-cli", kind: "EXECUTION_DELTA",
        uri: delta.uri, digest: delta.digest, mediaType: delta.mediaType ?? "application/octet-stream", sizeBytes: null,
        retentionClass: "LOCAL_RESULT_PACKAGE_PRESERVED", createdAt: job.completedAt ?? now,
      });
    }
  } catch { /* A human-reported contribution without an executor result has no implied artifact. */ }
  const payload = { sourceRecordId: resultRecord.id, commitmentId: commitment.id, contributionId, ...(artifactId ? { artifactId } : {}) };
  project.events.push(event({ id: id(), eventType: "CONTRIBUTION_RECORDED", aggregateType: "CONTRIBUTION", aggregateId: contributionId, actorId: actor, authorizedByActorId: actor, occurredAt: now, materialVersionBefore: null, materialVersionAfter: 1, payload }));
  if (artifactId) project.events.push(event({ id: id(), eventType: "ARTIFACT_RECORDED_FROM_EXECUTION_RESULT", aggregateType: "ARTIFACT", aggregateId: artifactId, actorId: "executor:codex-cli", authorizedByActorId: actor, occurredAt: now, materialVersionBefore: null, materialVersionAfter: 1, payload: { sourceRecordId: resultRecord.id, contributionId, resultDigest: executorResultDigest, artifactId } }));
  return next;
}
