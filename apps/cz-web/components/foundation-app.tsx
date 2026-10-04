// SPDX-License-Identifier: MPL-2.0
"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FoundationView, Command } from "../lib/foundation";
import type { IntelligenceInterpretation, IntelligenceMode } from "../lib/essenthius/port";
import type { ServerEntry } from "../lib/server-entry";
import type { MetabolismAction } from "../lib/metabolism";
import { detectModelPreferenceRequest, type ModelPreference, type ModelPreferenceRequest } from "../lib/essenthius/model-preference";
import type { ProfileDraftProposal } from "../lib/essenthius/profile-assistance";
import type { ActiveDirectionProjection } from "../lib/essenthius/active-direction";
import type { ConnectedProvider } from "../lib/essenthius/connected-world";
export type Section = "home" | "conversations" | "cells" | "discover" | "meetings" | "activity" | "you";
const navigation = [
  { id: "home", label: "Início", symbol: "◉" },
  { id: "conversations", label: "Conversas", symbol: "◌" },
  { id: "cells", label: "Células", symbol: "◈" },
  { id: "discover", label: "Descobrir", symbol: "⌕" },
  { id: "meetings", label: "Reuniões", symbol: "◎" },
  { id: "activity", label: "Atividade", symbol: "↗" },
  { id: "you", label: "Você", symbol: "○" },
] as const;
const date = (value: string | null | undefined) => value
  ? new Date(value).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
  : "Data não informada";
async function api(
  payload?: unknown,
  timeoutMs = payload && typeof payload === "object" && "action" in payload && payload.action === "turn" ? 180_000 : payload && typeof payload === "object" && "action" in payload && ["execute_commitment", "authorize_operational_episode"].includes(String(payload.action)) ? 31 * 60 * 1000 : 15_000,
): Promise<{
  view?: FoundationView | null;
  ok?: boolean;
  authenticated?: boolean;
  bootstrapRequired?: boolean;
  turnId?: string;
  turnStatus?: "interpreted" | "unavailable";
  actionExecuted?: boolean;
  executionReturned?: boolean;
  error?: string;
  profileDraft?: ProfileDraftProposal[];
  provider?: string;
  model?: string | null;
  usage?: { requestId: string | null; inputTokens: number | null; outputTokens: number | null; durationMs: number; cost: number | null };
}> {
  let response: Response;
  try {
    response = await fetch("/api/foundation", {
      ...(payload ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      } : { cache: "no-store" as RequestCache }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError")
      throw new Error(payload ? "A solicitação demorou demais. Sua sessão e seus registros foram preservados; você pode tentar novamente." : "A recuperação demorou mais que o esperado. Sua sessão e seus registros foram preservados; tente novamente ou entre outra vez.");
    throw new Error("Não foi possível conectar à Célula Zero. Verifique se o serviço local está aberto e tente novamente.");
  }
  let data: Awaited<ReturnType<typeof response.json>>;
  try { data = await response.json(); }
  catch { throw new Error("A resposta da Célula Zero veio incompleta. Sua sessão e seus registros foram preservados; recarregue a entrada."); }
  if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir.");
  return data;
}
function readInterpretation(record: FoundationView["records"][number] | undefined): IntelligenceInterpretation | null {
  if (!record || record.kind !== "Interpretation") return null;
  try { return JSON.parse(record.content) as IntelligenceInterpretation; } catch { return null; }
}
function humanRecord(record: FoundationView["records"][number]): string {
  if (record.kind === "Decision") {
    try { return JSON.parse(record.content).statement ?? "Decisão humana registrada."; } catch { return "Decisão humana registrada."; }
  }
  if (record.kind === "Claim") return record.content;
  if (record.kind === "Evidence") return record.rationale;
  if (record.kind === "Verification") return `Verificação ${record.outcome} · ${record.method}`;
  if (record.kind === "Interpretation") return "Interpretação atribuída ao modelo";
  if (record.kind === "OriginalRecord" && record.purpose === "learning") {
    try { const learning = JSON.parse(record.content) as { learning?: string; gratitude?: string; unresolvedTension?: string }; return [learning.learning && `Aprendizado: ${learning.learning}`, learning.gratitude && `Reconhecimento: ${learning.gratitude}`, learning.unresolvedTension && `Tensão em aberto: ${learning.unresolvedTension}`].filter(Boolean).join(" · ") || "Aprendizado registrado."; } catch { return "Aprendizado atribuído registrado."; }
  }
  if (record.kind === "OriginalRecord" && record.purpose === "next_possibility") { try { return `Possibilidade futura: ${JSON.parse(record.content).possibility}`; } catch { return "Possibilidade futura registrada."; } }
  if (record.kind === "OriginalRecord" && record.purpose === "agreement") {
    try {
      const agreement = JSON.parse(record.content) as { expectedResult?: string; scope?: string; evaluationCriterion?: string };
      return `Acordo operacional definido. Resultado esperado: ${agreement.expectedResult ?? "não informado"}. Escopo: ${agreement.scope ?? "não informado"}. Avaliação: ${agreement.evaluationCriterion ?? "não informada"}. Nenhuma obrigação econômica foi autorizada.`;
    } catch { return "Acordo operacional registrado; consulte a origem para os termos."; }
  }
  if (record.purpose === "intention" || record.purpose === "human_speech" || record.authorId === "system:local-seed")
    return record.content;
  try {
    const data = JSON.parse(record.content);
    return (
      (data.result ? `${data.title ? `${data.title}: ` : ""}${data.result}` : null) ??
      data.title ??
      data.statement ??
      data.headline ??
      data.provider ??
      data.purpose ??
      record.content
    );
  } catch {
    return record.content;
  }
}
function projectEventLabel(eventType: string) {
  const labels: Record<string, string> = {
    PROJECT_CREATED_FROM_ORIGINAL_INTENTION: "Intenção ganhou coordenação como Project",
    OPPORTUNITY_OPENED: "Uma possibilidade com condições foi aberta",
    PROPOSAL_SUBMITTED: "Uma proposta foi apresentada para decisão humana",
    PROPOSAL_ACCEPTED_AS_COMMITMENT: "Uma proposta virou Commitment sob condições congeladas",
    PROPOSAL_DECLINED: "Uma proposta foi recusada por decisão humana",
    AGREEMENT_DEFINED: "Um acordo operacional foi separado do Commitment",
    CONTRIBUTION_RECORDED: "Uma contribuição relatada foi ligada ao Commitment",
    CLAIM_RECORDED: "Uma afirmação atribuída foi registrada para a contribuição",
    ARTIFACT_RECORDED_FROM_EXECUTION_RESULT: "Um delta do executor foi preservado como Artifact da contribuição",
    CODEX_EXECUTION_RESULT_RETURNED: "O resultado do Codex voltou para avaliação humana",
    EVIDENCE_ATTACHED_TO_CLAIM: "Um artefato foi ligado a uma afirmação como evidência atribuída",
    AGREEMENT_ECONOMIC_STATUS_RECORDED: "O estado econômico declarado foi registrado sem movimentação de fundos",
  };
  return labels[eventType] ?? "Uma mudança de coordenação foi registrada";
}
function intelligenceFailureLabel(code?: string) {
  if (code === "OLLAMA_LOCAL_NOT_INTERACTIVE") return "O modelo local excede o limite de latência para conversa interativa neste host. Escolha AUTO ou Codex; sua fala permanece guardada.";
  if (code === "CODEX_CLI_NOT_AUTHENTICATED") return "Codex não está autenticado neste processo. AUTO não encontrou outra capacidade interativa disponível; sua fala permanece guardada.";
  if (code === "INTELLIGENCE_PROCESS_INTERRUPTED" || code === "CODEX_CLI_TIMEOUT" || code === "OLLAMA_LOCAL_TIMEOUT") return "A leitura de contexto não terminou a tempo; sua fala original continua guardada e nenhuma ação foi criada.";
  if (code === "CODEX_CLI_NOT_AUTHENTICATED" || code === "CODEX_CLI_UNAVAILABLE") return "A capacidade de interpretação não está disponível agora; sua fala continua guardada e nenhuma ação foi criada.";
  return "A interpretação não ficou disponível; sua fala original continua guardada e nenhuma ação foi criada.";
}
function capabilityAvailabilityLabel(value: string) {
  if (value === "AVAILABLE") return "Disponível agora";
  if (value === "AVAILABLE_WITH_HUMAN_CONFIRMATION") return "Disponível quando você confirmar";
  if (value === "BACKGROUND_ONLY") return "Só para tarefas em segundo plano";
  if (value === "CONFIGURED_BUT_UNAVAILABLE") return "Configurada, mas falta uma condição";
  if (value === "NOT_CONFIGURED") return "Ainda não conectada";
  if (value === "HISTORICAL_ONLY") return "Conhecida no histórico; não conectada aqui";
  return "Disponibilidade não confirmada";
}
function capabilityMutationLabel(value: string) {
  if (value === "READ_ONLY") return "Somente leitura";
  if (value === "DRAFT_ONLY") return "Prepara um rascunho; não altera registros";
  if (value === "DIRECT_HUMAN_WRITE") return "Você inicia e confirma a alteração diretamente";
  if (value === "WRITE_AFTER_HUMAN_CONFIRMATION") return "Só altera depois da sua confirmação";
  return "Limite de alteração não informado";
}
function capabilityLatencyLabel(value: string) {
  if (value === "LOCAL") return "Executada localmente";
  if (value === "INTERACTIVE") return "Uso interativo";
  if (value === "BACKGROUND") return "Em segundo plano";
  if (value === "VARIABLE") return "Duração variável";
  if (value === "NOT_APPLICABLE") return "Não se aplica";
  return "Ainda não medida";
}
function capabilityApprovalLabel(value: string) {
  if (value === "SESSION_READ") return "Leitura dentro da sessão autorizada";
  if (value === "DIRECT_HUMAN_ACTION") return "Ação direta sua";
  if (value === "HUMAN_CONFIRMATION") return "Sua confirmação antes de alterar";
  if (value === "HIGH_RISK_CONFIRMATION") return "Confirmação explícita de alto risco";
  if (value === "SELECTIVE_HUMAN_ACCEPTANCE") return "Você aceita campos individualmente";
  if (value === "EXPLICIT_RESTORE_CONFIRMATION") return "Confirmação explícita antes de restaurar";
  if (value === "READ_WITHIN_GRANTED_SCOPE") return "Leitura somente dentro do acesso concedido";
  if (value === "DRAFT_ONLY") return "Rascunho; não envia nem altera por si só";
  return "Nenhuma aprovação se aplica";
}
export function FoundationApp({ section, initial, newMeeting = false, initialTarget, legacyExpanded = false }: { section: Section; initial: ServerEntry; newMeeting?: boolean; initialTarget?: { kind: string; id: string }; legacyExpanded?: boolean }) {
  const router = useRouter();
  const [view, setView] = useState<FoundationView | null>(initial.view),
    [loading, setLoading] = useState(!initial.loaded),
    [busy, setBusy] = useState(false),
    [authenticated, setAuthenticated] = useState(initial.authenticated),
    [bootstrapRequired, setBootstrapRequired] = useState(initial.bootstrapRequired),
    [recoveryFailed, setRecoveryFailed] = useState(Boolean(initial.error)),
    [reauthenticate, setReauthenticate] = useState(false);
  const [error, setError] = useState(initial.error ?? ""),
    [notice, setNotice] = useState(""),
    [intention, setIntention] = useState(""),
    [intelligenceMode, setIntelligenceMode] = useState<IntelligenceMode>("interpret"),
    [workTitle, setWorkTitle] = useState(""),
    [workContext, setWorkContext] = useState(""),
    [completingWorkId, setCompletingWorkId] = useState<string | null>(null),
    [correction, setCorrection] = useState<{ turnId: string; text: string } | null>(null),
    [capabilityReadback, setCapabilityReadback] = useState<{ head: string; activeDirection?: ActiveDirectionProjection | null; capabilities: Array<{ id: string; name: string; kind: string; source: string; effect: string; availability: string; conditions: string[]; authorityRequirement: string; riskReversibility: string; provenanceStatus: string }>; currentCapabilities?: Array<{ id: string; label: string; enables: string; provider: string; resource: string; latency: string; risk: string; reversibility: string; approvalPolicy: string; provenance: string; readWrite: string; authorityRequired: string; costUsageClass: string; availability: string; reason: string; actionEntrypoint: string | null }>; connections: Array<{ id: string; name: string; status: string; source: string; boundary: string; evidence: string }>; resources: Array<{ id: string; kind: string; source: string; availability: string; provenance: string }> } | null>(null),
    [capabilityLoading, setCapabilityLoading] = useState(false),
    [capabilityError, setCapabilityError] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [meetingTitle, setMeetingTitle] = useState(""),
    [meetingPurpose, setMeetingPurpose] = useState(""),
    [activeMeetingId, setActiveMeetingId] = useState<string | null>(initialTarget?.kind === "meeting" ? initialTarget.id : null),
    [contextOpen, setContextOpen] = useState(false),
    [profileDraft, setProfileDraft] = useState<ProfileDraftProposal[] | null>(null),
    [profileDraftUsage, setProfileDraftUsage] = useState<{ provider: string; model: string | null; requestId: string | null; inputTokens: number | null; outputTokens: number | null; durationMs: number; cost: number | null } | null>(null),
    [profileDraftValues, setProfileDraftValues] = useState<Partial<Record<"headline" | "bio", string>>>({}),
    [profileAccepted, setProfileAccepted] = useState<Record<"headline" | "bio", boolean>>({ headline: false, bio: false }),
    [profileEditing, setProfileEditing] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<ConnectedProvider[]>([]);
  const [decisionAlternatives, setDecisionAlternatives] = useState<string[]>([]);
  const [recoverySnapshot, setRecoverySnapshot] = useState<{ name: string; value: unknown } | null>(null),
    [recoveryPreview, setRecoveryPreview] = useState<{ snapshotDigest: string; currentStateDigest: string; summary: { person: string; cell: string; records: number; projects: number; workItems: number; agreements: number } } | null>(null),
    [restoreConfirmed, setRestoreConfirmed] = useState(false),
    [restoreBusy, setRestoreBusy] = useState(false),
    [restoreMessage, setRestoreMessage] = useState("");
  const flight = useRef(false),
    request = useRef<{ command: string; key: string } | null>(null),
    turnRequest = useRef<{ text: string; key: string } | null>(null),
    input = useRef<HTMLTextAreaElement>(null);
  const load = useCallback(async () => {
    try {
      const data = await api(undefined, 10_000);
      setView(data.view ?? null);
      setAuthenticated(data.authenticated ?? false);
      setBootstrapRequired(data.bootstrapRequired ?? false);
      setRecoveryFailed(false);
      setReauthenticate(false);
      setError("");
    } catch (e) {
      // An already resolved server-rendered space stays visible if the
      // background refresh fails; never replace known continuity with a spinner.
      if (!initial.authenticated && !initial.view && !initial.bootstrapRequired)
        setRecoveryFailed(true);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [initial.authenticated, initial.bootstrapRequired, initial.view]);
  const loadCapabilities = useCallback(async () => {
    setCapabilityLoading(true);
    setCapabilityError("");
    try {
      const response = await fetch("/api/foundation?capabilities=1", { cache: "no-store", signal: AbortSignal.timeout(8_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Capacidades indisponíveis.");
      setCapabilityReadback(data);
      setConnectedProviders(Array.isArray(data.externalProviders) ? data.externalProviders : []);
    } catch (e) {
      setCapabilityError(e instanceof DOMException && e.name === "TimeoutError" ? "A descoberta demorou demais. A conversa e os registros continuam disponíveis; tente atualizar as capacidades." : "Não foi possível atualizar as capacidades. Tente novamente.");
    } finally { setCapabilityLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!(["home", "discover", "cells"] as Section[]).includes(section) || !authenticated || !view) return;
    const timer = window.setTimeout(() => void loadCapabilities(), 0);
    return () => window.clearTimeout(timer);
  }, [section, authenticated, view, loadCapabilities]);
  useEffect(() => {
    if (!initialTarget || initialTarget.kind === "meeting") return;
    const timer = window.setTimeout(() => document.getElementById(`entity-${initialTarget.kind}-${initialTarget.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    return () => window.clearTimeout(timer);
  }, [initialTarget]);
  const hasRunningExecution = view?.executionJobs?.some((job) => job.status === "RUNNING") ?? false;
  useEffect(() => {
    if (!authenticated || !hasRunningExecution) return;
    const timer = window.setInterval(() => void load(), 8_000);
    return () => window.clearInterval(timer);
  }, [authenticated, hasRunningExecution, load]);
  async function restoreRequest(payload: unknown) {
    const response = await fetch("/api/foundation", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Não foi possível validar o arquivo de recuperação.");
    return data as { preview?: boolean; snapshotDigest?: string; currentStateDigest?: string; summary?: { person: string; cell: string; records: number; projects: number; workItems: number; agreements: number }; restored?: boolean; backupName?: string };
  }
  async function previewRecoveryFile(file: File | undefined) {
    if (!file) return;
    setRestoreBusy(true); setRestoreMessage(""); setRecoveryPreview(null); setRestoreConfirmed(false);
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error("O arquivo de recuperação deve ter até 4 MB.");
      const value: unknown = JSON.parse(await file.text());
      const data = await restoreRequest({ action: "restore", phase: "preview", snapshot: value });
      if (!data.preview || !data.snapshotDigest || !data.currentStateDigest || !data.summary) throw new Error("A leitura prévia não foi concluída.");
      setRecoverySnapshot({ name: file.name, value });
      setRecoveryPreview({ snapshotDigest: data.snapshotDigest, currentStateDigest: data.currentStateDigest, summary: data.summary });
      setRestoreMessage("Arquivo validado. Nada foi alterado; a restauração só começa após sua confirmação explícita.");
    } catch (cause) {
      setRecoverySnapshot(null); setRestoreMessage(cause instanceof Error ? cause.message : "Não foi possível ler o arquivo.");
    } finally { setRestoreBusy(false); }
  }
  async function applyRecovery() {
    if (!recoverySnapshot || !recoveryPreview || !restoreConfirmed || restoreBusy) return;
    setRestoreBusy(true); setRestoreMessage("");
    try {
      const data = await restoreRequest({ action: "restore", phase: "apply", snapshot: recoverySnapshot.value, snapshotDigest: recoveryPreview.snapshotDigest, currentStateDigest: recoveryPreview.currentStateDigest, confirmed: true });
      if (!data.restored) throw new Error("A restauração não foi confirmada pelo servidor.");
      setRestoreMessage(`Estado restaurado após criar um backup local (${data.backupName ?? "backup preservado"}).`);
      setRecoveryPreview(null); setRecoverySnapshot(null); setRestoreConfirmed(false);
      await load();
    } catch (cause) {
      setRestoreMessage(cause instanceof Error ? cause.message : "A restauração não foi concluída; o estado anterior foi preservado.");
    } finally { setRestoreBusy(false); }
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      await api({ action: "login", email, password });
      setPassword("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  async function confirmBootstrap() {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await api({ action: "bootstrap" });
      if (!data.view || data.view.person.name !== "Marcos" || data.bootstrapRequired)
        throw new Error("A inicialização não retornou uma leitura completa. Atualize a entrada antes de tentar novamente.");
      setView(data.view);
      setAuthenticated(data.authenticated ?? true);
      setBootstrapRequired(false);
      setNotice("Sua presença está pronta. Célula Zero continua daqui.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  async function leave() {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      await api({ action: "leave" });
      setView(null);
      setAuthenticated(false);
      setBootstrapRequired(false);
      setNotice("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  async function save(command: Command, form?: HTMLFormElement) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const encoded = JSON.stringify(command);
    if (request.current?.command !== encoded)
      request.current = { command: encoded, key: crypto.randomUUID() };
    try {
      const data = await api({
        action: "command",
        command,
        key: request.current.key,
      });
      setView(data.view ?? null);
      request.current = null;
      setNotice(
        command.type === "intention"
          ? "Sua intenção ficou guardada para o próximo retorno."
          : command.type === "decision"
            ? "Sua decisão foi registrada separada da fala original, ligada à fonte e atribuída à autoridade CZ resolvida."
          : command.type === "work_complete"
            ? "O trabalho foi concluído; seu resultado e aprendizado permanecem atribuídos ao seu relato."
          : "Salvo. Você pode continuar quando quiser.",
      );
      if (command.type === "intention") setIntention("");
      if (command.type === "work_create") {
        setWorkTitle("");
        setWorkContext("");
      }
      if (command.type === "work_complete") {
        setCompletingWorkId(null);
        form?.reset();
      }
      if (command.type === "experience" || command.type === "external_identity" || command.type === "decision") {
        form?.reset();
        if (command.type === "decision") setDecisionAlternatives([]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  const activeThreadId = (meetingId?: string) => meetingId ? `meeting:${meetingId}` : `cell:${view?.cell?.id ?? "unresolved"}`;
  async function changeModelPreference(preference: ModelPreference, meetingId?: string) {
    if (preference === "ollama-local") { setError("O modelo local está disponível, mas excede o limite de latência interativa deste host. Nenhuma preferência foi alterada; use AUTO ou Codex."); return; }
    try {
      const data = await api({ action: "thread_model_preference", threadId: activeThreadId(meetingId), preference });
      setView(data.view ?? null);
      setNotice(preference === "auto" ? "Essenthius usará AUTO nesta conversa. A identidade e o histórico permanecem os mesmos." : preference === "codex-cli" ? "Codex foi escolhido como capacidade atual de Essenthius nesta conversa." : "A opção local está guardada, mas não será usada enquanto exceder o limite de latência interativa.");
      setError("");
    } catch (cause) { setError((cause as Error).message); }
  }
  async function prepareProfileDraft() {
    try {
      setBusy(true); setError(""); setNotice("");
      const data = await api({ action: "profile_draft", threadId: activeThreadId() }, 90_000);
      setProfileDraft(data.profileDraft ?? []);
      setProfileDraftUsage(data.usage ? { provider: data.provider ?? "não informado", model: data.model ?? null, ...data.usage } : null);
      setProfileDraftValues(Object.fromEntries((data.profileDraft ?? []).map((item) => [item.field, item.proposed])));
      setProfileAccepted({ headline: false, bio: false });
      setNotice(data.profileDraft?.length ? `Essenthius preparou ${data.profileDraft.length} proposta${data.profileDraft.length === 1 ? "" : "s"}. Nada foi alterado; revise os campos.` : "Essenthius não encontrou base atribuível suficiente para propor uma mudança.");
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  async function acceptProfileDraft() {
    const fields = Object.fromEntries((Object.keys(profileAccepted) as Array<"headline" | "bio">).filter((field) => profileAccepted[field] && typeof profileDraftValues[field] === "string").map((field) => [field, profileDraftValues[field]]));
    if (Object.keys(fields).length === 0) { setError("Marque ao menos um campo para aceitar."); return; }
    try {
      setBusy(true); setError("");
      const data = await api({ action: "profile_accept", fields });
      setView(data.view ?? null); setProfileDraft(null); setProfileDraftUsage(null); setNotice("Os campos selecionados foram salvos. Os demais permaneceram como estavam.");
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  async function acceptExperienceDraft(event: FormEvent<HTMLFormElement>, turnId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const dateValue = String(fields.get("experienceDate") ?? "").trim();
      const data = await api({ action: "experience_accept", turnId, title: String(fields.get("experienceTitle") ?? ""), description: String(fields.get("experienceDescription") ?? ""), occurredOn: dateValue || null });
      setView(data.view ?? null);
      setNotice("Experiência registrada a partir da sua mensagem, com origem atribuída. Você pode revê-la em Você.");
    } catch (e) { setError((e as Error).message); }
  }
  async function createMeetingFromDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    try {
      const data = await api({ action: "meeting_create", title: String(fields.get("meetingTitle") ?? ""), purpose: String(fields.get("meetingPurpose") ?? "") });
      setView(data.view ?? null);
      const created = data.view?.meetings?.[0];
      setNotice("Encontro criado com você e Essenthius. Nenhuma decisão foi tomada automaticamente.");
      if (created) router.push(`/meetings?open=${encodeURIComponent(`meeting:${created.id}`)}`);
    } catch (e) { setError((e as Error).message); }
  }
  async function sendTurn(event?: FormEvent<HTMLFormElement>, parentTurnId?: string, meetingId?: string, retryingTurnId?: string) {
    event?.preventDefault();
    const text = retryingTurnId ? "" : parentTurnId ? correction?.turnId === parentTurnId ? correction.text.trim() : "" : intention.trim();
    if (flight.current || (!retryingTurnId && !text)) return;
    if (!retryingTurnId && !parentTurnId) {
      const requested = detectModelPreferenceRequest(text) as ModelPreferenceRequest | null;
      if (requested === "auto" || requested === "codex-cli" || requested === "ollama-local") {
        setIntention(""); await changeModelPreference(requested, meetingId); return;
      }
      if (requested === "unavailable-kimi") { setError("Kimi não está configurado nesta Célula. Nenhuma troca foi feita; você pode escolher AUTO ou Codex no seletor."); return; }
      if (requested === "ask-current") {
        const thread = activeThreadId(meetingId); const preference = view?.threadModelPreferences?.[thread] ?? "auto";
        const used = [...(view?.intelligenceTurns ?? [])].reverse().find((turn) => turn.threadId === thread && turn.status === "interpreted");
        setNotice(`Essenthius está em ${preference === "auto" ? "AUTO" : preference}. ${used ? `A última resposta usou ${used.provider ?? "provider indisponível"} / ${used.model ?? "modelo não informado"}.` : "Ainda não há resposta nesta conversa para mostrar o provider efetivamente usado."}`); return;
      }
      if (requested === "ask-cost") { setNotice("O custo não está disponível no runtime atual. Tokens, latência e custo aparecem nos detalhes quando o provider os informa."); return; }
      if (/\b(melhore|melhorar|prepare|prepara|atualize|revise)\b.*\b(meu|minha)\s+perfil\b/i.test(text)) { setIntention(""); await prepareProfileDraft(); router.push("/you"); return; }
    }
    flight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    if (turnRequest.current?.text !== `${parentTurnId ?? "root"}:${text}`)
      turnRequest.current = { text: `${parentTurnId ?? "root"}:${text}`, key: crypto.randomUUID() };
    try {
      const data = await api(retryingTurnId
        ? { action: "retry_turn", turnId: retryingTurnId, mode: intelligenceMode, surface: section }
        : { action: "turn", text, requestKey: turnRequest.current!.key, mode: intelligenceMode, surface: section, ...(parentTurnId ? { parentTurnId } : {}), ...(meetingId ? { meetingId } : {}) });
      setView(data.view ?? null);
      turnRequest.current = null;
      if (data.turnStatus === "unavailable") {
        setError(data.error ?? "Essenthius não conseguiu responder agora. Sua mensagem permanece na conversa.");
      } else {
        if (!retryingTurnId) setIntention("");
        setCorrection(null);
        setNotice("Essenthius apresentou uma interpretação contextual. Revise, corrija ou rejeite antes de agir.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  async function createMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (flight.current) return;
    flight.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const data = await api({ action: "meeting_create", title: meetingTitle, purpose: meetingPurpose });
      setView(data.view ?? null);
      const created = data.view?.meetings?.[0];
      if (created) setActiveMeetingId(created.id);
      setMeetingTitle(""); setMeetingPurpose("");
      setNotice("A reunião está aberta com você e Essenthius. As falas continuam separadas de decisões e registros institucionais.");
      router.push("/meetings");
    } catch (cause) { setError((cause as Error).message); }
    finally { flight.current = false; setBusy(false); }
  }
  async function closeMeeting(meetingId: string) {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError("");
    try { const data = await api({ action: "meeting_close", meetingId }); setView(data.view ?? null); setNotice("O encontro foi encerrado. As falas continuam preservadas; nenhuma conclusão foi transformada em decisão automaticamente."); }
    catch (cause) { setError((cause as Error).message); }
    finally { flight.current = false; setBusy(false); }
  }
  async function respond(turnId: string, disposition: "continued" | "rejected") {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      const text = disposition === "continued"
        ? "Continuo a conversa a partir desta interpretação. Isto não a transforma em decisão humana."
        : "Rejeito esta interpretação; não a adoto como orientação. Nenhuma ação é autorizada.";
      const data = await api({ action: "respond", turnId, disposition, text });
      setView(data.view ?? null);
      setNotice(disposition === "continued" ? "A interpretação foi mantida como contexto da conversa, sem virar decisão." : "Interpretação rejeitada; nenhum trabalho foi criado por ela.");
    } catch (e) { setError((e as Error).message); }
    finally { flight.current = false; setBusy(false); }
  }
  async function confirmProposal(event: FormEvent<HTMLFormElement>, actionRequestId: string) {
    event.preventDefault();
    if (flight.current) return;
    const fields = new FormData(event.currentTarget);
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await api({ action: "confirm_action", actionRequestId, requestKey: crypto.randomUUID(), title: String(fields.get("proposalTitle") ?? ""), context: String(fields.get("proposalContext") ?? "") });
      setView(data.view ?? null);
      setNotice("Você autorizou a proposta. O trabalho foi criado na Célula, com registro de autorização e origem.");
    } catch (e) { setError((e as Error).message); }
    finally { flight.current = false; setBusy(false); }
  }
  async function rejectProposal(actionRequestId: string) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await api({ action: "reject_action", actionRequestId });
      setView(data.view ?? null);
      setNotice("Proposta rejeitada. Nenhum trabalho foi criado.");
    } catch (e) { setError((e as Error).message); }
    finally { flight.current = false; setBusy(false); }
  }
  async function metabolismAction(action: MetabolismAction) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api({ action: "metabolism", metabolism: action });
      setView(data.view ?? null);
      const message = action.type === "project_create" ? "A intenção continua preservada e agora tem um Project CZ ligado à sua origem."
        : action.type === "opportunity_open" ? "Possibilidade aberta no projeto, com condições e resultado esperado visíveis."
        : action.type === "proposal_submit" ? "Sua proposta foi registrada para revisão humana; ela não cria compromisso automaticamente."
        : action.type === "proposal_decide" ? action.disposition === "accept" ? "Você aceitou a proposta como Commitment sob as versões e condições exibidas. Nenhuma obrigação econômica foi criada." : "Você recusou a proposta; a decisão ficou atribuída à autoridade da Célula."
        : action.type === "agreement_define" ? "O acordo foi registrado separadamente do Commitment, com escopo, exclusões e critério de avaliação. Nenhuma obrigação econômica foi criada."
        : action.type === "agreement_economic_status" ? "O estado econômico foi registrado a partir da informação humana. Nenhum fundo foi movimentado e nenhuma liquidação foi verificada."
        : action.type === "evidence_attach" ? "O artefato foi ligado à afirmação como evidência atribuída. Isso não cria verificação independente."
        : action.type === "claim_record" ? "A afirmação ficou atribuída à contribuição e ao escopo que você declarou; ela ainda não é evidência ou verificação."
        : action.type === "capability_candidate_create" ? "A possibilidade de capacidade ficou ligada ao aprendizado relatado; ainda não foi aceita nem verificada."
        : action.type === "capability_candidate_decide" ? action.disposition === "accept" ? "Você aceitou esta capacidade no seu perfil como relato próprio, ainda não verificado." : "A proposta de capacidade foi recusada; o aprendizado original permanece."
        : "A ação foi registrada.";
      setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  async function executeCommittedWork(workItemId: string, form: HTMLFormElement) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    setNotice("Execução isolada iniciada. A Célula aguarda o retorno do Result Package; nada será aplicado aqui automaticamente.");
    try {
      const fields = new FormData(form);
      const validationText = String(fields.get("validationCommands") ?? "[]");
      let validations: unknown;
      try { validations = JSON.parse(validationText); } catch { throw new Error("As verificações precisam estar em JSON válido, como [[\"npm\",\"test\"]]."); }
      const data = await api({
        action: "execute_commitment",
        workItemId,
        requestKey: crypto.randomUUID(),
        canonicalBase: String(fields.get("canonicalBase") ?? ""),
        allowedPaths: String(fields.get("allowedPaths") ?? "").split("\n").map((path) => path.trim()).filter(Boolean),
        validations,
        confirmed: true,
      }, 31 * 60 * 1000);
      setView(data.view ?? null);
      setNotice("O Result Package retornou da cópia isolada. Revise o delta e as verificações antes de avaliar a contribuição; nada foi promovido.");
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally { flight.current = false; setBusy(false); }
  }
  async function authorizeOperationalEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (flight.current) return;
    const form = event.currentTarget;
    flight.current = true;
    setBusy(true); setError(""); setNotice("A autorização delimitada foi registrada; o resultado retornará para avaliação humana.");
    try {
      const fields = new FormData(form);
      let validations: unknown;
      try { validations = JSON.parse(String(fields.get("episodeValidations") ?? "[]")); }
      catch { throw new Error("As validações precisam estar em JSON válido, como [[\"npm\",\"test\"]]."); }
      const data = await api({
        action: "authorize_operational_episode", confirmed: true, finalAuthorization: "AUTHORIZE_EXACT_CHAIN_AND_CODEX_EXECUTION", requestKey: crypto.randomUUID(),
        sourceRecordId: String(fields.get("sourceRecordId") ?? ""), projectTitle: String(fields.get("projectTitle") ?? ""), interpretation: String(fields.get("interpretation") ?? ""),
        opportunityTitle: String(fields.get("opportunityTitle") ?? ""), opportunityStatement: String(fields.get("opportunityStatement") ?? ""), opportunityConditions: String(fields.get("opportunityConditions") ?? ""), expectedResult: String(fields.get("expectedResult") ?? ""),
        proposalStatement: String(fields.get("proposalStatement") ?? ""), proposalConditions: String(fields.get("proposalConditions") ?? ""), expectedDelivery: String(fields.get("expectedDelivery") ?? ""),
        agreementScope: String(fields.get("agreementScope") ?? ""), exclusions: String(fields.get("exclusions") ?? ""), dependencies: String(fields.get("dependencies") ?? ""), evaluationCriterion: String(fields.get("evaluationCriterion") ?? ""),
        canonicalBase: String(fields.get("canonicalBase") ?? ""), allowedPaths: String(fields.get("allowedPaths") ?? "").split("\n").map((path) => path.trim()).filter(Boolean), validations,
      }, 31 * 60 * 1000);
      setView(data.view ?? null);
      if (data.executionReturned === false) { setError(data.error ?? "A execução não retornou um pacote completo; a cadeia autorizada foi preservada."); setNotice(""); }
      else { setNotice("O episódio autorizado retornou. Revise o Result Package, o delta e as validações antes de decidir qualquer consequência."); form.reset(); }
    } catch (error) { setError((error as Error).message); setNotice(""); }
    finally { flight.current = false; setBusy(false); }
  }
  function form(
    event: FormEvent<HTMLFormElement>,
    type: "experience" | "profile" | "external_identity" | "cell",
  ) {
    event.preventDefault();
    const el = event.currentTarget;
    const f = new FormData(el);
    const get = (name: string) => String(f.get(name) ?? "");
    if (type === "experience")
      void save(
        {
          type,
          title: get("title"),
          description: get("description"),
          occurredOn: get("occurredOn").trim() || null,
        },
        el,
      );
    if (type === "profile")
      void save({ type, headline: get("headline"), bio: get("bio"), visibility: get("visibility") as "private" | "cell" }, el);
    if (type === "external_identity")
      void save({ type, provider: get("provider"), url: get("url") }, el);
    if (type === "cell") void save({ type, purpose: get("purpose") }, el);
  }
  function workCompletionForm(workItemId: string, executionJobId?: string) {
    if (completingWorkId !== workItemId) return null;
    return (
      <form className="work-completion-form" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fields = new FormData(form);
        void save({
          type: "work_complete",
          workItemId,
          result: String(fields.get("result") ?? ""),
          learning: String(fields.get("learning") ?? ""),
          gratitude: String(fields.get("gratitude") ?? ""),
          unresolvedTension: String(fields.get("unresolvedTension") ?? ""),
          nextPossibility: String(fields.get("nextPossibility") ?? ""),
          ...(executionJobId ? { executionJobId } : {}),
        }, form);
      }}>
        <label htmlFor={`work-result-${workItemId}`}>{executionJobId ? "Como você avalia o resultado retornado?" : "O que mudou ou foi produzido?"}</label>
        <textarea id={`work-result-${workItemId}`} name="result" required maxLength={6000} rows={2} placeholder={executionJobId ? "Registre sua avaliação humana; o Result Package continua separado." : "Registre o resultado observado por você."} />
        <label htmlFor={`work-learning-${workItemId}`}>O que você quer levar disso?</label>
        <textarea id={`work-learning-${workItemId}`} name="learning" maxLength={2000} rows={2} placeholder="Aprendizado, celebração ou próximo cuidado (opcional)." />
        <label htmlFor={`work-gratitude-${workItemId}`}>O que merece reconhecimento ou gratidão? (opcional)</label>
        <input id={`work-gratitude-${workItemId}`} name="gratitude" maxLength={1000}/>
        <label htmlFor={`work-tension-${workItemId}`}>Que tensão continua sem resolução? (opcional)</label>
        <input id={`work-tension-${workItemId}`} name="unresolvedTension" maxLength={1000}/>
        <label htmlFor={`work-next-${workItemId}`}>O que pode se tornar possível a seguir? (opcional)</label>
        <input id={`work-next-${workItemId}`} name="nextPossibility" maxLength={1000}/>
        <div className="work-completion-actions">
          <button className="primary" disabled={busy}>Registrar resultado e concluir ↗</button>
          <button type="button" className="text-button" disabled={busy} onClick={() => setCompletingWorkId(null)}>Continuar depois</button>
        </div>
        <small>{executionJobId ? "Sua avaliação será ligada ao digest do Result Package. Ela registra consequência humana, não converte o executor em verificador." : "Seu relato fica atribuível; não é verificação externa do resultado."}</small>
      </form>
    );
  }
  function completedWorkGrowth() {
    if (!completedWork.length) return null;
    return <section className="surface-section growth-section" aria-label="Aprendizados que podem continuar"><div className="surface-title"><h2>O que aprendemos</h2><span>Você decide o que isso significa</span></div>{completedWork.slice().reverse().slice(0, 4).map((work) => {
      const candidate = (view?.capabilityCandidates ?? []).find((item) => item.workItemId === work.id);
      return <article className="growth-item" id={`growth-work-${work.id}`} key={work.id}><div><strong>{work.title}</strong><p>O resultado e o aprendizado continuam ligados a este episódio.</p></div>{!candidate && <details><summary>Algo ficou mais possível?</summary><form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void metabolismAction({ type: "capability_candidate_create", workItemId: work.id, proposedName: String(fields.get("capabilityName") ?? ""), requestKey: crypto.randomUUID() }); }}><label htmlFor={`cell-capability-${work.id}`}>Que capacidade você quer reconhecer como possibilidade?</label><input id={`cell-capability-${work.id}`} name="capabilityName" minLength={3} maxLength={120} required placeholder="Escreva com suas palavras"/><small>Fica ligada ao aprendizado que você relatou. Não é verificada automaticamente.</small><button className="secondary" disabled={busy}>Preparar possibilidade ↗</button></form></details>}{candidate?.status === "PROPOSED" && <div className="growth-candidate"><p>Possibilidade: <strong>{candidate.proposedName}</strong></p><small>Relato ligado ao aprendizado; ainda não é uma capacidade aceita nem verificada.</small><form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void metabolismAction({ type: "capability_candidate_decide", candidateId: candidate.id, disposition: "accept", acceptedName: String(fields.get("acceptedName") ?? ""), requestKey: crypto.randomUUID() }); }}><label htmlFor={`cell-capability-accept-${candidate.id}`}>Como você quer representar isso?</label><input id={`cell-capability-accept-${candidate.id}`} name="acceptedName" required minLength={3} maxLength={120} defaultValue={candidate.proposedName}/><button className="secondary" disabled={busy}>Aceitar como relato não verificado</button></form><button className="text-button" disabled={busy} onClick={() => void metabolismAction({ type: "capability_candidate_decide", candidateId: candidate.id, disposition: "decline", acceptedName: candidate.proposedName, requestKey: crypto.randomUUID() })}>Deixar de lado</button></div>}{candidate?.status === "ACCEPTED" && <p className="quiet">Você reconheceu “{candidate.acceptedCapabilityId ? view?.capabilities?.find((item) => item.id === candidate.acceptedCapabilityId)?.name : candidate.proposedName}” como capacidade relatada. Ainda não há verificação independente.</p>}{candidate?.status === "DECLINED" && <p className="quiet">A possibilidade foi deixada de lado; o aprendizado do trabalho permanece.</p>}</article>;
    })}</section>;
  }
  if (loading)
    return (
      <main className="entry">
        <div className="entry-card recovery-card">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <p className="eyebrow">CÉLULA ZERO</p>
          <h1>Preparando sua entrada</h1>
          <p role="status" aria-live="polite">Recuperando seu espaço…</p>
          <p className="lead">Estamos buscando sua sessão e a continuidade guardada localmente.</p>
          <Link className="text-button recovery-link" href="/">Atualizar Célula Zero</Link>
        </div>
      </main>
    );
  if (recoveryFailed && !reauthenticate)
    return (
      <main className="entry">
        <div className="entry-card recovery-card">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <p className="eyebrow">CÉLULA ZERO</p>
          <h1>Não conseguimos recuperar sua entrada</h1>
          <p className="lead">Sua sessão e seus registros locais foram preservados. A recuperação encerrou por tempo limite ou falha de conexão.</p>
          {error && <p role="alert" className="error">{error}</p>}
          <button className="primary" onClick={() => { setLoading(true); setRecoveryFailed(false); void load(); }}>Tentar recuperar novamente <span>↻</span></button>
          <button className="text-button" onClick={() => { setReauthenticate(true); setError(""); }}>Entrar novamente</button>
          <Link className="text-button recovery-link" href="/">Recarregar a entrada</Link>
        </div>
      </main>
    );
  if (!authenticated && !view)
    return (
      <main className="entry">
        <div className="entry-card">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <p className="eyebrow">CÉLULA ZERO</p>
          <h1>O que você quer tornar possível?</h1>
          <p className="lead">
            Entre em Célula Zero e comece pelo que importa. Você não precisa conhecer o sistema para começar.
          </p>
          <div className="local-note">Sua conta segura o acesso; sua presença na Célula Zero continua sendo própria.</div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <form className="entry-form" onSubmit={(event) => void login(event)}>
            <label htmlFor="entry-email">E-mail da sua conta</label>
            <input id="entry-email" type="email" autoComplete="username" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} />
            <label htmlFor="entry-password">Senha</label>
            <input id="entry-password" type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} />
            <button className="primary" disabled={busy}>
              {busy ? "Entrando…" : "Entrar em Célula Zero"} <span>↗</span>
            </button>
          </form>
        </div>
        <p className="entry-foot">Intenção · Relação · Consequência</p>
      </main>
    );
  if (!view && authenticated && bootstrapRequired)
    return (
      <main className="entry">
        <div className="entry-card">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <p className="eyebrow">CÉLULA ZERO</p>
          <h1>Primeira entrada na Célula Zero</h1>
          <p className="lead">Sua presença institucional local ainda não foi inicializada.</p>
          <div className="local-note">Ao continuar, esta conta autenticada será usada somente como credencial técnica de acesso. Isso não verifica sua identidade externamente. Será registrada sua autorização para a relação Founder / Steward nesta experiência D059 N=1.</div>
          {error && <p role="alert" className="error">{error}</p>}
          <button className="primary" disabled={busy} onClick={() => void confirmBootstrap()}>
            {busy ? "Inicializando…" : "Confirmar e inicializar minha presença na Célula Zero"} <span>↗</span>
          </button>
          <button className="text-button" disabled={busy} onClick={() => void leave()}>Sair sem inicializar</button>
        </div>
        <p className="entry-foot">Sua confirmação é necessária para criar os registros institucionais locais.</p>
      </main>
    );
  if (!view)
    return <main className="entry"><p role="alert" className="error">{error || "Sua identidade não pôde ser resolvida com segurança."}</p></main>;
  const intentions = view.records.filter(
    (r) => r.kind === "OriginalRecord" && r.purpose === "intention",
  );
  const humanSpeeches = view.records.filter((r) => r.kind === "OriginalRecord" && r.purpose === "human_speech");
  const turns = view.intelligenceTurns ?? [];
  const actionRequests = view.actionRequests ?? [];
  const workItems = view.workItems ?? [];
  const activeWork = workItems.filter((work) => work.status === "active");
  const completedWork = workItems.filter((work) => work.status === "complete");
  const projects = view.projects ?? [];
  const activityRecords = view.records.filter((record) => record.kind !== "Interpretation" && (record.kind !== "OriginalRecord" || ["intention", "experience", "profile", "external_identity", "cell", "meeting_opened", "work_create", "work_complete", "work_consequence", "learning", "next_possibility", "agreement", "action_authorization", "human_decision", "evidence_attachment", "economic_status", "governance_mandate", "bootstrap_authorization", "source_observation", "capability_candidate"].includes(record.purpose)));
  const promotableInputs = [...intentions, ...humanSpeeches].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const projectSourceIds = new Set(projects.flatMap((project) => project.events.map((event) => typeof event.payload.sourceRecordId === "string" ? event.payload.sourceRecordId : "")));
  const projectActivity = projects.flatMap((project) => project.events.map((event) => ({ ...event, projectTitle: project.title }))).sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  const meetings = view.meetings ?? [];
  const turnText = (turn: (typeof turns)[number]) => view.conversationMessages?.find((message) => message.id === turn.humanMessageId)?.body
    ?? (() => { const legacy = view.records.find((record) => record.id === turn.humanRecordId); return legacy ? humanRecord(legacy) : undefined; })()
    ?? "Mensagem preservada.";
  const selectedMeeting = meetings.find((meeting) => meeting.id === activeMeetingId) ?? meetings.find((meeting) => initialTarget?.kind === "meeting" && meeting.id === initialTarget.id) ?? meetings[0];
  const targetHref = (kind: string, id: string) => {
    const exists = kind === "work" ? activeWork.some((item) => item.id === id)
      : kind === "project" ? projects.some((item) => item.id === id)
      : kind === "opportunity" ? projects.some((project) => project.opportunities.some((item) => item.id === id))
      : kind === "meeting" ? meetings.some((item) => item.id === id)
      : kind === "experience" ? view.experiences.some((item) => item.id === id) : false;
    if (!exists) return null;
    const sectionFor = kind === "meeting" ? "meetings" : kind === "experience" ? "you" : "cells";
    return `/${sectionFor}?open=${encodeURIComponent(`${kind}:${id}`)}`;
  };
  const chronologicalTurns = turns.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const meetingTurnIds = new Set(meetings.flatMap((meeting) => meeting.turnIds));
  const meetingSourceRecordIds = new Set(turns.filter((turn) => meetingTurnIds.has(turn.id)).map((turn) => turn.humanRecordId).filter((id): id is string => !!id));
  const homeInputs = [...intentions, ...humanSpeeches].filter((record) => !meetingSourceRecordIds.has(record.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const latestHumanInput = homeInputs.at(-1);
  const latestHomeMessage = (view.conversationMessages ?? []).filter((message) => message.threadId === `cell:${view.cell?.id}` && message.authorId === view.person.id).sort((left, right) => left.createdAt.localeCompare(right.createdAt)).at(-1);
  const shownTurns = section === "meetings" && selectedMeeting
    ? chronologicalTurns.filter((turn) => selectedMeeting.turnIds.includes(turn.id))
    : chronologicalTurns.filter((turn) => !meetingTurnIds.has(turn.id));
  const recentRecords = activityRecords.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const profileSourceLabel = (id: string) => view.experiences.find((item) => item.id === id)?.title ?? (view.capabilities ?? []).find((item) => item.id === id)?.name ?? (view.projects ?? []).flatMap((item) => item.contributions).find((item) => item.id === id)?.description ?? (() => { const record = view.records.find((item) => item.id === id); return record?.kind === "OriginalRecord" ? record.purpose : record?.kind.toLowerCase(); })() ?? "fonte atribuída";
  const currentFocus = activeWork[0]?.title ?? (latestHomeMessage?.body ?? (latestHumanInput ? humanRecord(latestHumanInput) : "Sua próxima intenção pode começar em uma conversa."));
  const chatComposer = (meetingId?: string, compact = false) => (
    <form className={`companion-composer${compact ? " compact" : ""}`} onSubmit={(event) => void sendTurn(event, undefined, meetingId)}>
      <label className="sr-only" htmlFor={compact ? "companion-message-compact" : "companion-message"}>Converse com Essenthius</label>
      <textarea ref={compact ? undefined : input} id={compact ? "companion-message-compact" : "companion-message"} required maxLength={6000} value={intention} onChange={(event) => setIntention(event.target.value)} placeholder={compact ? "Continue com Essenthius…" : "O que você quer tornar possível?"} rows={compact ? 1 : 2} />
      <small className="conversation-boundary-note">Mensagens continuam como conversa. Nada vira registro institucional sem sua confirmação.</small>
      <div className="companion-composer-footer">
        <div className="companion-controls"><label>Essenthius · usando <select aria-label="Modelo desta conversa" value={view.threadModelPreferences?.[activeThreadId(meetingId)] ?? "auto"} onChange={(event) => void changeModelPreference(event.target.value as ModelPreference, meetingId)}><option value="auto">AUTO</option><option value="codex-cli">Codex</option></select></label><details><summary>Modo de conversa</summary><select aria-label="Como Essenthius pode ajudar" value={intelligenceMode} onChange={(event) => setIntelligenceMode(event.target.value as IntelligenceMode)}><option value="interpret">Entender e compor possibilidades</option><option value="explain">Explicar o contexto</option><option value="reflect">Refletir sobre consequências</option><option value="compose">Compor um próximo passo</option></select><small>Essenthius usa contexto atribuível. Sua fala fica separada da interpretação.</small></details></div>
        <button className="send-button" disabled={busy || !intention.trim()} aria-label="Enviar mensagem">{busy ? "Compondo…" : "Enviar ↗"}</button>
      </div>
    </form>
  );
  const meetingForm = () => (
    <form className="meeting-create" onSubmit={(event)=>void createMeeting(event)}>
      <label htmlFor="meeting-title">Dê um nome para este encontro</label>
      <input id="meeting-title" required minLength={3} maxLength={120} value={meetingTitle} onChange={(event)=>setMeetingTitle(event.target.value)} placeholder="O próximo passo do Habitat" />
      <label htmlFor="meeting-purpose">O que você quer pensar ou tornar possível?</label>
      <textarea id="meeting-purpose" required minLength={8} maxLength={1200} rows={3} value={meetingPurpose} onChange={(event)=>setMeetingPurpose(event.target.value)} placeholder="A questão que vamos explorar" />
      <div className="meeting-participant-preview"><span className="avatar">{view.person.name.slice(0,1)}</span><span>{view.person.name}</span><span>+</span><span className="companion-orb tiny-orb"><span/></span><span>Essenthius</span></div>
      <button className="primary" disabled={busy}>Abrir encontro ↗</button>
    </form>
  );
  return (
    <div className="app-shell">
      <a className="skip" href="#content">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>
            Célula Zero<small>Seu espaço de continuidade</small>
          </span>
        </Link>
        <nav aria-label="Navegação principal">
          {navigation.map((n) => (
            <Link
              key={n.id}
              href={n.id === "home" ? "/" : `/${n.id}`}
              aria-current={section === n.id ? "page" : undefined}
            >
              <span aria-hidden="true">{n.symbol}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">M</span>
          <div>
            <strong>{view.person.name}</strong>
            <small>Presença privada</small>
          </div>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void leave()}
          >
            Sair
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>{navigation.find((n) => n.id === section)?.label}</span>
          <span className="quiet">
            <span className="status-dot" /> Célula Zero{" "}
            <button
              className="mobile-exit text-button"
              disabled={busy}
              onClick={() => void leave()}
            >
              Sair
            </button>
          </span>
        </header>
        <main id="content">
          <div aria-live="polite">
            {notice && (
              <p className="success" role="status">
                {notice}
              </p>
            )}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {!legacyExpanded && <div className="experience-v2">
            <div className="living-main">
              <div className="living-heading">
                <span className="eyebrow">CÉLULA ZERO <span aria-hidden="true">·</span> {view.cell?.name ?? "Seu espaço"}</span>
                <h1>{section === "home" ? `${latestHumanInput || latestHomeMessage || activeWork.length ? "Que bom que voltou" : "Olá"}, ${view.person.name}.` : navigation.find((item) => item.id === section)?.label}</h1>
                <p>{section === "home" ? latestHumanInput || latestHomeMessage ? "Você voltou. Aqui está o fio que continua vivo." : "O que você quer tornar possível?" : section === "cells" ? "Um lugar para o que estamos fazendo juntos." : section === "discover" ? "Diga do que precisa. Vamos olhar para o que já existe." : section === "meetings" ? "Reúna as presenças que podem ajudar a pensar e agir." : section === "activity" ? "O que mudou e por que importa para você." : section === "you" ? "Sua presença, suas relações e o que você está se tornando capaz de fazer." : "Uma conversa que continua com você."}</p>
              </div>
              {section === "home" && capabilityReadback?.activeDirection && <section className="direction-witness" aria-label="Direção humana atual"><div><small>DIREÇÃO HUMANA ATUAL · LOCAL / NÃO CANÔNICA</small><h2>{capabilityReadback.activeDirection.campaign}</h2><p>{capabilityReadback.activeDirection.currentPriority[0]}</p></div><ul>{capabilityReadback.activeDirection.currentPriority.slice(1, 3).map((item) => <li key={item}>{item}</li>)}</ul><details><summary>Como Essenthius está considerando esta direção</summary><p>{capabilityReadback.activeDirection.source}</p><p>Recebida em {capabilityReadback.activeDirection.receivedAt}. Esta projeção local ajuda a orientar a conversa, mas não altera o estado canônico nem cria autoridade.</p><ul>{capabilityReadback.activeDirection.implementationProgress.map((item) => <li key={item}>{item}</li>)}</ul><p>{capabilityReadback.activeDirection.oldOpenWorkBoundary}</p><p>{capabilityReadback.activeDirection.canonicalBoundary}</p></details></section>}

              {(section === "home" || section === "conversations") && <section className="conversation-surface" aria-label="Conversa com Essenthius">
                <div className="companion-presence"><span className="companion-orb" aria-hidden="true"><span/></span><div><strong>Essenthius</strong><small>Inteligência da Célula Zero · contexto reconstruído desta Célula</small></div><button className="context-toggle" onClick={() => setContextOpen((open) => !open)} aria-expanded={contextOpen}>Contexto</button></div>
                {contextOpen && <div className="context-explain"><p>Estou em <strong>{navigation.find((item) => item.id === section)?.label}</strong>, com você em <strong>{view.cell?.name}</strong>. Considero seu foco, falas atribuídas, trabalho aberto e relações desta Célula. Uma resposta minha é interpretação revisável; não é decisão nem registro institucional.</p><p>O estado local desta experiência pode conter mudanças ainda não presentes no HEAD canônico do repositório.</p><nav aria-label="Ir para outra parte da Célula Zero">{navigation.map((item) => <Link key={item.id} href={item.id === "home" ? "/" : `/${item.id}`}>{item.label}</Link>)}</nav></div>}
                {shownTurns.length === 0 && <div className="conversation-welcome"><span className="welcome-mark" aria-hidden="true">○</span><h2>{latestHomeMessage || latestHumanInput ? "Você estava aqui." : "Estou aqui com você."}</h2><p>{latestHomeMessage ? `A última coisa que você trouxe foi: “${latestHomeMessage.body}”` : latestHumanInput ? `A última coisa que você trouxe foi: “${humanRecord(latestHumanInput)}”` : "Você pode começar por uma pergunta, uma ideia ou algo que esteja tentando tornar possível."}</p></div>}
                {shownTurns.slice(-8).map((turn) => {
                  const originalText = turnText(turn);
                  const interpretation = readInterpretation(view.records.find((record) => record.id === turn.interpretationRecordId));
                  const proposal = actionRequests.find((request) => request.turnId === turn.id);
                  return <article className="dialogue-turn" key={turn.id}>
                    <div className="dialogue-human"><span className="avatar">{view.person.name.slice(0,1)}</span><div><small>{view.person.name}</small><p>{originalText}</p></div></div>
                    {interpretation ? (
                      <div className="dialogue-essenthius"><span className="companion-orb small-orb" aria-hidden="true"><span/></span><div><small>Essenthius · leitura para você revisar</small><p>{interpretation.whatIUnderstand}</p>{interpretation.relevantContext.length > 0 && <details><summary>O que estou considerando</summary><ul>{interpretation.relevantContext.map((item,index)=><li key={index}>{item}</li>)}</ul></details>}<p>{interpretation.composition}</p>{interpretation.nextAction && <p className="next-suggestion">Talvez o próximo passo seja: {interpretation.nextAction}</p>}{interpretation.continuationProposal && <aside className="continuation-proposal" aria-label="Possibilidade para explorar"><small>UMA POSSIBILIDADE PARA EXPLORAR · AINDA NÃO É COMPROMISSO</small><p>{interpretation.continuationProposal.possibility}</p><p>{interpretation.continuationProposal.question}</p><small>Reflexão de Essenthius a partir desta conversa e do contexto disponível; nada foi criado ou prometido.</small></aside>}{interpretation.openTarget && (() => { const href = targetHref(interpretation.openTarget.kind, interpretation.openTarget.id); const label = view.workItems?.find((item) => item.id === interpretation.openTarget?.id)?.title ?? view.projects?.find((item) => item.id === interpretation.openTarget?.id)?.title ?? view.projects?.flatMap((item) => item.opportunities).find((item) => item.id === interpretation.openTarget?.id)?.title ?? view.meetings?.find((item) => item.id === interpretation.openTarget?.id)?.title ?? view.experiences.find((item) => item.id === interpretation.openTarget?.id)?.title; return href && label ? <Link className="text-button open-target-link" href={href}>Abrir: {label} ↗</Link> : null; })()}{interpretation.experienceProposal && <form className="inline-action experience-draft" onSubmit={(event) => void acceptExperienceDraft(event, turn.id)}><strong>Uma experiência para revisar</strong><p>{interpretation.experienceProposal.uncertainty}</p><label htmlFor={`experience-title-${turn.id}`}>Como você quer nomear?</label><input id={`experience-title-${turn.id}`} name="experienceTitle" required maxLength={160} defaultValue={interpretation.experienceProposal.title}/><label htmlFor={`experience-description-${turn.id}`}>O que você quer preservar?</label><textarea id={`experience-description-${turn.id}`} name="experienceDescription" required maxLength={2000} defaultValue={interpretation.experienceProposal.description}/><label htmlFor={`experience-date-${turn.id}`}>Quando aconteceu? (opcional)</label><input id={`experience-date-${turn.id}`} name="experienceDate" type="date" defaultValue={interpretation.experienceProposal.occurredOn ?? ""}/><small>Se não souber a data, deixe em branco. Sua mensagem continua sendo conversa; nada entra no perfil até você confirmar, e a experiência será registrada como relato seu.</small><button className="primary" disabled={busy}>Confirmar e incluir em Você</button></form>}{interpretation.meetingProposal && <form className="inline-action meeting-draft" onSubmit={(event) => void createMeetingFromDraft(event)}><strong>Posso abrir um encontro para esta conversa?</strong><label htmlFor={`meeting-title-draft-${turn.id}`}>Nome</label><input id={`meeting-title-draft-${turn.id}`} name="meetingTitle" required minLength={3} maxLength={120} defaultValue={interpretation.meetingProposal.title}/><label htmlFor={`meeting-purpose-draft-${turn.id}`}>Propósito</label><textarea id={`meeting-purpose-draft-${turn.id}`} name="meetingPurpose" required minLength={8} maxLength={1200} defaultValue={interpretation.meetingProposal.purpose}/><p>Participantes iniciais: você e Essenthius. Outras pessoas só serão incluídas quando houver relação legítima.</p><button className="primary" disabled={busy}>Revisar e abrir encontro</button></form>}<details className="response-provenance"><summary>Como esta resposta foi produzida</summary><p>Provider: {turn.provider ?? "não informado"} · modelo: {turn.model ?? "não informado"} · execução: {turn.provider?.includes("OLLAMA") ? "local" : turn.provider ? "remota via Codex CLI" : "não informada"}</p><p>Preferência: {turn.requestedPreference?.toUpperCase() ?? "legado"}{turn.fallbackUsed ? " · fallback aplicado" : ""}</p><p>Seleção: {turn.selectionReason ?? "não informada"}</p><p>Latência: {typeof turn.durationMs === "number" ? `${(turn.durationMs / 1000).toFixed(1)} s` : "não disponível"} · tokens: {turn.inputTokens != null || turn.outputTokens != null ? `${turn.inputTokens ?? "?"} entrada / ${turn.outputTokens ?? "?"} saída` : "não informados"} · custo: não disponível</p><small>Essenthius mantém sua identidade; provider e modelo são capacidades substituíveis.</small></details>
                      {proposal?.status === "PROPOSED" && interpretation.workProposal && <form className="inline-action" onSubmit={(event)=>void confirmProposal(event,proposal.id)}><strong>Posso transformar essa ideia em trabalho?</strong><p><b>{interpretation.workProposal.title}</b></p><p>{interpretation.workProposal.context}</p><details><summary>Ajustar antes de continuar</summary><label htmlFor={`living-title-${proposal.id}`}>Nome do trabalho</label><input id={`living-title-${proposal.id}`} name="proposalTitle" maxLength={160} defaultValue={interpretation.workProposal.title}/><label htmlFor={`living-context-${proposal.id}`}>Contexto para retomarmos depois</label><textarea id={`living-context-${proposal.id}`} name="proposalContext" maxLength={2000} defaultValue={interpretation.workProposal.context}/></details><button className="primary" disabled={busy}>Criar trabalho</button><button type="button" className="text-button" onClick={()=>void rejectProposal(proposal.id)}>Agora não</button></form>}
                      <details className="depth-link"><summary>Ver origem e limites</summary><p>Esta é uma interpretação da sua fala original. Ela não altera seu perfil, não é evidência e não decide por você.</p><small>Fonte atribuída · provider/model e contexto disponíveis para inspeção.</small></details>
                    </div></div>
                    ) : (
                      <div className="dialogue-essenthius"><p>{turn.status === "interpreting" ? "Estou compondo uma resposta a partir do contexto…" : intelligenceFailureLabel(turn.failureCode ?? undefined)}</p></div>
                    )}
                  </article>;
                    })}
                {chatComposer()}
              </section>}

              {section === "cells" && <section className="human-surface" aria-label="Célula Célula Zero">
                <div className="cell-intro"><div className="cell-orbit" aria-hidden="true"><span/></div><div><small>VOCÊ ESTÁ EM</small><h2>{view.cell?.name ?? "Célula Zero"}</h2><p>{view.cell?.purpose}</p></div></div>
                <div className="presence-line"><span className="avatar">{view.person.name.slice(0,1)}</span><span><strong>{view.person.name}</strong><small>Founder · Steward nesta Célula</small></span><span className="presence-pulse"/> <span>com Essenthius</span></div>
                <div className="surface-section"><div className="surface-title"><h2>O que está vivo</h2><span>{activeWork.length + projects.length} fios em andamento</span></div>
                  {activeWork.slice(0,4).map((work)=><div className="living-work" key={work.id}><article className="living-item" id={`entity-work-${work.id}`}><span className="item-mark">↗</span><div><strong>{work.title}</strong><p>{work.context}</p><small>Trabalho · retomado de onde parou</small></div><Link className="text-button" href="/conversations">Continuar</Link><button type="button" className="text-button" disabled={busy} onClick={() => setCompletingWorkId(completingWorkId === work.id ? null : work.id)}>{completingWorkId === work.id ? "Fechar reflexão" : "Registrar resultado"}</button></article>{workCompletionForm(work.id)}</div>)}
                  {projects.slice(-3).reverse().map((project)=><article className="living-item" id={`entity-project-${project.id}`} key={project.id}><span className="item-mark project-mark">◈</span><div><strong>{project.title}</strong><p>{project.opportunities.filter((opportunity)=>opportunity.state === "OPEN").length ? `${project.opportunities.filter((opportunity)=>opportunity.state === "OPEN").length} possibilidades abertas` : "Uma intenção que ganhou contexto de coordenação"}</p><small>Project · criado por relação explícita com sua intenção</small></div></article>)}
                  {projects.flatMap((project)=>project.opportunities.filter((opportunity)=>opportunity.state === "OPEN").map((opportunity)=><article className="living-item" id={`entity-opportunity-${opportunity.id}`} key={opportunity.id}><span className="item-mark">✳</span><div><strong>{opportunity.title}</strong><p>{opportunity.expectedResult}</p><small>Uma possibilidade aberta dentro de {project.title}</small></div><Link className="text-button" href="/activity">Ver percurso</Link></article>))}
                  {(view.agreements ?? []).filter((agreement)=>projects.some((project)=>project.id === agreement.projectId)).slice(0,3).map((agreement)=><article className="living-item" key={agreement.id}><span className="item-mark project-mark">◇</span><div><strong>Um acordo para um trabalho</strong><p>{agreement.expectedResult}</p><small>{agreement.economicMode === "NONE" ? "Sem obrigação econômica definida" : agreement.economicMode === "SETTLED" ? "Obrigação marcada como liquidada" : agreement.economicMode === "OBLIGATION_DEFINED" ? "Uma obrigação foi definida; nenhum pagamento é feito aqui" : agreement.economicMode === "SETTLEMENT_PENDING" ? "Liquidação pendente; sem movimento automático" : "Conciliação necessária; nenhum movimento automático"}</small></div></article>)}
                  {activeWork.length === 0 && projects.length === 0 && <div className="soft-invitation"><p>Ainda não há trabalho ou projeto em andamento. A conversa pode descobrir por onde começar, sem abrir nada automaticamente.</p><Link href="/">Falar com Essenthius ↗</Link></div>}
                </div>
                {completedWorkGrowth()}
                <div className="surface-section compact-section"><div className="surface-title"><h2>O que continua perto</h2><Link href="/activity">Ver percurso</Link></div>{recentRecords.slice(0,3).map((record)=><div className="quiet-event" key={record.id}><span>{record.kind === "Decision" ? "✳" : "·"}</span><p>{record.kind === "Decision" ? humanRecord(record) : humanRecord(record)}</p><small>{date(record.createdAt)}</small></div>)}</div>
              </section>}

              {section === "discover" && <section className="human-surface discovery-surface">
                <p className="surface-lead">Você não precisa saber o nome do que procura. Conte o que está tentando fazer.</p>
                <form className="discovery-natural" onSubmit={(event)=>void sendTurn(event)}><label className="sr-only" htmlFor="discover-natural">O que você está buscando?</label><textarea id="discover-natural" rows={2} value={intention} onChange={(event)=>setIntention(event.target.value)} placeholder="Quem ou o que poderia me ajudar com…"/><button className="primary" disabled={busy || !intention.trim()}>Buscar junto ↗</button></form>
                {capabilityLoading && <p role="status">Olhando para as capacidades conectadas…</p>}{capabilityError && <p className="quiet">A leitura de capacidades não está disponível agora; sua conversa e seu contexto continuam acessíveis.</p>}
                <section className="panel connected-world-summary" aria-label="Serviços que podem participar">
                  <div className="section-heading"><div><small>FONTES QUE PODEM PARTICIPAR</small><h2>Conexões da Célula</h2></div></div>
                  <p>{connectedProviders.some((provider) => provider.status === "CONNECTED")
                    ? "A conexão e os acessos concedidos são mostrados por serviço. Nenhum adapter live está instalado nesta Alpha."
                    : "Nenhuma conta externa está conectada. Os contratos sandbox são testes locais e não acessam contas reais."}</p>
                  <div className="connected-world-list">{connectedProviders.map((provider) => <details className="connected-provider" key={provider.provider}>
                    <summary><strong>{provider.label}</strong><span>{provider.status === "CONNECTED" ? "Conectado" : provider.status === "NEEDS_ATTENTION" ? "Precisa de atenção" : "Ainda não conectado"}</span></summary>
                    <p>{provider.purpose}</p>
                    <p>{provider.liveUseAvailable ? "O escopo está concedido, mas esta Alpha ainda não consegue acessar o serviço ao vivo." : "Sem ação ao vivo disponível nesta instalação."}</p>
                    <details><summary>Ver acessos, autoridade e limites</summary>{provider.capabilities.map((capability) => <div className="connected-capability" key={capability.id}><strong>{capability.label}</strong><p>Estado: {capability.availability.replaceAll("_", " ").toLowerCase()}. {capability.reason}</p><p>Autoridade: {capability.authorityRequired}</p><p>Custo externo: desconhecido. Risco: {capability.risk.toLowerCase()}; reversível: {capability.reversible ? "sim" : "não"}.</p></div>)}<p>Fixtures sandbox não são contas e não constituem leituras de dados externos.</p></details>
                  </details>)}</div>
                </section>
                <div className="discovery-results">
                  <article className="possibility"><span className="possibility-icon intelligence-icon">◈</span><div><small>VOCÊ ESTÁ AQUI</small><h3>{view.cell?.name ?? "Célula Zero"}</h3><p>Você e Essenthius compartilham este contexto. A relação e a autoridade vêm do estado institucional da Célula.</p><Link className="text-button" href="/cells">Entrar na Célula ↗</Link><details><summary>Quem está presente?</summary><p>{view.person.name} · Founder / Steward, com Essenthius como capacidade de inteligência. A presença de outras pessoas só aparece quando há relação registrada.</p></details></div></article>
                  {(capabilityReadback?.currentCapabilities ?? []).filter((capability) => capability.availability === "AVAILABLE" || capability.availability === "AVAILABLE_WITH_HUMAN_CONFIRMATION").slice(0, 7).map((capability)=><article className="possibility" key={capability.id}><span className={capability.id.includes("essenthius")?"possibility-icon intelligence-icon":"possibility-icon"}>{capability.id.includes("essenthius")?"✧":"◌"}</span><div><small>ALGO QUE PODE AJUDAR</small><h3>{capability.label}</h3><p>{capability.enables}</p><p className="availability-human">{capabilityAvailabilityLabel(capability.availability)}</p><details><summary>O que acontece se eu escolher?</summary><p>{capability.reason}</p><p>{capabilityMutationLabel(capability.readWrite)}.</p><p>Origem: {capability.provider} · recurso: {capability.resource}</p><p>Ritmo: {capabilityLatencyLabel(capability.latency)} · risco: {capability.risk.toLowerCase()} · reversibilidade: {capability.reversibility === "YES" ? "sim" : capability.reversibility === "NO" ? "não" : capability.reversibility === "CONDITIONAL" ? "depende do caso" : "não avaliada"}</p><p>Regra de autorização: {capabilityApprovalLabel(capability.approvalPolicy)}</p><p>Autoridade: {capability.authorityRequired}</p><p>Uso: {capability.costUsageClass}</p><details><summary>Origem e proveniência</summary><p>{capability.provenance}</p></details>{capability.actionEntrypoint && <Link className="text-button" href={capability.actionEntrypoint}>Abrir este caminho ↗</Link>}</details></div></article>)}
                  {capabilityReadback?.currentCapabilities && capabilityReadback.currentCapabilities.length > 0 && <details className="capability-catalog"><summary>Ver outras capacidades e o que ainda falta</summary>{capabilityReadback.currentCapabilities.map((capability)=><details key={capability.id}><summary>{capability.label} · {capabilityAvailabilityLabel(capability.availability)}</summary><p>{capability.enables}</p><p>{capability.reason}</p><p>{capabilityMutationLabel(capability.readWrite)}. {capability.authorityRequired}</p><p>Origem: {capability.provider} · recurso: {capability.resource}</p><p>Ritmo: {capabilityLatencyLabel(capability.latency)} · risco: {capability.risk.toLowerCase()} · reversibilidade: {capability.reversibility}</p><p>Regra de autorização: {capabilityApprovalLabel(capability.approvalPolicy)}</p><p>Uso: {capability.costUsageClass}</p><details><summary>Proveniência</summary><p>{capability.provenance}</p></details>{capability.actionEntrypoint && <Link className="text-button" href={capability.actionEntrypoint}>Abrir este caminho ↗</Link>}</details>)}</details>}
                  {(view.capabilities ?? []).map((capability)=><article className="possibility" key={capability.id}><span className="possibility-icon growth-icon">✳</span><div><small>APRENDIZADO DO SEU PERCURSO · RELATADO</small><h3>{capability.name}</h3><p>Uma capacidade que você aceitou representar a partir de uma experiência sua.</p><p className="availability-human">Preservada no seu perfil · ainda não verificada independentemente</p><details><summary>Ver origem</summary><p>{capability.provenance.sourceIds.length} fontes atribuídas. Capability relatada não significa capacidade verificada.</p></details></div></article>)}
                  {view.records.filter((record)=>record.kind === "OriginalRecord" && record.purpose === "next_possibility").slice().reverse().slice(0,3).map((record)=><article className="possibility" key={record.id}><span className="possibility-icon">↗</span><div><small>UMA POSSIBILIDADE QUE VOCÊ REGISTROU</small><p>{humanRecord(record)}</p><details><summary>Entender mais</summary><p>Esta possibilidade vem de um episódio atribuído; não está aberta como compromisso.</p></details></div></article>)}
                  {!(capabilityReadback?.currentCapabilities?.length) && !(view.capabilities ?? []).length && <p className="quiet">A leitura de capacidades ainda não chegou. Nenhuma possibilidade será inventada.</p>}
                </div>
              </section>}

              {section === "meetings" && <section className="human-surface meeting-surface">
                {selectedMeeting && !newMeeting ? <><div className="meeting-heading" id={`entity-meeting-${selectedMeeting.id}`}><span className="meeting-symbol">◎</span><div><small>{selectedMeeting.status === "OPEN" ? "ENCONTRO EM ANDAMENTO" : "ENCONTRO ENCERRADO"}</small><h2>{selectedMeeting.title}</h2><p>{selectedMeeting.purpose}</p></div><div className="meeting-actions"><Link className="secondary meeting-new-link" href="/meetings/new">Novo encontro</Link>{selectedMeeting.status === "OPEN" ? <button type="button" className="secondary" disabled={busy} onClick={()=>void closeMeeting(selectedMeeting.id)}>Encerrar</button> : <span className="meeting-state">Encerrado</span>}</div></div><div className="participant-row">{selectedMeeting.participants.map((participant)=><span className="participant-pill" key={`${participant.kind}-${participant.id}`}><span className={participant.kind === "AGENT" ? "companion-orb tiny-orb" : "avatar tiny-avatar"}>{participant.kind === "PERSON" ? participant.label.slice(0,1) : <span/>}</span>{participant.label}</span>)}</div><p className="quiet">Sala de conversa em texto. Áudio e vídeo não estão conectados. Mensagens são atribuídas à conversa e não viram decisão automaticamente.</p><div className="meeting-conversation">{shownTurns.length ? shownTurns.map((turn)=>{const reply=readInterpretation(view.records.find((record)=>record.id===turn.interpretationRecordId));return <article className="meeting-message" key={turn.id}><small>{view.person.name} · {date(turn.createdAt)}</small><p>{turnText(turn)}</p>{reply && <div className="meeting-reply"><small>Essenthius</small><p>{reply.whatIUnderstand}</p><p>{reply.composition}</p></div>}</article>}) : <div className="soft-invitation"><p>Qual questão vale reunir aqui?</p></div>}</div>{selectedMeeting.status === "OPEN" ? chatComposer(selectedMeeting.id) : <p className="quiet">Este encontro terminou. Você pode retomá-lo lendo as falas ou começar outro.</p>}</> : <><div className="meeting-welcome"><span className="meeting-symbol">◎</span><small>UM ESPAÇO PARA PENSAR JUNTO</small><h2>O que vale reunir?</h2><p>Comece uma conversa com Essenthius. Participantes humanos ou organizações só aparecem quando houver uma relação real para convidar.</p>{selectedMeeting && <Link className="text-button" href="/meetings">Voltar ao encontro atual</Link>}</div>{meetingForm()}</>}
                {meetings.length > 1 && <nav className="meeting-history" aria-label="Encontros anteriores"><h3>Outras conversas em grupo</h3>{meetings.filter((meeting)=>meeting.id !== selectedMeeting?.id).map((meeting)=><button key={meeting.id} className="meeting-history-item" onClick={()=>setActiveMeetingId(meeting.id)}><span>{meeting.title}</span><small>{date(meeting.createdAt)}</small></button>)}</nav>}
              </section>}

              {section === "activity" && <section className="human-surface activity-surface"><div className="surface-title"><div><small>SEU PERCURSO NA CÉLULA</small><h2>Mudanças que deixaram consequência</h2></div><a className="quiet" href="/api/foundation?export=1" download="cz-foundation.json">Levar meus dados ↓</a></div>
                {projectActivity.slice().reverse().map((event)=><article className="feed-event" key={event.id}><span className="feed-marker project-mark">◈</span><div><small>Na Célula Zero · {date(event.occurredAt)} · por {view.person.name}</small><h3>{projectEventLabel(event.eventType)}</h3><p><strong>{event.projectTitle}</strong></p><p className="feed-why">Uma mudança de coordenação que altera o que pode continuar.</p><details><summary>Ver origem</summary><p>Ligada a {event.payload.sourceRecordId ? "uma fala ou registro original atribuível" : "uma versão explícita do estado de coordenação"}. Autor e autoridade são a mesma pessoa nesta experiência Founder N=1.</p></details></div></article>)}
                {recentRecords.map((record)=><article className="feed-event" key={record.id}><span className={`feed-marker ${record.kind === "Decision" ? "decision-marker" : ""}`}>{record.kind === "Decision" ? "✳" : record.kind === "Interpretation" ? "✧" : "·"}</span><div><small>{record.authorId === view.person.id ? view.person.name : "Célula Zero"} · {date(record.createdAt)}</small><h3>{record.kind === "Decision" ? "Uma decisão foi registrada" : record.kind === "Interpretation" ? "Essenthius trouxe uma leitura" : record.kind === "OriginalRecord" && record.purpose === "meeting_opened" ? "Um encontro começou" : record.kind === "OriginalRecord" && record.purpose === "work_consequence" ? "Um trabalho produziu consequência" : record.kind === "OriginalRecord" && record.purpose === "learning" ? "Um aprendizado permaneceu" : record.kind === "OriginalRecord" && (record.purpose === "human_speech" || record.purpose === "intention") ? "Uma conversa continuou" : humanRecord(record).split(/[.!?]/)[0] || "Uma mudança foi registrada"}</h3><p>{record.kind === "Interpretation" ? "Uma perspectiva para você revisar, sem autoridade de decisão." : humanRecord(record)}</p><details><summary>Por que aparece aqui?</summary><p>Este evento é uma projeção sobre uma fonte atribuída; o feed não substitui o registro original.</p><pre>{record.kind === "OriginalRecord" ? record.content : JSON.stringify(record,null,2)}</pre></details></div></article>)}
                {recentRecords.length === 0 && projectActivity.length === 0 && <div className="soft-invitation"><h3>Seu percurso começa com o que acontece aqui.</h3><p>Conversas não viram registros institucionais automaticamente.</p></div>}
              </section>}

              {section === "you" && <section className="human-surface you-surface"><div className="identity-portrait"><span className="portrait-orbit"><span className="portrait-initial">{(view.profile.displayName ?? view.person.name).slice(0,1)}</span><i/></span><div><small>PRESENÇA NA CÉLULA ZERO</small><h2>{view.profile.displayName ?? view.person.name}</h2><p>{view.profile.headline || "Construindo possibilidades na Célula Zero"}</p><span className="visibility-label">{view.profile.visibility.scope === "private" ? "Presença privada" : "Presença compartilhada com a Célula"} · você escolhe o que compartilhar</span></div></div><div className="profile-statement">{view.profile.bio ? <p>{view.profile.bio}</p> : <p>Esta presença ainda está se formando. Quando quiser, conte a Essenthius o que gostaria que a Célula soubesse sobre você.</p>}</div><div className="profile-actions"><button type="button" className="secondary" onClick={()=>setProfileEditing((open)=>!open)}>{profileEditing ? "Fechar edição" : "Editar diretamente"}</button><button type="button" className="text-button" disabled={busy} onClick={()=>void prepareProfileDraft()}>Melhorar com Essenthius</button></div>{profileEditing && <form className="profile-manual-editor" onSubmit={(event)=>{event.preventDefault();const form=event.currentTarget;void save({type:"profile",displayName:String(new FormData(form).get("displayName") ?? ""),headline:String(new FormData(form).get("headline") ?? ""),bio:String(new FormData(form).get("bio") ?? ""),visibility:String(new FormData(form).get("visibility") ?? "private") as "private" | "cell"},form);setProfileEditing(false);}}><label htmlFor="profile-display-name">Nome de exibição</label><input id="profile-display-name" name="displayName" maxLength={120} required defaultValue={view.profile.displayName ?? view.person.name} /><small>Este rótulo de apresentação não altera a identidade institucional da Person.</small><label htmlFor="profile-headline">Presença em uma frase</label><input id="profile-headline" name="headline" maxLength={160} defaultValue={view.profile.headline} /><label htmlFor="profile-bio">Sobre você</label><textarea id="profile-bio" name="bio" maxLength={3000} rows={4} defaultValue={view.profile.bio} /><label htmlFor="profile-visibility">Quem pode ver esta presença</label><select id="profile-visibility" name="visibility" defaultValue={view.profile.visibility.scope === "cell" ? "cell" : "private"}><option value="private">Somente eu</option><option value="cell">Célula Zero</option></select><small>A edição manual não depende de IA. A visibilidade escolhida será aplicada ao perfil.</small><button className="primary" disabled={busy}>Salvar perfil</button></form>}{profileDraft && <section className="profile-draft-review" aria-label="Rascunho de perfil preparado por Essenthius"><div className="surface-title"><h2>Rascunho para você revisar</h2><button type="button" className="text-button" onClick={()=>{setProfileDraft(null);setProfileDraftUsage(null);}}>Rejeitar</button></div><p>Esta proposta usa somente informações atribuídas. Nada muda até você aceitar campos.</p>{profileDraftUsage && <details><summary>Como o rascunho foi preparado</summary><p>Provider: {profileDraftUsage.provider} · execução remota via Codex CLI · modelo: {profileDraftUsage.model ?? "não informado"} · latência: {(profileDraftUsage.durationMs / 1000).toFixed(1)} s · tokens: {profileDraftUsage.inputTokens ?? "não informados"} entrada / {profileDraftUsage.outputTokens ?? "não informados"} saída · custo: {profileDraftUsage.cost == null ? "não disponível" : profileDraftUsage.cost}</p></details>}{profileDraftUsage && <details><summary>Como o rascunho foi preparado</summary><p>Provider: {profileDraftUsage.provider} · execução remota via Codex CLI · modelo: {profileDraftUsage.model ?? "não informado"} · latência: {(profileDraftUsage.durationMs / 1000).toFixed(1)} s · tokens: {profileDraftUsage.inputTokens ?? "não informados"} entrada / {profileDraftUsage.outputTokens ?? "não informados"} saída · custo: {profileDraftUsage.cost == null ? "não disponível" : profileDraftUsage.cost}</p></details>}<button type="button" className="text-button" onClick={()=>setProfileAccepted(Object.fromEntries(profileDraft.map((item)=>[item.field,true])) as Record<"headline" | "bio",boolean>)}>Selecionar todos os campos</button>{profileDraft.map((item)=><article className="profile-draft-field" key={item.field}><label><input type="checkbox" checked={profileAccepted[item.field]} onChange={(event)=>setProfileAccepted((current)=>({...current,[item.field]:event.target.checked}))}/> Aceitar {item.field === "headline" ? "presença em uma frase" : "sobre você"}</label><p><strong>Atual:</strong> {item.current || "vazio"}</p><textarea aria-label={`Proposta para ${item.field}`} value={profileDraftValues[item.field] ?? item.proposed} onChange={(event)=>setProfileDraftValues((current)=>({...current,[item.field]:event.target.value}))}/><small>{item.uncertainty} · {item.visibilityImpact} · fontes atribuídas: {item.sourceIds.length ? item.sourceIds.map(profileSourceLabel).join("; ") : "nenhuma fonte aprovada"}</small></article>)}<button className="primary" disabled={busy || !Object.values(profileAccepted).some(Boolean)} onClick={()=>void acceptProfileDraft()}>Aceitar campos selecionados</button></section>}<div className="profile-grid"><article><small>SUAS CÉLULAS</small><h3>{view.cell?.name ?? "Nenhuma relação ativa"}</h3><p>{view.relations.filter((relation)=>relation.personId === view.person.id).map((relation)=>relation.kind).join(" · ") || "Relação não disponível"}</p></article><article><small>O QUE VOCÊ ESTÁ FAZENDO</small><h3>{activeWork.length ? `${activeWork.length} fio${activeWork.length === 1 ? "" : "s"} em andamento` : "Espaço para começar"}</h3><p>{activeWork[0]?.title ?? "O trabalho que você escolher registrar aparecerá aqui."}</p></article><article><small>CAPACIDADES RELATADAS</small><h3>{(view.capabilities ?? []).length ? `${view.capabilities?.length} reconhecida${view.capabilities?.length === 1 ? "" : "s"}` : "Em formação"}</h3><p>{(view.capabilities ?? []).map((capability)=>capability.name).join(" · ") || "Aprendizados podem fazer emergir novas capacidades."}</p></article></div><div className="surface-section"><div className="surface-title"><h2>O que você viveu e aprendeu</h2><Link href="/activity">Ver percurso</Link></div>{view.experiences.slice().reverse().slice(0,4).map((experience)=><article className="experience-presence" id={`entity-experience-${experience.id}`} key={experience.id}><span className="experience-mark">✳</span><div><h3>{experience.title}</h3><p>{experience.description}</p><small>Experiência relatada · {date(experience.occurredOn)}</small></div></article>)}{view.experiences.length === 0 && <p className="quiet">Nenhuma experiência foi registrada ainda. Você não precisa preencher um perfil para estar aqui.</p>}{view.capabilityCandidates?.filter((candidate)=>candidate.status === "PROPOSED").length ? <p className="quiet">Há um aprendizado que você pode revisar nos detalhes da sua presença.</p> : null}<details className="profile-edit-depth"><summary>Editar sua presença ou registrar uma experiência</summary><p>A conversa também pode preparar um rascunho, mas você mantém a edição direta e a decisão sobre cada campo.</p><Link href="/you#experience">Abrir portabilidade ↗</Link></details></div></section>}

              {!(["home", "conversations", "meetings"] as Section[]).includes(section) && <section className="companion-dock" aria-label="Converse com Essenthius nesta página"><div className="companion-presence"><span className="companion-orb small-orb"><span/></span><div><strong>Essenthius está com você</strong><small>Posso explicar esta página ou ajudar com o próximo passo.</small></div></div>{chatComposer(undefined, true)}</section>}

              <aside className="mobile-context-drawer"><button className="context-toggle" onClick={()=>setContextOpen((open)=>!open)} aria-expanded={contextOpen}>Contexto vivo · {contextOpen ? "fechar" : "abrir"}</button>{contextOpen && <div><p><strong>Você está em</strong><br/>{view.cell?.name}</p><p><strong>Seu foco</strong><br/>{currentFocus}</p><p><strong>Com você</strong><br/>{view.person.name} · Essenthius</p></div>}</aside>
            </div>
              <aside className="context-rail" aria-label="Contexto vivo"><div className="rail-presence"><span className="companion-orb"><span/></span><div><strong>Essenthius está com você</strong><small>Contexto da Célula reconstruído a cada conversa</small></div></div><section><small>ONDE VOCÊ ESTÁ</small><h2>{view.cell?.name ?? "Célula Zero"}</h2><p>{view.person.name} · Founder / Steward</p></section><section><small>SEU FOCO ATUAL</small><p className="rail-focus">{currentFocus}</p><details><summary>De onde veio</summary><p>Derivado do trabalho ativo e da sua fala original mais recente, preservados no estado local.</p></details></section><section><small>EM MOVIMENTO</small>{activeWork.slice(0,2).map((work)=><p className="rail-item" key={work.id}>{work.title}</p>)}{!activeWork.length && projects.slice(-1).map((project)=><p className="rail-item" key={project.id}>{project.title}</p>)}{!activeWork.length && !projects.length && <p>Nada foi aberto sem você.</p>}</section><section><small>AGUARDANDO VOCÊ</small><p>{actionRequests.filter((request)=>request.status === "PROPOSED").length ? `${actionRequests.filter((request)=>request.status === "PROPOSED").length} proposta${actionRequests.filter((request)=>request.status === "PROPOSED").length === 1 ? "" : "s"} para revisar` : "Nenhuma decisão pendente."}</p></section><section><small>PRESENÇAS AQUI</small><div className="rail-people"><span className="avatar">{view.person.name.slice(0,1)}</span><span className="companion-orb tiny-orb"><span/></span></div><p>{view.person.name} e Essenthius</p></section><Link className="rail-talk" href="/conversations">Continuar conversa <span>↗</span></Link></aside>
          </div>}
          <details className="legacy-depth" open={legacyExpanded}><summary>Ver estrutura institucional, registros e ferramentas</summary>
          {section === "home" && (
            <>
              <p className="eyebrow">CÉLULA ZERO · SEU ESPAÇO DE CONTINUIDADE</p>
              <h1>
                {latestHumanInput || activeWork.length ? `Bem-vindo de volta, ${view.person.name}.` : `Olá, ${view.person.name}.`}
                <br />
                <span className="soft">O que você quer tornar possível?</span>
              </h1>
              <p className="lead">
                {latestHumanInput || activeWork.length
                  ? "A continuidade recupera seus registros, interpretações revisáveis e o trabalho que segue aberto."
                  : "Fale naturalmente do que quer tornar possível. Essenthius compõe uma leitura do contexto da Célula; você decide o que fazer."}
              </p>
              {projects.length > 0 && <section className="continuity-brief" aria-label="Projetos e possibilidades atuais"><div><small>COORDENAÇÃO NA CÉLULA</small><h2>O que pode continuar</h2><p>Projetos e condições vêm de registros CZ atribuíveis; cada proposal e commitment permanece distinto.</p></div>{projects.slice(-3).reverse().map((project) => <article className="work-row" key={project.id}><span className="status-dot"/><div><strong>{project.title}</strong><p>{project.opportunities.filter((opportunity) => opportunity.state === "OPEN").length} possibilidades abertas · {project.commitments.length} compromissos explícitos</p></div><Link className="text-button" href="/cells">Ver na Célula ↗</Link></article>)}</section>}
              {(latestHumanInput || activeWork.length > 0) && (
                <section className="continuity-brief" aria-label="Continuidade da Célula Zero">
                  <div><small>CONTINUIDADE RECONSTRUÍDA DO ESTADO CZ</small><h2>Você pode retomar daqui</h2><p>Contexto institucional durável, não memória do modelo.</p></div>
                  {activeWork.slice(0, 3).map((work) => (
                    <article className="work-row" key={work.id}>
                      <span className="status-dot" />
                      <div><strong>{work.title}</strong><p>{work.context}</p><small>Trabalho em andamento · iniciado por você</small></div>
                    </article>
                  ))}
                  {latestHumanInput && <p className="record-text">Sua fala mais recente: {humanRecord(latestHumanInput)}</p>}
                </section>
              )}
              <form
                className="composer"
                onSubmit={(e) => void sendTurn(e)}
              >
                <label htmlFor="intention">Converse com Essenthius · o que você quer tornar possível agora?</label>
                <label className="mode-label" htmlFor="intelligence-mode">Como posso ajudar nesta fala?</label>
                <select id="intelligence-mode" value={intelligenceMode} onChange={(event) => setIntelligenceMode(event.target.value as IntelligenceMode)}>
                  <option value="interpret">Entender e compor possibilidades</option>
                  <option value="explain">Explicar o contexto conhecido</option>
                  <option value="reflect">Refletir sobre resultados e consequências</option>
                  <option value="compose">Compor capacidades para um próximo passo</option>
                </select>
                <textarea
                  ref={input}
                  id="intention"
                  required
                  maxLength={6000}
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="Conte naturalmente o que está tentando fazer, decidir ou tornar possível…"
                  rows={3}
                />
                <div className="composer-footer">
                  <small>Sua fala continua como conversa; ela só vira registro institucional quando você pede e confirma essa mudança. A interpretação é separada e corrigível, nunca decisão ou evidência automática. O provider Codex pode receber esta fala e o contexto CZ relevante para compor uma resposta; ele não executa ações.</small>
                  <button className="primary" disabled={busy}>
                    {busy ? "Essenthius está compondo uma leitura…" : "Enviar à Célula Zero"} ↗
                  </button>
                </div>
              </form>
              <details className="decision-compose">
                <summary>Registrar uma decisão humana</summary>
                <p>Registre a pergunta, alternativas, fontes consideradas e sua decisão. Isto representa uma decisão legítima do Founder/Steward N=1; não afirma consenso. Uma consequência de mandato fica registrada, mas não altera permissões automaticamente.</p>
                <form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void save({ type: "decision", statement: String(fields.get("statement") ?? ""), rationale: String(fields.get("rationale") ?? ""), question: String(fields.get("question") ?? ""), alternatives: String(fields.get("alternatives") ?? "").split("\n").map((value) => value.trim()).filter(Boolean), selectedAlternative: String(fields.get("selectedAlternative") ?? "") || undefined, supportingRecordIds: fields.getAll("supportingRecordIds").map(String), mandateChange: String(fields.get("mandateChange") ?? "") || undefined }, event.currentTarget); }}>
                  <label htmlFor="decision-question">Que pergunta precisava de decisão?</label>
                  <textarea id="decision-question" name="question" maxLength={2000} rows={2}/>
                  <label htmlFor="decision-alternatives">Alternativas consideradas (uma por linha, opcional)</label>
                  <textarea id="decision-alternatives" name="alternatives" maxLength={4000} rows={3} onChange={(event) => setDecisionAlternatives(event.currentTarget.value.split("\n").map((value) => value.trim()).filter(Boolean))}/>
                  {decisionAlternatives.length > 0 && <><label htmlFor="decision-selected-alternative">Qual alternativa foi escolhida?</label><select id="decision-selected-alternative" name="selectedAlternative" required defaultValue=""><option value="" disabled>Escolha uma alternativa</option>{decisionAlternatives.map((alternative, index) => <option key={`${index}-${alternative}`} value={alternative}>{alternative}</option>)}</select></>}
                  <label htmlFor="decision-statement">O que você decidiu?</label>
                  <textarea id="decision-statement" name="statement" required maxLength={6000} rows={2}/>
                  <label htmlFor="decision-rationale">Por que e sob quais condições?</label>
                  <textarea id="decision-rationale" name="rationale" required maxLength={6000} rows={2}/>
                  <fieldset className="supporting-records"><legend>Fontes, claims ou evidências consideradas (opcional)</legend>{view.records.filter((record) => record.kind !== "Interpretation").slice().reverse().slice(0, 12).map((record) => <label className="check-row" key={record.id}><input type="checkbox" name="supportingRecordIds" value={record.id}/><span>{record.kind === "OriginalRecord" ? record.purpose.replaceAll("_", " ") : record.kind} · {humanRecord(record).slice(0, 120)}</span></label>)}</fieldset>
                  <label htmlFor="decision-mandate-change">Consequência de política/mandato, se houver (não altera authority automaticamente)</label>
                  <textarea id="decision-mandate-change" name="mandateChange" maxLength={2000} rows={2}/>
                  <button className="secondary" disabled={busy}>Registrar minha decisão ↗</button>
                </form>
              </details>
              <div className="actions">
                {["Criar", "Resolver", "Encontrar", "Decidir", "Aprender"].map(
                  (action) => (
                    <button
                      key={action}
                      onClick={() => {
                        setIntention(`${action}: `);
                        input.current?.focus();
                      }}
                    >
                      {action} <span>↗</span>
                    </button>
                  ),
                )}
                <Link href="/you#experience">Registrar experiência ↗</Link>
              </div>
              <section className="chat-thread" aria-label="Conversa e interpretações da Célula Zero">
                <div className="section-heading"><div><small>INTELIGÊNCIA INSTITUCIONAL</small><h2>Conversa e continuidade</h2></div><span className="quiet">Cada saída do modelo continua sendo uma interpretação.</span></div>
                {turns.length === 0 ? <p className="quiet">Quando você falar, a mensagem original e a interpretação ficarão ligadas sem se confundir.</p> : turns.slice().reverse().map((turn) => {
                  const interpretationRecord = view.records.find((record) => record.id === turn.interpretationRecordId);
                  const interpretation = readInterpretation(interpretationRecord);
                  const proposal = actionRequests.find((request) => request.turnId === turn.id);
                  const correcting = correction?.turnId === turn.id;
                  return <article className="conversation-turn" key={turn.id}>
                    <div className="human-message"><small>{view.person.name} · mensagem</small><p>{turnText(turn)}</p></div>
                    {interpretation ? <div className="essenthius-message">
                      <div className="interpretation-label"><span className="brand-mark" aria-hidden="true"><span /></span><div><strong>Essenthius · interpretação</strong><small>{turn.provider} / {turn.model} · contexto durável reconstruído · saída corrigível</small></div></div>
                      <h3>O que entendi</h3><p>{interpretation.whatIUnderstand}</p>
                      {interpretation.relevantContext.length > 0 && <><h4>Contexto relevante</h4><ul>{interpretation.relevantContext.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
                      <h4>Composição possível</h4><p>{interpretation.composition}</p>
                      {interpretation.availableCapabilities.length > 0 && <p className="capability-chips">Capacidades consideradas: {interpretation.availableCapabilities.map((id) => capabilityReadback?.capabilities.find((capability) => capability.id === id)?.name ?? "capacidade identificada").join(" · ")}</p>}
                      {interpretation.missingCapability && <p><strong>O que falta:</strong> {interpretation.missingCapability}</p>}
                      {interpretation.conditions.length > 0 && <><h4>Condições</h4><ul>{interpretation.conditions.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
                      <p><strong>Autoridade necessária:</strong> {interpretation.authorityRequired}</p><p><strong>Por quê:</strong> {interpretation.why}</p><p><strong>Próxima possibilidade:</strong> {interpretation.nextAction}</p>
                      {proposal?.status === "PROPOSED" && interpretation.workProposal && <form className="proposal-card" onSubmit={(event) => void confirmProposal(event, proposal.id)}>
                        <small>ACTION REQUEST · proposta da Essenthius · ainda não executada</small><h4>Proposta de trabalho</h4><label htmlFor={`proposal-title-${proposal.id}`}>Resultado proposto</label><input id={`proposal-title-${proposal.id}`} name="proposalTitle" required maxLength={160} defaultValue={interpretation.workProposal.title}/><label htmlFor={`proposal-context-${proposal.id}`}>Contexto e critério para continuar</label><textarea id={`proposal-context-${proposal.id}`} name="proposalContext" required maxLength={2000} rows={3} defaultValue={interpretation.workProposal.context}/><p>Confirmar cria um WorkItem na Célula. A confirmação, execução local e registro de resultado ficam atribuídos; isso não é uma Human Decision sobre a interpretação.</p><button className="primary" disabled={busy}>Revisar e autorizar criação ↗</button><button type="button" className="text-button" disabled={busy} onClick={() => void rejectProposal(proposal.id)}>Rejeitar proposta</button>
                      </form>}
                      {proposal?.status === "EXECUTED" && <p className="success">Ação humana executada: trabalho criado e vinculado à interpretação.</p>}
                      {proposal?.status === "REJECTED" && <p className="quiet">A proposta foi rejeitada; nenhum trabalho foi criado.</p>}
                      {turn.disposition === "awaiting_human" && <div className="interpretation-actions"><button className="secondary" disabled={busy} onClick={() => void respond(turn.id, "continued")}>Continuar com esta leitura</button><button className="text-button" disabled={busy} onClick={() => setCorrection({ turnId: turn.id, text: "" })}>Corrigir entendimento</button><button className="text-button" disabled={busy} onClick={() => void respond(turn.id, "rejected")}>Rejeitar leitura</button></div>}
                      {turn.disposition !== "awaiting_human" && <small>Resposta humana: {turn.disposition === "continued" ? "continuação sem adoção como decisão" : turn.disposition === "corrected" ? "corrigida por nova fala" : "rejeitada"}</small>}
                      {correcting && <form className="correction-form" onSubmit={(event) => void sendTurn(event, turn.id)}><label htmlFor={`correction-${turn.id}`}>O que não corresponde ao que você quis dizer?</label><textarea id={`correction-${turn.id}`} rows={2} maxLength={4000} value={correction.text} onChange={(event) => setCorrection({ turnId: turn.id, text: event.target.value })}/><button className="secondary" disabled={busy || !correction.text.trim()}>Enviar correção como nova fala ↗</button></form>}
                      <details><summary>Proveniência e uso</summary><p>Fonte: mensagem desta conversa · provider: {turn.provider}; modelo: {turn.model}; tokens: {turn.inputTokens ?? "n/d"} entrada / {turn.outputTokens ?? "n/d"} saída · latência: {typeof turn.durationMs === "number" ? `${(turn.durationMs / 1000).toFixed(1)} s` : "n/d"}.</p><p>Quota: {turn.accountQuotaClass === "EXISTING_AUTHENTICATED_ACCOUNT_LIMITS" ? "sessão da conta Codex conectada; consumo sujeito aos limites da conta, saldo não disponível neste readback" : turn.accountQuotaClass === "LOCAL_COMPUTE" ? "computação local do dispositivo" : "não informada"} · custo monetário: {turn.monetaryCostStatus === "UNKNOWN" ? "desconhecido; o provider não informou valor" : turn.monetaryCostStatus === "ACCOUNT_INCLUDED_NO_INCREMENTAL_CHARGE_OBSERVED" ? "nenhuma cobrança incremental observada nesta chamada" : turn.monetaryCostStatus ?? "desconhecido"}. A identidade Essenthius permanece independente do provider.</p><p>Context digest: {turn.contextDigest?.slice(0, 12) ?? "n/d"}.</p></details>
                    </div> : <div className="essenthius-message unavailable"><p>{turn.status === "interpreting" ? "A Célula ainda está lendo o contexto…" : intelligenceFailureLabel(turn.failureCode ?? undefined)}</p>{turn.status === "unavailable" && <><button className="secondary" disabled={busy} onClick={() => void sendTurn(undefined, undefined, undefined, turn.id)}>Tentar resposta novamente</button>{turn.failureCode && <details><summary>Detalhe técnico</summary><small>{turn.failureCode}. Nenhuma proposta, decisão ou ação foi criada.</small></details>}</>}</div>}
                  </article>;
                })}
              </section>
              <section className="cell-work operational-gate" aria-label="Autorizar um episódio operacional delimitado">
                <div className="section-heading"><div><small>UMA AUTORIZAÇÃO HUMANA EXPLÍCITA</small><h2>Preparar um episódio real de desenvolvimento</h2></div></div>
                <p>Use somente uma intenção sua já registrada. Esta preparação não cria Project, Opportunity, Commitment ou Agreement. Uma única confirmação final registra a cadeia, as condições e a autorização para o Codex executar numa cópia isolada; nada será promovido.</p>
                {view.records.filter((record) => record.kind === "OriginalRecord" && record.authorId === view.person.id && ["intention", "human_speech"].includes(record.purpose) && !projects.some((project) => project.events.some((event) => event.payload.sourceRecordId === record.id))).slice().reverse().slice(0, 3).map((source) => { const sourceTurn = turns.filter((turn) => turn.humanRecordId === source.id).at(-1); const reading = sourceTurn ? readInterpretation(view.records.find((record) => record.id === sourceTurn.interpretationRecordId)) : null; return <details className="operational-episode" key={source.id}><summary>Preparar a partir de: {humanRecord(source).slice(0, 120)}</summary>{reading && <div className="essenthius-message"><strong>Leitura da Essenthius</strong><p>{reading.whatIUnderstand}</p><p>{reading.composition}</p><p>Revise, corrija ou ignore esta interpretação antes de qualquer autorização.</p></div>}<form onSubmit={(event) => void authorizeOperationalEpisode(event)}>
                  <input type="hidden" name="sourceRecordId" value={source.id}/>
                  <label>Intenção original</label><p className="record-text">{humanRecord(source)}</p>
                  <label htmlFor={`episode-interpretation-${source.id}`}>Como esta intenção se traduz nesta ação? Corrija a leitura antes de autorizar.</label><textarea id={`episode-interpretation-${source.id}`} name="interpretation" required minLength={10} maxLength={2000} defaultValue={reading?.whatIUnderstand ?? ""} rows={2}/>
                  <label htmlFor={`episode-project-${source.id}`}>Project proposto</label><input id={`episode-project-${source.id}`} name="projectTitle" required minLength={4} maxLength={100} defaultValue={reading?.workProposal?.title ?? ""}/>
                  <label htmlFor={`episode-opportunity-title-${source.id}`}>Possibilidade que este episódio atende</label><input id={`episode-opportunity-title-${source.id}`} name="opportunityTitle" required minLength={4} maxLength={120} defaultValue={reading?.whatIUnderstand.slice(0, 120) ?? ""}/>
                  <label htmlFor={`episode-opportunity-${source.id}`}>Descrição da possibilidade</label><textarea id={`episode-opportunity-${source.id}`} name="opportunityStatement" required minLength={10} maxLength={2000} defaultValue={reading?.composition ?? ""} rows={2}/>
                  <label htmlFor={`episode-conditions-${source.id}`}>Condições e limites</label><textarea id={`episode-conditions-${source.id}`} name="opportunityConditions" required minLength={4} maxLength={2000} defaultValue="Somente cópia isolada local; nenhuma rede, publicação ou promoção." rows={2}/>
                  <label htmlFor={`episode-result-${source.id}`}>Resultado esperado</label><input id={`episode-result-${source.id}`} name="expectedResult" required minLength={4} maxLength={1000} defaultValue={reading?.workProposal?.title ?? ""}/>
                  <label htmlFor={`episode-proposal-${source.id}`}>Proposta de ação</label><textarea id={`episode-proposal-${source.id}`} name="proposalStatement" required minLength={10} maxLength={2000} defaultValue={reading?.workProposal?.context ?? reading?.composition ?? ""} rows={2}/>
                  <label htmlFor={`episode-proposal-conditions-${source.id}`}>Condições da proposta</label><textarea id={`episode-proposal-conditions-${source.id}`} name="proposalConditions" required minLength={4} maxLength={2000} defaultValue="Sem commit, push, PR, merge ou deploy; resultado retorna para revisão humana." rows={2}/>
                  <label htmlFor={`episode-delivery-${source.id}`}>Entrega esperada</label><input id={`episode-delivery-${source.id}`} name="expectedDelivery" required minLength={4} maxLength={1000} defaultValue={reading?.workProposal?.title ?? ""}/>
                  <label htmlFor={`episode-scope-${source.id}`}>Escopo congelado do acordo</label><textarea id={`episode-scope-${source.id}`} name="agreementScope" required minLength={3} maxLength={2000} defaultValue={reading?.workProposal?.context ?? ""} rows={2}/>
                  <label htmlFor={`episode-exclusions-${source.id}`}>Exclusões</label><textarea id={`episode-exclusions-${source.id}`} name="exclusions" maxLength={2000} defaultValue="Commit, push, PR, merge, deploy, segredos, rede e arquivos fora da lista permitida." rows={2}/>
                  <label htmlFor={`episode-dependencies-${source.id}`}>Dependências conhecidas</label><textarea id={`episode-dependencies-${source.id}`} name="dependencies" maxLength={2000} rows={2}/>
                  <label htmlFor={`episode-evaluation-${source.id}`}>Como avaliar o resultado</label><textarea id={`episode-evaluation-${source.id}`} name="evaluationCriterion" required minLength={3} maxLength={2000} defaultValue={reading?.workProposal?.context ? `O Result Package deve corresponder a: ${reading.workProposal.context}` : ""} rows={2}/>
                  <label htmlFor={`episode-base-${source.id}`}>Base canônica (readback do HEAD)</label><input id={`episode-base-${source.id}`} name="canonicalBase" value={capabilityReadback?.head ?? ""} readOnly required/>
                  <label htmlFor={`episode-paths-${source.id}`}>Arquivos exatos permitidos, um por linha</label><textarea id={`episode-paths-${source.id}`} name="allowedPaths" required minLength={1} maxLength={2000} rows={3}/>
                  <label htmlFor={`episode-validations-${source.id}`}>Comandos de validação (JSON argv, sem shell)</label><textarea id={`episode-validations-${source.id}`} name="episodeValidations" required defaultValue='[["npm","run","check:vnext"]]' rows={2}/>
                  <div className="authorization-summary"><strong>Ao confirmar uma vez:</strong><ul><li>as condições acima viram Project → Opportunity → Proposal → Commitment → Agreement;</li><li>Codex usa workspace-write sandbox conforme política local e pode consumir quota da conta autenticada. Validações rodam argv exatos no checkout temporário, fora da sandbox de rede; não inclua comandos que usem rede;</li><li>nenhum fundo é movimentado; nenhum commit, push, PR, merge ou deploy será feito;</li><li>o resultado volta como claim do executor para avaliação humana, não como Verification ou decisão.</li></ul></div>
                  <label className="check-row"><input type="checkbox" name="finalAuthorization" required/>Autorizo esta cadeia e esta execução exatamente sob os termos acima.</label>
                  <button className="primary" disabled={busy || !capabilityReadback?.head}>Confirmar cadeia e autorizar Codex uma vez ↗</button><button type="button" className="text-button" disabled={busy} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>Descartar sem criar registros</button>
                </form></details>;})}
                {view.records.filter((record) => record.kind === "OriginalRecord" && record.authorId === view.person.id && ["intention", "human_speech"].includes(record.purpose)).length === 0 && <p className="quiet">Registre primeiro uma intenção real na conversa. Não há ação para fabricar agora.</p>}
                {view.records.filter((record) => record.kind === "OriginalRecord" && record.authorId === view.person.id && ["intention", "human_speech"].includes(record.purpose)).length > 0 && projects.length === 0 && <p className="quiet">Escolha uma intenção acima somente se esse trabalho realmente precisar de coordenação e execução de software. Nenhuma cadeia foi criada ainda.</p>}
              </section>
              <section className="work-compose">
                <div className="section-heading"><div><small>DA INTENÇÃO À AÇÃO</small><h2>Transforme algo em trabalho</h2></div><span className="quiet">Você confirma cada criação</span></div>
                <p className="quiet">Um trabalho pertence à Célula e continua aqui quando você voltar. A conclusão registra a consequência da sua ação.</p>
                <form className="work-form" onSubmit={(event) => { event.preventDefault(); void save({ type: "work_create", title: workTitle, context: workContext }); }}>
                  <label htmlFor="work-title">O que precisa acontecer?</label>
                  <input id="work-title" required maxLength={160} value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} placeholder="Um resultado concreto" />
                  <label htmlFor="work-context">Contexto para continuar depois</label>
                  <textarea id="work-context" required maxLength={6000} rows={3} value={workContext} onChange={(event) => setWorkContext(event.target.value)} placeholder="Por que importa, próximo passo ou condição de conclusão" />
                  <button className="primary" disabled={busy || !view.cell}>Criar trabalho na Célula ↗</button>
                </form>
                {activeWork.length > 0 && <div className="work-list"><h3>Em andamento</h3>{activeWork.map((work) => <div className="work-item" key={work.id}><article className="work-row" id={`entity-work-${work.id}`}><span className="status-dot"/><div><strong>{work.title}</strong><p>{work.context}</p><small>Responsável: {view.person.name} · atualizado {date(work.updatedAt)}</small></div><button className="secondary" disabled={busy} onClick={() => setCompletingWorkId(completingWorkId === work.id ? null : work.id)}>{completingWorkId === work.id ? "Fechar" : "Registrar resultado"}</button></article>{workCompletionForm(work.id)}</div>)}</div>}
                {completedWork.length > 0 && <details className="completed-work"><summary>Trabalho concluído ({completedWork.length})</summary>{completedWork.slice().reverse().map((work) => { const candidate = (view.capabilityCandidates ?? []).find((item) => item.workItemId === work.id); return <article className="completed-work-item" key={work.id}><p><strong>{work.title}</strong> · consequência registrada em {date(work.completedAt ?? work.updatedAt)}</p>{!candidate && <details><summary>O que este aprendizado desenvolveu?</summary><form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void metabolismAction({ type: "capability_candidate_create", workItemId: work.id, proposedName: String(fields.get("capabilityName") ?? ""), requestKey: crypto.randomUUID() }); }}><label htmlFor={`capability-name-${work.id}`}>Possível capacidade</label><input id={`capability-name-${work.id}`} name="capabilityName" minLength={3} maxLength={120} required placeholder="O que ficou mais possível fazer?"/><p className="quiet">A proposta será ligada ao aprendizado relatado, sem tratar isso como verificação.</p><button className="secondary" disabled={busy}>Registrar possibilidade ↗</button></form></details>}{candidate && <p className="quiet">Possibilidade registrada: {candidate.proposedName} · {candidate.status === "PROPOSED" ? "aguarda sua avaliação em Você" : candidate.status === "ACCEPTED" ? "aceita como relato não verificado" : "recusada"}</p>}</article>; })}</details>}
              </section>
              <section className="continuity-section">
                <div className="section-heading">
                  <h2>{intentions.length ? "O que você deixou por aqui" : "Seu fio começa aqui"}</h2>
                  {intentions.length > 0 && <Link href="/activity">Ver percurso ↗</Link>}
                </div>
                {intentions.length ? (
                  <div className="cards">
                    {intentions
                      .slice(-3)
                      .reverse()
                      .map((record) => (
                        <article className="card" key={record.id}>
                          <small>SUA INTENÇÃO · {date(record.createdAt)}</small>
                          <p className="record-text">{humanRecord(record)}</p>
                          {record.id === latestHumanInput?.id ? (
                            <button className="continuation-action" onClick={() => {
                              input.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                              input.current?.focus({ preventScroll: true });
                            }}>Continuar daqui ↗</button>
                          ) : <Link href="/activity">Ver registro ↗</Link>}
                        </article>
                      ))}
                  </div>
                ) : (
                  <div className="empty">
                    <span>↗</span>
                    <h3>Há espaço para começar.</h3>
                    <p>
                      O que você registrar permanece aqui para o próximo retorno.
                    </p>
                  </div>
                )}
              </section>
              <section className="cell-banner">
                <div>
                  <small>UM CONTEXTO VIVO</small>
                  <h2>Célula Zero</h2>
                  <p>Operar, desenvolver e governar Célula Zero.</p>
                </div>
                <Link className="secondary" href="/cells">
                  Entrar na célula ↗
                </Link>
              </section>
            </>
          )}
          {section === "you" && (
            <>
              <p className="eyebrow">IDENTIDADE & PRESENÇA</p>
              <h1>Você, além de uma bio.</h1>
              <p className="lead">
                Registre seu percurso. Dê contexto ao que sabe fazer.
              </p>
              <div className="profile-hero">
                <span className="avatar large">M</span>
                <div>
                  <h2>{view.person.name}</h2>
                  <p>{view.profile.headline}</p>
                  <small>
                    Visibilidade: {view.profile.visibility.scope === "cell" ? "pessoas com acesso à Célula" : "somente você"}
                  </small>
                </div>
              </div>
              <section className="two-columns" aria-label="O que Marcos busca e pode oferecer"><article className="panel"><h2>O que você busca</h2>{view.records.filter((record) => record.kind === "OriginalRecord" && record.authorId === view.person.id && (record.purpose === "intention" || record.purpose === "human_speech")).slice().reverse().slice(0, 5).map((record) => <p className="record-text" key={record.id}>{humanRecord(record)}</p>)}{!view.records.some((record) => record.kind === "OriginalRecord" && record.authorId === view.person.id && record.purpose === "intention") && <p className="quiet">Suas intenções aparecem aqui quando você as registra.</p>}</article><article className="panel"><h2>O que você oferece</h2>{(view.capabilities ?? []).map((capability) => <p key={capability.id}><strong>{capability.name}</strong> · relatada por você, ainda não verificada</p>)}{!(view.capabilities ?? []).length && <p className="quiet">Nenhuma capacidade foi aceita como relato próprio.</p>}</article></section>
              <div className="two-columns">
                <section className="panel">
                  <h2>Como você se apresenta</h2>
                  <form onSubmit={(e) => form(e, "profile")}>
                    <label htmlFor="headline">Em poucas palavras</label>
                    <input
                      id="headline"
                      name="headline"
                      defaultValue={view.profile.headline}
                      required
                      maxLength={160}
                    />
                    <label htmlFor="bio">Sobre você</label>
                    <textarea
                      id="bio"
                      name="bio"
                      defaultValue={view.profile.bio}
                      rows={4}
                      maxLength={3000}
                    />
                    <label htmlFor="profile-visibility">Quem pode ver sua apresentação?</label>
                    <select id="profile-visibility" name="visibility" defaultValue={view.profile.visibility.scope === "cell" ? "cell" : "private"}><option value="private">Somente você</option><option value="cell">Pessoas com acesso à Célula</option></select>
                    <button className="primary" disabled={busy}>
                      Salvar perfil
                    </button>
                  </form>
                </section>
                <section className="panel" id="experience">
                  <h2>Uma experiência do seu percurso</h2>
                  <p className="quiet">
                    O que você viveu ou realizou? Seu relato não será
                    apresentado como verificação.
                  </p>
                  <form onSubmit={(e) => form(e, "experience")}>
                    <label htmlFor="title">Título da experiência</label>
                    <input id="title" name="title" required maxLength={160} />
                    <label htmlFor="occurredOn">Quando aconteceu? (opcional)</label>
                    <input
                      id="occurredOn"
                      name="occurredOn"
                      type="date"
                    />
                    <label htmlFor="description">Conte o que aconteceu</label>
                    <textarea
                      id="description"
                      name="description"
                      required
                      rows={4}
                      maxLength={6000}
                    />
                    <button className="primary" disabled={busy}>
                      Guardar experiência
                    </button>
                  </form>
                </section>
              </div>
              <section>
                <h2>Experiências registradas</h2>
                {view.experiences.length ? (
                  view.experiences
                    .slice()
                    .reverse()
                    .map((e) => (
                      <article key={e.id} className="card">
                        <span className="badge">
                          Relatada por você · não verificada
                        </span>
                        <h3>{e.title}</h3>
                        <small>{e.occurredOn ? date(e.occurredOn) : "Data não informada"}</small>
                        <p className="record-text">{e.description}</p>
                      </article>
                    ))
                ) : (
                  <p className="quiet">
                    Seu percurso começa com a primeira experiência.
                  </p>
                )}
              </section>
              <section className="panel" id="capabilities">
                <h2>Capacidades e aprendizados</h2>
                <p className="quiet">Uma capacidade aceita permanece ligada à experiência que a sustenta. Aceita não significa verificada.</p>
                {(view.capabilities ?? []).length ? (view.capabilities ?? []).map((capability) => <article className="card" key={capability.id}><span className="badge">Relatada · ainda não verificada</span><h3>{capability.name}</h3><details><summary>Em que experiência se apoia?</summary><p>Proveniência: {capability.provenance.origin} · {capability.provenance.sourceIds.length} registros de origem.</p><p>Nenhuma verificação independente foi associada.</p></details></article>) : <p className="quiet">Nenhuma capacidade foi aceita neste perfil.</p>}
                {(view.capabilityCandidates ?? []).filter((candidate) => candidate.status === "PROPOSED").map((candidate) => <article className="card capability-candidate" key={candidate.id}><small>PROPOSTA LIGADA A APRENDIZADO</small><h3>{candidate.proposedName}</h3><p>Baseada em trabalho concluído e no relato atribuído correspondente; a relação não é verificação externa.</p><form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void metabolismAction({ type: "capability_candidate_decide", candidateId: candidate.id, disposition: "accept", acceptedName: String(fields.get("acceptedName") ?? ""), requestKey: crypto.randomUUID() }); }}><label htmlFor={`accepted-capability-${candidate.id}`}>Como você quer representar isso?</label><input id={`accepted-capability-${candidate.id}`} name="acceptedName" required minLength={3} maxLength={120} defaultValue={candidate.proposedName}/><button className="secondary" disabled={busy}>Aceitar como relato não verificado</button></form><button className="text-button" disabled={busy} onClick={() => void metabolismAction({ type: "capability_candidate_decide", candidateId: candidate.id, disposition: "decline", acceptedName: candidate.proposedName, requestKey: crypto.randomUUID() })}>Recusar proposta</button></article>)}
              </section>
              <section className="panel">
                <h2>Onde você também está</h2>
                <p>
                  Guarde uma referência ao seu perfil externo. Nenhuma conta
                  será conectada ou consultada.
                </p>
                <form onSubmit={(e) => form(e, "external_identity")}>
                  <div className="two-columns">
                    <div>
                      <label htmlFor="provider">Plataforma</label>
                      <input
                        id="provider"
                        name="provider"
                        placeholder="GitHub, Lattes, site pessoal…"
                        required
                        maxLength={160}
                      />
                    </div>
                    <div>
                      <label htmlFor="url">Endereço do perfil</label>
                      <input
                        id="url"
                        name="url"
                        type="url"
                        placeholder="https://…"
                        required
                        maxLength={2048}
                      />
                    </div>
                  </div>
                  <button className="secondary" disabled={busy}>
                    Guardar referência
                  </button>
                </form>
                {view.externalIdentities.map((e) => (
                  <p key={e.id}>
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {e.provider} ↗
                    </a>{" "}
                    <span className="badge">
                      Informada · titularidade não verificada
                    </span>
                  </p>
                ))}
              </section>
              <section className="panel" aria-label="Portabilidade e recuperação local">
                <h2>Levar ou recuperar seu percurso</h2>
                <p>O arquivo contém um snapshot local dos registros e o vínculo técnico necessário para reconectar a mesma conta. Não contém sessões nem concede autoridade.</p>
                <a className="secondary" href="/api/foundation?recovery=1" download="cz-foundation-recovery.json">Baixar snapshot de recuperação</a>
                <details>
                  <summary>Restaurar de um snapshot local</summary>
                  <p>A leitura prévia não altera nada. A restauração substitui a projeção local somente após confirmar que a Person, a Cell e a conta Huly correspondem; histórias conflitantes não são mescladas. Antes da troca, a base atual será copiada para backup.</p>
                  <label htmlFor="recovery-file">Arquivo de recuperação</label>
                  <input id="recovery-file" type="file" accept="application/json,.json" disabled={restoreBusy} onChange={(event) => void previewRecoveryFile(event.currentTarget.files?.[0])}/>
                  {restoreBusy && <p role="status">Validando ou restaurando com segurança…</p>}
                  {recoveryPreview && <article className="card"><h3>Leitura prévia: {recoverySnapshot?.name}</h3><p>Person: {recoveryPreview.summary.person} · Cell: {recoveryPreview.summary.cell}</p><p>{recoveryPreview.summary.records} registros · {recoveryPreview.summary.projects} Projects · {recoveryPreview.summary.workItems} Work · {recoveryPreview.summary.agreements} Agreements</p><label className="check-row"><input type="checkbox" checked={restoreConfirmed} onChange={(event) => setRestoreConfirmed(event.currentTarget.checked)}/>Entendo que esta ação substitui o estado local após backup e que histórias conflitantes não serão combinadas.</label><button className="secondary" type="button" disabled={!restoreConfirmed || restoreBusy} onClick={() => void applyRecovery()}>Confirmar restauração explícita</button></article>}
                  {restoreMessage && <p role="status" className="quiet">{restoreMessage}</p>}
                </details>
              </section>
            </>
          )}
          {section === "cells" && (
            <>
              <p className="eyebrow">AQUI É CÉLULA ZERO</p>
              <h1>{view.cell?.name ?? "Célula Zero"}</h1>
              <p className="lead">Um contexto próprio para orientar o que fazemos e como continuamos.</p>
              {view.cell ? (
              <section className="cell-place">
                  <div className="cell-place-heading">
                    <span className="cell-symbol" aria-hidden="true"><span /></span>
                    <div>
                      <small>PROPÓSITO</small>
                      <p>{view.cell.purpose}</p>
                    </div>
                  </div>
                  <div className="cell-presence">
                    <span className="avatar">{view.person.name.slice(0, 1)}</span>
                    <div>
                      <small>VOCÊ ESTÁ AQUI</small>
                      <strong>{view.person.name}</strong>
                      <p>Founder / Steward</p>
                    </div>
                  </div>
                  <div className="cell-continue">
                    <div>
                      <small>CONTINUAR</small>
                      <p>Traga para a Célula Zero o que você quer tornar possível.</p>
                    </div>
                    <Link className="primary" href="/#intention">Continuar aqui ↗</Link>
                  </div>
                  <section className="cell-work">
                    <div className="section-heading"><div><small>O QUE ESTÁ ACONTECENDO</small><h2>Trabalho da Célula</h2></div><Link href="/">Continuar na conversa ↗</Link></div>
                    {activeWork.length ? activeWork.map((work) => <div className="work-item" key={work.id}><article className="work-row" id={`entity-work-${work.id}`}><span className="status-dot"/><div><strong>{work.title}</strong><p>{work.context}</p><small>Responsável: {view.person.name}</small></div><button className="secondary" disabled={busy} onClick={() => setCompletingWorkId(completingWorkId === work.id ? null : work.id)}>{completingWorkId === work.id ? "Fechar" : "Registrar resultado"}</button></article>{workCompletionForm(work.id)}</div>) : <p className="quiet">Ainda não há trabalho ativo registrado. Você pode começar pela conversa.</p>}
                    <Link className="primary" href="/#work-title">Iniciar trabalho ↗</Link>
                  </section>
                  <section className="cell-work project-section" aria-label="Projects, possibilidades e acordos da Célula">
                    <div className="section-heading"><div><small>SONHO → COORDENAÇÃO → ENTREGA</small><h2>Projetos e possibilidades</h2></div><span className="quiet">Um Project é uma projeção de coordenação; continua distinto da Cell.</span></div>
                    {promotableInputs.filter((record) => !projectSourceIds.has(record.id)).slice().reverse().slice(0, 4).map((record) => <article className="card" key={record.id}>
                      <small>INTENÇÃO ORIGINAL · {date(record.createdAt)}</small><p>{humanRecord(record)}</p>
                      <details><summary>Esta intenção precisa de coordenação duradoura?</summary><form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void metabolismAction({ type: "project_create", sourceRecordId: record.id, title: String(fields.get("projectTitle") ?? ""), requestKey: crypto.randomUUID() }); }}><label htmlFor={`project-title-${record.id}`}>Nome do projeto</label><input id={`project-title-${record.id}`} name="projectTitle" minLength={4} maxLength={100} required defaultValue={humanRecord(record).slice(0, 100)}/><p className="quiet">O registro original continuará preservado; o Project será ligado a ele por provenance.</p><button className="secondary" disabled={busy}>Dar forma a um Project ↗</button></form></details>
                    </article>)}
                    {projects.length === 0 && promotableInputs.filter((record) => !projectSourceIds.has(record.id)).length === 0 && <p className="quiet">Nenhuma intenção precisa virar Project agora. Comece pela conversa; só promova quando coordenação duradoura ajudar.</p>}
                    {projects.map((project) => <article className="panel project-card" id={`entity-project-${project.id}`} key={project.id}>
                      <small>PROJECT · steward: {project.actors.find((candidate) => candidate.id === project.stewardActorId)?.name ?? view.person.name} · {project.stage}</small><h3>{project.title}</h3>
                      {project.opportunities.map((opportunity) => <div className="opportunity-card" id={`entity-opportunity-${opportunity.id}`} key={opportunity.id}>
                        <small>POSSIBILIDADE · {opportunity.state === "OPEN" ? "aberta" : "fechada"}</small><h4>{opportunity.title}</h4><p>{opportunity.statement}</p><p><strong>Resultado esperado:</strong> {opportunity.expectedResult}</p><details><summary>Condições e provenance</summary><p>{opportunity.conditions}</p><p>Versão atual {opportunity.currentVersion}; capacidade {opportunity.capacity}; visibilidade do projeto.</p></details>
                        {opportunity.state === "OPEN" && <details><summary>Propor uma forma de atender</summary><form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void metabolismAction({ type: "proposal_submit", projectId: project.id, opportunityId: opportunity.id, statement: String(fields.get("proposalStatement") ?? ""), conditions: String(fields.get("proposalConditions") ?? ""), expectedDelivery: String(fields.get("expectedDelivery") ?? ""), requestKey: crypto.randomUUID() }); }}><label htmlFor={`proposal-statement-${opportunity.id}`}>Abordagem proposta</label><textarea id={`proposal-statement-${opportunity.id}`} name="proposalStatement" required minLength={10} maxLength={2000} rows={2}/><label htmlFor={`proposal-conditions-${opportunity.id}`}>Condições da proposta</label><textarea id={`proposal-conditions-${opportunity.id}`} name="proposalConditions" required minLength={4} maxLength={2000} rows={2}/><label htmlFor={`proposal-delivery-${opportunity.id}`}>Entrega esperada</label><input id={`proposal-delivery-${opportunity.id}`} name="expectedDelivery" required minLength={4} maxLength={1000}/><p className="quiet">Sem obrigação econômica neste fluxo; isso nunca cria pagamento ou direito financeiro.</p><button className="secondary" disabled={busy}>Registrar proposta ↗</button></form></details>}
                        {project.proposals.filter((proposal) => proposal.opportunityId === opportunity.id).map((proposal) => <div className="proposal-card" key={proposal.id}><small>PROPOSTA · {proposal.state.replaceAll("_", " ")}</small><p>{proposal.statement}</p><p><strong>Entrega:</strong> {proposal.expectedDelivery}</p><p><strong>Condições:</strong> {proposal.conditions}</p><p className="quiet">{proposal.rewardExpectation}</p>{proposal.state === "SUBMITTED" && view.canUpdateCell && <div className="interpretation-actions"><button className="primary" disabled={busy} onClick={() => void metabolismAction({ type: "proposal_decide", projectId: project.id, proposalId: proposal.id, disposition: "accept", requestKey: crypto.randomUUID() })}>Aceitar como Commitment</button><button className="text-button" disabled={busy} onClick={() => void metabolismAction({ type: "proposal_decide", projectId: project.id, proposalId: proposal.id, disposition: "decline", requestKey: crypto.randomUUID() })}>Recusar</button></div>}</div>)}
                      </div>)}
                      {project.commitments.map((commitment) => {
                        const opportunity = project.opportunities.find((item) => item.id === commitment.opportunityId);
                        const proposal = project.proposals.find((item) => item.id === commitment.proposalId);
                        const agreement = view.agreements?.find((item) => item.commitmentId === commitment.id);
                        const packet = project.events.find((event) => event.aggregateId === commitment.id)?.payload.taskCapsuleDigest;
                        const contribution = project.contributions.find((item) => item.commitmentId === commitment.id);
                        const claim = contribution && project.claims.find((item) => item.subjectType === "CONTRIBUTION" && item.subjectId === contribution.id);
                        const artifacts = contribution ? project.artifacts.filter((item) => item.contributionId === contribution.id) : [];
                        const committedWork = view.workItems?.find((item) => item.commitmentId === commitment.id && item.status === "active");
                        const executionJobs = view.executionJobs?.filter((job) => job.commitmentId === commitment.id) ?? [];
                        const executorAvailable = capabilityReadback?.capabilities.some((capability) => capability.id === "executor:codex-cli" && capability.availability === "AVAILABLE_WITH_EXISTING_AUTH") ?? false;
                        return <div className="commitment-card" key={commitment.id}>
                          <small>COMMITMENT · aceito em {date(commitment.createdAt)}</small>
                          <p><strong>Resultado acordado:</strong> {opportunity?.expectedResult}</p>
                          <p><strong>Condições congeladas:</strong> {opportunity?.conditions} · {proposal?.conditions}</p>
                          {agreement ? <div className="agreement-card"><small>ACORDO · versão {agreement.version} · definido por {view.person.name} em {date(agreement.createdAt)}</small><p><strong>Escopo:</strong> {agreement.scope}</p><p><strong>Exclusões:</strong> {agreement.exclusions || "Nenhuma especificada."}</p><p><strong>Dependências:</strong> {agreement.dependencies || "Nenhuma especificada."}</p><p><strong>Critério de avaliação:</strong> {agreement.evaluationCriterion}</p><p><strong>Resultado esperado congelado:</strong> {agreement.expectedResult}</p><p><strong>Estado econômico:</strong> {agreement.economicMode === "NONE" ? "nenhuma obrigação definida" : agreement.economicMode.replaceAll("_", " ")}. Nenhum fundo foi movimentado pelo CZ; estado liquidado é declaração humana, não verificação.</p>{agreement.economicTerms && <p>{agreement.economicTerms.payerRole} → {agreement.economicTerms.payeeRole}; condição: {agreement.economicTerms.obligationCondition}{agreement.economicTerms.amount ? `; ${agreement.economicTerms.amount} ${agreement.economicTerms.currency}` : ""}{agreement.settlementReference ? `; referência: ${agreement.settlementReference}` : ""}</p>}{view.canUpdateCell && <details><summary>Registrar condição ou estado econômico</summary><p>Esta ação registra o que você informa; não cria pagamento, direito oculto ou verificação de liquidação.</p><form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void metabolismAction({ type: "agreement_economic_status", projectId: project.id, agreementId: agreement.id, mode: String(fields.get("economicMode") ?? "OBLIGATION_DEFINED") as "OBLIGATION_DEFINED" | "SETTLEMENT_PENDING" | "SETTLED" | "RECONCILIATION_REQUIRED", payerRole: String(fields.get("payerRole") ?? ""), payeeRole: String(fields.get("payeeRole") ?? ""), obligationCondition: String(fields.get("obligationCondition") ?? ""), amount: String(fields.get("amount") ?? ""), currency: String(fields.get("currency") ?? ""), settlementReference: String(fields.get("settlementReference") ?? ""), requestKey: crypto.randomUUID() }); }}><label htmlFor={`economic-mode-${agreement.id}`}>Estado econômico</label><select id={`economic-mode-${agreement.id}`} name="economicMode" defaultValue={agreement.economicMode === "NONE" ? "OBLIGATION_DEFINED" : agreement.economicMode === "OBLIGATION_DEFINED" ? "SETTLEMENT_PENDING" : agreement.economicMode === "SETTLEMENT_PENDING" ? "SETTLED" : "RECONCILIATION_REQUIRED"}><option value="OBLIGATION_DEFINED">Obrigação definida</option><option value="SETTLEMENT_PENDING">Liquidação pendente</option><option value="SETTLED">Liquidado segundo declaração humana</option><option value="RECONCILIATION_REQUIRED">Reconciliação necessária</option></select><label htmlFor={`economic-payer-${agreement.id}`}>Papel de quem deve</label><input id={`economic-payer-${agreement.id}`} name="payerRole" maxLength={120}/><label htmlFor={`economic-payee-${agreement.id}`}>Papel de quem recebe</label><input id={`economic-payee-${agreement.id}`} name="payeeRole" maxLength={120}/><label htmlFor={`economic-condition-${agreement.id}`}>Condição da obrigação</label><textarea id={`economic-condition-${agreement.id}`} name="obligationCondition" maxLength={1000} rows={2}/><div className="field-row"><div><label htmlFor={`economic-amount-${agreement.id}`}>Valor informado (opcional)</label><input id={`economic-amount-${agreement.id}`} name="amount" inputMode="decimal" maxLength={80}/></div><div><label htmlFor={`economic-currency-${agreement.id}`}>Moeda</label><input id={`economic-currency-${agreement.id}`} name="currency" maxLength={12}/></div></div><label htmlFor={`economic-reference-${agreement.id}`}>Referência externa (obrigatória para declarar liquidado)</label><input id={`economic-reference-${agreement.id}`} name="settlementReference" maxLength={300}/><button className="secondary" disabled={busy}>Registrar estado informado</button></form></details>}<details><summary>Authority e registro de origem</summary><p>{agreement.authorityBoundary}</p><small>Original Record de acordo · origem preservada separadamente do Commitment.</small></details></div> : view.canUpdateCell && committedWork && <details className="agreement-compose"><summary>Definir um acordo operacional para este trabalho (opcional)</summary><p>O Commitment já congela a proposta aceita. Este acordo separado torna escopo, exclusões, dependências e avaliação explícitos. Não cria obrigação econômica nem substitui a decisão de aceitar o Commitment.</p><form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void metabolismAction({ type: "agreement_define", projectId: project.id, commitmentId: commitment.id, scope: String(fields.get("agreementScope") ?? ""), exclusions: String(fields.get("agreementExclusions") ?? ""), dependencies: String(fields.get("agreementDependencies") ?? ""), evaluationCriterion: String(fields.get("agreementEvaluation") ?? ""), requestKey: crypto.randomUUID() }); }}><label htmlFor={`agreement-scope-${commitment.id}`}>O que está dentro do escopo?</label><textarea id={`agreement-scope-${commitment.id}`} name="agreementScope" required minLength={3} maxLength={2000} rows={2}/><label htmlFor={`agreement-exclusions-${commitment.id}`}>O que fica explicitamente fora?</label><textarea id={`agreement-exclusions-${commitment.id}`} name="agreementExclusions" maxLength={2000} rows={2}/><label htmlFor={`agreement-dependencies-${commitment.id}`}>De que depende?</label><textarea id={`agreement-dependencies-${commitment.id}`} name="agreementDependencies" maxLength={2000} rows={2}/><label htmlFor={`agreement-evaluation-${commitment.id}`}>Como você avaliará o resultado?</label><textarea id={`agreement-evaluation-${commitment.id}`} name="agreementEvaluation" required minLength={3} maxLength={2000} rows={2}/><p className="quiet">Limite econômico fixo: nenhum direito, pagamento ou reserva é autorizado neste Habitat.</p><button className="secondary" disabled={busy}>Registrar acordo separado do Commitment ↗</button></form></details>}
                          <p>{contribution ? "Contribuição relatada; avaliação independente continua separada." : "Nenhuma contribuição submetida ainda."} Sem instrução econômica ou movimento de fundos.</p>
                          {contribution && !claim && view.canUpdateCell && <details><summary>O que você afirma sobre esta contribuição?</summary><form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void metabolismAction({ type: "claim_record", projectId: project.id, contributionId: contribution.id, statement: String(fields.get("claimStatement") ?? ""), scopeDescription: String(fields.get("claimScope") ?? ""), requestKey: crypto.randomUUID() }); }}><label htmlFor={`claim-statement-${contribution.id}`}>Afirmação atribuída</label><textarea id={`claim-statement-${contribution.id}`} name="claimStatement" required minLength={10} maxLength={4000} rows={2} placeholder="O que você afirma que a contribuição alcançou?"/><label htmlFor={`claim-scope-${contribution.id}`}>Até onde essa afirmação se aplica?</label><input id={`claim-scope-${contribution.id}`} name="claimScope" required minLength={3} maxLength={2000} placeholder="Resultado e contexto específicos"/><p className="quiet">Claim não é Evidence ou Verification. Nenhuma prova é inferida do seu relato.</p><button className="secondary" disabled={busy}>Registrar afirmação ↗</button></form></details>}
                          {claim && <div className="claim-card"><small>AFIRMAÇÃO · registrada por {view.person.name}</small><p>{claim.statement}</p><p>Escopo: {claim.scopeDescription}</p><p className="quiet">Estado: atribuída e contestável. {project.verifications.some((verification) => verification.claimId === claim.id) ? "Uma Verification foi registrada separadamente; consulte seu método e limitações." : project.actors.some((candidate) => candidate.kind === "PERSON" && candidate.id !== claim.authorActorId) ? "Ainda sem Verification; uma segunda pessoa legítima precisa aceitar a revisão." : "Verification indisponível neste Habitat Founder N=1: não há outra Person autenticada e legitimamente relacionada para revisar. Marcos não verifica a própria afirmação."}</p></div>}
                          {claim && artifacts.length > 0 && <details><summary>Anexar um artefato como evidência desta afirmação</summary><p>O vínculo será atribuído a você e continuará marcado como não verificado independentemente. Escolha o artefato produzido neste trabalho.</p><form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void metabolismAction({ type: "evidence_attach", projectId: project.id, contributionId: contribution!.id, claimId: claim.id, artifactId: String(fields.get("artifactId") ?? ""), description: String(fields.get("description") ?? ""), limitations: String(fields.get("limitations") ?? ""), requestKey: crypto.randomUUID() }); }}><label htmlFor={`evidence-artifact-${claim.id}`}>Artefato</label><select id={`evidence-artifact-${claim.id}`} name="artifactId" required defaultValue="">{artifacts.map((artifact) => <option key={artifact.id} value={artifact.id}>{artifact.kind.replaceAll("_", " ")} · {artifact.digest.slice(0, 12)}</option>)}</select><label htmlFor={`evidence-description-${claim.id}`}>Como este artefato se relaciona à afirmação?</label><textarea id={`evidence-description-${claim.id}`} name="description" required minLength={4} maxLength={2000} rows={2}/><label htmlFor={`evidence-limitations-${claim.id}`}>Limitações ou contexto ausente</label><textarea id={`evidence-limitations-${claim.id}`} name="limitations" required minLength={4} maxLength={1000} rows={2}/><button className="secondary" disabled={busy}>Anexar evidência atribuída</button></form></details>}{claim && view.records.filter((record) => record.kind === "Evidence" && record.claimId === claim.id).map((record) => <article className="card" key={record.id}><strong>Evidência documentada · atribuída a {view.person.name}</strong><p>{record.kind === "Evidence" ? record.rationale : "Registro indisponível."}</p><p className="quiet">Verificação independente indisponível neste Habitat Founder N=1; evidência não equivale a verificação.</p></article>)}{claim && artifacts.length === 0 && <p className="quiet">Ainda não existe artefato anexável a esta afirmação. Evidência independente permanece indisponível neste contexto Founder N=1.</p>}
                          {artifacts.map((artifact) => <div className="execution-artifact" key={artifact.id}><small>ARTEFATO · {artifact.kind.replaceAll("_", " ")}</small><p>Digest {artifact.digest.slice(0, 20)}… · {artifact.mediaType}. O conteúdo preservado continua acessível no delta da execução.</p><a href={`/api/foundation?execution-delta=${encodeURIComponent(executionJobs.find((job) => job.deltaDigest === artifact.digest)?.id ?? "")}`}>Abrir artefato preservado</a></div>)}
                          {typeof packet === "string" && <details><summary>Escopo de execução preservado</summary><p>Task Capsule reutiliza as condições desta proposta e deste Opportunity. Digest: {packet}</p><p>Codex só poderá agir após autorização específica. A execução usa uma cópia Git temporária, separada do Habitat; o resultado volta como material para avaliação humana.</p></details>}
                          {executionJobs.map((job) => <article className="execution-result" key={job.id}>
                            <small>RESULTADO DO EXECUTOR · {job.status === "RUNNING" ? "em andamento" : job.status === "FAILED" ? "interrompido" : job.fabric?.classification?.replaceAll("_", " ") ?? "retornado"}</small>
                            {job.status === "RUNNING" && <p>Codex está trabalhando numa cópia isolada. Esta tela pode ser reaberta; o estado de execução fica registrado.</p>}
                            {job.status === "FAILED" && <><p>Esta tentativa não retornou um pacote completo. {job.errorCode === "EXECUTION_PROCESS_INTERRUPTED" ? "O processo foi interrompido antes do retorno." : "Nenhuma promoção ocorreu; você pode revisar o motivo ou decidir outro próximo passo."}</p><details><summary>Detalhe técnico</summary><small>{job.errorCode ?? "Falha sem código disponível"}</small></details></>}
                            {job.status === "COMPLETED" && <>
                              <p>{job.resultPackage?.whatHappened}</p>
                              <p><strong>Validações:</strong> {job.fabric?.validations.map((check) => `${check.argv.join(" ")} · ${check.exitCode === 0 ? "passou" : check.exitCode === null ? "não executada" : "falhou"}`).join("; ") || "nenhuma"}</p>
                              <p><strong>Arquivos:</strong> {job.fabric?.changedPaths.join(", ") || "nenhum arquivo alterado"}</p>
                              <p className="quiet">Este é um resultado atribuível do executor; não é Verification, decisão ou consequência aceita.</p>
                              <div className="execution-links"><a href={`/api/foundation?execution-result=${encodeURIComponent(job.id)}`} target="_blank" rel="noreferrer">Abrir Result Package</a><a href={`/api/foundation?execution-delta=${encodeURIComponent(job.id)}`}>Baixar delta preservado</a></div>
                              {job.fabric?.classification === "COMPLETED" && committedWork && committedWork.status === "active" && view.canUpdateCell && <>
                                <button className="secondary" disabled={busy} onClick={() => setCompletingWorkId(completingWorkId === committedWork.id ? null : committedWork.id)}>{completingWorkId === committedWork.id ? "Fechar avaliação" : "Avaliar entrega e registrar consequência"}</button>
                                {workCompletionForm(committedWork.id, job.id)}
                              </>}
                            </>}
                            {job.status === "COMPLETED" && job.resultDigest && <details><summary>Proveniência da execução</summary><p>Base: {job.canonicalBase}. Task Capsule: {job.taskCapsuleDigest}. Acordo: {job.agreementId} · SHA-256 {job.agreementDigest}. Result Package SHA-256: {job.resultDigest}. Delta SHA-256: {job.deltaDigest}.</p><p>O worktree Habitat não foi alterado. Nenhum commit, push, PR, merge ou deploy foi realizado.</p></details>}
                          </article>)}
                          {committedWork && agreement && view.canUpdateCell && executorAvailable && executionJobs.every((job) => job.status !== "RUNNING") && <details className="execution-authorization">
                            <summary>Autorizar Codex para este trabalho</summary>
                            <p>O Codex recebe a Task Capsule e o Acordo humano, trabalha em uma cópia limpa e descartável na base abaixo. O worktree Habitat fica intacto. Você define arquivos exatos e comandos de validação; nenhum resultado será promovido ou tratado como verificação.</p>
                            <form onSubmit={(event) => { event.preventDefault(); void executeCommittedWork(committedWork.id, event.currentTarget); }}>
                              <label htmlFor={`execution-base-${commitment.id}`}>Base canônica (HEAD atual)</label>
                              <input id={`execution-base-${commitment.id}`} name="canonicalBase" value={capabilityReadback?.head ?? ""} readOnly required aria-describedby={`execution-base-note-${commitment.id}`}/>
                              <small id={`execution-base-note-${commitment.id}`}>Se a leitura do HEAD não estiver disponível, atualize Capacidades antes de autorizar.</small>
                              <label htmlFor={`execution-paths-${commitment.id}`}>Arquivos exatos que podem mudar (um por linha)</label>
                              <textarea id={`execution-paths-${commitment.id}`} name="allowedPaths" required minLength={1} maxLength={2000} rows={3} placeholder="apps/cz-web/lib/arquivo.ts"/>
                              <label htmlFor={`execution-validations-${commitment.id}`}>Validações explícitas em JSON (argv, sem shell)</label>
                              <textarea id={`execution-validations-${commitment.id}`} name="validationCommands" required minLength={3} maxLength={4000} rows={2} defaultValue={'[["npm","run","check:vnext"]]'}/>
                              <p className="quiet">Codex pode interpretar e produzir uma mudança. Você ainda decide se aceita o resultado como contribuição. Execução não autoriza alteração fora dos arquivos indicados, Git promotion, implantação ou gasto adicional de API.</p>
                              <button className="primary" disabled={busy || !capabilityReadback?.head}>{busy ? "Execução isolada em andamento…" : "Autorizar esta execução isolada"}</button>
                            </form>
                          </details>}
                        </div>;
                      })}
                      {view.canUpdateCell && <details><summary>Abrir uma nova possibilidade neste Project</summary><form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void metabolismAction({ type: "opportunity_open", projectId: project.id, title: String(fields.get("opportunityTitle") ?? ""), statement: String(fields.get("opportunityStatement") ?? ""), conditions: String(fields.get("opportunityConditions") ?? ""), expectedResult: String(fields.get("opportunityResult") ?? ""), requestKey: crypto.randomUUID() }); }}><label htmlFor={`opportunity-title-${project.id}`}>O que precisa acontecer?</label><input id={`opportunity-title-${project.id}`} name="opportunityTitle" required minLength={4} maxLength={120}/><label htmlFor={`opportunity-statement-${project.id}`}>Por que importa?</label><textarea id={`opportunity-statement-${project.id}`} name="opportunityStatement" required minLength={10} maxLength={2000} rows={2}/><label htmlFor={`opportunity-conditions-${project.id}`}>Condições e limites</label><textarea id={`opportunity-conditions-${project.id}`} name="opportunityConditions" required minLength={4} maxLength={2000} rows={2}/><label htmlFor={`opportunity-result-${project.id}`}>Como reconhecer o resultado esperado?</label><input id={`opportunity-result-${project.id}`} name="opportunityResult" required minLength={4} maxLength={1000}/><button className="secondary" disabled={busy}>Abrir possibilidade ↗</button></form></details>}
                    </article>)}
                  </section>
                  <section className="cell-work"><div className="section-heading"><div><small>CONTEXTO INSTITUCIONAL</small><h2>Registros e decisões</h2></div><Link href="/activity">Ver atividade ↗</Link></div>{view.records.filter((record): record is Extract<typeof record, { kind: "OriginalRecord" }> => record.kind === "OriginalRecord" && record.visibility.scope === "cell").slice().reverse().slice(0, 4).map((record) => <article className="cell-record" key={record.id}><small>{record.purpose.replaceAll("_", " ")} · {date(record.createdAt)}</small><p>{humanRecord(record)}</p></article>)}</section>
                  {view.canUpdateCell && (
                    <form onSubmit={(e) => form(e, "cell")}>
                      <label htmlFor="purpose">Propósito da célula</label>
                      <textarea
                        id="purpose"
                        name="purpose"
                        defaultValue={view.cell.purpose}
                        rows={3}
                        required
                        maxLength={6000}
                      />
                      <button className="primary" disabled={busy}>
                        Atualizar propósito
                      </button>
                    </form>
                  )}
                </section>
              ) : (
                <p>Você não possui acesso a uma célula neste momento.</p>
              )}
            </>
          )}
          {section === "discover" && (
            <>
              <p className="eyebrow">NOVAS POSSIBILIDADES</p>
              <h1>
                Descobrir começa
                <br />
                pelo seu contexto.
              </h1>
              <p className="lead">Possibilidades visíveis a partir das relações e capacidades que existem de fato nesta Célula.</p>
              <form className="composer discovery-query" onSubmit={(event) => void sendTurn(event)}><label htmlFor="discover-query">Pergunte à Essenthius sobre o que esta Célula conhece</label><label className="mode-label" htmlFor="intelligence-mode">Como posso ajudar?</label><select id="intelligence-mode" value={intelligenceMode} onChange={(event) => setIntelligenceMode(event.target.value as IntelligenceMode)}><option value="interpret">Entender e compor possibilidades</option><option value="explain">Explicar o contexto conhecido</option><option value="reflect">Refletir sobre resultados e consequências</option><option value="compose">Compor capacidades para um próximo passo</option></select><textarea id="discover-query" value={intention} onChange={(event) => setIntention(event.target.value)} rows={2} maxLength={6000} placeholder="Por exemplo: que trabalho está em andamento e qual capacidade pode ajudar?"/><button className="primary" disabled={busy || !intention.trim()}>{busy ? "Essenthius está lendo o contexto…" : "Perguntar sobre este contexto"} ↗</button></form>
              {capabilityLoading && <p role="status" className="quiet">Atualizando capacidades e conexões locais…</p>}
              {capabilityError && <div className="capability-recovery"><p role="alert" className="error">{capabilityError}</p><button className="secondary" onClick={() => void loadCapabilities()}>Tentar novamente</button></div>}
              <section className="panel connected-world-summary" aria-label="Serviços que podem participar">
                <div className="section-heading"><div><small>FONTES QUE PODEM PARTICIPAR</small><h2>Conexões da Célula</h2></div></div>
                <p>{connectedProviders.some((provider) => provider.status === "CONNECTED")
                  ? "A conexão e os acessos concedidos são mostrados por serviço. Nenhum adapter live está instalado nesta Alpha."
                  : "Nenhuma conta externa está conectada. Os contratos sandbox são testes locais e não acessam contas reais."}</p>
                <div className="connected-world-list">{connectedProviders.map((provider) => <details className="connected-provider" key={provider.provider}>
                  <summary><strong>{provider.label}</strong><span>{provider.status === "CONNECTED" ? "Conectado" : provider.status === "NEEDS_ATTENTION" ? "Precisa de atenção" : "Ainda não conectado"}</span></summary>
                  <p>{provider.purpose}</p>
                  <p>{provider.liveUseAvailable ? "O escopo está concedido, mas esta Alpha ainda não consegue acessar o serviço ao vivo." : "Sem ação ao vivo disponível nesta instalação."}</p>
                  <details><summary>Ver acessos, autoridade e limites</summary>{provider.capabilities.map((capability) => <div className="connected-capability" key={capability.id}><strong>{capability.label}</strong><p>Estado: {capability.availability.replaceAll("_", " ").toLowerCase()}. {capability.reason}</p><p>Autoridade: {capability.authorityRequired}</p><p>Custo externo: desconhecido. Risco: {capability.risk.toLowerCase()}; reversível: {capability.reversible ? "sim" : "não"}.</p></div>)}<p>Fixtures sandbox não são contas e não constituem leituras de dados externos.</p></details>
                </details>)}</div>
              </section>
              <section className="cell-work" aria-label="Possibilidades ligadas ao seu contexto"><div className="section-heading"><div><small>PROJETOS · NECESSIDADES · POSSIBILIDADES</small><h2>O que pode ganhar forma agora</h2></div><Link href="/cells">Entrar na Célula ↗</Link></div>{projects.length ? projects.slice().reverse().map((project) => <article className="card" key={project.id}><small>PROJECT · {project.stage.toLowerCase()}</small><h3>{project.title}</h3><p>Ligado a uma fala/registro original preservado; Project continua sendo uma projeção de coordenação, não a Cell.</p>{project.opportunities.filter((opportunity) => opportunity.state === "OPEN").map((opportunity) => <div className="opportunity-card" id={`entity-opportunity-${opportunity.id}`} key={opportunity.id}><strong>{opportunity.title}</strong><p>{opportunity.statement}</p><p>Resultado esperado: {opportunity.expectedResult}</p><details><summary>Por que estou vendo isto?</summary><p>Possibilidade aberta explicitamente no Project, com condições e resultado esperado. A origem permanece ligada a registros CZ atribuíveis; não há autoaceitação.</p><p>Condições: {opportunity.conditions}</p></details></div>)}</article>) : <article className="panel"><h3>Nenhum Project ativo</h3><p>Uma intenção pode continuar como conversa; só ganha Project quando coordenação duradoura acrescenta valor.</p></article>}{view.experiences.slice().reverse().slice(0, 3).map((experience) => <article className="card" key={experience.id}><small>EXPERIÊNCIA RELATADA · NÃO VERIFICADA</small><h3>{experience.title}</h3><p>{experience.description}</p><details><summary>Origem e relação</summary><p>Relato próprio ligado à origem {experience.provenance.origin}; isto não verifica a experiência.</p></details></article>)}{(view.capabilities ?? []).slice().reverse().slice(0, 3).map((capability) => <article className="card" key={capability.id}><small>CAPACIDADE RELATADA · NÃO VERIFICADA</small><h3>{capability.name}</h3><details><summary>Por que pode ser relevante?</summary><p>Apoia-se em experiência relatada em {capability.provenance.sourceIds.length} registro(s), sem verificação independente associada.</p></details></article>)}</section>
              <section className="cell-work" aria-label="Aprendizados e possibilidades emergentes"><div className="section-heading"><div><small>O QUE EMERGIU DO PERCURSO</small><h2>Aprendizados e próximos possíveis</h2></div></div>{view.records.filter((record) => record.kind === "OriginalRecord" && (record.purpose === "learning" || record.purpose === "next_possibility")).slice().reverse().slice(0, 6).map((record) => <article className="card" key={record.id}><small>{record.kind === "OriginalRecord" && record.purpose === "learning" ? "APRENDIZADO · ATRIBUÍDO" : "POSSIBILIDADE · AINDA NÃO AUTORIZADA"}</small><p>{humanRecord(record)}</p><details><summary>De onde veio?</summary><p>Registro atribuível de um episódio concluído; Learning não é Verification nem capacidade universal.</p></details></article>)}{!view.records.some((record) => record.kind === "OriginalRecord" && (record.purpose === "learning" || record.purpose === "next_possibility")) && <p className="quiet">Nenhum aprendizado ou próximo possível foi registrado ainda. O Habitat não inventa possibilidades.</p>}</section>
              <section className="discovery-grid">
                <article className="panel"><small>SEU LUGAR</small><h2>{view.cell?.name ?? "Sem Célula acessível"}</h2><p>{view.cell?.purpose ?? "A relação com uma Célula não foi resolvida."}</p><Link href="/cells">Entrar na Célula ↗</Link></article>
                <article className="panel"><small>TRABALHO POSSÍVEL AGORA</small><h2>{activeWork.length ? `${activeWork.length} trabalho(s) em andamento` : "Começar algo real"}</h2><p>{activeWork[0]?.title ?? "Você pode criar um trabalho na Célula e retomá-lo depois."}</p><Link href="/#work-title">Abrir trabalho ↗</Link></article>
                <article className="panel capability-panel"><small>CAPACIDADES CONHECIDAS</small><h2>Disponibilidade e condições</h2>{capabilityReadback?.capabilities.map((capability) => <details key={capability.id}><summary>{capability.name} · {capability.availability.replaceAll("_", " ")}</summary><p>{capability.effect}</p><small>Origem: {capability.source}</small><p>Condição: {capability.conditions.join(" ")}</p><p>Autoridade: {capability.authorityRequirement}</p><p>Proveniência: {capability.provenanceStatus}</p></details>) ?? <p>Não há uma leitura atual de capacidades.</p>}</article>
                <article className="panel capability-panel"><small>RECURSOS CONHECIDOS</small><h2>Fontes reais, sem conteúdo inventado</h2>{capabilityReadback?.resources.map((resource) => <details key={resource.id}><summary>{resource.kind.replaceAll("_", " ")} · {resource.availability.replaceAll("_", " ")}</summary><p>{resource.source}</p><small>{resource.provenance}</small></details>) ?? <p>Não há uma leitura atual de recursos.</p>}</article>
                <article className="panel capability-panel"><small>MUNDO CONECTADO</small><h2>Serviços que poderão participar</h2><p>Contas reais só ficam disponíveis depois de uma autorização explícita. Nenhuma conta externa foi conectada nesta campanha; as sandboxes abaixo servem apenas para verificar contratos e nunca mostram dados reais.</p><div className="connected-world-list">{connectedProviders.map((provider) => <details className="connected-provider" key={provider.provider}><summary><strong>{provider.label}</strong><span>{provider.status === "CONNECTED" ? "Conectado" : provider.status === "NEEDS_ATTENTION" ? "Precisa de atenção" : "Ainda não conectado"}</span></summary><p>{provider.purpose}</p><p>{provider.liveUseAvailable ? "Há capacidades com acesso concedido; cada escrita ainda passa pela autoridade CZ e confirmação necessária." : "Nenhuma ação ao vivo está disponível. Uma sandbox contratual não equivale a uma conta autorizada."}</p><details><summary>Capacidades e condições</summary>{provider.capabilities.map((capability) => <div className="connected-capability" key={capability.id}><strong>{capability.label}</strong><p>Estado: {capability.availability.replaceAll("_", " ").toLowerCase()}. {capability.reason}</p><p>Autoridade: {capability.authorityRequired}</p><p>Custo: desconhecido até a conexão ser configurada. Risco: {capability.risk.toLowerCase()}; reversível: {capability.reversible ? "sim" : "não"}.</p></div>)}<p>O teste sandbox é não real; nenhuma conta, arquivo, issue, e-mail ou evento foi lido.</p></details></details>)}</div><details><summary>Leituras técnicas desta instalação</summary>{capabilityReadback?.connections.map((connection) => <details key={connection.id}><summary>{connection.name} · {connection.status.replaceAll("_", " ")}</summary><p>{connection.boundary}</p><small>Origem: {connection.source}</small><p>Evidência: {connection.evidence}</p></details>) ?? <p>Não há uma leitura atual de conexões.</p>}</details></article>
                <article className="panel"><small>PESSOAS E RELAÇÕES</small><h2>{view.person.name} · Célula {view.cell?.name ?? "não resolvida"}</h2><p>Relações institucionais nesta Célula: {view.relations.filter((relation) => relation.personId === view.person.id).map((relation) => relation.kind).join(" · ") || "nenhuma relação resolvida"}</p><p>Autoridade disponível: {view.canUpdateCell ? "leitura e atualização nesta Célula" : "leitura; sem autoridade de atualização"}.</p><Link href="/you">Ver presença ↗</Link></article>
                <article className="panel"><small>TRABALHO E REGISTROS</small><h2>{activeWork.length} em andamento · {completedWork.length} concluídos · {view.records.length} registros visíveis</h2>{[...activeWork, ...completedWork.slice().reverse()].slice(0, 5).map((work) => <p key={work.id}><strong>{work.status === "active" ? "Em andamento" : "Concluído"}:</strong> {work.title}</p>)}{view.records.slice().reverse().slice(0, 4).map((record) => <p key={record.id}><strong>{record.kind}:</strong> {record.kind === "OriginalRecord" ? humanRecord(record) : record.kind === "Interpretation" ? "Interpretação atribuída ao modelo" : "Registro institucional relacionado"}</p>)}<Link href="/activity">Abrir atividade ↗</Link></article>
                <article className="panel"><small>FONTES INFORMADAS</small><h2>{view.externalIdentities.length ? "Referências registradas no perfil" : "Nenhuma referência externa informada"}</h2>{view.externalIdentities.length ? view.externalIdentities.map((identity) => <p key={identity.id}><a href={identity.url} target="_blank" rel="noreferrer">{identity.provider} ↗</a> · referência informada, titularidade não verificada</p>) : <p>O habitat não busca ou inventa fontes. Você pode guardar referências no seu perfil.</p>}<Link href="/you">Ver sua presença ↗</Link></article>
              </section>
            </>
          )}
          {section === "activity" && (
            <>
              <p className="eyebrow">O QUE PERMANECE</p>
              <h1>Seu percurso registrado.</h1>
              <p className="lead">
                Mudanças com origem. Contexto para o próximo retorno.
              </p>
              <div className="section-heading">
                <h2>{activityRecords.length} mudanças significativas</h2>
                <a
                  className="secondary"
                  download="cz-foundation.json"
                  href="/api/foundation?export=1"
                >
                  Baixar meus registros ↓
                </a>
              </div>
              {projectActivity.length > 0 && <section className="cell-work" aria-label="Mudanças de coordenação"><div className="section-heading"><div><small>COORDENAÇÃO · CONTRIBUTION ≠ VERIFICATION</small><h2>Mudanças que alteraram o percurso</h2></div><span className="quiet">Atribuídas à autoridade que as registrou.</span></div><ol className="timeline">{projectActivity.slice().reverse().map((event) => <li key={event.id}><span className="timeline-dot"/><article><small>{date(event.occurredAt)} · {event.projectTitle}</small><h3>{projectEventLabel(event.eventType)}</h3><details><summary>Por que esta atividade apareceu?</summary><p>Origem: {event.payload.sourceRecordId ? "registro original atribuível na Célula" : "versão explícita do estado de coordenação"}. Agregado: {event.aggregateType}. Autor e autorizador são a mesma pessoa para esta experiência Founder N=1; não indica revisão independente.</p><small>Digest de provenance: {event.canonicalDigest.slice(0, 16)}…</small></details></article></li>)}</ol></section>}
              <ol className="timeline">
                {activityRecords
                  .slice()
                  .reverse()
                  .map((r) => (
                    <li key={r.id}>
                      <span className="timeline-dot" />
                      <article>
                        <small>
                          {date(r.createdAt)} ·{" "}
                          {r.authorId === view.person.id
                            ? "Marcos"
                            : "Configuração local"}
                        </small>
                        <h3>
                          {r.kind === "OriginalRecord"
                            ? {
                                intention: "Intenção guardada",
                                experience: "Experiência registrada",
                                profile: "Perfil atualizado",
                                external_identity: "Referência informada",
                                cell: "Contexto da célula",
                                bootstrap_authorization: "Presença inicial confirmada",
                                source_observation: "Contexto D059 observado",
                                work_create: "Trabalho iniciado",
                                work_complete: "Consequência do trabalho registrada",
                                work_consequence: "Consequência do trabalho registrada",
                                learning: "Aprendizado atribuído",
                                next_possibility: "Próxima possibilidade emergiu",
                                agreement: "Acordo operacional definido",
                                human_speech: "Fala original registrada",
                                action_authorization: "Ação autorizada explicitamente",
                                human_decision: "Base da decisão humana",
                                evidence_attachment: "Evidência anexada",
                                economic_status: "Estado econômico informado",
                                governance_mandate: "Consequência de mandato registrada",
                                capability_candidate: "Possibilidade de capacidade relatada",
                                meeting_opened: "Um encontro começou",
                              }[r.purpose]
                            : r.kind === "Decision" ? "Decisão humana" : r.kind}
                        </h3>
                        <p className="record-text">{humanRecord(r)}</p>
                        <details>
                          <summary>Ver registro original</summary>
                          <pre>
                            {r.kind === "OriginalRecord"
                              ? r.content
                              : JSON.stringify(r, null, 2)}
                          </pre>
                        </details>
                      </article>
                    </li>
                  ))}
              </ol>
            </>
          )}
          </details>
        </main>
        <footer>
          Seu contexto pertence a você.{" "}
          <Link href="/activity">Rever e levar seus registros ↗</Link>
        </footer>
      </div>
    </div>
  );
}
