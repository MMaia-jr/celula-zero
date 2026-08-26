import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { issueDomainDecisionAction } from "@/app/claims/[claimId]/decision/new/actions";
import { getClaimDecisionSetup } from "@/lib/data/decisions";
import { getLocale } from "@/lib/i18n/server";

interface PageProps {
  params: Promise<{ claimId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "Issue Decision" : "Emitir Decision" };
}

export default async function NewDecisionPage({ params }: PageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { claimId } = await params;
  if (!z.string().uuid().safeParse(claimId).success) notFound();

  const result = await getClaimDecisionSetup(claimId);
  if (result.status === "ANONYMOUS") {
    redirect(`/login?next=${encodeURIComponent(`/claims/${claimId}/decision/new`)}`);
  }
  if (result.status === "UNAVAILABLE") redirect(`/claims/${claimId}?decision=backend-unavailable`);
  if (result.status !== "READY") notFound();
  if (!result.canDecide || !result.actorId) {
    redirect(`/claims/${claimId}?decision=steward-required`);
  }

  return (
    <main className="form-page section-shell">
      <div className="breadcrumb">
        <Link href={`/claims/${claimId}`}>Claim</Link>
        <span aria-hidden="true">/</span>
        <span>Decision</span>
      </div>

      <header className="form-header">
        <p className="kicker">VERIFICATION → CONTEXTUAL DECISION</p>
        <h1>
          {en
            ? "Decide for this context without turning Verification into truth."
            : "Decida para este contexto sem transformar Verification em verdade."}
        </h1>
        <p>{result.claimStatement}</p>
      </header>

      <section className="content-block">
        <p className="mini-label">AUTHORITY</p>
        <strong>PROJECT_STEWARDSHIP</strong>
        <p>
          {en
            ? "This is the substantive domain Decision. Internal authorization decision_records remain separate audit records."
            : "Esta é a Decision substantiva do domínio. decision_records internos continuam sendo registros separados de auditoria de autorização."}
        </p>
      </section>

      <form className="project-form" action={issueDomainDecisionAction}>
        <input type="hidden" name="claimId" value={claimId} />
        <input type="hidden" name="actorId" value={result.actorId} />
        <input type="hidden" name="commandId" value={randomUUID()} />
        <input
          type="hidden"
          name="idempotencyKey"
          value={`domain-decision-${randomUUID()}`}
        />

        <fieldset className="form-field">
          <legend>{en ? "Verifications considered" : "Verifications consideradas"}</legend>
          {result.verifications.length ? (
            result.verifications.map((verification) => (
              <label className="side-block" key={verification.id}>
                <input
                  type="checkbox"
                  name="verificationIds"
                  value={verification.id}
                  defaultChecked
                />
                {" "}
                <strong>{verification.classification}</strong>
                {" · "}
                {verification.independence}
                <br />
                <span>{verification.findings}</span>
              </label>
            ))
          ) : (
            <p>{en ? "No issued Verification yet." : "Ainda não há Verification emitida."}</p>
          )}
        </fieldset>

        <div className="form-field">
          <label htmlFor="disposition">{en ? "Disposition" : "Disposição"}</label>
          <select id="disposition" name="disposition" defaultValue="DEFER" required>
            <option value="ACCEPT_FOR_CONTEXT">ACCEPT_FOR_CONTEXT</option>
            <option value="REJECT_FOR_CONTEXT">REJECT_FOR_CONTEXT</option>
            <option value="DEFER">DEFER</option>
          </select>
          <p className="field-hint">
            {en
              ? "ACCEPT/REJECT require at least one issued Verification. DEFER may explicitly preserve uncertainty."
              : "ACCEPT/REJECT exigem ao menos uma Verification emitida. DEFER pode preservar explicitamente a incerteza."}
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="reason">{en ? "Reason" : "Razão"}</label>
          <textarea id="reason" name="reason" minLength={10} maxLength={4000} rows={6} required />
        </div>

        <div className="form-field">
          <label htmlFor="limitations">{en ? "Context / limitations" : "Contexto / limitações"}</label>
          <textarea id="limitations" name="limitations" minLength={2} maxLength={2000} rows={4} required />
        </div>

        <div className="form-actions">
          <button className="button button-primary" type="submit">
            {en ? "Issue contextual Decision" : "Emitir Decision contextual"}
          </button>
          <Link className="button button-secondary" href={`/claims/${claimId}`}>
            {en ? "Cancel" : "Cancelar"}
          </Link>
        </div>
      </form>

      <section className="funding-warning">
        <strong>Verification ≠ Decision ≠ Outcome</strong>
      </section>
    </main>
  );
}
