import { getMyProfile } from "@/lib/data/profiles";
import { getWorkbenchData } from "@/lib/data/workbench";
import { getAiJobOperationalStatus, listCompanyCoreCycles } from "@/lib/data/company-core";
import { composeCurrentOperation } from "@/lib/domain/current-operation";

export async function getCurrentOperation() {
  // Do not load operational contexts until Profile and PERSON have been reconstructed.
  const identity = await getMyProfile();
  if (identity.status !== "READY") return { ...identity, items: [] };
  const [workbench, cycles] = await Promise.all([getWorkbenchData(), listCompanyCoreCycles()]);
  if (workbench.status !== "READY") return { status: workbench.status, items: [] };
  const ownedCycles = cycles.filter((cycle) => cycle.ownerActorId === identity.profile.actorId);
  const observedCycles = await Promise.all(ownedCycles.map(async (cycle) => ({
    ...cycle,
    aiJobState: cycle.state === "AI_RUNNING" && cycle.aiRunId
      ? (await getAiJobOperationalStatus(cycle.aiRunId))?.state ?? null
      : null,
  })));
  return { status: "READY" as const, profile: identity.profile, items: composeCurrentOperation(observedCycles, workbench.projects) };
}
