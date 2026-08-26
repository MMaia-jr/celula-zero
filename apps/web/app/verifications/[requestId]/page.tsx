import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { issueVerificationAction } from "@/app/verifications/[requestId]/actions";
import { getVerificationRequestDetail } from "@/lib/data/verifications";
import { getLocale } from "@/lib/i18n/server";

interface VerificationPageProps {
  params: Promise<{ requestId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "Verification" : "Verification" };
}

export default async function VerificationPage({
  params,
  searchParams,
}: VerificationPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { requestId } = await params;
  if (!z.string().uuid().safeParse(requestId).success) notFound();

  const result = await getVerificationRequestDetail(requestId);
  if (result.status === "ANONYMOUS") {
    redirect(`/login?next=${encodeURIComponent(`/verifications/${requestId}`)}`);
  }
  if (result.status === "UNAVAILABLE") redirect("/projects?verification=backend-unavailable");
  if (result.status !== "READY") notFound();

  const query = searchParams ? await searchParams : {};
  const status = first(query.review) ?? first(query.verification);
  const { request } = result;

  return (
    <div className="section-shell">
      <div className="breadcrumb">
        <Link href={`/claims/${request.claimId}`}>Claim</Link>
        <span aria-hidden="true">/</span>
        <span>Verification</span>
      </div>

      {status ? <p className="form-message" role="status">{status}</p> : null}

      <header className="project-hero">
        <div className="project-hero-main">
          <div className="project-label-row">
            <span className="stage-badge stage-open">
              VERIFICATION REQUEST · {request.state}
            </span>
            <span className="source-tag">{request.independence}</span>
          </div>
          <h1>{request.claimStatement}</h1>
          <p><strong>Reviewer:</strong> {request.reviewerLabel}</p>
          <p><strong>{en ? "Criteria:" : "Critérios:"}</strong> {request.criteria}</p>
          <p><strong>{en ? "Expected method:" : "Método esperado:"}</strong> {request.expectedMethod}</p>
        </div>
        <aside className="project-steward-card">
          <span className="mini-label">INDEPENDENCE</span>
          <strong>{request.independence}</strong>
          <div className="divider" />
          {request.conflictCodes.length ? (
            <ul>
              {request.conflictCodes.map((code) => <li key={code}>{code}</li>)}
            </ul>
          ) : (
            <p>{en ? "No declared conflict detected." : "Nenhum conflito declarado detectado."}</p>
          )}
          {request.dueAt ? <p>{new Date(request.dueAt).toLocaleString()}</p> : null}
        </aside>
      </header>

      <section className="content-block">
        <p className="mini-label">EVIDENCE AVAILABLE TO REVIEWER</p>
        <h2>{en ? "Explicit Evidence linked to the Claim" : "Evidence explícita ligada à Claim"}</h2>
        {request.evidence.map((item) => (
          <article className="side-block" key={item.id}>
            <strong>EVIDENCE · {item.relation}</strong>
            <p>{item.description}</p>
            <p><strong>{en ? "Limitations:" : "Limitações:"}</strong> {item.limitations}</p>
            <code>{item.digestAlgorithm}:{item.digest}</code>
          </article>
        ))}
      </section>

      {request.issued ? (
        <section className="content-block">
          <p className="mini-label">ISSUED VERIFICATION</p>
          <h2>{request.issued.classification}</h2>
          <p><strong>{en ? "Method:" : "Método:"}</strong> {request.issued.method}</p>
          <p>{request.issued.findings}</p>
          <p><strong>{en ? "Limitations:" : "Limitações:"}</strong> {request.issued.limitations}</p>
          <p>
            <strong>{request.issued.independence}</strong>
            {request.issued.conflictCodes.length
              ? ` · ${request.issued.conflictCodes.join(", ")}`
              : ""}
          </p>
        </section>
      ) : request.canIssue && request.state === "OPEN" ? (
        <form className="project-form" action={issueVerificationAction}>
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="actorId" value={request.reviewerActorId} />
          <input type="hidden" name="method" value={request.expectedMethod} />
          <input type="hidden" name="commandId" value={randomUUID()} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={`verification-issue-${randomUUID()}`}
          />

          <fieldset className="form-field">
            <legend>{en ? "Evidence examined" : "Evidence examinada"}</legend>
            {request.evidence.map((item) => (
              <label className="side-block" key={item.id}>
                <input
                  type="checkbox"
                  name="evidenceItemIds"
                  value={item.id}
                  defaultChecked
                />
                {" "}
                <strong>{item.relation}</strong>
                <br />
                <span>{item.description}</span>
              </label>
            ))}
          </fieldset>

          <div className="form-field">
            <label htmlFor="classification">{en ? "Classification" : "Classificação"}</label>
            <select id="classification" name="classification" defaultValue="INCONCLUSIVE" required>
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="INCONCLUSIVE">INCONCLUSIVE</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="findings">{en ? "Findings" : "Achados"}</label>
            <textarea id="findings" name="findings" minLength={10} maxLength={4000} rows={6} required />
          </div>

          <div className="form-field">
            <label htmlFor="limitations">{en ? "Limitations" : "Limitações"}</label>
            <textarea id="limitations" name="limitations" minLength={2} maxLength={2000} rows={4} required />
          </div>

          <div className="form-actions">
            <button className="button button-primary" type="submit">
              {en ? "Issue Verification" : "Emitir Verification"}
            </button>
          </div>
        </form>
      ) : (
        <section className="content-block">
          <p>
            {en
              ? "Only the assigned Reviewer can issue this Verification."
              : "Somente o Reviewer designado pode emitir esta Verification."}
          </p>
        </section>
      )}

      {request.issued ? (
        <section className="content-block">
          <p className="mini-label">NEXT CONTEXTUAL ACTION</p>
          <div className="hero-actions">
            <Link className="button button-primary" href={`/claims/${request.claimId}/decision/new`}>
              {en ? "Issue contextual Decision" : "Emitir Decision contextual"}
            </Link>
            {request.commitmentId ? (
              <Link className="button button-secondary" href={`/commitments/${request.commitmentId}/history`}>
                {en ? "Coordination history" : "Histórico de coordenação"}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="funding-warning">
        <strong>Evidence ≠ Verification ≠ Decision ≠ Outcome</strong>
        <p>
          {en
            ? "A Verification is an attributed examination under declared criteria and method. It does not decide the consequence."
            : "Verification é um exame atribuído sob critérios e método declarados. Ela não decide a consequência."}
        </p>
      </section>
    </div>
  );
}
