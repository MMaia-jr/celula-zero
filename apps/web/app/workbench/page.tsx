import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createOpportunityAction } from "@/app/workbench/actions";
import { getWorkbenchData, type WorkbenchOpportunityState } from "@/lib/data/workbench";

interface WorkbenchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const stateLabel: Record<WorkbenchOpportunityState, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberta",
  CLOSED: "Fechada",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WorkbenchPage({ searchParams }: WorkbenchPageProps) {
  const data = await getWorkbenchData();
  if (data.status === "ANONYMOUS") redirect("/login");

  const params = await searchParams;
  const error = first(params.error);
  const partial = first(params.partial);
  const created = first(params.created);
  const state = first(params.state);

  return (
    <main className="section-shell">
      <div className="breadcrumb">
        <Link href="/">Início</Link><span aria-hidden="true">/</span><span>Operar</span>
      </div>

      <header className="project-hero">
        <div className="project-hero-main">
          <p className="mini-label">H1 · workbench interno</p>
          <h1>Operar a Célula Zero</h1>
          <p>
            Trabalho real do piloto: projetos sob sua responsabilidade, oportunidades persistidas e
            autoridade contextual executada pelo backend B1.
          </p>
        </div>
      </header>

      {data.status === "UNAVAILABLE" ? (
        <section className="content-block">
          <h2>Backend local indisponível</h2>
          <p>Configure a stack Supabase antes de tentar operar o workbench.</p>
        </section>
      ) : null}

      {error ? (
        <p className="form-message form-error" role="alert">
          A oportunidade não foi criada ({error}). Nenhum sucesso foi presumido.
        </p>
      ) : null}

      {partial ? (
        <p className="form-message" role="status">
          O rascunho {partial} foi criado, mas a publicação falhou. O estado parcial foi preservado.
        </p>
      ) : null}

      {created ? (
        <p className="form-message" role="status">
          Oportunidade persistida: {created} · estado {state ?? "desconhecido"}.
        </p>
      ) : null}

      {data.status === "READY" && data.projects.length === 0 ? (
        <section className="content-block">
          <p className="mini-label">Nenhum projeto operável ainda</p>
          <h2>Crie o projeto real que vamos usar para construir a própria Célula Zero.</h2>
          <p>
            O seed público continua sendo referência. O projeto PILOT criado por você preserva autoria,
            intenção e stewardship reais.
          </p>
          <Link className="button button-primary" href="/projects/new">Criar projeto operacional</Link>
        </section>
      ) : null}

      {data.status === "READY" ? data.projects.map((project) => (
        <section className="content-block" key={project.id}>
          <div className="project-label-row">
            <span className="source-tag">{project.sourceLabel}</span>
            <span>{project.stage}</span>
          </div>
          <h2>{project.title}</h2>
          <p>
            <Link href={`/projects/${project.slug}`}>Ver página do projeto</Link>
          </p>

          <div className="divider" />
          <p className="mini-label">Oportunidades</p>

          {project.opportunities.length ? project.opportunities.map((opportunity) => (
            <article className="side-block" key={opportunity.id}>
              <div className="project-label-row">
                <strong>{stateLabel[opportunity.state]}</strong>
                <span>{opportunity.visibility}</span>
              </div>
              <h3>{opportunity.title}</h3>
              <p>{opportunity.statement}</p>
              <dl>
                <div><dt>Condições</dt><dd>{opportunity.conditions}</dd></div>
                <div><dt>Resultado esperado</dt><dd>{opportunity.expectedResult}</dd></div>
                <div><dt>Capacidade</dt><dd>{opportunity.capacity}</dd></div>
              </dl>
            </article>
          )) : (
            <p>Nenhuma oportunidade registrada neste projeto.</p>
          )}

          <details className="side-block">
            <summary><strong>Nova oportunidade</strong></summary>
            <form className="project-form" action={createOpportunityAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="projectSlug" value={project.slug} />
              <input type="hidden" name="commandId" value={randomUUID()} />
              <input type="hidden" name="idempotencyKey" value={`h1-opportunity-${randomUUID()}`} />

              <label>
                <span>Título da oportunidade</span>
                <input name="title" minLength={4} maxLength={160} required />
              </label>
              <label>
                <span>Problema ou necessidade</span>
                <textarea name="statement" rows={4} minLength={10} maxLength={4000} required />
              </label>
              <label>
                <span>Condições</span>
                <textarea name="conditions" rows={4} minLength={3} maxLength={4000} required />
              </label>
              <label>
                <span>Resultado esperado</span>
                <textarea name="expectedResult" rows={4} minLength={3} maxLength={2000} required />
              </label>
              <label>
                <span>Capacidade</span>
                <input name="capacity" type="number" min={1} max={100} defaultValue={1} required />
              </label>
              <label className="checkbox-label">
                <input name="publishNow" type="checkbox" defaultChecked />
                <span><strong>Publicar após criar</strong><small>Publicação continua sendo um comando separado no B1.</small></span>
              </label>
              <button className="button button-primary" type="submit">Criar oportunidade</button>
            </form>
          </details>
        </section>
      )) : null}
    </main>
  );
}
