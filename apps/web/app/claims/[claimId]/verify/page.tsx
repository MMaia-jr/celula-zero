import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requestVerificationAction } from "@/app/claims/[claimId]/verify/actions";
import { getVerificationRequestSetup } from "@/lib/data/verifications";
import { getLocale } from "@/lib/i18n/server";

interface VerifyClaimPageProps {
  params: Promise<{ claimId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "Request Verification" : "Solicitar Verification" };
}

export default async function VerifyClaimPage({ params }: VerifyClaimPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { claimId } = await params;
  if (!z.string().uuid().safeParse(claimId).success) notFound();

  const result = await getVerificationRequestSetup(claimId);
  if (result.status === "ANONYMOUS") {
    redirect(`/login?next=${encodeURIComponent(`/claims/${claimId}/verify`)}`);
  }
  if (result.status === "UNAVAILABLE") {
    redirect(`/claims/${claimId}?review=backend-unavailable`);
  }
  if (result.status !== "READY") notFound();
  if (!result.canRequest || !result.requesterActorId) {
    redirect(`/claims/${claimId}?review=steward-required`);
  }

  return (
    <main className="form-page section-shell">
      <div className="breadcrumb">
        <Link href={`/claims/${claimId}`}>Claim</Link>
        <span aria-hidden="true">/</span>
        <span>Verification Request</span>
      </div>

      <header className="form-header">
        <p className="kicker">CLAIM + EVIDENCE → REVIEWER → VERIFICATION</p>
        <h1>
          {en
            ? "Assign a bounded reviewer and declare the review method."
            : "Designe um Reviewer limitado e declare o método de revisão."}
        </h1>
        <p>{result.claimStatement}</p>
      </header>

      <section className="content-block">
        <p className="mini-label">AUTHORITY BOUNDARY</p>
        <strong>Reviewer authority = verification.issue / this Project / 7 days</strong>
        <p>
          {en
            ? "The assignment does not grant stewardship, decision authority, reputation or permanent trust."
            : "A designação não concede stewardship, autoridade de decisão, reputação ou confiança permanente."}
        </p>
      </section>

      <form className="project-form" action={requestVerificationAction}>
        <input type="hidden" name="claimId" value={claimId} />
        <input type="hidden" name="requesterActorId" value={result.requesterActorId} />
        <input type="hidden" name="delegationCommandId" value={randomUUID()} />
        <input
          type="hidden"
          name="delegationIdempotencyKey"
          value={`review-delegation-${randomUUID()}`}
        />
        <input type="hidden" name="requestCommandId" value={randomUUID()} />
        <input
          type="hidden"
          name="requestIdempotencyKey"
          value={`verification-request-${randomUUID()}`}
        />

        <div className="form-field">
          <label htmlFor="reviewerActorId">Reviewer</label>
          <select id="reviewerActorId" name="reviewerActorId" required defaultValue="">
            <option value="" disabled>
              {en ? "Select a public Profile" : "Selecione um Profile público"}
            </option>
            {result.candidates.map((candidate) => (
              <option key={candidate.actorId} value={candidate.actorId}>
                {candidate.displayName} (@{candidate.handle})
              </option>
            ))}
          </select>
          <p className="field-hint">
            {en
              ? "Conflicts are not hidden. Overlap with the Claim author, Evidence custodian or steward is marked NON_INDEPENDENT."
              : "Conflitos não são ocultados. Coincidência com autor da Claim, custodiante da Evidence ou steward é marcada NON_INDEPENDENT."}
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="criteria">{en ? "Review criteria" : "Critérios de revisão"}</label>
          <textarea
            id="criteria"
            name="criteria"
            minLength={10}
            maxLength={4000}
            rows={5}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="expectedMethod">{en ? "Expected method" : "Método esperado"}</label>
          <input
            id="expectedMethod"
            name="expectedMethod"
            minLength={3}
            maxLength={200}
            required
            placeholder="DIGEST_AND_CONTENT_REVIEW"
          />
        </div>

        <div className="form-actions">
          <button className="button button-primary" type="submit">
            {en ? "Assign and request Verification" : "Designar e solicitar Verification"}
          </button>
          <Link className="button button-secondary" href={`/claims/${claimId}`}>
            {en ? "Cancel" : "Cancelar"}
          </Link>
        </div>
      </form>
    </main>
  );
}
