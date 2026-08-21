import type { Metadata } from "next";
import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { listPublicProjects } from "@/lib/data/projects";

export const metadata: Metadata = { title: "Projetos" };

export default async function ProjectsPage() {
  const projects = await listPublicProjects();

  return (
    <div className="page-shell section-shell">
      <header className="page-header">
        <div>
          <p className="kicker">Explorar</p>
          <h1>Projetos com estado, necessidades e trajetória.</h1>
          <p>
            Conteúdo canônico ou sintético está rotulado. Nada aqui representa captação,
            promessa de renda ou adoção já validada.
          </p>
        </div>
        <Link className="button button-primary" href="/projects/new">
          Plantar um projeto
        </Link>
      </header>

      <div className="filter-bar" aria-label="Filtros informativos do Gate 1">
        <span className="filter-pill filter-active">Todos · {projects.length}</span>
        <span className="filter-pill">Abertos · {projects.filter((project) => project.stage === "OPEN").length}</span>
        <span className="filter-pill">Ativos · {projects.filter((project) => project.stage === "ACTIVE").length}</span>
        <span className="filter-note">Filtros avançados chegam no Gate 2.</span>
      </div>

      <div className="project-grid project-grid-page">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
