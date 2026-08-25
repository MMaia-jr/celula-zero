import Link from "next/link";
import { StageBadge } from "@/components/stage-badge";
import type { ProjectRecord } from "@/lib/domain/types";
import {
  actorKindLabel,
  economicRegimeLabel,
  projectPresentationNeeds,
  projectPresentationTranslation,
  type Locale,
} from "@/lib/i18n/core";

export function ProjectCard({
  project,
  locale = "pt",
}: {
  project: ProjectRecord;
  locale?: Locale;
}) {
  const en = locale === "en";
  const translation = projectPresentationTranslation(project.slug, locale);
  const summary = translation?.summary ?? project.summary;
  const needs = projectPresentationNeeds(project.slug, locale, project.needs);

  return (
    <article className="project-card">
      <div className="project-card-topline">
        <StageBadge stage={project.stage} locale={locale} />
        <span className="source-tag">{project.sourceLabel}</span>
      </div>
      <div className="project-card-body">
        <h3><Link href={`/projects/${project.slug}`}>{project.title}</Link></h3>
        <p>{summary}</p>
      </div>
      <div className="need-list need-list-card">
        {needs.slice(0, 3).map((need) => <span key={need}>{need}</span>)}
      </div>
      <div className="project-card-meta">
        <div>
          <span className="mini-label">{en ? "Steward" : "Responsável"}</span>
          <strong>{project.steward.name}</strong>
          <small>{actorKindLabel(project.steward.kind, locale)}</small>
        </div>
        <div className="meta-right">
          <span className="mini-label">Regime</span>
          <strong>{economicRegimeLabel(project.economicRegime, locale)}</strong>
          <small>{en ? "outside the platform" : "fora da plataforma"}</small>
        </div>
      </div>
      <Link
        className="card-link"
        href={`/projects/${project.slug}`}
        aria-label={en ? `Open ${project.title}` : `Abrir ${project.title}`}
      >
        {en ? "View trajectory" : "Ver trajetória"} <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
