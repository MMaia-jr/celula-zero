import Link from "next/link";
import { redirect } from "next/navigation";
import { listCompanyCoreCycles } from "@/lib/data/company-core";
import { listPublicProjects } from "@/lib/data/projects";
import { getLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CompanyCoreListPage() {
  const locale = await getLocale();
  const en = locale === "en";
  const client = await createSupabaseServerClient();

  if (!client) {
    return (
      <main className="section-shell">
        <header className="project-hero">
          <p className="mini-label">COMPANY CORE v0.1</p>
          <h1>{en ? "Company Core" : "Núcleo da Empresa"}</h1>
          <p>{en ? "Backend unavailable." : "Backend indisponível."}</p>
        </header>
      </main>
    );
  }

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) {
    redirect("/login?next=/company-core");
  }

  const cycles = await listCompanyCoreCycles();
  const projects = await listPublicProjects();

  const stateLabel: Record<string, string> = {
    NEED_CREATED: en ? "Need created" : "Need criada",
    AGREEMENT_DEFINED: en ? "Agreement defined" : "Acordo definido",
    WORK_AUTHORIZED: en ? "Work authorized" : "Trabalho autorizado",
    AI_RUNNING: en ? "AI running" : "IA executando",
    AI_COMPLETED: en ? "AI completed" : "IA concluída",
    AI_FAILED: en ? "AI failed" : "IA falhou",
    RESULT_RECORDED: en ? "Result recorded" : "Resultado registrado",
    EVALUATION_RECORDED: en ? "Evaluation recorded" : "Avaliação registrada",
    CONSEQUENCE_RECORDED: en ? "Consequence recorded" : "Consequência registrada",
    CLOSED: en ? "Closed" : "Fechado",
  };

  return (
    <main className="section-shell">
      <div className="breadcrumb">
        <Link href="/">{en ? "Home" : "Início"}</Link>
        <span aria-hidden="true">/</span>
        <span>{en ? "Company Core" : "Núcleo da Empresa"}</span>
      </div>

      <header className="project-hero">
        <div className="project-hero-main">
          <p className="mini-label">COMPANY CORE v0.1 · CYCLE 011</p>
          <h1>{en ? "Operate the company" : "Operar a empresa"}</h1>
          <p>
            {en
              ? "Need → Agreement → Work → AI Contribution → Result → Evaluation → Economic Consequence"
              : "Need → Acordo → Trabalho → Contribuição de IA → Resultado → Avaliação → Consequência Econômica"}
          </p>
        </div>
      </header>

      <section className="content-block">
        <p className="mini-label">{en ? "New cycle" : "Novo ciclo"}</p>
        {projects.length > 0 ? (
          <Link className="button button-primary" href="/company-core/new">
            {en ? "Create company need" : "Criar need da empresa"}
          </Link>
        ) : (
          <p>{en ? "Create a project first." : "Crie um projeto primeiro."}</p>
        )}
      </section>

      <section className="content-block">
        <p className="mini-label">{en ? "Cycles" : "Ciclos"}</p>
        {cycles.length === 0 ? (
          <p>{en ? "No cycles yet." : "Nenhum ciclo ainda."}</p>
        ) : (
          <ul className="project-list">
            {cycles.map((cycle) => (
              <li key={cycle.id} className="project-card">
                <div className="project-label-row">
                  <span className="source-tag">{stateLabel[cycle.state] ?? cycle.state}</span>
                  <span>{cycle.projectTitle}</span>
                </div>
                <h3>
                  <Link href={`/company-core/${cycle.id}`}>{cycle.needTitle}</Link>
                </h3>
                <p>{cycle.needProblem.slice(0, 140)}…</p>
                <small>
                  {en ? "Created" : "Criado"}: {new Date(cycle.createdAt).toLocaleDateString(locale)}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
