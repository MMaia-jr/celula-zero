import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { attachTextArtifactAction } from "@/app/contributions/[contributionId]/artifacts/new/actions";
import { getContributionDetail } from "@/lib/data/work";
import { getLocale } from "@/lib/i18n/server";

interface NewArtifactPageProps {
  params: Promise<{ contributionId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "en" ? "Add Artifact" : "Adicionar Artifact",
  };
}

export default async function NewArtifactPage({ params }: NewArtifactPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { contributionId } = await params;
  if (!z.string().uuid().safeParse(contributionId).success) notFound();

  const result = await getContributionDetail(contributionId);
  if (result.status === "ANONYMOUS") {
    redirect(`/login?next=${encodeURIComponent(`/contributions/${contributionId}/artifacts/new`)}`);
  }
  if (result.status === "UNAVAILABLE") {
    redirect(`/contributions/${contributionId}?artifact=backend-unavailable`);
  }
  if (result.status !== "READY") notFound();
  if (!result.contribution.isAuthor) {
    redirect(`/contributions/${contributionId}?artifact=author-required`);
  }

  const { contribution } = result;

  return (
    <main className="form-page section-shell">
      <div className="breadcrumb">
        <Link href={`/contributions/${contribution.id}`}>Contribution</Link>
        <span aria-hidden="true">/</span>
        <span>{en ? "Add Artifact" : "Adicionar Artifact"}</span>
      </div>

      <header className="form-header">
        <p className="kicker">CONTRIBUTION → ARTIFACT</p>
        <h1>
          {en
            ? "Attach an exact observable output without computing infrastructure metadata yourself."
            : "Anexe uma saída observável exata sem calcular metadados de infraestrutura por conta própria."}
        </h1>
        <p>
          {en
            ? "For this Alpha, a bounded text Artifact is stored immutably and SHA-256 is computed by the server."
            : "Nesta Alpha, um Artifact textual delimitado é armazenado de forma imutável e o SHA-256 é calculado pelo servidor."}
        </p>
      </header>

      <section className="content-block">
        <p className="mini-label">SEMANTIC BOUNDARY</p>
        <strong>Artifact ≠ Evidence</strong>
        <p>
          {en
            ? "The digest binds this exact content. It does not make the content true and does not register it as Evidence."
            : "O digest vincula este conteúdo exato. Ele não torna o conteúdo verdadeiro e não o registra como Evidence."}
        </p>
      </section>

      <form className="project-form" action={attachTextArtifactAction}>
        <input type="hidden" name="contributionId" value={contribution.id} />
        <input type="hidden" name="actorId" value={contribution.authorActorId} />
        <input type="hidden" name="commandId" value={randomUUID()} />
        <input
          type="hidden"
          name="idempotencyKey"
          value={`t2-text-artifact-${randomUUID()}`}
        />

        <label>
          <span>{en ? "Exact Artifact text" : "Texto exato do Artifact"}</span>
          <textarea name="content" rows={14} minLength={1} maxLength={20000} required />
          <small>
            {en
              ? "Maximum 20,000 characters / 64 KiB. Content is immutable after creation."
              : "Máximo de 20.000 caracteres / 64 KiB. O conteúdo é imutável após a criação."}
          </small>
        </label>

        <button className="button button-primary button-large" type="submit">
          {en ? "Create text Artifact" : "Criar Artifact textual"}
        </button>
      </form>
    </main>
  );
}
