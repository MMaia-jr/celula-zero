import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getCommitmentDetail } from "@/lib/data/coordination";
import { getCommitmentWorkOverview } from "@/lib/data/work";
import { getLocale } from "@/lib/i18n/server";

interface CommitmentPageProps {
  params: Promise<{ commitmentId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: CommitmentPageProps): Promise<Metadata> {
  const locale = await getLocale();
  const { commitmentId } = await params;
  if (!z.string().uuid().safeParse(commitmentId).success) {
    return { title: locale === "en" ? "Commitment not found" : "Commitment não encontrado" };
  }

  const result = await getCommitmentDetail(commitmentId);
  return result.status === "READY"
    ? { title: `Commitment · ${result.commitment.projectTitle}` }
    : { title: locale === "en" ? "Commitment" : "Commitment" };
}

export default async function CommitmentPage({ params, searchParams }: CommitmentPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { commitmentId } = await params;
  if (!z.string().uuid().safeParse(commitmentId).success) notFound();

  const [result, workResult] = await Promise.all([
    getCommitmentDetail(commitmentId),
    getCommitmentWorkOverview(commitmentId),
  ]);

  if (result.status === "ANONYMOUS" || workResult.status === "ANONYMOUS") {
    redirect(`/login?next=${encodeURIComponent(`/commitments/${commitmentId}`)}`);
  }
  if (result.status === "UNAVAILABLE" || workResult.status === "UNAVAILABLE") {
    redirect("/projects?coordination=backend-unavailable");
  }
  if (result.status !== "READY" || workResult.status !== "READY") notFound();

  const { commitment } = result;
  const { work } = workResult;
  const query = searchParams ? await searchParams : {};
  const workStatus = first(query.work);

  return (
    <div className="section-shell">
      <div className="breadcrumb">
        <Link href={`/projects/${commitment.projectSlug}`}>{commitment.projectTitle}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/projects/${commitment.projectSlug}/opportunities/${commitment.opportunityId}`}>
          {commitment.opportunityTitle}
        </Link>
        <span aria-hidden="true">/</span>
        <span>Commitment</span>
      </div>

      {workStatus ? (
        <p className="form-message" role="status">{workStatus}</p>
      ) : null}

      <header className="project-hero">
        <div className="project-hero-main">
          <div className="project-label-row">
            <span className="stage-badge stage-open">COMMITMENT · ACCEPTED</span>
            <span className="source-tag">PROJECT</span>
          </div>
          <h1>{en ? "A bounded agreement between attributable Actors." : "Um acordo delimitado entre Actors atribuíveis."}</h1>
          <p>
            {commitment.proposerName} → {commitment.acceptedByName}
          </p>
          {work.isContributor ? (
            <div className="hero-actions">
              <Link className="button button-primary" href={`/commitments/${commitment.id}/contribute`}>
                {en ? "Deliver contribution" : "Entregar Contribution"}
              </Link>
            </div>
          ) : null}
        </div>
        <aside className="project-steward-card">
          <span className="mini-label">{en ? "Exact material" : "Material exato"}</span>
          <dl>
            <div><dt>Opportunity</dt><dd>v{commitment.opportunityVersion}</dd></div>
            <div><dt>Proposal</dt><dd>v{commitment.proposalVersion}</dd></div>
          </dl>
        </aside>
      </header>

      <section className="content-block">
        <p className="mini-label">OPPORTUNITY · v{commitment.opportunityVersion}</p>
        <h2>{commitment.opportunityTitle}</h2>
        <dl>
          <div><dt>{en ? "Conditions" : "Condições"}</dt><dd>{commitment.opportunityConditions}</dd></div>
          <div><dt>{en ? "Expected result" : "Resultado esperado"}</dt><dd>{commitment.opportunityExpectedResult}</dd></div>
        </dl>
      </section>

      <section className="content-block">
        <p className="mini-label">PROPOSAL · v{commitment.proposalVersion}</p>
        <p>{commitment.proposalStatement}</p>
        <dl>
          <div><dt>{en ? "Conditions" : "Condições"}</dt><dd>{commitment.proposalConditions}</dd></div>
          <div><dt>{en ? "Expected delivery" : "Entrega esperada"}</dt><dd>{commitment.proposalExpectedDelivery}</dd></div>
          <div><dt>{en ? "Reward expectation" : "Expectativa de contrapartida"}</dt><dd>{commitment.proposalRewardExpectation}</dd></div>
        </dl>
      </section>

      <section className="content-block">
        <p className="mini-label">CONTRIBUTIONS</p>
        <h2>{en ? "Work recorded after agreement" : "Trabalho registrado depois do acordo"}</h2>
        {work.contributions.length ? (
          work.contributions.map((contribution) => (
            <article className="side-block" key={contribution.id}>
              <strong>CONTRIBUTION · SUBMITTED</strong>
              <p>{contribution.description}</p>
              <p><strong>{en ? "Limitations" : "Limitações"}:</strong> {contribution.limitations}</p>
              <Link className="button button-secondary" href={`/contributions/${contribution.id}`}>
                {en ? "Open Contribution" : "Abrir Contribution"}
              </Link>
            </article>
          ))
        ) : (
          <p>
            {en
              ? "No Contribution has been recorded yet. Acceptance alone does not mean work happened."
              : "Nenhuma Contribution foi registrada ainda. Aceitação, sozinha, não significa que o trabalho aconteceu."}
          </p>
        )}
      </section>

      <section className="content-block">
        <p className="mini-label">RECONSTRUCTIBLE HISTORY</p>
        <h2>{en ? "From agreement to consequence" : "Do acordo à consequência"}</h2>
        <div className="hero-actions">
          <Link className="button button-primary" href={`/commitments/${commitment.id}/history`}>
            {en ? "Coordination history" : "Histórico de coordenação"}
          </Link>
          <Link className="button button-secondary" href={`/api/commitments/${commitment.id}/prov`}>
            {en ? "Export PROV provenance" : "Exportar proveniência PROV"}
          </Link>
        </div>
      </section>

      <section className="funding-warning">
        <strong>Commitment ≠ Contribution ≠ Artifact ≠ Evidence ≠ Verification ≠ Decision ≠ Outcome</strong>
        <p>
          {en
            ? "This record shows what was accepted, by whom, and at which exact versions. Work and observable outputs must be recorded separately."
            : "Este registro mostra o que foi aceito, por quem e em quais versões exatas. Trabalho e saídas observáveis precisam ser registrados separadamente."}
        </p>
      </section>
    </div>
  );
}
