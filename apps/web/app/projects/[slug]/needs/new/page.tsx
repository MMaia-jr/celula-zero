import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createNeedAction } from "@/app/projects/[slug]/needs/new/actions";
import { getPublicProjectBySlug } from "@/lib/data/projects";
import { getLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface NewNeedPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: NewNeedPageProps): Promise<Metadata> {
  const locale = await getLocale();
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);
  return {
    title: project
      ? locale === "en" ? `Express Need · ${project.title}` : `Expressar Need · ${project.title}`
      : locale === "en" ? "Project not found" : "Projeto não encontrado",
  };
}

export default async function NewNeedPage({ params }: NewNeedPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);
  if (!project) notFound();

  const client = await createSupabaseServerClient();
  if (!client) redirect(`/projects/${project.slug}?need=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    redirect(`/login?next=${encodeURIComponent(`/projects/${project.slug}/needs/new`)}`);
  }

  const { data: controlledSteward } = await client
    .from("actors")
    .select("id")
    .eq("id", project.steward.id)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (!controlledSteward) redirect(`/projects/${project.slug}?need=steward-control-denied`);

  return (
    <main className="form-page section-shell">
      <div className="breadcrumb">
        <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        <span aria-hidden="true">/</span>
        <span>{en ? "Express Need" : "Expressar Need"}</span>
      </div>

      <header className="form-header">
        <p className="kicker">PROJECT → NEED</p>
        <h1>{en ? "State what is missing before defining an Opportunity." : "Declare o que está faltando antes de definir uma Opportunity."}</h1>
        <p>{en ? "A Need records a contextual lack, question or desired change. It does not yet define an offer, capacity or commitment." : "Need registra uma falta, questão ou mudança desejada em contexto. Ela ainda não define oferta, capacidade ou compromisso."}</p>
      </header>

      <section className="content-block">
        <p className="mini-label">SEMANTIC BOUNDARY</p>
        <strong>Need ≠ Opportunity</strong>
        <p>{en ? "Creation first records DRAFT / PROJECT. Public visibility is a separate authorized command." : "A criação registra primeiro DRAFT / PROJECT. Visibilidade pública é um comando autorizado separado."}</p>
      </section>

      <form className="project-form" action={createNeedAction}>
        <input type="hidden" name="projectSlug" value={project.slug} />
        <input type="hidden" name="createCommandId" value={randomUUID()} />
        <input type="hidden" name="createIdempotencyKey" value={`t1-need-create-${randomUUID()}`} />
        <input type="hidden" name="publishCommandId" value={randomUUID()} />
        <input type="hidden" name="publishIdempotencyKey" value={`t1-need-publish-${randomUUID()}`} />

        <label>
          <span>{en ? "Need title" : "Título da Need"}</span>
          <input name="title" minLength={4} maxLength={160} required />
        </label>
        <label>
          <span>{en ? "What is missing or needs to change?" : "O que está faltando ou precisa mudar?"}</span>
          <textarea name="statement" rows={6} minLength={10} maxLength={4000} required />
        </label>
        <label>
          <span>{en ? "Context (optional)" : "Contexto (opcional)"}</span>
          <textarea name="context" rows={4} maxLength={2000} />
        </label>

        <div className="publish-row">
          <label className="checkbox-label">
            <input name="publishNow" type="checkbox" defaultChecked />
            <span>
              <strong>{en ? "Publish now" : "Publicar agora"}</strong>
              <small>{en ? "After draft creation, run the separate publication command." : "Depois de criar o draft, execute o comando separado de publicação."}</small>
            </span>
          </label>
          <p>{en ? "Publishing a Need creates no Proposal, Commitment, role, reputation or payment." : "Publicar uma Need não cria Proposal, Commitment, papel, reputação ou pagamento."}</p>
        </div>

        <button className="button button-primary button-large" type="submit">
          {en ? "Create Need" : "Criar Need"}
        </button>
      </form>
    </main>
  );
}
