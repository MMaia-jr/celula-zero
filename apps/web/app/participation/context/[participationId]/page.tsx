import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { leaveParticipation } from "@/app/participation/actions";
import { getParticipantCellContext } from "@/lib/data/participation";
import { PARTICIPANT_CONTEXT_NOTICE } from "@/lib/domain/participation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ParticipantContextPage({
  params,
}: {
  params: Promise<{ participationId: string }>;
}) {
  const { participationId } = await params;
  const client = await createSupabaseServerClient();

  if (!client) {
    return (
      <main className="section-shell">
        <h1>Cell participation</h1>
        <p>Backend unavailable.</p>
      </main>
    );
  }

  const { data: auth } = await client.auth.getUser();
  if (!auth.user) {
    redirect(
      `/login?next=/participation/context/${encodeURIComponent(participationId)}`,
    );
  }

  const context = await getParticipantCellContext(participationId);
  if (!context) notFound();

  return (
    <main className="section-shell">
      <header className="project-hero">
        <div className="project-hero-main">
          <p className="mini-label">ACTIVE CELL PARTICIPATION · BOUNDED READ</p>
          <h1>{context.cell.name}</h1>
          <p>{PARTICIPANT_CONTEXT_NOTICE}</p>
        </div>
      </header>

      <section className="content-block">
        <p className="mini-label">Why am I here?</p>
        <h2>Your participation is active</h2>
        <p>
          {context.invitation.purpose ??
            "The invitation purpose is not available in this bounded readback."}
        </p>
        <p>
          Cell: <strong>{context.cell.name}</strong> · {context.cell.slug}
        </p>
        <p>
          Participation: {context.participation.status} · material v
          {context.participation.materialVersion}
        </p>
        <p>Joined: {context.participation.joinedAt}</p>
      </section>

      <section className="content-block">
        <p className="mini-label">What may I do?</p>
        <h2>Bounded participation</h2>
        <p>
          You may read this participant-specific context and leave your own
          participation.
        </p>
        <p>
          This page does not grant membership, a role, delegation, Cell
          administration, project stewardship, or economic authority.
        </p>
        <p>
          Policy metadata:{" "}
          {context.policy.version === null
            ? "not available"
            : `v${context.policy.version} · ${context.policy.state ?? "unknown"}`}
          . Policy rules are not exposed by this participant projection.
        </p>
      </section>

      <section className="content-block">
        <p className="mini-label">What may I see?</p>
        <h2>Already-public project context</h2>
        {context.projects.length ? (
          <ul className="project-list">
            {context.projects.map((project) => (
              <li className="project-card" key={project.id}>
                <h3>
                  <Link href={`/projects/${project.slug}`}>{project.title}</Link>
                </h3>
                <p>
                  {project.stage} · {project.visibility}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No public project summary is available in this Cell.</p>
        )}
      </section>

      <section className="content-block">
        <p className="mini-label">Exit</p>
        <h2>You control your participation</h2>
        <p>
          Leaving ends this active participation. It does not erase the
          historical consent or participation records.
        </p>
        <form action={leaveParticipation}>
          <input
            type="hidden"
            name="participationId"
            value={context.participation.id}
          />
          <button className="button" type="submit">
            Leave participation
          </button>
        </form>
      </section>
    </main>
  );
}
