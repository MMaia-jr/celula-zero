// SPDX-License-Identifier: MPL-2.0
import type { SupabaseClient } from "@supabase/supabase-js";

export type HabitatRecord = {
  id: string;
  content: string;
  created_at: string;
  record_kind: "OriginalRecord";
  purpose: "intention";
};
export type HabitatContext = {
  profile: { id: string; display_name: string; handle: string | null; bio: string | null };
  person: { id: string; name: string };
  cell: { id: string; slug: string; name: string };
  records: HabitatRecord[];
};

export async function getHabitatContext(client: SupabaseClient): Promise<HabitatContext> {
  const { data, error } = await client.rpc("cz_vnext_habitat_context");
  if (error || !data || typeof data !== "object")
    throw new Error("HABITAT_CONTEXT_UNRESOLVED");
  const context = data as HabitatContext;
  if (
    !context.profile?.id || !context.person?.id || !context.person?.name ||
    !context.cell?.id || context.cell.slug !== "cell-zero" || !Array.isArray(context.records)
  ) throw new Error("HABITAT_CONTEXT_UNRESOLVED");
  return context;
}
