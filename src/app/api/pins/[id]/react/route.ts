import { NextRequest, NextResponse } from "next/server";
import { react } from "@/lib/store";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["good4u", "sympathy", "view"]);

// POST /api/pins/:id/react  body: { action: "good4u" | "sympathy" | "view" }
// Per-user dedupe (one Good4U / Sympathy per pin) is enforced client-side via
// localStorage — this is a feel-good toy, not a bank, so we keep the write path
// trivially fast and cacheable rather than tracking voter identities server-side.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let action = "";
  try {
    action = String((await req.json()).action ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!ALLOWED.has(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const pin = await react(id, action as "good4u" | "sympathy" | "view");
  if (!pin) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ pin });
}
