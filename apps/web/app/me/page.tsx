import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updateMyProfileAction } from "@/app/me/actions";
import { getMyProfile } from "@/lib/data/profiles";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "My Profile" : "Meu Profile" };
}

interface MePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MePage({ searchParams }: MePageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const result = await getMyProfile();

  if (result.status === "ANONYMOUS") redirect("/login?next=/me");

  const params = await searchParams;
  const profileStatus = first(params.profile);

  if (result.status === "UNAVAILABLE") {
    return (
      <div className="section-shell">
        <section className="content-block">
          <p className="mini-label">IDENTITY-PROFILE-ALPHA</p>
          <h1>{en ? "Backend unavailable" : "Backend indisponível"}</h1>
          <p>{en ? "Configure Supabase to edit your attributable presence." : "Configure o Supabase para editar sua presença atribuível."}</p>
        </section>
      </div>
    );
  }

  const { profile } = result;
  const profileStatusLabel =
    profile.visibility === "PUBLIC"
      ? en ? "Public" : "Público"
      : en ? "Private" : "Privado";

  return (
    <div className="section-shell">
      <div className="breadcrumb">
        <Link href="/">{en ? "Home" : "Início"}</Link>
        <span aria-hidden="true">/</span>
        <span>{en ? "My Profile" : "Meu Profile"}</span>
      </div>

      <header className="project-hero">
        <div className="project-hero-main">
          <p className="mini-label">IDENTITY-PROFILE-ALPHA</p>
          <h1>{profile.displayName}</h1>
          <p>
            {en
              ? "Profile is your chosen presence in Célula Zero. Actor PERSON remains the attributable subject of actions. Login, wallet and reputation are distinct objects."
              : "Profile é sua presença escolhida na Célula Zero. Actor PERSON continua sendo o sujeito atribuível das ações. Login, wallet e reputação são objetos diferentes."}
          </p>
        </div>
        <aside className="project-steward-card">
          <span className="mini-label">Actor PERSON</span>
          <strong>{profile.actorName}</strong>
          <small>{profile.actorId}</small>
          <div className="divider" />
          <dl>
            <div><dt>Profile</dt><dd>{profileStatusLabel}</dd></div>
            <div><dt>Handle</dt><dd>{profile.handle ? `@${profile.handle}` : en ? "not set" : "não definido"}</dd></div>
          </dl>
        </aside>
      </header>

      {profileStatus === "updated" ? (
        <p className="form-message" role="status">
          {en ? "Profile updated. This does not change authority, membership or reputation." : "Profile atualizado. Isto não altera autoridade, membership ou reputação."}
        </p>
      ) : null}

      {profileStatus && profileStatus !== "updated" ? (
        <p className="form-message form-error" role="alert">
          {en ? `The Profile was not updated (${profileStatus}). No success was assumed.` : `O Profile não foi atualizado (${profileStatus}). Nenhum sucesso foi presumido.`}
        </p>
      ) : null}

      <section className="content-block">
        <p className="mini-label">{en ? "Controlled presence" : "Presença controlada"}</p>
        <h2>{en ? "Edit Profile" : "Editar Profile"}</h2>
        <form className="project-form" action={updateMyProfileAction}>
          <label>
            <span>Handle</span>
            <input name="handle" minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,30}[A-Za-z0-9]" defaultValue={profile.handle ?? ""} placeholder={en ? "your-handle" : "seu-handle"} />
          </label>
          <label>
            <span>{en ? "Display name" : "Nome exibido"}</span>
            <input name="displayName" minLength={2} maxLength={100} defaultValue={profile.displayName} required />
          </label>
          <label>
            <span>Bio</span>
            <textarea name="bio" rows={6} maxLength={800} defaultValue={profile.bio} placeholder={en ? "Context you choose to make part of your Profile." : "Contexto que você escolhe tornar parte do seu Profile."} />
            <small>{en ? "Authored content is preserved in the language you write." : "Conteúdo autorado é preservado no idioma em que você escrever."}</small>
          </label>
          <label>
            <span>{en ? "Visibility" : "Visibilidade"}</span>
            <select name="visibility" defaultValue={profile.visibility}>
              <option value="PRIVATE">{en ? "Private" : "Privado"}</option>
              <option value="PUBLIC">{en ? "Public" : "Público"}</option>
            </select>
          </label>
          <button className="button button-primary" type="submit">{en ? "Save Profile" : "Salvar Profile"}</button>
        </form>
      </section>

      {profile.visibility === "PUBLIC" && profile.handle ? (
        <section className="content-block">
          <p className="mini-label">{en ? "Public projection" : "Projeção pública"}</p>
          <h2>{en ? "Your Profile can be observed without signing in." : "Seu Profile pode ser observado sem login."}</h2>
          <Link className="button button-secondary" href={`/people/${profile.handle}`}>{en ? "View public Profile" : "Ver Profile público"}</Link>
        </section>
      ) : null}

      <section className="funding-warning">
        <strong>Profile ≠ {en ? "reputation" : "reputação"}</strong>
        <p>{en ? "Name, bio and handle are chosen presentation. Evidence, verification, authority and contribution history remain distinct objects." : "Nome, bio e handle são apresentação escolhida. Evidência, verificação, autoridade e histórico de contribuição continuam objetos separados."}</p>
      </section>
    </div>
  );
}
