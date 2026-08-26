import { describe, expect, it } from "vitest";
import type { SocialActivityItem } from "@/lib/data/social";
import { activitySentence } from "@/lib/data/social";

const base: SocialActivityItem = {
  eventId: "10000000-0000-4000-8000-000000000001",
  eventType: "CONTRIBUTION_SUBMITTED",
  occurredAt: "2026-08-25T12:00:00Z",
  visibility: "PROJECT",
  actorId: "20000000-0000-4000-8000-000000000001",
  actorName: "Pessoa B",
  actorHandle: "pessoa-b",
  targetType: "CONTRIBUTION",
  targetId: "30000000-0000-4000-8000-000000000001",
  targetLabel: "Contribution",
  targetPath: "/contributions/30000000-0000-4000-8000-000000000001",
  projectId: "40000000-0000-4000-8000-000000000001",
  projectSlug: "projeto-t2",
  needId: null,
  opportunityId: null,
  commitmentId: "50000000-0000-4000-8000-000000000001",
  isFollowed: false,
};

describe("T2 semantic social projection", () => {
  it.each([
    ["CONTRIBUTION_SUBMITTED", "registrou uma Contribution"],
    ["ARTIFACT_ATTACHED", "anexou um Artifact"],
    ["CLAIM_RECORDED", "registrou uma Claim"],
    ["EVIDENCE_REGISTERED", "registrou Evidence"],
    ["VERIFICATION_REQUESTED", "solicitou uma Verification"],
    ["VERIFICATION_ISSUED", "emitiu uma Verification"],
    ["DOMAIN_DECISION_ISSUED", "emitiu uma Decision contextual"],
    ["OUTCOME_RECORDED", "registrou um Outcome"],
  ])("renders %s without raw payload", (eventType, expected) => {
    const sentence = activitySentence({ ...base, eventType }, "pt");
    expect(sentence).toContain(expected);
    expect(sentence).not.toContain("payload");
  });
});
