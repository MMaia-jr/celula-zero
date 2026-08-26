import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { registerEvidenceAction } from "@/app/claims/[claimId]/evidence/new/actions";
import { getEvidenceRegistrationContext } from "@/lib/data/claims";
import { getLocale } from "@/lib/i18n/server";

interface NewEvidencePageProps {
  params: Promise<{ claimId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "Register Evidence" : "Registrar Evidence" };
}

export default async function NewEvidencePage({ params }: NewEvidencePageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { claimId } = await params;
  if (!z.string().uuid().safeParse(claimId).success) notFound();

  const result = await getEvidenceRegistrationContext(claimId);
  if (result.status === "ANONYMOUS") {
    redirect(`/login?next=${encodeURIComponent(`/claims/${claimId}/evidence/new`)}`);
  }
  if (result.status === "UNAVAILABLE") {
    redirect(`/claims/${claimId}?evidence=backend-unavailable`);
  }
  if (result.status === "NOT_AUTHORIZED") {
    redirect(`/claims/${claimId}?evidence=claim-author-required`);
  }
  if (result.status !== "READY") notFound();

  return (
    <main className="form-page section-shell">
      <div className="breadcrumb">
        <Link href={`/claims/${claimId}`}>Claim</Link>
        <span aria-hidden="true">/</span>
        <span>Evidence</span>
      </div>

      <header className="form-header">
        <p className="kicker">ARTIFACT → EVIDENCE → CLAIM</p>
        <h1>
          {en
            ? "Document how an Artifact relates to this Claim."
            : "Documente como um Artifact se relaciona com esta Claim."}
        </h1>
        <p>{result.claim.statement}</p>
      </header>

      <section className="content-block">
        <p className="mini-label">SEMANTIC BOUNDARY</p>
        <strong>Artifact ≠ Evidence · Evidence ≠ Verification</strong>
        <p>
          {en
            ? "Evidence is an explicit contextual use of a source. It is not proof and does not verify the Claim."
            : "Evidence é o uso contextual explícito de uma fonte. Ela não é prova e não verifica a Claim."}
        </p>
      </section>

      {result.artifacts.length ? (
        <form className="project-form" action={registerEvidenceAction}>
          <input type="hidden" name="claimId" value={claimId} />
          <input type="hidden" name="actorId" value={result.actorId} />
          <input type="hidden" name="commandId" value={randomUUID()} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={`evidence-register-${randomUUID()}`}
          />

          <fieldset className="form-field">
            <legend>{en ? "Source Artifact" : "Artifact fonte"}</legend>
            {result.artifacts.map((artifact, index) => (
              <label className="side-block" key={artifact.id}>
                <input
                  type="radio"
                  name="sourceArtifactId"
                  value={artifact.id}
                  defaultChecked={index === 0}
                  required
                />
                {" "}
                <strong>{artifact.kind}</strong>
                <br />
                <code>{artifact.digestAlgorithm}:{artifact.digest}</code>
              </label>
            ))}
          </fieldset>

          <div className="form-field">
            <label htmlFor="relation">{en ? "Relation to Claim" : "Relação com a Claim"}</label>
            <select id="relation" name="relation" defaultValue="SUPPORTS" required>
              <option value="SUPPORTS">SUPPORTS</option>
              <option value="CHALLENGES">CHALLENGES</option>
              <option value="CONTEXTUALIZES">CONTEXTUALIZES</option>
              <option value="REPLICATES">REPLICATES</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="description">{en ? "Why this source matters" : "Por que esta fonte importa"}</label>
            <textarea id="description" name="description" minLength={10} maxLength={4000} rows={5} required />
          </div>

          <div className="form-field">
            <label htmlFor="limitations">{en ? "Limitations" : "Limitações"}</label>
            <textarea id="limitations" name="limitations" minLength={2} maxLength={2000} rows={4} required />
          </div>

          <div className="form-actions">
            <button className="button button-primary" type="submit">
              {en ? "Register Evidence" : "Registrar Evidence"}
            </button>
            <Link className="button button-secondary" href={`/claims/${claimId}`}>
              {en ? "Cancel" : "Cancelar"}
            </Link>
          </div>
        </form>
      ) : (
        <section className="content-block">
          <h2>{en ? "No eligible Artifact yet" : "Ainda não há Artifact elegível"}</h2>
          <p>
            {en
              ? "Create an Artifact in your Contribution before registering Evidence."
              : "Crie um Artifact em sua Contribution antes de registrar Evidence."}
          </p>
        </section>
      )}
    </main>
  );
}
