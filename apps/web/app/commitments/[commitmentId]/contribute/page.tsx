import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { submitContributionAction } from "@/app/commitments/[commitmentId]/contribute/actions";
import { getCommitmentDetail } from "@/lib/data/coordination";
import { getCommitmentWorkOverview } from "@/lib/data/work";
import { getLocale } from "@/lib/i18n/server";

interface ContributePageProps {
  params: Promise<{ commitmentId: string }>;
}

export async function generateMetadata({ params }: ContributePageProps): Promise<Metadata> {
  const locale = await getLocale();
  const { commitmentId } = await params;
  if (!z.string().uuid().safeParse(commitmentId).success) {
    return { title: locale === "en" ? "Contribution" : "Contribution" };
  }

  const result = await getCommitmentDetail(commitmentId);
  return result.status === "READY"
    ? {
        title:
          locale === "en"
            ? `Deliver contribution · ${result.commitment.projectTitle}`
            : `Entregar Contribution · ${result.commitment.projectTitle}`,
      }
    : { title: "Contribution" };
}

export default async function ContributePage({ params }: ContributePageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { commitmentId } = await params;
  if (!z.string().uuid().safeParse(commitmentId).success) notFound();

  const [commitmentResult, workResult] = await Promise.all([
    getCommitmentDetail(commitmentId),
    getCommitmentWorkOverview(commitmentId),
  ]);

  if (commitmentResult.status === "ANONYMOUS" || workResult.status === "ANONYMOUS") {
    redirect(`/login?next=${encodeURIComponent(`/commitments/${commitmentId}/contribute`)}`);
  }
  if (commitmentResult.status === "UNAVAILABLE" || workResult.status === "UNAVAILABLE") {
    redirect(`/commitments/${commitmentId}?work=backend-unavailable`);
  }
  if (commitmentResult.status !== "READY" || workResult.status !== "READY") notFound();
  if (!workResult.work.isContributor) {
    redirect(`/commitments/${commitmentId}?work=contributor-required`);
  }

  const { commitment } = commitmentResult;

  return (
    <main className="form-page section-shell">
      <div className="breadcrumb">
        <Link href={`/projects/${commitment.projectSlug}`}>{commitment.projectTitle}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/commitments/${commitment.id}`}>Commitment</Link>
        <span aria-hidden="true">/</span>
        <span>Contribution</span>
      </div>

      <header className="form-header">
        <p className="kicker">COMMITMENT → CONTRIBUTION</p>
        <h1>
          {en
            ? "Record the work that actually happened under this agreement."
            : "Registre o trabalho que realmente aconteceu sob este acordo."}
        </h1>
        <p>
          {en
            ? "Describe performed work and its limits. This record does not claim that the result is correct."
            : "Descreva o trabalho realizado e seus limites. Este registro não afirma que o resultado está correto."}
        </p>
      </header>

      <section className="content-block">
        <p className="mini-label">EXACT COMMITMENT</p>
        <strong>{commitment.opportunityTitle}</strong>
        <p>
          Opportunity v{commitment.opportunityVersion} · Proposal v{commitment.proposalVersion}
        </p>
        <p>{commitment.proposalExpectedDelivery}</p>
      </section>

      <section className="content-block">
        <p className="mini-label">SEMANTIC BOUNDARY</p>
        <strong>Commitment ≠ Contribution ≠ Artifact ≠ Evidence</strong>
        <p>
          {en
            ? "Submitting this form means work is being recorded as performed. Artifacts and Evidence remain separate explicit steps."
            : "Enviar este formulário significa registrar trabalho como realizado. Artifacts e Evidence continuam sendo etapas explícitas e separadas."}
        </p>
      </section>

      <form className="project-form" action={submitContributionAction}>
        <input type="hidden" name="commitmentId" value={commitment.id} />
        <input type="hidden" name="actorId" value={commitment.proposerActorId} />
        <input type="hidden" name="commandId" value={randomUUID()} />
        <input
          type="hidden"
          name="idempotencyKey"
          value={`t2-contribution-submit-${randomUUID()}`}
        />

        <label>
          <span>{en ? "What work was performed?" : "Que trabalho foi realizado?"}</span>
          <textarea name="description" rows={7} minLength={10} maxLength={4000} required />
        </label>

        <label>
          <span>{en ? "Limitations / what this does not establish" : "Limitações / o que isto não estabelece"}</span>
          <textarea name="limitations" rows={5} minLength={2} maxLength={2000} required />
        </label>

        <label>
          <span>{en ? "Who can read this Contribution?" : "Quem pode ler esta Contribution?"}</span>
          <select name="visibility" defaultValue="" required>
            <option value="" disabled>
              {en ? "Choose explicitly" : "Escolha explicitamente"}
            </option>
            <option value="PRIVATE">
              {en ? "PRIVATE — only you" : "PRIVATE — somente você"}
            </option>
            <option value="PARTIES">
              {en
                ? "PARTIES — you and the exact Commitment counterparty"
                : "PARTIES — você e a contraparte exata do Commitment"}
            </option>
            <option value="PROJECT">
              {en
                ? "PROJECT — you, the exact Commitment counterparty and the legitimate Project steward"
                : "PROJECT — você, a contraparte exata do Commitment e o steward legítimo do Project"}
            </option>
          </select>
          <small>
            {en
              ? "Artifacts created from this Contribution inherit this visibility. Future audience widening requires explicit disclosure/publication."
              : "Artifacts criados a partir desta Contribution herdam esta visibilidade. Ampliação futura exige disclosure/publication explícito."}
          </small>
        </label>

        <button className="button button-primary button-large" type="submit">
          {en ? "Record Contribution" : "Registrar Contribution"}
        </button>
      </form>
    </main>
  );
}
