"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  projectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  title: z.string().trim().min(4).max(160),
  statement: z.string().trim().min(10).max(4000),
  context: z.string().trim().max(2000),
  publishNow: z.boolean(),
  createCommandId: z.string().uuid(),
  createIdempotencyKey: z.string().min(8).max(180),
  publishCommandId: z.string().uuid(),
  publishIdempotencyKey: z.string().min(8).max(180),
});

export async function createNeedAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    projectSlug: formData.get("projectSlug"),
    title: formData.get("title"),
    statement: formData.get("statement"),
    context: formData.get("context") ?? "",
    publishNow: formData.get("publishNow") === "on",
    createCommandId: formData.get("createCommandId"),
    createIdempotencyKey: formData.get("createIdempotencyKey"),
    publishCommandId: formData.get("publishCommandId"),
    publishIdempotencyKey: formData.get("publishIdempotencyKey"),
  });

  if (!parsed.success) redirect("/needs?need=invalid");

  const input = parsed.data;
  const client = await createSupabaseServerClient();
  if (!client) redirect(`/projects/${input.projectSlug}?need=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    const next = `/projects/${input.projectSlug}/needs/new`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const { data: project, error: projectError } = await client
    .from("projects")
    .select("id, slug, steward_actor_id")
    .eq("slug", input.projectSlug)
    .maybeSingle();

  if (projectError || !project) redirect(`/projects/${input.projectSlug}?need=project-not-found`);

  const { data: steward, error: stewardError } = await client
    .from("actors")
    .select("id")
    .eq("id", project.steward_actor_id)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (stewardError || !steward) {
    redirect(`/projects/${input.projectSlug}?need=steward-control-denied`);
  }

  const { data: createData, error: createError } = await client.rpc("t1_create_need", {
    p_actor_id: steward.id,
    p_project_id: project.id,
    p_title: input.title,
    p_statement: input.statement,
    p_context: input.context,
    p_command_id: input.createCommandId,
    p_idempotency_key: input.createIdempotencyKey,
  });

  const created = createData as {
    ok?: boolean;
    need_id?: string;
    material_version?: number;
  } | null;

  if (createError || !created?.ok || !created.need_id || !created.material_version) {
    redirect(`/projects/${input.projectSlug}?need=create-denied`);
  }

  if (!input.publishNow) {
    revalidatePath(`/projects/${input.projectSlug}`);
    revalidatePath("/needs");
    redirect(`/projects/${input.projectSlug}?need=draft-created`);
  }

  const { data: publishData, error: publishError } = await client.rpc("t1_publish_need", {
    p_actor_id: steward.id,
    p_need_id: created.need_id,
    p_expected_material_version: created.material_version,
    p_command_id: input.publishCommandId,
    p_idempotency_key: input.publishIdempotencyKey,
  });

  const published = publishData as {
    ok?: boolean;
    need_id?: string;
    state?: string;
    visibility?: string;
  } | null;

  if (
    publishError ||
    !published?.ok ||
    published.need_id !== created.need_id ||
    published.state !== "OPEN" ||
    published.visibility !== "PUBLIC"
  ) {
    revalidatePath(`/projects/${input.projectSlug}`);
    revalidatePath("/needs");
    redirect(`/projects/${input.projectSlug}?need=draft-created-publish-failed`);
  }

  revalidatePath(`/projects/${input.projectSlug}`);
  revalidatePath("/needs");
  revalidatePath(`/needs/${created.need_id}`);
  redirect(`/projects/${input.projectSlug}?need=published`);
}
