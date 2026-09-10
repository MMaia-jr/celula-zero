import Link from "next/link";

export default function ParticipationLeftPage() {
  return (
    <main className="section-shell">
      <header className="project-hero">
        <div className="project-hero-main">
          <p className="mini-label">PARTICIPATION ENDED</p>
          <h1>You left the Cell participation.</h1>
          <p>
            Participation-dependent context now fails closed. Historical consent
            and participation records were not erased.
          </p>
        </div>
      </header>
      <section className="content-block">
        <p>
          Leaving did not create or revoke an unrelated membership, role,
          delegation, or economic authority.
        </p>
        <Link className="button" href="/">
          Return home
        </Link>
      </section>
    </main>
  );
}
