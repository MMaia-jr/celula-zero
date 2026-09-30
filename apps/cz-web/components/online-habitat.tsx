// SPDX-License-Identifier: MPL-2.0
"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { signOutFounder } from "../lib/auth-actions";
import type { HabitatContext } from "../lib/habitat-context";

const nav = [["Início", "/"], ["Células", "/cells"], ["Descobrir", "/discover"], ["Atividade", "/activity"], ["Você", "/you"]] as const;

export function OnlineHabitat({ initial, section }: { initial: HabitatContext; section: string }) {
  const [context, setContext] = useState(initial);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/habitat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, requestKey: crypto.randomUUID() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      if (data.context) setContext(data.context);
      setContent(""); setMessage("Intenção registrada. Ela estará aqui quando você voltar.");
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="app-shell">
    <a className="skip" href="#content">Pular para o conteúdo</a>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark">◉</span><span>Célula Zero<small>Seu espaço de continuidade</small></span></Link>
      <nav aria-label="Navegação principal">{nav.map(([label, href]) => <Link key={href} href={href} aria-current={(href === "/" ? section === "home" : href.slice(1) === section) ? "page" : undefined}>{label}</Link>)}</nav>
      <div className="sidebar-bottom"><span className="avatar">{context.person.name.slice(0, 1)}</span><div><strong>{context.person.name}</strong><small>Conta autenticada · estado remoto</small></div><form action={signOutFounder}><button className="text-button">Sair</button></form></div>
    </aside>
    <div className="main-column"><header className="mobile-header"><Link href="/" className="brand">◉ Célula Zero</Link><form action={signOutFounder}><button className="text-button">Sair</button></form></header>
      <main id="content" className="content">
        {section === "home" && <>
          <p className="eyebrow">SEU PRÓXIMO MOVIMENTO</p><h1>Olá, {context.person.name}.<br/><span className="soft">O que faz sentido agora?</span></h1>
          <p className="lead">Seu contexto da {context.cell.name} está pronto para continuar.</p>
          <form className="composer" onSubmit={submit}><label htmlFor="intention">O que você quer registrar ou explorar?</label><textarea id="intention" required maxLength={6000} value={content} onChange={e => setContent(e.target.value)} placeholder="Uma necessidade, uma ideia, algo que você quer fazer…" rows={3}/><div className="composer-footer"><small>Privado para você · registrado como relato original, sem alegação de verificação.</small><button className="primary" disabled={busy}>{busy ? "Salvando…" : "Guardar para continuar ↗"}</button></div></form>
        </>}
        {section === "cells" && <><p className="eyebrow">RELAÇÕES QUE DÃO CONTEXTO</p><h1>Sua célula.</h1><section className="panel"><span className="badge">CONTEXTO DISPONÍVEL</span><h2>{context.cell.name}</h2><p>Seu acesso deriva de uma relação registrada. Entrar não concede autoridade para alterar políticas ou dados da célula.</p></section></>}
        {section === "discover" && <><p className="eyebrow">NOVAS POSSIBILIDADES</p><h1>Descobrir começa pelo contexto.</h1><p className="lead">Este habitat registra e retoma seu trabalho. Pesquisa e assistência ainda não estão conectadas.</p></>}
        {section === "you" && <><p className="eyebrow">IDENTIDADE & PRESENÇA</p><h1>Você, além de uma bio.</h1><section className="profile-hero"><span className="avatar large">{context.person.name.slice(0, 1)}</span><div><h2>{context.person.name}</h2><p>{context.profile.bio || "Seu perfil institucional"}</p><small>Profile e Pessoa são registros distintos; o e-mail é apenas credencial de acesso.</small></div></section></>}
        {(section === "home" || section === "activity") && <section><div className="section-heading"><h2>Seu fio de continuidade</h2>{section === "home" && <Link href="/activity">Ver atividade ↗</Link>}</div>{context.records.length ? <div className="cards">{context.records.slice().reverse().map(record => <article className="card" key={record.id}><small>RELATADO POR VOCÊ · {new Date(record.created_at).toLocaleDateString("pt-BR")}</small><p className="record-text">{record.content}</p><span className="badge">OriginalRecord · intenção privada</span></article>)}</div> : <div className="empty"><span>↗</span><h3>Há espaço para começar.</h3><p>O que você guardar acima estará aqui quando retornar.</p></div>}</section>}
        {message && <p role="status" className="notice">{message}</p>}{error && <p role="alert" className="error">{error}</p>}
      </main><footer>Seu contexto pertence a você. <Link href="/activity">Rever sua atividade ↗</Link></footer>
    </div>
  </div>;
}
