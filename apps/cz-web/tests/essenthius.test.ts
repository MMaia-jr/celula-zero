// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { seedFoundation, beginIntelligenceTurn, completeIntelligenceTurn, failIntelligenceTurn, executeHumanAuthorizedWorkAction, applyCommand, respondToInterpretation, projection } from "../lib/foundation";
import { compileInstitutionalContext, describeContinuity } from "../lib/essenthius/context";
import { CodexCliAdapter, codexInferenceArgs } from "../lib/essenthius/codex-cli";
import { OllamaLocalAdapter, listLocalModels } from "../lib/essenthius/ollama-local";
import { discoverHabitatConnections, projectCurrentCapabilities } from "../lib/essenthius/capabilities";
import { boundedInstitutionalContext } from "../lib/essenthius/context-budget";
import { activeDirectionSchema, readActiveDirection } from "../lib/essenthius/active-direction";
import type { IntelligenceContext, IntelligenceResult } from "../lib/essenthius/port";

const now = "2026-10-01T12:00:00.000Z";
const result: IntelligenceResult = {
  interpretation: {
    whatIUnderstand: "Marcos quer continuar um trabalho da Célula.",
    relevantContext: ["O contexto veio dos registros CZ ligados à Cell."],
    availableCapabilities: ["cz:local-work"],
    composition: "Usar o trabalho local da Célula e preservar a fala original.",
    missingCapability: null,
    conditions: ["Marcos confirma antes da criação."],
    authorityRequired: "cell.update",
    why: "O trabalho precisa continuar depois do retorno.",
    nextAction: "Revisar a proposta e confirmar se fizer sentido.",
    workProposal: { title: "Continuar a conversa da Célula", context: "Retomar os registros e escolher o próximo passo." },
  },
  provider: "OLLAMA_LOCAL", model: "qwen3:4b", inputTokens: 100, outputTokens: 40,
  contextDigest: "a".repeat(64), requestId: null,
  contextCharacters: 4800, promptCharacters: 7200,
};
const cap = [{ id: "cz:local-work", name: "Trabalho local", effect: "Criar WorkItem", availability: "LOCAL_ONLY", conditions: ["confirmação humana"] }];
const resource = [{ id: "cell:1", kind: "CZ_CELL", source: "durable state", availability: "LOCAL_ONLY", provenance: "readback" }];
const canonical = {
  repository: "MMaia-jr/celula-zero",
  head: "50b4917593b0979d5c218c725038bf89afb1134f",
  statePath: "STATE.md",
  boundary: "Canonical source observations; not institutional records.",
  sourceExcerpts: [{ path: "decisions/D059.md", artifactKind: "DECISION SOURCE", excerpt: "CZ EXPERIENCE ≠ HULY UI" }],
};

describe("Essenthius composition boundaries", () => {
  it("compiles only authenticated institutional identity, authorized Cell, relevant records and known capabilities", () => {
    const state = seedFoundation(randomUUID, now);
    state.workItems = [{ id: "work-known-001", cellId: state.cell.id, responsiblePersonId: state.person.id, title: "Retomar o Habitat", context: "Continuar a campanha", status: "active", sourceRecordId: state.records[0]!.id, createdAt: now, updatedAt: now }];
    state.meetings = [{ id: "meeting-known-001", cellId: state.cell.id, title: "Próximo passo", purpose: "Continuar o Habitat", hostPersonId: state.person.id, participants: [{ kind: "PERSON", id: state.person.id, label: state.person.name }], turnIds: [], status: "OPEN", createdAt: now }];
    const waiting = beginIntelligenceTurn(state, state.person.id, "Retomar proposta", randomUUID(), randomUUID, now);
    state.intelligenceTurns = waiting.state.intelligenceTurns!;
    state.conversationMessages = waiting.state.conversationMessages!;
    state.actionRequests = [{ id: "request-waiting-001", turnId: waiting.turn.id, sourceMessageId: waiting.turn.humanMessageId!, capabilityId: "cz:local-work", action: "create_work", proposedTitle: "Rever continuidade", proposedContext: "Aguardar confirmação de Marcos.", status: "PROPOSED", createdAt: now, authorizationRecordId: null, executionId: null, resultWorkItemId: null, resultRecordId: null }];
    const baseRecord = state.records[0]!;
    state.records.push(
      { ...baseRecord, id: "claim-context", kind: "Claim", content: "A bounded claim", sourceIds: [] },
      { ...baseRecord, id: "evidence-context", kind: "Evidence", claimId: "claim-context", sourceId: baseRecord.id, rationale: "A distinct evidence record" },
      { ...baseRecord, id: "verification-context", kind: "Verification", claimId: "claim-context", evidenceIds: ["evidence-context"], method: "readback", outcome: "inconclusive" },
    );
    const ctx = compileInstitutionalContext(state, state.person.id, cap, "50b4917593b0979d5c218c725038bf89afb1134f", resource, canonical.sourceExcerpts, undefined, undefined, "cells", { localHead: "local-head", canonicalHead: "canonical-head", workingTreeDirty: true, changedPathCount: 21 });
    expect(ctx.person.id).toBe(state.person.id);
    expect(ctx.cell.id).toBe(state.cell.id);
    expect(ctx.currentSurface).toBe("cells");
    expect(ctx.navigation?.map((item) => item.section)).toContain("meetings");
    expect(ctx.runtime).toMatchObject({ repository: "MMaia-jr/celula-zero", localHead: "local-head", canonicalHead: "canonical-head", workingTreeDirty: true, changedPathCount: 21 });
    expect(ctx.entities).toEqual(expect.arrayContaining([
      { kind: "work", id: "work-known-001", label: "Retomar o Habitat", href: "/cells?open=work%3Awork-known-001" },
      { kind: "meeting", id: "meeting-known-001", label: "Próximo passo", href: "/meetings?open=meeting%3Ameeting-known-001" },
    ]));
    expect(ctx.meetings).toEqual([{ id: "meeting-known-001", title: "Próximo passo", purpose: "Continuar o Habitat", status: "OPEN", participants: ["Marcos"], href: "/meetings?open=meeting%3Ameeting-known-001" }]);
    expect(ctx.pendingHumanActions).toEqual([{ kind: "WORK_PROPOSAL", title: "Rever continuidade", context: "Aguardar confirmação de Marcos." }]);
    expect(ctx.relations).toEqual(["founder", "steward"]);
    expect(ctx.authority).toEqual(["cell.read", "cell.update"]);
    expect(ctx.capabilities).toEqual(cap);
    expect(ctx.resources).toEqual(resource);
    expect(ctx.canonical.head).toBe("50b4917593b0979d5c218c725038bf89afb1134f");
    expect(ctx.canonical.sourceExcerpts).toEqual(canonical.sourceExcerpts);
    expect(ctx.canonical.boundary).toContain("not itself a CZ OriginalRecord");
    expect(ctx.canonical.boundary).toContain("origin/main");
    expect(ctx.recentRecords.map((record) => record.kind)).toEqual(expect.arrayContaining(["Claim", "Evidence", "Verification"]));
  });

  it("keeps current local Human Direction distinct from canonical state and from older open Work", () => {
    const direction = activeDirectionSchema.parse({
      status: "CURRENT_HUMAN_DIRECTION_LOCAL_NOT_CANONICAL", receivedAt: "2026-10-03",
      source: "current user direction; not Git", campaign: "Genesis Habitat Build Campaign V1",
      implementationProgress: ["real turn verified from durable state"],
      currentPriority: ["Continue the campaign and do not infer priority from an old open Work."],
      oldOpenWorkBoundary: "Old open work is locatable but not automatically current priority.",
      canonicalBoundary: "D059 from origin/main is a separate readback.", constraints: ["No promotion."],
    });
    const state = seedFoundation(randomUUID, now);
    const context = compileInstitutionalContext(state, state.person.id, cap, canonical.head, resource, canonical.sourceExcerpts, undefined, undefined, "home", undefined, direction, []);
    expect(context.activeDirection?.status).toBe("CURRENT_HUMAN_DIRECTION_LOCAL_NOT_CANONICAL");
    expect(context.activeDirection?.currentPriority[0]).toContain("campaign");
    expect(context.canonical.head).toBe(canonical.head);
    expect(context.activeDirection?.canonicalBoundary).not.toBe(context.canonical.boundary);
  });

  it("loads the operator-maintained campaign projection as local, never canonical direction", () => {
    const direction = readActiveDirection();
    expect(direction?.status).toBe("CURRENT_HUMAN_DIRECTION_LOCAL_NOT_CANONICAL");
    expect(direction?.campaign).toContain("Genesis Habitat Build Campaign");
    expect(direction?.implementationProgress.length).toBeGreaterThan(0);
    expect(direction?.source).toContain("not a canonical Git artifact");
  });

  it("reports concrete product capabilities separately from personal capability candidates", () => {
    const projected = projectCurrentCapabilities({ codexAuthenticated: true, localModelInstalled: true, hulyConfigured: true, hasOpenWork: true, hasIntentions: true, hasProjects: true, hasOpenOpportunities: true, hasSubmittedProposals: true, hasCommitments: true, hasEvidenceEligibleClaims: false, hasCompletedWork: true, hasEligibleExecutionAgreement: false });
    expect(projected.find((item) => item.id === "cz:create-work")).toMatchObject({ availability: "AVAILABLE_WITH_HUMAN_CONFIRMATION", readWrite: "WRITE_AFTER_HUMAN_CONFIRMATION", actionEntrypoint: "/conversations" });
    expect(projected.find((item) => item.id === "cz:profile-manual")).toMatchObject({ availability: "AVAILABLE", readWrite: "DIRECT_HUMAN_WRITE" });
    expect(projected.find((item) => item.id === "essenthius:codex-interpretation")?.availability).toBe("AVAILABLE");
    expect(projected.find((item) => item.id === "provider:ollama-local")?.availability).toBe("BACKGROUND_ONLY");
    expect(projected.find((item) => item.id === "provider:kimi")?.availability).toBe("NOT_CONFIGURED");
    expect(projected.find((item) => item.id === "executor:codex-cli")?.reason).toContain("não contém Agreement elegível");
    expect(projected.find((item) => item.id === "cz:create-project")?.availability).toBe("AVAILABLE_WITH_HUMAN_CONFIRMATION");
    expect(projected.find((item) => item.id === "cz:submit-proposal")?.availability).toBe("AVAILABLE_WITH_HUMAN_CONFIRMATION");
    expect(projected.find((item) => item.id === "cz:decide-proposal")?.availability).toBe("AVAILABLE_WITH_HUMAN_CONFIRMATION");
    expect(projected.find((item) => item.id === "cz:attach-attributed-evidence")?.availability).toBe("CONFIGURED_BUT_UNAVAILABLE");
    expect(projected.every((item) => item.authorityRequired && item.costUsageClass && item.reason)).toBe(true);
  });

  it("compacts context as valid JSON and retains direction, capability inventory and authority", () => {
    const context: IntelligenceContext = {
      person: { id: "p", name: "Marcos", profileHeadline: "", profileBio: "x".repeat(10000) },
      cell: { id: "c", name: "Célula Zero", purpose: "p".repeat(1000) }, relations: ["founder"], authority: ["cell.read"],
      openWork: Array.from({ length: 12 }, (_, index) => ({ id: `work-${index}`, title: `W${index}`, context: "work context", updatedAt: now })),
      meetings: [], pendingHumanActions: [], projects: [], recentMetabolism: [], contributions: [], profileCapabilityCandidates: [],
      recentConversation: Array.from({ length: 12 }, () => ({ speaker: "Marcos", text: "history".repeat(1000), createdAt: now })),
      recentRecords: [...Array(12).keys()].map((index) => ({ id: `record-${index}`, kind: "OriginalRecord", content: "record".repeat(1000), createdAt: now })),
      experiences: [], capabilities: cap, currentCapabilities: projectCurrentCapabilities({ codexAuthenticated: true, localModelInstalled: false, hulyConfigured: true, hasOpenWork: true, hasIntentions: true, hasProjects: true, hasOpenOpportunities: true, hasSubmittedProposals: true, hasCommitments: true, hasEvidenceEligibleClaims: false, hasCompletedWork: true, hasEligibleExecutionAgreement: false }),
      resources: resource, canonical, activeDirection: { status: "CURRENT_HUMAN_DIRECTION_LOCAL_NOT_CANONICAL", receivedAt: "2026-10-03", source: "local", campaign: "Genesis", implementationProgress: ["real turn readback"], currentPriority: ["continue current campaign"], oldOpenWorkBoundary: "old work is not priority", canonicalBoundary: "separate readback", constraints: ["no promotion"] },
    };
    const bounded = boundedInstitutionalContext(context);
    const parsed = JSON.parse(bounded) as Record<string, unknown>;
    expect(bounded.length).toBeLessThanOrEqual(9_000);
    expect(parsed.activeDirection).toBeDefined();
    expect(parsed.currentCapabilities).toBeDefined();
    expect(parsed.authority).toEqual(["cell.read"]);
    expect(parsed).not.toHaveProperty("capabilityCandidates");
  });

  it("persists a conversation message separately from institutional records and links the interpretation with provider provenance", () => {
    const base = seedFoundation(randomUUID, now);
    const begun = beginIntelligenceTurn(base, base.person.id, "Quero retomar este trabalho", randomUUID(), randomUUID, now);
    const completed = completeIntelligenceTurn(begun.state, base.person.id, begun.turn.id, result, randomUUID, now);
    const turn = completed.intelligenceTurns?.[0];
    expect(turn).toBeDefined();
    if (!turn) throw new Error("Expected a completed intelligence turn");
    const message = completed.conversationMessages?.find((item) => item.id === turn.humanMessageId);
    const interpretation = completed.records.find((record) => record.id === turn.interpretationRecordId);
    expect(message).toMatchObject({ threadId: `cell:${base.cell.id}`, body: "Quero retomar este trabalho", authorId: base.person.id });
    expect(completed.records.some((record) => record.kind === "OriginalRecord" && record.purpose === "human_speech" && record.content === "Quero retomar este trabalho")).toBe(false);
    expect(interpretation).toMatchObject({ kind: "Interpretation", sourceMessageId: turn.humanMessageId, generatorId: "essenthius:genesis-v1" });
    expect(turn).toMatchObject({ provider: "OLLAMA_LOCAL", model: "qwen3:4b", disposition: "awaiting_human" });
    expect(turn).toMatchObject({ contextCharacters: 4800, promptCharacters: 7200 });
    expect(turn?.monetaryCostStatus).toBeUndefined();
    expect(completed.records.some((record) => record.kind === "Decision")).toBe(false);
    expect(completed.actionRequests).toHaveLength(1);
    expect(completed.actionRequests?.[0]).toMatchObject({ sourceMessageId: turn.humanMessageId });
    expect(completed.actionExecutions ?? []).toHaveLength(0);
  });

  it("records account quota separately from unknown monetary cost", () => {
    const base = seedFoundation(randomUUID, now);
    const begun = beginIntelligenceTurn(base, base.person.id, "Retome o contexto", randomUUID(), randomUUID, now);
    const codexResult = { ...result, provider: "CODEX_CLI_CHATGPT", model: "codex-cli-default" };
    const completed = completeIntelligenceTurn(begun.state, base.person.id, begun.turn.id, codexResult, randomUUID, now, {
      requestedPreference: "auto", selectionReason: "AUTO: Codex autenticado", fallbackUsed: false, durationMs: 17500,
      taskClass: "CONVERSATION", fundingOwnerClass: "USER_CONNECTED_ACCOUNT",
      accountQuotaClass: "EXISTING_AUTHENTICATED_ACCOUNT_LIMITS", monetaryCostStatus: "UNKNOWN",
    });
    expect(completed.intelligenceTurns?.[0]).toMatchObject({
      taskClass: "CONVERSATION", fundingOwnerClass: "USER_CONNECTED_ACCOUNT",
      accountQuotaClass: "EXISTING_AUTHENTICATED_ACCOUNT_LIMITS", monetaryCostStatus: "UNKNOWN",
      requestedPreference: "auto", durationMs: 17500,
    });
    expect(completed.intelligenceTurns?.[0]?.monetaryCostStatus).not.toBe("ACCOUNT_INCLUDED_NO_INCREMENTAL_CHARGE_OBSERVED");
  });

  it("preserves provider and account quota attribution when an invocation fails", () => {
    const base = seedFoundation(randomUUID, now);
    const begun = beginIntelligenceTurn(base, base.person.id, "Retome o contexto", randomUUID(), randomUUID, now);
    const failed = failIntelligenceTurn(begun.state, base.person.id, begun.turn.id, "CODEX_CLI_TIMEOUT", {
      provider: "CODEX_CLI_CHATGPT", model: "codex-cli-default", requestedPreference: "auto",
      selectionReason: "AUTO selected authenticated Codex", fallbackUsed: false, durationMs: 45_000,
      taskClass: "CONVERSATION", intelligenceMode: "interpret", fundingOwnerClass: "USER_CONNECTED_ACCOUNT",
      accountQuotaClass: "EXISTING_AUTHENTICATED_ACCOUNT_LIMITS", monetaryCostStatus: "UNKNOWN",
    });
    expect(failed.intelligenceTurns?.[0]).toMatchObject({ status: "unavailable", provider: "CODEX_CLI_CHATGPT", accountQuotaClass: "EXISTING_AUTHENTICATED_ACCOUNT_LIMITS", monetaryCostStatus: "UNKNOWN", durationMs: 45_000 });
    expect(failed.records.some((record) => record.kind === "Interpretation")).toBe(false);
  });

  it("does not execute an ActionRequest without server-resolved cell authority; confirmed action records authorization, execution and result separately", () => {
    const base = seedFoundation(randomUUID, now);
    const begun = beginIntelligenceTurn(base, base.person.id, "Planejar a retomada", randomUUID(), randomUUID, now);
    const proposed = completeIntelligenceTurn(begun.state, base.person.id, begun.turn.id, result, randomUUID, now);
    const actionRequest = proposed.actionRequests?.[0];
    expect(actionRequest).toBeDefined();
    if (!actionRequest) throw new Error("Expected a proposed action");
    const requestId = actionRequest.id;
    const withoutUpdate = { ...proposed, authorities: proposed.authorities.map((authority) => ({ ...authority, permissions: ["cell.read" as const] })) };
    expect(() => executeHumanAuthorizedWorkAction(withoutUpdate, base.person.id, requestId, result.interpretation.workProposal!.title, result.interpretation.workProposal!.context, randomUUID(), randomUUID, now)).toThrow("FORBIDDEN");
    const authorized = executeHumanAuthorizedWorkAction(proposed, base.person.id, requestId, result.interpretation.workProposal!.title, result.interpretation.workProposal!.context, randomUUID(), randomUUID, now);
    const repeatedConfirmation = executeHumanAuthorizedWorkAction(authorized, base.person.id, requestId, "different retry payload", "ignored because already authorized", randomUUID(), randomUUID, now);
    expect(repeatedConfirmation).toBe(authorized);
    expect(repeatedConfirmation.records.filter((record) => record.kind === "OriginalRecord" && record.purpose === "action_authorization")).toHaveLength(1);
    const request = authorized.actionRequests?.[0];
    expect(request).toBeDefined();
    if (!request) throw new Error("Expected an authorized action request");
    expect(request.status).toBe("EXECUTED");
    expect(authorized.actionExecutions?.[0]?.resultWorkItemId).toBe(request.resultWorkItemId);
    expect(authorized.records.find((record) => record.id === request.authorizationRecordId)).toMatchObject({ kind: "OriginalRecord", purpose: "action_authorization", authorId: base.person.id });
    expect(authorized.records.find((record) => record.id === request.resultRecordId)).toMatchObject({ kind: "OriginalRecord", purpose: "work_create", authorId: base.person.id });
    expect(authorized.records.some((record) => record.kind === "Decision")).toBe(false);
    const returned = applyCommand(authorized, base.person.id, { type: "work_complete", workItemId: request.resultWorkItemId!, result: "O próximo passo ficou definido.", learning: "A decisão humana continua explícita." }, randomUUID(), randomUUID, "2026-10-02T12:00:00.000Z");
    expect(returned.records.find((record) => record.kind === "OriginalRecord" && record.purpose === "work_consequence")).toMatchObject({ kind: "OriginalRecord", purpose: "work_consequence" });
    expect(returned.records.some((record) => record.kind === "OriginalRecord" && record.purpose === "learning" && record.content.includes("decisão humana"))).toBe(true);
  });

  it("reconstructs continuation from durable state and supports human correction without adopting the model output", () => {
    const base = seedFoundation(randomUUID, now);
    const begun = beginIntelligenceTurn(base, base.person.id, "Não foi exatamente isso", randomUUID(), randomUUID, now);
    const completed = completeIntelligenceTurn(begun.state, base.person.id, begun.turn.id, { ...result, interpretation: { ...result.interpretation, workProposal: null } }, randomUUID, now);
    const corrected = beginIntelligenceTurn(completed, base.person.id, "Correção do que eu quis dizer", randomUUID(), randomUUID, "2026-10-01T13:00:00.000Z", begun.turn.id);
    expect(corrected.state.intelligenceTurns?.find((turn) => turn.id === begun.turn.id)?.disposition).toBe("corrected");
    const view = projection(corrected.state, base.person.id);
    expect(describeContinuity(view).lastConversationMessage?.body).toContain("Correção");
    const rejected = respondToInterpretation(completed, base.person.id, begun.turn.id, "rejected", "Essa leitura está errada.", randomUUID, "2026-10-01T14:00:00.000Z");
    expect(rejected.intelligenceTurns?.[0]?.disposition).toBe("rejected");
    expect(rejected.records.at(-1)).toMatchObject({ kind: "OriginalRecord", purpose: "human_speech", authorId: base.person.id });
    const repeatedResponse = respondToInterpretation(rejected, base.person.id, begun.turn.id, "rejected", "Essa leitura está errada.", randomUUID, "2026-10-01T14:01:00.000Z");
    expect(repeatedResponse).toBe(rejected);
    expect(rejected.records.filter((record) => record.kind === "OriginalRecord" && record.purpose === "human_speech" && record.content === "Essa leitura está errada.")).toHaveLength(1);
    expect(rejected.records.some((record) => record.kind === "Decision")).toBe(false);
  });

  it("preserves an accepted experience draft against its attributable conversation message", () => {
    const base = seedFoundation(randomUUID, now);
    const begun = beginIntelligenceTurn(base, base.person.id, "Ajudei a organizar o Fórum de Agroecologia.", randomUUID(), randomUUID, now);
    const messageId = begun.turn.humanMessageId;
    expect(messageId).toBeTruthy();
    const accepted = applyCommand(begun.state, base.person.id, { type: "experience", title: "Fórum de Agroecologia", description: "Ajudei a organizar o Fórum de Agroecologia.", occurredOn: "2026-09-20", sourceMessageId: messageId }, randomUUID(), randomUUID, now);
    expect(accepted.experiences.at(-1)).toMatchObject({ title: "Fórum de Agroecologia", provenance: { origin: "user_reported", actorId: base.person.id } });
    expect(accepted.records.at(-1)).toMatchObject({ kind: "OriginalRecord", purpose: "experience", authorId: base.person.id });
    const sourceRecord = accepted.records.at(-1);
    expect(sourceRecord?.kind).toBe("OriginalRecord");
    if (sourceRecord?.kind === "OriginalRecord") expect(sourceRecord.content).toContain(messageId);
    expect(() => applyCommand(begun.state, base.person.id, { type: "experience", title: "Fórum", description: "Relato", occurredOn: "2026-09-20", sourceMessageId: "not-this-person-message" }, randomUUID(), randomUUID, now)).toThrow("EXPERIENCE_SOURCE_UNAVAILABLE");
    expect(accepted.records.some((record) => record.kind === "Decision")).toBe(false);
  });

  it("uses a loopback-only local Ollama adapter, validates structured interpretation and filters invented capability IDs", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body));
      expect(request.model).toBe("qwen3:4b");
      expect(request.keep_alive).toBe(0);
      expect(request.stream).toBe(false);
      return Response.json({ done: true, prompt_eval_count: 25, eval_count: 16, message: { content: JSON.stringify({ ...result.interpretation, availableCapabilities: ["cz:local-work", "invented:authority"] }) } });
    });
    const adapter = new OllamaLocalAdapter({ fetch: fetcher as typeof fetch });
    const interpreted = await adapter.interpret({ text: "O que importa agora?", context: { person: { id: "p", name: "Marcos", profileHeadline: "", profileBio: "" }, cell: { id: "c", name: "Célula Zero", purpose: "Operar CZ" }, relations: ["founder"], authority: ["cell.read"], openWork: [], meetings: [], pendingHumanActions: [], projects: [], recentMetabolism: [], contributions: [], profileCapabilityCandidates: [], recentConversation: [], recentRecords: [], experiences: [], capabilities: cap, resources: resource, canonical } });
    expect(interpreted.provider).toBe("OLLAMA_LOCAL");
    expect(interpreted.interpretation.availableCapabilities).toEqual(["cz:local-work"]);
    expect(interpreted.inputTokens).toBe(25);
    expect(interpreted.contextDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(() => new OllamaLocalAdapter({ baseUrl: "http://example.com" })).toThrow("OLLAMA_LOCAL_ENDPOINT_MUST_BE_LOOPBACK");
  });

  it("uses Codex CLI only as a bounded text interpreter with local tools disabled", async () => {
    const invoke = vi.fn(async (...args: [string]) => {
      expect(args[0]).toContain("Esta saída é somente uma INTERPRETATION");
      expect(args[0]).toContain("ACTIVE_DIRECTION é a prioridade humana atual");
      expect(args[0]).toContain("PROFILE_CAPABILITY_CANDIDATES");
      expect(args[0]).toContain("no máximo 6 IDs");
      expect(args[0]).toContain("relevantContext (no máximo 6 itens)");
      expect(args[0]).toContain("conditions (no máximo 6 itens)");
      return {
        text: JSON.stringify({ ...result.interpretation, availableCapabilities: ["cz:local-work", "invented:write"], openTarget: { kind: "work", id: "invented-id" } }),
        threadId: "thread-codex-1", inputTokens: 12000, outputTokens: 90,
      };
    });
    const adapter = new CodexCliAdapter({ invoke });
    const context: Parameters<typeof adapter.interpret>[0]["context"] = {
      person: { id: "p", name: "Marcos", profileHeadline: "", profileBio: "" },
      cell: { id: "c", name: "Célula Zero", purpose: "Operar CZ" },
      relations: ["founder"], authority: ["cell.read"], openWork: [], meetings: [], pendingHumanActions: [], projects: [], recentMetabolism: [], contributions: [], profileCapabilityCandidates: [], recentRecords: [], experiences: [],
      capabilities: cap, resources: resource, canonical, recentConversation: [],
    };
    const response = await adapter.interpret({ text: "O que importa agora?", context });
    const args = codexInferenceArgs();
    expect(args).toEqual(expect.arrayContaining([
      "--ephemeral", "--sandbox", "read-only", "--ignore-user-config", "--ignore-rules",
      "--disable", "shell_tool", "--disable", "apps", "--disable", "browser_use",
      "--disable", "computer_use", "--disable", "view_image", "--disable", "remote_plugin",
      "--disable", "plugins", "--disable", "code_mode_host", "--disable", "sleep_tool", "-",
    ]));
    expect(response).toMatchObject({ provider: "CODEX_CLI_CHATGPT", requestId: "thread-codex-1", inputTokens: 12000, outputTokens: 90 });
    expect(response.interpretation.availableCapabilities).toEqual(["cz:local-work"]);
    expect(response.interpretation.openTarget).toBeUndefined();
    expect(response.contextDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(response.contextCharacters).toBeLessThanOrEqual(14_000);
    expect(response.promptCharacters).toBeDefined();
    expect(response.promptCharacters!).toBeGreaterThan(response.contextCharacters!);
    expect(invoke).toHaveBeenCalledOnce();
  });

  it("bounds model-generated capability IDs to the six allowed product entries", async () => {
    const capabilities = Array.from({ length: 8 }, (_, index) => ({ id: `capability-${index}`, name: `Capability ${index}`, effect: "bounded", availability: "AVAILABLE", conditions: [] }));
    const context: IntelligenceContext = {
      person: { id: "p", name: "Marcos", profileHeadline: "", profileBio: "" },
      cell: { id: "c", name: "Célula Zero", purpose: "Operar CZ" }, relations: ["founder"], authority: ["cell.read"],
      openWork: [], meetings: [], pendingHumanActions: [], projects: [], recentMetabolism: [], contributions: [], profileCapabilityCandidates: [],
      recentConversation: [], recentRecords: [], experiences: [], capabilities, resources: resource, canonical,
    };
    const adapter = new CodexCliAdapter({ invoke: async () => ({ text: JSON.stringify({ ...result.interpretation, relevantContext: Array.from({ length: 9 }, (_, index) => `context-${index}`), availableCapabilities: capabilities.map((item) => item.id), conditions: Array.from({ length: 9 }, (_, index) => `condition-${index}`) }), threadId: null, inputTokens: 50, outputTokens: 20 }) });
    const response = await adapter.interpret({ text: "O que está disponível?", context });
    expect(response.interpretation.availableCapabilities).toEqual(capabilities.slice(0, 6).map((item) => item.id));
    expect(response.interpretation.relevantContext).toHaveLength(6);
    expect(response.interpretation.conditions).toHaveLength(6);
  });

  it("keeps an open-target suggestion only when it points to an entity in the authorized context", async () => {
    const context: IntelligenceContext = {
      person: { id: "p", name: "Marcos", profileHeadline: "", profileBio: "" },
      cell: { id: "c", name: "Célula Zero", purpose: "Continuar" }, relations: ["founder"], authority: ["cell.read"],
      openWork: [], meetings: [], pendingHumanActions: [], projects: [], recentMetabolism: [], contributions: [], profileCapabilityCandidates: [], recentConversation: [], recentRecords: [], experiences: [], capabilities: cap, resources: resource, canonical,
      entities: [{ kind: "work", id: "work-authorized", label: "Retomar o Habitat", href: "/cells?open=work%3Awork-authorized" }],
    };
    const adapter = new CodexCliAdapter({ invoke: async () => ({ text: JSON.stringify({ ...result.interpretation, openTarget: { kind: "work", id: "work-authorized" } }), threadId: null, inputTokens: null, outputTokens: null }) });
    const response = await adapter.interpret({ text: "Onde está o trabalho?", context });
    expect(response.interpretation.openTarget).toEqual({ kind: "work", id: "work-authorized" });
  });

  it("keeps resource, capability and connection readbacks distinct and labels historical systems reference-only", () => {
    const connections = discoverHabitatConnections({ ollamaAvailable: true, selectedModelAvailable: true, ollamaInteractive: false, codexAuthenticated: true });
    expect(connections.find((connection) => connection.id === "connection:ollama")?.status).toBe("BLOCKED");
    expect(connections.find((connection) => connection.id === "connection:codex-cli")?.status).toBe("AUTHENTICATED");
    expect(connections.find((connection) => connection.id === "connection:codex-inference")?.status).toBe("AUTHENTICATED");
    expect(connections.find((connection) => connection.id === "connection:supabase-history")?.status).toBe("REFERENCE_ONLY");
    expect(connections.find((connection) => connection.id === "connection:huly-accounts")?.boundary).toContain("não é Person");
  });

  it.runIf(process.env.CZ_OLLAMA_INTEGRATION === "1")("obtains one bounded real interpretation from the already-installed local model", async () => {
    const models = await listLocalModels();
    expect(models.available).toBe(true);
    expect(models.models).toContain("qwen3:4b");
    const adapter = new OllamaLocalAdapter({ model: "qwen3:4b" });
    const interpreted = await adapter.interpret({
      text: "Quero continuar uma tarefa curta e ver o próximo passo.",
      context: {
        person: { id: "person-test", name: "Pessoa de teste", profileHeadline: "", profileBio: "" },
        cell: { id: "cell-test", name: "Cell de teste", purpose: "Preservar continuidade" },
        relations: ["member"], authority: ["cell.read"], openWork: [{ id: "work-test", title: "Retomar revisão", context: "Próxima etapa ainda precisa ser definida.", updatedAt: now }], meetings: [], pendingHumanActions: [], projects: [], recentMetabolism: [], contributions: [], profileCapabilityCandidates: [],
        recentConversation: [], recentRecords: [{ id: "record-test", kind: "OriginalRecord", purpose: "human_speech", content: "Quero continuar uma tarefa curta.", createdAt: now }],
        experiences: [], capabilities: cap, resources: resource,
        canonical,
      },
    });
    expect(interpreted.provider).toBe("OLLAMA_LOCAL");
    expect(interpreted.model).toBe("qwen3:4b");
    expect(interpreted.interpretation.whatIUnderstand.length).toBeGreaterThan(0);
    expect(interpreted.contextDigest).toMatch(/^[a-f0-9]{64}$/);
  }, 180_000);

  it.runIf(process.env.CZ_CODEX_CLI_INTEGRATION === "1")("obtains one bounded structured interpretation from Codex CLI without executor tools", async () => {
    const adapter = new CodexCliAdapter();
    const interpreted = await adapter.interpret({
      text: "Qual é o próximo passo?",
      context: {
        person: { id: "person-test", name: "Pessoa de teste", profileHeadline: "", profileBio: "" },
        cell: { id: "cell-test", name: "Célula Zero", purpose: "Preservar continuidade" },
        relations: ["member"], authority: ["cell.read"],
        openWork: [{ id: "work-test", title: "Retomar revisão", context: "Definir uma etapa pequena.", updatedAt: now }],
        projects: [], meetings: [], pendingHumanActions: [], recentMetabolism: [], contributions: [], profileCapabilityCandidates: [], recentConversation: [], recentRecords: [], experiences: [], capabilities: cap, resources: resource, canonical,
      },
    });
    expect(interpreted.provider).toBe("CODEX_CLI_CHATGPT");
    expect(interpreted.model).toBe("codex-cli-default");
    expect(interpreted.interpretation.whatIUnderstand.length).toBeGreaterThan(0);
    expect(interpreted.contextDigest).toMatch(/^[a-f0-9]{64}$/);
  }, 60_000);
});
