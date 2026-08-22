import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { getSupabasePublicEnvironment } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Acesso piloto" };

export default function LoginPage() {
  const enabled = Boolean(getSupabasePublicEnvironment());

  return (
    <div className="auth-page section-shell">
      <div className="auth-story">
        <p className="kicker">Piloto por convite</p>
        <h1>Escrita controlada. Leitura pública.</h1>
        <p>
          O acesso de piloto protege drafts e responsabilidades sem transformar a interface em
          autoridade. Permissões críticas vivem no banco e são testáveis.
        </p>
        <ul className="check-list">
          <li>Link de acesso sem senha permanente</li>
          <li>RLS deny-by-default</li>
          <li>Nenhum segredo no navegador</li>
          <li>Nenhum pagamento ou wallet</li>
        </ul>
      </div>
      <LoginForm enabled={enabled} />
    </div>
  );
}
