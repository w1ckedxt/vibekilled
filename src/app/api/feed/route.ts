import { NextResponse } from "next/server";
import { getFeed } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/feed — the global live feed of recent kills / resurrections / love.
export async function GET() {
  const events = await getFeed();
  return NextResponse.json(
    { events },
    { headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=8" } },
  );
}
