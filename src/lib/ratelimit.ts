import { redis, hasRedis } from "./redis";

// Lightweight fixed-window rate limiter backed by Redis INCR+EXPIRE. Cheap,
// atomic, and good enough to blunt spam/bots before reaching the data layer.
// (For volumetric DDoS, layer Vercel's WAF / BotID on top in the dashboard.)
export async function rateLimit(
  bucket: string,
  id: string,
  limit: number,
  windowSec: number,
): Promise<{ ok: boolean; remaining: number }> {
  if (!hasRedis) return { ok: true, remaining: limit };
  const key = `vk:rl:${bucket}:${id}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSec);
  return { ok: n <= limit, remaining: Math.max(0, limit - n) };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
