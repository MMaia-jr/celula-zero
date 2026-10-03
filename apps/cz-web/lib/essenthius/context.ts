// SPDX-License-Identifier: MPL-2.0
import { canAct } from "@cz/authority";
import type { PersonId } from "@cz/identity";
import { projection, type Foundation, type FoundationView } from "../foundation";
import type { IntelligenceContext } from "./port";
import type { ActiveDirectionProjection } from "./active-direction";

export function compileInstitutionalContext(
  state: Foundation,
  actorId: string,
  capabilities: IntelligenceContext["capabilities"],
  canonicalHead: string | null,
  resources: IntelligenceContext["resources"] = [],
  sourceExcerpts: IntelligenceContext["canonical"]["sourceExcerpts"] = [],
  threadId = `cell:${state.cell.id}`,
  currentMessageId?: string,
  currentSurface = "home",
  repositoryState?: { localHead: string; canonicalHead: string | null; workingTreeDirty: boolean; changedPathCount: number },
  activeDirection: ActiveDirectionProjection | null = null,
  currentCapabilities: NonNullable<IntelligenceContext["currentCapabilities"]> = [],
): IntelligenceContext {
  const short = (value: string, max: number) => value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
  const view = projection(state, actorId as Foundation["person"]["id"]);
  const capabilityProjection = currentCapabilities.length
    ? currentCapabilities.map(({ id, label, enables, availability, reason }) => ({ id, name: label, effect: enables, availability, conditions: [reason] }))
    : capabilities;
  if (!view.cell || view.person.id !== actorId) throw new Error("CZ_CONTEXT_AUTHORITY_UNRESOLVED");
  const membership = state.memberships.filter((item) => item.personId === actorId && item.cellId === view.cell!.id && item.status === "active");
  const roleIds = new Set(membership.map((item) => item.roleId));
  const permissions = [...new Set(state.authorities.filter((item) => item.cellId === view.cell!.id && roleIds.has(item.roleId)).flatMap((item) => item.permissions))];
  const canRead = canAct(actorId as PersonId, view.cell.id, "cell.read", state.memberships, state.authorities);
  if (!canRead) throw new Error("CZ_CONTEXT_AUTHORITY_UNRESOLVED");
  const conversationTurns = (state.intelligenceTurns ?? []).filter((turn) => turn.threadId === threadId || (!turn.threadId && threadId === `cell:${state.cell.id}`));
  const conversationTurnIds = new Set(conversationTurns.map((turn) => turn.id));
  const conversationInterpretationIds = new Set(conversationTurns.flatMap((turn) => turn.interpretationRecordId ? [turn.interpretationRecordId] : []));
  const conversationMessageIds = new Set(conversationTurns.flatMap((turn) => turn.humanMessageId ? [turn.humanMessageId] : []));
  const otherThreadRecordIds = new Set((state.intelligenceTurns ?? []).filter((turn) => !conversationTurnIds.has(turn.id)).flatMap((turn) => [turn.humanRecordId, turn.interpretationRecordId].filter((id): id is string => !!id)));
  const relevantRecords = view.records
    .filter((record) => ["OriginalRecord", "Claim", "Evidence", "Verification", "Decision"].includes(record.kind))
    .filter((record) => !otherThreadRecordIds.has(record.id) && (record.kind !== "Interpretation" || conversationInterpretationIds.has(record.id) || !state.intelligenceTurns?.some((turn) => turn.interpretationRecordId === record.id)))
    .slice(-4)
    .map((record) => ({
      id: record.id,
      kind: record.kind,
      ...(record.kind === "OriginalRecord" ? { purpose: record.purpose } : {}),
      content: short("content" in record ? record.content : JSON.stringify(record), 420),
      createdAt: record.createdAt,
    }));
  const entityHref = (kind: string, id: string) => {
    const query = new URLSearchParams({ open: `${kind}:${id}` });
    const section = kind === "meeting" ? "meetings" : kind === "experience" ? "you" : "cells";
    return `/${section}?${query.toString()}`;
  };
  return {
    currentSurface: ["home", "conversations", "cells", "discover", "meetings", "activity", "you"].includes(currentSurface) ? currentSurface : "home",
    navigation: [
      { section: "home", label: "Início", href: "/" },
      { section: "conversations", label: "Conversas", href: "/conversations" },
      { section: "cells", label: "Células", href: "/cells" },
      { section: "discover", label: "Descobrir", href: "/discover" },
      { section: "meetings", label: "Reuniões", href: "/meetings" },
      { section: "activity", label: "Atividade", href: "/activity" },
      { section: "you", label: "Você", href: "/you" },
    ],
    entities: [
      ...(view.workItems ?? []).filter((item) => item.status === "active").map((item) => ({ kind: "work" as const, id: item.id, label: item.title, href: entityHref("work", item.id) })),
      ...(view.projects ?? []).map((item) => ({ kind: "project" as const, id: item.id, label: item.title, href: entityHref("project", item.id) })),
      ...(view.projects ?? []).flatMap((project) => project.opportunities.filter((item) => item.state === "OPEN").map((item) => ({ kind: "opportunity" as const, id: item.id, label: item.title, href: entityHref("opportunity", item.id) }))),
      ...(view.meetings ?? []).map((item) => ({ kind: "meeting" as const, id: item.id, label: item.title, href: entityHref("meeting", item.id) })),
      ...view.experiences.map((item) => ({ kind: "experience" as const, id: item.id, label: item.title, href: entityHref("experience", item.id) })),
    ].slice(-40),
    runtime: {
      environment: process.env.VERCEL ? "hosted" : "local", repository: "MMaia-jr/celula-zero",
      localHead: repositoryState?.localHead ?? canonicalHead ?? "unavailable",
      canonicalHead: repositoryState?.canonicalHead ?? null,
      workingTreeDirty: repositoryState?.workingTreeDirty ?? false,
      changedPathCount: repositoryState?.changedPathCount ?? 0,
    },
    activeDirection,
    person: { id: view.person.id, name: view.person.name, profileHeadline: short(view.profile.headline, 180), profileBio: short(view.profile.bio, 260) },
    cell: { id: view.cell.id, name: view.cell.name, purpose: short(view.cell.purpose, 240) },
    relations: view.relations.filter((relation) => relation.personId === actorId && relation.cellId === view.cell!.id).map((relation) => relation.kind),
    authority: permissions,
    openWork: (view.workItems ?? []).filter((work) => work.status === "active").slice(-5).map((work) => ({ id: work.id, title: short(work.title, 140), context: short(work.context, 260), updatedAt: work.updatedAt })),
    meetings: (view.meetings ?? []).slice(-6).map((meeting) => ({
      id: meeting.id, title: meeting.title, purpose: meeting.purpose, status: meeting.status,
      participants: meeting.participants.map((participant) => participant.label),
      href: entityHref("meeting", meeting.id),
    })),
    pendingHumanActions: (view.actionRequests ?? []).filter((request) => request.status === "PROPOSED").slice(-8).map((request) => ({
      kind: "WORK_PROPOSAL" as const, title: request.proposedTitle, context: request.proposedContext,
    })),
    projects: (view.projects ?? []).slice(-3).map((project) => ({
      id: project.id, title: short(project.title, 140), stage: project.stage,
      openOpportunities: project.opportunities.filter((opportunity) => opportunity.state === "OPEN").slice(0, 2).map(({ id, title, statement, conditions, expectedResult }) => ({ id, title: short(title, 130), statement: short(statement, 180), conditions: short(conditions, 180), expectedResult: short(expectedResult, 180) })),
      commitments: project.commitments.slice(-2).map(({ id, proposalId, opportunityId, createdAt }) => {
        const agreement = view.agreements?.find((item) => item.commitmentId === id);
        return {
          id, proposalId, opportunityId, createdAt,
          ...(agreement ? { agreement: { expectedResult: short(agreement.expectedResult, 160), scope: short(agreement.scope, 160), exclusions: short(agreement.exclusions, 100), dependencies: short(agreement.dependencies, 100), evaluationCriterion: short(agreement.evaluationCriterion, 120), economicMode: agreement.economicMode, economicTerms: agreement.economicTerms ?? null, settlementReference: agreement.settlementReference ?? null, budgetBoundary: agreement.budgetBoundary } } : {}),
        };
      }),
    })),
    recentMetabolism: (view.projects ?? []).flatMap((project) => project.events.map((event) => ({ projectTitle: project.title, event })))
      .sort((left, right) => left.event.occurredAt.localeCompare(right.event.occurredAt)).slice(-6)
      .map(({ projectTitle, event }) => ({
        eventType: event.eventType, projectTitle, aggregateType: event.aggregateType, occurredAt: event.occurredAt,
        sourcePresent: typeof event.payload.sourceRecordId === "string",
        ...(typeof event.payload.resultDigest === "string" ? { resultDigest: event.payload.resultDigest } : {}),
        ...(typeof event.payload.taskCapsuleDigest === "string" ? { taskCapsuleDigest: event.payload.taskCapsuleDigest } : {}),
      })),
    contributions: (view.projects ?? []).flatMap((project) => project.contributions.map((contribution) => ({
      projectTitle: project.title, description: contribution.description, limitations: contribution.limitations,
      submittedAt: contribution.submittedAt,
      claimCount: project.claims.filter((claim) => claim.subjectType === "CONTRIBUTION" && claim.subjectId === contribution.id).length,
      verificationCount: project.verifications.filter((verification) => project.claims.some((claim) => claim.id === verification.claimId && claim.subjectId === contribution.id)).length,
    }))).slice(-8),
    profileCapabilityCandidates: (view.capabilityCandidates ?? []).slice(-4).map((candidate) => ({
      proposedName: candidate.proposedName, status: candidate.status,
      sourceLearningPresent: view.records.some((record) => record.id === candidate.learningRecordId),
    })),
    recentConversation: (state.conversationMessages ?? [])
      .filter((message) => conversationMessageIds.has(message.id) && message.id !== currentMessageId && message.authorId === actorId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(-4)
      .map((message) => ({ speaker: view.person.name, text: short(message.body, 520), createdAt: message.createdAt })),
    recentRecords: relevantRecords,
    experiences: view.experiences.slice(-4).map((experience) => ({ title: short(experience.title, 100), description: short(experience.description, 260), provenance: experience.provenance.origin })),
    capabilities: capabilityProjection,
    currentCapabilities,
    resources: resources.slice(0, 10),
    canonical: {
      repository: "MMaia-jr/celula-zero",
      head: canonicalHead,
      statePath: canonicalHead ? "STATE.md (read from the locally available origin/main reference)" : "not available from a local canonical ref",
      boundary: canonicalHead
        ? "Read-only source observation from the locally available origin/main Git ref; the ref is not refreshed by this request. It is not itself a CZ OriginalRecord, an automatically adopted Human Direction, or proof that no later direction exists."
        : "No local origin/main reference was available. Do not describe checkout HEAD or uncommitted files as canonical state.",
      sourceExcerpts: sourceExcerpts.slice(0, 3).map((source) => ({ ...source, excerpt: short(source.excerpt, 420) })),
    },
  };
}

export function describeContinuity(view: FoundationView) {
  const activeWork = (view.workItems ?? []).filter((work) => work.status === "active");
  const lastHuman = view.records.filter((record): record is Extract<typeof record, { kind: "OriginalRecord" }> => record.kind === "OriginalRecord" && (record.purpose === "intention" || record.purpose === "human_speech")).at(-1);
  return {
    person: view.person.name,
    cell: view.cell?.name ?? null,
    activeWork,
    lastHumanRecord: lastHuman ? { id: lastHuman.id, content: lastHuman.content, createdAt: lastHuman.createdAt } : null,
    lastConversationMessage: (view.conversationMessages ?? []).filter((message) => message.threadId === `cell:${view.cell?.id}`).at(-1) ?? null,
    source: "reconstructed from durable Foundation records and work; not model memory",
  };
}
