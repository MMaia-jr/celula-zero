import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { actorLabel, getCommitmentHistory } from "@/lib/data/history";
import { getLocale } from "@/lib/i18n/server";

interface PageProps {
  params: Promise<{ commitmentId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "en" ? "Coordination History" : "Histórico de coordenação",
  };
}

export default async function CoordinationHistoryPage({ params }: PageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { commitmentId } = await params;
  if (!z.string().uuid().safeParse(commitmentId).success) notFound();

  const result = await getCommitmentHistory(commitmentId);
  if (result.status === "ANONYMOUS") {
    redirect(`/login?next=${encodeURIComponent(`/commitments/${commitmentId}/history`)}`);
  }
  if (result.status === "UNAVAILABLE") redirect("/projects?history=backend-unavailable");
  if (result.status === "DENIED") redirect("/projects?history=denied");
  if (result.status !== "READY") notFound();

  const { history } = result;

  return (
    <div className="section-shell">
      <div className="breadcrumb">
        <Link href={`/projects/${history.project.slug}`}>{history.project.title}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/commitments/${history.commitment.id}`}>Commitment</Link>
        <span aria-hidden="true">/</span>
        <span>{en ? "History" : "Histórico"}</span>
      </div>

      <header className="project-hero">
        <div className="project-hero-main">
          <div className="project-label-row">
            <span className="stage-badge stage-open">COORDINATION HISTORY</span>
            <span className="source-tag">{history.viewer_scope}</span>
          </div>
          <h1>
            {en
              ? "Why this work existed, what happened, who checked it and what followed."
              : "Por que este trabalho existiu, o que aconteceu, quem o verificou e o que se seguiu."}
          </h1>
          <div className="hero-actions">
            <Link
              className="button button-secondary"
              href={`/api/commitments/${history.commitment.id}/prov`}
            >
              {en ? "PROV provenance export" : "Exportar proveniência PROV"}
            </Link>
          </div>
        </div>
      </header>

      <section className="content-block">
        <p className="mini-label">WHY</p>
        {history.need ? (
          <>
            <h2>Need · {history.need.title}</h2>
            <p>{history.need.statement}</p>
          </>
        ) : (
          <p>{en ? "No first-class Need linked." : "Nenhuma Need de primeira classe vinculada."}</p>
        )}
        <h2>Opportunity · v{history.opportunity.version}</h2>
        <p>{history.opportunity.title}</p>
        <p>{history.opportunity.statement}</p>
      </section>

      <section className="content-block">
        <p className="mini-label">AGREEMENT</p>
        <h2>Proposal · v{history.proposal.version}</h2>
        {history.proposal.statement ? <p>{history.proposal.statement}</p> : <p>REDACTED FOR REVIEWER</p>}
        <p>
          {actorLabel(history, history.commitment.proposer_actor_id)}
          {" → "}
          {actorLabel(history, history.commitment.accepted_by_actor_id)}
        </p>
        <strong>Commitment · ACCEPTED</strong>
      </section>

      <section className="content-block">
        <p className="mini-label">WORK + ARTIFACT</p>
        {history.contributions.map((contribution) => (
          <article className="side-block" key={contribution.id}>
            <strong>CONTRIBUTION</strong>
            <p>{contribution.description ?? "REDACTED FOR REVIEWER"}</p>
            <p>{contribution.limitations ?? ""}</p>
            {history.artifacts
              .filter((artifact) => artifact.contribution_id === contribution.id)
              .map((artifact) => (
                <div key={artifact.id}>
                  <strong>ARTIFACT · {artifact.kind}</strong>
                  <p><code>{artifact.digest_algorithm}:{artifact.digest}</code></p>
                </div>
              ))}
          </article>
        ))}
      </section>

      <section className="content-block">
        <p className="mini-label">CLAIM + EVIDENCE + VERIFICATION</p>
        {history.claims.map((claim) => (
          <article className="side-block" key={claim.id}>
            <strong>CLAIM</strong>
            <p>{claim.statement}</p>
            {history.evidence
              .filter((item) => item.claim_id === claim.id)
              .map((item) => (
                <div key={item.id}>
                  <strong>EVIDENCE · {item.relation}</strong>
                  <p>{item.description}</p>
                </div>
              ))}
            {history.verifications
              .filter((item) => item.claim_id === claim.id)
              .map((verification) => (
                <div key={verification.id}>
                  <strong>
                    VERIFICATION · {verification.classification} · {verification.independence}
                  </strong>
                  <p>{verification.findings}</p>
                </div>
              ))}
          </article>
        ))}
      </section>

      <section className="content-block">
        <p className="mini-label">DECISION + OUTCOME</p>
        {history.decisions.length ? (
          history.decisions.map((decision) => (
            <article className="side-block" key={decision.id}>
              <strong>DECISION · {decision.disposition}</strong>
              <p>{decision.reason}</p>
              <p><strong>Authority:</strong> {decision.authority_basis}</p>
              <Link href={`/decisions/${decision.id}`}>
                {en ? "Open Decision" : "Abrir Decision"}
              </Link>
              {history.outcomes
                .filter((outcome) => outcome.decision_id === decision.id)
                .map((outcome) => (
                  <div key={outcome.id}>
                    <strong>OUTCOME · {outcome.classification}</strong>
                    <p>{outcome.statement}</p>
                  </div>
                ))}
            </article>
          ))
        ) : (
          <p>{en ? "No substantive Decision yet." : "Ainda não há Decision substantiva."}</p>
        )}
      </section>

      <section className="funding-warning">
        <strong>
          Original Record ≠ Claim ≠ Evidence ≠ Verification ≠ Decision ≠ Outcome
        </strong>
        <p>
          {en
            ? "This view is a human-readable projection over native records. It is not a new Episode source of truth."
            : "Esta visão é uma projeção legível por humanos sobre registros nativos. Ela não cria uma nova fonte de verdade chamada Episode."}
        </p>
      </section>
    </div>
  );
}
