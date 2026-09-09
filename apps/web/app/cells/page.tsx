import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CellsPage() {
  const client = await createSupabaseServerClient();
  if (!client) return <main className="section-shell"><h1>Cells</h1><p>Backend unavailable.</p></main>;
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) redirect("/login?next=/cells");
  const { data, error } = await client.from("cells").select("id,name,slug,created_at").order("created_at");
  if (error) throw new Error(`Cell listing denied: ${error.message}`);
  return <main className="section-shell"><header className="page-header"><div><p className="kicker">Operating context</p><h1>Cells</h1><p>Authenticated, policy-bound readbacks assembled from existing canonical records.</p></div></header>
    <ul className="project-list">{(data ?? []).map((cell) => <li className="project-card" key={cell.id}><h3><Link href={`/cells/${cell.id}`}>{cell.name}</Link></h3><p>{cell.slug}</p></li>)}</ul></main>;
}
