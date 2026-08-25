"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const profileSchema = z
  .object({
    handle: z
      .string()
      .trim()
      .max(32)
      .refine(
        (value) => value === "" || /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,30}[a-zA-Z0-9]$/.test(value),
        "Handle inválido.",
      ),
    displayName: z.string().trim().min(2).max(100),
    bio: z.string().trim().max(800),
    visibility: z.enum(["PRIVATE", "PUBLIC"]),
  })
  .refine((value) => value.visibility !== "PUBLIC" || value.handle.length >= 3, {
    message: "Um Profile público precisa de handle.",
    path: ["handle"],
  });

export async function updateMyProfileAction(formData: FormData): Promise<void> {
  const parsed = profileSchema.safeParse({
    handle: formData.get("handle"),
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
    visibility: formData.get("visibility"),
  });

  if (!parsed.success) redirect("/me?profile=invalid");

  const client = await createSupabaseServerClient();
  if (!client) redirect("/me?profile=backend-unavailable");

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) redirect("/login?next=/me");

  const { data, error } = await client.rpc("update_my_profile", {
    p_handle: parsed.data.handle,
    p_display_name: parsed.data.displayName,
    p_bio: parsed.data.bio,
    p_visibility: parsed.data.visibility,
  });

  const result = data as
    | { ok?: boolean; handle?: string | null; visibility?: "PRIVATE" | "PUBLIC" }
    | null;

  if (error || !result?.ok) {
    const code =
      error?.message.includes("CZ409:HANDLE_TAKEN")
        ? "handle-taken"
        : error?.message.includes("CZ422")
          ? "invalid"
          : "denied";
    redirect(`/me?profile=${code}`);
  }

  revalidatePath("/me");
  if (result.visibility === "PUBLIC" && result.handle) {
    revalidatePath(`/people/${result.handle}`);
  }
  redirect("/me?profile=updated");
}
