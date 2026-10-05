// SPDX-License-Identifier: MPL-2.0
import { NextRequest, NextResponse } from "next/server";
import { completeConnectionOAuth, parseProvider } from "../../../../../lib/connections/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider: value } = await context.params;
  const provider = parseProvider(value);
  return provider ? completeConnectionOAuth(request, provider) : NextResponse.json({ error: "Provedor desconhecido." }, { status: 404 });
}
