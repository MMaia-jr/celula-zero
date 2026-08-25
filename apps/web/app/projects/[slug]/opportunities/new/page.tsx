import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createPublicOpportunityAction } from "@/app/projects/[slug]/opportunities/new/actions";
import { getPublicProjectBySlug } from "@/lib/data/projects";
import { getLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface NewOpportunityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: NewOpportunityPageProps): Promise<Metadata> {
  const locale = await getLocale();
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);

  return {
    title: project
      ? locale === "en"
        ? `Open opportunity · ${project.title}`
        : `Abrir oportunidade · ${project.title}`
      : locale === "en"
        ? "Project not found"
        : "Projeto não encontrado",
  };
}

export default async function NewOpportunityPage({ params }: NewOpportunityPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);

  if (!project) notFound();

  const client = await createSupabaseServerClient();
  if (!client) redirect(`/projects/${project.slug}?opportunity=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    redirect(`/login?next=${encodeURIComponent(`/projects/${project.slug}/opportunities/new`)}`);
  }

  const { data: controlledSteward } = await client
    .from("actors")
    .select("id")
    .eq("id", project.steward.id)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (!controlledSteward) redirect(`/projects/${project.slug}?opportunity=steward-control-denied`);

  return (
    <main className="form-page section-shell">
      <div className="breadcrumb">
        <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        <span aria-hidden="true">/</span>
        <span>{en ? "Open opportunity" : "Abrir oportunidade"}</span>
      </div>

      <header className="form-header">
        <p className="kicker">PROJECT_STEWARD → OPPORTUNITY</p>
        <h1>{en ? "Turn a real project need into an explicit opportunity." : "Transforme uma necessidade real do projeto em uma oportunidade explícita."}</h1>
        <p>{en ? "Creation first records a DRAFT / PROJECT opportunity. Publication is a separate authorized command that changes it to OPEN / PUBLIC." : "A criação registra primeiro uma oportunidade DRAFT / PROJECT. A publicação é um comando autorizado separado que a transforma em OPEN / PUBLIC."}</p>
      </header>

      <section className="content-block">
        <p className="mini-label">{en ? "Language of authored content" : "Idioma do conteúdo autorado"}</p>
        <p>{en ? "The interface is bilingual, but the content you write below is preserved as authored. If this opportunity should be immediately understandable in both languages, write a concise PT + EN source text." : "A interface é bilíngue, mas o conteúdo escrito abaixo é preservado como autorado. Se esta oportunidade precisar ser compreendida imediatamente nos dois idiomas, escreva um texto-fonte conciso em PT + EN."}</p>
      </section>

      <form className="project-form" action={createPublicOpportunityAction}>
        <input type="hidden" name="projectSlug" value={project.slug} />
        <input type="hidden" name="createCommandId" value={randomUUID()} />
        <input type="hidden" name="createIdempotencyKey" value={`public-opportunity-create-${randomUUID()}`} />
        <input type="hidden" name="publishCommandId" value={randomUUID()} />
        <input type="hidden" name="publishIdempotencyKey" value={`public-opportunity-publish-${randomUUID()}`} />

        <label>
          <span>{en ? "Title" : "Título"}</span>
          <input name="title" minLength={4} maxLength={160} required placeholder={en ? "Help make Célula Zero understandable to a newcomer" : "Ajude a tornar a Célula Zero compreensível para alguém novo"} />
        </label>

        <label>
          <span>{en ? "What needs to happen?" : "O que precisa acontecer?"}</span>
          <textarea name="statement" rows={6} minLength={10} maxLength={4000} required />
        </label>

        <label>
          <span>{en ? "Conditions" : "Condições"}</span>
          <textarea name="conditions" rows={4} minLength={3} maxLength={4000} required />
        </label>

        <label>
          <span>{en ? "Expected result" : "Resultado esperado"}</span>
          <textarea name="expectedResult" rows={4} minLength={3} maxLength={2000} required />
        </label>

        <label>
          <span>{en ? "Capacity" : "Capacidade"}</span>
          <input name="capacity" type="number" min={1} max={1000} defaultValue={1} required />
          <small>{en ? "Maximum number of accepted Commitments before capacity is filled." : "Número máximo de Commitments aceitos antes de a capacidade ser preenchida."}</small>
        </label>

        <div className="publish-row">
          <label className="checkbox-label">
            <input name="publishNow" type="checkbox" defaultChecked />
            <span>
              <strong>{en ? "Publish now" : "Publicar agora"}</strong>
              <small>{en ? "After the draft is created, run the separate publication command." : "Depois de criar o draft, execute o comando separado de publicação."}</small>
            </span>
          </label>
          <p>{en ? "Opening an opportunity does not create a Commitment, contributor role, reputation or payment." : "Abrir uma oportunidade não cria Commitment, papel de contributor, reputação ou pagamento."}</p>
        </div>

        <button className="button button-primary button-large" type="submit">{en ? "Create opportunity" : "Criar oportunidade"}</button>
      </form>
    </main>
  );
}
