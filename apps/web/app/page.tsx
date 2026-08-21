import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { listPublicProjects } from "@/lib/data/projects";

const cycle = [
  {
    number: "01",
    title: "Declare o projeto",
    text: "Preserve a intenção original e torne a interpretação atual compreensível.",
  },
  {
    number: "02",
    title: "Abra uma oportunidade",
    text: "Diga o que falta, quais condições valem e como a entrega será avaliada.",
  },
  {
    number: "03",
    title: "Contribua com acordo",
    text: "Proposta só vira compromisso após aceitação explícita — nunca retroativa.",
  },
  {
    number: "04",
    title: "Mostre a trajetória",
    text: "Contribuição, evidência, review e resultado permanecem objetos distintos.",
  },
];

export default async function HomePage() {
  const projects = await listPublicProjects();

  return (
    <>
      <section className="hero section-shell">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" aria-hidden="true" />
            MVP local · Gate 1
          </div>
          <h1>
            Projetos encontram pessoas.
            <span> Contribuições viram evidência.</span>
          </h1>
          <p className="hero-lead">
            A Célula Zero é um solo fértil para transformar intenção em projeto, abrir caminhos de
            colaboração e construir confiança com condições e histórico verificáveis.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/projects">
              Explorar projetos <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button button-secondary" href="/projects/new">
              Plantar um projeto
            </Link>
          </div>
          <p className="hero-note">
            Sem custódia, pagamentos internos ou promessa de renda. Escrita restrita ao piloto.
          </p>
        </div>

        <div className="hero-panel" aria-label="Resumo do ciclo operacional">
          <div className="hero-panel-topline">
            <span>ciclo vivo</span>
            <span className="mono">CZ / 001</span>
          </div>
          <div className="orbit" aria-hidden="true">
            <div className="orbit-ring orbit-ring-one" />
            <div className="orbit-ring orbit-ring-two" />
            <div className="orbit-core">
              <span>intenção</span>
              <strong>→</strong>
              <span>evidência</span>
            </div>
            <span className="orbit-label orbit-project">projeto</span>
            <span className="orbit-label orbit-agreement">acordo</span>
            <span className="orbit-label orbit-review">review</span>
          </div>
          <div className="hero-metrics">
            <div>
              <strong>{projects.length.toString().padStart(2, "0")}</strong>
              <span>projetos semeados</span>
            </div>
            <div>
              <strong>0</strong>
              <span>fundos movimentados</span>
            </div>
            <div>
              <strong>1</strong>
              <span>FAIL preservado</span>
            </div>
          </div>
        </div>
      </section>

      <section className="cycle-section section-shell" aria-labelledby="ciclo-title">
        <div className="section-intro">
          <p className="kicker">Como o solo funciona</p>
          <h2 id="ciclo-title">Um caminho claro para começar pequeno e crescer com contexto.</h2>
        </div>
        <div className="cycle-grid">
          {cycle.map((step) => (
            <article className="cycle-card" key={step.number}>
              <span className="cycle-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="projects-section section-shell" aria-labelledby="projetos-title">
        <div className="section-heading-row">
          <div>
            <p className="kicker">Já existe onde pisar</p>
            <h2 id="projetos-title">Projetos no solo</h2>
          </div>
          <Link className="text-link" href="/projects">
            Ver todos <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="project-grid">
          {projects.slice(0, 3).map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>

      <section className="principles-section section-shell">
        <div className="principles-panel">
          <p className="kicker kicker-light">Limites visíveis</p>
          <h2>Confiança não nasce de um score. Nasce de contexto preservado.</h2>
          <div className="principle-list">
            <p><span>01</span> Registro Original não é interpretação.</p>
            <p><span>02</span> Proposta não é compromisso.</p>
            <p><span>03</span> Trabalho não é evidência nem resultado.</p>
            <p><span>04</span> Interesse financeiro não movimenta fundos.</p>
          </div>
          <Link className="button button-light" href="/about/gate-1">
            Ver arquitetura e limites
          </Link>
        </div>
      </section>
    </>
  );
}
