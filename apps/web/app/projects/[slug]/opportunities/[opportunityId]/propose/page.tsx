import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { submitPublicProposalAction } from "@/app/projects/[slug]/opportunities/[opportunityId]/propose/actions";
import { getPublicOpenOpportunity } from "@/lib/data/public-opportunities";
import { getPublicProjectBySlug } from "@/lib/data/projects";
import { getLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface PublicProposalPageProps {
  params: Promise<{ slug: string; opportunityId: string }>;
}

export default async function PublicProposalPage({ params }: PublicProposalPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { slug, opportunityId } = await params;
  if (!z.string().uuid().safeParse(opportunityId).success) notFound();

  const project = await getPublicProjectBySlug(slug);
  if (!project) notFound();

  const opportunity = await getPublicOpenOpportunity(project.id, opportunityId);
  if (!opportunity) notFound();

  const client = await createSupabaseServerClient();
  if (!client) {
    return (
      <main className="section-shell">
        <div className="breadcrumb">
          <Link href={`/projects/${project.slug}`}>{project.title}</Link>
          <span aria-hidden="true">/</span>
          <span>{en ? "Make proposal" : "Fazer proposta"}</span>
        </div>
        <section className="content-block">
          <h1>{en ? "Backend not configured" : "Backend não configurado"}</h1>
          <p>
            {en
              ? "This action requires the application's Supabase environment."
              : "Esta ação exige o ambiente Supabase da aplicação."}
          </p>
        </section>
      </main>
    );
  }

  const { data: authData } = await client.auth.getUser();
  const next = `/projects/${project.slug}/opportunities/${opportunity.id}/propose`;
  if (!authData.user) redirect(`/login?next=${encodeURIComponent(next)}`);

  const { data: actor, error: actorError } = await client
    .from("actors")
    .select("id, name")
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (actorError || !actor) {
    return (
      <main className="section-shell">
        <section className="content-block">
          <h1>
            {en ? "Attributable identity not found" : "Identidade atribuível não encontrada"}
          </h1>
          <p>
            {en
              ? "The session exists, but no PERSON Actor controlled by this Profile was found."
              : "A sessão existe, mas nenhum Actor PERSON controlado por este Profile foi encontrado."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="section-shell">
      <div className="breadcrumb">
        <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        <span aria-hidden="true">/</span>
        <span>{opportunity.title}</span>
      </div>

      <header className="project-hero">
        <div className="project-hero-main">
          <p className="mini-label">PUBLIC OPPORTUNITY → PROPOSAL</p>
          <h1>{opportunity.title}</h1>
          <p>{opportunity.statement}</p>
          {en ? (
            <p className="block-note">
              Opportunity content is shown as authored. Interface labels are translated separately.
            </p>
          ) : null}
        </div>
      </header>

      <section className="content-block">
        <p className="mini-label">{en ? "Before sending" : "Antes de enviar"}</p>
        <h2>{en ? "Proposal is not Commitment." : "Proposal não é Commitment."}</h2>
        <p>
          {en
            ? "You are declaring what you can deliver and under which conditions. A commitment exists only after explicit acceptance by the project steward."
            : "Você está declarando o que pode entregar e sob quais condições. Só existe compromisso depois de aceite explícito do responsável pelo projeto."}
        </p>
        <dl>
          <div><dt>{en ? "Published conditions" : "Condições publicadas"}</dt><dd>{opportunity.conditions}</dd></div>
          <div><dt>{en ? "Expected result" : "Resultado esperado"}</dt><dd>{opportunity.expectedResult}</dd></div>
          <div><dt>{en ? "Capacity" : "Capacidade"}</dt><dd>{opportunity.capacity}</dd></div>
          <div><dt>{en ? "Proposer" : "Proponente"}</dt><dd>{actor.name}</dd></div>
        </dl>
      </section>

      <section className="content-block">
        <form className="project-form" action={submitPublicProposalAction}>
          <input type="hidden" name="projectSlug" value={project.slug} />
          <input type="hidden" name="actorId" value={actor.id} />
          <input type="hidden" name="opportunityId" value={opportunity.id} />
          <input type="hidden" name="commandId" value={randomUUID()} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={`public-proposal-${randomUUID()}`}
          />

          <label>
            <span>{en ? "What do you propose to do?" : "O que você propõe fazer?"}</span>
            <textarea
              name="statement"
              rows={5}
              minLength={10}
              maxLength={4000}
              required
              placeholder={
                en
                  ? "Describe the delivery you are offering."
                  : "Descreva a entrega que você está oferecendo."
              }
            />
          </label>

          <label>
            <span>{en ? "Your conditions" : "Suas condições"}</span>
            <textarea
              name="conditions"
              rows={4}
              minLength={3}
              maxLength={4000}
              required
              defaultValue={opportunity.conditions}
            />
          </label>

          <label>
            <span>{en ? "Expected delivery" : "Entrega esperada"}</span>
            <textarea
              name="expectedDelivery"
              rows={4}
              minLength={3}
              maxLength={2000}
              required
              defaultValue={opportunity.expectedResult}
            />
          </label>

          <label>
            <span>{en ? "Economic expectation" : "Expectativa econômica"}</span>
            <input
              name="rewardExpectation"
              minLength={2}
              maxLength={1000}
              required
              defaultValue={
                en
                  ? "To be agreed / voluntary if applicable."
                  : "A combinar / voluntário se aplicável."
              }
            />
          </label>

          <button className="button button-primary" type="submit">
            {en ? "Send Proposal" : "Enviar Proposal"}
          </button>
        </form>
      </section>
    </main>
  );
}
