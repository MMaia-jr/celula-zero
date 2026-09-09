import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getEconomySummary(cellId: string) {
  const client = await createSupabaseServerClient();
  if (!client) return { instructions: 0, attempts: 0, receipts: 0, reconciliations: 0 };
  const tables = ["economic_instructions", "settlement_attempts", "settlement_receipts", "settlement_reconciliations"] as const;
  const results = await Promise.all(tables.map((table) => client.from(table).select("id", { count: "exact", head: true }).eq("cell_id", cellId)));
  const error = results.find((result) => result.error)?.error;
  if (error) throw new Error(`Economy summary denied: ${error.message}`);
  const [instructions, attempts, receipts, reconciliations] = results;
  return { instructions: instructions?.count ?? 0, attempts: attempts?.count ?? 0, receipts: receipts?.count ?? 0, reconciliations: reconciliations?.count ?? 0 };
}
