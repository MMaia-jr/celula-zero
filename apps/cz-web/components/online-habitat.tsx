// SPDX-License-Identifier: MPL-2.0
"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { actionToolsConfig } from "./action-toolkit";
import { signOutFounder } from "../lib/auth-actions";
import type { ChatMessage } from "../lib/chat";
import type { HabitatContext, HabitatWorkItem } from "../lib/habitat-context";
import { CANONICAL_STATE_URL } from "../lib/canonical-state";

const nav = [["Início", "/"], ["Células", "/cells"], ["Atividade", "/activity"], ["Você", "/you"]] as const;
type WorkItem = { number: number; title: string; html_url: string; state: string; updated_at: string };

function Conversation({ threadId, initialMessages }: { threadId: string; initialMessages: ChatMessage[] }) {
  const runtime = useChatRuntime<UIMessage>({
    id: threadId,
    messages: initialMessages as UIMessage[],
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: () => undefined,
  });
  return <AssistantRuntimeProvider runtime={runtime} config={actionToolsConfig}>
    <ThreadPrimitive.Root className="conversation">
      <ThreadPrimitive.Viewport className="conversation-viewport">
        <ThreadPrimitive.Empty>
          <div className="conversation-welcome"><span className="badge">VOCÊ JÁ ESTÁ NA CÉLULA ZERO</span><h2>O que você quer tornar possível agora?</h2><p>Seu nome, seu vínculo com a Célula e o que já foi registrado foram recuperados. Comece pelo que importa; o perfil pode ganhar contexto aos poucos, quando isso ajudar.</p><div className="suggestions"><ThreadPrimitive.Suggestion className="suggestion" prompt="Onde estamos na Célula Zero?" send>Onde estamos?</ThreadPrimitive.Suggestion><ThreadPrimitive.Suggestion className="suggestion" prompt="Quero continuar o que estávamos fazendo." send>Continuar meu trabalho</ThreadPrimitive.Suggestion></div></div>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages components={{ Message: () => <MessagePrimitive.Root className="chat-message"><div className="chat-message-label"><MessagePrimitive.If user>Você</MessagePrimitive.If><MessagePrimitive.If assistant>Célula Zero</MessagePrimitive.If></div><MessagePrimitive.Content /><MessagePrimitive.Error /></MessagePrimitive.Root> }} />
      </ThreadPrimitive.Viewport>
      <ComposerPrimitive.Root className="chat-composer">
        <ComposerPrimitive.Input aria-label="Mensagem para a Célula Zero" placeholder="Escreva o que você quer pensar ou fazer…" autoFocus={false} />
        <div className="chat-composer-footer"><small>Conversa persistente · mensagens não viram decisões ou registros automaticamente</small><ComposerPrimitive.Send className="primary">Enviar ↗</ComposerPrimitive.Send></div>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  </AssistantRuntimeProvider>;
}

function statusName(status: string) {
  return status === "in_progress" ? "Em andamento" : status === "done" ? "Concluído" : "Aberto";
}

export function OnlineHabitat({ initial, section, threadId, initialMessages, workItems, canonicalDirection }: { initial: HabitatContext; section: string; threadId: string | null; initialMessages: ChatMessage[]; workItems: WorkItem[]; canonicalDirection: string | null }) {
  const [record, setRecord] = useState("");
  const [profileName, setProfileName] = useState(initial.profile.display_name);
  const [profileBio, setProfileBio] = useState(initial.profile.bio ?? "");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/habitat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: record, requestKey: crypto.randomUUID() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível registrar.");
      setRecord(""); setNotice("Relato Original registrado com sua autoria.");
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: profileName, bio: profileBio }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar o perfil.");
      setNotice("Perfil atualizado por você.");
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }

  return <div className="app-shell">
    <a className="skip" href="#content">Pular para o conteúdo</a>
    <aside className="sidebar"><Link href="/" className="brand"><span className="brand-mark">◉</span><span>Célula Zero<small>Seu espaço de continuidade</small></span></Link><nav aria-label="Navegação principal">{nav.map(([label, href]) => <Link key={href} href={href} aria-current={(href === "/" ? section === "home" : href.slice(1) === section) ? "page" : undefined}>{label}</Link>)}</nav><div className="sidebar-bottom"><span className="avatar">{initial.person.name.slice(0, 1)}</span><div><strong>{initial.person.name}</strong><small>Conta autenticada · estado remoto</small></div><form action={signOutFounder}><button className="text-button">Sair</button></form></div></aside>
    <div className="main-column"><header className="mobile-header"><Link href="/" className="brand">◉ Célula Zero</Link><form action={signOutFounder}><button className="text-button">Sair</button></form></header><main id="content" className="content">
      {section === "home" && <><p className="eyebrow">CÉLULA ZERO · CONTINUIDADE</p><h1>O que importa<br/><span className="soft">agora?</span></h1><p className="lead">{initial.workItems.some(item => item.status !== "done") ? `Você tem ${initial.workItems.filter(item => item.status !== "done").length} trabalho(s) em andamento. Vamos retomar pelo que já está aqui.` : "Seu contexto e seus registros continuam disponíveis. Vamos pensar e agir a partir deles."}</p>{initial.workItems.some(item => item.status !== "done") && <section className="resume-strip"><div><span className="badge">CONTINUAÇÃO</span><h2>{initial.workItems.find(item => item.status !== "done")?.title}</h2><p>{initial.workItems.find(item => item.status !== "done")?.description}</p></div><Link className="secondary" href="/cells">Abrir Célula</Link></section>}{threadId ? <Conversation threadId={threadId} initialMessages={initialMessages} /> : <div className="error">Não foi possível abrir sua conversa persistente.</div>}<details className="record-action"><summary>Registrar um relato Original</summary><form className="composer" onSubmit={saveRecord}><label htmlFor="record">Este conteúdo será salvo como relato seu, sem alegação de verificação.</label><textarea id="record" required maxLength={6000} value={record} onChange={e => setRecord(e.target.value)} rows={3} placeholder="O que você quer preservar como relato?"/><button className="secondary" disabled={busy}>Salvar relato</button></form></details><section className="section-heading"><h2>Relatos recentes</h2><Link href="/activity">Ver atividade ↗</Link></section>{initial.records.length ? <div className="cards">{initial.records.slice(0,3).map(item => <article className="card" key={item.id}><small>RELATADO POR VOCÊ · {new Date(item.created_at).toLocaleDateString("pt-BR")}</small><p className="record-text">{item.content}</p><span className="badge">Relato Original · Marcos</span></article>)}</div> : <div className="empty"><h3>Seu trabalho pode começar aqui.</h3><p>Uma conversa pode explorar uma ideia; um relato só é criado quando você escolhe registrar.</p></div>}</>}
      {section === "cells" && <><p className="eyebrow">SEU LUGAR DE TRABALHO</p><h1>{initial.cell.name}</h1><p className="lead">Um espaço para continuar conversa, trabalho e decisões relevantes na mesma Célula.</p><section className="cell-purpose"><div><span className="badge">DIREÇÃO DA CÉLULA</span><p>{canonicalDirection || "A direção canônica está temporariamente indisponível; a relação e o trabalho continuam acessíveis."}</p><a href={CANONICAL_STATE_URL} target="_blank" rel="noreferrer">Estado canônico · GitHub ↗</a></div></section><section className="panel cell-relation"><span className="badge">SUA RELAÇÃO</span><h2>{initial.person.name} · {initial.cell.relation ?? "integrante"}</h2><p>O vínculo foi reconstruído dos registros da Célula. Entrar identifica sua sessão; mudanças materiais continuam sob confirmação humana e autoridade verificada pelo servidor.</p></section><section><div className="section-heading"><h2>Trabalho da Célula</h2><span className="quiet">{initial.workItems.length} item(ns)</span></div>{initial.workItems.length ? <div className="work-list">{initial.workItems.map(item => <WorkCard item={item} key={item.id}/>)}</div> : <div className="empty work-empty"><h3>Ainda não há próximo passo registrado.</h3><p>Converse com a Célula sobre o que quer tornar possível. Uma proposta só entra no trabalho depois que você confirmar.</p></div>}</section>{initial.records.length > 0 && <section><div className="section-heading"><h2>Relatos que orientam</h2><Link href="/activity">Ver atividade ↗</Link></div><div className="cards">{initial.records.slice(0,3).map(item => <article className="card" key={item.id}><small>RELATO ORIGINAL · {new Date(item.created_at).toLocaleDateString("pt-BR")}</small><p className="record-text">{item.content}</p></article>)}</div></section>}{workItems.length > 0 && <section><div className="section-heading"><h2>Referências canônicas</h2><a href="https://github.com/MMaia-jr/celula-zero/issues" target="_blank" rel="noreferrer">Issues do GitHub ↗</a></div><div className="work-list">{workItems.map(item => <article className="external-work" key={item.number}><small>FONTE EXTERNA · ISSUE #{item.number}</small><h3>{item.title}</h3><a href={item.html_url} target="_blank" rel="noreferrer">Abrir referência ↗</a></article>)}</div></section>}<div className="section-heading"><h2>Continuar nesta Célula</h2></div>{threadId ? <Conversation threadId={threadId} initialMessages={initialMessages} /> : <p className="error">A conversa persistente está indisponível.</p>}</>}
      {section === "activity" && <><p className="eyebrow">CONSEQUÊNCIAS QUE PERMANECEM</p><h1>O que mudou.</h1><p className="lead">Trabalho confirmado, relatos seus, atualizações de Profile e a conversa que permite continuar.</p>{(initial.workItems.length > 0 || initial.records.length > 0 || Boolean(initial.profile.created_at && initial.profile.updated_at && initial.profile.updated_at > initial.profile.created_at)) ? <div className="activity-timeline">{[...initial.workItems.map(item => ({ kind: "work" as const, at: item.updated_at, id: item.id, item })), ...initial.records.map(item => ({ kind: "record" as const, at: item.created_at, id: item.id, item })), ...(initial.profile.created_at && initial.profile.updated_at && initial.profile.updated_at > initial.profile.created_at ? [{ kind: "profile" as const, at: initial.profile.updated_at, id: initial.profile.id, item: { display_name: initial.profile.display_name, bio: initial.profile.bio } }] : [])].sort((a,b) => b.at.localeCompare(a.at)).map((entry, index) => <article className="activity-event" key={`${entry.kind}-${entry.id}-${index}`}><span className="activity-dot"/><small>{new Date(entry.at).toLocaleString("pt-BR")} · {entry.kind === "work" ? "TRABALHO CONFIRMADO" : entry.kind === "record" ? "RELATO ORIGINAL" : "PROFILE ATUALIZADO POR VOCÊ"}</small><h3>{entry.kind === "work" ? entry.item.title : entry.kind === "record" ? "Relato de Marcos" : entry.item.display_name}</h3><p>{entry.kind === "work" ? `${entry.item.description || ""} · ${statusName(entry.item.status)}` : entry.kind === "record" ? entry.item.content : entry.item.bio || "Apresentação atualizada"}</p></article>)}</div> : <div className="empty">Ainda não há consequências registradas na Célula.</div>}<section className="section-heading"><h2>Conversa recente</h2><Link href="/">Continuar ↗</Link></section>{initialMessages.length ? <div className="activity-thread">{initialMessages.slice(-8).map(message => <article className="activity-message" key={message.id}><small>{message.role === "user" ? "MARCOS" : "CÉLULA ZERO"}</small><p>{message.parts.filter(part => part.type === "text").map(part => part.text).join("")}</p></article>)}</div> : <div className="empty">A conversa começa na página inicial.</div>}</>}
      {section === "you" && <><p className="eyebrow">PRESENÇA, COM O QUE ESTÁ REGISTRADO</p><h1>Você na Célula Zero.</h1><section className="profile-hero"><span className="avatar large">{profileName.slice(0, 1)}</span><div><h2>{profileName}</h2><p>{profileBio || "Sua apresentação ainda não foi registrada. Você pode adicioná-la quando isso ajudar o trabalho."}</p><small>{initial.cell.name} · {initial.cell.relation ?? "relação registrada"}. E-mail é credencial, não identidade institucional.</small></div></section><section className="presence-grid"><article className="panel"><span className="badge">CONTINUIDADE</span><h2>{initial.workItems.filter(item => item.status !== "done").length} trabalho(s) em andamento</h2><p>{initial.workItems.find(item => item.status !== "done")?.title ?? "Nenhum trabalho aberto registrado ainda."}</p><Link href="/cells">Abrir seu trabalho ↗</Link></article><article className="panel"><span className="badge">RELATOS ATRIBUÍDOS A VOCÊ</span><h2>{initial.records.length} Original Record(s)</h2><p>Relatos permanecem distintos de evidência ou verificação.</p><Link href="/activity">Ver atividade ↗</Link></article></section><details className="profile-edit"><summary>Editar apresentação</summary><form className="profile-form" onSubmit={saveProfile}><label htmlFor="profile-name">Nome de exibição</label><input id="profile-name" value={profileName} maxLength={80} onChange={e => setProfileName(e.target.value)}/><label htmlFor="profile-bio">Sobre você</label><textarea id="profile-bio" value={profileBio} maxLength={800} rows={4} onChange={e => setProfileBio(e.target.value)}/><button className="secondary" disabled={busy}>Atualizar meu Profile</button></form></details></>}
      {notice && <p role="status" className="notice">{notice}</p>}{error && <p role="alert" className="error">{error}</p>}
    </main><footer>Seu contexto tem origem e autoria. <Link href="/activity">Rever sua atividade ↗</Link></footer></div>
  </div>;
}

function WorkCard({ item }: { item: HabitatWorkItem }) {
  return <article className={`work-card work-${item.status}`}><div><small>{item.status === "done" ? "CONCLUÍDO" : item.status === "in_progress" ? "EM ANDAMENTO" : "ABERTO"} · ATUALIZADO {new Date(item.updated_at).toLocaleDateString("pt-BR")}</small><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</div><Link href="/">Retomar na conversa ↗</Link></article>;
}
