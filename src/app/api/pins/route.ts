import { NextRequest, NextResponse } from "next/server";
import { createPin, getUserActivePin, getUserCooldown, listPins } from "@/lib/store";
import { obfuscate, placeLabel, hubForSeed } from "@/lib/geo";
import { devName } from "@/lib/names";
import { moderateMessage, moderateName } from "@/lib/moderation";
import { rateLimit, clientIp } from "@/lib/ratelimit";
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

  // Throttle pin creation per IP (bot/spam guard).
  const rl = await rateLimit("create", clientIp(req.headers), 30, 3600);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate", message: "Whoa, slow down. Even rate limits have rate limits." }, { status: 429 });
  }

  const recoveryMinutes = Math.round(Number(body.recoveryMinutes));
  if (!Number.isFinite(recoveryMinutes) || recoveryMinutes < 1 || recoveryMinutes > 1440) {
    return NextResponse.json({ error: "recoveryMinutes must be 1–1440" }, { status: 400 });
  }

  // Anti-abuse: you can only have one active wall at a time. You must wait out
  // your own recovery timer before logging another. (Bypassed in dev mode.)
  const devMode = process.env.VIBEKILLED_DEV === "1";
  const existing = devMode ? null : await getUserActivePin(userId);
  if (existing) {
    return NextResponse.json(
      { error: "active", message: "You're still down. Wait for your own resurrection before logging another.", pinId: existing },
      { status: 409 },
    );
  }

  // Post-resurrection cooldown: can't claim a fresh wall for 3h after coming back.
  if (!devMode) {
    const cd = await getUserCooldown(userId);
    if (cd > 0) {
      const hrs = Math.max(1, Math.ceil(cd / 3600));
      return NextResponse.json(
        { error: "cooldown", message: `You *just* came back. Touch grass for ~${hrs}h before the next wall. 🌱` },
        { status: 429 },
      );
    }
  }

  // Resolve a coarse, jittered location. Precise GPS is never stored.
  const ip = ipCoords(req);
  let source: { lat: number; lng: number } | null = null;
  if (body.shareLocation && typeof body.lat === "number" && typeof body.lng === "number") {
    source = { lat: body.lat, lng: body.lng };
  } else if (ip) {
    source = ip;
  }
  // Last resort when we truly have nothing (e.g. localhost has no IP headers):
  // drop on a stable dev hub keyed by user — on land, and no teleporting.
  if (!source) source = hubForSeed(userId);

  const { lat, lng } = obfuscate(source.lat, source.lng);
  const country = req.headers.get("x-vercel-ip-country") ?? undefined;
  const place = placeLabel(country);
  // Moderate the alias/status name: strip links, reject hate speech. Falls back
  // to a generated dev name when empty (or empty after stripping).
  const moderatedName = moderateName(body.name);
  if (!moderatedName.ok) {
    return NextResponse.json({ error: "moderation", message: moderatedName.reason }, { status: 422 });
  }
  const name = moderatedName.text || devName();

  // Moderate last words: strip links, allow profanity, reject hate speech.
  const moderated = moderateMessage(body.message);
  if (!moderated.ok) {
    return NextResponse.json({ error: "moderation", message: moderated.reason }, { status: 422 });
  }
  const message = moderated.text;

  try {
    const result = await createPin({ userId, provider, lat, lng, recoveryMinutes, name, message, place, country });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "NO_DB") {
      return NextResponse.json({ error: "Database not configured yet. Link Upstash Redis on Vercel." }, { status: 503 });
    }
    throw e;
  }
}
