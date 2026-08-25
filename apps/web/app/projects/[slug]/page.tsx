import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectTimeline } from "@/components/project-timeline";
import { StageBadge } from "@/components/stage-badge";
import { listPublicOpenOpportunities } from "@/lib/data/public-opportunities";
import { getPublicProjectBySlug } from "@/lib/data/projects";
import { economicRegimeLabel, formatDate, actorKindLabel } from "@/lib/presentation/labels";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);
  return project
    ? { title: project.title, description: project.summary }
    : { title: "Projeto não encontrado" };
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);
  if (!project) notFound();

  const opportunities = await listPublicOpenOpportunities(project.id);
  const query = searchParams ? await searchParams : {};
  const proposalStatus = first(query.proposal);

  return (
    <div className="project-page section-shell">
      <div className="breadcrumb">
        <Link href="/projects">Projetos</Link><span aria-hidden="true">/</span><span>{project.title}</span>
      </div>

      {proposalStatus === "submitted" ? (
        <p className="form-message" role="status">
          Proposal registrada. Nenhum Commitment foi criado; o responsável ainda precisa decidir.
        </p>
      ) : null}

      {proposalStatus && proposalStatus !== "submitted" ? (
        <p className="form-message form-error" role="alert">
          A Proposal não foi registrada ({proposalStatus}). Nenhum sucesso foi presumido.
        </p>
      ) : null}

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
            <p className="mini-label">Registro Original · imutável</p>
            <blockquote>{project.originalIntent}</blockquote>
            <p className="block-note">Preservado literalmente. Correções entram como novas interpretações.</p>
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
            <p className="mini-label">Oportunidades públicas</p>
            <h2>Onde alguém pode agir agora</h2>
            {opportunities.length ? (
              opportunities.map((opportunity) => (
                <article className="side-block" key={opportunity.id}>
                  <div className="project-label-row">
                    <strong>OPEN</strong>
                    <span>PUBLIC</span>
                    <span>capacidade {opportunity.capacity}</span>
                  </div>
                  <h3>{opportunity.title}</h3>
                  <p>{opportunity.statement}</p>
                  <dl>
                    <div><dt>Condições</dt><dd>{opportunity.conditions}</dd></div>
                    <div><dt>Resultado esperado</dt><dd>{opportunity.expectedResult}</dd></div>
                  </dl>
                  <Link
                    className="button button-primary"
                    href={`/projects/${project.slug}/opportunities/${opportunity.id}/propose`}
                  >
                    Fazer uma proposta
                  </Link>
                </article>
              ))
            ) : (
              <p>Nenhuma oportunidade pública está aberta neste momento.</p>
            )}
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
