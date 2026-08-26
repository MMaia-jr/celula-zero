import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { recordClaimAction } from "@/app/contributions/[contributionId]/claims/new/actions";
import { getContributionDetail } from "@/lib/data/work";
import { getLocale } from "@/lib/i18n/server";

interface NewClaimPageProps {
  params: Promise<{ contributionId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "Record Claim" : "Registrar Claim" };
}

export default async function NewClaimPage({
  params,
  searchParams,
}: NewClaimPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { contributionId } = await params;
  if (!z.string().uuid().safeParse(contributionId).success) notFound();

  const result = await getContributionDetail(contributionId);
  if (result.status === "ANONYMOUS") {
    redirect(`/login?next=${encodeURIComponent(`/contributions/${contributionId}/claims/new`)}`);
  }
  if (result.status === "UNAVAILABLE") {
    redirect(`/contributions/${contributionId}?claim=backend-unavailable`);
  }
  if (result.status !== "READY") notFound();
  if (!result.contribution.isAuthor) {
    redirect(`/contributions/${contributionId}?claim=author-required`);
  }

  const query = searchParams ? await searchParams : {};
  const artifactParam = first(query.artifact);
  const selectedArtifact =
    artifactParam && z.string().uuid().safeParse(artifactParam).success
      ? result.contribution.artifacts.find(({ id }) => id === artifactParam)
      : undefined;

  const subjectType = selectedArtifact ? "ARTIFACT" : "CONTRIBUTION";
  const subjectId = selectedArtifact?.id ?? result.contribution.id;

  return (
    <main className="form-page section-shell">
      <div className="breadcrumb">
        <Link href={`/contributions/${result.contribution.id}`}>Contribution</Link>
        <span aria-hidden="true">/</span>
        <span>Claim</span>
      </div>

      <header className="form-header">
        <p className="kicker">CONTRIBUTION / ARTIFACT → CLAIM</p>
        <h1>
          {en
            ? "State exactly what you claim about this work."
            : "Declare exatamente o que você afirma sobre este trabalho."}
        </h1>
        <p>
          {selectedArtifact
            ? en
              ? "The Claim concerns the selected Artifact."
              : "A Claim diz respeito ao Artifact selecionado."
            : en
              ? "The Claim concerns the Contribution as a work record."
              : "A Claim diz respeito à Contribution como registro de trabalho."}
        </p>
      </header>

      <section className="content-block">
        <p className="mini-label">SEMANTIC BOUNDARY</p>
        <strong>Claim ≠ Evidence ≠ Verification</strong>
        <p>
          {en
            ? "Recording a Claim does not make it true and does not create Evidence."
            : "Registrar uma Claim não a torna verdadeira e não cria Evidence."}
        </p>
      </section>

      <form className="project-form" action={recordClaimAction}>
        <input type="hidden" name="contributionId" value={result.contribution.id} />
        <input type="hidden" name="actorId" value={result.contribution.authorActorId} />
        <input type="hidden" name="subjectType" value={subjectType} />
        <input type="hidden" name="subjectId" value={subjectId} />
        <input type="hidden" name="commandId" value={randomUUID()} />
        <input
          type="hidden"
          name="idempotencyKey"
          value={`claim-record-${randomUUID()}`}
        />

        <div className="form-field">
          <label>Subject</label>
          <p>
            <strong>{subjectType}</strong>
            {" · "}
            <code>{subjectId}</code>
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="statement">{en ? "Claim statement" : "Afirmação da Claim"}</label>
          <textarea
            id="statement"
            name="statement"
            minLength={10}
            maxLength={4000}
            rows={6}
            required
            placeholder={
              en
                ? "What exactly are you claiming?"
                : "O que exatamente você está afirmando?"
            }
          />
        </div>

        <div className="form-field">
          <label htmlFor="scopeDescription">
            {en ? "Scope and limits" : "Escopo e limites"}
          </label>
          <textarea
            id="scopeDescription"
            name="scopeDescription"
            minLength={3}
            maxLength={2000}
            rows={4}
            required
            placeholder={
              en
                ? "Where does this Claim apply, and where does it not?"
                : "Onde esta Claim se aplica e onde não se aplica?"
            }
          />
        </div>

        <div className="form-actions">
          <button className="button button-primary" type="submit">
            {en ? "Record Claim" : "Registrar Claim"}
          </button>
          <Link className="button button-secondary" href={`/contributions/${contributionId}`}>
            {en ? "Cancel" : "Cancelar"}
          </Link>
        </div>
      </form>
    </main>
  );
}
