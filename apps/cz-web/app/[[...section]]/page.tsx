// SPDX-License-Identifier: MPL-2.0
import { notFound } from "next/navigation";
import { FoundationApp, type Section } from "../../components/foundation-app";
import { readServerEntry } from "../../lib/server-entry";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ open?: string }>;
}) {
  const { section } = await params;
  const { open } = await searchParams;
  const newMeeting = section?.[0] === "meetings" && section?.[1] === "new";
  const selected = section?.[0] ?? "home";
  if (
    ((section?.length ?? 0) > 1 && !newMeeting) ||
    !["home", "conversations", "cells", "discover", "meetings", "activity", "you"].includes(selected)
  )
    notFound();
  const initial = await readServerEntry();
  const targetMatch = typeof open === "string" ? /^(work|project|opportunity|meeting|experience):([A-Za-z0-9_-]{1,160})$/.exec(open) : null;
  const initialTarget = targetMatch?.[1] && targetMatch[2] ? { kind: targetMatch[1], id: targetMatch[2] } : undefined;
  return <FoundationApp section={selected as Section} initial={initial} newMeeting={newMeeting} {...(initialTarget ? { initialTarget } : {})} legacyExpanded={process.env.CZ_TEST_SHOW_LEGACY === "1"} />;
}
