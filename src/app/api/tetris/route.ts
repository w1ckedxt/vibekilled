import { NextRequest, NextResponse } from "next/server";
import { recordTetris } from "@/lib/store";
import { provider } from "@/lib/providers";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const MAX_SCORE = 10_000_000;
const MAX_LINES = 100_000;

function clamp(n: unknown, max: number): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(v, max);
}

// POST /api/tetris — log a finished Campfire Tetris game. Only real, down devs
// (an active pin) actually count; everyone else gets a silent no-op. Throttled
// so a tab can't hammer the journey with fake games.
export async function POST(req: NextRequest) {
  const rl = await rateLimit("tetris", clientIp(req.headers), 30, 60);
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });

  let body: { userId?: string; name?: string; provider?: string; score?: number; lines?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userId = String(body.userId ?? "").trim();
  if (!userId) return NextResponse.json({ ok: false }, { status: 200 });

  const counted = await recordTetris({
    userId,
    name: String(body.name ?? "Anonymous Dev").slice(0, 40),
    provider: provider(String(body.provider ?? "other")).id,
    score: clamp(body.score, MAX_SCORE),
    lines: clamp(body.lines, MAX_LINES),
  });

  return NextResponse.json({ ok: counted }, { headers: { "Cache-Control": "no-store" } });
}
