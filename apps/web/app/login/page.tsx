import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { resolveSafeNext } from "@/lib/auth/redirect";
import { getSupabasePublicEnvironment } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Entrar" };

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const enabled = Boolean(getSupabasePublicEnvironment());
  const params = await searchParams;
  const next = resolveSafeNext(first(params.next) ?? null, "/projects");

  return (
    <div className="auth-page section-shell">
      <div className="auth-story">
        <p className="kicker">Identidade atribuível</p>
        <h1>Entre quando houver uma razão para agir.</h1>
        <p>
          Leitura pública continua aberta. O e-mail cria ou recupera sua sessão para
          ações atribuíveis, como submeter uma Proposal.
        </p>
        <ul className="check-list">
          <li>Link de acesso sem senha permanente</li>
          <li>Uma nova conta recebe Profile + Actor PERSON</li>
          <li>Entrar não concede autoridade sobre projetos</li>
          <li>Proposal continua distinta de Commitment</li>
        </ul>
      </div>
      <LoginForm enabled={enabled} next={next} />
    </div>
  );
}
