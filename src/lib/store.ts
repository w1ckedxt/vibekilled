import { nanoid } from "nanoid";
import { redis, hasRedis } from "./redis";
import type { FeedEvent, FeedEventType, GlobalStats, Pin, ProviderId } from "./types";
import { achievementForCount, type Achievement } from "./achievements";

// ── Keys ────────────────────────────────────────────────────────────────────
const K = {
  pin: (id: string) => `vk:pin:${id}`,
  index: "vk:pins", // zset: member=id, score=expireAt(ms)
  feed: "vk:feed", // list of JSON FeedEvent (newest first)
  kills: "vk:stat:kills",
  resurrections: "vk:stat:resurrections",
  userLock: (uid: string) => `vk:user:${uid}:active`, // value=pinId, TTL=recovery
  userCount: (uid: string) => `vk:user:${uid}:count`,
};

// Keep resurrected pins visible (for fireworks + feed) for a while after recovery.
const GRACE_MS = 30 * 60 * 1000; // 30 min
const FEED_MAX = 60;
const LIST_CAP = 600;

// ── Serialization ─────────────────────────────────────────────────────────────
function toPin(raw: Record<string, unknown> | null): Pin | null {
  if (!raw || !raw.id) return null;
  return {
    id: String(raw.id),
    provider: String(raw.provider) as ProviderId,
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    createdAt: Number(raw.createdAt),
    recoverAt: Number(raw.recoverAt),
    name: String(raw.name),
    message: raw.message ? String(raw.message) : undefined,
    good4u: Number(raw.good4u ?? 0),
    sympathy: Number(raw.sympathy ?? 0),
    views: Number(raw.views ?? 0),
    resurrected: Number(raw.resurrected ?? 0) === 1,
  };
}

async function pushFeed(ev: Omit<FeedEvent, "id">): Promise<void> {
  const full: FeedEvent = { ...ev, id: nanoid(8) };
  await redis.lpush(K.feed, JSON.stringify(full));
  await redis.ltrim(K.feed, 0, FEED_MAX - 1);
}

// ── Anti-abuse: one active pin per user ───────────────────────────────────────
export async function getUserActivePin(userId: string): Promise<string | null> {
  if (!hasRedis) return null;
  return (await redis.get<string>(K.userLock(userId))) ?? null;
}

// ── Create (the "Kill") ───────────────────────────────────────────────────────
export interface CreatePinInput {
  userId: string;
  provider: ProviderId;
  lat: number;
  lng: number;
  recoveryMinutes: number;
  name: string;
  message?: string;
  place: string;
}

export interface CreatePinResult {
  pin: Pin;
  killCount: number;
  achievement: Achievement | null;
}

export async function createPin(input: CreatePinInput): Promise<CreatePinResult> {
  if (!hasRedis) {
    throw Object.assign(new Error("Database not configured — link Upstash Redis on Vercel."), { code: "NO_DB" });
  }
  const now = Date.now();
  const id = nanoid(12);
  const recoverAt = now + input.recoveryMinutes * 60 * 1000;
  const expireAt = recoverAt + GRACE_MS;

  const pin: Pin = {
    id,
    provider: input.provider,
    lat: input.lat,
    lng: input.lng,
    createdAt: now,
    recoverAt,
    name: input.name,
    message: input.message,
    good4u: 0,
    sympathy: 0,
    views: 0,
    resurrected: false,
  };

  await redis.hset(K.pin(id), {
    ...pin,
    message: pin.message ?? "",
    resurrected: 0,
  });
  await redis.expire(K.pin(id), Math.ceil((expireAt - now) / 1000));
  await redis.zadd(K.index, { score: expireAt, member: id });

  // Anti-abuse lock: cannot drop a new pin until your own timer runs out.
  await redis.set(K.userLock(input.userId), id, { px: recoverAt - now });

  const killCount = await redis.incr(K.userCount(input.userId));
  const seq = await redis.incr(K.kills); // global running kill number → "Dev Down #N"

  await pushFeed({
    type: "kill",
    name: input.name,
    provider: input.provider,
    place: input.place,
    at: now,
    seq,
    minutes: input.recoveryMinutes,
  });

  return { pin, killCount, achievement: achievementForCount(killCount) };
}

// ── List (the "Watch") ────────────────────────────────────────────────────────
export async function listPins(): Promise<Pin[]> {
  if (!hasRedis) return [];
  const now = Date.now();
  // Self-prune anything past its grace window.
  await redis.zremrangebyscore(K.index, 0, now);

  const ids = (await redis.zrange<string[]>(K.index, 0, LIST_CAP - 1, { rev: true })) ?? [];
  if (!ids.length) return [];

  const pipe = redis.pipeline();
  ids.forEach((id) => pipe.hgetall(K.pin(id)));
  const rows = (await pipe.exec()) as Array<Record<string, unknown> | null>;

  const pins: Pin[] = [];
  for (const row of rows) {
    const pin = toPin(row);
    if (!pin) continue;
    // Lazy resurrection: celebrate the moment the timer crosses zero.
    if (!pin.resurrected && pin.recoverAt <= now) {
      pin.resurrected = true;
      await redis.hset(K.pin(pin.id), { resurrected: 1 });
      await redis.incr(K.resurrections);
      await pushFeed({ type: "resurrection", name: pin.name, provider: pin.provider, place: "", at: now });
    }
    pins.push(pin);
  }
  return pins;
}

export async function getPin(id: string): Promise<Pin | null> {
  if (!hasRedis) return null;
  return toPin(await redis.hgetall(K.pin(id)));
}

// ── Reactions (Good4U / Extend Sympathy / view) ──────────────────────────────
const FIELD: Record<string, { field: keyof Pin; feed?: FeedEventType }> = {
  good4u: { field: "good4u", feed: "good4u" },
  sympathy: { field: "sympathy", feed: "sympathy" },
  view: { field: "views" },
};

export async function react(id: string, action: keyof typeof FIELD): Promise<Pin | null> {
  if (!hasRedis) return null;
  const spec = FIELD[action];
  if (!spec) return null;
  const exists = await redis.exists(K.pin(id));
  if (!exists) return null;
  await redis.hincrby(K.pin(id), spec.field, 1);
  const pin = await getPin(id);
  if (pin && spec.feed && action !== "view") {
    await pushFeed({ type: spec.feed, name: pin.name, provider: pin.provider, place: "", at: Date.now() });
  }
  return pin;
}

// ── Feed + stats ──────────────────────────────────────────────────────────────
export async function getFeed(): Promise<FeedEvent[]> {
  if (!hasRedis) return [];
  const raw = (await redis.lrange<string | FeedEvent>(K.feed, 0, FEED_MAX - 1)) ?? [];
  return raw
    .map((r) => (typeof r === "string" ? safeParse(r) : r))
    .filter((x): x is FeedEvent => Boolean(x));
}

export async function getStats(): Promise<GlobalStats> {
  if (!hasRedis) return { kills: 0, resurrections: 0, active: 0 };
  const [kills, resurrections, active] = await Promise.all([
    redis.get<number>(K.kills),
    redis.get<number>(K.resurrections),
    redis.zcard(K.index),
  ]);
  return {
    kills: Number(kills ?? 0),
    resurrections: Number(resurrections ?? 0),
    active: Number(active ?? 0),
  };
}

function safeParse(s: string): FeedEvent | null {
  try {
    return JSON.parse(s) as FeedEvent;
  } catch {
    return null;
  }
}
