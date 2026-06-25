import { NextRequest, NextResponse } from "next/server";
import { getChat, getUserActivePin, postChat } from "@/lib/store";
import { moderateMessage } from "@/lib/moderation";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { PROVIDERS } from "@/lib/providers";
import { devName } from "@/lib/names";
import type { ProviderId } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/chat?userId=... — the Campfire is only visible to devs who are down.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "";
  if (!userId || !(await getUserActivePin(userId))) {
    return NextResponse.json(
      { error: "locked", message: "The Campfire is only for devs behind the wall. Drop a pin to see it. 🔥" },
      { status: 403 },
    );
  }
  const messages = await getChat();
  return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}

interface Body {
  userId?: string;
  name?: string;
  provider?: string;
  text?: string;
}

// POST /api/chat — only devs who've set a timer (have an active pin) may speak.
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userId = (body.userId ?? "").trim();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  // Gate: must currently be in the waiting room.
  const active = await getUserActivePin(userId);
  if (!active) {
    return NextResponse.json(
      { error: "locked", message: "The Campfire is only for devs who are down. Drop a pin to pull up a log. 🔥" },
      { status: 403 },
    );
  }

  // Rate limit chatter.
  const rl = await rateLimit("chat", clientIp(req.headers), 12, 60);
  if (!rl.ok) return NextResponse.json({ error: "rate", message: "Easy, chatterbox. Give the fire a sec." }, { status: 429 });

  // Moderate: strip links, allow venting/profanity, reject hate.
  const mod = moderateMessage(body.text);
  if (!mod.ok) return NextResponse.json({ error: "moderation", message: mod.reason }, { status: 422 });
  const text = (mod.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "empty", message: "Say something warm (no links)." }, { status: 422 });

  const provider = (body.provider ?? "other") as ProviderId;
  const name = (body.name ?? "").trim() || devName();

  const message = await postChat(
    {
      name,
      provider: PROVIDERS[provider] ? provider : "other",
      text,
    },
    userId,
  );
  return NextResponse.json({ message }, { status: 201 });
}
