import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createCompanyCoreCycleAction } from "@/app/company-core/actions";
import { listPublicProjects } from "@/lib/data/projects";
import { getLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "en" ? "New Company Need" : "Nova Need da Empresa",
  };
}

export default async function NewCompanyCorePage() {
  const locale = await getLocale();
  const en = locale === "en";
  const client = await createSupabaseServerClient();

  if (!client) {
    redirect("/company-core?error=backend-unavailable");
  }

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    redirect("/login?next=/company-core/new");
  }

  const projects = await listPublicProjects();
  if (projects.length === 0) {
    redirect("/company-core?error=no-projects");
  }

  return (
    <main className="form-page section-shell">
      <div className="breadcrumb">
        <Link href="/company-core">{en ? "Company Core" : "Núcleo da Empresa"}</Link>
        <span aria-hidden="true">/</span>
        <span>{en ? "New Need" : "Nova Need"}</span>
      </div>

      <header className="form-header">
        <p className="kicker">NEED → AGREEMENT → WORK → RESULT → EVALUATION → CONSEQUENCE</p>
        <h1>{en ? "State a company need" : "Declare uma need da empresa"}</h1>
        <p>
          {en
            ? "A Need records a real lack or desired change. It does not yet define work, commitment or payment."
            : "Need registra uma falta real ou mudança desejada. Ainda não define trabalho, compromisso ou pagamento."}
        </p>
      </header>

      <form className="project-form" action={createCompanyCoreCycleAction}>
        <input type="hidden" name="commandId" value={randomUUID()} />
        <input type="hidden" name="idempotencyKey" value={`company-core-create-${randomUUID()}`} />

        <label>
          <span>{en ? "Project" : "Projeto"}</span>
          <select name="projectId" required>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <input type="hidden" name="projectSlug" value={projects[0]?.slug ?? ""} />
        </label>

        <label>
          <span>{en ? "Need title" : "Título da Need"}</span>
          <input name="needTitle" minLength={4} maxLength={160} required />
        </label>

        <label>
          <span>{en ? "What is the problem or need?" : "Qual é o problema ou need?"}</span>
          <textarea name="needProblem" rows={6} minLength={10} maxLength={4000} required />
        </label>

        <label>
          <span>{en ? "Desired result" : "Resultado desejado"}</span>
          <textarea name="needDesiredResult" rows={4} minLength={10} maxLength={2000} required />
        </label>

        <label>
          <span>{en ? "Context (optional)" : "Contexto (opcional)"}</span>
          <textarea name="needContext" rows={4} maxLength={2000} />
        </label>

        <label>
          <span>{en ? "Priority" : "Prioridade"}</span>
          <select name="needPriority">
            <option value="">{en ? "Select…" : "Selecione…"}</option>
            <option value="LOW">{en ? "Low" : "Baixa"}</option>
            <option value="MEDIUM">{en ? "Medium" : "Média"}</option>
            <option value="HIGH">{en ? "High" : "Alta"}</option>
            <option value="CRITICAL">{en ? "Critical" : "Crítica"}</option>
          </select>
        </label>

        <label>
          <span>{en ? "Constraints (optional)" : "Restrições (opcionais)"}</span>
          <textarea name="needConstraints" rows={3} maxLength={2000} />
        </label>

        <label>
          <span>{en ? "Confidentiality boundary (optional)" : "Limite de confidencialidade (opcional)"}</span>
          <textarea name="needConfidentiality" rows={3} maxLength={1000} />
        </label>

        <button className="button button-primary button-large" type="submit">
          {en ? "Create Need" : "Criar Need"}
        </button>
      </form>
    </main>
  );
}
