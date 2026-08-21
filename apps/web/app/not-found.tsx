import Link from "next/link";

export default function NotFound() {
  return (
    <div className="narrow-page section-shell">
      <div className="setup-panel">
        <p className="kicker">404</p>
        <h1>Este projeto não está neste solo.</h1>
        <p>Ele pode não existir, estar privado ou ainda não ter sido publicado.</p>
        <Link className="button button-primary" href="/projects">Explorar projetos públicos</Link>
      </div>
    </div>
  );
}
