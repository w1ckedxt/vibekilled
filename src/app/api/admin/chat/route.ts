import { NextRequest, NextResponse } from "next/server";
import { postChat, deleteChatMessage } from "@/lib/store";
import { adminConfigured, checkAdmin } from "@/lib/admin";
import { moderateMessage, moderateName } from "@/lib/moderation";
import { providerForName } from "@/lib/providers";
import { devName } from "@/lib/names";

export const dynamic = "force-dynamic";

function guard(req: NextRequest): NextResponse | null {
  if (!adminConfigured()) return NextResponse.json({ error: "Admin not configured." }, { status: 503 });
  if (!checkAdmin(req.headers)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

// POST /api/admin/chat — drop a message into the campfire as a regular-looking dev.
// The admin picks a name (or leaves it blank for a random one) so visitors can't
// tell the host is seeding the conversation. No badge, no pin gate.
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  let text = "";
  let rawName = "";
  try {
    const body = await req.json();
    text = String(body.text ?? "");
    rawName = String(body.name ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Same link-stripping/hate filter as everyone else.
  const mod = moderateMessage(text);
  if (!mod.ok) return NextResponse.json({ error: "moderation", message: mod.reason }, { status: 422 });
  const clean = (mod.text ?? "").trim();
  if (!clean) return NextResponse.json({ error: "empty", message: "Say something." }, { status: 422 });

  // Same alias rules as real users (no slurs/links/reserved names); blank → random.
  const modName = moderateName(rawName);
  if (!modName.ok) return NextResponse.json({ error: "moderation", message: modName.reason }, { status: 422 });
  const name = modName.text || devName();

  // No userId → stays out of medal/journey counters. staff → admin-only marker,
  // stripped from the public feed so it reads as just another dev at the fire.
  const message = await postChat({ name, provider: providerForName(name), text: clean, staff: true });
  return NextResponse.json({ message }, { status: 201 });
}

// DELETE /api/admin/chat — remove any campfire message by id.
export async function DELETE(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  let id = "";
  try {
    id = String((await req.json()).id ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const removed = await deleteChatMessage(id);
  return NextResponse.json({ removed }, { status: removed ? 200 : 404 });
}
