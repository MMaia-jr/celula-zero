// SPDX-License-Identifier: MPL-2.0
import Link from "next/link";
import { requestFounderLink } from "../../lib/auth-actions";

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
        <p className="lead">Use o e-mail autorizado para receber um link de acesso. Sua conta continua ligada ao mesmo perfil e à mesma pessoa.</p>
        {result === "sent" && <p role="status" className="notice">Se o endereço estiver autorizado, enviaremos um link de acesso.</p>}
        {result === "unavailable" && <p role="alert" className="error">O acesso online está temporariamente indisponível.</p>}
        <form action={requestFounderLink} className="panel login-form">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
          <button className="primary">Enviar link de acesso ↗</button>
        </form>
      </div>
      <p className="entry-foot"><Link href="/">Voltar</Link></p>
    </main>
  );
}
