"use server";

import { redirect } from "next/navigation";
import { getGenesisSession, persistOriginalRecord } from "@/lib/genesis/records";

export async function recordGenesisMessage(formData: FormData) {
  const content = typeof formData.get("message") === "string" ? String(formData.get("message")).trim() : "";
  if (!content || new TextEncoder().encode(content).length > 65_536) redirect("/genesis?record=invalid");
  const session = await getGenesisSession();
  if (session.status !== "READY") redirect("/login?next=%2Fgenesis");
  const result = await persistOriginalRecord(session.identity.personId, content);
  redirect(result.ok ? "/genesis?record=preserved" : "/genesis?record=unavailable");
}
