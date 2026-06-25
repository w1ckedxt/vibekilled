import { Redis } from "@upstash/redis";

// Upstash Redis over HTTP — works in any Vercel runtime, scales to millions of
// requests on the free tier, and bills per-request (no idle cost). The Vercel
// Marketplace Upstash integration injects UPSTASH_REDIS_REST_URL / _TOKEN.
//
// If env vars are missing (e.g. first local run before linking), we fall back to
// a no-op stub so the UI still renders instead of crashing the whole app.

function makeStub(): Redis {
  const warn = () => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[vibekilled] Redis env not set — using in-memory stub. Run `vercel env pull` after linking Upstash.");
    }
  };
  const handler: ProxyHandler<object> = {
    get() {
      return async () => {
        warn();
        return null;
      };
    },
  };
  return new Proxy({}, handler) as unknown as Redis;
}

function create(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return makeStub();
  return new Redis({ url, token });
}

export const redis = create();

export const hasRedis = Boolean(
  (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN),
);
