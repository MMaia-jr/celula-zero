import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  controlledActorForParticipation,
  uniqueControlledPersonActor,
  type ParticipantCellContext,
} from "@/lib/domain/participation";

const CONTROL_ROLES = ["OWNER", "OPERATOR", "REPRESENTATIVE"] as const;

export async function controlledPersonActor() {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await client
    .from("actor_memberships")
    .select("actor_id, actors!inner(kind)")
    .eq("profile_id", auth.user.id)
    .in("role", [...CONTROL_ROLES])
    .eq("actors.kind", "PERSON");

  if (error) {
    throw new Error(`Participant Boundary resolution failed: ${error.message}`);
  }

  return uniqueControlledPersonActor(
    (data ?? []).map((row) => row.actor_id as string),
  );
}

export async function controlledPersonActorForParticipation(
  participationId: string,
) {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return null;

  const { data: participation, error: participationError } = await client
    .from("cell_participations")
    .select("actor_id")
    .eq("id", participationId)
    .maybeSingle();

  if (participationError) {
    throw new Error(
      `Participation Actor resolution failed: ${participationError.message}`,
    );
  }
  if (!participation?.actor_id) return null;

  const { data: memberships, error: membershipError } = await client
    .from("actor_memberships")
    .select("actor_id, actors!inner(kind)")
    .eq("profile_id", auth.user.id)
    .eq("actor_id", participation.actor_id)
    .in("role", [...CONTROL_ROLES])
    .eq("actors.kind", "PERSON");

  if (membershipError) {
    throw new Error(
      `Participation Actor control check failed: ${membershipError.message}`,
    );
  }

  return controlledActorForParticipation(
    participation.actor_id,
    (memberships ?? []).map((row) => row.actor_id as string),
  );
}

export async function listCellParticipations(cellId: string) {
  const client = await createSupabaseServerClient();
  if (!client) return [];
  const { data, error } = await client
    .from("cell_participations")
    .select("id,actor_id,status,joined_at,left_at,material_version")
    .eq("cell_id", cellId)
    .order("joined_at");
  if (error) throw new Error(`Participation read failed: ${error.message}`);
  return data ?? [];
}

type RawParticipantContext = {
  schema: "cz.participant-cell-context.v1";
  cell: { id: string; slug: string; name: string };
  policy: { id: string | null; version: number | null; state: string | null };
  participation: { id: string; status: "ACTIVE"; joined_at: string; material_version: number };
  invitation: { purpose: string | null };
  projects: Array<{ id: string; slug: string; title: string; stage: string; visibility: "PUBLIC" }>;
  permissions: { read_bounded_context: true; leave_own_participation: true };
  boundaries: {
    participation_grants_membership: false;
    participation_grants_role: false;
    participation_grants_delegation: false;
    participation_grants_authority: false;
    read_access_grants_authority: false;
  };
  notice: string;
};

export async function getParticipantCellContext(
  participationId: string,
): Promise<ParticipantCellContext | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  const actorId = await controlledPersonActorForParticipation(participationId);
  if (!actorId) return null;

  const { data, error } = await client.rpc("k002_get_participant_cell_context", {
    p_actor_id: actorId,
    p_participation_id: participationId,
  });

  if (error) {
    if (error.message.includes("CZ403:ACTIVE_PARTICIPATION_REQUIRED")) return null;
    throw new Error(`Participant context failed closed: ${error.message}`);
  }
  if (!data || typeof data !== "object") {
    throw new Error("Participant context returned no object.");
  }

  const raw = data as unknown as RawParticipantContext;
  return {
    schema: raw.schema,
    cell: raw.cell,
    policy: raw.policy,
    participation: {
      id: raw.participation.id,
      status: raw.participation.status,
      joinedAt: raw.participation.joined_at,
      materialVersion: raw.participation.material_version,
    },
    invitation: raw.invitation,
    projects: raw.projects,
    permissions: {
      readBoundedContext: raw.permissions.read_bounded_context,
      leaveOwnParticipation: raw.permissions.leave_own_participation,
    },
    boundaries: {
      participationGrantsMembership: raw.boundaries.participation_grants_membership,
      participationGrantsRole: raw.boundaries.participation_grants_role,
      participationGrantsDelegation: raw.boundaries.participation_grants_delegation,
      participationGrantsAuthority: raw.boundaries.participation_grants_authority,
      readAccessGrantsAuthority: raw.boundaries.read_access_grants_authority,
    },
    notice: raw.notice,
  };
}
