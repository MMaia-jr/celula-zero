import { NextResponse } from "next/server";
import { getGenesisSession } from "@/lib/genesis/records";

export async function POST() {
  const session = await getGenesisSession();
  if (session.status !== "READY") return NextResponse.json({ status: "UNAVAILABLE", reason: "Authenticated Profile/PERSON relation required." }, { status: 401 });
  return NextResponse.json({
    status: "PREPARED_UNAVAILABLE",
    reason: "Online dispatch requires the existing persistent worker path to preserve authorization, budget, provider result, cost, and candidate provenance. This web candidate does not bypass it.",
    humanDirection: false,
  }, { status: 503 });
}
