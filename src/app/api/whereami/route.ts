import { NextRequest, NextResponse } from "next/server";
import { ensureLocalAmbientPins } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/whereami — the visitor's own COARSE location (from edge IP geo), used
// purely to center the map on their area on arrival. Per-visitor + never cached.
// Side effect: seeds a small cluster of ambient devs near them (throttled) so
// their neighbourhood looks alive too. Coords are rounded to ~11km — coarse by
// design, and only ever shown back to the same visitor.
export async function GET(req: NextRequest) {
  const rawLat = req.headers.get("x-vercel-ip-latitude");
  const rawLng = req.headers.get("x-vercel-ip-longitude");
  const country = req.headers.get("x-vercel-ip-country") ?? undefined;

  const lat = rawLat ? Number(rawLat) : NaN;
  const lng = rawLng ? Number(rawLng) : NaN;
  const known = Number.isFinite(lat) && Number.isFinite(lng);

  if (known) await ensureLocalAmbientPins(lat, lng, country);

  return NextResponse.json(
    { loc: known ? { lat: Number(lat.toFixed(1)), lng: Number(lng.toFixed(1)) } : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
