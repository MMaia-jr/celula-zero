import { describe, expect, test, vi } from "vitest";
import { callAiGateway } from "@/lib/domain/ai-gateway";

describe("Company Core AI Gateway", () => {
  test("returns not-configured when env is missing", async () => {
    vi.stubEnv("AI_GATEWAY_BASE_URL", "");
    vi.stubEnv("AI_GATEWAY_API_KEY", "");

    const result = await callAiGateway({
      model: "moonshotai/kimi-k2.6",
      messages: [{ role: "user", content: "test" }],
    });

    expect(result.ok).toBe(false);
    expect(result.failureCode).toBe("AI_GATEWAY_NOT_CONFIGURED");
    expect(result.costSource).toBe("UNKNOWN");
  });

  test("parses successful Gateway response and preserves unknown cost", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "moonshotai/kimi-k2.6",
        choices: [{ message: { content: "  Mocked recommendation  " } }],
        usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
      }),
    });

    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("AI_GATEWAY_BASE_URL", "https://gateway.example.com/v1");
    vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

    const result = await callAiGateway({
      model: "moonshotai/kimi-k2.6",
      messages: [
        { role: "system", content: "You are a test assistant." },
        { role: "user", content: "Hello" },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.output).toBe("Mocked recommendation");
    expect(result.model).toBe("moonshotai/kimi-k2.6");
    expect(result.provider).toBe("moonshotai");
    expect(result.usage.promptTokens).toBe(1000);
    expect(result.usage.completionTokens).toBe(500);
    expect(result.usage.totalTokens).toBe(1500);
    expect(result.costSource).toBe("UNKNOWN");
    expect(result.costUsd).toBeNull();

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs).toBeDefined();
    const requestBody = JSON.parse(String(callArgs?.[1]?.body ?? "{}"));
    expect(requestBody.model).toBe("moonshotai/kimi-k2.6");
    expect(requestBody.temperature).toBe(0.3);
  });

  test("handles Gateway HTTP error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limited",
    });

    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("AI_GATEWAY_BASE_URL", "https://gateway.example.com/v1");
    vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

    const result = await callAiGateway({
      model: "moonshotai/kimi-k2.6",
      messages: [{ role: "user", content: "test" }],
    });

    expect(result.ok).toBe(false);
    expect(result.failureCode).toBe("GATEWAY_HTTP_429");
  });

  test("handles network exception", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("AI_GATEWAY_BASE_URL", "https://gateway.example.com/v1");
    vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

    const result = await callAiGateway({
      model: "moonshotai/kimi-k2.6",
      messages: [{ role: "user", content: "test" }],
    });

    expect(result.ok).toBe(false);
    expect(result.failureCode).toBe("GATEWAY_EXCEPTION_Error");
  });
});
