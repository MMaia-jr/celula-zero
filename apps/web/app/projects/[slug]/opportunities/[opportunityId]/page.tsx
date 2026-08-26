import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  reviewProposalAction,
  revisePublicProposalAction,
} from "@/app/projects/[slug]/opportunities/[opportunityId]/actions";
import { getOpportunityCoordination } from "@/lib/data/coordination";
import { getPublicNeed } from "@/lib/data/needs";
import { getPublicProjectBySlug } from "@/lib/data/projects";
import { getLocale } from "@/lib/i18n/server";

interface OpportunityPageProps {
  params: Promise<{ slug: string; opportunityId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: OpportunityPageProps): Promise<Metadata> {
  const locale = await getLocale();
  const { slug, opportunityId } = await params;
  const project = await getPublicProjectBySlug(slug);
  if (!project || !z.string().uuid().safeParse(opportunityId).success) {
    return { title: locale === "en" ? "Opportunity not found" : "Opportunity não encontrada" };
  }

  const coordination = await getOpportunityCoordination(project.id, opportunityId);
  return coordination
    ? {
        title: coordination.opportunity.title,
        description: coordination.opportunity.statement,
      }
    : { title: locale === "en" ? "Opportunity not found" : "Opportunity não encontrada" };
}

export default async function OpportunityPage({
  params,
  searchParams,
}: OpportunityPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { slug, opportunityId } = await params;
  if (!z.string().uuid().safeParse(opportunityId).success) notFound();

  const project = await getPublicProjectBySlug(slug);
  if (!project) notFound();

  const coordination = await getOpportunityCoordination(project.id, opportunityId);
  if (!coordination) notFound();

  const { opportunity, viewer, proposals, commitments } = coordination;
  const linkedNeed = opportunity.needId ? await getPublicNeed(opportunity.needId) : null;
  const query = searchParams ? await searchParams : {};
  const status = first(query.coordination);

  const controlledIds =
    viewer.status === "AUTHENTICATED" ? viewer.controlledActorIds : [];
  const isSteward =
    viewer.status === "AUTHENTICATED" && viewer.isSteward;
  const hasControlledProposal = proposals.some((proposal) =>
    controlledIds.includes(proposal.proposerActorId),
  );

  return (
    <div className="section-shell">
      <div className="breadcrumb">
        <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        <span aria-hidden="true">/</span>
        <span>{opportunity.title}</span>
      </div>

      {status ? (
        <p
          className={`form-message ${
            status.includes("denied") || status.includes("invalid") ? "form-error" : ""
          }`}
          role="status"
        >
          {status}
        </p>
      ) : null}

      <header className="project-hero">
        <div className="project-hero-main">
          <div className="project-label-row">
            <span className={`stage-badge stage-${opportunity.state.toLowerCase()}`}>
              OPPORTUNITY · {opportunity.state}
            </span>
            <span className="source-tag">{opportunity.visibility}</span>
          </div>
          <h1>{opportunity.title}</h1>
          <p>{opportunity.statement}</p>
          <div className="hero-actions">
            {opportunity.state === "OPEN" && !isSteward && !hasControlledProposal ? (
              <Link
                className="button button-primary"
                href={`/projects/${project.slug}/opportunities/${opportunity.id}/propose`}
              >
                {en ? "Make a proposal" : "Fazer uma proposta"}
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="project-steward-card">
          <span className="mini-label">{en ? "Material state" : "Estado material"}</span>
          <strong>
            {en ? "Opportunity version" : "Versão da Opportunity"} {opportunity.currentVersion}
          </strong>
          <div className="divider" />
          <dl>
            <div>
              <dt>{en ? "Material version" : "Versão material"}</dt>
              <dd>{opportunity.materialVersion}</dd>
            </div>
            <div>
              <dt>{en ? "Capacity" : "Capacidade"}</dt>
              <dd>{opportunity.capacity}</dd>
            </div>
          </dl>
        </aside>
      </header>

      {linkedNeed ? (
        <section className="content-block">
          <p className="mini-label">{en ? "Linked first-class Need" : "Need de primeira classe vinculada"}</p>
          <h2><Link href={`/needs/${linkedNeed.id}`}>{linkedNeed.title}</Link></h2>
          <p>{linkedNeed.statement}</p>
          <p className="block-note">Need ≠ Opportunity</p>
        </section>
      ) : opportunity.needId ? (
        <section className="content-block">
          <p className="mini-label">{en ? "Linked Need" : "Need vinculada"}</p>
          <p>
            {en
              ? "This Opportunity retains a Need link, but that Need is not currently available through the public projection."
              : "Esta Opportunity preserva um vínculo com Need, mas essa Need não está disponível na projeção pública atual."}
          </p>
        </section>
      ) : null}

      <div className="project-content-grid">
        <div className="project-main-column">
          <section className="content-block">
            <p className="mini-label">{en ? "Conditions" : "Condições"}</p>
            <h2>{en ? "What constrains the offer" : "O que limita a oferta"}</h2>
            <p>{opportunity.conditions}</p>
          </section>

          <section className="content-block">
            <p className="mini-label">{en ? "Expected result" : "Resultado esperado"}</p>
            <h2>{en ? "What should become observable" : "O que deve se tornar observável"}</h2>
            <p>{opportunity.expectedResult}</p>
          </section>

          {viewer.status === "AUTHENTICATED" ? (
            <section className="content-block">
              <p className="mini-label">
                {isSteward ? (en ? "Proposal review" : "Revisão de Proposals") : (en ? "Your visible Proposals" : "Suas Proposals visíveis")}
              </p>
              <h2>
                {isSteward
                  ? en ? "Review without skipping authority or versions" : "Revise sem pular autoridade ou versões"
                  : en ? "Proposal state" : "Estado da Proposal"}
              </h2>

              {proposals.length ? proposals.map((proposal) => {
                const controlledByViewer = controlledIds.includes(proposal.proposerActorId);
                return (
                  <article className="side-block" key={proposal.id}>
                    <div className="project-label-row">
                      <strong>PROPOSAL · {proposal.state}</strong>
                      <span>v{proposal.currentVersion}</span>
                      <span>material {proposal.materialVersion}</span>
                    </div>
                    <h3>{proposal.proposerName}</h3>
                    <dl>
                      <div><dt>{en ? "Proposal" : "Proposta"}</dt><dd>{proposal.statement}</dd></div>
                      <div><dt>{en ? "Conditions" : "Condições"}</dt><dd>{proposal.conditions}</dd></div>
                      <div><dt>{en ? "Expected delivery" : "Entrega esperada"}</dt><dd>{proposal.expectedDelivery}</dd></div>
                      <div><dt>{en ? "Reward expectation" : "Expectativa de contrapartida"}</dt><dd>{proposal.rewardExpectation}</dd></div>
                    </dl>

                    {isSteward && proposal.state === "SUBMITTED" ? (
                      <div className="form-stack">
                        {(["ACCEPT", "REQUEST_REVISION", "REJECT"] as const).map((operation) => (
                          <form className="project-form" action={reviewProposalAction} key={operation}>
                            <input type="hidden" name="projectSlug" value={project.slug} />
                            <input type="hidden" name="opportunityId" value={opportunity.id} />
                            <input type="hidden" name="proposalId" value={proposal.id} />
                            <input type="hidden" name="operation" value={operation} />
                            <input type="hidden" name="opportunityVersion" value={opportunity.currentVersion} />
                            <input type="hidden" name="proposalVersion" value={proposal.currentVersion} />
                            <input type="hidden" name="expectedOpportunityMaterialVersion" value={opportunity.materialVersion} />
                            <input type="hidden" name="expectedProposalMaterialVersion" value={proposal.materialVersion} />
                            <input type="hidden" name="commandId" value={randomUUID()} />
                            <input type="hidden" name="idempotencyKey" value={`coordination-${operation.toLowerCase()}-${randomUUID()}`} />
                            <label>
                              <span>
                                {operation === "ACCEPT"
                                  ? en ? "Acceptance reason" : "Razão da aceitação"
                                  : operation === "REQUEST_REVISION"
                                    ? en ? "What should be revised?" : "O que deve ser revisado?"
                                    : en ? "Rejection reason" : "Razão da rejeição"}
                              </span>
                              <textarea name="reason" minLength={3} maxLength={1000} rows={2} required />
                            </label>
                            <button
                              className={`button ${operation === "ACCEPT" ? "button-primary" : "button-secondary"}`}
                              type="submit"
                            >
                              {operation === "ACCEPT"
                                ? en ? "Accept exact versions" : "Aceitar versões exatas"
                                : operation === "REQUEST_REVISION"
                                  ? en ? "Request revision" : "Solicitar revisão"
                                  : en ? "Reject proposal" : "Rejeitar Proposal"}
                            </button>
                          </form>
                        ))}
                      </div>
                    ) : null}

                    {controlledByViewer && proposal.state === "REVISION_REQUESTED" ? (
                      <form className="project-form" action={revisePublicProposalAction}>
                        <input type="hidden" name="projectSlug" value={project.slug} />
                        <input type="hidden" name="opportunityId" value={opportunity.id} />
                        <input type="hidden" name="proposalId" value={proposal.id} />
                        <input type="hidden" name="actorId" value={proposal.proposerActorId} />
                        <input type="hidden" name="expectedProposalMaterialVersion" value={proposal.materialVersion} />
                        <input type="hidden" name="commandId" value={randomUUID()} />
                        <input type="hidden" name="idempotencyKey" value={`public-proposal-revision-${randomUUID()}`} />
                        <label><span>{en ? "Revised proposal" : "Proposal revisada"}</span><textarea name="statement" rows={4} minLength={10} maxLength={4000} defaultValue={proposal.statement} required /></label>
                        <label><span>{en ? "Revised conditions" : "Condições revisadas"}</span><textarea name="conditions" rows={3} minLength={3} maxLength={4000} defaultValue={proposal.conditions} required /></label>
                        <label><span>{en ? "Revised expected delivery" : "Entrega esperada revisada"}</span><textarea name="expectedDelivery" rows={3} minLength={3} maxLength={2000} defaultValue={proposal.expectedDelivery} required /></label>
                        <label><span>{en ? "Revised reward expectation" : "Expectativa de contrapartida revisada"}</span><textarea name="rewardExpectation" rows={2} minLength={2} maxLength={1000} defaultValue={proposal.rewardExpectation} required /></label>
                        <button className="button button-primary" type="submit">
                          {en ? "Submit immutable revision" : "Enviar revisão imutável"}
                        </button>
                      </form>
                    ) : null}
                  </article>
                );
              }) : (
                <p>{en ? "No Proposal is visible to this identity." : "Nenhuma Proposal está visível para esta identidade."}</p>
              )}
            </section>
          ) : null}

          {viewer.status === "AUTHENTICATED" ? (
            <section className="content-block">
              <p className="mini-label">COMMITMENTS</p>
              <h2>{en ? "Accepted coordination agreements" : "Acordos de coordenação aceitos"}</h2>
              {commitments.length ? (
                commitments.map((commitment) => (
                  <article className="side-block" key={commitment.id}>
                    <strong>COMMITMENT · ACCEPTED</strong>
                    <p>
                      {commitment.proposerName} → {commitment.acceptedByName}
                    </p>
                    <p>
                      Opportunity v{commitment.opportunityVersion} · Proposal v{commitment.proposalVersion}
                    </p>
                    <Link className="button button-secondary" href={`/commitments/${commitment.id}`}>
                      {en ? "Open Commitment" : "Abrir Commitment"}
                    </Link>
                  </article>
                ))
              ) : (
                <p>{en ? "No Commitment is visible to this identity." : "Nenhum Commitment está visível para esta identidade."}</p>
              )}
            </section>
          ) : null}
        </div>

        <aside className="project-side-column">
          <section className="side-block">
            <p className="mini-label">{en ? "Semantic boundary" : "Fronteira semântica"}</p>
            <p>Need ≠ Opportunity ≠ Proposal ≠ Commitment.</p>
            <p>
              {en
                ? "Acceptance records a bounded agreement. It does not prove work, contribution, evidence, verification or outcome."
                : "Aceitação registra um acordo delimitado. Ela não prova trabalho, contribuição, evidência, verificação ou resultado."}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
