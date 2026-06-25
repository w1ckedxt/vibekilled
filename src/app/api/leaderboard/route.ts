import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/leaderboard — the global Vibe King ranking (good4u + sympathy).
export async function GET() {
  const leaderboard = await getLeaderboard(10);
  return NextResponse.json(
    { leaderboard },
    { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15" } },
  );
}
