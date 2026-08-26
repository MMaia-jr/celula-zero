import type { Metadata } from "next";
import Link from "next/link";
import { listPublicProfiles } from "@/lib/data/profiles";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "People" : "Pessoas" };
}

export default async function PeoplePage() {
  const locale = await getLocale();
  const en = locale === "en";
  const profiles = await listPublicProfiles();

  return (
    <div className="page-shell section-shell">
      <header className="page-header">
        <div>
          <p className="kicker">{en ? "People" : "Pessoas"}</p>
          <h1>{en ? "Public presences connected to attributable action." : "Presenças públicas ligadas a ações atribuíveis."}</h1>
          <p>{en ? "A Profile is chosen presentation. It is not civil identity, capability proof or universal reputation." : "Profile é apresentação escolhida. Não é identidade civil, prova de capacidade ou reputação universal."}</p>
        </div>
      </header>

      {profiles.length ? (
        <div className="project-grid project-grid-page">
          {profiles.map((profile) => (
            <article className="project-card" key={profile.actorId}>
              <div className="project-card-topline">
                <span className="stage-badge stage-open">PERSON</span>
                <span className="source-tag">PUBLIC PROFILE</span>
              </div>
              <div className="project-card-body">
                <h3><Link href={`/people/${profile.handle}`}>{profile.displayName}</Link></h3>
                <p>@{profile.handle}</p>
                {profile.bio ? <p>{profile.bio}</p> : null}
              </div>
              <div className="project-card-meta">
                <div><span className="mini-label">Actor PERSON</span><strong>{profile.actorName}</strong></div>
                <div className="meta-right">
                  <span className="mini-label">{en ? "Public projects" : "Projetos públicos"}</span>
                  <strong>{profile.publicProjectCount}</strong>
                </div>
              </div>
              <Link className="card-link" href={`/people/${profile.handle}`}>
                {en ? "View public context" : "Ver contexto público"} <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <section className="content-block">
          <p>{en ? "No public Profile is available through the configured backend." : "Nenhum Profile público está disponível pelo backend configurado."}</p>
        </section>
      )}
    </div>
  );
}
