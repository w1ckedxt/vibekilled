import { NextRequest, NextResponse } from "next/server";
import { getUserStats } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/me?userId=... — your all-time received love + leaderboard rank.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "";
  const stats = await getUserStats(userId);
  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
}
