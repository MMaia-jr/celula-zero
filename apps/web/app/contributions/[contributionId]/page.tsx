import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getCommitmentDetail } from "@/lib/data/coordination";
import { getContributionDetail } from "@/lib/data/work";
import { getLocale } from "@/lib/i18n/server";

interface ContributionPageProps {
  params: Promise<{ contributionId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "en" ? "Contribution" : "Contribution",
  };
}

export default async function ContributionPage({
  params,
  searchParams,
}: ContributionPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { contributionId } = await params;
  if (!z.string().uuid().safeParse(contributionId).success) notFound();

  const result = await getContributionDetail(contributionId);
  if (result.status === "ANONYMOUS") {
    redirect(`/login?next=${encodeURIComponent(`/contributions/${contributionId}`)}`);
  }
  if (result.status === "UNAVAILABLE") redirect("/projects?work=backend-unavailable");
  if (result.status !== "READY") notFound();

  const commitmentResult = await getCommitmentDetail(result.contribution.commitmentId);
  if (commitmentResult.status !== "READY") {
    redirect(`/commitments/${result.contribution.commitmentId}`);
  }

  const { contribution } = result;
  const { commitment } = commitmentResult;
  const query = searchParams ? await searchParams : {};
  const artifactStatus = first(query.artifact);
  const workStatus = first(query.work);
  const claimStatus = first(query.claim);

  return (
    <div className="section-shell">
      <div className="breadcrumb">
        <Link href={`/projects/${commitment.projectSlug}`}>{commitment.projectTitle}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/commitments/${commitment.id}`}>Commitment</Link>
        <span aria-hidden="true">/</span>
        <span>Contribution</span>
      </div>

      {artifactStatus || workStatus || claimStatus ? (
        <p className="form-message" role="status">
          {artifactStatus ?? workStatus ?? claimStatus}
        </p>
      ) : null}

      <header className="project-hero">
        <div className="project-hero-main">
          <div className="project-label-row">
            <span className="stage-badge stage-open">CONTRIBUTION · SUBMITTED</span>
            <span className="source-tag">PROJECT</span>
          </div>
          <h1>{en ? "Work recorded under an accepted Commitment." : "Trabalho registrado sob um Commitment aceito."}</h1>
          <p>{contribution.description}</p>
          {contribution.isAuthor ? (
            <div className="hero-actions">
              <Link
                className="button button-primary"
                href={`/contributions/${contribution.id}/artifacts/new`}
              >
                {en ? "Add text Artifact" : "Adicionar Artifact textual"}
              </Link>
              <Link
                className="button button-secondary"
                href={`/contributions/${contribution.id}/claims/new`}
              >
                {en ? "Claim about Contribution" : "Claim sobre a Contribution"}
              </Link>
            </div>
          ) : null}
        </div>
        <aside className="project-steward-card">
          <span className="mini-label">COMMITMENT</span>
          <strong>{commitment.opportunityTitle}</strong>
          <div className="divider" />
          <dl>
            <div><dt>Opportunity</dt><dd>v{commitment.opportunityVersion}</dd></div>
            <div><dt>Proposal</dt><dd>v{commitment.proposalVersion}</dd></div>
          </dl>
        </aside>
      </header>

      <section className="content-block">
        <p className="mini-label">LIMITATIONS</p>
        <h2>{en ? "What this Contribution does not establish" : "O que esta Contribution não estabelece"}</h2>
        <p>{contribution.limitations}</p>
      </section>

      <section className="content-block">
        <p className="mini-label">ARTIFACTS</p>
        <h2>{en ? "Observable outputs attached to this work" : "Saídas observáveis anexadas a este trabalho"}</h2>
        {contribution.artifacts.length ? (
          contribution.artifacts.map((artifact) => (
            <article className="side-block" key={artifact.id}>
              <div className="project-label-row">
                <strong>ARTIFACT · {artifact.kind}</strong>
                <span>{artifact.mediaType}</span>
              </div>
              {artifact.textContent ? (
                <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {artifact.textContent}
                </pre>
              ) : (
                <p>{artifact.uri}</p>
              )}
              <dl>
                <div><dt>Digest</dt><dd><code>{artifact.digestAlgorithm}:{artifact.digest}</code></dd></div>
                <div><dt>URI</dt><dd><code>{artifact.uri}</code></dd></div>
                <div><dt>{en ? "Bytes" : "Bytes"}</dt><dd>{artifact.sizeBytes ?? "—"}</dd></div>
                <div><dt>{en ? "Retention" : "Retenção"}</dt><dd>{artifact.retentionClass}</dd></div>
              </dl>
              {contribution.isAuthor ? (
                <Link
                  className="button button-secondary"
                  href={`/contributions/${contribution.id}/claims/new?artifact=${artifact.id}`}
                >
                  {en ? "Claim about this Artifact" : "Claim sobre este Artifact"}
                </Link>
              ) : null}
            </article>
          ))
        ) : (
          <p>
            {en
              ? "No Artifact has been attached yet. The Contribution remains distinct and valid as a work record."
              : "Nenhum Artifact foi anexado ainda. A Contribution continua distinta e válida como registro de trabalho."}
          </p>
        )}
      </section>

      <section className="funding-warning">
        <strong>Contribution ≠ Artifact ≠ Claim ≠ Evidence ≠ Verification</strong>
        <p>
          {en
            ? "An Artifact is observable output. A Claim says something about work. Evidence is an explicit contextual relation to a source."
            : "Um Artifact é uma saída observável. Uma Claim afirma algo sobre o trabalho. Evidence é uma relação contextual explícita com uma fonte."}
        </p>
      </section>
    </div>
  );
}
