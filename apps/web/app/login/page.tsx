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
  const next = resolveSafeNext(first(params.next) ?? null, "/genesis");

  return (
    <div className="auth-page section-shell">
      <div className="auth-story">
        <p className="kicker">{en ? "Attributable identity" : "Identidade atribuível"}</p>
        <h1>
          {en ? "Enter the Genesis Cell." : "Entre na Célula Genesis."}
        </h1>
        <p>
          {en
            ? "Google sign-in recovers your existing authenticated Profile and related PERSON. It creates no application-side founder identity."
            : "O login Google recupera seu Profile autenticado existente e o PERSON relacionado. Nenhuma identidade paralela de fundador é criada pela aplicação."}
        </p>
        <ul className="check-list">
          <li>{en ? "Google-first PKCE authentication" : "Autenticação PKCE com Google primeiro"}</li>
          <li>{en ? "Profile and PERSON remain distinct" : "Profile e PERSON permanecem distintos"}</li>
          <li>{en ? "Signing in grants no project authority" : "Entrar não concede autoridade sobre projetos"}</li>
          <li>{en ? "Proposal remains distinct from Commitment" : "Proposal continua distinta de Commitment"}</li>
        </ul>
      </div>
      <LoginForm enabled={enabled} next={next} locale={locale} />
    </div>
  );
}
