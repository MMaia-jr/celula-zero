// SPDX-License-Identifier: MPL-2.0
"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import type { FoundationView, Command } from "../lib/foundation";
export type Section = "home" | "cells" | "discover" | "activity" | "you";
const navigation = [
  { id: "home", label: "Início", symbol: "◉" },
  { id: "cells", label: "Células", symbol: "◈" },
  { id: "discover", label: "Descobrir", symbol: "⌕" },
  { id: "activity", label: "Atividade", symbol: "↗" },
  { id: "you", label: "Você", symbol: "○" },
] as const;
const date = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
async function api(
  payload?: unknown,
): Promise<{ view?: FoundationView | null; ok?: boolean }> {
  const response = await fetch(
    "/api/foundation",
    payload
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      : { cache: "no-store" },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir.");
  return data;
}
function humanRecord(record: FoundationView["records"][number]): string {
  if (record.kind !== "OriginalRecord") return record.kind;
  if (record.purpose === "intention" || record.authorId === "system:local-seed")
    return record.content;
  try {
    const data = JSON.parse(record.content);
    return (
      data.title ??
      data.headline ??
      data.provider ??
      data.purpose ??
      record.content
    );
  } catch {
    return record.content;
  }
}
export function FoundationApp({ section }: { section: Section }) {
  const [view, setView] = useState<FoundationView | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [intention, setIntention] = useState("");
  const flight = useRef(false),
    request = useRef<{ command: string; key: string } | null>(null),
    input = useRef<HTMLTextAreaElement>(null);
  const load = useCallback(async () => {
    try {
      setView((await api()).view ?? null);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    api()
      .then((data) => {
        if (active) setView(data.view ?? null);
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function enter() {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      await api({ action: "enter" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  async function leave() {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      await api({ action: "leave" });
      setView(null);
      setNotice("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  async function save(command: Command, form?: HTMLFormElement) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const encoded = JSON.stringify(command);
    if (request.current?.command !== encoded)
      request.current = { command: encoded, key: crypto.randomUUID() };
    try {
      const data = await api({
        action: "command",
        command,
        key: request.current.key,
      });
      setView(data.view ?? null);
      request.current = null;
      setNotice("Salvo. Você pode sair e continuar depois.");
      if (command.type === "intention") setIntention("");
      if (command.type === "experience" || command.type === "external_identity")
        form?.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  function form(
    event: FormEvent<HTMLFormElement>,
    type: "experience" | "profile" | "external_identity" | "cell",
  ) {
    event.preventDefault();
    const el = event.currentTarget;
    const f = new FormData(el);
    const get = (name: string) => String(f.get(name) ?? "");
    if (type === "experience")
      void save(
        {
          type,
          title: get("title"),
          description: get("description"),
          occurredOn: get("occurredOn"),
        },
        el,
      );
    if (type === "profile")
      void save({ type, headline: get("headline"), bio: get("bio") }, el);
    if (type === "external_identity")
      void save({ type, provider: get("provider"), url: get("url") }, el);
    if (type === "cell") void save({ type, purpose: get("purpose") }, el);
  }
  if (loading)
    return (
      <main className="entry">
        <p role="status">Recuperando seu espaço…</p>
      </main>
    );
  if (!view)
    return (
      <main className="entry">
        <div className="entry-card">
          <span className="brand-mark">◉</span>
          <p className="eyebrow">CÉLULA ZERO</p>
          <h1>
            Um lugar para
            <br />o que vem a seguir.
          </h1>
          <p className="lead">
            Suas experiências, suas relações e o trabalho que importa — com
            continuidade.
          </p>
          <div className="local-note">
            Foundation local · espaço de Marcos neste computador. Esta entrada
            não verifica uma identidade externa.
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button
            className="primary"
            disabled={busy}
            onClick={() => void enter()}
          >
            {busy ? "Entrando…" : "Entrar como Marcos"} <span>↗</span>
          </button>
        </div>
        <p className="entry-foot">Intenção · Relação · Consequência</p>
      </main>
    );
  const intentions = view.records.filter(
    (r) => r.kind === "OriginalRecord" && r.purpose === "intention",
  );
  return (
    <div className="app-shell">
      <a className="skip" href="#content">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">◉</span>
          <span>
            Célula Zero<small>Seu espaço de continuidade</small>
          </span>
        </Link>
        <nav aria-label="Navegação principal">
          {navigation.map((n) => (
            <Link
              key={n.id}
              href={n.id === "home" ? "/" : `/${n.id}`}
              aria-current={section === n.id ? "page" : undefined}
            >
              <span aria-hidden="true">{n.symbol}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">M</span>
          <div>
            <strong>{view.person.name}</strong>
            <small>Espaço local · privado</small>
          </div>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void leave()}
          >
            Sair
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>{navigation.find((n) => n.id === section)?.label}</span>
          <span className="quiet">
            <span className="status-dot" /> Foundation local{" "}
            <button
              className="mobile-exit text-button"
              disabled={busy}
              onClick={() => void leave()}
            >
              Sair
            </button>
          </span>
        </header>
        <main id="content">
          <div aria-live="polite">
            {notice && (
              <p className="success" role="status">
                {notice}
              </p>
            )}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {section === "home" && (
            <>
              <p className="eyebrow">SEU PRÓXIMO MOVIMENTO</p>
              <h1>
                Olá, {view.person.name}.<br />
                <span className="soft">O que faz sentido agora?</span>
              </h1>
              <p className="lead">
                Comece por uma ideia. Continue de onde parou.
              </p>
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save({ type: "intention", content: intention });
                }}
              >
                <label htmlFor="intention">
                  O que você quer registrar ou explorar?
                </label>
                <textarea
                  ref={input}
                  id="intention"
                  required
                  maxLength={6000}
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="Uma necessidade, uma ideia, algo que você quer fazer…"
                  rows={3}
                />
                <div className="composer-footer">
                  <small>
                    Fica registrado para você. A assistência de IA ainda não
                    está conectada.
                  </small>
                  <button className="primary" disabled={busy}>
                    {busy ? "Salvando…" : "Guardar para continuar"} ↗
                  </button>
                </div>
              </form>
              <div className="actions">
                {["Criar", "Resolver", "Encontrar", "Decidir", "Aprender"].map(
                  (action) => (
                    <button
                      key={action}
                      onClick={() => {
                        setIntention(`${action}: `);
                        input.current?.focus();
                      }}
                    >
                      {action} <span>↗</span>
                    </button>
                  ),
                )}
                <Link href="/you#experience">Registrar experiência ↗</Link>
              </div>
              <section>
                <div className="section-heading">
                  <h2>Seu fio de continuidade</h2>
                  <Link href="/activity">Ver atividade ↗</Link>
                </div>
                {intentions.length ? (
                  <div className="cards">
                    {intentions
                      .slice(-3)
                      .reverse()
                      .map((record) => (
                        <article className="card" key={record.id}>
                          <small>
                            REGISTRADO POR VOCÊ · {date(record.createdAt)}
                          </small>
                          <p className="record-text">{humanRecord(record)}</p>
                          <Link href="/activity">Rever registro ↗</Link>
                        </article>
                      ))}
                  </div>
                ) : (
                  <div className="empty">
                    <span>↗</span>
                    <h3>Há espaço para começar.</h3>
                    <p>
                      O que você guardar acima permanece aqui no seu próximo
                      retorno.
                    </p>
                  </div>
                )}
              </section>
              <section className="cell-banner">
                <div>
                  <small>SUA CÉLULA</small>
                  <h2>Célula Zero</h2>
                  <p>Um contexto para construir, operar e aprender juntos.</p>
                </div>
                <Link className="secondary" href="/cells">
                  Entrar na célula ↗
                </Link>
              </section>
            </>
          )}
          {section === "you" && (
            <>
              <p className="eyebrow">IDENTIDADE & PRESENÇA</p>
              <h1>Você, além de uma bio.</h1>
              <p className="lead">
                Registre seu percurso. Dê contexto ao que sabe fazer.
              </p>
              <div className="profile-hero">
                <span className="avatar large">M</span>
                <div>
                  <h2>{view.person.name}</h2>
                  <p>{view.profile.headline}</p>
                  <small>
                    Perfil privado · visível apenas neste espaço local
                  </small>
                </div>
              </div>
              <div className="two-columns">
                <section className="panel">
                  <h2>Como você se apresenta</h2>
                  <form onSubmit={(e) => form(e, "profile")}>
                    <label htmlFor="headline">Em poucas palavras</label>
                    <input
                      id="headline"
                      name="headline"
                      defaultValue={view.profile.headline}
                      required
                      maxLength={160}
                    />
                    <label htmlFor="bio">Sobre você</label>
                    <textarea
                      id="bio"
                      name="bio"
                      defaultValue={view.profile.bio}
                      rows={4}
                      maxLength={3000}
                    />
                    <button className="primary" disabled={busy}>
                      Salvar perfil
                    </button>
                  </form>
                </section>
                <section className="panel" id="experience">
                  <h2>Uma experiência do seu percurso</h2>
                  <p className="quiet">
                    O que você viveu ou realizou? Seu relato não será
                    apresentado como verificação.
                  </p>
                  <form onSubmit={(e) => form(e, "experience")}>
                    <label htmlFor="title">Título da experiência</label>
                    <input id="title" name="title" required maxLength={160} />
                    <label htmlFor="occurredOn">Quando aconteceu?</label>
                    <input
                      id="occurredOn"
                      name="occurredOn"
                      type="date"
                      required
                    />
                    <label htmlFor="description">Conte o que aconteceu</label>
                    <textarea
                      id="description"
                      name="description"
                      required
                      rows={4}
                      maxLength={6000}
                    />
                    <button className="primary" disabled={busy}>
                      Guardar experiência
                    </button>
                  </form>
                </section>
              </div>
              <section>
                <h2>Experiências registradas</h2>
                {view.experiences.length ? (
                  view.experiences
                    .slice()
                    .reverse()
                    .map((e) => (
                      <article key={e.id} className="card">
                        <span className="badge">
                          Relatada por você · não verificada
                        </span>
                        <h3>{e.title}</h3>
                        <small>{e.occurredOn}</small>
                        <p className="record-text">{e.description}</p>
                      </article>
                    ))
                ) : (
                  <p className="quiet">
                    Seu percurso começa com a primeira experiência.
                  </p>
                )}
              </section>
              <section className="panel">
                <h2>Onde você também está</h2>
                <p>
                  Guarde uma referência ao seu perfil externo. Nenhuma conta
                  será conectada ou consultada.
                </p>
                <form onSubmit={(e) => form(e, "external_identity")}>
                  <div className="two-columns">
                    <div>
                      <label htmlFor="provider">Plataforma</label>
                      <input
                        id="provider"
                        name="provider"
                        placeholder="GitHub, Lattes, site pessoal…"
                        required
                        maxLength={160}
                      />
                    </div>
                    <div>
                      <label htmlFor="url">Endereço do perfil</label>
                      <input
                        id="url"
                        name="url"
                        type="url"
                        placeholder="https://…"
                        required
                        maxLength={2048}
                      />
                    </div>
                  </div>
                  <button className="secondary" disabled={busy}>
                    Guardar referência
                  </button>
                </form>
                {view.externalIdentities.map((e) => (
                  <p key={e.id}>
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {e.provider} ↗
                    </a>{" "}
                    <span className="badge">
                      Informada · titularidade não verificada
                    </span>
                  </p>
                ))}
              </section>
            </>
          )}
          {section === "cells" && (
            <>
              <p className="eyebrow">RELAÇÕES QUE DÃO CONTEXTO</p>
              <h1>Suas células.</h1>
              <p className="lead">
                Pessoas, propósito e responsabilidade no mesmo lugar.
              </p>
              {view.cell ? (
                <section className="panel">
                  <span className="badge">SUA CÉLULA</span>
                  <h2>{view.cell.name}</h2>
                  <p>{view.cell.purpose}</p>
                  <div className="relation">
                    <span className="avatar">M</span>
                    <div>
                      <strong>{view.person.name}</strong>
                      <p>Founder / Steward</p>
                      <small>
                        Relação explícita na Foundation local. Não concede
                        autoridade em serviços externos.
                      </small>
                    </div>
                  </div>
                  {view.canUpdateCell && (
                    <form onSubmit={(e) => form(e, "cell")}>
                      <label htmlFor="purpose">Propósito da célula</label>
                      <textarea
                        id="purpose"
                        name="purpose"
                        defaultValue={view.cell.purpose}
                        rows={3}
                        required
                        maxLength={6000}
                      />
                      <button className="primary" disabled={busy}>
                        Atualizar propósito
                      </button>
                    </form>
                  )}
                </section>
              ) : (
                <p>Você não possui acesso a uma célula neste momento.</p>
              )}
            </>
          )}
          {section === "discover" && (
            <>
              <p className="eyebrow">NOVAS POSSIBILIDADES</p>
              <h1>
                Descobrir começa
                <br />
                pelo seu contexto.
              </h1>
              <p className="lead">
                Organize o que você já traz. Conexões e pesquisa assistida virão
                em etapas seguintes.
              </p>
              <section className="empty">
                <span>⌕</span>
                <h2>Seu percurso é um ponto de partida.</h2>
                <p>
                  Registre experiências e referências no seu perfil. Nada será
                  buscado ou inferido sem uma capacidade conectada.
                </p>
                <Link className="primary" href="/you">
                  Construir meu perfil ↗
                </Link>
              </section>
            </>
          )}
          {section === "activity" && (
            <>
              <p className="eyebrow">O QUE PERMANECE</p>
              <h1>Seu percurso registrado.</h1>
              <p className="lead">
                Mudanças com origem. Contexto para o próximo retorno.
              </p>
              <div className="section-heading">
                <h2>{view.records.length} registros</h2>
                <a
                  className="secondary"
                  download="cz-foundation.json"
                  href="/api/foundation?export=1"
                >
                  Baixar meus registros ↓
                </a>
              </div>
              <ol className="timeline">
                {view.records
                  .slice()
                  .reverse()
                  .map((r) => (
                    <li key={r.id}>
                      <span className="timeline-dot" />
                      <article>
                        <small>
                          {date(r.createdAt)} ·{" "}
                          {r.authorId === view.person.id
                            ? "Marcos"
                            : "Configuração local"}
                        </small>
                        <h3>
                          {r.kind === "OriginalRecord"
                            ? {
                                intention: "Intenção guardada",
                                experience: "Experiência registrada",
                                profile: "Perfil atualizado",
                                external_identity: "Referência informada",
                                cell: "Contexto da célula",
                              }[r.purpose]
                            : r.kind}
                        </h3>
                        <p className="record-text">{humanRecord(r)}</p>
                        <details>
                          <summary>Ver registro original</summary>
                          <pre>
                            {r.kind === "OriginalRecord"
                              ? r.content
                              : JSON.stringify(r, null, 2)}
                          </pre>
                        </details>
                      </article>
                    </li>
                  ))}
              </ol>
            </>
          )}
        </main>
        <footer>
          Seu contexto pertence a você.{" "}
          <Link href="/activity">Rever e levar seus registros ↗</Link>
        </footer>
      </div>
    </div>
  );
}
