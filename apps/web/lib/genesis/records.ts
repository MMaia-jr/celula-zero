import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  classifyPersonCandidates,
  classifyRecordsRead,
  type GenesisIdentity,
  type GenesisRecord,
} from "@/lib/genesis/context";

export type GenesisSession =
  | { status: "ANONYMOUS" | "UNAVAILABLE" | "IDENTITY_UNAVAILABLE" | "IDENTITY_AMBIGUOUS" }
  | {
      status: "READY";
      identity: GenesisIdentity;
      records: GenesisRecord[];
      recordsStatus: "AVAILABLE" | "UNAVAILABLE";
    };

export async function getGenesisSession(): Promise<GenesisSession> {
  const client = await createSupabaseServerClient();
  if (!client) return { status: "UNAVAILABLE" };

  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return { status: "ANONYMOUS" };

  const [
    { data: profile, error: profileError },
    { data: people, error: peopleError },
  ] = await Promise.all([
    client
      .from("profiles")
      .select("id, display_name")
      .eq("id", auth.user.id)
      .single(),
    client
      .from("actors")
      .select("id, name")
      .eq("kind", "PERSON")
      .eq("operator_profile_id", auth.user.id)
      .order("created_at", { ascending: true })
      .limit(2),
  ]);

  if (profileError || peopleError || !profile) return { status: "IDENTITY_UNAVAILABLE" };

  const personResolution = classifyPersonCandidates(people);
  if (personResolution.status === "MISSING") return { status: "IDENTITY_UNAVAILABLE" };
  if (personResolution.status === "AMBIGUOUS") return { status: "IDENTITY_AMBIGUOUS" };

  const person = personResolution.person;
  const { data: rows, error: recordsError } = await client
    .from("preproject_records")
    .select("id, record_class, content, created_at")
    .eq("owner_actor_id", person.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const recordsStatus = classifyRecordsRead(recordsError);

  return {
    status: "READY",
    identity: {
      profileId: String(profile.id),
      displayName: String(profile.display_name),
      personId: String(person.id),
      personName: String(person.name),
    },
    recordsStatus,
    records: recordsStatus === "AVAILABLE"
      ? (rows ?? []).map((row) => ({
          id: String(row.id),
          recordClass: row.record_class as GenesisRecord["recordClass"],
          content: String(row.content),
          createdAt: String(row.created_at),
        }))
      : [],
  };
}

export async function persistOriginalRecord(personId: string, content: string) {
  const client = await createSupabaseServerClient();
  if (!client) return { ok: false as const, reason: "Supabase is unavailable." };

  const { error } = await client.rpc("record_preproject_human_text", {
    p_actor_id: personId,
    p_record_class: "ORIGINAL_RECORD",
    p_content: content,
    p_provenance: {
      surface: "GENESIS",
      classification: "ORIGINAL_RECORD",
      human_direction: false,
    },
  });

  return error
    ? { ok: false as const, reason: "Original Record could not be preserved." }
    : { ok: true as const };
}
