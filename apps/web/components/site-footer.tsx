import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner section-shell">
        <div>
          <span className="footer-brand">célula<span>zero</span></span>
          <p>Um solo fértil para colaboração verificável.</p>
        </div>
        <div className="footer-links">
          <Link href="/projects">Projetos</Link>
          <Link href="/about/gate-1">Gate 1</Link>
          <a href="https://github.com/MMaia-jr/celula-zero">GitHub</a>
        </div>
        <p className="footer-status">Gate 1 · local · sem movimentação financeira</p>
      </div>
    </footer>
  );
}
