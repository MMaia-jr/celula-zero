import { randomUUID } from "node:crypto";
import Link from "next/link";
import {
  followTargetAction,
  unfollowTargetAction,
} from "@/app/social/actions";
import {
  getMyFollowState,
  type FollowTargetType,
} from "@/lib/data/social";
import { getLocale } from "@/lib/i18n/server";

interface FollowControlProps {
  targetType: FollowTargetType;
  targetId: string;
  returnTo: string;
}

export async function FollowControl({
  targetType,
  targetId,
  returnTo,
}: FollowControlProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const state = await getMyFollowState(targetType, targetId);

  if (state === "UNAVAILABLE") return null;

  if (state === "ANONYMOUS") {
    return (
      <Link
        className="button button-secondary"
        href={`/login?next=${encodeURIComponent(returnTo)}`}
      >
        {en ? "Sign in to follow" : "Entre para seguir"}
      </Link>
    );
  }

  const following = state === "FOLLOWING";
  const action = following ? unfollowTargetAction : followTargetAction;

  return (
    <form action={action}>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="commandId" value={randomUUID()} />
      <input
        type="hidden"
        name="idempotencyKey"
        value={`follow-${following ? "end" : "start"}-${randomUUID()}`}
      />
      <button
        className={`button ${following ? "button-secondary" : "button-primary"}`}
        type="submit"
      >
        {following
          ? en ? "Following · unfollow" : "Seguindo · deixar de seguir"
          : en ? "Follow" : "Seguir"}
      </button>
    </form>
  );
}
