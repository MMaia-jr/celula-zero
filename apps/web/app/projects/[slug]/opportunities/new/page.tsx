import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createPublicOpportunityAction } from "@/app/projects/[slug]/opportunities/new/actions";
import { getPublicNeed } from "@/lib/data/needs";
import { getPublicProjectBySlug } from "@/lib/data/projects";
import { getLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface NewOpportunityPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

export default async function NewOpportunityPage({
  params,
  searchParams,
}: NewOpportunityPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const needId = first(query.need) ?? null;
  const project = await getPublicProjectBySlug(slug);

  if (!project) notFound();

  const linkedNeed = needId ? await getPublicNeed(needId) : null;
  if (needId && (!linkedNeed || linkedNeed.projectId !== project.id)) {
    redirect(`/projects/${project.slug}?opportunity=need-link-invalid`);
  }

  const client = await createSupabaseServerClient();
  if (!client) redirect(`/projects/${project.slug}?opportunity=backend-unavailable`);

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    const suffix = linkedNeed ? `?need=${linkedNeed.id}` : "";
    redirect(
      `/login?next=${encodeURIComponent(`/projects/${project.slug}/opportunities/new${suffix}`)}`,
    );
  }

  const { data: controlledSteward } = await client
    .from("actors")
    .select("id")
    .eq("id", project.steward.id)
    .eq("kind", "PERSON")
    .eq("operator_profile_id", authData.user.id)
    .maybeSingle();

  if (!controlledSteward) {
    redirect(`/projects/${project.slug}?opportunity=steward-control-denied`);
  }

  return (
    <main className="form-page section-shell">
      <div className="breadcrumb">
        <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        <span aria-hidden="true">/</span>
        <span>{en ? "Open opportunity" : "Abrir oportunidade"}</span>
      </div>

      <header className="form-header">
        <p className="kicker">NEED → OPPORTUNITY</p>
        <h1>
          {en
            ? "Define actionable conditions without collapsing the Need into the Opportunity."
            : "Defina condições de ação sem colapsar a Need na Opportunity."}
        </h1>
        <p>
          {en
            ? "Creation records a DRAFT first. Publication remains a separate authorized command."
            : "A criação registra primeiro um DRAFT. A publicação continua sendo um comando autorizado separado."}
        </p>
      </header>

      {linkedNeed ? (
        <section className="content-block">
          <p className="mini-label">{en ? "Linked first-class Need" : "Need de primeira classe vinculada"}</p>
          <h2><Link href={`/needs/${linkedNeed.id}`}>{linkedNeed.title}</Link></h2>
          <p>{linkedNeed.statement}</p>
          <p className="block-note">Need ≠ Opportunity</p>
        </section>
      ) : (
        <section className="content-block">
          <p className="mini-label">{en ? "No first-class Need selected" : "Nenhuma Need de primeira classe selecionada"}</p>
          <p>
            {en
              ? "This Opportunity may still be created for backward compatibility. A first-class Need link is preferred when one exists."
              : "Esta Opportunity ainda pode ser criada por compatibilidade. Quando existir uma Need de primeira classe, o vínculo é preferível."}
          </p>
        </section>
      )}

      <form className="project-form" action={createPublicOpportunityAction}>
        <input type="hidden" name="projectSlug" value={project.slug} />
        <input type="hidden" name="needId" value={linkedNeed?.id ?? ""} />
        <input type="hidden" name="createCommandId" value={randomUUID()} />
        <input
          type="hidden"
          name="createIdempotencyKey"
          value={`public-opportunity-create-${randomUUID()}`}
        />
        <input type="hidden" name="publishCommandId" value={randomUUID()} />
        <input
          type="hidden"
          name="publishIdempotencyKey"
          value={`public-opportunity-publish-${randomUUID()}`}
        />

        <label>
          <span>{en ? "Title" : "Título"}</span>
          <input
            name="title"
            minLength={4}
            maxLength={160}
            required
            defaultValue={linkedNeed ? linkedNeed.title : undefined}
          />
        </label>

        <label>
          <span>{en ? "What can someone act on?" : "Sobre o que alguém pode agir?"}</span>
          <textarea
            name="statement"
            rows={6}
            minLength={10}
            maxLength={4000}
            required
            defaultValue={linkedNeed ? linkedNeed.statement : undefined}
          />
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
          <small>
            {en
              ? "Maximum accepted Commitments before capacity is filled."
              : "Número máximo de Commitments aceitos antes de a capacidade ser preenchida."}
          </small>
        </label>

        <div className="publish-row">
          <label className="checkbox-label">
            <input name="publishNow" type="checkbox" defaultChecked />
            <span>
              <strong>{en ? "Publish now" : "Publicar agora"}</strong>
              <small>
                {en
                  ? "The separate publish command runs only after draft creation succeeds."
                  : "O comando separado de publicação roda somente após a criação do draft."}
              </small>
            </span>
          </label>
          <p>
            {en
              ? "Opportunity publication creates no Proposal, Commitment, contributor role, reputation or payment."
              : "Publicar uma Opportunity não cria Proposal, Commitment, papel de contributor, reputação ou pagamento."}
          </p>
        </div>

        <button className="button button-primary button-large" type="submit">
          {en ? "Create opportunity" : "Criar opportunity"}
        </button>
      </form>
    </main>
  );
}
