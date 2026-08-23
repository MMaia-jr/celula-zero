import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectTimeline } from "@/components/project-timeline";
import { StageBadge } from "@/components/stage-badge";
import { getPublicProjectBySlug } from "@/lib/data/projects";
import { economicRegimeLabel, formatDate, actorKindLabel } from "@/lib/presentation/labels";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);
  return project ? { title: project.title, description: project.summary } : { title: "Projeto não encontrado" };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);
  if (!project) notFound();

  return (
    <div className="project-page section-shell">
      <div className="breadcrumb">
        <Link href="/projects">Projetos</Link><span aria-hidden="true">/</span><span>{project.title}</span>
      </div>

      <header className="project-hero">
        <div className="project-hero-main">
          <div className="project-label-row">
            <StageBadge stage={project.stage} />
            <span className="source-tag">{project.sourceLabel}</span>
          </div>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
          <div className="project-actions">
            <a className="button button-primary" href={`/projects/${project.slug}/export?format=md`}>
              Exportar Markdown
            </a>
            <a className="button button-secondary" href={`/projects/${project.slug}/export?format=json`}>
              Exportar JSON
            </a>
          </div>
        </div>
        <aside className="project-steward-card">
          <span className="mini-label">Responsável contextual</span>
          <strong>{project.steward.name}</strong>
          <span>{actorKindLabel[project.steward.kind]}</span>
          {project.steward.operatorLabel ? <small>{project.steward.operatorLabel}</small> : null}
          <div className="divider" />
          <dl>
            <div><dt>Estágio</dt><dd>{project.stage}</dd></div>
            <div><dt>Regime</dt><dd>{economicRegimeLabel[project.economicRegime]}</dd></div>
            <div><dt>Versão</dt><dd>{project.version}</dd></div>
            <div><dt>Publicado</dt><dd>{project.publishedAt ? formatDate(project.publishedAt) : "não"}</dd></div>
          </dl>
        </aside>
      </header>

      <div className="project-content-grid">
        <div className="project-main-column">
          <section className="content-block original-record">
            {project.originalIntent ? (
              <>
                <p className="mini-label">Registro Original · imutável</p>
                <blockquote>{project.originalIntent}</blockquote>
                <p className="block-note">Preservado literalmente. Correções entram como novas interpretações.</p>
              </>
            ) : (
              <>
                <p className="mini-label">Registro Original · não exposto publicamente</p>
                <p className="block-note">
                  Esta projeção pública não substitui o Registro Original pela intenção operativa.
                </p>
              </>
            )}
          </section>

          <section className="content-block">
            <p className="mini-label">Interpretação atual</p>
            <h2>O que este projeto busca agora</h2>
            <p>{project.currentIntent}</p>
          </section>

          <section className="content-block">
            <p className="mini-label">Resultado pretendido</p>
            <h2>O que seria observável</h2>
            <p>{project.intendedResult}</p>
          </section>

          <section className="content-block">
            <p className="mini-label">Trajetória pública</p>
            <h2>Estado material e eventos reconciliáveis</h2>
            <ProjectTimeline events={project.events} />
          </section>
        </div>

        <aside className="project-side-column">
          <section className="side-block">
            <p className="mini-label">Precisa agora</p>
            <div className="need-list">
              {project.needs.map((need) => <span key={need}>{need}</span>)}
            </div>
          </section>
          <section className="side-block">
            <p className="mini-label">Regras e limites</p>
            <p>{project.rulesAndLimits}</p>
          </section>
          <section className="funding-warning">
            <strong>Financiamento não custodial</strong>
            <p>Interesses e bounties são declarações. A plataforma não recebe nem movimenta fundos.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
