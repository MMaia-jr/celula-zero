import { LoginForm } from "@/components/login-form";
import { resolveSafeNext } from "@/lib/auth/redirect";
import { getLocale } from "@/lib/i18n/server";
import { getSupabasePublicEnvironment } from "@/lib/supabase/config";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const enabled = Boolean(getSupabasePublicEnvironment());
  const params = await searchParams;
  const next = resolveSafeNext(first(params.next) ?? null, "/projects");

  return (
    <div className="auth-page section-shell">
      <div className="auth-story">
        <p className="kicker">{en ? "Attributable identity" : "Identidade atribuível"}</p>
        <h1>
          {en ? "Sign in when there is a reason to act." : "Entre quando houver uma razão para agir."}
        </h1>
        <p>
          {en
            ? "Public reading stays open. Email creates or recovers your session for attributable actions such as submitting a Proposal."
            : "Leitura pública continua aberta. O e-mail cria ou recupera sua sessão para ações atribuíveis, como submeter uma Proposal."}
        </p>
        <ul className="check-list">
          <li>{en ? "Passwordless access link" : "Link de acesso sem senha permanente"}</li>
          <li>{en ? "A new account receives Profile + Actor PERSON" : "Uma nova conta recebe Profile + Actor PERSON"}</li>
          <li>{en ? "Signing in grants no project authority" : "Entrar não concede autoridade sobre projetos"}</li>
          <li>{en ? "Proposal remains distinct from Commitment" : "Proposal continua distinta de Commitment"}</li>
        </ul>
      </div>
      <LoginForm enabled={enabled} next={next} locale={locale} />
    </div>
  );
}
