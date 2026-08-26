import type { Metadata } from "next";
import Link from "next/link";
import {
  activitySentence,
  listMyFollows,
  listSocialActivity,
} from "@/lib/data/social";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Activity · Célula Zero",
  description: "Social Projection derived from Célula Zero coordination events.",
};

export default async function ActivityPage() {
  const locale = await getLocale();
  const en = locale === "en";

  const [visible, following, follows] = await Promise.all([
    listSocialActivity(false, 50),
    listSocialActivity(true, 30),
    listMyFollows(),
  ]);

  return (
    <div className="section-shell">
      <header className="section-heading">
        <p className="kicker">SOCIAL PROJECTION</p>
        <h1>{en ? "Activity derived from real coordination." : "Atividade derivada da coordenação real."}</h1>
        <p>
          {en
            ? "This feed is generated from domain events under visibility policy. It is not a free-form posting system and is not a reputation score."
            : "Este feed é gerado a partir de eventos de domínio sob política de visibilidade. Não é um sistema de posts livres nem um score de reputação."}
        </p>
        <div className="hero-actions">
          <Link className="button button-secondary" href="/api/activity">
            ActivityStreams 2.0
          </Link>
        </div>
      </header>

      {follows.length ? (
        <section className="content-block">
          <p className="mini-label">{en ? "Following" : "Seguindo"}</p>
          <h2>{en ? "Contexts you chose to watch" : "Contextos que você escolheu acompanhar"}</h2>
          <ul>
            {follows.map((follow) => (
              <li key={follow.followId}>
                <Link href={follow.targetPath}>{follow.targetLabel}</Link>
                {" · "}
                <span>{follow.targetType}</span>
              </li>
            ))}
          </ul>
          <p className="block-note">
            {en
              ? "Follow relations are private by default. No public audience-size metric is published."
              : "Relações de Follow são privadas por padrão. Nenhuma contagem de seguidores é publicada."}
          </p>
        </section>
      ) : null}

      {following.length ? (
        <section className="content-block">
          <p className="mini-label">{en ? "From your follows" : "Dos seus Follows"}</p>
          <h2>{en ? "Recent activity in chosen contexts" : "Atividade recente nos contextos escolhidos"}</h2>
          <div className="activity-list">
            {following.map((item) => (
              <article className="side-block" key={`following-${item.eventId}`}>
                <div className="project-label-row">
                  <strong>{item.eventType}</strong>
                  <span>{item.visibility}</span>
                </div>
                <p>{activitySentence(item, locale)}</p>
                <Link href={item.targetPath}>{en ? "Open context" : "Abrir contexto"}</Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="content-block">
        <p className="mini-label">{en ? "Visible activity" : "Atividade visível"}</p>
        <h2>{en ? "Policy-controlled coordination events" : "Eventos de coordenação controlados por política"}</h2>
        {visible.length ? (
          <div className="activity-list">
            {visible.map((item) => (
              <article className="side-block" key={item.eventId}>
                <div className="project-label-row">
                  <strong>{item.eventType}</strong>
                  <span>{item.visibility}</span>
                  {item.isFollowed ? <span>{en ? "FOLLOWED" : "SEGUIDO"}</span> : null}
                </div>
                <p>{activitySentence(item, locale)}</p>
                <Link className="button button-secondary" href={item.targetPath}>
                  {en ? "Open attributable context" : "Abrir contexto atribuível"}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p>
            {en
              ? "No social coordination event is visible to this identity yet."
              : "Nenhum evento de coordenação social está visível para esta identidade ainda."}
          </p>
        )}
      </section>

      <section className="funding-warning">
        <strong>Social Projection ≠ source/private record ≠ reputation</strong>
        <p>
          {en
            ? "The feed selects safe semantic fields and navigation targets. Raw event payloads, private Proposal bodies, Evidence and other restricted records are not projected here."
            : "O feed seleciona campos semânticos seguros e alvos de navegação. Payloads brutos, corpos privados de Proposal, Evidence e outros registros restritos não são projetados aqui."}
        </p>
      </section>
    </div>
  );
}
