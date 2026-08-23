import { describe, expect, it } from "vitest";
import type { WorkbenchProject } from "@/lib/data/workbench";
import {
  createHumanAssuranceView,
  ResultReturnValidationError,
  validateResultReturn,
} from "@/lib/domain/human-assurance";
import { createTaskCapsule } from "@/lib/domain/task-capsule";

function projectFixture(): WorkbenchProject {
  return {
    id: "project-1",
    slug: "celula-zero",
    title: "Célula Zero",
    stage: "ACTIVE",
    sourceLabel: "REAL",
    stewardActorId: "human-1",
    actors: [
      { id: "human-1", name: "Marcos", kind: "PERSON", operatorLabel: null, controlled: true, roles: ["PROJECT_STEWARD"] },
      { id: "agent-1", name: "Executor A", kind: "AI_AGENT", operatorLabel: "Operado por Marcos", controlled: true, roles: ["CONTRIBUTOR"] },
    ],
    opportunities: [{
      id: "opp-1", ownerActorId: "human-1", state: "OPEN", visibility: "PROJECT",
      currentVersion: 1, materialVersion: 1, capacity: 1, title: "Fechar retorno",
      statement: "Consumir o retorno do executor sem perder fronteiras epistemológicas.",
      conditions: "Sem promover autorrelato a verificação.", expectedResult: "Human Assurance determinística.",
      versions: [{ version: 1, title: "Fechar retorno", statement: "Consumir o retorno do executor sem perder fronteiras epistemológicas.", conditions: "Sem promover autorrelato a verificação.", expectedResult: "Human Assurance determinística." }],
    }],
    proposals: [{
      id: "proposal-1", opportunityId: "opp-1", proposerActorId: "agent-1", state: "ACCEPTED",
      currentVersion: 1, materialVersion: 1, statement: "Implementar assurance.", conditions: "Escopo limitado.",
      expectedDelivery: "Result Return funcional.", rewardExpectation: "Sem direito econômico.", createdAt: "2026-08-23T00:00:00.000Z",
      versions: [{ version: 1, statement: "Implementar assurance.", conditions: "Escopo limitado.", expectedDelivery: "Result Return funcional.", rewardExpectation: "Sem direito econômico." }],
    }],
    commitments: [{ id: "commitment-1", opportunityId: "opp-1", opportunityVersion: 1, proposalId: "proposal-1", proposalVersion: 1, proposerActorId: "agent-1", acceptedByActorId: "human-1", createdAt: "2026-08-23T00:01:00.000Z" }],
    contributions: [], artifacts: [], claims: [], evidenceItems: [], evidenceLinks: [], verificationRequests: [], verifications: [], events: [],
  };
}

function validResult(capsuleDigest: string) {
  return {
    schema: "cz.result-package.v1",
    taskCapsuleDigest: capsuleDigest,
    executor: { id: "agent-1", label: "Executor A" },
    status: "EXECUTED",
    whatHappened: "O executor reporta que implementou o retorno.",
    artifacts: [{ uri: "https://example.test/commit/abc", digest: "a".repeat(64), mediaType: "text/plain", description: "Commit reportado pelo executor." }],
    checksRun: [{ name: "tests", status: "PASS", details: "33/33" }],
    claims: [{ statement: "A interface foi implementada.", scope: "Somente existência da interface reportada." }],
    limitations: ["Utilidade real ainda não verificada."],
    unexpectedChanges: [],
    nextHumanDecision: "Decidir se deve solicitar verificação.",
    notDone: ["Nenhuma promoção canônica foi executada."],
  };
}

describe("cz.human-assurance.v1", () => {
  it("rejects malformed Result Packages", () => {
    const capsule = createTaskCapsule(projectFixture(), "commitment-1");
    expect(() => validateResultReturn({}, capsule)).toThrow(ResultReturnValidationError);
    try { validateResultReturn({}, capsule); } catch (error) { expect(error).toMatchObject({ code: "INVALID_RESULT_PACKAGE" }); }
  });

  it("rejects a Result Package from another Task Capsule", () => {
    const capsule = createTaskCapsule(projectFixture(), "commitment-1");
    expect(() => validateResultReturn(validResult("b".repeat(64)), capsule)).toThrow(/Task Capsule/);
  });

  it("rejects a different executor even when schema and digest are valid", () => {
    const capsule = createTaskCapsule(projectFixture(), "commitment-1");
    const result = { ...validResult(capsule.digest), executor: { id: "intruder", label: "Outro executor" } };
    expect(() => validateResultReturn(result, capsule)).toThrow(/executor autorizado/i);
  });

  it("projects a valid package deterministically", () => {
    const capsule = createTaskCapsule(projectFixture(), "commitment-1");
    const result = validResult(capsule.digest);
    const first = createHumanAssuranceView(result, capsule);
    const second = createHumanAssuranceView(result, capsule);
    expect(second).toEqual(first);
    expect(first.schema).toBe("cz.human-assurance.v1");
    expect(first.executionReport.provenance).toBe("REPORTED_BY_EXECUTOR");
  });

  it("keeps reported PASS separate from independent verification", () => {
    const capsule = createTaskCapsule(projectFixture(), "commitment-1");
    const view = createHumanAssuranceView(validResult(capsule.digest), capsule);
    expect(view.reportedChecks[0]?.status).toBe("PASS");
    expect(view.independentSignals).toEqual([]);
    expect(view.notVerified.join(" ")).toMatch(/não são Verification/i);
  });

  it("keeps claims, artifacts, Evidence and Outcome distinct", () => {
    const capsule = createTaskCapsule(projectFixture(), "commitment-1");
    const view = createHumanAssuranceView(validResult(capsule.digest), capsule);
    expect(view.reportedClaims).toHaveLength(1);
    expect(view.reportedArtifacts).toHaveLength(1);
    expect(view.notVerified.join(" ")).toMatch(/Claims reportados não são Evidence/i);
    expect(view.notVerified.join(" ")).toMatch(/não demonstram Outcome/i);
  });

  it("preserves declared limitations and not-done work as first-class fields", () => {
    const capsule = createTaskCapsule(projectFixture(), "commitment-1");
    const view = createHumanAssuranceView(validResult(capsule.digest), capsule);
    expect(view.declaredLimitations).toEqual(["Utilidade real ainda não verificada."]);
    expect(view.reportedNotDone).toEqual(["Nenhuma promoção canônica foi executada."]);
    expect(view.nextHumanDecision.provenance).toBe("REPORTED_BY_EXECUTOR");
  });
});
