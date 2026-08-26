import Link from "next/link";
import type { PublicNeed } from "@/lib/data/needs";
import type { Locale } from "@/lib/i18n/core";

export function NeedCard({ need, locale }: { need: PublicNeed; locale: Locale }) {
  const en = locale === "en";

  return (
    <article className="project-card">
      <div className="project-card-topline">
        <span className="stage-badge stage-open">NEED · OPEN</span>
        <span className="source-tag">PUBLIC</span>
      </div>
      <div className="project-card-body">
        <h3><Link href={`/needs/${need.id}`}>{need.title}</Link></h3>
        <p>{need.statement}</p>
      </div>
      <div className="project-card-meta">
        <div>
          <span className="mini-label">{en ? "Project" : "Projeto"}</span>
          <strong>{need.projectTitle}</strong>
        </div>
        <div className="meta-right">
          <span className="mini-label">{en ? "Attributed to" : "Atribuída a"}</span>
          <strong>{need.ownerActorName}</strong>
        </div>
      </div>
      <Link className="card-link" href={`/needs/${need.id}`}>
        {en ? "Open Need" : "Abrir Need"} <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
