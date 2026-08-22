"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createOpportunitySchema = z.object({
  projectId: z.string().uuid(),
  projectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  title: z.string().trim().min(4).max(160),
  statement: z.string().trim().min(10).max(4000),
  conditions: z.string().trim().min(3).max(4000),
  expectedResult: z.string().trim().min(3).max(2000),
  capacity: z.coerce.number().int().min(1).max(100),
  publishNow: z.boolean(),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(160),
});

function workbenchError(code: string): never {
  redirect(`/workbench?error=${encodeURIComponent(code)}`);
}

export async function createOpportunityAction(formData: FormData): Promise<void> {
  const parsed = createOpportunitySchema.safeParse({
    projectId: formData.get("projectId"),
    projectSlug: formData.get("projectSlug"),
    title: formData.get("title"),
    statement: formData.get("statement"),
    conditions: formData.get("conditions"),
    expectedResult: formData.get("expectedResult"),
    capacity: formData.get("capacity"),
    publishNow: formData.get("publishNow") === "on",
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) workbenchError("INVALID_INPUT");

  const client = await createSupabaseServerClient();
  if (!client) workbenchError("BACKEND_UNAVAILABLE");

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) redirect("/login");

  const input = parsed.data;
  const { data: project, error: projectError } = await client
    .from("projects")
    .select("id, slug, steward_actor_id")
    .eq("id", input.projectId)
    .eq("slug", input.projectSlug)
    .maybeSingle();

  if (projectError || !project) workbenchError("PROJECT_NOT_FOUND");

  const { data: controller, error: controllerError } = await client
    .from("actor_memberships")
    .select("actor_id")
    .eq("profile_id", authData.user.id)
    .eq("actor_id", project.steward_actor_id)
    .in("role", ["OWNER", "OPERATOR", "REPRESENTATIVE"])
    .limit(1)
    .maybeSingle();

  if (controllerError || !controller) workbenchError("STEWARD_CONTROL_REQUIRED");

  const { data: created, error: createError } = await client.rpc("b1_create_opportunity", {
    p_actor_id: project.steward_actor_id,
    p_project_id: project.id,
    p_title: input.title,
    p_statement: input.statement,
    p_conditions: input.conditions,
    p_expected_result: input.expectedResult,
    p_capacity: input.capacity,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  if (createError) workbenchError("CREATE_DENIED");

  const createdResult = created as { opportunity_id?: string; material_version?: number } | null;
  if (!createdResult?.opportunity_id || createdResult.material_version !== 1) {
    workbenchError("CREATE_RESULT_INVALID");
  }

  if (input.publishNow) {
    const { error: publishError } = await client.rpc("b1_publish_opportunity", {
      p_actor_id: project.steward_actor_id,
      p_opportunity_id: createdResult.opportunity_id,
      p_expected_material_version: 1,
      p_command_id: crypto.randomUUID(),
      p_idempotency_key: `${input.idempotencyKey}:publish`,
    });

    revalidatePath("/workbench");
    revalidatePath(`/projects/${project.slug}`);

    if (publishError) {
      redirect(`/workbench?partial=${createdResult.opportunity_id}`);
    }

    redirect(`/workbench?created=${createdResult.opportunity_id}&state=OPEN`);
  }

  revalidatePath("/workbench");
  redirect(`/workbench?created=${createdResult.opportunity_id}&state=DRAFT`);
}
