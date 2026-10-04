// SPDX-License-Identifier: MPL-2.0
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import {
  intelligenceInterpretationSchema,
  type InstitutionalIntelligencePort,
  type IntelligenceContext,
  type IntelligenceMode,
  type IntelligenceResult,
} from "./port";
import { boundedInstitutionalContext } from "./context-budget";

const MAX_TURN_CHARS = 6000;
const TIMEOUT_MS = 45_000;
const MAX_OUTPUT_BYTES = 256 * 1024;
const profileDraftSchema = z.object({
  fields: z.array(z.object({
    field: z.enum(["headline", "bio"]),
    proposed: z.string().trim().max(3000),
    sourceIds: z.array(z.string().trim().min(1).max(160)).max(12),
    uncertainty: z.string().trim().min(1).max(500),
  }).strict()).max(2),
}).strict();
export type ProfileDraftField = z.infer<typeof profileDraftSchema>["fields"][number];
export interface ProfileDraftInput {
  current: { headline: string; bio: string };
  experiences: Array<{ id: string; title: string; description: string }>;
  capabilities: Array<{ id: string; name: string }>;
  contributions: Array<{ id: string; description: string }>;
  records: Array<{ id: string; purpose: string; content: string }>;
}

function promptFor(mode: IntelligenceMode, text: string, context: IntelligenceContext) {
  return [
    "Você é uma capacidade de interpretação a serviço da identidade institucional contínua Essenthius. Atue como companhia e testemunha contextual humilde, ajudando a lembrar, perguntar, compor e refletir; não alegue sentiência.",
    "Você NÃO é Essenthius, autoridade humana, executor, fonte canônica ou memória institucional.",
    "Esta saída é somente uma INTERPRETATION atribuída ao modelo. Não é OriginalRecord humano, Evidence, Verification ou Decision.",
    "Use somente o CONTEXTO fornecido. Não invente pessoas, projetos, relações, fatos, capacidades ou estado canônico.",
    "ACTIVE_DIRECTION é a prioridade humana atual e pode estar marcada LOCAL / NOT CANONICAL; mantenha-a distinta do readback canônico. Use seu progresso como relato/projeção, não como autoridade. Priorize-a para dizer o que vem agora. Open Work antigo é real e localizável, mas não vira prioridade nem autorização automaticamente. Se ACTIVE_DIRECTION estiver ausente, não infira prioridade atual a partir de STATE ou Work antigo; diga que a direção local atual não foi carregada.",
    "Trechos Git são source observations com commit/path, não novos registros institucionais nem prova automática de Human Direction atual. Código local dirty também não é canônico.",
    "CURRENT_CAPABILITIES é o inventário do produto; PROFILE_CAPABILITY_CANDIDATES são possibilidades pessoais. Não confunda. Só anuncie capacidade como disponível se availability for AVAILABLE ou AVAILABLE_WITH_HUMAN_CONFIRMATION (esta última exige dizer a confirmação); BACKGROUND_ONLY só para tarefas de fundo. CONFIGURED_BUT_UNAVAILABLE, NOT_CONFIGURED e HISTORICAL_ONLY não são utilizáveis agora: explique a condição sem as anunciar como capacidade disponível. AVAILABLE_CAPABILITIES pode conter somente IDs de capacidade aplicáveis; devolva [] se nenhuma servir.",
    "Não execute ações nem sugira que uma ação já ocorreu. Propostas não escrevem estado; somente ação humana confirmada pode fazê-lo.",
    "Preserve incerteza, indique informação ausente, responda em português claro e não revele raciocínio interno.",
    "Retorne somente JSON válido com os campos: whatIUnderstand, relevantContext (no máximo 6 itens), availableCapabilities (no máximo 6 IDs, somente as mais relevantes), composition, missingCapability (string ou null), conditions (no máximo 6 itens), authorityRequired, why, nextAction, workProposal (null ou {title,context}), openTarget (opcional: null ou {kind,id} escolhido SOMENTE de CONTEXTO.entities), experienceProposal (opcional: {title,description,occurredOn,uncertainty}), continuationProposal (opcional: {possibility,question}), meetingProposal (opcional: {title,purpose}).",
    "Se a pessoa perguntar onde está algo, como abrir/continuar trabalho, projeto, possibilidade, reunião ou experiência, escolha openTarget somente quando existir correspondência exata em CONTEXTO.entities. Nunca invente IDs. Caso contrário omita openTarget.",
    "Se a pessoa relatar claramente uma experiência própria que queira incluir em sua trajetória, você pode propor experienceProposal, mas preserve o relato sem ampliar fatos. occurredOn é null quando a data não foi informada. Isto é somente rascunho; a pessoa revisa e confirma antes de qualquer registro.",
    "Se a pessoa também perguntar o que essa experiência pode tornar possível, você pode incluir continuationProposal com UMA possibilidade explicitamente exploratória e uma pergunta de continuação. Apoie-se no relato atual e em capabilities/contexto realmente fornecidos; não apresente hipótese como fato, promessa, direito, projeto ou compromisso. A proposta é interpretação somente e não deve ser persistida nem abrir trabalho automaticamente.",
    "Quando a pessoa pedir para registrar uma experiência, priorize esse rascunho e a possibilidade de continuação solicitada. Não proponha Work genérico ao mesmo tempo, a menos que ela também peça trabalho explícito.",
    "Se a pessoa pedir para reunir pessoas/Essenthius ou iniciar uma reunião, você pode propor meetingProposal usando só propósito expresso. É apenas um rascunho até a pessoa confirmar. Nunca invente participantes humanos ou organizacionais.",
    `MODO=${mode}`,
    `CONTEXTO INSTITUCIONAL CZ=${boundedInstitutionalContext(context)}`,
    `MENSAGEM ORIGINAL DO MARCOS=${text.slice(0, MAX_TURN_CHARS)}`,
  ].join("\n\n");
}

export function codexPromptMetrics(mode: IntelligenceMode, text: string, context: IntelligenceContext) {
  const contextCharacters = boundedInstitutionalContext(context).length;
  const promptCharacters = promptFor(mode, text, context).length;
  return { contextCharacters, promptCharacters, estimatedPromptTokens: Math.ceil(promptCharacters / 4) };
}

function parseInterpretation(content: string, allowedCapabilities: Set<string>) {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("CODEX_CLI_RESPONSE_NOT_STRUCTURED");
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned.slice(start, end + 1)); }
  catch { throw new Error("CODEX_CLI_RESPONSE_INVALID_JSON"); }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const candidate = parsed as Record<string, unknown>;
    if (Array.isArray(candidate.relevantContext)) candidate.relevantContext = candidate.relevantContext.slice(0, 6);
    if (Array.isArray(candidate.availableCapabilities)) candidate.availableCapabilities = candidate.availableCapabilities
      .filter((id): id is string => typeof id === "string" && allowedCapabilities.has(id))
      .slice(0, 6);
    if (Array.isArray(candidate.conditions)) candidate.conditions = candidate.conditions.slice(0, 6);
  }
  return intelligenceInterpretationSchema.parse(parsed);
}

function parseProfileDraft(content: string): ProfileDraftField[] {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("CODEX_CLI_PROFILE_DRAFT_NOT_STRUCTURED");
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned.slice(start, end + 1)); }
  catch { throw new Error("CODEX_CLI_PROFILE_DRAFT_INVALID_JSON"); }
  return profileDraftSchema.parse(parsed).fields;
}

function profileDraftPrompt(input: ProfileDraftInput) {
  const allowed = new Set([
    ...input.experiences.map((item) => item.id),
    ...input.capabilities.map((item) => item.id),
    ...input.contributions.map((item) => item.id),
    ...input.records.map((item) => item.id),
  ]);
  return [
    "Você é um modelo substituível preparando uma proposta para a inteligência institucional Essenthius apresentar; não é Essenthius, autoridade nem fonte de fatos.",
    "Use somente os dados fornecidos. Não invente fatos, competências, títulos ou experiências. Não altere o estado.",
    "Sugira apenas campos que possam ser sustentados pelas fontes. Cite somente sourceIds recebidos. Se não houver base segura para mudar um campo, omita-o.",
    "Retorne somente JSON: {fields:[{field:'headline'|'bio',proposed:string,sourceIds:string[],uncertainty:string}]}. Máximo de dois campos.",
    `PERFIL ATUAL=${JSON.stringify(input.current)}`,
    `EXPERIÊNCIAS CONFIRMADAS=${JSON.stringify(input.experiences)}`,
    `CAPACIDADES ACEITAS COMO RELATO=${JSON.stringify(input.capabilities)}`,
    `CONTRIBUIÇÕES ATRIBUÍDAS=${JSON.stringify(input.contributions)}`,
    `REGISTROS ATRIBUÍDOS=${JSON.stringify(input.records)}`,
    `IDs DE FONTE PERMITIDOS=${JSON.stringify([...allowed])}`,
  ].join("\n\n");
}

interface CliResult {
  text: string;
  threadId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

interface CodexEvent {
  type: string;
  thread_id?: unknown;
  item?: { type?: unknown; text?: unknown; error?: unknown; code?: unknown };
  error?: unknown;
  usage?: { input_tokens?: unknown; output_tokens?: unknown };
}

function safeCode(value: unknown) {
  return typeof value === "string" ? value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 48) : "";
}

export function codexInferenceArgs() {
  return [
    "exec", "--ephemeral", "--sandbox", "read-only", "--ignore-user-config", "--ignore-rules",
    "--skip-git-repo-check", "--json", "--cd", "/tmp",
    // `-c tools.*=false` is not the CLI feature switch and can leave tools
    // available. Use Codex's supported feature flags so this adapter remains
    // a text-only interpreter; read-only sandbox is an additional boundary.
    "--disable", "shell_tool", "--disable", "apps", "--disable", "browser_use",
    "--disable", "computer_use", "--disable", "view_image", "--disable", "remote_plugin",
    "--disable", "plugins", "--disable", "code_mode_host", "--disable", "sleep_tool", "-",
  ];
}

function invokeCodex(prompt: string, signal?: AbortSignal): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const executable = process.env.CZ_CODEX_BIN ?? join(homedir(), ".local", "bin", "codex");
    const child = spawn(executable, codexInferenceArgs(), {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        HOME: homedir(),
        PATH: process.env.PATH ?? "/usr/bin:/bin:/usr/sbin:/sbin",
        NODE_ENV: process.env.NODE_ENV ?? "production",
        ...(process.env.CODEX_HOME ? { CODEX_HOME: process.env.CODEX_HOME } : {}),
        ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}),
        ...(process.env.LANG ? { LANG: process.env.LANG } : {}),
      },
    });
    child.stdin.end(prompt, "utf8");
    let receivedOutputBytes = 0;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish(new Error("CODEX_CLI_TIMEOUT"));
    }, TIMEOUT_MS);
    const abort = () => {
      child.kill("SIGTERM");
      finish(new Error("CODEX_CLI_ABORTED"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    let stdout = "";
    let stderr = "";
    let threadId: string | null = null;
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    let finalText = "";
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve({ text: finalText, threadId, inputTokens, outputTokens });
    };
    if (signal?.aborted) {
      child.kill("SIGTERM");
      finish(new Error("CODEX_CLI_ABORTED"));
      return;
    }
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      receivedOutputBytes += Buffer.byteLength(chunk);
      if (receivedOutputBytes > MAX_OUTPUT_BYTES) {
        child.kill("SIGTERM");
        finish(new Error("CODEX_CLI_OUTPUT_LIMIT"));
        return;
      }
      const lines = stdout.split("\n");
      stdout = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let event: CodexEvent;
        try { event = JSON.parse(line) as CodexEvent; }
        catch { child.kill("SIGTERM"); finish(new Error("CODEX_CLI_INVALID_EVENT")); return; }
        if (event.type === "thread.started") threadId = typeof event.thread_id === "string" ? event.thread_id : null;
        const itemType = typeof event.item?.type === "string" ? event.item.type : "";
        if (event.type.startsWith("item.") && !["agent_message", "reasoning", "plan_update", "summary", "error"].includes(itemType)) {
          child.kill("SIGTERM");
          finish(new Error(`CODEX_CLI_TOOL_USE_BLOCKED:${itemType.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 48) || "unknown"}`));
          return;
        }
        if (event.type === "item.completed" && itemType === "agent_message")
          finalText = typeof event.item?.text === "string" ? event.item.text : finalText;
        if (event.type === "turn.completed") {
          inputTokens = typeof event.usage?.input_tokens === "number" && Number.isSafeInteger(event.usage.input_tokens) ? event.usage.input_tokens : null;
          outputTokens = typeof event.usage?.output_tokens === "number" && Number.isSafeInteger(event.usage.output_tokens) ? event.usage.output_tokens : null;
        }
        if (event.type === "turn.failed" || event.type === "error") {
          child.kill("SIGTERM");
          const code = safeCode(event.item?.code) || safeCode(event.error);
          finish(new Error(`CODEX_CLI_TURN_FAILED${code ? `:${code}` : ""}`));
          return;
        }
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => { stderr = `${stderr}${chunk}`.slice(-8000); });
    child.on("error", () => finish(new Error("CODEX_CLI_UNAVAILABLE")));
    child.on("close", (code) => {
      if (stdout.trim()) {
        try {
          const event = JSON.parse(stdout) as CodexEvent;
          const itemType = typeof event.item?.type === "string" ? event.item.type : "";
          if (event.type.startsWith("item.") && !["agent_message", "reasoning", "plan_update", "summary", "error"].includes(itemType)) {
            finish(new Error(`CODEX_CLI_TOOL_USE_BLOCKED:${itemType.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 48) || "unknown"}`));
            return;
          }
          if (event.type === "item.completed" && itemType === "agent_message" && typeof event.item?.text === "string") finalText = event.item.text;
          if (event.type === "turn.completed") {
            inputTokens = typeof event.usage?.input_tokens === "number" && Number.isSafeInteger(event.usage.input_tokens) ? event.usage.input_tokens : null;
            outputTokens = typeof event.usage?.output_tokens === "number" && Number.isSafeInteger(event.usage.output_tokens) ? event.usage.output_tokens : null;
          }
        } catch { finish(new Error("CODEX_CLI_INVALID_EVENT")); return; }
      }
      if (code !== 0) finish(new Error(stderr.includes("not logged in") ? "CODEX_CLI_NOT_AUTHENTICATED" : "CODEX_CLI_FAILED"));
      else finish(finalText ? undefined : new Error("CODEX_CLI_EMPTY_RESPONSE"));
    });
  });
}

export class CodexCliAdapter implements InstitutionalIntelligencePort {
  private readonly invoke: typeof invokeCodex;

  constructor(options: { invoke?: typeof invokeCodex } = {}) {
    this.invoke = options.invoke ?? invokeCodex;
  }

  interpret(input: { text: string; context: IntelligenceContext; mode?: IntelligenceMode; signal?: AbortSignal }) {
    return this.run({ ...input, mode: input.mode ?? "interpret" });
  }
  compose(input: { text: string; context: IntelligenceContext; signal?: AbortSignal }) { return this.run({ ...input, mode: "compose" }); }
  explain(input: { text: string; context: IntelligenceContext; signal?: AbortSignal }) { return this.run({ ...input, mode: "explain" }); }
  reflect(input: { text: string; context: IntelligenceContext; signal?: AbortSignal }) { return this.run({ ...input, mode: "reflect" }); }

  async draftProfile(input: ProfileDraftInput, signal?: AbortSignal) {
    const response = await this.invoke(profileDraftPrompt(input), signal);
    const allowed = new Set([...input.experiences.map((item) => item.id), ...input.capabilities.map((item) => item.id), ...input.contributions.map((item) => item.id), ...input.records.map((item) => item.id)]);
    const fields = parseProfileDraft(response.text)
      .map((field) => ({ ...field, sourceIds: field.sourceIds.filter((id) => allowed.has(id)) }))
      .filter((field) => field.sourceIds.length > 0 && field.proposed.length > 0);
    return { fields, requestId: response.threadId, inputTokens: response.inputTokens, outputTokens: response.outputTokens };
  }

  private async run(input: { text: string; context: IntelligenceContext; mode: IntelligenceMode; signal?: AbortSignal }): Promise<IntelligenceResult> {
    const contextJson = boundedInstitutionalContext(input.context);
    const prompt = promptFor(input.mode, input.text, input.context);
    const response = await this.invoke(prompt, input.signal);
    const availableStatuses = new Set(["AVAILABLE", "AVAILABLE_WITH_HUMAN_CONFIRMATION", "BACKGROUND_ONLY"]);
    const known = new Set(input.context.currentCapabilities
      ? input.context.currentCapabilities.filter((capability) => availableStatuses.has(capability.availability)).map((capability) => capability.id)
      : input.context.capabilities.map((capability) => capability.id));
    const interpretation = parseInterpretation(response.text, known);
    interpretation.availableCapabilities = interpretation.availableCapabilities.filter((id) => known.has(id));
    if (interpretation.openTarget && !input.context.entities?.some((entity) => entity.kind === interpretation.openTarget?.kind && entity.id === interpretation.openTarget?.id)) delete interpretation.openTarget;
    return {
      interpretation,
      provider: "CODEX_CLI_CHATGPT",
      model: "codex-cli-default",
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      contextDigest: createHash("sha256").update(contextJson).digest("hex"),
      requestId: response.threadId,
      contextCharacters: contextJson.length,
      promptCharacters: prompt.length,
    };
  }
}
