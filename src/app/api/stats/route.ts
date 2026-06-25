import { NextResponse } from "next/server";
import { getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/stats — global counters (kills / resurrections / active).
export async function GET() {
  const stats = await getStats();
  return NextResponse.json(
    { stats },
    { headers: { "Cache-Control": "public, s-maxage=3, stale-while-revalidate=10" } },
  );
}
