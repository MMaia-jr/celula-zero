import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { listPublicProjects } from "@/lib/data/projects";
import { getLocale } from "@/lib/i18n/server";

export default async function HomePage() {
  const locale = await getLocale();
  const en = locale === "en";
  const projects = await listPublicProjects();

  const cycle = en
    ? [
        {
          number: "01",
          title: "Declare the project",
          text: "Preserve the original intent and make the current interpretation understandable.",
        },
        {
          number: "02",
          title: "Open an opportunity",
          text: "State what is missing, which conditions apply, and how the delivery will be evaluated.",
        },
        {
          number: "03",
          title: "Contribute by agreement",
          text: "A Proposal becomes a Commitment only after explicit acceptance — never retroactively.",
        },
        {
          number: "04",
          title: "Show the trajectory",
          text: "Contribution, evidence, verification, decision and result remain distinct objects.",
        },
      ]
    : [
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
          text: "Proposal só vira Commitment após aceitação explícita — nunca retroativa.",
        },
        {
          number: "04",
          title: "Mostre a trajetória",
          text: "Contribuição, evidência, verificação, decisão e resultado permanecem objetos distintos.",
        },
      ];

  return (
    <>
      <section className="hero section-shell">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" aria-hidden="true" />
            {en ? "Public Alpha · verifiable coordination" : "Alpha pública · coordenação verificável"}
          </div>
          <h1>
            {en ? "Projects find people." : "Projetos encontram pessoas."}
            <span>
              {en ? " Contributions become evidence." : " Contribuições viram evidência."}
            </span>
          </h1>
          <p className="hero-lead">
            {en
              ? "Célula Zero is a coordination environment where intentions become projects, real needs become opportunities, and trust is built from explicit conditions and reconstructible history."
              : "A Célula Zero é um ambiente de coordenação onde intenções viram projetos, necessidades reais viram oportunidades e confiança é construída com condições explícitas e histórico reconstruível."}
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/projects">
              {en ? "Explore projects" : "Explorar projetos"} <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button button-secondary" href="/projects/new">
              {en ? "Create a project" : "Plantar um projeto"}
            </Link>
          </div>
          <p className="hero-note">
            {en
              ? "No custody, internal payments, universal reputation score, or implied authority."
              : "Sem custódia, pagamentos internos, score universal de reputação ou autoridade implícita."}
          </p>
        </div>

        <div
          className="hero-panel"
          aria-label={en ? "Operating cycle summary" : "Resumo do ciclo operacional"}
        >
          <div className="hero-panel-topline">
            <span>{en ? "living cycle" : "ciclo vivo"}</span>
            <span className="mono">CZ / 001</span>
          </div>
          <div className="orbit" aria-hidden="true">
            <div className="orbit-ring orbit-ring-one" />
            <div className="orbit-ring orbit-ring-two" />
            <div className="orbit-core">
              <span>{en ? "intent" : "intenção"}</span>
              <strong>→</strong>
              <span>{en ? "evidence" : "evidência"}</span>
            </div>
            <span className="orbit-label orbit-project">{en ? "project" : "projeto"}</span>
            <span className="orbit-label orbit-agreement">{en ? "agreement" : "acordo"}</span>
            <span className="orbit-label orbit-review">{en ? "review" : "review"}</span>
          </div>
          <div className="hero-metrics">
            <div>
              <strong>{projects.length.toString().padStart(2, "0")}</strong>
              <span>{en ? "public projects" : "projetos públicos"}</span>
            </div>
            <div>
              <strong>0</strong>
              <span>{en ? "funds moved" : "fundos movimentados"}</span>
            </div>
            <div>
              <strong>1</strong>
              <span>{en ? "public alpha" : "alpha pública"}</span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="cycle-section section-shell"
        aria-labelledby="cycle-title"
      >
        <div className="section-intro">
          <p className="kicker">{en ? "How coordination works" : "Como a coordenação funciona"}</p>
          <h2 id="cycle-title">
            {en
              ? "Start small, preserve context, and let real coordination create the next step."
              : "Comece pequeno, preserve contexto e deixe a coordenação real criar o próximo passo."}
          </h2>
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

      <section
        className="projects-section section-shell"
        aria-labelledby="projects-title"
      >
        <div className="section-heading-row">
          <div>
            <p className="kicker">{en ? "Something real already exists" : "Já existe onde pisar"}</p>
            <h2 id="projects-title">{en ? "Projects" : "Projetos no solo"}</h2>
          </div>
          <Link className="text-link" href="/projects">
            {en ? "View all" : "Ver todos"} <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="project-grid">
          {projects.slice(0, 3).map((project) => (
            <ProjectCard key={project.id} project={project} locale={locale} />
          ))}
        </div>
      </section>

      <section className="principles-section section-shell">
        <div className="principles-panel">
          <p className="kicker kicker-light">{en ? "Visible limits" : "Limites visíveis"}</p>
          <h2>
            {en
              ? "Trust is not a score. It is contextual history that can be inspected."
              : "Confiança não é um score. É histórico contextual que pode ser inspecionado."}
          </h2>
          <div className="principle-list">
            <p><span>01</span> {en ? "Original Record is not interpretation." : "Registro Original não é interpretação."}</p>
            <p><span>02</span> {en ? "Proposal is not Commitment." : "Proposal não é Commitment."}</p>
            <p><span>03</span> {en ? "Work is not evidence or result." : "Trabalho não é evidência nem resultado."}</p>
            <p><span>04</span> {en ? "Financial interest does not move funds." : "Interesse financeiro não movimenta fundos."}</p>
          </div>
          <Link className="button button-light" href="/about/gate-1">
            {en ? "See architecture and limits" : "Ver arquitetura e limites"}
          </Link>
        </div>
      </section>
    </>
  );
}
