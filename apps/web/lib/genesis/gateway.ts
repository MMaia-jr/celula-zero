export const GENESIS_MODEL = "moonshotai/kimi-k2.6";
export const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";
export const GENESIS_MAX_OUTPUT_TOKENS = 800;

export type GatewayPreparation =
  | { status: "READY"; model: typeof GENESIS_MODEL; baseUrl: typeof AI_GATEWAY_BASE_URL; maxOutputTokens: number }
  | { status: "UNAVAILABLE"; reason: string };

export function getGatewayPreparation(environment: NodeJS.ProcessEnv = process.env): GatewayPreparation {
  const key = environment.AI_GATEWAY_API_KEY?.trim();
  if (!key || key.startsWith("replace-")) {
    return { status: "UNAVAILABLE", reason: "AI_GATEWAY_API_KEY is not configured server-side." };
  }
  return { status: "READY", model: GENESIS_MODEL, baseUrl: AI_GATEWAY_BASE_URL, maxOutputTokens: GENESIS_MAX_OUTPUT_TOKENS };
}

export async function callPreparedGateway(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: { fetch?: typeof fetch; environment?: NodeJS.ProcessEnv } = {},
) {
  const environment = options.environment ?? process.env;
  const preparation = getGatewayPreparation(environment);
  if (preparation.status !== "READY") return preparation;
  const response = await (options.fetch ?? fetch)(`${AI_GATEWAY_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${environment.AI_GATEWAY_API_KEY!.trim()}` },
    body: JSON.stringify({ model: GENESIS_MODEL, messages, max_tokens: GENESIS_MAX_OUTPUT_TOKENS, temperature: 0.2 }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return { status: "UNAVAILABLE" as const, reason: `Gateway failed closed (${response.status}).` };
  return { status: "COMPLETED" as const, response: await response.json() };
}
