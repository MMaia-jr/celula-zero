import { createSupabaseServerClient } from "@/lib/supabase/server";
import { describeBuildReference, type CellOperatingContext } from "@/lib/domain/cell-context";
import { getEconomySummary } from "@/lib/data/economy";
import { getWeb3Summary } from "@/lib/data/web3";

export async function getCellOperatingContext(cellId: string): Promise<CellOperatingContext | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return null;

  const cellResult = await client.from("cells").select("id,slug,name,current_policy_version_id,created_at").eq("id", cellId).maybeSingle();
  if (cellResult.error) throw new Error(`Cell read denied: ${cellResult.error.message}`);
  if (!cellResult.data) return null;
  const policyId = cellResult.data.current_policy_version_id as string | null;

  const [policy, projects, dragons, core, participations, invitations, decisions, outcomes, economy, web3] = await Promise.all([
    policyId ? client.from("policy_versions").select("id,version,state,rules,created_at").eq("id", policyId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    client.from("projects").select("id,slug,title,stage,visibility,version").eq("cell_id", cellId).order("created_at"),
    client.from("dragon_cycles").select("id,project_id,current_phase,state,material_version,created_at").eq("cell_id", cellId).order("created_at"),
    client.from("company_core_cycles").select("id,project_id,dragon_cycle_id,state,need_title,updated_at").eq("cell_id", cellId).order("created_at"),
    client.from("cell_participations").select("status").eq("cell_id", cellId),
    client.from("cell_invitations").select("id", { count: "exact", head: true }).eq("cell_id", cellId),
    client.from("domain_decisions").select("id,project_id,claim_id,disposition,reason,created_at").eq("cell_id", cellId).order("created_at"),
    client.from("outcomes").select("id,decision_id,classification,statement,created_at").eq("cell_id", cellId).order("created_at"),
    getEconomySummary(cellId), getWeb3Summary(cellId),
  ]);
  const queryError = [policy, projects, dragons, core, participations, invitations, decisions, outcomes].find((result) => result.error)?.error;
  if (queryError) throw new Error(`Cell context failed closed: ${queryError.message}`);

  return {
    cell: { id: cellResult.data.id, slug: cellResult.data.slug, name: cellResult.data.name, createdAt: cellResult.data.created_at },
    policy: policy.data ? { id: policy.data.id, version: policy.data.version, state: policy.data.state, rules: policy.data.rules as Record<string, unknown>, createdAt: policy.data.created_at } : null,
    buildReference: describeBuildReference(process.env.NEXT_PUBLIC_BUILD_REF),
    projects: (projects.data ?? []).map((r) => ({ id:r.id,slug:r.slug,title:r.title,stage:r.stage,visibility:r.visibility,version:r.version })),
    dragonCycles: (dragons.data ?? []).map((r) => ({ id:r.id,projectId:r.project_id,phase:r.current_phase,state:r.state,materialVersion:r.material_version,createdAt:r.created_at })),
    companyCore: (core.data ?? []).map((r) => ({ id:r.id,projectId:r.project_id,dragonCycleId:r.dragon_cycle_id,state:r.state,needTitle:r.need_title,updatedAt:r.updated_at })),
    participation: { active:(participations.data ?? []).filter((r) => r.status === "ACTIVE").length, left:(participations.data ?? []).filter((r) => r.status === "LEFT").length, invitations:invitations.count ?? 0 },
    economy, web3,
    decisions: (decisions.data ?? []).map((r) => ({ id:r.id,projectId:r.project_id,claimId:r.claim_id,disposition:r.disposition,reason:r.reason,createdAt:r.created_at })),
    outcomes: (outcomes.data ?? []).map((r) => ({ id:r.id,decisionId:r.decision_id,classification:r.classification,statement:r.statement,createdAt:r.created_at })),
  };
}
