// SPDX-License-Identifier: MPL-2.0
"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { signOutFounder } from "../lib/auth-actions";
import type { ChatMessage } from "../lib/chat";
import type { HabitatContext } from "../lib/habitat-context";

const nav = [["Início", "/"], ["Células", "/cells"], ["Atividade", "/activity"], ["Você", "/you"]] as const;
type WorkItem = { number: number; title: string; html_url: string; state: string; updated_at: string };

function Conversation({ threadId, initialMessages }: { threadId: string; initialMessages: ChatMessage[] }) {
  const runtime = useChatRuntime<UIMessage>({
    id: threadId,
    messages: initialMessages as UIMessage[],
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: () => undefined,
  });
  return <AssistantRuntimeProvider runtime={runtime}>
    <ThreadPrimitive.Root className="conversation">
      <ThreadPrimitive.Viewport className="conversation-viewport">
        <ThreadPrimitive.Empty>
          <div className="conversation-welcome"><span className="badge">CONTINUIDADE DA CÉLULA ZERO</span><h2>Olá, Marcos. O que está vivo para você agora?</h2><p>Podemos continuar um trabalho, pensar uma ideia ou olhar o que mudou. Vou usar seu contexto registrado e perguntar quando faltar algo.</p><div className="suggestions"><ThreadPrimitive.Suggestion className="suggestion" prompt="Onde estamos na Célula Zero?" send>Onde estamos na Célula Zero?</ThreadPrimitive.Suggestion><ThreadPrimitive.Suggestion className="suggestion" prompt="Quero continuar o que estávamos fazendo.">Continuar meu trabalho</ThreadPrimitive.Suggestion></div></div>
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

export function OnlineHabitat({ initial, section, threadId, initialMessages, workItems }: { initial: HabitatContext; section: string; threadId: string | null; initialMessages: ChatMessage[]; workItems: WorkItem[] }) {
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
      {section === "home" && <><p className="eyebrow">CÉLULA ZERO · CONTINUIDADE</p><h1>O que importa<br/><span className="soft">agora?</span></h1><p className="lead">Seu contexto e seus registros continuam disponíveis. Vamos pensar e agir a partir deles.</p>{threadId ? <Conversation threadId={threadId} initialMessages={initialMessages} /> : <div className="error">Não foi possível abrir sua conversa persistente.</div>}<details className="record-action"><summary>Registrar um relato Original</summary><form className="composer" onSubmit={saveRecord}><label htmlFor="record">Este conteúdo será salvo como relato seu, sem alegação de verificação.</label><textarea id="record" required maxLength={6000} value={record} onChange={e => setRecord(e.target.value)} rows={3} placeholder="O que você quer preservar como relato?"/><button className="secondary" disabled={busy}>Salvar relato</button></form></details><section className="section-heading"><h2>Registros recentes</h2><Link href="/activity">Ver atividade ↗</Link></section>{initial.records.length ? <div className="cards">{initial.records.slice(-3).reverse().map(item => <article className="card" key={item.id}><small>RELATADO POR VOCÊ · {new Date(item.created_at).toLocaleDateString("pt-BR")}</small><p className="record-text">{item.content}</p><span className="badge">OriginalRecord · intenção privada</span></article>)}</div> : <div className="empty"><h3>Seu trabalho pode começar aqui.</h3><p>Uma conversa pode explorar uma ideia; um relato só é criado quando você escolhe registrar.</p></div>}</>}
      {section === "cells" && <><p className="eyebrow">UM LUGAR PARA CONTINUAR</p><h1>{initial.cell.name}</h1><p className="lead">A Célula Zero reúne propósito, relações e trabalho que seguem entre sessões.</p><section className="panel"><span className="badge">SUA RELAÇÃO</span><h2>Marcos · integrante</h2><p>Seu acesso deriva de uma relação registrada. Entrar não concede autoridade para alterar políticas ou dados da célula.</p><p><strong>Direção atual</strong><br/>Usar capacidades maduras existentes para tornar a Célula Zero uma experiência humana habitável, preservando autoridade, proveniência e continuidade.</p><Link className="secondary" href="/">Continuar conversa ↗</Link></section><section><div className="section-heading"><h2>Trabalho aberto</h2><a href="https://github.com/MMaia-jr/celula-zero/issues" target="_blank" rel="noreferrer">GitHub ↗</a></div>{workItems.length ? <div className="cards">{workItems.map(item => <article className="card" key={item.number}><small>ISSUE #{item.number} · ATUALIZADO {new Date(item.updated_at).toLocaleDateString("pt-BR")}</small><h3>{item.title}</h3><a href={item.html_url} target="_blank" rel="noreferrer">Ver no GitHub ↗</a></article>)}</div> : <p className="quiet">A lista pública não está disponível agora. O trabalho permanece no repositório canônico.</p>}</section></>}
      {section === "activity" && <><p className="eyebrow">O QUE PERMANECE</p><h1>Atividade e continuidade.</h1><p className="lead">Conversa persistente e relatos atribuídos aparecem separados.</p><div className="section-heading"><h2>Relatos Originais</h2></div>{initial.records.length ? <div className="cards">{initial.records.slice().reverse().map(item => <article className="card" key={item.id}><small>{new Date(item.created_at).toLocaleString("pt-BR")}</small><p>{item.content}</p><span className="badge">Relato Original · Marcos</span></article>)}</div> : <div className="empty">Ainda não há relatos registrados.</div>}<div className="section-heading"><h2>Conversa recente</h2><Link href="/">Continuar ↗</Link></div>{initialMessages.length ? <div className="activity-thread">{initialMessages.slice(-10).map(message => <article className="activity-message" key={message.id}><small>{message.role === "user" ? "MARCOS" : "ASSISTENTE DA CÉLULA ZERO"}</small><p>{message.parts.filter(part => part.type === "text").map(part => part.text).join("")}</p></article>)}</div> : <div className="empty">A conversa começa na página inicial.</div>}</>}
      {section === "you" && <><p className="eyebrow">PRESENÇA E IDENTIDADE</p><h1>Seu perfil.</h1><section className="profile-hero"><span className="avatar large">{profileName.slice(0, 1)}</span><div><h2>{profileName}</h2><p>{profileBio || "Conte o que seria útil saber sobre você."}</p><small>Pessoa: {initial.person.name}. E-mail é credencial de acesso, não identidade institucional.</small></div></section><form className="profile-form" onSubmit={saveProfile}><label htmlFor="profile-name">Nome de exibição</label><input id="profile-name" value={profileName} maxLength={80} onChange={e => setProfileName(e.target.value)}/><label htmlFor="profile-bio">Sobre você</label><textarea id="profile-bio" value={profileBio} maxLength={1000} rows={4} onChange={e => setProfileBio(e.target.value)}/><button className="secondary" disabled={busy}>Atualizar meu perfil</button></form><section className="panel"><h2>Relações</h2><p>{initial.cell.name} · relação registrada</p></section></>}
      {notice && <p role="status" className="notice">{notice}</p>}{error && <p role="alert" className="error">{error}</p>}
    </main><footer>Seu contexto tem origem e autoria. <Link href="/activity">Rever sua atividade ↗</Link></footer></div>
  </div>;
}
