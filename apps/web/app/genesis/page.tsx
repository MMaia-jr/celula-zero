import Link from "next/link";
import { redirect } from "next/navigation";
import { GenesisConsole } from "@/components/genesis-console";
import { readCanonicalGitHubState } from "@/lib/genesis/github";
import { getGatewayPreparation } from "@/lib/genesis/gateway";
import { getGenesisSession } from "@/lib/genesis/records";

export default async function GenesisPage() {
  const [session, canonical] = await Promise.all([getGenesisSession(), readCanonicalGitHubState()]);
  if (session.status === "ANONYMOUS") redirect("/login?next=%2Fgenesis");
  const gateway = getGatewayPreparation();

  if (session.status !== "READY") {
    const reason = session.status === "UNAVAILABLE"
      ? "Supabase não está configurado."
      : session.status === "IDENTITY_AMBIGUOUS"
        ? "Mais de um PERSON relacionado foi encontrado. A identidade é ambígua e a Genesis falhou fechada; nenhum PERSON foi escolhido por conveniência."
        : "O Profile autenticado ou seu PERSON relacionado não pôde ser resolvido. Nenhuma identidade foi criada ou inferida.";
    return <div className="section-shell"><h1>Genesis indisponível</h1><p className="form-message form-error">{reason}</p></div>;
  }

  return (
    <div className="section-shell" style={{ maxWidth: 760 }}>
      <header className="page-header">
        <div><p className="kicker">Genesis Cell · candidato isolado</p><h1>Olá, {session.identity.displayName}</h1><p>Profile <code>{session.identity.profileId}</code><br />PERSON {session.identity.personName} · <code>{session.identity.personId}</code></p></div>
      </header>
      <section className="content-block">
        <p className="mini-label">Estado operacional canônico · GitHub público</p>
        {canonical.status === "AVAILABLE" ? <><h2>main @ <Link href={canonical.headUrl}>{canonical.headSha.slice(0, 12)}</Link></h2><pre style={{ whiteSpace: "pre-wrap", maxHeight: 320, overflow: "auto" }}>{canonical.stateMarkdown.slice(0, 6000)}</pre><small>Leitura de STATE.md; não é memória privada nem prova de implantação.</small></> : <p className="form-message form-error">{canonical.reason}</p>}
      </section>
      {session.recordsStatus === "UNAVAILABLE" ? (
        <p className="form-message form-error">
          O histórico privado não pôde ser lido. Isso não foi interpretado como histórico vazio.
        </p>
      ) : null}
      <GenesisConsole records={session.records} gatewayReady={gateway.status === "READY"} />
    </div>
  );
}
