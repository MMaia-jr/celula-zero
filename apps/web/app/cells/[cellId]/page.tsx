import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCellOperatingContext } from "@/lib/data/cell-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CellPage({ params }: { params: Promise<{ cellId: string }> }) {
  const { cellId } = await params;
  const client = await createSupabaseServerClient();
  if (!client) return <main className="section-shell"><h1>Cell</h1><p>Backend unavailable.</p></main>;
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) redirect(`/login?next=/cells/${cellId}`);
  const context = await getCellOperatingContext(cellId);
  if (!context) notFound();
  return <main className="section-shell">
    <div className="breadcrumb"><Link href="/cells">Cells</Link><span>/</span><span>{context.cell.name}</span></div>
    <header className="project-hero"><div className="project-hero-main"><p className="mini-label">GENESIS CELL · AUTHENTICATED READBACK</p><h1>{context.cell.name}</h1><p>One composed view of RLS-visible canonical records. This page is not an authority grant.</p></div></header>
    <section className="content-block"><p className="mini-label">Policy and currentness</p><h2>Policy {context.policy ? `v${context.policy.version} · ${context.policy.state}` : "not visible"}</h2><pre>{JSON.stringify(context.policy?.rules ?? {}, null, 2)}</pre><p><strong>{context.buildReference.status}</strong>: {context.buildReference.value ?? "—"}. {context.buildReference.notice}</p><Link className="button" href={`/cells/${cellId}/export`}>Export cz.cell.v1</Link></section>
    <section className="content-block"><p className="mini-label">Composition</p><h2>{context.projects.length} projects · {context.dragonCycles.length} Dragon cycles · {context.companyCore.length} Company Core cycles</h2>
      <ul className="project-list">{context.projects.map((project) => <li className="project-card" key={project.id}><h3><Link href={`/projects/${project.slug}`}>{project.title}</Link></h3><p>{project.stage} · {project.visibility} · material v{project.version}</p></li>)}</ul></section>
    <section className="content-block"><p className="mini-label">Participation / economy / Web3</p><p>Participation: {context.participation.active} active, {context.participation.left} left, {context.participation.invitations} visible invitations.</p><p>Economy: {context.economy.instructions} instructions → {context.economy.attempts} attempts → {context.economy.receipts} receipts → {context.economy.reconciliations} reconciliations.</p><p>Web3: {context.web3.walletBindings} wallet bindings; {context.web3.treasuryReferences} treasury references. Custody: no. Authority granted: no.</p></section>
    <section className="content-block"><p className="mini-label">Domain Decisions / Outcomes</p>{context.decisions.length ? <ul>{context.decisions.map((d) => <li key={d.id}><Link href={`/decisions/${d.id}`}>{d.disposition}</Link> — {d.reason}</li>)}</ul> : <p>No RLS-visible Decisions.</p>}<p>{context.outcomes.length} RLS-visible Outcomes. OBSERVED is a classification, not verified truth.</p></section>
  </main>;
}
