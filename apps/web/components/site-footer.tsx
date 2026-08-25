import Link from "next/link";
import type { Locale } from "@/lib/i18n/core";

export function SiteFooter({ locale }: { locale: Locale }) {
  const en = locale === "en";

  return (
    <footer className="site-footer">
      <div className="footer-inner section-shell">
        <div>
          <span className="footer-brand">célula<span>zero</span></span>
          <p>
            {en
              ? "A coordination environment for verifiable collaboration."
              : "Um ambiente de coordenação para colaboração verificável."}
          </p>
        </div>
        <div className="footer-links">
          <Link href="/projects">{en ? "Projects" : "Projetos"}</Link>
          <Link href="/about/gate-1">{en ? "How it works" : "Como funciona"}</Link>
          <a href="https://github.com/MMaia-jr/celula-zero">GitHub</a>
        </div>
        <p className="footer-status">
          {en
            ? "Public Alpha · no internal financial movement"
            : "Alpha pública · sem movimentação financeira interna"}
        </p>
      </div>
    </footer>
  );
}
