import { NextRequest, NextResponse } from "next/server";
import { postChat, deleteChatMessage } from "@/lib/store";
import { adminConfigured, checkAdmin } from "@/lib/admin";
import { moderateMessage } from "@/lib/moderation";

export const dynamic = "force-dynamic";

// The official host identity in the campfire. Posting as this name is admin-only;
// regular users are blocked from it by RESERVED_NAMES in moderation.
const HOST_NAME = "Sally";

function guard(req: NextRequest): NextResponse | null {
  if (!adminConfigured()) return NextResponse.json({ error: "Admin not configured." }, { status: 503 });
  if (!checkAdmin(req.headers)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

// POST /api/admin/chat — drop a message into the campfire AS Sally (no pin gate).
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  let text = "";
  try {
    text = String((await req.json()).text ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Same link-stripping/hate filter as everyone else, even for the host.
  const mod = moderateMessage(text);
  if (!mod.ok) return NextResponse.json({ error: "moderation", message: mod.reason }, { status: 422 });
  const clean = (mod.text ?? "").trim();
  if (!clean) return NextResponse.json({ error: "empty", message: "Say something." }, { status: 422 });

  // No userId → stays out of medal/journey counters; official → distinct badge.
  const message = await postChat({ name: HOST_NAME, provider: "other", text: clean, official: true });
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
