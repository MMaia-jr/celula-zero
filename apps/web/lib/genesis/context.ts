export interface GenesisIdentity {
  profileId: string;
  displayName: string;
  personId: string;
  personName: string;
}

export interface GenesisRecord {
  id: string;
  recordClass: "ORIGINAL_RECORD" | "SOURCE_MATERIAL";
  content: string;
  createdAt: string;
}

export function classifyPersonCandidates<T>(people: T[] | null | undefined) {
  if (!people || people.length === 0) return { status: "MISSING" as const };
  if (people.length !== 1) return { status: "AMBIGUOUS" as const };
  return { status: "READY" as const, person: people[0]! };
}

export function classifyRecordsRead(error: unknown) {
  return error ? "UNAVAILABLE" as const : "AVAILABLE" as const;
}

export function composeGenesisContext(input: {
  identity: GenesisIdentity;
  canonical: { headSha: string; stateSummary: string };
  recentRecords: GenesisRecord[];
}) {
  return {
    classification: "CANDIDATE_INTERPRETATION_REQUEST" as const,
    humanDirection: false as const,
    identity: input.identity,
    canonical: input.canonical,
    recentPrivateRecords: input.recentRecords.slice(0, 8).map((record) => ({
      ...record,
      content: record.content.slice(0, 4000),
    })),
  };
}
