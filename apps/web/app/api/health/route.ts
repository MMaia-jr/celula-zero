import { NextResponse } from "next/server";
import { getSupabasePublicEnvironment } from "@/lib/supabase/config";

export function GET() {
  return NextResponse.json({
    status: "ok",
    gate: 1,
    mode: getSupabasePublicEnvironment() ? "local-supabase" : "seed-read-only",
    financialMovement: false,
    externalPublication: false,
  });
}
