// SPDX-License-Identifier: MPL-2.0
import { createHash } from "node:crypto";
import {
  intelligenceInterpretationSchema,
  type InstitutionalIntelligencePort,
  type IntelligenceContext,
  type IntelligenceMode,
  type IntelligenceResult,
} from "./port";
import { boundedInstitutionalContext } from "./context-budget";

export const DEFAULT_LOCAL_MODEL = "qwen3:4b";
const DEFAULT_OLLAMA_BASE = "http://127.0.0.1:11434";
const MAX_TURN_CHARS = 6000;

function localBaseUrl(value = process.env.CZ_OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE): string {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "::1"].includes(url.hostname) || url.username || url.password)
    throw new Error("OLLAMA_LOCAL_ENDPOINT_MUST_BE_LOOPBACK");
  return url.toString().replace(/\/$/, "");
}

function promptFor(mode: IntelligenceMode, text: string, context: IntelligenceContext) {
  return [
    "Você é o adapter de modelo local a serviço da inteligência institucional Essenthius da Célula Zero.",
    "Você NÃO é Essenthius, autoridade humana, executor, fonte canônica ou memória institucional.",
    "Esta saída é somente uma INTERPRETATION atribuída ao modelo. Não é OriginalRecord humano, Evidence, Verification ou Decision.",
    "Use somente o CONTEXTO fornecido. Não invente pessoas, projetos, relações, fatos, capacidades ou estado canônico.",
    "ACTIVE_DIRECTION é a prioridade humana atual e pode ser LOCAL / NOT CANONICAL; mantenha-a distinta do readback canônico. Use progresso como projeção, não autoridade. Priorize-a. Work antigo não é prioridade nem autorização automaticamente. Se estiver ausente, diga que a direção local atual não foi carregada.",
    "CURRENT_CAPABILITIES é o inventário do produto; PROFILE_CAPABILITY_CANDIDATES são possibilidades pessoais. Não confunda. AVAILABLE_CAPABILITIES usa apenas IDs de CURRENT_CAPABILITIES.",
    "Não execute ferramentas nem sugira que uma ação já ocorreu. Uma proposta não escreve estado; somente ação humana confirmada pode fazê-lo.",
    "Preserve incerteza, indique informação ausente e responda em português claro. Sem chain-of-thought.",
    "Retorne somente JSON válido com os campos: whatIUnderstand, relevantContext (no máximo 6 itens), availableCapabilities (no máximo 6 IDs), composition, missingCapability (string ou null), conditions (no máximo 6 itens), authorityRequired, why, nextAction, workProposal (null ou {title,context}), experienceProposal (opcional: {title,description,occurredOn,uncertainty}), continuationProposal (opcional: {possibility,question}).",
    "Se a pessoa relatar experiência, mantenha o relato sem ampliar fatos e use occurredOn=null quando não houver data. Se perguntar o que isso pode tornar possível, qualquer continuationProposal deve ser hipótese exploratória, nunca fato/compromisso, e não deve persistir nada.",
    `MODO=${mode}`,
    `CONTEXTO INSTITUCIONAL CZ=${boundedInstitutionalContext(context)}`,
    `MENSAGEM ORIGINAL DO MARCOS=${text.slice(0, MAX_TURN_CHARS)}`,
  ].join("\n\n");
}

function parseJsonContent(content: string, allowedCapabilities: Set<string>) {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("OLLAMA_RESPONSE_NOT_STRUCTURED");
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned.slice(start, end + 1)); }
  catch { throw new Error("OLLAMA_RESPONSE_INVALID_JSON"); }
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

export class OllamaLocalAdapter implements InstitutionalIntelligencePort {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetcher: typeof fetch;

  constructor(options: { baseUrl?: string; model?: string; fetch?: typeof fetch } = {}) {
    this.baseUrl = localBaseUrl(options.baseUrl);
    this.model = options.model ?? process.env.CZ_LOCAL_ESSENTHIUS_MODEL ?? DEFAULT_LOCAL_MODEL;
    this.fetcher = options.fetch ?? fetch;
  }

  interpret(input: { text: string; context: IntelligenceContext; mode?: IntelligenceMode; signal?: AbortSignal }) {
    return this.run({ ...input, mode: input.mode ?? "interpret" });
  }
  compose(input: { text: string; context: IntelligenceContext; signal?: AbortSignal }) {
    return this.run({ ...input, mode: "compose" });
  }
  explain(input: { text: string; context: IntelligenceContext; signal?: AbortSignal }) {
    return this.run({ ...input, mode: "explain" });
  }
  reflect(input: { text: string; context: IntelligenceContext; signal?: AbortSignal }) {
    return this.run({ ...input, mode: "reflect" });
  }

  private async run(input: { text: string; context: IntelligenceContext; mode: IntelligenceMode; signal?: AbortSignal }): Promise<IntelligenceResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("OLLAMA_LOCAL_TIMEOUT")), 150_000);
    const signal = input.signal ? AbortSignal.any([input.signal, controller.signal]) : controller.signal;
    const contextJson = boundedInstitutionalContext(input.context);
    const prompt = promptFor(input.mode, input.text, input.context);
    try {
      const response = await this.fetcher(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
        body: JSON.stringify({
          model: this.model,
          stream: false,
          keep_alive: 0,
          think: false,
          format: "json",
          options: { temperature: 0.2, num_ctx: 8192, num_predict: 700 },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) throw new Error(`OLLAMA_LOCAL_HTTP_${response.status}`);
      const envelope = await response.json() as {
        message?: { content?: string };
        prompt_eval_count?: number;
        eval_count?: number;
        done?: boolean;
      };
      if (envelope.done === false) throw new Error("OLLAMA_LOCAL_INCOMPLETE_RESPONSE");
      const availableStatuses = new Set(["AVAILABLE", "AVAILABLE_WITH_HUMAN_CONFIRMATION", "BACKGROUND_ONLY"]);
      const known = new Set(input.context.currentCapabilities
        ? input.context.currentCapabilities.filter((capability) => availableStatuses.has(capability.availability)).map((capability) => capability.id)
        : input.context.capabilities.map((capability) => capability.id));
      const interpretation = parseJsonContent(envelope.message?.content ?? "", known);
      interpretation.availableCapabilities = interpretation.availableCapabilities.filter((id) => known.has(id));
      return {
        interpretation,
        provider: "OLLAMA_LOCAL",
        model: this.model,
        inputTokens: Number.isSafeInteger(envelope.prompt_eval_count) ? envelope.prompt_eval_count! : null,
        outputTokens: Number.isSafeInteger(envelope.eval_count) ? envelope.eval_count! : null,
        contextDigest: createHash("sha256").update(contextJson).digest("hex"),
        requestId: null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function listLocalModels(options: { baseUrl?: string; fetch?: typeof fetch; signal?: AbortSignal } = {}) {
  try {
    const base = localBaseUrl(options.baseUrl);
    const response = await (options.fetch ?? fetch)(`${base}/api/tags`, { signal: options.signal ?? AbortSignal.timeout(2000) });
    if (!response.ok) return { available: false as const, models: [] as string[] };
    const data = await response.json() as { models?: Array<{ name?: string }> };
    return { available: true as const, models: (data.models ?? []).flatMap((model) => typeof model.name === "string" ? [model.name] : []) };
  } catch {
    return { available: false as const, models: [] as string[] };
  }
}
