// SPDX-License-Identifier: MPL-2.0
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isFounderCredential } from "../../../lib/founder-credential";
import { habitatClient } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("create_work"), actionId: z.string().trim().min(1).max(160), title: z.string().trim().min(1).max(160), description: z.string().max(2000), status: z.enum(["open", "in_progress"]) }).strict(),
  z.object({ kind: z.literal("update_work"), actionId: z.string().trim().min(1).max(160), workId: z.string().uuid(), status: z.enum(["open", "in_progress", "done"]) }).strict(),
  z.object({ kind: z.literal("original_record"), actionId: z.string().trim().min(1).max(160), content: z.string().trim().min(1).max(6000) }).strict(),
  z.object({ kind: z.literal("profile_update"), actionId: z.string().trim().min(1).max(160), displayName: z.string().trim().min(1).max(80), bio: z.string().max(800) }).strict(),
]);

function actionRequestKey(actionId: string): string {
  const bytes = createHash("sha256").update("cz-vnext-confirmed-action:").update(actionId).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 9000)
    return NextResponse.json({ error: "Proposta muito longa." }, { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Revise a proposta antes de confirmar." }, { status: 400 });

  const client = await habitatClient();
  if (!client) return NextResponse.json({ error: "Entre para continuar." }, { status: 401 });
  const { data: { user } } = await client.auth.getUser();
  if (!user || !isFounderCredential(user.email, process.env.CZ_FOUNDER_EMAIL))
    return NextResponse.json({ error: "Entre para continuar." }, { status: 401 });

  const action = parsed.data;
  let result: unknown;
  if (action.kind === "create_work") {
    const { data, error } = await client.rpc("cz_vnext_mvp_work", {
      p_action: "create", p_work_id: null, p_title: action.title,
      p_description: action.description, p_status: action.status,
      p_request_key: actionRequestKey(action.actionId),
    });
    if (error) return NextResponse.json({ error: "O trabalho não pôde ser confirmado." }, { status: 403 });
    result = data;
  } else if (action.kind === "update_work") {
    const { data, error } = await client.rpc("cz_vnext_mvp_work", {
      p_action: "update", p_work_id: action.workId, p_title: null,
      p_description: null, p_status: action.status,
      p_request_key: actionRequestKey(action.actionId),
    });
    if (error) return NextResponse.json({ error: "O estado do trabalho não pôde ser confirmado." }, { status: 403 });
    result = data;
  } else if (action.kind === "original_record") {
    const { data, error } = await client.rpc("cz_vnext_record_intention", {
      p_content: action.content, p_request_key: actionRequestKey(action.actionId),
    });
    if (error) return NextResponse.json({ error: "O relato não pôde ser registrado." }, { status: 403 });
    result = { id: data, recordKind: "OriginalRecord", confirmedBy: "person" };
  } else {
    const { data, error } = await client.rpc("cz_vnext_update_own_profile", {
      p_display_name: action.displayName, p_bio: action.bio,
    });
    if (error) return NextResponse.json({ error: "O perfil não pôde ser atualizado." }, { status: 403 });
    result = data;
  }
  return NextResponse.json({ ok: true, kind: action.kind, result });
}
