import { NextResponse } from "next/server";
import { getPin } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/pins/:id — single pin (used to poll your own session stats + timer).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const pin = await getPin(id);
  if (!pin) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ pin });
}
