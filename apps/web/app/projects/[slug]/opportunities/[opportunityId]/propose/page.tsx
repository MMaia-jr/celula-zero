import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { submitPublicProposalAction } from "@/app/projects/[slug]/opportunities/[opportunityId]/propose/actions";
import { getPublicOpenOpportunity } from "@/lib/data/public-opportunities";
import { getPublicProjectBySlug } from "@/lib/data/projects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface PublicProposalPageProps {
  params: Promise<{ slug: string; opportunityId: string }>;
}

export default async function PublicProposalPage({ params }: PublicProposalPageProps) {
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
          <span>Fazer proposta</span>
        </div>
        <section className="content-block">
          <h1>Backend não configurado</h1>
          <p>Esta ação exige o ambiente Supabase da aplicação.</p>
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
          <h1>Identidade atribuível não encontrada</h1>
          <p>A sessão existe, mas nenhum Actor PERSON controlado por este Profile foi encontrado.</p>
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
        </div>
      </header>

      <section className="content-block">
        <p className="mini-label">Antes de enviar</p>
        <h2>Proposal não é Commitment.</h2>
        <p>
          Você está declarando o que pode entregar e sob quais condições.
          Só existe compromisso depois de aceite explícito do responsável pelo projeto.
        </p>
        <dl>
          <div><dt>Condições publicadas</dt><dd>{opportunity.conditions}</dd></div>
          <div><dt>Resultado esperado</dt><dd>{opportunity.expectedResult}</dd></div>
          <div><dt>Capacidade</dt><dd>{opportunity.capacity}</dd></div>
          <div><dt>Proponente</dt><dd>{actor.name}</dd></div>
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
            <span>O que você propõe fazer?</span>
            <textarea
              name="statement"
              rows={5}
              minLength={10}
              maxLength={4000}
              required
              placeholder="Descreva a entrega que você está oferecendo."
            />
          </label>

          <label>
            <span>Suas condições</span>
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
            <span>Entrega esperada</span>
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
            <span>Expectativa econômica</span>
            <input
              name="rewardExpectation"
              minLength={2}
              maxLength={1000}
              required
              defaultValue="A combinar / voluntário se aplicável."
            />
          </label>

          <button className="button button-primary" type="submit">
            Enviar Proposal
          </button>
        </form>
      </section>
    </main>
  );
}
