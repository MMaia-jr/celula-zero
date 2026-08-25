import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { listPublicProjects } from "@/lib/data/projects";
import { getLocale } from "@/lib/i18n/server";

export default async function ProjectsPage() {
  const locale = await getLocale();
  const en = locale === "en";
  const projects = await listPublicProjects();

  return (
    <div className="page-shell section-shell">
      <header className="page-header">
        <div>
          <p className="kicker">{en ? "Explore" : "Explorar"}</p>
          <h1>
            {en
              ? "Projects with state, needs and reconstructible trajectories."
              : "Projetos com estado, necessidades e trajetória reconstruível."}
          </h1>
          <p>
            {en
              ? "Public records keep their source labels. A project can be observed before anyone decides to participate."
              : "Registros públicos preservam seus rótulos de origem. Um projeto pode ser observado antes que alguém decida participar."}
          </p>
        </div>
        <Link className="button button-primary" href="/projects/new">
          {en ? "Create a project" : "Plantar um projeto"}
        </Link>
      </header>

      <div
        className="filter-bar"
        aria-label={en ? "Project overview" : "Visão geral dos projetos"}
      >
        <span className="filter-pill filter-active">
          {en ? "All" : "Todos"} · {projects.length}
        </span>
        <span className="filter-pill">
          {en ? "Open" : "Abertos"} · {projects.filter((project) => project.stage === "OPEN").length}
        </span>
        <span className="filter-pill">
          {en ? "Active" : "Ativos"} · {projects.filter((project) => project.stage === "ACTIVE").length}
        </span>
        <span className="filter-note">
          {en ? "More filters will be added when real use requires them." : "Mais filtros entram quando o uso real exigir."}
        </span>
      </div>

      <div className="project-grid project-grid-page">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} locale={locale} />
        ))}
      </div>
    </div>
  );
}
