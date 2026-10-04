// SPDX-License-Identifier: MPL-2.0
import Link from "next/link";
import { requestFounderLink, startFounderGoogleOAuth } from "../../lib/auth-actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const { result } = await searchParams;
  return (
    <main className="entry">
      <div className="entry-card">
        <Link href="/" className="brand"><span className="brand-mark">◉</span> Célula Zero</Link>
        <p className="eyebrow">SEU ESPAÇO DE CONTINUIDADE</p>
        <h1>Entrar na Célula Zero.</h1>
        <p className="lead">Entre com a conta Google autorizada. Sua identidade de acesso continua ligada ao mesmo perfil e à mesma pessoa na Célula Zero.</p>
        {result === "sent" && <p role="status" className="notice">Se o endereço estiver autorizado, enviaremos um link de acesso.</p>}
        {result === "unavailable" && <p role="alert" className="error">O acesso online está temporariamente indisponível.</p>}
        <form action={startFounderGoogleOAuth} className="login-form">
          <button className="primary google-primary" type="submit">Continuar com Google</button>
        </form>
        <details className="login-fallback">
          <summary>Problemas com o Google? Usar link de e-mail como alternativa</summary>
          <p className="quiet">O endereço autorizado é validado no servidor. O link por e-mail é apenas um fallback.</p>
          <form action={requestFounderLink} className="panel login-form">
            <label htmlFor="email">E-mail autorizado</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
            <button className="secondary" type="submit">Enviar link de fallback ↗</button>
          </form>
        </details>
      </div>
      <p className="entry-foot"><Link href="/">Voltar</Link></p>
    </main>
  );
}
