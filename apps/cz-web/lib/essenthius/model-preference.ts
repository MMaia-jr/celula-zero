// SPDX-License-Identifier: MPL-2.0
export type ModelPreference = "auto" | "codex-cli" | "ollama-local";
export type ModelProvider = Exclude<ModelPreference, "auto">;
export type ModelPreferenceRequest = ModelPreference | "unavailable-kimi" | "ask-current" | "ask-cost";

export interface ProviderSelection {
  provider: ModelProvider | null;
  model: string | null;
  reason: string;
  fallbackUsed: boolean;
}

export function selectModelProvider(input: {
  preference: ModelPreference;
  codexAuthenticated: boolean;
  localInteractive: boolean;
}): ProviderSelection {
  if (input.preference === "ollama-local") {
    if (!input.localInteractive) return { provider: null, model: null, reason: "O modelo local não atende ao limite de latência interativa deste host.", fallbackUsed: false };
    return { provider: "ollama-local", model: "qwen3:4b", reason: "Escolha manual: modelo local dentro do limite interativo.", fallbackUsed: false };
  }
  if (input.preference === "codex-cli") {
    return input.codexAuthenticated
      ? { provider: "codex-cli", model: "codex-cli-default", reason: "Escolha manual do Human: Codex autenticado.", fallbackUsed: false }
      : { provider: null, model: null, reason: "Codex CLI não está autenticado neste processo.", fallbackUsed: false };
  }
  if (input.codexAuthenticated) return { provider: "codex-cli", model: "codex-cli-default", reason: "AUTO: Codex autenticado é o provider interativo disponível; modelo local excede o orçamento de latência.", fallbackUsed: false };
  if (input.localInteractive) return { provider: "ollama-local", model: "qwen3:4b", reason: "AUTO: fallback para o modelo local interativo; Codex não está autenticado.", fallbackUsed: true };
  return { provider: null, model: null, reason: "AUTO: nenhum provider interativo está disponível.", fallbackUsed: false };
}

export function detectModelPreferenceRequest(text: string): ModelPreference | "unavailable-kimi" | "ask-current" | "ask-cost" | null {
  const value = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(kimi|kimi k2(?:\.6)?)\b/.test(value) && /\b(usa|use|troca|muda|modelo|ia|provider)\b/.test(value)) return "unavailable-kimi";
  if (/\b(volta|retorna|muda|troca|usa|use)\b.*\b(auto|automatico)\b|\b(auto|automatico)\b.*\b(conversa|modelo|provider)\b/.test(value)) return "auto";
  if (/\b(codex)\b/.test(value) && /\b(usa|use|troca|muda|modelo|provider)\b/.test(value)) return "codex-cli";
  if (/\b(local|ollama)\b/.test(value) && /\b(usa|use|troca|muda|modelo|ia|provider)\b/.test(value)) return "ollama-local";
  if (/\b(qual|que)\b.*\b(modelo|provider|ia)\b.*\b(usando|usa|utiliza)\b/.test(value)) return "ask-current";
  if (/\b(qual|que)\b.*\b(modelo|provider|ia)\b.*\b(barato|custo|custa)\b|\b(qual|que)\b.*\b(mais barato|menor custo)\b/.test(value)) return "ask-cost";
  return null;
}
