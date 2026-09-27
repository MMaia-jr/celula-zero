import { getCompanyCoreContinuation } from "@/lib/domain/company-core-continuation";
import { deriveGuidedWorkbenchAction, type GuidedWorkbenchStep } from "@/lib/domain/guided-workbench";

type WorkbenchProject = Parameters<typeof deriveGuidedWorkbenchAction>[0];
export type OperationMode = "NEEDS_HUMAN" | "CAN_CONTINUE" | "BLOCKED" | "IN_PROGRESS";
export interface OperationalItem {
  source: "COMPANY_CORE" | "WORKBENCH";
  sourceId: string;
  title: string;
  action: string;
  description: string;
  href: string;
  mode: OperationMode;
  observedState: string;
}
export interface OperationCycle {
  id: string;
  needTitle: string;
  projectTitle: string;
  state: string;
  aiJobState?: string | null;
}

export function projectCompanyCoreOperation(cycle: OperationCycle): OperationalItem | null {
  const continuation = getCompanyCoreContinuation(cycle.state, cycle.aiJobState);
  const base = {
    source: "COMPANY_CORE" as const,
    sourceId: cycle.id,
    title: `${cycle.projectTitle} · ${cycle.needTitle}`,
    href: `/company-core/${encodeURIComponent(cycle.id)}`,
    observedState: cycle.state,
    action: continuation.action,
  };
  switch (continuation.action) {
    case "COMPLETE": return null;
    case "DEFINE_AGREEMENT":
      return { ...base, mode: "CAN_CONTINUE", description: "Defina o acordo para a necessidade registrada." };
    case "AUTHORIZE_WORK":
      return { ...base, mode: "NEEDS_HUMAN", description: "Revise o acordo e decida sobre autorizar o trabalho. Nenhuma autorização foi inferida." };
    case "WAIT_FOR_EXECUTION":
      return { ...base, mode: "IN_PROGRESS", description: "Trabalho autorizado ou em execução. Acompanhe o estado; execução não significa sucesso." };
    case "RECONCILE_EXECUTION":
      return { ...base, mode: "BLOCKED", observedState: `${cycle.state} / NEEDS_RECONCILIATION`, description: "Resultado da execução incerto. Requer atenção humana para reconciliação; nenhuma resolução foi inferida." };
    case "RECORD_RESULT":
      return { ...base, mode: "NEEDS_HUMAN", description: continuation.failurePath
        ? "A IA falhou. Registre o resultado considerando essa falha; nenhum sucesso foi presumido."
        : "Selecione e registre o resultado. A saída da IA não se torna resultado automaticamente." };
    case "RECORD_EVALUATION":
      return { ...base, mode: "NEEDS_HUMAN", description: "Avalie o resultado registrado; utilidade não foi inferida." };
    case "RECORD_CONSEQUENCE":
      return { ...base, mode: "NEEDS_HUMAN", description: "Registre a consequência observada da avaliação, sem presumir adoção ou impacto." };
    case "UNRECOGNIZED_STATE":
      return { ...base, mode: "BLOCKED", description: "Estado não reconhecido. Consulte o contexto; nenhuma próxima ação foi inferida." };
  }
}

const workbenchModes = {
  START_INTENTION: "CAN_CONTINUE", REVIEW_DRAFT: "BLOCKED",
  REGISTER_AGENT: "CAN_CONTINUE", SUBMIT_PROPOSAL: "CAN_CONTINUE",
  HUMAN_ACCEPTANCE: "NEEDS_HUMAN", STATE_GAP: "BLOCKED",
  EXECUTE_COMMITMENT: "CAN_CONTINUE", REGISTER_CONTRIBUTION: "CAN_CONTINUE",
  ATTACH_ARTIFACT: "CAN_CONTINUE", RECORD_CLAIM: "CAN_CONTINUE",
  REGISTER_EVIDENCE: "CAN_CONTINUE", REQUEST_VERIFICATION: "NEEDS_HUMAN",
  ISSUE_VERIFICATION: "NEEDS_HUMAN", HUMAN_DECISION: "NEEDS_HUMAN",
} satisfies Record<GuidedWorkbenchStep, OperationMode>;

/** Enumerate durable trajectories; never select a winning opportunity or proposal. */
export function projectWorkbenchOperations(project: WorkbenchProject): OperationalItem[] {
  if (project.stage === "COMPLETED" || project.stage === "ABANDONED") return [];
  const items: OperationalItem[] = [];
  const blocked = (id: string, state: string, href: string): OperationalItem => ({
    source: "WORKBENCH", sourceId: `${project.id}:${id}`, title: project.title,
    action: "UNRECOGNIZED_STATE", description: "Estado não reconhecido. Consulte o contexto; nenhuma ação foi inferida.",
    mode: "BLOCKED", observedState: state, href,
  });
  if (!["DRAFT", "OPEN", "ACTIVE", "PAUSED"].includes(project.stage)) {
    return [blocked(project.id, project.stage, `/projects/${encodeURIComponent(project.slug)}`)];
  }
  function append(scope: WorkbenchProject, observedState: string) {
    const action = deriveGuidedWorkbenchAction(scope);
    let href = `/workbench#${encodeURIComponent(action.focusId ?? `new-opportunity-${project.slug}`)}`;
    // Dedicated routes also support contribution claims, whose Workbench rendering is read-only.
    if (action.step === "REQUEST_VERIFICATION" && action.focusId?.startsWith("claim-")) {
      href = `/claims/${encodeURIComponent(action.focusId.slice(6))}/verify`;
    } else if (action.focusId?.startsWith("verification-request-")) {
      href = `/verifications/${encodeURIComponent(action.focusId.slice(21))}`;
    }
    const item: OperationalItem = {
      source: "WORKBENCH", sourceId: `${project.id}:${scope.opportunities[0]?.id ?? "project"}:${action.step}:${action.focusId}`,
      title: `${project.title}${scope.opportunities[0] ? ` · ${scope.opportunities[0].title}` : ""}`,
      action: action.step, description: `${action.title}. ${action.description} ${action.boundary}`,
      href, mode: project.stage === "PAUSED" ? "BLOCKED" : workbenchModes[action.step], observedState,
    };
    if (project.stage === "PAUSED") item.description = `Projeto pausado. ${item.description}`;
    items.push(item);
  }
  if (!project.opportunities.length) append(project, project.stage);
  for (const opportunity of project.opportunities) {
    const href = `/workbench#${encodeURIComponent(`opportunity-${opportunity.id}`)}`;
    if (!["DRAFT", "OPEN", "CLOSED"].includes(opportunity.state)) {
      items.push(blocked(opportunity.id, opportunity.state, href));
      continue;
    }
    const proposals = project.proposals.filter((p) => p.opportunityId === opportunity.id);
    const commitments = project.commitments.filter((c) => c.opportunityId === opportunity.id);
    // Closed opportunities do not solicit new work; existing commitments still have a trajectory.
    if (opportunity.state === "CLOSED" && !commitments.length) continue;
    const opportunityScope = { ...project, opportunities: [opportunity] };
    if (!proposals.length || opportunity.state === "DRAFT") {
      append(opportunityScope, opportunity.state);
      continue;
    }
    for (const proposal of proposals) {
      if (!["SUBMITTED", "REVISION_REQUESTED", "REJECTED", "ACCEPTED"].includes(proposal.state)) {
        items.push(blocked(proposal.id, proposal.state, `/workbench#${encodeURIComponent(`proposal-${proposal.id}`)}`));
        continue;
      }
      const matches = commitments.filter((c) => c.proposalId === proposal.id);
      if (opportunity.state === "CLOSED" && !matches.length) continue;
      const proposalScope = { ...opportunityScope, proposals: [proposal], commitments: matches };
      if (!matches.length) { append(proposalScope, `${opportunity.state} / ${proposal.state}`); continue; }
      for (const commitment of matches) {
        const contributions = project.contributions.filter((c) => c.commitmentId === commitment.id);
        const commitmentScope = { ...proposalScope, commitments: [commitment] };
        if (!contributions.length) { append(commitmentScope, proposal.state); continue; }
        for (const contribution of contributions) {
          const artifacts = project.artifacts.filter((a) => a.contributionId === contribution.id);
          const claims = project.claims.filter((c) =>
            (c.subjectType === "CONTRIBUTION" && c.subjectId === contribution.id) ||
            (c.subjectType === "ARTIFACT" && artifacts.some((a) => a.id === c.subjectId)));
          const contributionScope = { ...commitmentScope, contributions: [contribution] };
          if (!claims.length) { append(contributionScope, proposal.state); continue; }
          for (const claim of claims) {
            if (claim.state !== "RECORDED") {
              items.push(blocked(claim.id, claim.state, `/claims/${encodeURIComponent(claim.id)}`));
              continue;
            }
            const scope = { ...contributionScope, claims: [claim], artifacts: artifacts.filter((a) => a.id === claim.subjectId) };
            const requests = project.verificationRequests.filter((r) => r.claimId === claim.id);
            if (!requests.length) { append(scope, claim.state); continue; }
            for (const request of requests) {
              const href = `/verifications/${encodeURIComponent(request.id)}`;
              if (!["OPEN", "COMPLETED"].includes(request.state)) {
                items.push(blocked(request.id, request.state, href));
                continue;
              }
              const verification = project.verifications.find((v) => v.requestId === request.id);
              if (verification && !["PASS", "FAIL", "PARTIAL", "INCONCLUSIVE"].includes(verification.classification)) {
                items.push(blocked(verification.id, verification.classification, href));
                continue;
              }
              append({ ...scope, verificationRequests: [request] }, request.state);
            }
          }
        }
      }
    }
  }
  return Array.from(new Map(items.map((item) => [item.sourceId, item])).values());
}

export function composeCurrentOperation(cycles: readonly OperationCycle[], projects: readonly WorkbenchProject[]): OperationalItem[] {
  const items = [
    ...cycles.map(projectCompanyCoreOperation).filter((item): item is OperationalItem => item !== null),
    ...projects.flatMap(projectWorkbenchOperations),
  ];
  // Stable identifier order only, never importance or human direction.
  return items.sort((a, b) => {
    const left = `${a.source}:${a.sourceId}`;
    const right = `${b.source}:${b.sourceId}`;
    return left < right ? -1 : left > right ? 1 : 0;
  });
}
