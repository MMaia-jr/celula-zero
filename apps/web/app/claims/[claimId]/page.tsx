import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getClaimDetail } from "@/lib/data/claims";
import { getVerificationRequestSetup } from "@/lib/data/verifications";
import { getLocale } from "@/lib/i18n/server";

interface ClaimPageProps {
  params: Promise<{ claimId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "Claim" : "Claim" };
}

export default async function ClaimPage({ params, searchParams }: ClaimPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { claimId } = await params;
  if (!z.string().uuid().safeParse(claimId).success) notFound();

  const result = await getClaimDetail(claimId);
  if (result.status === "ANONYMOUS") {
    redirect(`/login?next=${encodeURIComponent(`/claims/${claimId}`)}`);
  }
  if (result.status === "UNAVAILABLE") redirect("/projects?claim=backend-unavailable");
  if (result.status !== "READY") notFound();

  const query = searchParams ? await searchParams : {};
  const status = first(query.claim) ?? first(query.evidence) ?? first(query.review);
  const { claim } = result;
  const verificationSetup = await getVerificationRequestSetup(claimId);
  const canRequestVerification =
    verificationSetup.status === "READY" && verificationSetup.canRequest;

  return (
    <div className="section-shell">
      <div className="breadcrumb">
        <Link href={`/contributions/${claim.subjectContributionId}`}>Contribution</Link>
        <span aria-hidden="true">/</span>
        <span>Claim</span>
      </div>

      {status ? (
        <p className="form-message" role="status">
          {status}
        </p>
      ) : null}

      <header className="project-hero">
        <div className="project-hero-main">
          <div className="project-label-row">
            <span className="stage-badge stage-open">CLAIM · {claim.state}</span>
            <span className="source-tag">PROJECT</span>
          </div>
          <h1>{claim.statement}</h1>
          <p>{claim.scopeDescription}</p>
          {claim.isAuthor || canRequestVerification ? (
            <div className="hero-actions">
              {claim.isAuthor ? (
                <Link
                  className="button button-primary"
                  href={`/claims/${claim.id}/evidence/new`}
                >
                  {en ? "Register Evidence" : "Registrar Evidence"}
                </Link>
              ) : null}
              {canRequestVerification ? (
                <Link
                  className="button button-secondary"
                  href={`/claims/${claim.id}/verify`}
                >
                  {en ? "Request Verification" : "Solicitar Verification"}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <aside className="project-steward-card">
          <span className="mini-label">SUBJECT</span>
          <strong>{claim.subjectType}</strong>
          <div className="divider" />
          <code>{claim.subjectId}</code>
        </aside>
      </header>

      <section className="content-block">
        <p className="mini-label">EVIDENCE</p>
        <h2>
          {en
            ? "Explicit source relationships to this Claim"
            : "Relações explícitas de fontes com esta Claim"}
        </h2>
        {claim.evidence.length ? (
          claim.evidence.map((item) => (
            <article className="side-block" key={item.id}>
              <div className="project-label-row">
                <strong>EVIDENCE · {item.relation}</strong>
                <span>{item.state}</span>
              </div>
              <p>{item.description}</p>
              <p><strong>{en ? "Limitations:" : "Limitações:"}</strong> {item.limitations}</p>
              <code>{item.digestAlgorithm}:{item.digest}</code>
            </article>
          ))
        ) : (
          <p>
            {en
              ? "No Evidence has been registered. The Claim remains a Claim."
              : "Nenhuma Evidence foi registrada. A Claim continua sendo uma Claim."}
          </p>
        )}
      </section>

      <section className="funding-warning">
        <strong>Claim ≠ Evidence ≠ Verification ≠ Decision</strong>
        <p>
          {en
            ? "Evidence can support, challenge, contextualize or replicate a Claim. It does not verify or decide it."
            : "Evidence pode apoiar, desafiar, contextualizar ou replicar uma Claim. Ela não verifica nem decide a Claim."}
        </p>
      </section>
    </div>
  );
}
