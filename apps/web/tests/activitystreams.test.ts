import { describe, expect, it } from "vitest";
import {
  toActivityStreamsActivity,
  toActivityStreamsCollection,
} from "@/lib/domain/activitystreams";
import type { SocialActivityItem } from "@/lib/data/social";

function item(overrides: Partial<SocialActivityItem> = {}): SocialActivityItem {
  return {
    eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    eventType: "OPPORTUNITY_PUBLISHED",
    occurredAt: "2026-08-25T15:00:00.000Z",
    visibility: "PUBLIC",
    actorId: null,
    actorName: "Participant",
    actorHandle: null,
    targetType: "OPPORTUNITY",
    targetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    targetLabel: "Review public journey",
    targetPath:
      "/projects/example/opportunities/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    projectId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    projectSlug: "example",
    needId: null,
    opportunityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    commitmentId: null,
    isFollowed: false,
    ...overrides,
  };
}

describe("ActivityStreams Social Projection", () => {
  it("maps a public Opportunity publication to an Offer without raw payload", () => {
    const activity = toActivityStreamsActivity(
      item(),
      "https://example.test",
      "Participant opened an Opportunity · Review public journey",
    );

    expect(activity.type).toBe("Offer");
    expect(activity.actor).toEqual({
      type: "Person",
      name: "Participant",
    });
    expect(activity.object).toMatchObject({
      type: "Object",
      name: "Review public journey",
      url: expect.stringContaining("/projects/example/opportunities/"),
    });
    expect(activity).not.toHaveProperty("payload");
  });

  it("maps Proposal acceptance to Accept", () => {
    const activity = toActivityStreamsActivity(
      item({
        eventType: "PROPOSAL_ACCEPTED",
        visibility: "PROJECT",
        targetType: "COMMITMENT",
        targetPath: "/commitments/dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      }),
      "https://example.test",
      "Steward accepted a Proposal",
    );

    expect(activity.type).toBe("Accept");
    expect(activity.url).toContain("/commitments/");
  });

  it("maps Follow end to Undo(Follow) and keeps the relation representational", () => {
    const activity = toActivityStreamsActivity(
      item({
        eventType: "FOLLOW_ENDED",
        visibility: "PRIVATE",
        targetType: "ACTOR",
        targetLabel: "Ana",
        targetPath: "/people/ana",
      }),
      "https://example.test",
      "Participant unfollowed Ana",
    );

    expect(activity.type).toBe("Undo");
    expect(activity.object).toMatchObject({
      type: "Follow",
      object: {
        type: "Person",
        name: "Ana",
      },
    });
  });

  it("returns an OrderedCollection as a derived projection", () => {
    const source = item();
    const collection = toActivityStreamsCollection(
      [source],
      "https://example.test",
      new Map([[source.eventId, "summary"]]),
    );

    expect(collection["@context"]).toBe(
      "https://www.w3.org/ns/activitystreams",
    );
    expect(collection.type).toBe("OrderedCollection");
    expect(collection.totalItems).toBe(1);
    expect(collection.summary).toContain("Derived");
  });
});
