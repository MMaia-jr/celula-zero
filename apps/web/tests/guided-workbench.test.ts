import { describe, expect, it } from "vitest";
import type { WorkbenchProject } from "@/lib/data/workbench";
import { deriveGuidedWorkbenchAction } from "@/lib/domain/guided-workbench";

function projectFixture(): WorkbenchProject {
  return {
    id: "project-1",
    slug: "celula-zero",
    title: "Célula Zero",
    stage: "ACTIVE",
    sourceLabel: "REAL",
    stewardActorId: "human-1",
    actors: [
      {
        id: "human-1",
        name: "Marcos",
        kind: "PERSON",
        operatorLabel: null,
        controlled: true,
        roles: ["PROJECT_STEWARD"],
      },
      {
        id: "agent-1",
        name: "Executor",
        kind: "AI_AGENT",
        operatorLabel: "Operado por Marcos",
        controlled: true,
        roles: ["CONTRIBUTOR"],
      },
    ],
    opportunities: [],
    proposals: [],
    commitments: [],
    contributions: [],
    artifacts: [],
    claims: [],
    evidenceItems: [],
    evidenceLinks: [],
    verificationRequests: [],
    verifications: [],
    events: [],
  };
}

function addOpenOpportunity(project: WorkbenchProject) {
  project.opportunities.push({
    id: "opp-1",
    ownerActorId: "human-1",
    state: "OPEN",
    visibility: "PROJECT",
    currentVersion: 1,
    materialVersion: 1,
    capacity: 1,
    title: "Evoluir a Célula Zero",
    statement: "Reduzir o fundador como middleware operacional.",
    conditions: "Orçamento incremental R$ 0.",
    expectedResult: "Uma capacidade funcional dentro do workbench.",
  });
}

function addAcceptedCommitment(project: WorkbenchProject) {
  project.proposals.push({
    id: "proposal-1",
    opportunityId: "opp-1",
    proposerActorId: "agent-1",
    state: "ACCEPTED",
    currentVersion: 1,
    materialVersion: 1,
    statement: "Implementar o menor paved road suficiente.",
    conditions: "Sem ampliar autoridade.",
    expectedDelivery: "Mudança funcional validada.",
    rewardExpectation: "Sem direito econômico.",
    createdAt: "2026-08-23T00:00:00.000Z",
  });
  project.commitments.push({
    id: "commitment-1",
    opportunityId: "opp-1",
    opportunityVersion: 1,
    proposalId: "proposal-1",
    proposalVersion: 1,
    proposerActorId: "agent-1",
    acceptedByActorId: "human-1",
    createdAt: "2026-08-23T00:01:00.000Z",
  });
}

function addExecutionChain(project: WorkbenchProject) {
  project.contributions.push({
    id: "contribution-1",
    commitmentId: "commitment-1",
    authorActorId: "agent-1",
    description: "Mudança funcional executada.",
    limitations: "Ainda não verificada.",
    submittedAt: "2026-08-23T00:02:00.000Z",
  });
  project.artifacts.push({
    id: "artifact-1",
    contributionId: "contribution-1",
    createdByActorId: "agent-1",
    kind: "CODE",
    uri: "git:working-tree",
    digest: "a".repeat(64),
    mediaType: "text/plain",
    sizeBytes: 123,
    retentionClass: "PROJECT_LIFETIME",
    createdAt: "2026-08-23T00:03:00.000Z",
  });
  project.claims.push({
    id: "claim-1",
    subjectType: "ARTIFACT",
    subjectId: "artifact-1",
    authorActorId: "agent-1",
    statement: "O artefato implementa o guided paved road.",
    scopeDescription: "Somente comportamento do workbench.",
    state: "RECORDED",
    createdAt: "2026-08-23T00:04:00.000Z",
  });
  project.evidenceItems.push({
    id: "evidence-1",
    sourceArtifactId: "artifact-1",
    custodianActorId: "agent-1",
    description: "Artefato usado como evidência documental.",
    limitations: "Não prova utilidade externa.",
    digest: "b".repeat(64),
    state: "DOCUMENTED",
    createdAt: "2026-08-23T00:05:00.000Z",
  });
  project.evidenceLinks.push({
    id: "evidence-link-1",
    evidenceItemId: "evidence-1",
    claimId: "claim-1",
    relation: "SUPPORTS",
    declaredByActorId: "agent-1",
  });
}

describe("guided workbench paved road", () => {
  it("starts from the next intention when no work is open", () => {
    const action = deriveGuidedWorkbenchAction(projectFixture());
    expect(action.step).toBe("START_INTENTION");
    expect(action.focusId).toBe("new-opportunity-celula-zero");
  });

  it("asks for an attributable proposal when an Opportunity is open", () => {
    const project = projectFixture();
    addOpenOpportunity(project);
    const action = deriveGuidedWorkbenchAction(project);
    expect(action.step).toBe("SUBMIT_PROPOSAL");
    expect(action.boundary).toMatch(/não existe Commitment/i);
  });

  it("does not hide the execution boundary after human acceptance", () => {
    const project = projectFixture();
    addOpenOpportunity(project);
    addAcceptedCommitment(project);
    const action = deriveGuidedWorkbenchAction(project);
    expect(action.step).toBe("EXECUTE_COMMITMENT");
    expect(action.commitmentId).toBe("commitment-1");
    expect(action.boundary).toMatch(/não significa.*EXECUTED.*VERIFIED/i);
  });

  it("keeps an accepted Commitment actionable after its Opportunity closes at capacity", () => {
    const project = projectFixture();
    addOpenOpportunity(project);
    addAcceptedCommitment(project);
    project.opportunities[0]!.state = "CLOSED";

    const action = deriveGuidedWorkbenchAction(project);

    expect(action.step).toBe("EXECUTE_COMMITMENT");
    expect(action.commitmentId).toBe("commitment-1");
  });

  it("starts a new intention when a CLOSED Opportunity has no accepted Commitment trajectory", () => {
    const project = projectFixture();
    addOpenOpportunity(project);
    project.opportunities[0]!.state = "CLOSED";

    const action = deriveGuidedWorkbenchAction(project);

    expect(action.step).toBe("START_INTENTION");
    expect(action.focusId).toBe("new-opportunity-celula-zero");
    expect(action.boundary).toMatch(/não apaga Commitments já aceitos/i);
  });

  it("moves from executed Contribution toward observable Artifact", () => {
    const project = projectFixture();
    addOpenOpportunity(project);
    addAcceptedCommitment(project);
    project.contributions.push({
      id: "contribution-1",
      commitmentId: "commitment-1",
      authorActorId: "agent-1",
      description: "Mudança funcional executada.",
      limitations: "Ainda não verificada.",
      submittedAt: "2026-08-23T00:02:00.000Z",
    });
    const action = deriveGuidedWorkbenchAction(project);
    expect(action.step).toBe("ATTACH_ARTIFACT");
  });

  it("requires the registered Verification instead of inferring PASS from Evidence", () => {
    const project = projectFixture();
    addOpenOpportunity(project);
    addAcceptedCommitment(project);
    addExecutionChain(project);
    project.verificationRequests.push({
      id: "request-1",
      claimId: "claim-1",
      requesterActorId: "human-1",
      reviewerActorId: "human-1",
      criteria: "Revisar o artefato contra o escopo.",
      expectedMethod: "manual-review",
      conflictCodes: ["SAME_OPERATOR"],
      independence: "NON_INDEPENDENT",
      state: "OPEN",
      createdAt: "2026-08-23T00:06:00.000Z",
    });
    const action = deriveGuidedWorkbenchAction(project);
    expect(action.step).toBe("ISSUE_VERIFICATION");
  });

  it("returns to a human decision after Verification without claiming Outcome", () => {
    const project = projectFixture();
    addOpenOpportunity(project);
    addAcceptedCommitment(project);
    addExecutionChain(project);
    project.verificationRequests.push({
      id: "request-1",
      claimId: "claim-1",
      requesterActorId: "human-1",
      reviewerActorId: "human-1",
      criteria: "Revisar o artefato contra o escopo.",
      expectedMethod: "manual-review",
      conflictCodes: ["SAME_OPERATOR"],
      independence: "NON_INDEPENDENT",
      state: "COMPLETED",
      createdAt: "2026-08-23T00:06:00.000Z",
    });
    project.verifications.push({
      id: "verification-1",
      requestId: "request-1",
      claimId: "claim-1",
      verifierActorId: "human-1",
      method: "manual-review",
      findings: "Critério técnico atendido.",
      classification: "PASS",
      limitations: "Revisão interna.",
      conflictCodes: ["SAME_OPERATOR"],
      independence: "NON_INDEPENDENT",
      createdAt: "2026-08-23T00:07:00.000Z",
    });
    const action = deriveGuidedWorkbenchAction(project);
    expect(action.step).toBe("HUMAN_DECISION");
    expect(action.title).toContain("PASS");
    expect(action.boundary).toMatch(/PASS ≠ Outcome/);
  });
});
