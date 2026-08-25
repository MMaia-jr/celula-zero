import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updateMyProfileAction } from "@/app/me/actions";
import { getMyProfile } from "@/lib/data/profiles";

export const metadata: Metadata = { title: "Meu Profile" };

interface MePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MePage({ searchParams }: MePageProps) {
  const result = await getMyProfile();
  if (result.status === "ANONYMOUS") redirect("/login?next=/me");

  const params = await searchParams;
  const profileStatus = first(params.profile);

  if (result.status === "UNAVAILABLE") {
    return (
      <div className="section-shell">
        <section className="content-block">
          <p className="mini-label">IDENTITY-PROFILE-ALPHA</p>
          <h1>Backend não configurado</h1>
          <p>Configure o Supabase para editar sua presença atribuível.</p>
        </section>
      </div>
    );
  }

  const { profile } = result;

  return (
    <div className="section-shell">
      <div className="breadcrumb">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <span>Meu Profile</span>
      </div>

      <header className="project-hero">
        <div className="project-hero-main">
          <p className="mini-label">IDENTITY-PROFILE-ALPHA</p>
          <h1>{profile.displayName}</h1>
          <p>
            Profile é sua presença na Célula Zero. Actor PERSON continua sendo o sujeito
            atribuível das ações. Login, wallet e reputação são objetos diferentes.
          </p>
        </div>
        <aside className="project-steward-card">
          <span className="mini-label">Actor PERSON</span>
          <strong>{profile.actorName}</strong>
          <small>{profile.actorId}</small>
          <div className="divider" />
          <dl>
            <div><dt>Profile</dt><dd>{profile.visibility}</dd></div>
            <div><dt>Handle</dt><dd>{profile.handle ? `@${profile.handle}` : "não definido"}</dd></div>
          </dl>
        </aside>
      </header>

      {profileStatus === "updated" ? (
        <p className="form-message" role="status">
          Profile atualizado. Isto não altera autoridade, membership ou reputação.
        </p>
      ) : null}

      {profileStatus && profileStatus !== "updated" ? (
        <p className="form-message form-error" role="alert">
          O Profile não foi atualizado ({profileStatus}). Nenhum sucesso foi presumido.
        </p>
      ) : null}

      <section className="content-block">
        <p className="mini-label">Presença controlada</p>
        <h2>Editar Profile</h2>
        <form className="project-form" action={updateMyProfileAction}>
          <label>
            <span>Handle</span>
            <input
              name="handle"
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,30}[A-Za-z0-9]"
              defaultValue={profile.handle ?? ""}
              placeholder="seu-handle"
            />
          </label>

          <label>
            <span>Nome exibido</span>
            <input
              name="displayName"
              minLength={2}
              maxLength={100}
              defaultValue={profile.displayName}
              required
            />
          </label>

          <label>
            <span>Bio</span>
            <textarea
              name="bio"
              rows={6}
              maxLength={800}
              defaultValue={profile.bio}
              placeholder="Contexto que você escolhe tornar parte do seu Profile."
            />
          </label>

          <label>
            <span>Visibilidade</span>
            <select name="visibility" defaultValue={profile.visibility}>
              <option value="PRIVATE">Privado</option>
              <option value="PUBLIC">Público</option>
            </select>
          </label>

          <button className="button button-primary" type="submit">
            Salvar Profile
          </button>
        </form>
      </section>

      {profile.visibility === "PUBLIC" && profile.handle ? (
        <section className="content-block">
          <p className="mini-label">Projeção pública</p>
          <h2>Seu Profile pode ser observado sem login.</h2>
          <Link className="button button-secondary" href={`/people/${profile.handle}`}>
            Ver Profile público
          </Link>
        </section>
      ) : null}

      <section className="funding-warning">
        <strong>Profile ≠ reputação</strong>
        <p>
          Nome, bio e handle são apresentação escolhida. Evidência, verificação,
          autoridade e histórico de contribuição continuam objetos separados.
        </p>
      </section>
    </div>
  );
}
