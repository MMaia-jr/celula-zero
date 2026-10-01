// SPDX-License-Identifier: MPL-2.0
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getHabitatContext } from "../../../lib/habitat-context";
import { habitatClient } from "../../../lib/supabase";
import { isFounderCredential } from "../../../lib/founder-credential";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorizedClient() {
  const client = await habitatClient();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  const allowlisted = process.env.CZ_FOUNDER_EMAIL;
  if (!user || !isFounderCredential(user.email, allowlisted)) return null;
  return client;
}

export async function GET() {
  try {
    const client = await authorizedClient();
    if (!client) return NextResponse.json({ error: "Entre para continuar." }, { status: 401 });
    return NextResponse.json({ context: await getHabitatContext(client) });
  } catch {
    return NextResponse.json({ error: "Não foi possível reconstruir seu contexto." }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 8000)
    return NextResponse.json({ error: "Texto muito longo." }, { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const parsed = z.object({ content: z.string().trim().min(1).max(6000), requestKey: z.string().uuid().optional() }).strict().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Revise o texto antes de salvar." }, { status: 400 });

  const client = await authorizedClient();
  if (!client) return NextResponse.json({ error: "Entre para continuar." }, { status: 401 });
  const { error } = await client.rpc("cz_vnext_record_intention", {
    p_content: parsed.data.content,
    p_request_key: parsed.data.requestKey ?? randomUUID(),
  });
  if (error) {
    console.error("CZ_HABITAT_WRITE_FAILED", error.code ?? "unknown");
    return NextResponse.json({ error: "O registro não foi confirmado. Tente novamente." }, { status: 403 });
  }
  try { return NextResponse.json({ context: await getHabitatContext(client) }); }
  catch { return NextResponse.json({ error: "Registro salvo; recarregue para atualizar o contexto." }, { status: 202 }); }
}
