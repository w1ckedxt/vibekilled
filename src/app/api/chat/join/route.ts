import { NextRequest, NextResponse } from "next/server";
import { getUserActivePin, joinCampfire } from "@/lib/store";

export const dynamic = "force-dynamic";

// POST /api/chat/join — register campfire presence; returns real-human count.
export async function POST(req: NextRequest) {
  let userId = "";
  try {
    userId = String((await req.json()).userId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!userId || !(await getUserActivePin(userId))) {
    return NextResponse.json({ live: 0 }, { status: 200 });
  }
  const live = await joinCampfire(userId);
  return NextResponse.json({ live }, { headers: { "Cache-Control": "no-store" } });
}
