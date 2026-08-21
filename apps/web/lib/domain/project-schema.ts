import { z } from "zod";
import type { EconomicRegime, ProjectStage } from "@/lib/domain/types";

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

export const createProjectSchema = z.object({
  title: z.string().trim().min(4, "Use pelo menos 4 caracteres.").max(100),
  summary: z.string().trim().min(20, "Explique o projeto em pelo menos 20 caracteres.").max(320),
  originalIntent: z
    .string()
    .trim()
    .min(20, "Preserve a intenção original com pelo menos 20 caracteres.")
    .max(4000),
  currentIntent: z
    .string()
    .trim()
    .min(20, "Defina a interpretação atual em pelo menos 20 caracteres.")
    .max(4000),
  intendedResult: z.string().trim().min(10, "Declare um resultado observável.").max(1000),
  rulesAndLimits: z.string().trim().min(10, "Declare regras e limites explícitos.").max(2000),
  needs: z
    .string()
    .trim()
    .min(3, "Inclua ao menos uma necessidade.")
    .max(600)
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12),
    )
    .refine((items) => items.length > 0, "Inclua ao menos uma necessidade."),
  economicRegime: z.enum(economicRegimes),
  stage: z.enum(projectStages),
  publishNow: z.boolean(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export function projectInputFromFormData(formData: FormData) {
  return createProjectSchema.safeParse({
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
