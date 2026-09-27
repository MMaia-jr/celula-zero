import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentOperation } from "@/lib/data/current-operation";
import type { OperationMode } from "@/lib/domain/current-operation";

export const metadata: Metadata = { title: "Operar a Célula Zero" };
const groups: { mode: OperationMode; title: string }[] = [
  { mode: "NEEDS_HUMAN", title: "Precisa de você" },
  { mode: "BLOCKED", title: "Bloqueado / requer reconciliação" },
  { mode: "CAN_CONTINUE", title: "Pode continuar" },
  { mode: "IN_PROGRESS", title: "Em andamento" },
];

export default async function OperatePage() {
  let data;
  try { data = await getCurrentOperation(); }
  catch { return <main className="section-shell"><section className="content-block"><h1>Operar a Célula Zero</h1><p role="alert">Não foi possível reconstruir a identidade ou carregar os contextos operacionais. Nenhuma continuação foi presumida. Tente novamente.</p><Link href="/me">Consultar perfil</Link></section></main>; }
  if (data.status === "ANONYMOUS") redirect("/login?next=/operate");
  if (data.status !== "READY" || !("profile" in data)) {
    return <main className="section-shell"><section className="content-block"><h1>Operar a Célula Zero</h1><p role="alert">Dados operacionais indisponíveis. Nenhuma identidade ou continuação foi presumida.</p></section></main>;
  }
  return (
    <main className="section-shell">
      <header className="project-hero"><div className="project-hero-main">
        <h1>Operar a Célula Zero</h1>
        <p>Reconhecido como: <strong>{data.profile.actorName}</strong> (PERSON).</p>
        <p>Perfil: <Link href="/me">{data.profile.displayName}</Link>. O perfil e o ator responsável pelas ações são registros distintos.</p>
        <p>Continuações dos seus ciclos e dos projetos em que você pode operar. Mostrar uma continuação não autoriza sua execução nem escolhe por você.</p>
        <p>Agrupamento por situação; ordem estável por identificador dentro dos grupos, sem ordem de importância.</p>
      </div></header>
      {!data.items.length ? <section className="content-block"><p>Nenhuma continuação ativa encontrada nos contextos carregados.</p><Link href="/workbench">Consultar seus projetos</Link></section> : null}
      {groups.map((group) => (
        <section className="content-block" key={group.mode} aria-labelledby={`group-${group.mode}`}>
          <h2 id={`group-${group.mode}`}>{group.title}</h2>
          {data.items.filter((item) => item.mode === group.mode).map((item) => (
            <article className="side-block" key={`${item.source}:${item.sourceId}`}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <p><small>{item.source === "COMPANY_CORE" ? "Ciclo da empresa" : "Projeto operacional"} · Estado observado: {item.observedState}</small></p>
              <Link href={item.href}>{item.mode === "BLOCKED" || item.mode === "IN_PROGRESS" ? "Consultar contexto" : "Abrir continuação"}</Link>
            </article>
          ))}
          {!data.items.some((item) => item.mode === group.mode) ? <p>Nenhum item nesta situação.</p> : null}
        </section>
      ))}
    </main>
  );
}
