import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowControl } from "@/components/follow-control";
import { z } from "zod";
import { getPublicNeed } from "@/lib/data/needs";
import { getPublicProfileByActor } from "@/lib/data/profiles";
import { getLocale } from "@/lib/i18n/server";

interface NeedPageProps {
  params: Promise<{ needId: string }>;
}

export async function generateMetadata({ params }: NeedPageProps): Promise<Metadata> {
  const locale = await getLocale();
  const { needId } = await params;
  if (!z.string().uuid().safeParse(needId).success) {
    return { title: locale === "en" ? "Need not found" : "Need não encontrada" };
  }
  const need = await getPublicNeed(needId);
  return need
    ? { title: need.title, description: need.statement }
    : { title: locale === "en" ? "Need not found" : "Need não encontrada" };
}

export default async function NeedPage({ params }: NeedPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { needId } = await params;
  if (!z.string().uuid().safeParse(needId).success) notFound();

  const need = await getPublicNeed(needId);
  if (!need) notFound();

  const ownerProfile = await getPublicProfileByActor(need.ownerActorId);

  return (
    <div className="section-shell">
      <div className="breadcrumb">
        <Link href="/needs">Needs</Link>
        <span aria-hidden="true">/</span>
        <span>{need.title}</span>
      </div>

      <header className="project-hero">
        <div className="project-hero-main">
          <div className="project-label-row">
            <span className="stage-badge stage-open">NEED · OPEN</span>
            <span className="source-tag">PUBLIC</span>
          </div>
          <h1>{need.title}</h1>
          <p>{need.statement}</p>
        </div>
        <aside className="project-steward-card">
          <span className="mini-label">{en ? "Attributed owner" : "Responsável atribuível"}</span>
          {ownerProfile ? (
            <strong><Link href={`/people/${ownerProfile.handle}`}>{need.ownerActorName}</Link></strong>
          ) : <strong>{need.ownerActorName}</strong>}
          <div className="divider" />
          <dl>
            <div>
              <dt>{en ? "Project" : "Projeto"}</dt>
              <dd><Link href={`/projects/${need.projectSlug}`}>{need.projectTitle}</Link></dd>
            </div>
            <div><dt>{en ? "Version" : "Versão"}</dt><dd>{need.currentVersion}</dd></div>
          </dl>
        </aside>
      </header>

      {need.context ? (
        <section className="content-block">
          <p className="mini-label">{en ? "Context" : "Contexto"}</p>
          <p>{need.context}</p>
        </section>
      ) : null}

      <section className="content-block">
        <p className="mini-label">{en ? "Possible next coordination step" : "Possível próximo passo de coordenação"}</p>
        <Link
          className="button button-primary"
          href={`/projects/${need.projectSlug}/opportunities/new?need=${need.id}`}
        >
          {en ? "Turn this Need into an Opportunity" : "Transformar esta Need em Opportunity"}
        </Link>
        <p className="block-note">
          {en
            ? "Only an authorized project steward can complete this action."
            : "Somente um steward autorizado do projeto pode concluir esta ação."}
        </p>
      </section>

      <section className="content-block">
        <p className="mini-label">{en ? "Watch this context" : "Acompanhar este contexto"}</p>
        <FollowControl
          targetType="NEED"
          targetId={need.id}
          returnTo={`/needs/${need.id}`}
        />
      </section>

      <section className="funding-warning">
        <strong>Need ≠ Opportunity</strong>
        <p>{en ? "This record states what is missing. It does not itself create an offer, commitment, contribution, evidence or result." : "Este registro declara o que está faltando. Ele não cria por si só oferta, Commitment, contribuição, evidência ou resultado."}</p>
      </section>
    </div>
  );
}
