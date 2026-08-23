import { describe, expect, it } from "vitest";
import type { WorkbenchProject } from "@/lib/data/workbench";
import {
  createTaskCapsule,
  taskCapsuleToMarkdown,
} from "@/lib/domain/task-capsule";

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
        name: "Executor A",
        kind: "AI_AGENT",
        operatorLabel: "Operado por Marcos",
        controlled: true,
        roles: ["CONTRIBUTOR"],
      },
    ],
    opportunities: [
      {
        id: "opp-1",
        ownerActorId: "human-1",
        state: "OPEN",
        visibility: "PROJECT",
        currentVersion: 2,
        materialVersion: 2,
        capacity: 1,
        title: "Versão atual posterior",
        statement: "Conteúdo atual posterior ao aceite.",
        conditions: "Condição atual.",
        expectedResult: "Resultado atual.",
        versions: [
          {
            version: 1,
            title: "Criar fronteira de execução",
            statement: "Gerar uma tarefa autocontida a partir do estado persistido.",
            conditions: "Sem ampliar autoridade.",
            expectedResult: "Um executor recebe contexto suficiente sem reconstrução manual.",
          },
          {
            version: 2,
            title: "Versão atual posterior",
            statement: "Conteúdo atual posterior ao aceite.",
            conditions: "Condição atual.",
            expectedResult: "Resultado atual.",
          },
        ],
      },
    ],
    proposals: [
      {
        id: "proposal-1",
        opportunityId: "opp-1",
        proposerActorId: "agent-1",
        state: "ACCEPTED",
        currentVersion: 2,
        materialVersion: 2,
        statement: "Proposta atual posterior.",
        conditions: "Condições atuais.",
        expectedDelivery: "Entrega atual.",
        rewardExpectation: "Sem direito econômico.",
        createdAt: "2026-08-23T00:00:00.000Z",
        versions: [
          {
            version: 1,
            statement: "Implementar a projeção portátil.",
            conditions: "Escopo limitado ao Task Capsule.",
            expectedDelivery: "Task Capsule Markdown e JSON.",
            rewardExpectation: "Sem direito econômico.",
          },
          {
            version: 2,
            statement: "Proposta atual posterior.",
            conditions: "Condições atuais.",
            expectedDelivery: "Entrega atual.",
            rewardExpectation: "Sem direito econômico.",
          },
        ],
      },
    ],
    commitments: [
      {
        id: "commitment-1",
        opportunityId: "opp-1",
        opportunityVersion: 1,
        proposalId: "proposal-1",
        proposalVersion: 1,
        proposerActorId: "agent-1",
        acceptedByActorId: "human-1",
        createdAt: "2026-08-23T00:01:00.000Z",
      },
    ],
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

describe("cz.task-capsule.v1", () => {
  it("is stable for the same frozen commitment", () => {
    const first = createTaskCapsule(projectFixture(), "commitment-1");
    const second = createTaskCapsule(projectFixture(), "commitment-1");
    expect(second.packetId).toBe(first.packetId);
    expect(second.digest).toBe(first.digest);
  });

  it("uses frozen accepted versions rather than later current versions", () => {
    const capsule = createTaskCapsule(projectFixture(), "commitment-1");
    expect(capsule.task.opportunity.version).toBe(1);
    expect(capsule.task.opportunity.title).toBe("Criar fronteira de execução");
    expect(capsule.task.proposal.version).toBe(1);
    expect(capsule.task.proposal.expectedDelivery).toBe("Task Capsule Markdown e JSON.");
  });

  it("changes digest when frozen task semantics change", () => {
    const project = projectFixture();
    const first = createTaskCapsule(project, "commitment-1");
    const versions = project.opportunities[0]!.versions;
    if (!versions?.[0]) {
      throw new Error("Fixture sem versão congelada para o teste.");
    }
    versions[0].expectedResult = "Resultado semanticamente diferente.";
    const second = createTaskCapsule(project, "commitment-1");
    expect(second.digest).not.toBe(first.digest);
  });

  it("contains authority, STOP gates and result contract", () => {
    const capsule = createTaskCapsule(projectFixture(), "commitment-1");
    expect(capsule.authority.createsNewAuthority).toBe(false);
    expect(capsule.executionBoundary.stopConditions.length).toBeGreaterThan(0);
    expect(capsule.resultContract.schema).toBe("cz.result-package.v1");
    expect(capsule.references.operatingLoopSchema).toBe("cz.operating-loop.v1");
  });

  it("does not fabricate a committed task without a Commitment", () => {
    expect(() =>
      createTaskCapsule(projectFixture(), "missing-commitment"),
    ).toThrow(/Commitment .* não encontrado/);
  });

  it("Markdown and JSON carry the same semantic identity", () => {
    const capsule = createTaskCapsule(projectFixture(), "commitment-1");
    const markdown = taskCapsuleToMarkdown(capsule);
    expect(markdown).toContain(capsule.packetId);
    expect(markdown).toContain(capsule.digest);
    expect(markdown).toContain(capsule.task.opportunity.title);
    expect(markdown).toContain(capsule.resultContract.schema);
  });
});
