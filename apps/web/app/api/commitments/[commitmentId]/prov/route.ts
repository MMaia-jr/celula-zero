import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCommitmentHistory } from "@/lib/data/history";
import { toProvJsonLd } from "@/lib/domain/prov";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commitmentId: string }> },
) {
  const { commitmentId } = await params;
  if (!z.string().uuid().safeParse(commitmentId).success) {
    return NextResponse.json({ error: "invalid commitment" }, { status: 400 });
  }

  const result = await getCommitmentHistory(commitmentId);
  if (result.status === "ANONYMOUS") {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }
  if (result.status === "DENIED") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (result.status === "UNAVAILABLE") {
    return NextResponse.json({ error: "backend unavailable" }, { status: 503 });
  }
  if (result.status !== "READY") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(
    toProvJsonLd(result.history, request.nextUrl.origin),
    {
      headers: {
        "Content-Type": "application/ld+json; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    },
  );
}
