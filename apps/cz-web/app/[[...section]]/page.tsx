// SPDX-License-Identifier: MPL-2.0
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { FoundationApp, type Section } from "../../components/foundation-app";
import { OnlineHabitat } from "../../components/online-habitat";
import { isFounderCredential } from "../../lib/founder-credential";
import { getHabitatContext } from "../../lib/habitat-context";
import { allowsLocalFixture } from "../../lib/runtime-mode";
import { habitatClient } from "../../lib/supabase";
import type { ChatMessage } from "../../lib/chat";
import { readCanonicalCellDirection } from "../../lib/canonical-state";
export const dynamic = "force-dynamic";

type GithubIssue = { number: number; title: string; html_url: string; state: string; updated_at: string };

export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  const selected = section?.[0] ?? "home";
  if (
    (section?.length ?? 0) > 1 ||
    !["home", "cells", "activity", "you"].includes(selected)
  )
    notFound();
  if (process.env.CZ_HABITAT_MODE === "online") {
    const client = await habitatClient();
    const { data: { user } } = client
      ? await client.auth.getUser()
      : { data: { user: null } };
    const allowlisted = process.env.CZ_FOUNDER_EMAIL;
    if (
      !client ||
      !user ||
      !isFounderCredential(user.email, allowlisted)
    ) {
      if (client && user) await client.auth.signOut();
      redirect("/login");
    }
    let context;
    try {
      context = await getHabitatContext(client);
    } catch {
      return (
        <main className="entry">
          <p role="alert" className="error">
            Não foi possível reconstruir sua identidade, relação com a Célula
            Zero ou estado. O acesso foi interrompido com segurança.
          </p>
        </main>
      );
    }
    let threadId: string | null = null;
    let messages: ChatMessage[] = [];
    if (selected !== "discover") {
      const thread = await client.rpc("cz_vnext_ensure_mvp_thread");
      if (!thread.error && typeof thread.data === "string") {
        threadId = thread.data;
        const history = await client.from("cz_vnext_messages").select("message")
          .eq("thread_id", threadId).order("created_at", { ascending: true }).limit(60);
        if (!history.error) messages = (history.data ?? []).map((row) => row.message as ChatMessage);
      }
    }
    let workItems: GithubIssue[] = [];
    let canonicalDirection: string | null = null;
    if (selected === "cells") {
      canonicalDirection = await readCanonicalCellDirection();
      try {
        const response = await fetch("https://api.github.com/repos/MMaia-jr/celula-zero/issues?state=open&per_page=8", { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) });
        if (response.ok) workItems = (await response.json() as Array<GithubIssue & { pull_request?: unknown }>).filter((item) => !item.pull_request).slice(0, 6);
      } catch { /* The Cell still works if public GitHub is unavailable. */ }
    }
    return <OnlineHabitat section={selected} initial={context} threadId={threadId} initialMessages={messages} workItems={workItems} canonicalDirection={canonicalDirection} />;
  }
  if (
    allowsLocalFixture(
      process.env.CZ_LOCAL_FOUNDATION,
      (await headers()).get("host"),
    )
  )
    return <FoundationApp section={selected as Section} />;
  return (
    <main className="entry">
      <div className="entry-card">
        <p className="eyebrow">CÉLULA ZERO</p>
        <h1>O espaço online está sendo preparado.</h1>
        <p className="lead">
          Esta implantação ainda não está configurada para uso. Nenhuma conta ou
          registro foi criado.
        </p>
      </div>
    </main>
  );
}
