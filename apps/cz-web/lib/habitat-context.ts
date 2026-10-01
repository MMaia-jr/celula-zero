// SPDX-License-Identifier: MPL-2.0
import type { SupabaseClient } from "@supabase/supabase-js";

export type HabitatRecord = {
  id: string;
  content: string;
  created_at: string;
  record_kind: "OriginalRecord";
  purpose: "intention";
};
export type HabitatWorkItem = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "done";
  source: "human_confirmed_conversation";
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};
export type HabitatContext = {
  profile: { id: string; display_name: string; handle: string | null; bio: string | null; visibility?: string; created_at?: string; updated_at?: string };
  person: { id: string; name: string };
  cell: { id: string; slug: string; name: string; relation?: string };
  records: HabitatRecord[];
  workItems: HabitatWorkItem[];
};

export async function getHabitatContext(client: SupabaseClient): Promise<HabitatContext> {
  const { data, error } = await client.rpc("cz_vnext_habitat_context");
  if (error || !data || typeof data !== "object")
    throw new Error("HABITAT_CONTEXT_UNRESOLVED");
  const context = data as HabitatContext;
  if (
    !context.profile?.id || !context.person?.id || !context.person?.name ||
    !context.cell?.id || context.cell.slug !== "cell-zero" || !Array.isArray(context.records) ||
    !Array.isArray(context.workItems)
  ) throw new Error("HABITAT_CONTEXT_UNRESOLVED");
  return context;
}
