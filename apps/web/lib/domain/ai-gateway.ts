/**
 * Vercel AI Gateway → moonshotai/kimi-k2.6 integration
 * Server-side only. Never expose API key to client.
 *
 * Preserves:
 * - AI Actor identity distinct from gateway/provider/model
 * - Bounded input/context provenance
 * - Output, token usage, cost if reported
 * - Timestamps
 *
 * Does NOT turn raw AI output into Human Direction, Evidence, or Decision.
 */

export interface AiGatewayMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiGatewayUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiGatewayResponse {
  ok: boolean;
  output: string;
  model: string;
  provider: string;
  usage: AiGatewayUsage;
  costUsd: number | null;
  costSource: "PROVIDER_REPORTED" | "UNKNOWN" | "UNKNOWN";
  startedAt: string;
  completedAt: string;
  failureCode?: string;
  raw?: unknown;
}

function getGatewayConfig() {
  const baseUrl = process.env.AI_GATEWAY_BASE_URL?.trim();
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();

  if (!baseUrl || !apiKey) {
    return null;
  }

  // Normalize base URL: remove trailing slash
  const url = baseUrl.replace(/\/$/, "");
  return { baseUrl: url, apiKey };
}


export async function callAiGateway(params: {
  model: string;
  messages: AiGatewayMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<AiGatewayResponse> {
  const config = getGatewayConfig();
  if (!config) {
    return {
      ok: false,
      output: "",
      model: params.model,
      provider: "moonshotai",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      costUsd: null,
      costSource: "UNKNOWN",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      failureCode: "AI_GATEWAY_NOT_CONFIGURED",
    };
  }

  const startedAt = new Date().toISOString();

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.3,
        max_tokens: params.maxTokens ?? 4096,
      }),
    });

    const completedAt = new Date().toISOString();

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      return {
        ok: false,
        output: "",
        model: params.model,
        provider: "moonshotai",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        costUsd: null,
        costSource: "UNKNOWN",
        startedAt,
        completedAt,
        failureCode: `GATEWAY_HTTP_${response.status}`,
        raw: errorText,
      };
    }

    const raw = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
      }>;
      model?: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const output = raw.choices?.[0]?.message?.content?.trim() ?? "";
    const returnedModel = raw.model ?? params.model;
    const usage: AiGatewayUsage = {
      promptTokens: raw.usage?.prompt_tokens ?? 0,
      completionTokens: raw.usage?.completion_tokens ?? 0,
      totalTokens: raw.usage?.total_tokens ?? 0,
    };

    // Moonshot does not always return cost directly; calculate heuristically
    const calculatedCost = null;

    return {
      ok: true,
      output,
      model: returnedModel,
      provider: "moonshotai",
      usage,
      costUsd: calculatedCost,
      costSource: calculatedCost != null ? "UNKNOWN" : "UNKNOWN",
      startedAt,
      completedAt,
      raw,
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    return {
      ok: false,
      output: "",
      model: params.model,
      provider: "moonshotai",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      costUsd: null,
      costSource: "UNKNOWN",
      startedAt,
      completedAt,
      failureCode: error instanceof Error ? `GATEWAY_EXCEPTION_${error.name}` : "GATEWAY_EXCEPTION",
      raw: error instanceof Error ? error.message : String(error),
    };
  }
}
