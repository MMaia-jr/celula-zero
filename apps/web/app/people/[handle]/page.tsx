import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowControl } from "@/components/follow-control";
import { listPublicNeeds } from "@/lib/data/needs";
import { getPublicProfile } from "@/lib/data/profiles";
import { listPublicProjects } from "@/lib/data/projects";
import { getLocale } from "@/lib/i18n/server";

interface PublicProfilePageProps {
  params: Promise<{ handle: string }>;
}

function validHandle(handle: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,30}[a-zA-Z0-9]$/.test(handle);
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const locale = await getLocale();
  const en = locale === "en";
  const { handle } = await params;

  if (!validHandle(handle)) return { title: en ? "Profile not found" : "Profile não encontrado" };

  const profile = await getPublicProfile(handle);
  return profile
    ? {
        title: `${profile.displayName} (@${profile.handle})`,
        description: profile.bio || (en ? `Public Profile of ${profile.displayName} on Célula Zero.` : `Profile público de ${profile.displayName} na Célula Zero.`),
      }
    : { title: en ? "Profile not found" : "Profile não encontrado" };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { handle } = await params;

  if (!validHandle(handle)) notFound();

  const profile = await getPublicProfile(handle);
  if (!profile) notFound();

  const [projects, needs] = await Promise.all([listPublicProjects(), listPublicNeeds()]);
  const attributableProjects = projects.filter((project) => project.steward.id === profile.actorId);
  const attributableNeeds = needs.filter((need) => need.ownerActorId === profile.actorId);

  return (
    <div className="section-shell">
      <div className="breadcrumb">
        <Link href="/">{en ? "Home" : "Início"}</Link>
        <span aria-hidden="true">/</span>
        <span>@{profile.handle}</span>
      </div>

      <header className="project-hero">
        <div className="project-hero-main">
          <p className="mini-label">PUBLIC PROFILE</p>
          <h1>{profile.displayName}</h1>
          <p>@{profile.handle}</p>
          {profile.bio ? <p>{profile.bio}</p> : null}
          {profile.bio ? <small>{en ? "Bio shown as authored; no automatic translation is presented as source." : "Bio exibida como autorada; tradução automática não é apresentada como fonte."}</small> : null}
        </div>
      </header>

      <section className="content-block">
        <p className="mini-label">{en ? "Attribution" : "Atribuição"}</p>
        <h2>Actor PERSON</h2>
        <p>{profile.actorName}</p>
        <p>{en ? "This Actor is the attributable subject used in Célula Zero actions. The Profile is only the public projection chosen by the person who controls it." : "Este Actor é o sujeito atribuível usado em ações da Célula Zero. O Profile é apenas a projeção pública escolhida pela pessoa que o controla."}</p>
      </section>

      <section className="content-block">
        <p className="mini-label">{en ? "Public coordination context" : "Contexto público de coordenação"}</p>
        <h2>{en ? "Projects and first-class Needs" : "Projetos e Needs de primeira classe"}</h2>
        {attributableProjects.length ? (
          <ul>
            {attributableProjects.map((project) => (
              <li key={project.id}><Link href={`/projects/${project.slug}`}>{project.title}</Link></li>
            ))}
          </ul>
        ) : <p>{en ? "No public project stewarded by this Actor." : "Nenhum projeto público conduzido por este Actor."}</p>}
        {attributableNeeds.length ? (
          <ul>
            {attributableNeeds.map((need) => (
              <li key={need.id}><Link href={`/needs/${need.id}`}>{need.title}</Link></li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="content-block">
        <p className="mini-label">{en ? "Relationship" : "Relação"}</p>
        <FollowControl
          targetType="ACTOR"
          targetId={profile.actorId}
          returnTo={`/people/${profile.handle}`}
        />
        <p className="block-note">
          {en
            ? "Follow is private by default and does not imply endorsement, contribution or reputation."
            : "Follow é privado por padrão e não implica endosso, contribuição ou reputação."}
        </p>
      </section>

      <section className="funding-warning">
        <strong>{en ? "Epistemic limit" : "Limite epistemológico"}</strong>
        <p>{en ? "This Profile does not prove capability, civil identity, reputation, wallet ownership or quality of work. Those properties require their own evidence or credentials when materially necessary." : "Este Profile não prova capacidade, identidade civil, reputação, propriedade de wallet ou qualidade de trabalho. Essas propriedades exigem evidências ou credenciais próprias quando forem materialmente necessárias."}</p>
      </section>
    </div>
  );
}
