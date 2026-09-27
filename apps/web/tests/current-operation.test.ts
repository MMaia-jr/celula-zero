import { describe, expect, test, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { WorkbenchProject } from "@/lib/data/workbench";
import { composeCurrentOperation, projectCompanyCoreOperation, projectWorkbenchOperations } from "@/lib/domain/current-operation";
import { getMyProfile } from "@/lib/data/profiles";
import { getWorkbenchData } from "@/lib/data/workbench";
import { listCompanyCoreCycles, getAiJobOperationalStatus } from "@/lib/data/company-core";
import { getCurrentOperation } from "@/lib/data/current-operation";
import OperatePage from "@/app/operate/page";

vi.mock("@/lib/data/profiles", () => ({ getMyProfile: vi.fn() }));
vi.mock("@/lib/data/workbench", () => ({ getWorkbenchData: vi.fn() }));
vi.mock("@/lib/data/company-core", () => ({ listCompanyCoreCycles: vi.fn(), getAiJobOperationalStatus: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((href: string) => { throw new Error(`REDIRECT:${href}`); }) }));

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


const cycle = (state: string, id = "cycle-1") => ({ id, state, needTitle: "Entrega", projectTitle: "Projeto" });

beforeEach(() => vi.resetAllMocks());

describe("current operation projection", () => {
  test.each([
    ["NEED_CREATED", "DEFINE_AGREEMENT", "CAN_CONTINUE"],
    ["AGREEMENT_DEFINED", "AUTHORIZE_WORK", "NEEDS_HUMAN"],
    ["WORK_AUTHORIZED", "WAIT_FOR_EXECUTION", "IN_PROGRESS"],
    ["AI_RUNNING", "WAIT_FOR_EXECUTION", "IN_PROGRESS"],
    ["AI_COMPLETED", "RECORD_RESULT", "NEEDS_HUMAN"],
    ["RESULT_RECORDED", "RECORD_EVALUATION", "NEEDS_HUMAN"],
    ["EVALUATION_RECORDED", "RECORD_CONSEQUENCE", "NEEDS_HUMAN"],
  ])("projects %s without executing work", (state, action, mode) => {
    expect(projectCompanyCoreOperation(cycle(state))).toMatchObject({ action, mode, href: "/company-core/cycle-1" });
  });
  test("reconciliation remains uncertain and blocked", () => {
    expect(projectCompanyCoreOperation({ ...cycle("AI_RUNNING"), aiJobState: "NEEDS_RECONCILIATION" }))
      .toMatchObject({ action: "RECONCILE_EXECUTION", mode: "BLOCKED", description: expect.stringContaining("incerto") });
  });
  test("failure-path remains explicit", () => {
    expect(projectCompanyCoreOperation(cycle("AI_FAILED")))
      .toMatchObject({ action: "RECORD_RESULT", description: expect.stringContaining("A IA falhou") });
  });
  test("unknown state is diagnostic, with no invented executable action", () => {
    expect(projectCompanyCoreOperation(cycle("UNEXPECTED")))
      .toMatchObject({ action: "UNRECOGNIZED_STATE", mode: "BLOCKED", observedState: "UNEXPECTED" });
  });
  test("complete cycles and completed projects are not pending work", () => {
    const project = projectFixture(); project.stage = "COMPLETED";
    expect(composeCurrentOperation([cycle("CLOSED"), cycle("CONSEQUENCE_RECORDED")], [project])).toEqual([]);
  });
  test.each([
    ["SUBMITTED", false, "HUMAN_ACCEPTANCE", "NEEDS_HUMAN"],
    ["ACCEPTED", false, "STATE_GAP", "BLOCKED"],
    ["ACCEPTED", true, "EXECUTE_COMMITMENT", "CAN_CONTINUE"],
  ] as const)("composes Workbench %s / commitment=%s", (state, hasCommitment, action, mode) => {
    const project = projectFixture(); addOpenOpportunity(project); addAcceptedCommitment(project);
    project.proposals[0]!.state = state;
    if (!hasCommitment) project.commitments = [];
    expect(projectWorkbenchOperations(project)).toMatchObject([{ action, mode }]);
  });
  test("preserves simultaneous opportunities and proposals within one project", () => {
    const project = projectFixture(); addOpenOpportunity(project); addAcceptedCommitment(project);
    project.proposals.push({ ...project.proposals[0]!, id: "proposal-2", state: "SUBMITTED" });
    project.opportunities.push({ ...project.opportunities[0]!, id: "opp-2", title: "Outra intenção" });
    const items = composeCurrentOperation([cycle("NEED_CREATED")], [project]);
    expect(items).toHaveLength(4);
    expect(items.map((item) => item.action)).toEqual(expect.arrayContaining(["DEFINE_AGREEMENT", "EXECUTE_COMMITMENT", "HUMAN_ACCEPTANCE", "SUBMIT_PROPOSAL"]));
    expect(items.every((item) => !("priority" in item) && !("rank" in item))).toBe(true);
    project.proposals.reverse(); project.opportunities.reverse();
    expect(composeCurrentOperation([cycle("NEED_CREATED")], [project])).toEqual(items);
  });
  test("distinct contexts sharing an agent-registration link both remain visible", () => {
    const project = projectFixture(); addOpenOpportunity(project);
    project.actors = project.actors.filter((actor) => actor.kind === "PERSON");
    project.opportunities.push({ ...project.opportunities[0]!, id: "opp-2", title: "Outra intenção" });
    const items = projectWorkbenchOperations(project);
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.action === "REGISTER_AGENT")).toBe(true);
    expect(new Set(items.map((item) => item.sourceId)).size).toBe(2);
  });
  test("closed opportunity without a commitment does not create pending work", () => {
    const project = projectFixture(); addOpenOpportunity(project); project.opportunities[0]!.state = "CLOSED";
    expect(projectWorkbenchOperations(project)).toEqual([]);
    addAcceptedCommitment(project);
    expect(projectWorkbenchOperations(project)[0]?.action).toBe("EXECUTE_COMMITMENT");
  });
  test("parallel contribution claims retain separate continuations and real verification routes", () => {
    const project = projectFixture(); addOpenOpportunity(project); addAcceptedCommitment(project);
    project.contributions = [{ id: "contribution-1", commitmentId: "commitment-1", authorActorId: "agent-1", description: "Entrega", limitations: "Limitada", submittedAt: "2026-09-27" }];
    project.claims = ["claim-1", "claim-2"].map((id) => ({ id, subjectType: "CONTRIBUTION", subjectId: "contribution-1", authorActorId: "agent-1", statement: "Afirmação", scopeDescription: "Escopo", state: "RECORDED", createdAt: "2026-09-27" }));
    project.evidenceLinks = [{ id: "link-1", claimId: "claim-1", evidenceItemId: "evidence-1", relation: "SUPPORTS", declaredByActorId: "human-1" }];
    let items = projectWorkbenchOperations(project);
    expect(items).toHaveLength(2);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "REQUEST_VERIFICATION", href: "/claims/claim-1/verify" }),
      expect.objectContaining({ action: "HUMAN_DECISION", href: "/workbench#claim-claim-2" }),
    ]));
    project.verificationRequests = [{ id: "request-1", claimId: "claim-1", requesterActorId: "human-1", reviewerActorId: "human-1", criteria: "Critério", expectedMethod: "manual", conflictCodes: [], independence: "NON_INDEPENDENT", state: "OPEN", createdAt: "2026-09-27" }];
    items = projectWorkbenchOperations(project);
    expect(items).toEqual(expect.arrayContaining([expect.objectContaining({ action: "ISSUE_VERIFICATION", href: "/verifications/request-1" })]));
    project.verificationRequests[0]!.state = "UNEXPECTED" as typeof project.verificationRequests[number]["state"];
    expect(projectWorkbenchOperations(project)).toEqual(expect.arrayContaining([expect.objectContaining({ action: "UNRECOGNIZED_STATE", mode: "BLOCKED" })]));
  });
  test("unknown Workbench state does not become an action", () => {
    const project = projectFixture(); addOpenOpportunity(project);
    project.opportunities[0]!.state = "UNEXPECTED" as typeof project.opportunities[number]["state"];
    expect(projectWorkbenchOperations(project)).toMatchObject([{ action: "UNRECOGNIZED_STATE", mode: "BLOCKED", observedState: "UNEXPECTED" }]);
  });
});

function readyIdentity() {
  vi.mocked(getMyProfile).mockResolvedValue({ status: "READY", profile: {
    displayName: "Perfil escolhido", actorName: "Pessoa atribuível", actorId: "person-1", handle: null, bio: "", visibility: "PRIVATE",
  } });
  vi.mocked(getWorkbenchData).mockResolvedValue({ status: "READY", projects: [] });
  vi.mocked(listCompanyCoreCycles).mockResolvedValue([]);
}
function storedCycle(state: string, ownerActorId = "person-1") {
  return { ...cycle(state), ownerActorId, aiRunId: "run-1" } as Awaited<ReturnType<typeof listCompanyCoreCycles>>[number];
}

describe("current operation readers and page", () => {
  test("anonymous identity does not load contexts and redirects to login", async () => {
    vi.mocked(getMyProfile).mockResolvedValue({ status: "ANONYMOUS" });
    await expect(OperatePage()).rejects.toThrow("REDIRECT:/login?next=/operate");
    expect(getWorkbenchData).not.toHaveBeenCalled(); expect(listCompanyCoreCycles).not.toHaveBeenCalled();
  });
  test("missing PERSON stops composition without inventing identity", async () => {
    vi.mocked(getMyProfile).mockRejectedValue(new Error("PERSON ausente"));
    const html = renderToStaticMarkup(await OperatePage());
    expect(html).toContain("Nenhuma continuação foi presumida");
    expect(getWorkbenchData).not.toHaveBeenCalled();
  });
  test("only owned cycles are composed; operational job status is read when material", async () => {
    readyIdentity();
    vi.mocked(listCompanyCoreCycles).mockResolvedValue([storedCycle("AI_RUNNING"), { ...storedCycle("AI_RUNNING", "another-person"), id: "other" }, { ...storedCycle("AI_FAILED"), id: "failed" }]);
    vi.mocked(getAiJobOperationalStatus).mockResolvedValue({ state: "NEEDS_RECONCILIATION", failureCode: null });
    const data = await getCurrentOperation();
    expect(data.items).toHaveLength(2);
    expect(getAiJobOperationalStatus).toHaveBeenCalledExactlyOnceWith("run-1");
    expect(data.items).toEqual(expect.arrayContaining([expect.objectContaining({ mode: "BLOCKED" }), expect.objectContaining({ description: expect.stringContaining("A IA falhou") })]));
  });
  test("page renders legitimate identity, both sources, and existing continuation links", async () => {
    readyIdentity();
    const project = projectFixture(); addOpenOpportunity(project); addAcceptedCommitment(project);
    vi.mocked(getWorkbenchData).mockResolvedValue({ status: "READY", projects: [project] });
    vi.mocked(listCompanyCoreCycles).mockResolvedValue([storedCycle("NEED_CREATED")]);
    const html = renderToStaticMarkup(await OperatePage());
    expect(html).toContain("Pessoa atribuível"); expect(html).toContain("Perfil escolhido");
    expect(html).toContain('href="/company-core/cycle-1"');
    expect(html).toContain('href="/workbench#commitment-commitment-1"');
    expect(html).toContain("sem ordem de importância"); expect(html).not.toContain("<form");
  });
  test("unknown runtime state renders without an executable form", async () => {
    readyIdentity(); vi.mocked(listCompanyCoreCycles).mockResolvedValue([storedCycle("UNEXPECTED")]);
    const html = renderToStaticMarkup(await OperatePage());
    expect(html).toContain("UNEXPECTED"); expect(html).toContain("Consultar contexto"); expect(html).not.toContain("Abrir continuação");
  });
});
