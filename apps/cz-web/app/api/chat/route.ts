// SPDX-License-Identifier: MPL-2.0
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { convertToModelMessages, stepCountIs, streamText, tool, zodSchema } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { compileInstitutionalContext, extractPlainText, lastUserMessage, type ChatMessage } from "../../../lib/chat";
import { getHabitatContext } from "../../../lib/habitat-context";
import { isFounderCredential } from "../../../lib/founder-credential";
import { readCanonicalCellDirection } from "../../../lib/canonical-state";
import { habitatClient } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 100_000)
    return NextResponse.json({ error: "Pedido muito grande." }, { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const parsed = z.object({ messages: z.array(z.unknown()).min(1).max(80) }).safeParse(body);
  const userMessage = parsed.success ? lastUserMessage(parsed.data.messages) : null;
  if (!userMessage) return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });

  const client = await habitatClient();
  if (!client) return NextResponse.json({ error: "Entre para continuar." }, { status: 401 });
  const { data: { user } } = await client.auth.getUser();
  if (!user || !isFounderCredential(user.email, process.env.CZ_FOUNDER_EMAIL))
    return NextResponse.json({ error: "Entre para continuar." }, { status: 401 });

  const { data: threadId, error: threadError } = await client.rpc("cz_vnext_ensure_mvp_thread");
  if (threadError || typeof threadId !== "string")
    return NextResponse.json({ error: "Não foi possível abrir sua conversa." }, { status: 403 });
  const persistedUser = { ...userMessage, parts: userMessage.parts };
  const { error: writeError } = await client.rpc("cz_vnext_append_mvp_message", {
    p_thread_id: threadId, p_message_id: persistedUser.id, p_parent_id: null,
    p_role: "user", p_source: "person", p_message: persistedUser,
  });
  if (writeError) return NextResponse.json({ error: "Sua mensagem não pôde ser persistida." }, { status: 403 });

  try {
    const context = await getHabitatContext(client);
    const canonicalDirection = await readCanonicalCellDirection();
    const { data: rows, error: readError } = await client.from("cz_vnext_messages")
      .select("message,role,created_at").eq("thread_id", threadId)
      .order("created_at", { ascending: true }).limit(60);
    if (readError) throw readError;
    const messages = (rows ?? []).map((row) => row.message as ChatMessage).slice(-14);
    const recentText = messages.map((m) => `${m.role}: ${extractPlainText(m)}`);
    const model = gateway("google/gemini-2.5-flash-lite");
    const result = streamText({
      model,
      system: compileInstitutionalContext(context, recentText, canonicalDirection ?? undefined),
      messages: await convertToModelMessages(messages as never),
      maxOutputTokens: 700,
      tools: {
        get_current_context: tool({
          description: "Leia a identidade, relação com a Célula e continuidade relevante já autorizadas para esta conversa.",
          inputSchema: zodSchema(z.object({})),
          execute: async () => ({ person: context.person.name, profile: context.profile, cell: context.cell, recentRecords: context.records.slice(-5) }),
        }),
        list_recent_records: tool({
          description: "Liste os relatos Originais privados recentes; eles são relatos, não evidência verificada.",
          inputSchema: zodSchema(z.object({})),
          execute: async () => context.records.slice(-8).map((record) => ({
            ...record, content: record.content.slice(0, 1500),
          })),
        }),
        list_cell_work: tool({
          description: "Liste trabalho CZ em andamento nesta Cell e issues canônicas públicas do GitHub como referência. Não altere o GitHub.",
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            const response = await fetch("https://api.github.com/repos/MMaia-jr/celula-zero/issues?state=open&per_page=8", { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, cache: "no-store", signal: AbortSignal.timeout(5000) });
            if (!response.ok) return { available: true, workItems: context.workItems, externalSourceAvailable: false, source: "https://github.com/MMaia-jr/celula-zero/issues" };
            const items = await response.json() as Array<{ number: number; title: string; html_url: string; updated_at: string; pull_request?: unknown }>;
            return { available: true, workItems: context.workItems, externalSourceAvailable: true, source: "https://github.com/MMaia-jr/celula-zero/issues", items: items.filter((item) => !item.pull_request).slice(0, 6) };
          },
        }),
        propose_work: tool({
          description: "Proponha criar um item simples de trabalho da Célula Zero quando Marcos quiser levar uma intenção ou próximo passo adiante. Isso apenas apresenta uma proposta no chat; só o clique de confirmação humano chama o servidor para persistir.",
          inputSchema: zodSchema(z.object({ title: z.string().trim().min(1).max(160), description: z.string().max(2000).default(""), status: z.enum(["open", "in_progress"]).default("open") })),
          execute: async (proposal, { toolCallId }) => ({ ...proposal, proposalId: toolCallId, kind: "create_work", saved: false }),
        }),
        propose_work_update: tool({
          description: "Proponha mudar o estado de um item de trabalho existente (aberto, em andamento ou concluído). Leia o item desta Cell antes. O servidor apenas grava após confirmação explícita no chat.",
          inputSchema: zodSchema(z.object({ workId: z.string().uuid(), status: z.enum(["open", "in_progress", "done"]) })),
          execute: async (proposal, { toolCallId }) => {
            const { data, error } = await client.from("cz_vnext_work_items").select("id,title,description,status,updated_at").eq("id", proposal.workId).maybeSingle();
            if (error || !data) return { proposalId: toolCallId, kind: "update_work", available: false };
            return { proposalId: toolCallId, kind: "update_work", available: true, current: data, status: proposal.status, saved: false };
          },
        }),
        propose_original_record: tool({
          description: "Prepare uma proposta de Original Record a partir de uma declaração explícita de Marcos. Isso não salva automaticamente. Mostre o conteúdo e peça confirmação no próprio cartão da conversa.",
          inputSchema: zodSchema(z.object({ content: z.string().trim().min(1).max(2000) })),
          execute: async ({ content }, { toolCallId }) => ({ kind: "original_record", content, proposalId: toolCallId, saved: false }),
        }),
        propose_profile_update: tool({
          description: "Prepare uma atualização opcional do Profile com base no que Marcos explicitamente declarou. Não inferir capacidades nem transformar experiência em evidência. Mostre as mudanças e solicite confirmação no cartão do chat.",
          inputSchema: zodSchema(z.object({ displayName: z.string().trim().min(1).max(80), bio: z.string().max(800) })),
          execute: async (proposal, { toolCallId }) => ({ kind: "profile_update", ...proposal, proposalId: toolCallId, saved: false }),
        }),
        read_canonical_cz_state: tool({
          description: "Leia o estado canônico público atual da Célula Zero no GitHub.",
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            const response = await fetch("https://api.github.com/repos/MMaia-jr/celula-zero/contents/STATE.md", { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, cache: "no-store", signal: AbortSignal.timeout(5000) });
            if (!response.ok) return { available: false };
            const file = await response.json() as { sha: string; content: string; encoding: string };
            if (file.encoding !== "base64") return { available: false };
            return { available: true, source: "https://github.com/MMaia-jr/celula-zero/blob/main/STATE.md", blob: file.sha, state: Buffer.from(file.content, "base64").toString("utf8").slice(0, 12000) };
          },
        }),
      },
      stopWhen: stepCountIs(3),
      onError: ({ error }) => console.error("CZ_CHAT_MODEL_ERROR", error instanceof Error ? error.name : "unknown"),
    });
    return result.toUIMessageStreamResponse({
      originalMessages: messages as never,
      generateMessageId: () => randomUUID(),
      onEnd: async ({ responseMessage, isAborted }) => {
        if (isAborted || responseMessage.role !== "assistant") return;
        const usage = await Promise.resolve(result.usage).catch(() => undefined);
        const responseMetadata = await Promise.resolve(result.response).catch(() => undefined);
        const { error } = await client.rpc("cz_vnext_append_mvp_message", {
          p_thread_id: threadId, p_message_id: responseMessage.id,
          p_parent_id: persistedUser.id, p_role: "assistant", p_source: "model",
          p_message: responseMessage, p_provider: "vercel-ai-gateway",
          p_model_id: "google/gemini-2.5-flash-lite",
          p_response_id: responseMetadata?.id ?? null,
          p_input_tokens: usage?.inputTokens ?? null, p_output_tokens: usage?.outputTokens ?? null,
        });
        if (error) console.error("CZ_CHAT_PERSIST_ASSISTANT_FAILED", error.code ?? "unknown");
      },
    });
  } catch (error) {
    console.error("CZ_CHAT_REQUEST_FAILED", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "A conversa está temporariamente indisponível. Sua mensagem foi preservada." }, { status: 503 });
  }
}
