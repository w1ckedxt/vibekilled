import { timingSafeEqual } from "crypto";

// Admin gate: a single secret token in env (ADMIN_TOKEN). Compared in constant
// time. Never shipped to the client — only the /admin page prompts for it and
// sends it as a header to the guarded API.
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN);
}

export function checkAdmin(headers: Headers): boolean {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) return false;
  const provided = headers.get("x-admin-token") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
