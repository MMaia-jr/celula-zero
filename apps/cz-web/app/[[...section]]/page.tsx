// SPDX-License-Identifier: MPL-2.0
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { FoundationApp, type Section } from "../../components/foundation-app";
import { OnlineHabitat } from "../../components/online-habitat";
import { isFounderCredential } from "../../lib/founder-credential";
import { getHabitatContext } from "../../lib/habitat-context";
import { allowsLocalFixture } from "../../lib/runtime-mode";
import { habitatClient } from "../../lib/supabase";
export const dynamic = "force-dynamic";

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
    return <OnlineHabitat section={selected} initial={context} />;
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
