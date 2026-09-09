export const PARTICIPATION_NOTICE =
  "Invitation, consent, participation, role, delegation, and membership are distinct. Acceptance grants none of the latter three.";

export function tokenFromFragment(fragment: string): string | null {
  const value = new URLSearchParams(fragment.replace(/^#/, "")).get("token");
  return value && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

export type ParticipationActionState = { ok: boolean; message: string };
