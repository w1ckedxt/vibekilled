import { NextRequest, NextResponse } from "next/server";
import { getAdminStats } from "@/lib/store";
import { adminConfigured, checkAdmin } from "@/lib/admin";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET /api/admin/stats — guarded dashboard data. Requires x-admin-token header.
export async function GET(req: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Admin not configured. Set ADMIN_TOKEN." }, { status: 503 });
  }
  // Throttle auth attempts to blunt brute-forcing.
  const rl = await rateLimit("admin", clientIp(req.headers), 30, 60);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  if (!checkAdmin(req.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getAdminStats();
  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
}
