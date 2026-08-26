import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { recordOutcomeAction } from "@/app/decisions/[decisionId]/actions";
import { getDomainDecisionDetail } from "@/lib/data/decisions";
import { getLocale } from "@/lib/i18n/server";

interface PageProps {
  params: Promise<{ decisionId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "Decision" : "Decision" };
}

export default async function DecisionPage({ params, searchParams }: PageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { decisionId } = await params;
  if (!z.string().uuid().safeParse(decisionId).success) notFound();

  const result = await getDomainDecisionDetail(decisionId);
  if (result.status === "ANONYMOUS") {
    redirect(`/login?next=${encodeURIComponent(`/decisions/${decisionId}`)}`);
  }
  if (result.status === "UNAVAILABLE") redirect("/projects?decision=backend-unavailable");
  if (result.status !== "READY") notFound();

  const query = searchParams ? await searchParams : {};
  const status = first(query.decision) ?? first(query.outcome);
  const { decision } = result;

  return (
    <div className="section-shell">
      <div className="breadcrumb">
        <Link href={`/claims/${decision.claimId}`}>Claim</Link>
        <span aria-hidden="true">/</span>
        <span>Decision</span>
      </div>

      {status ? <p className="form-message" role="status">{status}</p> : null}

      <header className="project-hero">
        <div className="project-hero-main">
          <div className="project-label-row">
            <span className="stage-badge stage-open">
              DECISION · {decision.disposition}
            </span>
            <span className="source-tag">CONTEXTUAL</span>
          </div>
          <h1>
            {en
              ? "A substantive Decision for an explicit context."
              : "Uma Decision substantiva para um contexto explícito."}
          </h1>
          <p>{decision.reason}</p>
          {decision.commitmentId ? (
            <div className="hero-actions">
              <Link
                className="button button-secondary"
                href={`/commitments/${decision.commitmentId}/history`}
              >
                {en ? "Coordination History" : "Histórico de coordenação"}
              </Link>
            </div>
          ) : null}
        </div>
        <aside className="project-steward-card">
          <span className="mini-label">AUTHORITY BASIS</span>
          <strong>{decision.authorityBasis}</strong>
        </aside>
      </header>

      <section className="content-block">
        <p className="mini-label">VERIFICATIONS CONSIDERED</p>
        {decision.verifications.length ? (
          decision.verifications.map((verification) => (
            <article className="side-block" key={verification.id}>
              <strong>
                {verification.classification} · {verification.independence}
              </strong>
              <p>{verification.findings}</p>
              <p><strong>{en ? "Limitations:" : "Limitações:"}</strong> {verification.limitations}</p>
              <Link href={`/verifications/${verification.requestId}`}>
                {en ? "Open Verification" : "Abrir Verification"}
              </Link>
            </article>
          ))
        ) : (
          <p>{en ? "No Verification referenced." : "Nenhuma Verification referenciada."}</p>
        )}
      </section>

      <section className="content-block">
        <p className="mini-label">DECISION LIMITATIONS</p>
        <p>{decision.limitations}</p>
      </section>

      <section className="content-block">
        <p className="mini-label">OUTCOMES</p>
        <h2>{en ? "Observed consequence or explicit uncertainty" : "Consequência observada ou incerteza explícita"}</h2>

        {decision.outcomes.map((outcome) => (
          <article className="side-block" key={outcome.id}>
            <strong>OUTCOME · {outcome.classification}</strong>
            <p>{outcome.statement}</p>
            <p><strong>{en ? "Limitations:" : "Limitações:"}</strong> {outcome.limitations}</p>
            {outcome.observedAt ? <p>{new Date(outcome.observedAt).toLocaleString()}</p> : null}
          </article>
        ))}

        {decision.canRecordOutcome && decision.outcomes.length === 0 ? (
          <form className="project-form" action={recordOutcomeAction}>
            <input type="hidden" name="decisionId" value={decision.id} />
            <input type="hidden" name="actorId" value={decision.decidingActorId} />
            <input type="hidden" name="commandId" value={randomUUID()} />
            <input
              type="hidden"
              name="idempotencyKey"
              value={`outcome-record-${randomUUID()}`}
            />

            <div className="form-field">
              <label htmlFor="classification">{en ? "Outcome classification" : "Classificação do Outcome"}</label>
              <select id="classification" name="classification" defaultValue="INCONCLUSIVE" required>
                <option value="OBSERVED">OBSERVED</option>
                <option value="INCONCLUSIVE">INCONCLUSIVE</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="statement">{en ? "Outcome statement" : "Registro do Outcome"}</label>
              <textarea id="statement" name="statement" minLength={10} maxLength={4000} rows={5} required />
            </div>

            <div className="form-field">
              <label htmlFor="observedAt">{en ? "Observed at (OBSERVED only)" : "Observado em (somente OBSERVED)"}</label>
              <input id="observedAt" name="observedAt" type="datetime-local" />
            </div>

            <div className="form-field">
              <label htmlFor="limitations">{en ? "Limitations" : "Limitações"}</label>
              <textarea id="limitations" name="limitations" minLength={2} maxLength={2000} rows={4} required />
            </div>

            <button className="button button-primary" type="submit">
              {en ? "Record Outcome" : "Registrar Outcome"}
            </button>
          </form>
        ) : null}
      </section>

      <section className="funding-warning">
        <strong>Verification ≠ Decision ≠ Outcome</strong>
        <p>
          {en
            ? "ACCEPT_FOR_CONTEXT does not mean universal truth. OBSERVED would still be an attributed observation, not self-verifying proof."
            : "ACCEPT_FOR_CONTEXT não significa verdade universal. OBSERVED ainda seria uma observação atribuída, não uma prova auto-verificadora."}
        </p>
      </section>
    </div>
  );
}
