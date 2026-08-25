import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";

export default async function NotFound() {
  const locale = await getLocale();
  const en = locale === "en";

  return (
    <div className="narrow-page section-shell">
      <div className="setup-panel">
        <p className="kicker">404</p>
        <h1>{en ? "This resource is not on this ground." : "Este recurso não está neste solo."}</h1>
        <p>{en ? "It may not exist, may be private, or may not have been published yet." : "Ele pode não existir, estar privado ou ainda não ter sido publicado."}</p>
        <Link className="button button-primary" href="/projects">{en ? "Explore public projects" : "Explorar projetos públicos"}</Link>
      </div>
    </div>
  );
}
