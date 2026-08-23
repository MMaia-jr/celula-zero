import Link from "next/link";
import { redirect } from "next/navigation";
import { getWorkbenchData } from "@/lib/data/workbench";
import { createTaskCapsule } from "@/lib/domain/task-capsule";
import { ResultReturnClient } from "./result-return-client";

interface ResultReturnPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResultReturnPage({ searchParams }: ResultReturnPageProps) {
  const data = await getWorkbenchData();
  if (data.status === "ANONYMOUS") redirect("/login");

  const params = await searchParams;
  const slug = first(params.project);
  const commitmentId = first(params.commitment);

  if (data.status === "UNAVAILABLE") {
    return (
      <main className="section-shell">
        <h1>Backend indisponível</h1>
        <Link href="/workbench">Voltar ao workbench</Link>
      </main>
    );
  }

  if (!slug || !commitmentId) {
    return (
      <main className="section-shell">
        <h1>Result Return</h1>
        <p>Projeto e Commitment são obrigatórios.</p>
        <Link href="/workbench">Voltar ao workbench</Link>
      </main>
    );
  }

  const project = data.projects.find((item) => item.slug === slug);
  if (!project) {
    return (
      <main className="section-shell">
        <h1>Result Return</h1>
        <p>Projeto não operável.</p>
        <Link href="/workbench">Voltar ao workbench</Link>
      </main>
    );
  }

  let capsule: ReturnType<typeof createTaskCapsule>;
  try {
    capsule = createTaskCapsule(project, commitmentId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task Capsule inválido.";
    return (
      <main className="section-shell">
        <h1>Result Return indisponível</h1>
        <p>{message}</p>
        <Link href="/workbench">Voltar ao workbench</Link>
      </main>
    );
  }

  const executor = project.actors.find(
    (actor) => actor.id === capsule.authority.executorActorId,
  );
  const endpoint = `/workbench/result-return/validate?project=${encodeURIComponent(project.slug)}&commitment=${encodeURIComponent(commitmentId)}`;

  return (
    <main className="section-shell">
      <div className="breadcrumb">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <Link href="/workbench">Operar</Link>
        <span aria-hidden="true">/</span>
        <span>Result Return</span>
      </div>

      <header className="project-hero">
        <div className="project-hero-main">
          <p className="mini-label">RESULT-RETURN-ASSURANCE-001</p>
          <h1>Entender o retorno sem transformar relato em verdade</h1>
          <p>
            Esta superfície valida origem e limites do Result Package e projeta uma
            leitura determinística para decisão humana. Ela não cria Evidence,
            Verification, Outcome ou promoção canônica.
          </p>
        </div>
      </header>

      <ResultReturnClient
        endpoint={endpoint}
        packetId={capsule.packetId}
        capsuleDigest={capsule.digest}
        expectedExecutorId={capsule.authority.executorActorId}
        expectedExecutorLabel={executor?.name ?? capsule.authority.executorActorId}
      />
    </main>
  );
}
