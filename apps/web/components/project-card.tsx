import Link from "next/link";
import { StageBadge } from "@/components/stage-badge";
import type { ProjectRecord } from "@/lib/domain/types";
import { actorKindLabel, economicRegimeLabel } from "@/lib/presentation/labels";

export function ProjectCard({ project }: { project: ProjectRecord }) {
  return (
    <article className="project-card">
      <div className="project-card-topline">
        <StageBadge stage={project.stage} />
        <span className="source-tag">{project.sourceLabel}</span>
      </div>
      <div className="project-card-body">
        <h3><Link href={`/projects/${project.slug}`}>{project.title}</Link></h3>
        <p>{project.summary}</p>
      </div>
      <div className="need-list need-list-card">
        {project.needs.slice(0, 3).map((need) => <span key={need}>{need}</span>)}
      </div>
      <div className="project-card-meta">
        <div>
          <span className="mini-label">Responsável</span>
          <strong>{project.steward.name}</strong>
          <small>{actorKindLabel[project.steward.kind]}</small>
        </div>
        <div className="meta-right">
          <span className="mini-label">Regime</span>
          <strong>{economicRegimeLabel[project.economicRegime]}</strong>
          <small>fora da plataforma</small>
        </div>
      </div>
      <Link className="card-link" href={`/projects/${project.slug}`} aria-label={`Abrir ${project.title}`}>
        Ver trajetória <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
