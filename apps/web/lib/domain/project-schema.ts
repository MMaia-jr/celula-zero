import { z } from "zod";
import type { EconomicRegime, ProjectStage } from "@/lib/domain/types";
import { coerceLocale, type Locale } from "@/lib/i18n/core";

const economicRegimes = [
  "VOLUNTARY",
  "EXCHANGE",
  "BOUNTY_EXTERNAL",
  "SPONSORSHIP",
  "INVESTMENT_INTEREST",
] as const satisfies readonly EconomicRegime[];

const projectStages = [
  "OPEN",
  "ACTIVE",
  "PAUSED",
] as const satisfies readonly ProjectStage[];

function messages(locale: Locale) {
  const en = locale === "en";
  return {
    title: en ? "Use at least 4 characters." : "Use pelo menos 4 caracteres.",
    summary: en
      ? "Explain the project in at least 20 characters."
      : "Explique o projeto em pelo menos 20 caracteres.",
    originalIntent: en
      ? "Preserve the original intent in at least 20 characters."
      : "Preserve a intenção original com pelo menos 20 caracteres.",
    currentIntent: en
      ? "Define the current interpretation in at least 20 characters."
      : "Defina a interpretação atual em pelo menos 20 caracteres.",
    intendedResult: en
      ? "Declare an observable result."
      : "Declare um resultado observável.",
    rules: en
      ? "Declare explicit rules and limits."
      : "Declare regras e limites explícitos.",
    needs: en
      ? "Include at least one need."
      : "Inclua ao menos uma necessidade.",
  };
}

export function createProjectSchemaForLocale(locale: Locale) {
  const m = messages(locale);

  return z.object({
    title: z.string().trim().min(4, m.title).max(100),
    summary: z.string().trim().min(20, m.summary).max(320),
    originalIntent: z.string().trim().min(20, m.originalIntent).max(4000),
    currentIntent: z.string().trim().min(20, m.currentIntent).max(4000),
    intendedResult: z.string().trim().min(10, m.intendedResult).max(1000),
    rulesAndLimits: z.string().trim().min(10, m.rules).max(2000),
    needs: z
      .string()
      .trim()
      .min(3, m.needs)
      .max(600)
      .transform((value) =>
        value
          .split(/[,\n]+/)
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 12),
      )
      .refine((items) => items.length > 0, m.needs),
    economicRegime: z.enum(economicRegimes),
    stage: z.enum(projectStages),
    publishNow: z.boolean(),
  });
}

export const createProjectSchema = createProjectSchemaForLocale("pt");

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export function projectInputFromFormData(formData: FormData) {
  const locale = coerceLocale(formData.get("locale"));
  return createProjectSchemaForLocale(locale).safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    originalIntent: formData.get("originalIntent"),
    currentIntent: formData.get("currentIntent"),
    intendedResult: formData.get("intendedResult"),
    rulesAndLimits: formData.get("rulesAndLimits"),
    needs: formData.get("needs"),
    economicRegime: formData.get("economicRegime"),
    stage: formData.get("stage"),
    publishNow: formData.get("publishNow") === "on",
  });
}

export function slugifyProjectTitle(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}
