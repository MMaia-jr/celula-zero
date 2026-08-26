import { NextRequest, NextResponse } from "next/server";
import {
  activitySentence,
  listSocialActivity,
} from "@/lib/data/social";
import { toActivityStreamsCollection } from "@/lib/domain/activitystreams";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const followingOnly = request.nextUrl.searchParams.get("following") === "1";
  const items = await listSocialActivity(followingOnly, 50);
  const summaries = new Map(
    items.map((item) => [item.eventId, activitySentence(item, "en")]),
  );

  const response = NextResponse.json(
    toActivityStreamsCollection(items, request.nextUrl.origin, summaries),
    {
      headers: {
        "Content-Type": "application/activity+json; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    },
  );

  return response;
}
