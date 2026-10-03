// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { applyCommand, hasInstitutionalState, seedFoundation } from "../lib/foundation";
import { applyMetabolismAction, recordWorkContribution } from "../lib/metabolism";
import { createTaskCapsule } from "../../web/lib/domain/task-capsule";
import { parseResultPackage } from "../../web/lib/domain/result-package";
import type { PersonId } from "@cz/identity";

const now = "2026-10-02T12:00:00.000Z";
const id = () => randomUUID();

describe("historical CZ metabolism composed in the local Habitat", () => {
  it("keeps intention, project, opportunity, proposal, commitment, decision and contribution distinct", () => {
    const initial = seedFoundation(id, now);
    const actor = initial.person.id;
    const withIntention = applyCommand(initial, actor, { type: "intention", content: "Quero transformar esta pesquisa em uma experiência útil." }, "intent-request-0001", id, now);
    const original = withIntention.records.at(-1)!;
    const projectAction = { type: "project_create" as const, sourceRecordId: original.id, title: "Experiência de pesquisa", requestKey: "project-request-001" };
    const projectState = applyMetabolismAction(withIntention, actor, projectAction, id, now);
    const project = projectState.projects![0]!;
    expect(project.events[0]?.payload.sourceRecordId).toBe(original.id);
    expect(projectState.records.find((record) => record.id === original.id)).toEqual(original);
    expect(applyMetabolismAction(projectState, actor, projectAction, id, now)).toBe(projectState);

    const opportunityState = applyMetabolismAction(projectState, actor, { type: "opportunity_open", projectId: project.id, title: "Prototipar uma etapa", statement: "Tornar a pesquisa acionável.", conditions: "Sem custo ou publicação externa.", expectedResult: "Um protótipo local revisável.", requestKey: "opportunity-request-01" }, id, now);
    const opportunity = opportunityState.projects![0]!.opportunities[0]!;
    expect(opportunity.state).toBe("OPEN");
    expect(opportunity.expectedResult).toBe("Um protótipo local revisável.");

    const proposalState = applyMetabolismAction(opportunityState, actor, { type: "proposal_submit", projectId: project.id, opportunityId: opportunity.id, statement: "Implementar uma primeira etapa pequena.", conditions: "Somente arquivos locais autorizados.", expectedDelivery: "Etapa local validável.", requestKey: "proposal-request-001" }, id, now);
    const proposal = proposalState.projects![0]!.proposals[0]!;
    expect(proposal.state).toBe("SUBMITTED");
    expect(proposal.rewardExpectation).toContain("Sem obrigação econômica");
    expect(proposalState.projects![0]!.commitments).toHaveLength(0);

    const accepted = applyMetabolismAction(proposalState, actor, { type: "proposal_decide", projectId: project.id, proposalId: proposal.id, disposition: "accept", requestKey: "decision-request-001" }, id, now);
    const acceptedProject = accepted.projects![0]!;
    const commitment = acceptedProject.commitments[0]!;
    const work = accepted.workItems!.find((item) => item.commitmentId === commitment.id)!;
    if (!hasInstitutionalState(accepted)) throw new Error("Test setup did not produce institutional state");
    expect(commitment).toMatchObject({ opportunityVersion: 1, proposalVersion: 1, acceptedByActorId: actor });
    expect(work.title).toBe("Etapa local validável.");
    expect(accepted.records.some((record) => record.kind === "Decision" && record.content.includes("nenhum direito econômico"))).toBe(true);
    expect(acceptedProject.events.at(-1)?.payload.economicStatus).toBe("NO_ECONOMIC_OBLIGATION_AUTHORIZED");
    const agreementAction = { type: "agreement_define" as const, projectId: acceptedProject.id, commitmentId: commitment.id, scope: "Somente a entrega aceita.", exclusions: "Nenhuma publicação ou alteração externa.", dependencies: "Revisão do resultado pelo Steward.", evaluationCriterion: "A entrega atende ao resultado esperado e respeita as condições congeladas.", requestKey: "agreement-request-001" };
    const agreed = applyMetabolismAction(accepted, actor, agreementAction, id, now);
    if (!hasInstitutionalState(agreed)) throw new Error("Test setup did not produce institutional state after Agreement.");
    expect(agreed.agreements?.[0]).toMatchObject({ commitmentId: commitment.id, expectedResult: "Um protótipo local revisável.", budgetBoundary: "NO_AUTOMATED_FUND_MOVEMENT", economicMode: "NONE", version: 1 });
    expect(agreed.records.some((record) => record.kind === "OriginalRecord" && record.purpose === "agreement" && record.content.includes("NO_AUTOMATED_FUND_MOVEMENT"))).toBe(true);
    expect(agreed.projects![0]!.commitments).toEqual(acceptedProject.commitments);
    expect(applyMetabolismAction(agreed, actor, agreementAction, id, now)).toBe(agreed);
    const agreement = agreed.agreements![0]!;
    const economicAction = { type: "agreement_economic_status" as const, projectId: acceptedProject.id, agreementId: agreement.id, mode: "OBLIGATION_DEFINED" as const, payerRole: "Patrocinador", payeeRole: "Célula Zero", obligationCondition: "Somente após aceite humano da entrega.", amount: "125.00", currency: "BRL", settlementReference: "", requestKey: "economic-status-0001" };
    const obligation = applyMetabolismAction(agreed, actor, economicAction, id, now);
    expect(obligation.agreements?.[0]).toMatchObject({ economicMode: "OBLIGATION_DEFINED", economicTerms: { payerRole: "Patrocinador", payeeRole: "Célula Zero", amount: "125.00", currency: "BRL", source: "HUMAN_SUPPLIED" } });
    expect(obligation.records.some((record) => record.kind === "OriginalRecord" && record.purpose === "economic_status" && record.content.includes("nenhum fundo foi movimentado"))).toBe(true);
    expect(() => applyMetabolismAction(agreed, actor, { ...economicAction, mode: "SETTLED" }, id, now)).toThrow("ECONOMIC_STATUS_TRANSITION_INVALID");
    const pending = applyMetabolismAction(obligation, actor, { ...economicAction, mode: "SETTLEMENT_PENDING", requestKey: "economic-status-0002" }, id, now);
    const settled = applyMetabolismAction(pending, actor, { ...economicAction, mode: "SETTLED", settlementReference: "human-supplied-reference", requestKey: "economic-status-0003" }, id, now);
    expect(settled.agreements?.[0]).toMatchObject({ economicMode: "SETTLED", settlementReference: "human-supplied-reference" });
    expect(settled.records.at(-1)).toMatchObject({ kind: "OriginalRecord", purpose: "economic_status" });

    const committedWork = accepted.workItems!.find((item) => item.commitmentId === commitment.id)!;
    const capsule = createTaskCapsule(acceptedProject, commitment.id);
    const deltaDigest = "b".repeat(64);
    const resultDigest = "c".repeat(64);
    const executionJobId = id();
    const resultPackage = parseResultPackage({
      schema: "cz.result-package.v1", taskCapsuleDigest: capsule.digest,
      executor: { id: "executor:codex-cli", label: "Codex CLI via CZ Execution Fabric" },
      status: "EXECUTED", whatHappened: "Uma mudança delimitada foi produzida numa cópia limpa.",
      artifacts: [{ uri: `urn:sha256:${deltaDigest}`, digest: deltaDigest, mediaType: "application/vnd.cz.execution-delta+json", description: "Delta isolado." }],
      checksRun: [{ name: "npm run check:vnext", status: "PASS" }],
      claims: [{ statement: "Codex reportou a conclusão.", scope: "Task Capsule; não é verificação independente." }],
      limitations: ["Resultado do executor não equivale a decisão humana."], unexpectedChanges: [],
      nextHumanDecision: "Avaliar se a entrega atende ao Commitment.", notDone: ["Sem Git promotion."],
    }, capsule.digest);
    const executionReady = {
      ...agreed,
      executionJobs: [{
        id: executionJobId, workItemId: committedWork.id, projectId: acceptedProject.id, commitmentId: commitment.id,
        requestKey: "execution-request-001", requestedByActorId: actor, taskCapsuleDigest: capsule.digest,
        agreementId: agreed.agreements![0]!.id, agreementDigest: createHash("sha256").update(JSON.stringify(agreed.agreements![0]!)).digest("hex"),
        canonicalBase: "50b4917593b0979d5c218c725038bf89afb1134f", allowedPaths: ["apps/cz-web/lib/example.ts"],
        validations: [["npm", "run", "check:vnext"]], status: "COMPLETED" as const, startedAt: now, completedAt: now,
        resultPackage, resultDigest, deltaDigest, fabric: { classification: "COMPLETED", scopeStatus: "WITHIN_SCOPE", changedPaths: ["apps/cz-web/lib/example.ts"], validations: [{ argv: ["npm", "run", "check:vnext"], exitCode: 0 }] },
      }],
    };
    expect(() => applyCommand(executionReady, actor, { type: "work_complete", workItemId: committedWork.id, result: "Entrega revisada por Marcos.", learning: "", executionJobId: "forged-job-id" }, "complete-forged-execution-0001", id, now)).toThrow("EXECUTION_RESULT_NOT_FOUND");
    const humanAcceptedExecution = applyCommand(executionReady, actor, { type: "work_complete", workItemId: committedWork.id, result: "Revisei o delta e aceito esta entrega sob o Commitment.", learning: "A cópia isolada preservou o Habitat.", executionJobId }, "complete-real-execution-001", id, now);
    const executionContribution = recordWorkContribution(humanAcceptedExecution, actor, committedWork.id, id, now);
    const executionProject = executionContribution.projects!.find((item) => item.id === acceptedProject.id)!;
    expect(executionProject.contributions).toHaveLength(1);
    expect(executionProject.artifacts).toMatchObject([{ contributionId: executionProject.contributions[0]!.id, uri: `urn:sha256:${deltaDigest}`, digest: deltaDigest, createdByActorId: "executor:codex-cli" }]);
    expect(executionProject.events.some((item) => item.eventType === "ARTIFACT_RECORDED_FROM_EXECUTION_RESULT" && item.actorId === "executor:codex-cli" && item.authorizedByActorId === actor)).toBe(true);
    const executionClaimed = applyMetabolismAction(executionContribution, actor, { type: "claim_record", projectId: acceptedProject.id, contributionId: executionProject.contributions[0]!.id, statement: "A validação automatizada terminou com sucesso nesta base.", scopeDescription: "Somente os comandos e paths listados no Result Package.", requestKey: "execution-claim-0001" }, id, now);
    const executionClaim = executionClaimed.projects![0]!.claims[0]!;
    const attached = applyMetabolismAction(executionClaimed, actor, { type: "evidence_attach", projectId: acceptedProject.id, contributionId: executionProject.contributions[0]!.id, claimId: executionClaim.id, artifactId: executionClaimed.projects![0]!.artifacts[0]!.id, description: "Delta e resumo de validação preservados no Result Package.", limitations: "Codex é o executor e não é verificação independente.", requestKey: "evidence-attach-0001" }, id, now);
    expect(attached.projects![0]!.evidenceItems).toMatchObject([{ state: "DOCUMENTED", digest: deltaDigest }]);
    expect(attached.records.some((record) => record.kind === "Evidence" && record.claimId === executionClaim.id && record.sourceId && record.rationale.includes("no Verification is implied"))).toBe(true);
    expect(attached.projects![0]!.verifications).toHaveLength(0);
    expect(() => applyMetabolismAction(executionClaimed, actor, { type: "evidence_attach", projectId: acceptedProject.id, contributionId: executionProject.contributions[0]!.id, claimId: executionClaim.id, artifactId: "artifact-other-work", description: "Evidence fora do contexto.", limitations: "Sem ligação ao trabalho.", requestKey: "evidence-attach-0002" }, id, now)).toThrow("EVIDENCE_SUBJECT_MISMATCH");

    const complete = applyCommand(accepted, actor, { type: "work_complete", workItemId: work.id, result: "Etapa concluída localmente.", learning: "O limite explícito ajudou." }, "complete-request-0001", id, now);
    const withContribution = recordWorkContribution(complete, actor, work.id, id, now);
    const contribution = withContribution.projects![0]!.contributions[0]!;
    expect(contribution.commitmentId).toBe(commitment.id);
    expect(contribution.description).toContain("Etapa concluída localmente.");
    expect(contribution.limitations).toContain("não constitui verificação independente");
    expect(withContribution.projects![0]!.artifacts).toHaveLength(0);
    expect(withContribution.projects![0]!.verifications).toHaveLength(0);
    expect(recordWorkContribution(withContribution, actor, work.id, id, now)).toBe(withContribution);
    const claimState = applyMetabolismAction(withContribution, actor, { type: "claim_record", projectId: project.id, contributionId: contribution.id, statement: "A entrega revisável ficou ligada ao acordo aceito.", scopeDescription: "Somente esta entrega local e este Commitment.", requestKey: "claim-request-0001" }, id, now);
    expect(claimState.projects![0]!.claims[0]).toMatchObject({ subjectType: "CONTRIBUTION", subjectId: contribution.id, authorActorId: actor, state: "RECORDED" });
    expect(claimState.projects![0]!.evidenceItems).toHaveLength(0);
    expect(claimState.projects![0]!.verifications).toHaveLength(0);

    const candidate = applyMetabolismAction(withContribution, actor, { type: "capability_candidate_create", workItemId: work.id, proposedName: "Planejar trabalho delimitado", requestKey: "capability-request-01" }, id, now);
    expect(candidate.capabilities ?? []).toHaveLength(0);
    expect(candidate.capabilityCandidates?.[0]).toMatchObject({ status: "PROPOSED", learningRecordId: expect.any(String) });
    const acceptedCapability = applyMetabolismAction(candidate, actor, { type: "capability_candidate_decide", candidateId: candidate.capabilityCandidates![0]!.id, disposition: "accept", acceptedName: "Planejar e delimitar trabalho", requestKey: "capability-decision-01" }, id, now);
    expect(acceptedCapability.capabilities?.[0]).toMatchObject({
      name: "Planejar e delimitar trabalho",
      provenance: { origin: "user_reported", actorId: actor, actorKind: "human", sourceIds: [candidate.capabilityCandidates![0]!.learningRecordId, candidate.capabilityCandidates![0]!.sourceRecordId, expect.any(String)] },
      verificationIds: [],
    });
    expect(acceptedCapability.records.some((record) => record.kind === "Decision" && record.content.includes("nenhuma verificação"))).toBe(true);
  });

  it("requires a founder-owned original intention and cell authority", () => {
    const initial = seedFoundation(id, now);
    expect(() => applyMetabolismAction(initial, "other-person" as PersonId, { type: "project_create", sourceRecordId: initial.records[0]!.id, title: "Projeto falso", requestKey: "project-request-002" }, id, now)).toThrow("FORBIDDEN");
    expect(() => applyMetabolismAction(initial, initial.person.id, { type: "project_create", sourceRecordId: initial.records[0]!.id, title: "Projeto falso", requestKey: "project-request-003" }, id, now)).toThrow("PROJECT_SOURCE_NOT_OWNED_ORIGINAL");
  });
});
