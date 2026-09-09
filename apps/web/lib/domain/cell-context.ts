export type BuildReference = {
  value: string | null;
  status: "NOT_REPORTED" | "REPORTED_UNVERIFIED";
  notice: string;
};

export function describeBuildReference(value?: string | null): BuildReference {
  const normalized = value?.trim() || null;
  return normalized
    ? { value: normalized, status: "REPORTED_UNVERIFIED", notice: "Reported by this build; not verified against canonical Git state." }
    : { value: null, status: "NOT_REPORTED", notice: "No build reference was reported; currentness is unknown." };
}

export interface CellOperatingContext {
  cell: { id: string; slug: string; name: string; createdAt: string };
  policy: { id: string; version: number; state: string; rules: Record<string, unknown>; createdAt: string } | null;
  buildReference: BuildReference;
  projects: Array<{ id: string; slug: string; title: string; stage: string; visibility: string; version: number }>;
  dragonCycles: Array<{ id: string; projectId: string; phase: string; state: string; materialVersion: number; createdAt: string }>;
  companyCore: Array<{ id: string; projectId: string; dragonCycleId: string; state: string; needTitle: string; updatedAt: string }>;
  participation: { active: number; left: number; invitations: number };
  economy: { instructions: number; attempts: number; receipts: number; reconciliations: number };
  web3: { walletBindings: number; treasuryReferences: number; custodyGranted: false; authorityGranted: false };
  decisions: Array<{ id: string; projectId: string; claimId: string; disposition: string; reason: string; createdAt: string }>;
  outcomes: Array<{ id: string; decisionId: string; classification: string; statement: string; createdAt: string }>;
}
