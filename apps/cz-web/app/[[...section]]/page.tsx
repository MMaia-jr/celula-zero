// SPDX-License-Identifier: MPL-2.0
import { notFound } from "next/navigation";
import { FoundationApp, type Section } from "../../components/foundation-app";
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  const selected = section?.[0] ?? "home";
  if (
    (section?.length ?? 0) > 1 ||
    !["home", "cells", "discover", "activity", "you"].includes(selected)
  )
    notFound();
  return <FoundationApp section={selected as Section} />;
}
