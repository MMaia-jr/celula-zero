import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectForm } from "@/components/project-form";
import { getSupabasePublicEnvironment } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Plantar projeto" };

export default async function NewProjectPage() {
  const environment = getSupabasePublicEnvironment();

  if (!environment) {
    return (
      <div className="narrow-page section-shell">
        <div className="setup-panel">
          <span className="setup-icon" aria-hidden="true">⌁</span>
          <p className="kicker">Modo leitura local</p>
          <h1>Conecte o Supabase local para plantar um projeto.</h1>
          <p>
            O catálogo público usa seeds portáveis sem banco. A escrita só é habilitada quando
            autenticação, convite e RLS estão ativos — nunca por um atalho no navegador.
          </p>
          <ol>
            <li>Inicie o Supabase local conforme o runbook.</li>
            <li>Copie as chaves públicas para <code>.env.local</code>.</li>
            <li>Entre com o e-mail de piloto permitido.</li>
          </ol>
          <div className="hero-actions">
            <Link className="button button-primary" href="/about/gate-1">Abrir runbook</Link>
            <Link className="button button-secondary" href="/projects">Voltar aos projetos</Link>
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
        <p className="kicker">Registro controlado</p>
        <h1>Plante um projeto com intenção e limites explícitos.</h1>
        <p>O Registro Original será imutável. A publicação cria estado material e eventos na mesma transação.</p>
      </header>
      <ProjectForm />
    </div>
  );
}
