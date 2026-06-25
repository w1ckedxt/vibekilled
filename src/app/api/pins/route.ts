import { NextRequest, NextResponse } from "next/server";
import { createPin, getUserActivePin, listPins } from "@/lib/store";
import { obfuscate, placeLabel } from "@/lib/geo";
import { devName } from "@/lib/names";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderId } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/pins — every active + recently-resurrected pin for the map.
export async function GET() {
  const pins = await listPins();
  return NextResponse.json(
    { pins },
    // Short shared-cache window so a flood of viewers collapses into few origin
    // reads while the map still feels live.
    { headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=8" } },
  );
}

interface Body {
  userId?: string;
  name?: string;
  provider?: string;
  recoveryMinutes?: number;
  lat?: number;
  lng?: number;
  shareLocation?: boolean;
  message?: string;
}

function ipCoords(req: NextRequest): { lat: number; lng: number } | null {
  const lat = req.headers.get("x-vercel-ip-latitude");
  const lng = req.headers.get("x-vercel-ip-longitude");
  if (lat && lng) return { lat: Number(lat), lng: Number(lng) };
  return null;
}

// POST /api/pins — log a kill ("I've hit it :(").
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userId = (body.userId ?? "").trim();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const provider = (body.provider ?? "other") as ProviderId;
  if (!PROVIDERS[provider]) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });

  const recoveryMinutes = Math.round(Number(body.recoveryMinutes));
  if (!Number.isFinite(recoveryMinutes) || recoveryMinutes < 1 || recoveryMinutes > 1440) {
    return NextResponse.json({ error: "recoveryMinutes must be 1–1440" }, { status: 400 });
  }

  // Anti-abuse: you can only have one active wall at a time. You must wait out
  // your own recovery timer before logging another.
  const existing = await getUserActivePin(userId);
  if (existing) {
    return NextResponse.json(
      { error: "active", message: "You're still down. Wait for your own resurrection before logging another.", pinId: existing },
      { status: 409 },
    );
  }

  // Resolve a coarse, jittered location. Precise GPS is never stored.
  const ip = ipCoords(req);
  let source: { lat: number; lng: number } | null = null;
  if (body.shareLocation && typeof body.lat === "number" && typeof body.lng === "number") {
    source = { lat: body.lat, lng: body.lng };
  } else if (ip) {
    source = ip;
  }
  // Last resort when we truly have nothing: drop somewhere over the ocean of despair.
  if (!source) source = { lat: 20 + Math.random() * 30, lng: -40 + Math.random() * 80 };

  const { lat, lng } = obfuscate(source.lat, source.lng);
  const place = placeLabel(req.headers.get("x-vercel-ip-country"));
  const name = (body.name ?? "").trim() || devName();
  const message = (body.message ?? "").trim().slice(0, 140) || undefined;

  try {
    const result = await createPin({ userId, provider, lat, lng, recoveryMinutes, name, message, place });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "NO_DB") {
      return NextResponse.json({ error: "Database not configured yet. Link Upstash Redis on Vercel." }, { status: 503 });
    }
    throw e;
  }
}
