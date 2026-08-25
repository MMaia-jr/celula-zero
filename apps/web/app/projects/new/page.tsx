import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectForm } from "@/components/project-form";
import { getLocale } from "@/lib/i18n/server";
import { getSupabasePublicEnvironment } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "Create project" : "Criar projeto" };
}

export default async function NewProjectPage() {
  const locale = await getLocale();
  const en = locale === "en";
  const environment = getSupabasePublicEnvironment();

  if (!environment) {
    return (
      <div className="narrow-page section-shell">
        <div className="setup-panel">
          <span className="setup-icon" aria-hidden="true">⌁</span>
          <p className="kicker">{en ? "Backend unavailable" : "Backend indisponível"}</p>
          <h1>
            {en
              ? "Project creation requires the configured Supabase environment."
              : "A criação de projeto exige o ambiente Supabase configurado."}
          </h1>
          <p>
            {en
              ? "Public reading can remain available, but attributable writes are never enabled by a browser-only shortcut."
              : "A leitura pública pode continuar disponível, mas escrita atribuível nunca é habilitada por um atalho apenas no navegador."}
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/about/gate-1">
              {en ? "How it works" : "Como funciona"}
            </Link>
            <Link className="button button-secondary" href="/projects">
              {en ? "Back to projects" : "Voltar aos projetos"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const client = await createSupabaseServerClient();
  const { data } = await client!.auth.getUser();
  if (!data.user) redirect("/login?next=/projects/new");

  return (
    <div className="form-page section-shell">
      <header className="form-header">
        <p className="kicker">{en ? "Controlled record" : "Registro controlado"}</p>
        <h1>
          {en
            ? "Create a project with explicit intent and limits."
            : "Crie um projeto com intenção e limites explícitos."}
        </h1>
        <p>
          {en
            ? "The Original Record is preserved. Publication creates material state and events in the same transaction."
            : "O Registro Original é preservado. A publicação cria estado material e eventos na mesma transação."}
        </p>
      </header>
      <ProjectForm locale={locale} />
    </div>
  );
}
