"use server";

import { redirect } from "next/navigation";
import { projectInputFromFormData, slugifyProjectTitle } from "@/lib/domain/project-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ProjectActionState {
  status: "IDLE" | "ERROR";
  message: string;
  fieldErrors: Record<string, string[]>;
}

export const initialProjectActionState: ProjectActionState = {
  status: "IDLE",
  message: "",
  fieldErrors: {},
};

export async function createProjectAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const parsed = projectInputFromFormData(formData);
  if (!parsed.success) {
    return {
      status: "ERROR",
      message: "Revise os campos indicados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return { status: "ERROR", message: "Supabase local não configurado.", fieldErrors: {} };
  }

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    return { status: "ERROR", message: "Sua sessão expirou. Entre novamente.", fieldErrors: {} };
  }

  const input = parsed.data;
  const { data, error } = await client.rpc("create_project_atomic", {
    p_title: input.title,
    p_slug_base: slugifyProjectTitle(input.title),
    p_summary: input.summary,
    p_original_intent: input.originalIntent,
    p_current_intent: input.currentIntent,
    p_intended_result: input.intendedResult,
    p_rules_and_limits: input.rulesAndLimits,
    p_needs: input.needs,
    p_economic_regime: input.economicRegime,
    p_stage: input.stage,
    p_publish: input.publishNow,
  });

  if (error) {
    return {
      status: "ERROR",
      message: "O projeto não foi criado. A transação foi revertida por segurança.",
      fieldErrors: {},
    };
  }

  const created = (Array.isArray(data) ? data[0] : data) as { slug?: string } | null;
  if (!created?.slug) {
    return { status: "ERROR", message: "O banco não retornou o projeto criado.", fieldErrors: {} };
  }

  redirect(input.publishNow ? `/projects/${created.slug}` : "/projects");
}
