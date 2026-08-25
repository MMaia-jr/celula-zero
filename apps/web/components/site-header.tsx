import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner section-shell">
        <Link className="brand" href="/" aria-label="Célula Zero — início">
          <span className="brand-mark" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="brand-name">célula<span>zero</span></span>
        </Link>
        <nav aria-label="Navegação principal">
          <Link href="/projects">Projetos</Link>
          <Link href="/workbench">Operar</Link>
          <Link href="/me">Perfil</Link>
          <Link href="/about/gate-1">Como funciona</Link>
          <Link className="nav-access" href="/login">
            Entrar <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
