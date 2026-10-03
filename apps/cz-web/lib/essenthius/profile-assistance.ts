// SPDX-License-Identifier: MPL-2.0
export type ProfileField = "headline" | "bio";
export interface ProfileDraftProposal {
  field: ProfileField;
  current: string;
  proposed: string;
  sourceIds: string[];
  uncertainty: string;
  visibilityImpact: string;
}

export function acceptSelectedProfileFields(
  current: { headline: string; bio: string },
  proposals: ProfileDraftProposal[],
  accepted: Partial<Record<ProfileField, string>>,
) {
  const result: Partial<Record<ProfileField, string>> = {};
  for (const field of ["headline", "bio"] as const) {
    if (!(field in accepted)) continue;
    const proposal = proposals.find((item) => item.field === field);
    if (!proposal || typeof accepted[field] !== "string") continue;
    result[field] = accepted[field]!;
  }
  return { ...current, ...result };
}

export function mergeManualProfileEdit(
  current: { headline: string; bio: string; displayName?: string },
  manual: { headline?: string; bio?: string; displayName?: string },
) {
  return { ...current, ...manual };
}
