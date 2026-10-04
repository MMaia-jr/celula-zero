// SPDX-License-Identifier: MPL-2.0
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { ZodError, z } from "zod";
import { resolvePerson } from "@cz/identity";
import { LocalStore } from "./local-store";
import { assertNoCompetingFoundationStore, logFoundationStorePath, resolveFoundationStorePath } from "./foundation-db-path";
import {
  actorFor,
  applyCommand,
  beginIntelligenceTurn,
  bootstrapFoundation,
  completeIntelligenceTurn,
  executeHumanAuthorizedWorkAction,
  expireStaleIntelligenceTurns,
  failIntelligenceTurn,
  retryIntelligenceTurn,
  hasInstitutionalState,
  isEmptyFoundation,
  projection,
  rejectActionRequest,
  respondToInterpretation,
  type ExecutionJob,
  type FoundationState,
} from "./foundation";
import { authenticateHuly } from "./huly-auth";
import { compileInstitutionalContext } from "./essenthius/context";
import { codexCliAuthenticated, discoverHabitatCapabilities, discoverHabitatConnections, discoverHabitatResources, projectCurrentCapabilities, type CurrentCapability } from "./essenthius/capabilities";
import { readActiveDirection } from "./essenthius/active-direction";
import { projectAuthorizedExternalResources, projectConnectedWorld } from "./essenthius/connected-world";
import { parseConnectionFabricState } from "@cz/connection-fabric";
import { canonicalSourceExcerpts } from "./essenthius/canonical-sources";
import { CodexCliAdapter, codexPromptMetrics } from "./essenthius/codex-cli";
import { OllamaLocalAdapter } from "./essenthius/ollama-local";
import { selectModelProvider, type ModelPreference } from "./essenthius/model-preference";
import { acceptSelectedProfileFields, type ProfileDraftProposal } from "./essenthius/profile-assistance";
import { applyMetabolismAction, metabolismActionSchema, recordWorkContribution } from "./metabolism";
import { createTaskCapsule, type TaskCapsule } from "../../web/lib/domain/task-capsule";
import { executionPlanSchema, executeInIsolatedWorktree, executionResultFileNameSchema } from "./execution-workspace";
import { completeExecutionJob, expireStaleExecutionJobs, failExecutionJob } from "./execution-state";
import { canAct } from "@cz/authority";
import { digestRecoveryValue, parseRecoveryState, recoverySummary, recoveryEnvelopeSchema } from "./recovery";

const authorizedEpisodeSchema = z.object({
  sourceRecordId: z.string().min(1).max(160), requestKey: z.string().regex(/^[a-zA-Z0-9-]{16,80}$/), confirmed: z.literal(true), finalAuthorization: z.literal("AUTHORIZE_EXACT_CHAIN_AND_CODEX_EXECUTION"),
  projectTitle: z.string().trim().min(4).max(100), interpretation: z.string().trim().min(10).max(2000),
  opportunityTitle: z.string().trim().min(4).max(120), opportunityStatement: z.string().trim().min(10).max(2000), opportunityConditions: z.string().trim().min(4).max(2000), expectedResult: z.string().trim().min(4).max(1000),
  proposalStatement: z.string().trim().min(10).max(2000), proposalConditions: z.string().trim().min(4).max(2000), expectedDelivery: z.string().trim().min(4).max(1000),
  agreementScope: z.string().trim().min(3).max(2000), exclusions: z.string().trim().max(2000), dependencies: z.string().trim().max(2000), evaluationCriterion: z.string().trim().min(3).max(2000),
  canonicalBase: z.string().regex(/^[a-f0-9]{40}$/), allowedPaths: z.array(z.string().trim().min(1).max(240)).min(1).max(8), validations: z.unknown(),
}).strict();

let store: LocalStore | undefined;
const cookie = "cz_foundation_session";
function database() {
  if (store) return store;
  const path = resolveFoundationStorePath();
  assertNoCompetingFoundationStore(path);
  logFoundationStorePath(path);
  store = new LocalStore(path);
  return store;
}
function allowed(request: NextRequest): boolean {
  const host = request.headers.get("host");
  return (
    process.env.CZ_LOCAL_FOUNDATION === "1" &&
    !!host &&
    /^(127\.0\.0\.1|localhost):[0-9]+$/.test(host)
  );
}
function currentView(state: FoundationState, principal: { provider: string; subject: string }) {
  if (principal.provider !== "huly") throw new Error("IDENTITY_UNRESOLVED");
  const active = state.credentials.filter(
    (credential) => credential.provider === "huly" && credential.subject === principal.subject && credential.status === "active",
  );
  if (active.length > 1) throw new Error("CZ_IDENTITY_AMBIGUOUS");
  if (active.length === 0) {
    if (!isEmptyFoundation(state)) throw new Error("IDENTITY_UNRESOLVED");
    return { view: null, authenticated: true, bootstrapRequired: true } as const;
  }
  const personId = resolvePerson(state.credentials, principal.provider, principal.subject);
  if (!hasInstitutionalState(state) || state.person.id !== personId)
    throw new Error("IDENTITY_UNRESOLVED");
  return {
    view: projection(state, personId),
    authenticated: true,
    bootstrapRequired: false,
  } as const;
}
function currentActor(state: FoundationState, principal: { provider: string; subject: string }) {
  if (!hasInstitutionalState(state)) throw new Error("BOOTSTRAP_REQUIRED");
  return actorFor(state, principal.provider, principal.subject);
}
async function repositoryHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8", timeout: 2500 }).trim();
}
function repositoryStateReadback() {
  const git = (args: string[]) => execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8", timeout: 2500, maxBuffer: 64_000 }).trim();
  const localHead = git(["rev-parse", "HEAD"]);
  let canonicalHead: string | null = null;
  try { canonicalHead = git(["rev-parse", "origin/main"]); } catch { /* Canonical remote-tracking ref is not present in this checkout. */ }
  const status = git(["status", "--porcelain=v1", "--untracked-files=normal"]);
  return { localHead, canonicalHead, workingTreeDirty: status.length > 0, changedPathCount: status ? status.split("\n").length : 0 };
}
async function capabilitiesFor(view: NonNullable<ReturnType<typeof currentView>["view"]>, state: FoundationState) {
  const repositoryState = repositoryStateReadback();
  const head = repositoryState.localHead;
  const capabilities = await discoverHabitatCapabilities(view.experiences.map((experience) => ({ id: experience.id, title: experience.title, provenance: experience.provenance.origin })));
  const codex = capabilities.find((capability) => capability.id === "executor:codex-cli");
  const model = capabilities.find((capability) => capability.id === "provider:ollama-local");
  const codexAuthenticated = codex?.provenanceStatus.startsWith("CLI_AUTH_READBACK") ?? false;
  const institutionalCapabilities = projectCurrentCapabilities({
    codexAuthenticated,
    localModelInstalled: model?.provenanceStatus.startsWith("MODEL_PRESENT") ?? false,
    hulyConfigured: Boolean(process.env.CZ_HULY_ACCOUNTS_URL),
    hasOpenWork: (view.workItems ?? []).some((work) => work.status === "active"),
    hasIntentions: view.records.some((record) => record.kind === "OriginalRecord" && record.purpose === "intention"),
    hasProjects: (view.projects ?? []).length > 0,
    hasOpenOpportunities: (view.projects ?? []).some((project) => project.opportunities.some((opportunity) => opportunity.state === "OPEN")),
    hasSubmittedProposals: (view.projects ?? []).some((project) => project.proposals.some((proposal) => proposal.state === "SUBMITTED")),
    hasCommitments: (view.projects ?? []).some((project) => project.commitments.length > 0),
    hasEvidenceEligibleClaims: (view.projects ?? []).some((project) => project.claims.some((claim) => project.artifacts.some((artifact) => claim.subjectType === "CONTRIBUTION" && artifact.contributionId === claim.subjectId))),
    hasCompletedWork: (view.workItems ?? []).some((work) => work.status === "complete"),
    hasEligibleExecutionAgreement: (view.projects ?? []).some((project) => project.commitments.some((commitment) => view.agreements?.some((agreement) => agreement.commitmentId === commitment.id))),
  });
  const connectionState = parseConnectionFabricState(state);
  const externalProviders = projectConnectedWorld(connectionState);
  const externalCapabilities = externalProviders.flatMap((provider) => provider.capabilities.map((capability) => ({
    id: `external:${capability.id}`,
    label: `${provider.label}: ${capability.label}`,
    enables: capability.enables,
    provider: provider.label,
    resource: capability.resourceType,
    latency: capability.latency,
    risk: capability.risk,
    reversibility: capability.reversible ? "YES" as const : "NO" as const,
    approvalPolicy: capability.approvalPolicy as CurrentCapability["approvalPolicy"],
    provenance: capability.provenance,
    readWrite: capability.access === "READ" ? "READ_ONLY" as const : capability.access === "DRAFT" ? "DRAFT_ONLY" as const : "WRITE_AFTER_HUMAN_CONFIRMATION" as const,
    authorityRequired: capability.authorityRequired,
    costUsageClass: "Custo externo desconhecido até existir conexão e leitura de condições do provedor.",
    availability: capability.availability,
    reason: `${provider.status === "NOT_CONNECTED" ? "Conta real não conectada. " : ""}${capability.reason} Adaptador sandbox serve somente para testes contratuais e não representa uma conta real.`,
    actionEntrypoint: null,
  })));
  const currentCapabilities = [...institutionalCapabilities, ...externalCapabilities];
  const connections = discoverHabitatConnections({
    ollamaAvailable: model?.availability !== "UNAVAILABLE",
    selectedModelAvailable: model?.provenanceStatus.startsWith("MODEL_PRESENT") ?? false,
    ollamaInteractive: model?.availability === "LOCAL_ONLY",
    codexAuthenticated,
  });
  const localResources = discoverHabitatResources({
    personId: view.person.id,
    cellId: view.cell?.id ?? "unresolved",
    openWorkIds: (view.workItems ?? []).filter((work) => work.status === "active").map((work) => work.id),
    recordIds: view.records.map((record) => record.id),
    head,
    projects: view.projects ?? [],
  });
  const externalResources = projectAuthorizedExternalResources({
    state: connectionState,
    personId: view.person.id,
    cellId: view.cell?.id ?? "unresolved",
    canReadCell: Boolean(view.cell && canAct(view.person.id, view.cell.id, "cell.read", state.memberships, state.authorities)),
    canManageConnections: Boolean(view.cell && canAct(view.person.id, view.cell.id, "cell.update", state.memberships, state.authorities)),
  });
  const resources = [...localResources, ...externalResources];
  return { head, canonicalHead: repositoryState.canonicalHead, repositoryState, capabilities, currentCapabilities, externalProviders, connections, resources, activeDirection: readActiveDirection() };
}
function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(cookie, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}

export async function handle(request: NextRequest) {
  if (!allowed(request))
    return NextResponse.json({ error: "A entrada local de Célula Zero não está habilitada." }, { status: 503 });
  const token = request.cookies.get(cookie)?.value;
  if (
    request.method === "POST" &&
    request.headers.get("origin") !== `http://${request.headers.get("host")}`
  ) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });

  try {
    const db = database();
    const principal = db.sessionIdentity(token);
    if (request.method === "GET") {
      if (!principal) return NextResponse.json({ view: null, authenticated: false, bootstrapRequired: false });
      let state = db.read();
      const preview = hasInstitutionalState(state)
        ? expireStaleExecutionJobs(expireStaleIntelligenceTurns(state, new Date().toISOString()), new Date().toISOString())
        : state;
      if (preview !== state) {
        state = db.transact((current) => {
          const at = new Date().toISOString();
          const recovered = hasInstitutionalState(current)
            ? expireStaleExecutionJobs(expireStaleIntelligenceTurns(current, at), at)
            : current;
          return { state: recovered, result: recovered };
        });
      }
      const result = currentView(state, principal);
      if (request.nextUrl.searchParams.get("capabilities") === "1") {
        if (!result.view) return NextResponse.json({ capabilities: [], authenticated: true, bootstrapRequired: true });
        return NextResponse.json({ ...(await capabilitiesFor(result.view, state)), authenticated: true });
      }
      const executionId = request.nextUrl.searchParams.get("execution-delta") ?? request.nextUrl.searchParams.get("execution-result");
      if (executionId) {
        const job = (state.executionJobs ?? []).find((item) => item.id === executionId && item.requestedByActorId === result.view?.person.id);
        if (!job || job.status !== "COMPLETED") return NextResponse.json({ error: "Esse resultado de execução não está disponível nesta Célula." }, { status: 404 });
        if (request.nextUrl.searchParams.has("execution-result")) {
          const filename = executionResultFileNameSchema.parse(job.resultFileName);
          let body: Buffer;
          try { body = await readFile(resolve(".data/execution-results", filename)); }
          catch { return NextResponse.json({ error: "O arquivo preservado do Result Package não está disponível." }, { status: 410 }); }
          if (createHash("sha256").update(body).digest("hex") !== job.resultDigest) return NextResponse.json({ error: "O digest do Result Package não confere com o registro local." }, { status: 409 });
          const stored = JSON.parse(body.toString("utf8")) as { result?: unknown; fabric?: unknown; deltaDigest?: unknown; capturedAt?: unknown };
          if (!stored.result || typeof stored.result !== "object" || !stored.fabric || stored.deltaDigest !== job.deltaDigest) return NextResponse.json({ error: "O conteúdo preservado não corresponde ao trabalho registrado." }, { status: 409 });
          return NextResponse.json({ result: stored.result, digest: job.resultDigest, deltaDigest: job.deltaDigest, fabric: stored.fabric, capturedAt: stored.capturedAt });
        }
        const filename = executionResultFileNameSchema.parse(job.deltaFileName);
        let body: Buffer;
        try { body = await readFile(resolve(".data/execution-results", filename)); }
        catch { return NextResponse.json({ error: "O delta preservado não está disponível." }, { status: 410 }); }
        if (createHash("sha256").update(body).digest("hex") !== job.deltaDigest) return NextResponse.json({ error: "O digest do delta não confere com o registro local." }, { status: 409 });
        return new NextResponse(new Uint8Array(body), { headers: { "Content-Type": "application/vnd.cz.execution-delta+json", "Content-Disposition": `attachment; filename="${filename}"` } });
      }
      if (request.nextUrl.searchParams.get("export") === "1") {
        if (!result.view) return NextResponse.json({ error: "Entre em Célula Zero primeiro." }, { status: 409 });
        return new NextResponse(JSON.stringify({
          ...result.view,
          exportedAt: new Date().toISOString(),
          boundary: "Local Foundation snapshot; not identity verification or a production backup.",
        }, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": 'attachment; filename="cz-foundation.json"',
          },
        });
      }
      if (request.nextUrl.searchParams.get("recovery") === "1") {
        if (!result.view) return NextResponse.json({ error: "Entre em Célula Zero primeiro." }, { status: 409 });
        const state = db.read();
        return NextResponse.json({
          schema: "cz.foundation.recovery.v1",
          exportedAt: new Date().toISOString(),
          state,
          boundary: "Snapshot local completo, incluindo vínculo de identidade; não inclui sessões nem segredos e não concede autoridade. A restauração exige a mesma conta Huly e confirmação explícita.",
        }, { headers: { "Cache-Control": "no-store" } });
      }
      return NextResponse.json(result);
    }
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return NextResponse.json({ error: "Formato inválido." }, { status: 415 });
    const body = await request.text();
    if (Buffer.byteLength(body) > 5 * 1024 * 1024)
      return NextResponse.json({ error: "Texto muito longo." }, { status: 413 });
    const data: unknown = JSON.parse(body);
    if (!data || typeof data !== "object" || !("action" in data))
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    if (data.action !== "restore" && Buffer.byteLength(body) > 20_000)
      return NextResponse.json({ error: "Texto muito longo." }, { status: 413 });

    if (data.action === "login") {
      if (!("email" in data) || typeof data.email !== "string" || data.email.length > 320 ||
          !("password" in data) || typeof data.password !== "string" || data.password.length < 1 || data.password.length > 1024)
        return NextResponse.json({ error: "Informe seu e-mail e senha." }, { status: 400 });
      const accountsUrl = process.env.CZ_HULY_ACCOUNTS_URL;
      if (!accountsUrl) return NextResponse.json({ error: "A autenticação de Célula Zero não está configurada." }, { status: 503 });
      const authenticated = await authenticateHuly(accountsUrl, data.email, data.password);
      const session = db.createSession(authenticated.provider, authenticated.subject);
      return setSessionCookie(NextResponse.json({ ok: true }), session);
    }

    if (data.action === "leave") {
      if (token) db.revoke(token);
      const response = NextResponse.json({ ok: true, authenticated: false });
      response.cookies.delete(cookie);
      return response;
    }
    if (!principal)
      return NextResponse.json({ error: "Entre novamente para continuar." }, { status: 401 });

    if (data.action === "thread_model_preference") {
      const parsed = z.object({ action: z.literal("thread_model_preference"), threadId: z.string().min(1).max(180), preference: z.enum(["auto", "codex-cli", "ollama-local"]) }).strict().safeParse(data);
      if (!parsed.success) return NextResponse.json({ error: "A preferência de modelo está incompleta." }, { status: 400 });
      if (parsed.data.preference === "ollama-local") return NextResponse.json({ error: "O modelo local excede o limite de latência interativa deste host. AUTO continua sendo a alternativa disponível." }, { status: 409 });
      if (parsed.data.preference === "codex-cli" && !(await codexCliAuthenticated()).available) return NextResponse.json({ error: "Codex não está autenticado neste processo. Nenhuma preferência foi alterada; escolha AUTO quando uma capacidade estiver disponível." }, { status: 409 });
      const actor = currentActor(db.read(), principal);
      const view = db.transact((state) => {
        if (!hasInstitutionalState(state) || actor !== state.person.id || !state.cell || !canAct(actor, state.cell.id, "cell.update", state.memberships, state.authorities)) throw new Error("FORBIDDEN");
        const allowedThread = parsed.data.threadId === `cell:${state.cell.id}` || (parsed.data.threadId.startsWith("meeting:") && state.meetings?.some((meeting) => `meeting:${meeting.id}` === parsed.data.threadId && meeting.cellId === state.cell!.id && meeting.hostPersonId === actor));
        if (!allowedThread) throw new Error("THREAD_NOT_AVAILABLE");
        const next = structuredClone(state);
        next.threadModelPreferences ??= {};
        next.threadModelPreferences[parsed.data.threadId] = parsed.data.preference;
        return { state: next, result: projection(next, actor) };
      });
      return NextResponse.json({ view, authenticated: true });
    }

    if (data.action === "profile_draft") {
      const parsed = z.object({ action: z.literal("profile_draft"), threadId: z.string().min(1).max(180) }).strict().safeParse(data);
      if (!parsed.success) return NextResponse.json({ error: "Não foi possível preparar o rascunho." }, { status: 400 });
      const state = db.read();
      const actor = currentActor(state, principal);
      if (!hasInstitutionalState(state) || actor !== state.person.id || !state.cell || !canAct(actor, state.cell.id, "cell.update", state.memberships, state.authorities)) return NextResponse.json({ error: "Sua autoridade atual não permite preparar esse rascunho." }, { status: 403 });
      const threadIsAvailable = parsed.data.threadId === `cell:${state.cell.id}` || (parsed.data.threadId.startsWith("meeting:") && state.meetings?.some((meeting) => `meeting:${meeting.id}` === parsed.data.threadId && meeting.cellId === state.cell!.id && meeting.hostPersonId === actor));
      if (!threadIsAvailable) return NextResponse.json({ error: "Esta conversa não está disponível para preparar o rascunho." }, { status: 404 });
      const view = projection(state, actor);
      const preference = state.threadModelPreferences?.[parsed.data.threadId] ?? "auto";
      const codexAuth = await codexCliAuthenticated();
      const selection = selectModelProvider({ preference, codexAuthenticated: codexAuth.available, localInteractive: false });
      if (!selection.provider) return NextResponse.json({ error: selection.reason, code: "PROFILE_ASSISTANCE_UNAVAILABLE" }, { status: 503 });
      if (selection.provider !== "codex-cli") return NextResponse.json({ error: "O provider local não atende ao limite de latência para esta assistência." }, { status: 503 });
      const sourceRecords = state.records.filter((record): record is Extract<(typeof state.records)[number], { kind: "OriginalRecord" }> => record.authorId === actor && record.kind === "OriginalRecord").slice(-20).map((record) => ({ id: record.id, purpose: record.purpose, content: record.content.slice(0, 1200) }));
      const startedAt = Date.now();
      const draft = await new CodexCliAdapter().draftProfile({
        current: { headline: view.profile.headline, bio: view.profile.bio },
        experiences: view.experiences.slice(-20).map(({ id, title, description }) => ({ id, title, description })),
        capabilities: (view.capabilities ?? []).map(({ id, name }) => ({ id, name })),
        contributions: (view.projects ?? []).flatMap((project) => project.contributions.filter((item) => item.authorActorId === actor).map((item) => ({ id: item.id, description: item.description }))).slice(-20),
        records: sourceRecords,
      }, AbortSignal.timeout(60_000));
      const allowedSources = new Set([...view.experiences.map((item) => item.id), ...(view.capabilities ?? []).map((item) => item.id), ...sourceRecords.map((item) => item.id), ...(view.projects ?? []).flatMap((project) => project.contributions.filter((item) => item.authorActorId === actor).map((item) => item.id))]);
      const proposals: ProfileDraftProposal[] = draft.fields.map((field) => ({ field: field.field, current: view.profile[field.field], proposed: field.proposed, sourceIds: field.sourceIds.filter((id) => allowedSources.has(id)), uncertainty: field.uncertainty, visibilityImpact: view.profile.visibility.scope === "private" ? "Este rascunho permanece privado; não amplia visibilidade." : "A visibilidade atual do perfil permanece inalterada." })).filter((field) => field.proposed !== field.current);
      return NextResponse.json({ profileDraft: proposals, provider: "codex-cli", model: selection.model, usage: { requestId: draft.requestId, inputTokens: draft.inputTokens, outputTokens: draft.outputTokens, durationMs: Date.now() - startedAt, cost: null }, authenticated: true });
    }

    if (data.action === "profile_accept") {
      const parsed = z.object({ action: z.literal("profile_accept"), fields: z.object({ headline: z.string().max(300).optional(), bio: z.string().max(3000).optional() }).strict().refine((fields) => Object.keys(fields).length > 0) }).strict().safeParse(data);
      if (!parsed.success) return NextResponse.json({ error: "Selecione ao menos um campo para aceitar." }, { status: 400 });
      const actor = currentActor(db.read(), principal);
      const view = db.transact((state) => {
        if (!hasInstitutionalState(state) || actor !== state.person.id || !state.cell || !canAct(actor, state.cell.id, "cell.update", state.memberships, state.authorities)) throw new Error("FORBIDDEN");
        const accepted = { ...(parsed.data.fields.headline !== undefined ? { headline: parsed.data.fields.headline } : {}), ...(parsed.data.fields.bio !== undefined ? { bio: parsed.data.fields.bio } : {}) };
        const merged = acceptSelectedProfileFields({ headline: state.profile.headline, bio: state.profile.bio }, [{ field: "headline", current: state.profile.headline, proposed: accepted.headline ?? "", sourceIds: [], uncertainty: "", visibilityImpact: "" }, { field: "bio", current: state.profile.bio, proposed: accepted.bio ?? "", sourceIds: [], uncertainty: "", visibilityImpact: "" }], accepted);
        const next = applyCommand(state, actor, { type: "profile", headline: merged.headline, bio: merged.bio, visibility: state.profile.visibility.scope === "cell" ? "cell" : "private" }, randomUUID(), randomUUID, new Date().toISOString());
        return { state: next, result: projection(next, actor) };
      });
      return NextResponse.json({ view, authenticated: true, accepted: true });
    }

    if (data.action === "experience_accept") {
      const parsed = z.object({ action: z.literal("experience_accept"), turnId: z.string().min(1).max(160), title: z.string().trim().min(1).max(160), description: z.string().trim().min(1).max(2000), occurredOn: z.iso.date().nullable() }).strict().safeParse(data);
      if (!parsed.success) return NextResponse.json({ error: "Revise o título e o relato antes de incluir esta experiência." }, { status: 400 });
      const actor = currentActor(db.read(), principal);
      const view = db.transact((state) => {
        if (!hasInstitutionalState(state) || actor !== state.person.id || !state.cell || !canAct(actor, state.cell.id, "cell.update", state.memberships, state.authorities)) throw new Error("FORBIDDEN");
        const turn = state.intelligenceTurns?.find((item) => item.id === parsed.data.turnId && item.actorId === actor && item.status === "interpreted");
        const source = turn?.humanMessageId ? state.conversationMessages?.find((message) => message.id === turn.humanMessageId && message.authorId === actor) : undefined;
        const interpretationRecord = turn?.interpretationRecordId ? state.records.find((record) => record.id === turn.interpretationRecordId && record.kind === "Interpretation") : undefined;
        if (!source || !interpretationRecord || !("content" in interpretationRecord)) throw new Error("EXPERIENCE_SOURCE_UNAVAILABLE");
        let interpretation: unknown;
        try { interpretation = JSON.parse(interpretationRecord.content); } catch { throw new Error("EXPERIENCE_DRAFT_UNAVAILABLE"); }
        const proposal = z.object({ experienceProposal: z.object({ title: z.string(), description: z.string(), occurredOn: z.iso.date().nullable(), uncertainty: z.string() }).strict() }).passthrough().safeParse(interpretation);
        if (!proposal.success) throw new Error("EXPERIENCE_DRAFT_UNAVAILABLE");
        const alreadyAccepted = state.records.some((record) => {
          if (record.kind !== "OriginalRecord" || record.purpose !== "experience" || record.authorId !== actor) return false;
          try { return JSON.parse(record.content).sourceMessageId === source.id; } catch { return false; }
        });
        if (alreadyAccepted) return { state, result: projection(state, actor) };
        const next = applyCommand(state, actor, { type: "experience", title: parsed.data.title, description: parsed.data.description, occurredOn: parsed.data.occurredOn, sourceMessageId: source.id }, randomUUID(), randomUUID, new Date().toISOString());
        return { state: next, result: projection(next, actor) };
      });
      return NextResponse.json({ view, authenticated: true, experienceAccepted: true });
    }

    if (data.action === "restore") {
      const restoreBody = data as Record<string, unknown>;
      if ((restoreBody.phase !== "preview" && restoreBody.phase !== "apply") || !("snapshot" in restoreBody))
        return NextResponse.json({ error: "O arquivo de recuperação está incompleto." }, { status: 400 });
      const envelope = recoveryEnvelopeSchema.parse(restoreBody.snapshot);
      const current = db.read();
      const restored = parseRecoveryState(envelope, principal, current);
      const snapshotDigest = digestRecoveryValue(envelope);
      if (restoreBody.phase === "preview") {
        return NextResponse.json({ preview: true, snapshotDigest, currentStateDigest: digestRecoveryValue(current), summary: recoverySummary(restored), conflict: false });
      }
      if (restoreBody.confirmed !== true || restoreBody.snapshotDigest !== snapshotDigest || restoreBody.currentStateDigest !== digestRecoveryValue(current))
        return NextResponse.json({ error: "O estado mudou desde a leitura prévia. Recarregue o arquivo e revise novamente." }, { status: 409 });
      if (hasInstitutionalState(current) && !canAct(currentActor(current, principal), current.cell!.id, "cell.update", current.memberships, current.authorities))
        return NextResponse.json({ error: "Sua autoridade atual não permite restaurar este estado." }, { status: 403 });
      const backupName = `foundation-before-restore-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.sqlite`;
      const backupPath = `${resolveFoundationStorePath()}.recovery-backups/${backupName}`;
      await db.backupTo(backupPath);
      db.transact(() => ({ state: restored, result: null }));
      const readback = db.read();
      if (digestRecoveryValue(readback) !== digestRecoveryValue(restored))
        return NextResponse.json({ error: "A leitura posterior não corresponde ao arquivo restaurado. O backup anterior foi preservado." }, { status: 500 });
      return NextResponse.json({ restored: true, summary: recoverySummary(readback), backupName });
    }

    if (data.action === "metabolism") {
      if (!("metabolism" in data)) return NextResponse.json({ error: "A ação da Célula está incompleta." }, { status: 400 });
      const action = metabolismActionSchema.parse(data.metabolism);
      const actor = currentActor(db.read(), principal);
      const view = db.transact((state) => {
        if (!hasInstitutionalState(state)) throw new Error("BOOTSTRAP_REQUIRED");
        const next = applyMetabolismAction(state, actor, action, randomUUID, new Date().toISOString());
        if (!hasInstitutionalState(next)) throw new Error("IDENTITY_UNRESOLVED");
        return { state: next, result: projection(next, actor) };
      });
      return NextResponse.json({ view, authenticated: true, actionApplied: true });
    }

    if (data.action === "authorize_operational_episode") {
      const episode = authorizedEpisodeSchema.parse(data);
      const plan = executionPlanSchema.parse({ canonicalBase: episode.canonicalBase, allowedPaths: episode.allowedPaths, validations: episode.validations, confirmed: true });
      if (plan.canonicalBase !== await repositoryHead()) throw new Error("EXECUTION_BASE_STALE");
      const actor = currentActor(db.read(), principal);
      const authorizationDigest = createHash("sha256").update(JSON.stringify(episode)).digest("hex");
      const prepared = db.transact<{ job: ExecutionJob; capsule: TaskCapsule; agreement: { id: string; digest: string; expectedResult: string; scope: string; exclusions: string; dependencies: string; evaluationCriterion: string }; repeated: boolean }>((state) => {
        if (!hasInstitutionalState(state) || !canAct(actor, state.cell!.id, "cell.update", state.memberships, state.authorities)) throw new Error("FORBIDDEN");
        const prior = (state.executionJobs ?? []).find((job) => job.requestKey === episode.requestKey);
        if (prior) {
          if (prior.authorizationDigest !== authorizationDigest || prior.requestedByActorId !== actor) throw new Error("REQUEST_KEY_CONFLICT");
          if (prior.status === "COMPLETED") {
            const project = state.projects?.find((item) => item.id === prior.projectId);
            const agreement = state.agreements?.find((item) => item.id === prior.agreementId);
            if (!project || !agreement) throw new Error("EXECUTION_JOB_STATE_INCOMPLETE");
            return { state, result: { job: prior, capsule: createTaskCapsule(project, prior.commitmentId), agreement: { id: agreement.id, digest: prior.agreementDigest, expectedResult: agreement.expectedResult, scope: agreement.scope, exclusions: agreement.exclusions, dependencies: agreement.dependencies, evaluationCriterion: agreement.evaluationCriterion }, repeated: true } };
          }
          throw new Error(prior.status === "RUNNING" ? "EXECUTION_ALREADY_RUNNING" : "EXECUTION_PREVIOUSLY_FAILED");
        }
        const source = state.records.find((record) => record.id === episode.sourceRecordId && record.kind === "OriginalRecord" && record.authorId === actor && (record.purpose === "intention" || record.purpose === "human_speech"));
        if (!source || source.kind !== "OriginalRecord") throw new Error("OPERATIONAL_EPISODE_SOURCE_NOT_OWNED");
        let next = applyMetabolismAction(state, actor, { type: "project_create", sourceRecordId: source.id, title: episode.projectTitle, requestKey: `${episode.requestKey}-project` }, randomUUID, new Date().toISOString());
        const project = next.projects?.find((item) => item.events.some((event) => event.payload.sourceRecordId === source.id));
        if (!project) throw new Error("OPERATIONAL_PROJECT_NOT_CREATED");
        next = applyMetabolismAction(next, actor, { type: "opportunity_open", projectId: project.id, title: episode.opportunityTitle, statement: episode.opportunityStatement, conditions: episode.opportunityConditions, expectedResult: episode.expectedResult, requestKey: `${episode.requestKey}-opportunity` }, randomUUID, new Date().toISOString());
        const opportunity = next.projects!.find((item) => item.id === project.id)!.opportunities.at(-1)!;
        next = applyMetabolismAction(next, actor, { type: "proposal_submit", projectId: project.id, opportunityId: opportunity.id, statement: episode.proposalStatement, conditions: episode.proposalConditions, expectedDelivery: episode.expectedDelivery, requestKey: `${episode.requestKey}-proposal` }, randomUUID, new Date().toISOString());
        const proposal = next.projects!.find((item) => item.id === project.id)!.proposals.at(-1)!;
        next = applyMetabolismAction(next, actor, { type: "proposal_decide", projectId: project.id, proposalId: proposal.id, disposition: "accept", requestKey: `${episode.requestKey}-commitment` }, randomUUID, new Date().toISOString());
        const committedProject = next.projects!.find((item) => item.id === project.id)!;
        const commitment = committedProject.commitments.at(-1)!;
        const work = next.workItems!.find((item) => item.commitmentId === commitment.id)!;
        next = applyMetabolismAction(next, actor, { type: "agreement_define", projectId: project.id, commitmentId: commitment.id, scope: episode.agreementScope, exclusions: episode.exclusions, dependencies: episode.dependencies, evaluationCriterion: episode.evaluationCriterion, requestKey: `${episode.requestKey}-agreement` }, randomUUID, new Date().toISOString());
        const agreement = next.agreements!.find((item) => item.commitmentId === commitment.id)!;
        const capsule = createTaskCapsule(committedProject, commitment.id);
        if (work.taskCapsuleDigest !== capsule.digest) throw new Error("TASK_CAPSULE_CHANGED");
        const agreementDigest = createHash("sha256").update(JSON.stringify(agreement)).digest("hex");
        const job: ExecutionJob = { id: randomUUID(), workItemId: work.id, projectId: project.id, commitmentId: commitment.id, agreementId: agreement.id, agreementDigest, requestKey: episode.requestKey, authorizationDigest, requestedByActorId: actor, taskCapsuleDigest: capsule.digest, canonicalBase: plan.canonicalBase, allowedPaths: plan.allowedPaths, validations: plan.validations, status: "RUNNING", startedAt: new Date().toISOString() };
        const authorizationRecordId = randomUUID();
        next.records = [...next.records, { id: authorizationRecordId, kind: "OriginalRecord", purpose: "action_authorization", content: JSON.stringify({ finalAuthorization: episode.finalAuthorization, sourceRecordId: source.id, sourceDigest: createHash("sha256").update(source.content).digest("hex"), interpretation: episode.interpretation, projectId: project.id, opportunityId: opportunity.id, proposalId: proposal.id, commitmentId: commitment.id, agreementId: agreement.id, canonicalBase: plan.canonicalBase, allowedPaths: plan.allowedPaths, validations: plan.validations, network: "Codex sandbox workspace-write conforme configuração local; validações rodam fora dela em worktree temporário sem bloqueio de rede independente", cost: "Codex CLI usa autenticação existente; consumo de quota pode ocorrer; sem chave ou chamada direta de provider API", reversibility: "Disposable isolated worktree; result returned for Human evaluation.", notDone: ["No commit", "No push", "No PR", "No merge", "No deploy"], confirmedAt: job.startedAt }), authorId: actor, createdAt: job.startedAt, visibility: { scope: "cell", cellId: next.cell!.id } }];
        next.executionJobs ??= [];
        next.executionJobs.push(job);
        return { state: next, result: { job, capsule, agreement: { id: agreement.id, digest: agreementDigest, expectedResult: agreement.expectedResult, scope: agreement.scope, exclusions: agreement.exclusions, dependencies: agreement.dependencies, evaluationCriterion: agreement.evaluationCriterion }, repeated: false } };
      });
      if (prepared.repeated) return NextResponse.json({ view: currentView(db.read(), principal).view, executionJob: prepared.job, authenticated: true, repeated: true });
      try {
        const output = await executeInIsolatedWorktree({ repositoryRoot: process.cwd(), canonicalHead: plan.canonicalBase, capsule: prepared.capsule, agreement: prepared.agreement, plan });
        const updated = db.transact((state) => {
          if (!hasInstitutionalState(state)) throw new Error("IDENTITY_UNRESOLVED");
          const next = completeExecutionJob(state, actor, prepared.job.id, output, randomUUID, new Date().toISOString());
          return { state: next, result: projection(next, actor) };
        });
        return NextResponse.json({ view: updated, executionJob: updated.executionJobs?.find((job) => job.id === prepared.job.id), authenticated: true, executionReturned: true });
      } catch (error) {
        const failureCode = error instanceof Error ? error.message : "EXECUTION_FAILED";
        db.transact((state) => ({ state: failExecutionJob(state, actor, prepared.job.id, failureCode, new Date().toISOString()), result: null }));
        const readback = db.read();
        return NextResponse.json({ view: currentView(readback, principal).view, executionJob: readback.executionJobs?.find((job) => job.id === prepared.job.id), authenticated: true, executionReturned: false, error: "A autorização e a cadeia institucional foram registradas, mas a execução não retornou um pacote completo. Nenhuma promoção ocorreu; revise o estado preservado antes de tentar de novo." });
      }
    }

    if (data.action === "execute_commitment") {
      if (!('workItemId' in data) || typeof data.workItemId !== "string" || !('requestKey' in data) || typeof data.requestKey !== "string")
        return NextResponse.json({ error: "A execução delimitada está incompleta." }, { status: 400 });
      const executionBody = data as Record<string, unknown>;
      const plan = executionPlanSchema.parse({ canonicalBase: executionBody.canonicalBase, allowedPaths: executionBody.allowedPaths, validations: executionBody.validations, confirmed: executionBody.confirmed });
      const actor = currentActor(db.read(), principal);
      const prepared = db.transact<{ job: ExecutionJob; capsule: TaskCapsule | null; agreement: { id: string; digest: string; expectedResult: string; scope: string; exclusions: string; dependencies: string; evaluationCriterion: string } | null; repeated: boolean }>((state) => {
        if (!hasInstitutionalState(state)) throw new Error("BOOTSTRAP_REQUIRED");
        if (!/^[a-zA-Z0-9-]{16,80}$/.test(String(executionBody.requestKey))) throw new Error("INVALID_REQUEST_KEY");
        const current = (state.executionJobs ?? []).find((job) => job.requestKey === executionBody.requestKey);
        if (current) {
          if (current.requestedByActorId !== actor || current.workItemId !== executionBody.workItemId || current.canonicalBase !== plan.canonicalBase || JSON.stringify(current.allowedPaths) !== JSON.stringify(plan.allowedPaths) || JSON.stringify(current.validations) !== JSON.stringify(plan.validations)) throw new Error("REQUEST_KEY_CONFLICT");
          if (current.status === "COMPLETED") return { state, result: { job: current, capsule: null, agreement: null, repeated: true } };
          throw new Error("EXECUTION_ALREADY_RUNNING");
        }
        const work = (state.workItems ?? []).find((item) => item.id === executionBody.workItemId && item.status === "active" && item.responsiblePersonId === actor);
        if (!work?.commitmentId) throw new Error("COMMITTED_WORK_REQUIRED");
        if (!canAct(actor, state.cell!.id, "cell.update", state.memberships, state.authorities)) throw new Error("FORBIDDEN");
        const project = (state.projects ?? []).find((item) => item.stewardActorId === actor && item.commitments.some((commitment) => commitment.id === work.commitmentId));
        if (!project) throw new Error("COMMITMENT_NOT_FOUND");
        const savedAgreement = (state.agreements ?? []).find((item) => item.commitmentId === work.commitmentId && item.projectId === project.id && item.authorizingActorId === actor);
        if (!savedAgreement) throw new Error("AGREEMENT_REQUIRED_FOR_EXECUTION");
        const agreementDigest = createHash("sha256").update(JSON.stringify(savedAgreement)).digest("hex");
        if ((state.executionJobs ?? []).some((job) => job.workItemId === work.id && job.status === "RUNNING")) throw new Error("EXECUTION_ALREADY_RUNNING");
        const capsule = createTaskCapsule(project, work.commitmentId);
        if (work.taskCapsuleDigest !== capsule.digest) throw new Error("TASK_CAPSULE_CHANGED");
        const job = {
          id: randomUUID(), workItemId: work.id, projectId: project.id, commitmentId: work.commitmentId, agreementId: savedAgreement.id, agreementDigest,
          requestKey: executionBody.requestKey as string, requestedByActorId: actor, taskCapsuleDigest: capsule.digest,
          canonicalBase: plan.canonicalBase, allowedPaths: plan.allowedPaths, validations: plan.validations,
          status: "RUNNING" as const, startedAt: new Date().toISOString(),
        };
        const next = structuredClone(state);
        next.executionJobs ??= [];
        next.executionJobs.push(job);
        return { state: next, result: { job, capsule, agreement: { id: savedAgreement.id, digest: agreementDigest, expectedResult: savedAgreement.expectedResult, scope: savedAgreement.scope, exclusions: savedAgreement.exclusions, dependencies: savedAgreement.dependencies, evaluationCriterion: savedAgreement.evaluationCriterion }, repeated: false } };
      });
      if (prepared.repeated) {
        const current = currentView(db.read(), principal);
        return NextResponse.json({ view: current.view, executionJob: prepared.job, authenticated: true, repeated: true });
      }
      try {
        const output = await executeInIsolatedWorktree({ repositoryRoot: process.cwd(), canonicalHead: plan.canonicalBase, capsule: prepared.capsule!, agreement: prepared.agreement!, plan });
        const view = db.transact((state) => {
          if (!hasInstitutionalState(state)) throw new Error("IDENTITY_UNRESOLVED");
          const next = completeExecutionJob(state, actor, prepared.job.id, output, randomUUID, new Date().toISOString());
          return { state: next, result: projection(next, actor) };
        });
        const executionJob = view.executionJobs?.find((job) => job.id === prepared.job.id);
        return NextResponse.json({ view, executionJob, authenticated: true, executionReturned: true });
      } catch (error) {
        const failureCode = error instanceof Error ? error.message : "EXECUTION_FAILED";
        db.transact((state) => {
          const next = failExecutionJob(state, actor, prepared.job.id, failureCode, new Date().toISOString());
          return { state: next, result: null };
        });
        throw error;
      }
    }

    if (data.action === "bootstrap") {
      const view = db.transact((state) => {
        const next = bootstrapFoundation(state, principal.subject, randomUUID, new Date().toISOString());
        return { state: next, result: currentView(next, principal).view };
      });
      return NextResponse.json({ view, authenticated: true, bootstrapRequired: false });
    }

    if (data.action === "meeting_create") {
      const parsed = z.object({ action: z.literal("meeting_create"), title: z.string().trim().min(3).max(120), purpose: z.string().trim().min(8).max(1200) }).strict().safeParse(data);
      if (!parsed.success) return NextResponse.json({ error: "Conte em poucas palavras para que esta reunião existe." }, { status: 400 });
      const actor = currentActor(db.read(), principal);
      const view = db.transact((state) => {
        if (!hasInstitutionalState(state) || !state.cell || actor !== state.person?.id || !canAct(actor, state.cell.id, "cell.update", state.memberships, state.authorities)) throw new Error("FORBIDDEN");
        const now = new Date().toISOString();
        const id = randomUUID();
        const meeting = { id, cellId: state.cell.id, title: parsed.data.title, purpose: parsed.data.purpose, hostPersonId: actor, participants: [{ kind: "PERSON" as const, id: actor, label: state.person.name }, { kind: "AGENT" as const, id: "essenthius:institutional-intelligence", label: "Essenthius" }], turnIds: [] as string[], status: "OPEN" as const, createdAt: now };
        const next = structuredClone(state);
        next.meetings ??= [];
        next.meetings.unshift(meeting);
        next.records = [...next.records, { id: randomUUID(), kind: "OriginalRecord", purpose: "meeting_opened", content: JSON.stringify({ meetingId: id, title: meeting.title, purpose: meeting.purpose }), authorId: actor, createdAt: now, visibility: { scope: "cell", cellId: state.cell.id } }];
        return { state: next, result: projection(next, actor) };
      });
      return NextResponse.json({ view, authenticated: true });
    }

    if (data.action === "meeting_close") {
      const parsed = z.object({ action: z.literal("meeting_close"), meetingId: z.string().min(1).max(160) }).strict().safeParse(data);
      if (!parsed.success) return NextResponse.json({ error: "Não foi possível identificar este encontro." }, { status: 400 });
      const actor = currentActor(db.read(), principal);
      const view = db.transact((state) => {
        if (!hasInstitutionalState(state) || !state.cell || actor !== state.person?.id || !canAct(actor, state.cell.id, "cell.update", state.memberships, state.authorities)) throw new Error("FORBIDDEN");
        const next = structuredClone(state);
        const meeting = next.meetings?.find((item) => item.id === parsed.data.meetingId && item.cellId === state.cell!.id && item.hostPersonId === actor);
        if (!meeting) throw new Error("MEETING_NOT_AVAILABLE");
        if (meeting.status === "OPEN") { meeting.status = "CLOSED"; meeting.closedAt = new Date().toISOString(); }
        return { state: next, result: projection(next, actor) };
      });
      return NextResponse.json({ view, authenticated: true });
    }

    if (data.action === "turn" || data.action === "retry_turn") {
      const turnData = data as Record<string, unknown>;
      const retrying = turnData.action === "retry_turn";
      if (retrying && typeof turnData.turnId !== "string")
        return NextResponse.json({ error: "Não foi possível localizar a mensagem para tentar novamente." }, { status: 400 });
      if (!retrying && (typeof turnData.text !== "string" || typeof turnData.requestKey !== "string"))
        return NextResponse.json({ error: "Informe sua mensagem para a Célula Zero." }, { status: 400 });
      const actor = currentActor(db.read(), principal);
      const meetingId = typeof turnData.meetingId === "string" ? turnData.meetingId : null;
      const created = db.transact((state) => {
        const current = currentView(state, principal);
        if (!current.view || !hasInstitutionalState(state)) throw new Error("BOOTSTRAP_REQUIRED");
        if (retrying) {
          const turnId = turnData.turnId as string;
          const turn = (state.intelligenceTurns ?? []).find((item) => item.id === turnId && item.actorId === actor);
          if (!turn || turn.status !== "unavailable") throw new Error(turn?.status === "interpreting" ? "INTELLIGENCE_TURN_ALREADY_RUNNING" : "INTELLIGENCE_TURN_NOT_RETRYABLE");
          const message = (state.conversationMessages ?? []).find((item) => item.id === turn.humanMessageId && item.authorId === actor);
          if (!message) throw new Error("INTERPRETATION_SOURCE_MISSING");
          const next = retryIntelligenceTurn(state, actor, turnId);
          return { state: next, result: { turn: next.intelligenceTurns!.find((item) => item.id === turnId)!, repeated: false, text: message.body } };
        }
        const text = turnData.text as string;
        const meeting = meetingId ? state.meetings?.find((item) => item.id === meetingId && item.cellId === state.cell?.id && item.status === "OPEN" && item.participants.some((participant) => participant.kind === "PERSON" && participant.id === actor)) : undefined;
        if (meetingId && !meeting) throw new Error("MEETING_NOT_AVAILABLE");
        const threadId = meetingId ? `meeting:${meetingId}` : `cell:${state.cell.id}`;
        const result = beginIntelligenceTurn(state, actor, text, turnData.requestKey as string, randomUUID, new Date().toISOString(), typeof turnData.parentTurnId === "string" ? turnData.parentTurnId : null, threadId);
        if (meetingId && !result.repeated) {
          const next = structuredClone(result.state);
          const target = next.meetings?.find((item) => item.id === meetingId);
          if (!target) throw new Error("MEETING_NOT_AVAILABLE");
          target.turnIds.push(result.turn.id);
          return { state: next, result: { turn: result.turn, repeated: result.repeated, text } };
        }
        return { state: result.state, result: { turn: result.turn, repeated: result.repeated, text } };
      });
      if (created.repeated && created.turn.status !== "interpreting") {
        const current = currentView(db.read(), principal);
        return NextResponse.json({ view: current.view, turnId: created.turn.id, turnStatus: created.turn.status, repeated: true, authenticated: true });
      }
      if (created.repeated && created.turn.status === "interpreting")
        return NextResponse.json({ view: currentView(db.read(), principal).view, turnId: created.turn.id, error: "Esta mensagem já está sendo processada." }, { status: 409 });
      const inferenceStartedAt = Date.now();
      let selectedProvider = "not_selected";
      let selectedModel: string | null = null;
      let selectedMode: "interpret" | "compose" | "explain" | "reflect" = "interpret";
      let requestedPreference: ModelPreference = "auto";
      let selectionReason = "";
      let fallbackUsed = false;
      let providerExecuted = false;
      console.info("CZ_ESSENTHIUS_TURN_ACCEPTED", JSON.stringify({ turnId: created.turn.id, requestId: created.turn.requestKey, retry: retrying, principalResolved: actor === currentActor(db.read(), principal), startedAt: new Date(inferenceStartedAt).toISOString() }));
      try {
        const state = db.read();
        if (!hasInstitutionalState(state)) throw new Error("IDENTITY_UNRESOLVED");
        const current = projection(state, actor);
        const available = await capabilitiesFor(current, state);
        const context = compileInstitutionalContext(
          state,
          actor,
          available.currentCapabilities.map(({ id, label, enables, availability, reason }) => ({ id, name: label, effect: enables, availability, conditions: [reason] })),
          available.canonicalHead,
          available.resources,
          available.canonicalHead ? canonicalSourceExcerpts(available.canonicalHead) : [],
          created.turn.threadId ?? `cell:${state.cell.id}`,
          created.turn.humanMessageId,
          typeof turnData.surface === "string" ? turnData.surface : "home",
          available.repositoryState,
          readActiveDirection(),
          available.currentCapabilities,
        );
        const mode = "mode" in data && ["interpret", "compose", "explain", "reflect"].includes(String(data.mode)) ? String(data.mode) as "interpret" | "compose" | "explain" | "reflect" : "interpret";
        selectedMode = mode;
        const threadId = created.turn.threadId ?? `cell:${state.cell.id}`;
        requestedPreference = state.threadModelPreferences?.[threadId] ?? "auto";
        const codexAuth = await codexCliAuthenticated();
        const isolatedInferenceFixture = process.env.CZ_ESSENTHIUS_TEST_MODE === "deterministic" && process.env.CZ_ALLOW_ISOLATED_TEST_STORE === "1";
        const providerChoice = isolatedInferenceFixture
          ? { provider: "ollama-local" as const, model: "qwen3:4b", reason: "Resposta determinística restrita ao store isolado de E2E.", fallbackUsed: false }
          : selectModelProvider({ preference: requestedPreference, codexAuthenticated: codexAuth.available, localInteractive: false });
        selectionReason = providerChoice.reason;
        fallbackUsed = providerChoice.fallbackUsed;
        const provider = providerChoice.provider;
        if (!provider) throw new Error(requestedPreference === "ollama-local" ? "OLLAMA_LOCAL_NOT_INTERACTIVE" : "CODEX_CLI_NOT_AUTHENTICATED");
        selectedProvider = provider;
        selectedModel = providerChoice.model;
        const adapter = provider === "ollama-local" ? new OllamaLocalAdapter() : new CodexCliAdapter();
        providerExecuted = true;
        const promptMetrics = provider === "codex-cli" ? codexPromptMetrics(mode, created.text, context) : { contextCharacters: JSON.stringify(context).length, promptCharacters: JSON.stringify(context).length, estimatedPromptTokens: null };
        console.info("CZ_ESSENTHIUS_PROVIDER_STARTED", JSON.stringify({ turnId: created.turn.id, requestId: created.turn.requestKey, provider, model: selectedModel, requestedPreference, selectionReason, fallbackUsed, mode, ...promptMetrics, tokenEstimateMethod: "prompt_characters_div_4_rough_estimate", startedAt: new Date().toISOString() }));
        const result = await adapter[mode]({ text: created.text, context, signal: AbortSignal.timeout(155_000) });
        const view = db.transact((current) => {
          if (!hasInstitutionalState(current)) throw new Error("IDENTITY_UNRESOLVED");
          const next = completeIntelligenceTurn(current, actor, created.turn.id, result, randomUUID, new Date().toISOString(), {
            requestedPreference, selectionReason, fallbackUsed, durationMs: Date.now() - inferenceStartedAt,
            taskClass: "CONVERSATION", intelligenceMode: mode,
            fundingOwnerClass: provider === "ollama-local" ? "LOCAL_DEVICE" : "USER_CONNECTED_ACCOUNT",
            accountQuotaClass: provider === "ollama-local" ? "LOCAL_COMPUTE" : "EXISTING_AUTHENTICATED_ACCOUNT_LIMITS",
            monetaryCostStatus: "UNKNOWN",
          });
          return { state: next, result: projection(next, actor) };
        });
        console.info("CZ_ESSENTHIUS_TURN_COMPLETED", JSON.stringify({ turnId: created.turn.id, requestId: created.turn.requestKey, provider, exitCode: 0, durationMs: Date.now() - inferenceStartedAt, interpretationPersisted: true, httpStatus: 200 }));
        return NextResponse.json({ view, turnId: created.turn.id, turnStatus: "interpreted", authenticated: true });
      } catch (error) {
        const failureCode = error instanceof Error && /^(OLLAMA_|CODEX_CLI_|CZ_CONTEXT_|CZ_ESSENTHIUS_)/.test(error.message)
          ? error.message
          : error instanceof z.ZodError ? "INTELLIGENCE_OUTPUT_INVALID" : "INTELLIGENCE_PROVIDER_UNAVAILABLE";
        const view = db.transact((state) => {
          if (!hasInstitutionalState(state)) throw new Error("IDENTITY_UNRESOLVED");
          const next = failIntelligenceTurn(state, actor, created.turn.id, failureCode, {
            ...(selectedProvider !== "not_selected" ? { provider: selectedProvider === "ollama-local" ? "OLLAMA_LOCAL" : "CODEX_CLI_CHATGPT", model: selectedModel ?? "codex-cli-default" } : {}),
            requestedPreference, selectionReason, fallbackUsed, durationMs: Date.now() - inferenceStartedAt,
            taskClass: "CONVERSATION", intelligenceMode: selectedMode,
            ...(providerExecuted ? { fundingOwnerClass: selectedProvider === "ollama-local" ? "LOCAL_DEVICE" : "USER_CONNECTED_ACCOUNT", accountQuotaClass: selectedProvider === "ollama-local" ? "LOCAL_COMPUTE" : "EXISTING_AUTHENTICATED_ACCOUNT_LIMITS", monetaryCostStatus: "UNKNOWN" } : {}),
          });
          return { state: next, result: projection(next, actor) };
        });
        console.warn("CZ_ESSENTHIUS_TURN_FAILED", JSON.stringify({ turnId: created.turn.id, requestId: created.turn.requestKey, provider: selectedProvider, providerExecuted, exitCode: null, durationMs: Date.now() - inferenceStartedAt, failureCode, errorClass: error instanceof Error ? error.name : typeof error, interpretationPersisted: false, httpStatus: 200 }));
        return NextResponse.json({ view, turnId: created.turn.id, turnStatus: "unavailable", error: "Sua fala ficou registrada, mas a capacidade de interpretação selecionada não respondeu. Nenhuma proposta ou ação foi criada." });
      }
    }

    if (data.action === "respond") {
      if (!("turnId" in data) || typeof data.turnId !== "string" || !("disposition" in data) || !["continued", "rejected"].includes(String(data.disposition)) || !("text" in data) || typeof data.text !== "string")
        return NextResponse.json({ error: "A resposta à interpretação está incompleta." }, { status: 400 });
      const actor = currentActor(db.read(), principal);
      const view = db.transact((state) => {
        if (!hasInstitutionalState(state)) throw new Error("BOOTSTRAP_REQUIRED");
        const next = respondToInterpretation(state, actor, data.turnId as string, data.disposition as "continued" | "rejected", data.text as string, randomUUID, new Date().toISOString());
        return { state: next, result: projection(next, actor) };
      });
      return NextResponse.json({ view, authenticated: true });
    }

    if (data.action === "confirm_action") {
      if (!("actionRequestId" in data) || typeof data.actionRequestId !== "string" || !("requestKey" in data) || typeof data.requestKey !== "string" || !("title" in data) || typeof data.title !== "string" || !("context" in data) || typeof data.context !== "string")
        return NextResponse.json({ error: "A confirmação desta ação está incompleta." }, { status: 400 });
      const actor = currentActor(db.read(), principal);
      const view = db.transact((state) => {
        if (!hasInstitutionalState(state)) throw new Error("BOOTSTRAP_REQUIRED");
        const next = executeHumanAuthorizedWorkAction(state, actor, data.actionRequestId as string, data.title as string, data.context as string, data.requestKey as string, randomUUID, new Date().toISOString());
        return { state: next, result: projection(next, actor) };
      });
      return NextResponse.json({ view, authenticated: true, actionExecuted: true });
    }

    if (data.action === "reject_action") {
      if (!("actionRequestId" in data) || typeof data.actionRequestId !== "string") return NextResponse.json({ error: "A ação proposta não foi identificada." }, { status: 400 });
      const actor = currentActor(db.read(), principal);
      const view = db.transact((state) => {
        if (!hasInstitutionalState(state)) throw new Error("BOOTSTRAP_REQUIRED");
        const next = rejectActionRequest(state, actor, data.actionRequestId as string, randomUUID, new Date().toISOString());
        return { state: next, result: projection(next, actor) };
      });
      return NextResponse.json({ view, authenticated: true, actionExecuted: false });
    }

    if (data.action !== "command" || !("command" in data) || !("key" in data) || typeof data.key !== "string")
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    const key = data.key;
    const view = db.transact((state) => {
      const current = currentView(state, principal);
      if (!current.view) throw new Error("BOOTSTRAP_REQUIRED");
      if (!hasInstitutionalState(state)) throw new Error("IDENTITY_UNRESOLVED");
      const actor = actorFor(state, principal.provider, principal.subject);
      const now = new Date().toISOString();
      let next = applyCommand(state, actor, data.command, key, randomUUID, now);
      if (data.command && typeof data.command === "object" && "type" in data.command && data.command.type === "work_complete" && "workItemId" in data.command && typeof data.command.workItemId === "string")
        next = recordWorkContribution(next, actor, data.command.workItemId, randomUUID, now);
      return { state: next, result: projection(next, actor) };
    });
    return NextResponse.json({ view, authenticated: true, bootstrapRequired: false });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError)
      return NextResponse.json({ error: "Revise os campos: há um valor inválido ou incompleto." }, { status: 400 });
    const message = error instanceof Error ? error.message : "";
    const known: Record<string, string> = {
      FORBIDDEN: "Você não tem autoridade para essa ação.",
      IDENTITY_UNRESOLVED: "A identidade não pôde ser resolvida com segurança.",
      CZ_IDENTITY_AMBIGUOUS: "Há mais de um vínculo ativo para esta conta. A entrada foi interrompida para proteger sua continuidade.",
      CZ_FOUNDATION_NOT_EMPTY: "O estado local não está vazio; o bootstrap foi interrompido para evitar duplicação.",
      BOOTSTRAP_REQUIRED: "Confirme sua primeira entrada antes de continuar.",
      RECOVERY_AUTH_ACCOUNT_MISMATCH: "O snapshot pertence a outra credencial Huly. Nenhum histórico foi alterado.",
      RECOVERY_IDENTITY_CONFLICT: "A Person ou a Célula do snapshot diverge da atual. Não combinamos essas histórias.",
      RECOVERY_HISTORY_CONFLICT: "Este arquivo e o Habitat atual contêm histórias diferentes para a mesma Person/Célula. Preserve o backup; a restauração automática foi recusada.",
      RECOVERY_SCHEMA_INVALID: "A versão ou estrutura do arquivo de recuperação não é compatível. Nenhum estado foi alterado.",
      WORK_NOT_FOUND: "Esse trabalho não está disponível nesta Célula.",
      HULY_AUTH_FAILED: "Não foi possível autenticar. Verifique suas credenciais e tente novamente.",
      INVALID_HUMAN_INPUT: "Escreva uma resposta curta antes de continuar.",
      INTERPRETATION_NOT_FOUND: "Essa interpretação não está disponível nesta conversa.",
      INTERPRETATION_ALREADY_ANSWERED: "Essa interpretação já recebeu uma resposta.",
      ACTION_REQUEST_NOT_FOUND: "Essa proposta não está disponível nesta conversa.",
      ACTION_REQUEST_NOT_PENDING: "Essa proposta já foi respondida.",
      ACTION_REQUEST_SOURCE_INVALID: "A origem desta proposta não pôde ser confirmada. Nenhuma ação foi executada.",
      CZ_AUTHORITY_AMBIGUOUS: "Mais de uma autoridade CZ se aplica a esta ação. A decisão não foi registrada; revise a relação de autoridade.",
      PROJECT_SOURCE_NOT_OWNED_ORIGINAL: "Este registro original não pode ser transformado em projeto por esta sessão.",
      PROJECT_NOT_FOUND_OR_NOT_STEWARD: "Esse projeto não está disponível para a autoridade atual da Célula.",
      OPPORTUNITY_NOT_OPEN: "Esta possibilidade não está aberta para proposta.",
      PROPOSAL_NOT_FOUND: "Esta proposta não está disponível neste projeto.",
      PROPOSAL_ALREADY_DECIDED: "Esta proposta já recebeu uma decisão.",
      INTENTION_ALREADY_PROJECTED: "Esta intenção já está ligada a um projeto.",
      INVALID_REQUEST_KEY: "A solicitação não pôde ser identificada com segurança.",
      REQUEST_KEY_CONFLICT: "Esta autorização já foi usada para outro escopo; nenhuma nova execução começou.",
      EXECUTION_ALREADY_RUNNING: "Esta tarefa já possui uma execução ativa. A Célula preservou o estado existente.",
      COMMITTED_WORK_REQUIRED: "O Codex só pode executar trabalho ligado a um Commitment aceito e ainda ativo.",
      COMMITMENT_NOT_FOUND: "O compromisso desta tarefa não pôde ser reconstruído; nada foi executado.",
      TASK_CAPSULE_CHANGED: "As condições congeladas do Commitment mudaram. Revise a proposta antes de autorizar novamente.",
      EXECUTION_BASE_CHANGED: "A base Git mudou desde a leitura. Atualize a página e revise novamente o escopo antes de autorizar.",
      EXECUTION_BASE_STALE: "A base mudou antes da autorização. Nenhum registro foi criado; recarregue e revise a nova base.",
      TASK_CAPSULE_DIGEST_INVALID: "O pacote de trabalho não passou pela verificação de integridade.",
      EXECUTION_PATH_INVALID: "Um caminho está fora do formato permitido. Use arquivos exatos dentro do repositório.",
      EXECUTION_PATH_SYMLINK: "Um dos arquivos autorizados atravessa um atalho simbólico. A execução foi interrompida para proteger dados fora do checkout.",
      EXECUTION_STATUS_UNREADABLE: "O estado da cópia isolada não pôde ser lido com segurança. Nenhuma mudança foi aplicada ao Habitat.",
      EXECUTION_ARTIFACT_TOO_LARGE: "O delta excedeu o limite de preservação desta execução; o resultado foi interrompido.",
      EXECUTION_TIMEOUT: "A execução excedeu o limite de tempo. O estado da tarefa permanece disponível para revisão.",
      EXECUTION_FABRIC_UNAVAILABLE: "A camada de execução não retornou um pacote legível. Nenhuma promoção ocorreu.",
      EXECUTION_FABRIC_RESULT_INVALID: "O resultado da camada de execução não passou pelo readback esperado.",
      EXECUTION_RESULT_NOT_FOUND: "Esse resultado não passou pela leitura de segurança ou não pertence a este trabalho.",
      AGREEMENT_REQUIRED_FOR_EXECUTION: "Defina um acordo humano com escopo e critério de avaliação antes de autorizar a execução.",
      OPERATIONAL_EPISODE_SOURCE_NOT_OWNED: "A intenção selecionada não pertence a esta Person ou não é um Original Record elegível.",
      OPERATIONAL_PROJECT_NOT_CREATED: "A cadeia não pôde ser preparada a partir da intenção selecionada.",
      EXECUTION_PREVIOUSLY_FAILED: "Esta autorização já teve uma tentativa interrompida. A cadeia e a falha foram preservadas; revise antes de criar uma nova autorização.",
      EXECUTION_AGREEMENT_INVALID: "O acordo associado não passou pela leitura de integridade.",
      AGREEMENT_ALREADY_DEFINED: "Este Commitment já tem uma versão de acordo definida; mantenha o registro existente e crie outro Commitment se os termos mudarem.",
      COMMITMENT_TERMS_UNRESOLVED: "Os termos congelados do Commitment não puderam ser reconstruídos; o acordo não foi gravado.",
    };
    if (known[message]) {
      const status = message === "HULY_AUTH_FAILED" ? 401 :
        message === "FORBIDDEN" || message === "IDENTITY_UNRESOLVED" ? 403 :
        message === "EXECUTION_BASE_CHANGED" || message === "EXECUTION_PATH_INVALID" ? 400 : 409;
      return NextResponse.json({ error: known[message] }, { status });
    }
    console.error("CZ_FOUNDATION_OPERATION_FAILED", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Não foi possível continuar. Nenhuma mudança foi confirmada; tente novamente." }, { status: 500 });
  }
}
