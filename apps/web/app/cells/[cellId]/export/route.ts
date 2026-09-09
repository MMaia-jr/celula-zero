import { NextResponse } from "next/server";
import { getCellOperatingContext } from "@/lib/data/cell-context";
import { toPortableCell } from "@/lib/domain/export-cell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ cellId: string }> }) {
  const { cellId } = await params;
  const client = await createSupabaseServerClient();
  if (!client) return NextResponse.json({ error: "backend_unavailable" }, { status: 503 });
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const context = await getCellOperatingContext(cellId);
  if (!context) return NextResponse.json({ error: "cell_not_found_or_not_visible" }, { status: 404 });
  return NextResponse.json(toPortableCell(context), { headers: { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${context.cell.slug}.cz.cell.v1.json"` } });
}
