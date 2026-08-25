import type { ActorKind, EconomicRegime, ProjectStage } from "@/lib/domain/types";

export type Locale = "pt" | "en";

export function isLocale(value: unknown): value is Locale {
  return value === "pt" || value === "en";
}

export function coerceLocale(value: unknown, fallback: Locale = "pt"): Locale {
  return isLocale(value) ? value : fallback;
}

export function htmlLang(locale: Locale) {
  return locale === "en" ? "en" : "pt-BR";
}

const stageLabels: Record<Locale, Record<ProjectStage, string>> = {
  pt: {
    DRAFT: "Rascunho",
    OPEN: "Aberto",
    ACTIVE: "Ativo",
    PAUSED: "Pausado",
    COMPLETED: "Concluído",
    ABANDONED: "Encerrado",
  },
  en: {
    DRAFT: "Draft",
    OPEN: "Open",
    ACTIVE: "Active",
    PAUSED: "Paused",
    COMPLETED: "Completed",
    ABANDONED: "Closed",
  },
};

const economicLabels: Record<Locale, Record<EconomicRegime, string>> = {
  pt: {
    VOLUNTARY: "Voluntário",
    EXCHANGE: "Troca",
    BOUNTY_EXTERNAL: "Bounty externo",
    SPONSORSHIP: "Patrocínio declarado",
    INVESTMENT_INTEREST: "Interesse não vinculante",
  },
  en: {
    VOLUNTARY: "Voluntary",
    EXCHANGE: "Exchange",
    BOUNTY_EXTERNAL: "External bounty",
    SPONSORSHIP: "Declared sponsorship",
    INVESTMENT_INTEREST: "Non-binding investment interest",
  },
};

const actorLabels: Record<Locale, Record<ActorKind, string>> = {
  pt: {
    PERSON: "Pessoa",
    AI_AGENT: "Agente de IA",
    ORGANIZATION: "Organização",
    SYSTEM: "Sistema",
  },
  en: {
    PERSON: "Person",
    AI_AGENT: "AI agent",
    ORGANIZATION: "Organization",
    SYSTEM: "System",
  },
};

export function stageLabel(stage: ProjectStage, locale: Locale) {
  return stageLabels[locale][stage];
}

export function economicRegimeLabel(regime: EconomicRegime, locale: Locale) {
  return economicLabels[locale][regime];
}

export function actorKindLabel(kind: ActorKind, locale: Locale) {
  return actorLabels[locale][kind];
}

export function formatLocalizedDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export interface ProjectPresentationTranslation {
  summary: string;
  originalIntent: string;
  currentIntent: string;
  intendedResult: string;
  rulesAndLimits: string;
}

const englishProjectPresentations: Record<string, ProjectPresentationTranslation> = {
  "celula-zero": {
    summary:
      "Experimental coordination environment where people and agents turn needs into proposals, commitments, contributions, evidence, verifications, and reconstructible decisions.",
    originalIntent:
      "Build a space where people and agents can coordinate real work without confusing claims with evidence, activity with contribution, identity with authority, or reputation with truth.",
    currentIntent:
      "Make Célula Zero a genuinely habitable community through its own use: publish real needs, enable voluntary entry, receive external proposals, observe contributions, and learn from the behavior that emerges.",
    intendedResult:
      "A functional community in which external participants can enter, understand real needs, propose contributions, produce verifiable results, and return for new coordination.",
    rulesAndLimits:
      "Do not manufacture activity to produce metrics. Do not grant implicit authority. Claims, evidence, verifications, and decisions remain distinct objects. Additional technology is introduced only when a concrete property requires it. Voluntary contributions should be traceable without turning participation into universal reputation.",
  },
};

const projectNeedsPresentations: Record<string, Record<Locale, string[]>> = {
  "celula-zero": {
    pt: [
      "onboarding",
      "usabilidade",
      "engenharia",
      "pesquisa",
      "auditoria",
      "documentação",
      "design",
      "coordenação",
    ],
    en: [
      "onboarding",
      "usability",
      "engineering",
      "research",
      "audit",
      "documentation",
      "design",
      "coordination",
    ],
  },
};

export function projectPresentationTranslation(slug: string, locale: Locale) {
  return locale === "en" ? englishProjectPresentations[slug] ?? null : null;
}

export function projectPresentationNeeds(
  slug: string,
  locale: Locale,
  sourceNeeds: string[],
) {
  return projectNeedsPresentations[slug]?.[locale] ?? sourceNeeds;
}
