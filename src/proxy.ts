import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Anchor the anonymous identity in a durable, first-party cookie set by the
// SERVER. A server `Set-Cookie` outlives Safari/iOS ITP — which evicts
// script-writable storage like localStorage after ~7 days — so it's the stable
// backbone every visitor's profile (kills, medals, leaderboard score, streak)
// hangs off via their userId. The client mirrors it into localStorage and
// reconciles localStorage-first (see lib/identity.ts), so existing profiles are
// never orphaned. Next 16: this file is `proxy.ts` (formerly middleware.ts).
const COOKIE = "vk_uid";
const MAX_AGE = 60 * 60 * 24 * 400; // ~400 days — the browser's hard cap

function newUserId(): string {
  // Same `u_…` shape the client minted historically; uniqueness is all we need.
  return "u_" + crypto.randomUUID().replace(/-/g, "");
}

export function proxy(request: NextRequest) {
  const res = NextResponse.next();
  const existing = request.cookies.get(COOKIE)?.value;
  // Reuse the visitor's id when present (just slide the expiry forward); mint
  // one only for a genuinely new device. Never clobber an id the client already
  // reconciled from its localStorage.
  const id = existing && existing.length > 0 ? existing : newUserId();
  res.cookies.set({
    name: COOKIE,
    value: id,
    path: "/",
    maxAge: MAX_AGE,
    sameSite: "lax",
    httpOnly: false, // the client reads it to stamp API calls with the userId
    secure: request.nextUrl.protocol === "https:", // off on localhost http
  });
  return res;
}

export const config = {
  // Run on pages + API routes so the id is set on the very first hit and its
  // expiry slides on every visit. Skip Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
