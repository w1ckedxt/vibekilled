import { NextRequest, NextResponse } from "next/server";
import { react } from "@/lib/store";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["good4u", "sympathy", "handshake", "view"]);

// POST /api/pins/:id/react  body: { action: "good4u" | "sympathy" | "view" }
// Per-user dedupe (one Good4U / Sympathy per pin) is enforced client-side via
// localStorage — this is a feel-good toy, not a bank, so we keep the write path
// trivially fast and cacheable rather than tracking voter identities server-side.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let action = "";
  let reactorId = "";
  try {
    const body = await req.json();
    action = String(body.action ?? "");
    reactorId = String(body.userId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!ALLOWED.has(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  // Throttle reactions per IP (spam guard).
  const rl = await rateLimit("react", clientIp(req.headers), 200, 60);
  if (!rl.ok) return NextResponse.json({ error: "rate" }, { status: 429 });

  // Coarse country of whoever reacted → lets the feed read "🇳🇱 → 🇧🇷".
  const actorCountry = req.headers.get("x-vercel-ip-country") ?? undefined;
  const pin = await react(
    id,
    action as "good4u" | "sympathy" | "handshake" | "view",
    reactorId || undefined,
    actorCountry,
  );
  if (!pin) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ pin });
}
