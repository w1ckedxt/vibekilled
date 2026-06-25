import { NextRequest, NextResponse } from "next/server";
import { heartbeat } from "@/lib/store";

export const dynamic = "force-dynamic";

// POST /api/presence — heartbeat from a viewer; returns current online count.
export async function POST(req: NextRequest) {
  let sessionId = "anon";
  try {
    sessionId = String((await req.json()).sessionId ?? "anon").slice(0, 48) || "anon";
  } catch {
    /* keep default */
  }
  const country = req.headers.get("x-vercel-ip-country") ?? undefined;
  const online = await heartbeat(sessionId, country);
  return NextResponse.json({ online }, { headers: { "Cache-Control": "no-store" } });
}
