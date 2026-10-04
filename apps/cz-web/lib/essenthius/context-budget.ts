// SPDX-License-Identifier: MPL-2.0
import type { IntelligenceContext } from "./port";

export const MAX_CONTEXT_CHARS = 9_000;

export function boundedInstitutionalContext(context: IntelligenceContext): string {
  const sourceCapabilities = context.currentCapabilities ?? context.capabilities;
  const prioritizedCapabilities = [
    ...sourceCapabilities.filter((item) => item.availability === "AVAILABLE" || item.availability === "AVAILABLE_WITH_HUMAN_CONFIRMATION"),
    ...sourceCapabilities.filter((item) => item.availability !== "AVAILABLE" && item.availability !== "AVAILABLE_WITH_HUMAN_CONFIRMATION"),
  ].slice(0, 12);
  const currentCapabilities = prioritizedCapabilities.map((item) => "label" in item
    ? { id: item.id, label: item.label.slice(0, 72), enables: item.enables.slice(0, 90), availability: item.availability, reason: item.reason.slice(0, 90), actionEntrypoint: item.actionEntrypoint }
    : { id: item.id, label: item.name.slice(0, 72), enables: item.effect.slice(0, 90), availability: item.availability, reason: item.conditions.slice(0, 1).join("; ").slice(0, 90), actionEntrypoint: null });
  const payload = {
    surface: context.currentSurface,
    person: { name: context.person.name, profileHeadline: context.person.profileHeadline.slice(0, 120) },
    cell: { name: context.cell.name, purpose: context.cell.purpose.slice(0, 160) },
    relations: context.relations.slice(0, 4),
    authority: context.authority.slice(0, 8),
    activeDirection: context.activeDirection ? {
      status: context.activeDirection.status,
      receivedAt: context.activeDirection.receivedAt,
      source: context.activeDirection.source.slice(0, 120),
      campaign: context.activeDirection.campaign.slice(0, 100),
      progress: context.activeDirection.implementationProgress.slice(-1).map((item) => item.slice(0, 180)),
      currentPriority: context.activeDirection.currentPriority.slice(0, 3).map((item) => item.slice(0, 140)),
      oldOpenWorkBoundary: context.activeDirection.oldOpenWorkBoundary.slice(0, 130),
      canonicalBoundary: context.activeDirection.canonicalBoundary.slice(0, 130),
      constraints: context.activeDirection.constraints.slice(0, 4).map((item) => item.slice(0, 100)),
    } : null,
    runtime: context.runtime ? { environment: context.runtime.environment, localHead: context.runtime.localHead, canonicalHead: context.runtime.canonicalHead, workingTreeDirty: context.runtime.workingTreeDirty, changedPathCount: context.runtime.changedPathCount } : null,
    canonical: { repository: context.canonical.repository, head: context.canonical.head, statePath: context.canonical.statePath, boundary: context.canonical.boundary.slice(0, 180), sourceExcerpts: context.canonical.sourceExcerpts.slice(0, 1).map((item) => ({ ...item, excerpt: item.excerpt.slice(0, 180) })) },
    currentCapabilities,
    profileCapabilityCandidates: (context.profileCapabilityCandidates ?? []).slice(-2),
    entities: context.entities?.slice(-10).map((item) => ({ kind: item.kind, id: item.id, label: item.label.slice(0, 80), href: item.href })) ?? [],
    openWork: context.openWork.slice(-3).map((item) => ({ id: item.id, title: item.title.slice(0, 100), context: item.context.slice(0, 140), updatedAt: item.updatedAt })),
    pendingHumanActions: context.pendingHumanActions.slice(-3).map((item) => ({ kind: item.kind, title: item.title.slice(0, 100), context: item.context.slice(0, 140) })),
    projects: context.projects.slice(-2).map((item) => ({ id: item.id, title: item.title.slice(0, 100), stage: item.stage, openOpportunities: item.openOpportunities.slice(0, 1).map((opportunity) => ({ id: opportunity.id, title: opportunity.title.slice(0, 90), conditions: opportunity.conditions.slice(0, 90), expectedResult: opportunity.expectedResult.slice(0, 90) })), commitments: item.commitments.slice(-1).map(({ id, proposalId, opportunityId, agreement }) => ({ id, proposalId, opportunityId, ...(agreement ? { agreement: { expectedResult: agreement.expectedResult.slice(0, 90), scope: agreement.scope.slice(0, 90), economicMode: "economicMode" in agreement ? agreement.economicMode : undefined } } : {}) })) })),
    meetings: context.meetings.slice(-2).map((item) => ({ id: item.id, title: item.title.slice(0, 80), purpose: item.purpose.slice(0, 120), status: item.status, participants: item.participants.slice(0, 4), href: item.href })),
    recentMetabolism: context.recentMetabolism.slice(-3).map(({ eventType, projectTitle, occurredAt, sourcePresent }) => ({ eventType, projectTitle: projectTitle.slice(0, 70), occurredAt, sourcePresent })),
    contributions: context.contributions.slice(-2).map(({ projectTitle, description, submittedAt, claimCount, verificationCount }) => ({ projectTitle: projectTitle.slice(0, 70), description: description.slice(0, 120), submittedAt, claimCount, verificationCount })),
    recentConversation: context.recentConversation.slice(-2).map((item) => ({ speaker: item.speaker, text: item.text.slice(0, 180), createdAt: item.createdAt })),
    recentRecords: context.recentRecords.filter((item) => item.kind !== "Interpretation").slice(-2).map(({ id, kind, purpose, content, createdAt }) => ({ id, kind, purpose, content: content.slice(0, 160), createdAt })),
    experiences: context.experiences.slice(-2).map((item) => ({ title: item.title.slice(0, 80), description: item.description.slice(0, 140), provenance: item.provenance })),
  };
  let json = JSON.stringify(payload);
  if (json.length > MAX_CONTEXT_CHARS) {
    payload.currentCapabilities = payload.currentCapabilities.slice(0, 9);
    payload.entities = payload.entities?.slice(-6);
    payload.openWork = payload.openWork.slice(-2).map((item) => ({ ...item, context: item.context.slice(0, 80) }));
    payload.pendingHumanActions = payload.pendingHumanActions.slice(-2).map((item) => ({ ...item, context: item.context.slice(0, 80) }));
    payload.projects = payload.projects.slice(-1);
    payload.meetings = payload.meetings.slice(-1);
    payload.recentMetabolism = payload.recentMetabolism.slice(-2);
    payload.contributions = payload.contributions.slice(-1).map((item) => ({ ...item, description: item.description.slice(0, 80) }));
    payload.recentConversation = payload.recentConversation.slice(-1).map((item) => ({ ...item, text: item.text.slice(0, 100) }));
    payload.recentRecords = payload.recentRecords.slice(-1).map((item) => ({ ...item, content: item.content.slice(0, 100) }));
    payload.experiences = payload.experiences.slice(-1).map((item) => ({ ...item, description: item.description.slice(0, 80) }));
    if (payload.activeDirection) {
      payload.activeDirection.currentPriority = payload.activeDirection.currentPriority.slice(0, 2);
      payload.activeDirection.progress = payload.activeDirection.progress.slice(-1).map((item) => item.slice(0, 120));
      payload.activeDirection.constraints = payload.activeDirection.constraints.slice(0, 2);
    }
    payload.canonical.sourceExcerpts = [];
    json = JSON.stringify(payload);
  }
  if (json.length > MAX_CONTEXT_CHARS) {
    payload.currentCapabilities = payload.currentCapabilities.slice(0, 6);
    payload.entities = payload.entities?.slice(-4);
    payload.openWork = payload.openWork.slice(-1).map((item) => ({ ...item, title: item.title.slice(0, 70), context: "" }));
    payload.pendingHumanActions = payload.pendingHumanActions.slice(-1).map((item) => ({ ...item, title: item.title.slice(0, 70), context: "" }));
    payload.recentConversation = [];
    payload.recentRecords = [];
    payload.contributions = [];
    payload.recentMetabolism = [];
    payload.experiences = [];
    if (payload.activeDirection) {
      payload.activeDirection.source = payload.activeDirection.source.slice(0, 60);
      payload.activeDirection.currentPriority = payload.activeDirection.currentPriority.slice(0, 1).map((item) => item.slice(0, 100));
      payload.activeDirection.oldOpenWorkBoundary = payload.activeDirection.oldOpenWorkBoundary.slice(0, 80);
      payload.activeDirection.canonicalBoundary = payload.activeDirection.canonicalBoundary.slice(0, 80);
      payload.activeDirection.constraints = payload.activeDirection.constraints.slice(0, 1).map((item) => item.slice(0, 70));
    }
    payload.canonical = { ...payload.canonical, statePath: "STATE.md", boundary: payload.canonical.boundary.slice(0, 80) };
    json = JSON.stringify(payload);
  }
  if (json.length > MAX_CONTEXT_CHARS) throw new Error("CZ_CONTEXT_BUDGET_EXCEEDED");
  return json;
}

export function contextBudgetMetrics(context: IntelligenceContext, promptCharacters: number) {
  const contextCharacters = boundedInstitutionalContext(context).length;
  return { contextCharacters, promptCharacters, estimatedContextTokens: Math.ceil(contextCharacters / 4), estimatedPromptTokens: Math.ceil(promptCharacters / 4) };
}
