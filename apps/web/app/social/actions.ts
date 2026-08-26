"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  targetType: z.enum(["ACTOR", "PROJECT", "NEED"]),
  targetId: z.string().uuid(),
  returnTo: z.string().startsWith("/").max(500),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

async function controlledPersonActor() {
  const client = await createSupabaseServerClient();
  if (!client) return { client: null, actorId: null, authenticated: false };

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return { client, actorId: null, authenticated: false };

  const { data: actor, error } = await client
    .from("actors")
    .select("id")
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .limit(1)
    .maybeSingle();

  if (error || !actor) return { client, actorId: null, authenticated: true };
  return { client, actorId: actor.id, authenticated: true };
}

function safeReturn(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/activity";
}

async function mutateFollow(
  formData: FormData,
  operation: "START" | "END",
): Promise<void> {
  const parsed = schema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    returnTo: formData.get("returnTo"),
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) redirect("/activity?follow=invalid");

  const input = parsed.data;
  const returnTo = safeReturn(input.returnTo);
  const context = await controlledPersonActor();

  if (!context.client) redirect(`${returnTo}?follow=backend-unavailable`);
  if (!context.authenticated) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  if (!context.actorId) redirect(`${returnTo}?follow=person-actor-required`);

  const rpc = operation === "START" ? "t1_follow_target" : "t1_unfollow_target";
  const { data, error } = await context.client.rpc(rpc, {
    p_actor_id: context.actorId,
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  const result = data as { ok?: boolean; state?: string } | null;
  if (error || !result?.ok) redirect(`${returnTo}?follow=denied`);

  revalidatePath(returnTo);
  revalidatePath("/activity");
  revalidatePath("/me");
  redirect(`${returnTo}?follow=${operation === "START" ? "started" : "ended"}`);
}

export async function followTargetAction(formData: FormData): Promise<void> {
  return mutateFollow(formData, "START");
}

export async function unfollowTargetAction(formData: FormData): Promise<void> {
  return mutateFollow(formData, "END");
}
