import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectTimeline } from "@/components/project-timeline";
import { StageBadge } from "@/components/stage-badge";
import { listPublicOpenOpportunities } from "@/lib/data/public-opportunities";
import { getPublicProjectBySlug } from "@/lib/data/projects";
import {
  actorKindLabel,
  economicRegimeLabel,
  formatLocalizedDate,
  projectPresentationTranslation,
} from "@/lib/i18n/core";
import { getLocale } from "@/lib/i18n/server";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const project = await getPublicProjectBySlug(slug);
  const translation = project ? projectPresentationTranslation(project.slug, locale) : null;

  return project
    ? { title: project.title, description: translation?.summary ?? project.summary }
    : { title: locale === "en" ? "Project not found" : "Projeto não encontrado" };
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);
  if (!project) notFound();

  const translation = projectPresentationTranslation(project.slug, locale);
  const display = {
    summary: translation?.summary ?? project.summary,
    currentIntent: translation?.currentIntent ?? project.currentIntent,
    intendedResult: translation?.intendedResult ?? project.intendedResult,
    rulesAndLimits: translation?.rulesAndLimits ?? project.rulesAndLimits,
  };

  const opportunities = await listPublicOpenOpportunities(project.id);
  const query = searchParams ? await searchParams : {};
  const proposalStatus = first(query.proposal);

  return (
    <div className="project-page section-shell">
      <div className="breadcrumb">
        <Link href="/projects">{en ? "Projects" : "Projetos"}</Link>
        <span aria-hidden="true">/</span>
        <span>{project.title}</span>
      </div>

      {proposalStatus === "submitted" ? (
        <p className="form-message" role="status">
          {en
            ? "Proposal recorded. No Commitment was created; the project steward still needs to decide."
            : "Proposal registrada. Nenhum Commitment foi criado; o responsável ainda precisa decidir."}
        </p>
      ) : null}

      {proposalStatus && proposalStatus !== "submitted" ? (
        <p className="form-message form-error" role="alert">
          {en
            ? `The Proposal was not recorded (${proposalStatus}). No success was assumed.`
            : `A Proposal não foi registrada (${proposalStatus}). Nenhum sucesso foi presumido.`}
        </p>
      ) : null}

      {en && translation ? (
        <p className="form-message form-neutral" role="note">
          English text on this page is a derived presentation. The canonical project record remains
          in Portuguese, and exports preserve the source record.
        </p>
      ) : null}

      <header className="project-hero">
        <div className="project-hero-main">
          <div className="project-label-row">
            <StageBadge stage={project.stage} locale={locale} />
            <span className="source-tag">{project.sourceLabel}</span>
          </div>
          <h1>{project.title}</h1>
          <p>{display.summary}</p>
          <div className="project-actions">
            <a className="button button-primary" href={`/projects/${project.slug}/export?format=md`}>
              {en ? "Export Markdown" : "Exportar Markdown"}
            </a>
            <a className="button button-secondary" href={`/projects/${project.slug}/export?format=json`}>
              {en ? "Export JSON" : "Exportar JSON"}
            </a>
          </div>
        </div>
        <aside className="project-steward-card">
          <span className="mini-label">{en ? "Contextual steward" : "Responsável contextual"}</span>
          <strong>{project.steward.name}</strong>
          <span>{actorKindLabel(project.steward.kind, locale)}</span>
          {project.steward.operatorLabel ? <small>{project.steward.operatorLabel}</small> : null}
          <div className="divider" />
          <dl>
            <div><dt>{en ? "Stage" : "Estágio"}</dt><dd>{project.stage}</dd></div>
            <div><dt>{en ? "Regime" : "Regime"}</dt><dd>{economicRegimeLabel(project.economicRegime, locale)}</dd></div>
            <div><dt>{en ? "Version" : "Versão"}</dt><dd>{project.version}</dd></div>
            <div>
              <dt>{en ? "Published" : "Publicado"}</dt>
              <dd>
                {project.publishedAt
                  ? formatLocalizedDate(project.publishedAt, locale)
                  : en ? "no" : "não"}
              </dd>
            </div>
          </dl>
        </aside>
      </header>

      <div className="project-content-grid">
        <div className="project-main-column">
          <section className="content-block original-record">
            <p className="mini-label">
              {en ? "Original Record · immutable · source" : "Registro Original · imutável"}
            </p>
            <blockquote>{project.originalIntent}</blockquote>
            <p className="block-note">
              {en
                ? "Preserved literally in its source language. Corrections enter as new interpretations."
                : "Preservado literalmente. Correções entram como novas interpretações."}
            </p>
            {en && translation ? (
              <>
                <p className="mini-label">English translation · derived presentation</p>
                <blockquote>{translation.originalIntent}</blockquote>
              </>
            ) : null}
          </section>

          <section className="content-block">
            <p className="mini-label">{en ? "Current interpretation" : "Interpretação atual"}</p>
            <h2>{en ? "What this project is seeking now" : "O que este projeto busca agora"}</h2>
            <p>{display.currentIntent}</p>
          </section>

          <section className="content-block">
            <p className="mini-label">{en ? "Intended result" : "Resultado pretendido"}</p>
            <h2>{en ? "What would be observable" : "O que seria observável"}</h2>
            <p>{display.intendedResult}</p>
          </section>

          <section className="content-block">
            <p className="mini-label">{en ? "Public opportunities" : "Oportunidades públicas"}</p>
            <h2>{en ? "Where someone can act now" : "Onde alguém pode agir agora"}</h2>
            {en ? (
              <p className="block-note">
                Opportunity content is shown as authored. No automatic translation is presented as source text.
              </p>
            ) : null}
            {opportunities.length ? (
              opportunities.map((opportunity) => (
                <article className="side-block" key={opportunity.id}>
                  <div className="project-label-row">
                    <strong>OPEN</strong>
                    <span>PUBLIC</span>
                    <span>{en ? "capacity" : "capacidade"} {opportunity.capacity}</span>
                  </div>
                  <h3>{opportunity.title}</h3>
                  <p>{opportunity.statement}</p>
                  <dl>
                    <div><dt>{en ? "Conditions" : "Condições"}</dt><dd>{opportunity.conditions}</dd></div>
                    <div><dt>{en ? "Expected result" : "Resultado esperado"}</dt><dd>{opportunity.expectedResult}</dd></div>
                  </dl>
                  <Link
                    className="button button-primary"
                    href={`/projects/${project.slug}/opportunities/${opportunity.id}/propose`}
                  >
                    {en ? "Make a proposal" : "Fazer uma proposta"}
                  </Link>
                </article>
              ))
            ) : (
              <p>
                {en
                  ? "No public opportunity is open at this moment."
                  : "Nenhuma oportunidade pública está aberta neste momento."}
              </p>
            )}
          </section>

          <section className="content-block">
            <p className="mini-label">{en ? "Public trajectory" : "Trajetória pública"}</p>
            <h2>
              {en
                ? "Material state and reconstructible events"
                : "Estado material e eventos reconstruíveis"}
            </h2>
            {en ? (
              <p className="block-note">
                Event titles and descriptions remain as recorded in the project history.
              </p>
            ) : null}
            <ProjectTimeline events={project.events} locale={locale} />
          </section>
        </div>

        <aside className="project-side-column">
          <section className="side-block">
            <p className="mini-label">{en ? "Needs now" : "Precisa agora"}</p>
            <div className="need-list">
              {project.needs.map((need) => <span key={need}>{need}</span>)}
            </div>
          </section>
          <section className="side-block">
            <p className="mini-label">{en ? "Rules and limits" : "Regras e limites"}</p>
            <p>{display.rulesAndLimits}</p>
          </section>
          <section className="funding-warning">
            <strong>{en ? "Non-custodial funding" : "Financiamento não custodial"}</strong>
            <p>
              {en
                ? "Interests and bounties are declarations. The platform does not receive or move funds."
                : "Interesses e bounties são declarações. A plataforma não recebe nem movimenta fundos."}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
