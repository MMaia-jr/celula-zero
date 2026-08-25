import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Locale } from "@/lib/i18n/core";

export function SiteHeader({ locale }: { locale: Locale }) {
  const en = locale === "en";

  return (
    <header className="site-header">
      <div className="header-inner section-shell">
        <Link
          className="brand"
          href="/"
          aria-label={en ? "Célula Zero — home" : "Célula Zero — início"}
        >
          <span className="brand-mark" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="brand-name">célula<span>zero</span></span>
        </Link>
        <nav aria-label={en ? "Main navigation" : "Navegação principal"}>
          <Link href="/projects">{en ? "Projects" : "Projetos"}</Link>
          <Link href="/workbench">{en ? "Operate" : "Operar"}</Link>
          <Link href="/me">{en ? "Profile" : "Perfil"}</Link>
          <Link href="/about/gate-1">{en ? "How it works" : "Como funciona"}</Link>
          <LanguageSwitcher locale={locale} />
          <Link className="nav-access" href="/login">
            {en ? "Sign in" : "Entrar"} <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
