export const PARTICIPATION_NOTICE =
  "Invitation, consent, participation, role, delegation, and membership are distinct. Acceptance grants none of the latter three.";

export const PARTICIPANT_CONTEXT_NOTICE =
  "This is bounded participant read access. It does not grant Cell membership, a role, delegation, administration, or economic authority.";

export function tokenFromFragment(fragment: string): string | null {
  const value = new URLSearchParams(fragment.replace(/^#/, "")).get("token");
  return value && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

export type ParticipationActionState = { ok: boolean; message: string };

export interface ParticipantCellContext {
  schema: "cz.participant-cell-context.v1";
  cell: { id: string; slug: string; name: string };
  policy: { id: string | null; version: number | null; state: string | null };
  participation: {
    id: string;
    status: "ACTIVE";
    joinedAt: string;
    materialVersion: number;
  };
  invitation: { purpose: string | null };
  projects: Array<{
    id: string;
    slug: string;
    title: string;
    stage: string;
    visibility: "PUBLIC";
  }>;
  permissions: {
    readBoundedContext: true;
    leaveOwnParticipation: true;
  };
  boundaries: {
    participationGrantsMembership: false;
    participationGrantsRole: false;
    participationGrantsDelegation: false;
    participationGrantsAuthority: false;
    readAccessGrantsAuthority: false;
  };
  notice: string;
}
