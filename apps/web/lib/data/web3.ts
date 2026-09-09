import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getWeb3Summary(cellId: string) {
  const client = await createSupabaseServerClient();
  if (!client) return { walletBindings: 0, treasuryReferences: 0, custodyGranted: false as const, authorityGranted: false as const };
  const [wallets, treasuries] = await Promise.all([
    client.from("wallet_bindings").select("id", { count: "exact", head: true }).eq("cell_id", cellId),
    client.from("treasury_references").select("id", { count: "exact", head: true }).eq("cell_id", cellId),
  ]);
  if (wallets.error || treasuries.error) throw new Error(`Web3 summary denied: ${wallets.error?.message ?? treasuries.error?.message}`);
  return { walletBindings: wallets.count ?? 0, treasuryReferences: treasuries.count ?? 0, custodyGranted: false as const, authorityGranted: false as const };
}
