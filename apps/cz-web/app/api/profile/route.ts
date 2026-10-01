// SPDX-License-Identifier: MPL-2.0
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isFounderCredential } from "../../../lib/founder-credential";
import { habitatClient } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const parsed = z.object({ displayName: z.string().trim().min(1).max(80), bio: z.string().max(1000) }).strict().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Revise o nome e a apresentação." }, { status: 400 });
  const client = await habitatClient();
  if (!client) return NextResponse.json({ error: "Entre para continuar." }, { status: 401 });
  const { data: { user } } = await client.auth.getUser();
  if (!user || !isFounderCredential(user.email, process.env.CZ_FOUNDER_EMAIL))
    return NextResponse.json({ error: "Entre para continuar." }, { status: 401 });
  const { data, error } = await client.rpc("cz_vnext_update_own_profile", {
    p_display_name: parsed.data.displayName, p_bio: parsed.data.bio,
  });
  if (error) return NextResponse.json({ error: "Perfil não atualizado; sua identidade precisa ser resolvida." }, { status: 403 });
  return NextResponse.json({ profile: data });
}
