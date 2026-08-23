import { describe, expect, it } from "vitest";
import type { WorkbenchProject } from "@/lib/data/workbench";
import {
  operatingLoopToMarkdown,
  toPortableOperatingLoop,
} from "@/lib/domain/export-operating-loop";

const fullProject: WorkbenchProject = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "operating-loop-test",
  title: "Operating Loop Test",
  stage: "ACTIVE",
  sourceLabel: "PILOT",
  stewardActorId: "20000000-0000-4000-8000-000000000001",
  actors: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      name: "Pilot",
      kind: "PERSON",
      operatorLabel: null,
      controlled: true,
      roles: ["PROJECT_STEWARD"],
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      name: "Executor IA",
      kind: "AI_AGENT",
      operatorLabel: "Operado pelo Pilot",
      controlled: true,
      roles: ["CONTRIBUTOR"],
    },
  ],
  opportunities: [
    {
      id: "30000000-0000-4000-8000-000000000001",
      ownerActorId: "20000000-0000-4000-8000-000000000001",
      state: "CLOSED",
      visibility: "PUBLIC",
      currentVersion: 1,
      materialVersion: 3,
      capacity: 1,
      title: "Executar o Operating Loop",
      statement: "Conduzir uma tarefa real no fluxo operacional.",
      conditions: "Autoridade explícita e sem direitos econômicos.",
      expectedResult: "Um ciclo atribuível e verificável.",
      versions: [
        {
          version: 1,
          title: "Executar o Operating Loop",
          statement: "Conduzir uma tarefa real no fluxo operacional.",
          conditions: "Autoridade explícita e sem direitos econômicos.",
          expectedResult: "Um ciclo atribuível e verificável.",
        },
      ],
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      ownerActorId: "20000000-0000-4000-8000-000000000001",
      state: "OPEN",
      visibility: "PROJECT",
      currentVersion: 1,
      materialVersion: 1,
      capacity: 1,
      title: "Proposta sem commitment",
      statement: "Cobrir o caminho em que uma proposta ainda não foi aceita.",
      conditions: "Sem aceitação antecipada.",
      expectedResult: "Proposal permanece sem commitment.",
    },
  ],
  proposals: [
    {
      id: "40000000-0000-4000-8000-000000000001",
      opportunityId: "30000000-0000-4000-8000-000000000001",
      proposerActorId: "20000000-0000-4000-8000-000000000002",
      state: "ACCEPTED",
      currentVersion: 1,
      materialVersion: 2,
      statement: "Executar a oportunidade sob atribuição explícita.",
      conditions: "Escopo limitado.",
      expectedDelivery: "Entrega identificável.",
      rewardExpectation: "Sem direito econômico.",
      createdAt: "2026-08-22T23:00:00.000Z",
      versions: [
        {
          version: 1,
          statement: "Executar a oportunidade sob atribuição explícita.",
          conditions: "Escopo limitado.",
          expectedDelivery: "Entrega identificável.",
          rewardExpectation: "Sem direito econômico.",
        },
      ],
    },
    {
      id: "40000000-0000-4000-8000-000000000002",
      opportunityId: "30000000-0000-4000-8000-000000000002",
      proposerActorId: "20000000-0000-4000-8000-000000000002",
      state: "SUBMITTED",
      currentVersion: 1,
      materialVersion: 1,
      statement: "Proposta ainda não aceita.",
      conditions: "Aguardar decisão humana.",
      expectedDelivery: "Nenhuma entrega ainda.",
      rewardExpectation: "Sem direito econômico.",
      createdAt: "2026-08-22T23:01:00.000Z",
    },
  ],
  commitments: [
    {
      id: "50000000-0000-4000-8000-000000000001",
      opportunityId: "30000000-0000-4000-8000-000000000001",
      opportunityVersion: 1,
      proposalId: "40000000-0000-4000-8000-000000000001",
      proposalVersion: 1,
      proposerActorId: "20000000-0000-4000-8000-000000000002",
      acceptedByActorId: "20000000-0000-4000-8000-000000000001",
      createdAt: "2026-08-22T23:02:00.000Z",
    },
  ],
  contributions: [
    {
      id: "60000000-0000-4000-8000-000000000001",
      commitmentId: "50000000-0000-4000-8000-000000000001",
      authorActorId: "20000000-0000-4000-8000-000000000002",
      description: "Implementação executada localmente.",
      limitations: "Ainda não canônica.",
      submittedAt: "2026-08-22T23:03:00.000Z",
    },
  ],
  artifacts: [
    {
      id: "70000000-0000-4000-8000-000000000001",
      contributionId: "60000000-0000-4000-8000-000000000001",
      createdByActorId: "20000000-0000-4000-8000-000000000002",
      kind: "PACKAGE",
      uri: "urn:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      digest: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      mediaType: "application/zip",
      sizeBytes: 27730,
      retentionClass: "EXTERNAL_REFERENCE",
      createdAt: "2026-08-22T23:04:00.000Z",
    },
  ],
  claims: [
    {
      id: "80000000-0000-4000-8000-000000000001",
      subjectType: "ARTIFACT",
      subjectId: "70000000-0000-4000-8000-000000000001",
      authorActorId: "20000000-0000-4000-8000-000000000002",
      statement: "O artifact identifica o bundle usado no ciclo.",
      scopeDescription: "Somente identidade e integridade do bundle.",
      state: "RECORDED",
      createdAt: "2026-08-22T23:05:00.000Z",
    },
  ],
  evidenceItems: [
    {
      id: "90000000-0000-4000-8000-000000000001",
      sourceArtifactId: "70000000-0000-4000-8000-000000000001",
      custodianActorId: "20000000-0000-4000-8000-000000000002",
      description: "Bundle content-addressed pelo digest.",
      limitations: "Não prova merge ou adoção.",
      digest: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      state: "DOCUMENTED",
      createdAt: "2026-08-22T23:06:00.000Z",
    },
  ],
  evidenceLinks: [
    {
      id: "91000000-0000-4000-8000-000000000001",
      evidenceItemId: "90000000-0000-4000-8000-000000000001",
      claimId: "80000000-0000-4000-8000-000000000001",
      relation: "SUPPORTS",
      declaredByActorId: "20000000-0000-4000-8000-000000000002",
    },
    {
      id: "91000000-0000-4000-8000-000000000002",
      evidenceItemId: "90000000-0000-4000-8000-000000000099",
      claimId: "80000000-0000-4000-8000-000000000001",
      relation: "CONTEXTUALIZES",
      declaredByActorId: "20000000-0000-4000-8000-000000000002",
    },
  ],
  verificationRequests: [
    {
      id: "a0000000-0000-4000-8000-000000000001",
      claimId: "80000000-0000-4000-8000-000000000001",
      requesterActorId: "20000000-0000-4000-8000-000000000001",
      reviewerActorId: "20000000-0000-4000-8000-000000000001",
      criteria: "Verificar identidade e integridade no escopo declarado.",
      expectedMethod: "manual-review",
      conflictCodes: ["SAME_OPERATOR"],
      independence: "NON_INDEPENDENT",
      state: "COMPLETED",
      createdAt: "2026-08-22T23:07:00.000Z",
    },
    {
      id: "a0000000-0000-4000-8000-000000000002",
      claimId: "80000000-0000-4000-8000-000000000001",
      requesterActorId: "20000000-0000-4000-8000-000000000001",
      reviewerActorId: "20000000-0000-4000-8000-000000000001",
      criteria: "Pedido ainda aberto para cobrir ausência de verification.",
      expectedMethod: "manual-review",
      conflictCodes: [],
      independence: "INDEPENDENT",
      state: "OPEN",
      createdAt: "2026-08-22T23:08:00.000Z",
    },
  ],
  verifications: [
    {
      id: "b0000000-0000-4000-8000-000000000001",
      requestId: "a0000000-0000-4000-8000-000000000001",
      claimId: "80000000-0000-4000-8000-000000000001",
      verifierActorId: "20000000-0000-4000-8000-000000000001",
      method: "manual-review",
      findings: "Digest e metadata são consistentes com o claim estreito.",
      classification: "PASS",
      limitations: "Revisão interna; não prova outcome.",
      conflictCodes: ["SAME_OPERATOR"],
      independence: "NON_INDEPENDENT",
      createdAt: "2026-08-22T23:09:00.000Z",
    },
  ],
  events: [
    {
      id: "c0000000-0000-4000-8000-000000000001",
      eventType: "CONTRIBUTION_SUBMITTED",
      aggregateType: "CONTRIBUTION",
      aggregateId: "60000000-0000-4000-8000-000000000001",
      actorId: "20000000-0000-4000-8000-000000000002",
      authorizedByActorId: "20000000-0000-4000-8000-000000000002",
      occurredAt: "2026-08-22T23:03:00.000Z",
      materialVersionBefore: null,
      materialVersionAfter: 1,
      payload: {},
      canonicalDigest: "digest-event-1",
    },
    {
      id: "c0000000-0000-4000-8000-000000000002",
      eventType: "UNKNOWN_ACTOR_EVENT",
      aggregateType: "PROJECT",
      aggregateId: "10000000-0000-4000-8000-000000000001",
      actorId: "20000000-0000-4000-8000-000000000099",
      authorizedByActorId: "20000000-0000-4000-8000-000000000001",
      occurredAt: "2026-08-22T23:10:00.000Z",
      materialVersionBefore: 1,
      materialVersionAfter: 2,
      payload: {},
      canonicalDigest: "digest-event-2",
    },
  ],
};

describe("operating loop portable export", () => {
  it("exports the complete structured cycle without inventing outcome or rights", () => {
    const exported = toPortableOperatingLoop(
      fullProject,
      "2026-08-22T23:11:00.000Z",
    );

    expect(exported.schema).toBe("cz.operating-loop.v1");
    expect(exported.project.title).toBe("Operating Loop Test");
    expect(exported.actors).toHaveLength(2);
    expect(exported.opportunities).toHaveLength(2);
    expect(exported.proposals).toHaveLength(2);
    expect(exported.opportunities[0]).not.toHaveProperty("versions");
    expect(exported.proposals[0]).not.toHaveProperty("versions");
    expect(exported.commitments).toHaveLength(1);
    expect(exported.contributions).toHaveLength(1);
    expect(exported.artifacts[0]?.digest).toMatch(/^a{64}$/);
    expect(exported.claims).toHaveLength(1);
    expect(exported.evidenceItems).toHaveLength(1);
    expect(exported.evidenceLinks).toHaveLength(2);
    expect(exported.verificationRequests).toHaveLength(2);
    expect(exported.verifications[0]?.classification).toBe("PASS");
    expect(exported.trajectory).toHaveLength(2);
    expect(exported.notices.join(" ")).toContain("Verification não cria outcome");
  });

  it("renders a full Markdown trajectory and preserves attribution and limits", () => {
    const markdown = operatingLoopToMarkdown(
      fullProject,
      "2026-08-22T23:11:00.000Z",
    );

    expect(markdown).toContain("# Operating Loop Test — Operating Loop");
    expect(markdown).toContain("### Pilot");
    expect(markdown).toContain("### Executor IA");
    expect(markdown).toContain("- operador: Operado pelo Pilot");
    expect(markdown).toContain("### Opportunity — Executar o Operating Loop");
    expect(markdown).toContain("#### Proposal — ACCEPTED");
    expect(markdown).toContain("#### Commitment");
    expect(markdown).toContain("#### Contribution");
    expect(markdown).toContain("##### Artifact");
    expect(markdown).toContain("##### Claim");
    expect(markdown).toContain("##### Evidence");
    expect(markdown).toContain("##### Verification Request");
    expect(markdown).toContain("##### Verification — PASS");
    expect(markdown).toContain("- conflitos: SAME_OPERATOR");
    expect(markdown).toContain("- conflitos: nenhum");
    expect(markdown).toContain("UNKNOWN_ACTOR_EVENT");
    expect(markdown).toContain("20000000-0000-4000-8000-000000000099");
    expect(markdown).toContain(
      "Verification não cria Outcome, reputação, adoção ou verdade universal.",
    );
  });

  it("renders an empty cycle without requiring actors or operational objects", () => {
    const emptyProject: WorkbenchProject = {
      ...fullProject,
      title: "Projeto vazio",
      stewardActorId: "20000000-0000-4000-8000-000000000099",
      actors: [],
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

    const markdown = operatingLoopToMarkdown(
      emptyProject,
      "2026-08-22T23:12:00.000Z",
    );

    expect(markdown).toContain("# Projeto vazio — Operating Loop");
    expect(markdown).toContain(
      "- steward: 20000000-0000-4000-8000-000000000099",
    );
    expect(markdown).toContain("## Trajetória operacional");
    expect(markdown).toContain("## Avisos");
  });
});
