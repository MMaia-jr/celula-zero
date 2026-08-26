import type { SocialActivityItem } from "@/lib/data/social";

export interface ActivityStreamsObject {
  type: string;
  id?: string;
  name?: string;
  url?: string;
}

export interface ActivityStreamsActivity {
  id: string;
  type: string;
  actor: ActivityStreamsObject;
  object: ActivityStreamsObject | {
    type: "Follow";
    actor: ActivityStreamsObject;
    object: ActivityStreamsObject;
  };
  published: string;
  summary: string;
  url: string;
}

function absolute(origin: string, path: string) {
  return new URL(path, origin).toString();
}

function activityType(eventType: string): string {
  switch (eventType) {
    case "OPPORTUNITY_PUBLISHED":
    case "PROPOSAL_SUBMITTED":
      return "Offer";
    case "PROPOSAL_ACCEPTED":
      return "Accept";
    case "PROPOSAL_REJECTED":
      return "Reject";
    case "FOLLOW_STARTED":
      return "Follow";
    case "FOLLOW_ENDED":
      return "Undo";
    case "PROPOSAL_REVISION_REQUESTED":
    case "PROPOSAL_REVISED":
    case "OPPORTUNITY_LINKED_TO_NEED":
    case "OPPORTUNITY_CAPACITY_FILLED":
      return "Update";
    default:
      return "Create";
  }
}

function objectType(item: SocialActivityItem): string {
  if (item.targetType === "ACTOR") return "Person";
  if (item.targetType === "PROJECT") return "Object";
  if (item.targetType === "OPPORTUNITY") return "Object";
  if (item.targetType === "COMMITMENT") return "Object";
  if (item.targetType === "NEED") return "Object";
  return "Object";
}

export function toActivityStreamsActivity(
  item: SocialActivityItem,
  origin: string,
  summary: string,
): ActivityStreamsActivity {
  const actor: ActivityStreamsObject = item.actorHandle
    ? {
        type: "Person",
        id: absolute(origin, `/people/${item.actorHandle}`),
        name: item.actorName,
        url: absolute(origin, `/people/${item.actorHandle}`),
      }
    : {
        type: "Person",
        name: item.actorName,
      };

  const target: ActivityStreamsObject = {
    type: objectType(item),
    id: absolute(origin, item.targetPath),
    name: item.targetLabel,
    url: absolute(origin, item.targetPath),
  };

  const type = activityType(item.eventType);
  const object =
    type === "Undo" && item.eventType === "FOLLOW_ENDED"
      ? {
          type: "Follow" as const,
          actor,
          object: target,
        }
      : target;

  return {
    id: `${absolute(origin, "/api/activity")}#${item.eventId}`,
    type,
    actor,
    object,
    published: item.occurredAt,
    summary,
    url: absolute(origin, item.targetPath),
  };
}

export function toActivityStreamsCollection(
  items: SocialActivityItem[],
  origin: string,
  summaries: Map<string, string>,
) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "OrderedCollection",
    totalItems: items.length,
    summary:
      "Derived Célula Zero Social Projection. Source/private records remain governed by the native domain and visibility policy.",
    orderedItems: items.map((item) =>
      toActivityStreamsActivity(
        item,
        origin,
        summaries.get(item.eventId) ?? item.eventType,
      ),
    ),
  };
}
